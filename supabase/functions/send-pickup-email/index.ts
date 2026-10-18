// supabase/functions/send-pickup-email/index.ts
// Supabase Edge Function: Automated Document Pickup Transactional Email System
// Follows Deno TypeScript standards for Supabase Edge Functions.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import {
  generatePickupEmailHtml,
  generatePickupEmailText,
  type PickupEmailData,
} from './template.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-region',
};

interface WebhookBody {
  type?: string;
  table?: string;
  schema?: string;
  record?: Record<string, any>;
  old_record?: Record<string, any>;
  // Support direct invocation payload
  [key: string]: any;
}

serve(async (req: Request) => {
  // 1. Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Only POST is supported.' }),
      { status: 405, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const rawBody: WebhookBody = await req.json();

    // 2. Extract new record and old record (supports both Database Webhooks and direct client/backend POST)
    const record = rawBody.record || rawBody;
    const oldRecord = rawBody.old_record || null;

    if (!record || typeof record !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Invalid payload: missing document request record.' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const newStatus = (record.status || '').toLowerCase().trim();
    const oldStatus = oldRecord ? (oldRecord.status || '').toLowerCase().trim() : null;

    // 3. Trigger Criteria Check:
    // Only send when status transitions to 'ready_for_pickup' or 'approved'
    const isTargetStatus = newStatus === 'ready_for_pickup' || newStatus === 'approved';

    if (!isTargetStatus) {
      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          reason: `Document status '${newStatus}' does not require pickup email notification.`,
          record_id: record.id,
          tracking_number: record.tracking_number,
        }),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Resiliency & Rate Limiting (Deduplication):
    // Skip if status didn't change (e.g., admin saved notes or an unrelated column while already ready_for_pickup)
    if (oldRecord && oldStatus === newStatus) {
      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          reason: `Duplicate event ignored: status was already '${newStatus}'.`,
          record_id: record.id,
          tracking_number: record.tracking_number,
        }),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Initialize Supabase Admin Client (for data enrichment and audit logging)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = (supabaseUrl && supabaseServiceKey)
      ? createClient(supabaseUrl, supabaseServiceKey)
      : null;

    // 6. Enrich Record Details from Profiles and Document Types
    let residentEmail = record.resident_email || '';
    let residentName = record.resident_name || '';
    let documentTitle = record.document_title || '';
    let fee = record.fee ?? 0;

    if (supabase) {
      // Lookup Resident Profile if needed
      if ((!residentEmail || !residentName) && record.resident_id) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', record.resident_id)
            .single();

          if (profile) {
            residentEmail = residentEmail || profile.email;
            residentName = residentName || profile.full_name;
          }
        } catch (profileErr) {
          console.warn('[send-pickup-email] Could not fetch profile:', profileErr);
        }
      }

      // Lookup Document Type if needed
      if ((!documentTitle || fee === undefined) && record.document_type_id) {
        try {
          const { data: docType } = await supabase
            .from('document_types')
            .select('title, fee')
            .eq('id', record.document_type_id)
            .single();

          if (docType) {
            documentTitle = documentTitle || docType.title;
            if (record.fee === undefined && docType.fee !== undefined) {
              fee = docType.fee;
            }
          }
        } catch (docTypeErr) {
          console.warn('[send-pickup-email] Could not fetch docType:', docTypeErr);
        }
      }
    }

    // Fallbacks
    residentName = residentName || 'Resident Applicant';
    documentTitle = documentTitle || 'Official Barangay Document';
    const trackingNumber = record.tracking_number || 'TRK-ZAP-000000';
    const pickupDate = record.pickup_date || 'Available starting today';
    const pickupTimeSlot = record.pickup_time_slot || 'Regular Office Hours (8:00 AM - 5:00 PM)';
    const pickupLocation = record.pickup_location || 'Express Window 2, Barangay Hall Lobby, Rahmann St.';
    const pickupInstructions = record.pickup_instructions || 'Please proceed to Express Window 2 upon arrival and present your tracking reference number.';

    // 7. Validate Recipient Email Address
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!residentEmail || !emailRegex.test(residentEmail)) {
      const errorMsg = `No valid recipient email found for document request tracking: ${trackingNumber} (resident_id: ${record.resident_id}).`;
      console.error(`[send-pickup-email] ${errorMsg}`);

      // Log failure in database if client exists
      if (supabase && record.id) {
        await logEmailAttempt(supabase, {
          requestId: record.id,
          trackingNumber,
          recipientEmail: residentEmail || 'unknown@invalid.email',
          status: 'failed',
          provider: 'none',
          errorMessage: errorMsg,
        });
      }

      return new Response(
        JSON.stringify({ error: errorMsg, tracking_number: trackingNumber }),
        { status: 422, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // 8. Compile the Transactional Email
    const emailPayload: PickupEmailData = {
      residentName,
      residentEmail,
      documentTitle,
      trackingNumber,
      pickupDate,
      pickupTimeSlot,
      pickupLocation,
      pickupInstructions,
      fee,
      barangayName: Deno.env.get('BARANGAY_NAME') || 'BARANGAY ZAPATERA',
      barangayAddress: Deno.env.get('BARANGAY_ADDRESS') || 'Barangay Hall, Rahmann St., Zapatera, Cebu City, Philippines',
      barangayContact: Deno.env.get('BARANGAY_HOTLINE') || '(032) 254-8721 / zapatera.cebucity@gmail.com',
      operatingHours: Deno.env.get('BARANGAY_HOURS') || 'Monday to Friday: 8:00 AM – 5:00 PM',
    };

    const emailHtml = generatePickupEmailHtml(emailPayload);
    const emailText = generatePickupEmailText(emailPayload);
    const emailSubject = `Your ${documentTitle} is Ready for Pickup [Ref: ${trackingNumber}]`;

    // 9. Dispatch Email via Provider (Resend primary, with SendGrid / Brevo fallback)
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY');
    const brevoApiKey = Deno.env.get('BREVO_API_KEY');
    const senderEmail = Deno.env.get('SENDER_EMAIL') || 'Barangay Zapatera <onboarding@resend.dev>';

    let provider = 'resend';
    let providerMessageId = '';
    let dispatchStatus = 'sent';
    let dispatchError = '';

    if (resendApiKey) {
      // Send via Resend API
      provider = 'resend';
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: senderEmail,
          to: [residentEmail],
          subject: emailSubject,
          html: emailHtml,
          text: emailText,
          headers: {
            'X-Entity-Ref-ID': trackingNumber,
          },
        }),
      });

      const resendData = await resendRes.json();
      if (!resendRes.ok) {
        throw new Error(`Resend API Error (${resendRes.status}): ${JSON.stringify(resendData)}`);
      }
      providerMessageId = resendData.id || '';
    } else if (brevoApiKey) {
      // Send via Brevo API
      provider = 'brevo';
      const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'Barangay Zapatera', email: senderEmail.includes('<') ? senderEmail.match(/<([^>]+)>/)?.[1] : senderEmail },
          to: [{ email: residentEmail, name: residentName }],
          subject: emailSubject,
          htmlContent: emailHtml,
          textContent: emailText,
        }),
      });
      const brevoData = await brevoRes.json();
      if (!brevoRes.ok) {
        throw new Error(`Brevo API Error (${brevoRes.status}): ${JSON.stringify(brevoData)}`);
      }
      providerMessageId = brevoData.messageId || '';
    } else if (sendgridApiKey) {
      // Send via SendGrid API
      provider = 'sendgrid';
      const sendgridRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sendgridApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: residentEmail, name: residentName }] }],
          from: { email: senderEmail.includes('<') ? senderEmail.match(/<([^>]+)>/)?.[1] : senderEmail, name: 'Barangay Zapatera' },
          subject: emailSubject,
          content: [
            { type: 'text/plain', value: emailText },
            { type: 'text/html', value: emailHtml },
          ],
        }),
      });
      if (!sendgridRes.ok) {
        const sgErr = await sendgridRes.text();
        throw new Error(`SendGrid API Error (${sendgridRes.status}): ${sgErr}`);
      }
      providerMessageId = sendgridRes.headers.get('x-message-id') || 'sendgrid_sent';
    } else {
      // Development Simulation Mode (API keys not yet placed into secrets)
      provider = 'simulation';
      providerMessageId = `sim_${Date.now()}`;
      console.log(`[send-pickup-email:SIMULATION] No RESEND_API_KEY configured. Email simulated for: ${residentEmail}`);
      console.log(`[send-pickup-email:SIMULATION] Subject: ${emailSubject}`);
      console.log(`[send-pickup-email:SIMULATION] Tracking: ${trackingNumber} | Window: ${pickupLocation}`);
    }

    // 10. Audit Logging & Request Metadata Update
    if (supabase && record.id) {
      // A. Update public.document_requests with notified_at timestamp
      try {
        await supabase
          .from('document_requests')
          .update({
            notified_at: new Date().toISOString(),
            email_notification_status: provider === 'simulation' ? 'simulated' : 'sent',
          })
          .eq('id', record.id);
      } catch (updateErr) {
        console.warn('[send-pickup-email] Failed updating notified_at on document_requests:', updateErr);
      }

      // B. Insert into public.email_logs table
      await logEmailAttempt(supabase, {
        requestId: record.id,
        trackingNumber,
        recipientEmail,
        status: provider === 'simulation' ? 'simulated' : 'sent',
        provider,
        providerId: providerMessageId,
      });

      // C. Ensure Resident in-app notification is synchronized
      if (record.resident_id) {
        try {
          await supabase.from('notifications').insert({
            user_id: record.resident_id,
            title: 'Document Ready for Pickup! 🎉',
            message: `Your ${documentTitle} (Ref: ${trackingNumber}) is ready for pickup at ${pickupLocation}.`,
            type: 'ready_pickup',
            is_read: false,
            created_at: new Date().toISOString(),
          });
        } catch (notifErr) {
          // Ignore duplicate notifications
          console.log('[send-pickup-email] In-app notification sync note:', notifErr);
        }
      }
    }

    // 11. Return Clean Success Response
    return new Response(
      JSON.stringify({
        success: true,
        recipient: residentEmail,
        tracking_number: trackingNumber,
        document_title: documentTitle,
        provider,
        provider_message_id: providerMessageId,
        pickup_location: pickupLocation,
        pickup_date: pickupDate,
        pickup_time_slot: pickupTimeSlot,
        simulated: provider === 'simulation',
        message: provider === 'simulation'
          ? 'Email simulated successfully. Set RESEND_API_KEY in Supabase secrets for live delivery.'
          : 'Official pickup notification email dispatched successfully.',
      }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('[send-pickup-email] Execution Exception:', err);

    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || 'Internal Edge Function error while dispatching pickup email.',
      }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Helper to record email dispatch audit logs in public.email_logs
 */
async function logEmailAttempt(
  supabase: any,
  params: {
    requestId: string;
    trackingNumber: string;
    recipientEmail: string;
    status: string;
    provider: string;
    providerId?: string;
    errorMessage?: string;
  }
) {
  try {
    await supabase.from('email_logs').insert({
      request_id: params.requestId,
      tracking_number: params.trackingNumber,
      recipient_email: params.recipientEmail,
      status: params.status,
      provider: params.provider,
      provider_id: params.providerId || null,
      error_message: params.errorMessage || null,
      created_at: new Date().toISOString(),
    });
  } catch (logErr) {
    // Non-fatal: table might not exist yet before migration is executed
    console.warn('[send-pickup-email] Failed writing to email_logs table (run migration if needed):', logErr);
  }
}
