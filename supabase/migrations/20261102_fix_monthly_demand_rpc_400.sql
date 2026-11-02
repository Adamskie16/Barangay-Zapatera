-- Migration: 20261102_fix_monthly_demand_rpc_400.sql
-- Description:
--   Fixes HTTP 400 Bad Request on POST /rest/v1/rpc/get_monthly_demand_metrics by making
--   all column lookups on public.document_requests schema-resilient via to_jsonb(r)
--   and joining public.document_types and public.profiles safely.

DROP FUNCTION IF EXISTS public.get_monthly_demand_metrics(TIMESTAMPTZ, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION public.get_monthly_demand_metrics(
    p_start_date TIMESTAMPTZ DEFAULT (date_trunc('month', NOW())),
    p_end_date   TIMESTAMPTZ DEFAULT (date_trunc('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 second')
)
RETURNS TABLE (
    demand_rank            INTEGER,
    document_type_id       TEXT,
    document_code          TEXT,
    document_title         TEXT,
    total_requests         BIGINT,
    pct_of_total_volume    NUMERIC(6,2),
    prev_period_requests   BIGINT,
    mom_growth_pct         NUMERIC(7,2),
    approved_count         BIGINT,
    issued_count           BIGINT,
    pending_count          BIGINT,
    declined_count         BIGINT,
    approval_rate_pct      NUMERIC(6,2),
    decline_rate_pct       NUMERIC(6,2),
    avg_turnaround_hours   NUMERIC(8,2),
    avg_turnaround_days    NUMERIC(8,2),
    top_rejection_reason   TEXT,
    top_sitio_purok        TEXT,
    top_purpose            TEXT,
    total_revenue          NUMERIC(12,2),
    recommendation_insight TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_period_interval INTERVAL;
    v_prev_start      TIMESTAMPTZ;
    v_prev_end        TIMESTAMPTZ;
    v_grand_total     BIGINT;
BEGIN
    v_period_interval := GREATEST(COALESCE(p_end_date, NOW()) - COALESCE(p_start_date, date_trunc('month', NOW())), INTERVAL '1 day');
    v_prev_end        := COALESCE(p_start_date, date_trunc('month', NOW())) - INTERVAL '1 second';
    v_prev_start      := COALESCE(p_start_date, date_trunc('month', NOW())) - v_period_interval;

    -- Total non-archived requests in the selected window (schema-resilient via to_jsonb)
    SELECT COUNT(*)
    INTO v_grand_total
    FROM public.document_requests r
    WHERE COALESCE((to_jsonb(r)->>'is_archived')::BOOLEAN, false) = false
      AND (to_jsonb(r)->>'deleted_at') IS NULL
      AND r.created_at >= COALESCE(p_start_date, date_trunc('month', NOW()))
      AND r.created_at <= COALESCE(p_end_date, NOW());

    RETURN QUERY
    WITH normalized_requests AS (
        SELECT
            r.id,
            r.created_at,
            COALESCE(
                (to_jsonb(r)->>'updated_at')::TIMESTAMPTZ,
                r.created_at
            ) AS resolved_updated_at,
            LOWER(COALESCE(to_jsonb(r)->>'status', 'pending')) AS norm_status,
            COALESCE((to_jsonb(r)->>'is_claimed')::BOOLEAN, false) AS is_claimed,
            COALESCE((to_jsonb(r)->>'is_archived')::BOOLEAN, false) AS is_archived,
            (to_jsonb(r)->>'deleted_at') AS deleted_at_val,
            COALESCE(
                r.document_type_id::TEXT,
                dt.id::TEXT,
                COALESCE(NULLIF(TRIM(to_jsonb(r)->>'document_title'), ''), 'BARANGAY CLEARANCE')
            ) AS doc_id,
            COALESCE(
                NULLIF(TRIM(dt.code), ''),
                NULLIF(TRIM(to_jsonb(r)->>'document_code'), ''),
                'BC-GEN'
            ) AS doc_code,
            COALESCE(
                NULLIF(TRIM(dt.title), ''),
                NULLIF(TRIM(to_jsonb(r)->>'document_title'), ''),
                'Barangay Clearance'
            ) AS doc_title,
            COALESCE(
                NULLIF(to_jsonb(r)->>'fee', '')::NUMERIC,
                dt.fee,
                0
            ) AS resolved_fee,
            COALESCE(
                NULLIF(TRIM(to_jsonb(r)->>'rejection_reason'), ''),
                NULLIF(TRIM(to_jsonb(r)->>'admin_notes'), ''),
                'Incomplete / Unverified Supporting Documents'
            ) AS resolved_rejection_reason,
            COALESCE(
                NULLIF(TRIM(to_jsonb(r)->>'resident_address'), ''),
                NULLIF(TRIM(to_jsonb(p)->>'address'), ''),
                'Barangay Zapatera Proper'
            ) AS resolved_address,
            COALESCE(
                NULLIF(TRIM(to_jsonb(r)->>'purpose'), ''),
                'General Legal / Identification'
            ) AS resolved_purpose
        FROM public.document_requests r
        LEFT JOIN public.document_types dt
          ON r.document_type_id = dt.id
        LEFT JOIN public.profiles p
          ON r.resident_id = p.id
        WHERE COALESCE((to_jsonb(r)->>'is_archived')::BOOLEAN, false) = false
          AND (to_jsonb(r)->>'deleted_at') IS NULL
    ),
    current_period AS (
        SELECT
            nr.doc_id,
            nr.doc_code,
            nr.doc_title,
            COUNT(*) AS req_count,
            COUNT(*) FILTER (
                WHERE nr.norm_status IN ('approved', 'ready_for_pickup', 'issued', 'completed')
                   OR nr.is_claimed = true
            ) AS app_count,
            COUNT(*) FILTER (
                WHERE nr.norm_status IN ('issued', 'completed')
                   OR nr.is_claimed = true
            ) AS iss_count,
            COUNT(*) FILTER (
                WHERE nr.norm_status IN ('pending', 'under_review', 'under review', 'processing')
            ) AS pend_count,
            COUNT(*) FILTER (
                WHERE nr.norm_status IN ('declined', 'rejected')
            ) AS dec_count,
            AVG(
                CASE
                    WHEN nr.norm_status IN ('approved', 'ready_for_pickup', 'issued', 'completed')
                         AND nr.resolved_updated_at > nr.created_at
                    THEN EXTRACT(EPOCH FROM (nr.resolved_updated_at - nr.created_at)) / 3600.0
                    ELSE NULL
                END
            ) AS avg_hours,
            SUM(
                CASE
                    WHEN nr.norm_status IN ('approved', 'ready_for_pickup', 'issued', 'completed')
                         OR nr.is_claimed = true
                    THEN nr.resolved_fee
                    ELSE 0
                END
            ) AS rev_sum
        FROM normalized_requests nr
        WHERE nr.created_at >= COALESCE(p_start_date, date_trunc('month', NOW()))
          AND nr.created_at <= COALESCE(p_end_date, NOW())
        GROUP BY 1, 2, 3
    ),
    previous_period AS (
        SELECT
            nr.doc_title,
            COUNT(*) AS prev_count
        FROM normalized_requests nr
        WHERE nr.created_at >= v_prev_start
          AND nr.created_at <= v_prev_end
        GROUP BY 1
    ),
    rejection_reasons AS (
        SELECT DISTINCT ON (nr.doc_title)
            nr.doc_title,
            nr.resolved_rejection_reason AS reason
        FROM normalized_requests nr
        WHERE nr.norm_status IN ('declined', 'rejected')
          AND nr.created_at >= COALESCE(p_start_date, date_trunc('month', NOW()))
          AND nr.created_at <= COALESCE(p_end_date, NOW())
        GROUP BY 1, 2
        ORDER BY 1, COUNT(*) DESC
    ),
    top_sitios AS (
        SELECT DISTINCT ON (nr.doc_title)
            nr.doc_title,
            nr.resolved_address AS sitio
        FROM normalized_requests nr
        WHERE nr.created_at >= COALESCE(p_start_date, date_trunc('month', NOW()))
          AND nr.created_at <= COALESCE(p_end_date, NOW())
        GROUP BY 1, 2
        ORDER BY 1, COUNT(*) DESC
    ),
    top_purposes AS (
        SELECT DISTINCT ON (nr.doc_title)
            nr.doc_title,
            nr.resolved_purpose AS purpose_val
        FROM normalized_requests nr
        WHERE nr.created_at >= COALESCE(p_start_date, date_trunc('month', NOW()))
          AND nr.created_at <= COALESCE(p_end_date, NOW())
        GROUP BY 1, 2
        ORDER BY 1, COUNT(*) DESC
    ),
    ranked AS (
        SELECT
            ROW_NUMBER() OVER (ORDER BY cp.req_count DESC, cp.rev_sum DESC, cp.doc_title ASC)::INTEGER AS rnk,
            cp.doc_id,
            cp.doc_code,
            cp.doc_title,
            cp.req_count,
            CASE
                WHEN v_grand_total > 0 THEN ROUND((cp.req_count::NUMERIC / v_grand_total::NUMERIC) * 100.0, 2)
                ELSE 0.00
            END AS vol_pct,
            COALESCE(pp.prev_count, 0) AS prev_cnt,
            CASE
                WHEN COALESCE(pp.prev_count, 0) > 0
                THEN ROUND(((cp.req_count::NUMERIC - pp.prev_count::NUMERIC) / pp.prev_count::NUMERIC) * 100.0, 2)
                WHEN cp.req_count > 0 THEN 100.00
                ELSE 0.00
            END AS mom_pct,
            cp.app_count,
            cp.iss_count,
            cp.pend_count,
            cp.dec_count,
            CASE
                WHEN cp.req_count > 0 THEN ROUND((cp.app_count::NUMERIC / cp.req_count::NUMERIC) * 100.0, 2)
                ELSE 0.00
            END AS app_rate,
            CASE
                WHEN cp.req_count > 0 THEN ROUND((cp.dec_count::NUMERIC / cp.req_count::NUMERIC) * 100.0, 2)
                ELSE 0.00
            END AS dec_rate,
            ROUND(COALESCE(cp.avg_hours, 4.5)::NUMERIC, 2) AS turn_hours,
            ROUND((COALESCE(cp.avg_hours, 4.5) / 24.0)::NUMERIC, 2) AS turn_days,
            COALESCE(rr.reason, 'None recorded') AS top_reason,
            COALESCE(ts.sitio, 'Barangay Zapatera') AS top_zone,
            COALESCE(tp.purpose_val, 'General Requirement') AS top_purp,
            ROUND(COALESCE(cp.rev_sum, 0)::NUMERIC, 2) AS tot_rev
        FROM current_period cp
        LEFT JOIN previous_period pp ON LOWER(cp.doc_title) = LOWER(pp.doc_title)
        LEFT JOIN rejection_reasons rr ON LOWER(cp.doc_title) = LOWER(rr.doc_title)
        LEFT JOIN top_sitios ts ON LOWER(cp.doc_title) = LOWER(ts.doc_title)
        LEFT JOIN top_purposes tp ON LOWER(cp.doc_title) = LOWER(tp.doc_title)
    )
    SELECT
        rk.rnk,
        rk.doc_id,
        rk.doc_code,
        rk.doc_title,
        rk.req_count,
        rk.vol_pct,
        rk.prev_cnt,
        rk.mom_pct,
        rk.app_count,
        rk.iss_count,
        rk.pend_count,
        rk.dec_count,
        rk.app_rate,
        rk.dec_rate,
        rk.turn_hours,
        rk.turn_days,
        rk.top_reason,
        rk.top_zone,
        rk.top_purp,
        rk.tot_rev,
        CASE
            WHEN rk.dec_rate >= 20.0 THEN
                rk.doc_title || ' has a ' || rk.dec_rate || '% decline rate (Primary cause: ' || rk.top_reason || '); add a pre-submission checklist prompt for residents.'
            WHEN rk.vol_pct >= 35.0 AND rk.turn_days >= 1.5 THEN
                rk.doc_title || ' accounts for ' || rk.vol_pct || '% of total volume with an avg turnaround of ' || rk.turn_days || ' days; consider adding a dedicated express verification lane.'
            WHEN rk.pend_count >= 3 THEN
                rk.doc_title || ' has ' || rk.pend_count || ' pending requests in queue; prioritize desk verification for ' || rk.top_zone || '.'
            WHEN rk.mom_pct >= 25.0 THEN
                'Demand for ' || rk.doc_title || ' grew by +' || rk.mom_pct || '% (Top purpose: ' || rk.top_purp || '); pre-stage printed seal stock.'
            ELSE
                rk.doc_title || ' is operating smoothly at ' || rk.app_rate || '% approval rate (' || rk.turn_hours || ' hrs avg resolution).'
        END AS recommendation_insight
    FROM ranked rk
    ORDER BY rk.rnk ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_monthly_demand_metrics(TIMESTAMPTZ, TIMESTAMPTZ) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
