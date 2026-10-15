// features/reports/reportUtils.js
// Export to Downloads (CSV, JSON, HTML) & Professional Printable Report Utilities

/**
 * Universal CSV Export with UTF-8 BOM for 100% Microsoft Excel & Spreadsheet compatibility
 */
export function exportToCSV(filename, rows) {
  if (!rows || !rows.length) {
    alert('No data available to export.');
    return;
  }
  const separator = ',';
  const keys = Object.keys(rows[0]);
  
  const headerLine = keys.map((k) => `"${String(k).replace(/"/g, '""')}"`).join(separator);
  const dataLines = rows.map((row) =>
    keys
      .map((k) => {
        let cell = row[k] === null || row[k] === undefined ? '' : String(row[k]);
        cell = cell.replace(/"/g, '""');
        return `"${cell}"`;
      })
      .join(separator)
  );

  const csvContent = [headerLine, ...dataLines].join('\r\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const cleanFilename = filename.toLowerCase().endsWith('.csv') ? filename : `${filename}.csv`;
  link.setAttribute('download', cleanFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export raw structured data as JSON download
 */
export function exportToJSON(filename, data) {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const cleanFilename = filename.toLowerCase().endsWith('.json') ? filename : `${filename}.json`;
  link.setAttribute('download', cleanFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export standalone printable HTML document download
 */
export function exportToHTML(filename, htmlContent) {
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const cleanFilename = filename.toLowerCase().endsWith('.html') ? filename : `${filename}.html`;
  link.setAttribute('download', cleanFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Build CSV records for Applications Pipeline Log
 */
export function buildApplicationsCSV(requests = []) {
  return requests.map((r, idx) => ({
    'No.': idx + 1,
    'Tracking Number': r.tracking_number || 'N/A',
    'Resident Name': r.resident_name || 'N/A',
    'Email Address': r.resident_email || '',
    'Contact Number': r.resident_phone || '',
    'Sitio / Address': r.resident_address || '',
    'Document Type': r.document_title || 'N/A',
    'Purpose': r.purpose || 'Official Use',
    'Fee (PHP)': Number(r.fee) || 0,
    'Status': (r.status || 'pending').toUpperCase(),
    'Claimed / Issued': (r.status === 'issued' || r.status === 'completed' || r.is_claimed) ? 'YES' : 'NO',
    'Pickup Date': r.pickup_date || 'To be scheduled',
    'Pickup Slot': r.pickup_time_slot || 'Regular Office Hours',
    'Submission Date': r.created_at ? new Date(r.created_at).toLocaleString('en-US') : 'N/A',
    'Last Updated': r.updated_at ? new Date(r.updated_at).toLocaleString('en-US') : (r.created_at ? new Date(r.created_at).toLocaleString('en-US') : 'N/A'),
  }));
}

/**
 * Build CSV records for Monthly Processing Volume
 */
export function buildMonthlyCSV(monthlyData = [], currentYear = new Date().getFullYear()) {
  return monthlyData.map((m) => {
    const total = Number(m.totalQuantity) || 0;
    const approved = Number(m.approvedQuantity) || 0;
    const completionRate = total > 0 ? `${Math.round((approved / total) * 100)}%` : '0%';
    return {
      'Month': `${m.monthName} ${currentYear}`,
      'Total Applications Received': total,
      'Approved & Issued Quantities': approved,
      'Pending & Under Verification': Number(m.pendingQuantity) || 0,
      'Declined / Returned': Number(m.declinedQuantity) || 0,
      'Completion / Approval Rate': completionRate,
    };
  });
}

/**
 * Build CSV records for Document Issuance & Revenue Audit
 */
export function buildRevenueAuditCSV(docTypeCounts = [], totalRevenue = 0) {
  const calcTotalRevenue = totalRevenue > 0
    ? totalRevenue
    : docTypeCounts.reduce((acc, dt) => acc + (Number(dt.total_revenue) || (Number(dt.fee || 0) * Number(dt.request_count || 0))), 0);

  return docTypeCounts.map((dt, idx) => {
    const revenue = Number(dt.total_revenue) || 0;
    const share = calcTotalRevenue > 0 ? `${Math.round((revenue / calcTotalRevenue) * 100)}%` : '0%';
    return {
      'No.': idx + 1,
      'Document Code': dt.code || 'N/A',
      'Document Title': dt.title || 'N/A',
      'Category': dt.category || 'General',
      'Standard Fee (PHP)': Number(dt.fee) || 0,
      'Total Requests': Number(dt.request_count) || 0,
      'Total Revenue Generated (PHP)': revenue,
      'Share of Total Revenue': share,
    };
  });
}

/**
 * Build CSV records for Executive Summary KPIs
 */
export function buildSummaryKPIsCSV(params = {}) {
  const totalRequests = params.totalRequests ?? (params.requests ? params.requests.length : 0);
  const pendingCount = params.pendingCount ?? (params.statusCounts?.pending || 0);
  const underReviewCount = params.underReviewCount ?? (params.statusCounts?.under_review || 0);
  const approvedCount = params.approvedCount ?? (params.statusCounts?.approved || 0);
  const issuedCount = params.issuedCount ?? (params.statusCounts?.issued || 0);
  const declinedCount = params.declinedCount ?? (params.statusCounts?.declined || 0);
  const totalRevenue = params.totalRevenue || 0;
  const totalResidents = params.totalResidents || 0;
  const periodLabel = params.periodLabel || 'All Time (2026)';

  const completionRate = totalRequests > 0
    ? `${Math.round(((approvedCount + issuedCount) / totalRequests) * 100)}%`
    : '0%';

  return [
    { 'Metric Category': 'Reporting Period', 'Value': periodLabel, 'Notes': 'Barangay Zapatera Administration' },
    { 'Metric Category': 'Total Document Applications Received', 'Value': totalRequests, 'Notes': 'Cumulative submissions' },
    { 'Metric Category': 'Pending Desk Queue', 'Value': pendingCount, 'Notes': 'Awaiting administrative verification' },
    { 'Metric Category': 'Under Verification & Inspection', 'Value': underReviewCount, 'Notes': 'Identity & residency evaluation' },
    { 'Metric Category': 'Approved & Ready for Pickup', 'Value': approvedCount, 'Notes': 'Clearances ready at express windows' },
    { 'Metric Category': 'Officially Issued & Claimed', 'Value': issuedCount, 'Notes': 'Successfully completed issuances' },
    { 'Metric Category': 'Declined / Returned Applications', 'Value': declinedCount, 'Notes': 'Incomplete or unverified criteria' },
    { 'Metric Category': 'Overall Completion / Issuance Rate', 'Value': completionRate, 'Notes': 'Percentage of received requests approved/issued' },
    { 'Metric Category': 'Total Revenue Collected (PHP)', 'Value': `PHP ${Number(totalRevenue).toFixed(2)}`, 'Notes': 'Statutory clearance & certification fees' },
    { 'Metric Category': 'Registered Portal Residents', 'Value': totalResidents, 'Notes': 'Resident digital accounts' },
  ];
}

/**
 * Build Full Consolidated Report (Multi-Table Export in Single CSV)
 */
export function buildConsolidatedCSV({
  requests = [],
  docTypeCounts = [],
  monthlyData = [],
  statusCounts = {},
  totalRevenue = 0,
  totalResidents = 0,
  periodLabel = 'All Time (2026)',
  currentYear = new Date().getFullYear(),
}) {
  const kpiRows = buildSummaryKPIsCSV({
    totalRequests: requests.length,
    pendingCount: statusCounts.pending || 0,
    underReviewCount: statusCounts.under_review || 0,
    approvedCount: statusCounts.approved || 0,
    issuedCount: statusCounts.issued || 0,
    declinedCount: statusCounts.declined || 0,
    totalRevenue,
    totalResidents,
    periodLabel,
  });

  return kpiRows;
}

/**
 * Generate Standalone Formal Printable HTML Document
 */
export function generatePrintableHTML({
  title = 'OFFICIAL BARANGAY OPERATIONS & AUDIT REPORT',
  subtitle = 'Summary of Document Requests, Monthly Issuance Quantities, and Revenue Analytics',
  config = {},
  currentUser = {},
  requests = [],
  docTypes = [],
  monthlyData = [],
  statusCounts = {},
  totalRevenue = 0,
  totalResidents = 0,
  periodLabel = 'All Time (2026)',
  scope = 'all', // 'all' | 'summary' | 'applications' | 'monthly' | 'revenue'
}) {
  const now = new Date();
  const dateFormatted = now.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const timeFormatted = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const barangayName = config.barangay_name || 'Barangay Zapatera';
  const municipality = config.municipality || 'Cebu City';
  const province = config.province || 'Cebu';
  const hallAddress = config.hall_address || '197 D. Jakosalem St., Cebu City';
  const punongBarangay = config.punong_barangay || 'HON. DAVID M. AGRAVANTE';
  const sealUrl = config.seal_url || config.logo_url || '/logo.png';
  const adminName = currentUser?.full_name || currentUser?.email || 'Administrative Officer';
  const adminRole = currentUser?.role === 'super_admin' ? 'Super Administrator' : 'Barangay Administrator';
  const controlNo = `BZ-REP-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

  const totalRequests = requests.length;
  const approvedTotal = (statusCounts.approved || 0) + (statusCounts.issued || 0);
  const completionRate = totalRequests > 0 ? `${Math.round((approvedTotal / totalRequests) * 100)}%` : '0%';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${title} - ${barangayName}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 14mm 16mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      font-size: 11px;
      line-height: 1.4;
      padding: 0;
    }
    .report-container {
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
    }
    /* Official Government Header */
    .gov-header {
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 16px;
      position: relative;
    }
    .gov-seal {
      width: 68px;
      height: 68px;
      object-fit: contain;
      position: absolute;
      left: 10px;
      top: 0;
    }
    .gov-header-text h4 {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #475569;
    }
    .gov-header-text h2 {
      font-size: 18px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #0f172a;
      margin: 2px 0;
    }
    .gov-header-text h3 {
      font-size: 12px;
      font-weight: 700;
      color: #1e3a8a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .gov-header-text p {
      font-size: 10px;
      color: #64748b;
      margin-top: 2px;
    }

    /* Meta Bar */
    .meta-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px 12px;
      margin-bottom: 16px;
      font-size: 10.5px;
    }
    .meta-item strong {
      color: #0f172a;
    }
    .meta-item span {
      color: #475569;
    }

    /* Section Headers */
    .section-title {
      font-size: 12.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #0f172a;
      border-bottom: 1.5px solid #cbd5e1;
      padding-bottom: 4px;
      margin: 16px 0 8px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .section-title span.tag {
      font-size: 9.5px;
      font-weight: 700;
      background: #e2e8f0;
      padding: 2px 6px;
      border-radius: 4px;
      color: #334155;
    }

    /* KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 16px;
    }
    .kpi-card {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 8px 10px;
      background: #ffffff;
      text-align: center;
    }
    .kpi-val {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
    }
    .kpi-lbl {
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      margin-top: 2px;
    }

    /* Tables */
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      font-size: 10px;
    }
    table.data-table th, table.data-table td {
      border: 1px solid #cbd5e1;
      padding: 6px 8px;
      text-align: left;
    }
    table.data-table th {
      background: #f1f5f9;
      font-weight: 700;
      text-transform: uppercase;
      color: #1e293b;
      font-size: 9.5px;
    }
    table.data-table tr:nth-child(even) {
      background: #f8fafc;
    }
    table.data-table td.num {
      text-align: right;
      font-family: monospace;
      font-weight: 600;
    }
    table.data-table tfoot td {
      font-weight: 800;
      background: #e2e8f0;
    }

    /* Status Pill in Print */
    .status-badge {
      display: inline-block;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 8.5px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .status-pending { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
    .status-review { background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; }
    .status-approved { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
    .status-issued { background: #f3e8ff; color: #6b21a8; border: 1px solid #e9d5ff; }
    .status-declined { background: #ffe4e6; color: #9f1239; border: 1px solid #fecdd3; }

    /* Signatory Section */
    .signatory-container {
      margin-top: 28px;
      display: flex;
      justify-content: space-between;
      page-break-inside: avoid;
    }
    .sig-col {
      width: 45%;
      text-align: center;
    }
    .sig-role-title {
      font-size: 10px;
      color: #64748b;
      margin-bottom: 34px;
      text-transform: uppercase;
      font-weight: 600;
    }
    .sig-name {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      color: #0f172a;
      border-top: 1px solid #0f172a;
      padding-top: 4px;
      display: inline-block;
      min-width: 200px;
    }
    .sig-title {
      font-size: 10px;
      color: #475569;
    }

    /* Print Watermark / Footer */
    .report-footer {
      margin-top: 24px;
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
      display: flex;
      justify-content: space-between;
      font-size: 9px;
      color: #94a3b8;
    }

    @media print {
      body {
        background: transparent;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <!-- Official Header -->
    <div class="gov-header">
      <img src="${sealUrl}" alt="Barangay Seal" class="gov-seal" onerror="this.style.display='none'">
      <div class="gov-header-text">
        <h4>Republic of the Philippines • Province of ${province} • City of ${municipality}</h4>
        <h2>${barangayName}</h2>
        <h3>${title}</h3>
        <p>${hallAddress} • Contact: ${config.contact_phone || '(032) 503-6465'} • Email: ${config.contact_email || 'zapatera.lnb24@gmail.com'}</p>
      </div>
    </div>

    <!-- Metadata Bar -->
    <div class="meta-bar">
      <div class="meta-item"><strong>Control No:</strong> <span>${controlNo}</span></div>
      <div class="meta-item"><strong>Reporting Scope:</strong> <span>${periodLabel}</span></div>
      <div class="meta-item"><strong>Date Generated:</strong> <span>${dateFormatted}, ${timeFormatted}</span></div>
      <div class="meta-item"><strong>Prepared By:</strong> <span>${adminName} (${adminRole})</span></div>
    </div>

    ${(scope === 'all' || scope === 'summary') ? `
      <!-- KPI Executive Summary -->
      <div class="section-title">
        <span>Executive Key Performance Indicators</span>
        <span class="tag">Overall Operations</span>
      </div>
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-val">${totalRequests}</div>
          <div class="kpi-lbl">Total Applications</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-val" style="color: #166534;">${approvedTotal}</div>
          <div class="kpi-lbl">Approved & Issued (${completionRate})</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-val" style="color: #b45309;">${(statusCounts.pending || 0) + (statusCounts.under_review || 0)}</div>
          <div class="kpi-lbl">In Process / Queue</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-val" style="color: #1d4ed8;">PHP ${Number(totalRevenue).toFixed(2)}</div>
          <div class="kpi-lbl">Total Fees Collected</div>
        </div>
      </div>
    ` : ''}

    ${(scope === 'all' || scope === 'revenue' || scope === 'summary') && docTypes.length > 0 ? `
      <!-- Document Issuance Breakdown & Revenue Audit -->
      <div class="section-title">
        <span>Document Volume & Revenue Audit Breakdown</span>
        <span class="tag">Revenue Audit</span>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 12%;">Code</th>
            <th>Document Description</th>
            <th style="width: 14%; text-align: right;">Unit Fee</th>
            <th style="width: 14%; text-align: right;">Requests</th>
            <th style="width: 18%; text-align: right;">Revenue Collected</th>
            <th style="width: 12%; text-align: right;">Revenue %</th>
          </tr>
        </thead>
        <tbody>
          ${docTypes.map((dt) => {
            const reqCount = requests.filter((r) => r.document_type_id === dt.id || r.document_title === dt.title).length;
            const rev = requests
              .filter((r) => (r.document_type_id === dt.id || r.document_title === dt.title) && (r.status === 'approved' || r.status === 'issued' || r.status === 'ready_for_pickup' || r.status === 'completed'))
              .reduce((sum, r) => sum + (Number(r.fee) || 0), 0);
            const pct = totalRevenue > 0 ? `${Math.round((rev / totalRevenue) * 100)}%` : '0%';
            return `<tr>
              <td style="font-weight: 700; font-family: monospace;">${dt.code || 'N/A'}</td>
              <td>${dt.title}</td>
              <td class="num">PHP ${Number(dt.fee || 0).toFixed(2)}</td>
              <td class="num">${reqCount}</td>
              <td class="num" style="font-weight: 700; color: #1e3a8a;">PHP ${Number(rev).toFixed(2)}</td>
              <td class="num">${pct}</td>
            </tr>`;
          }).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="text-align: right;">GRAND TOTAL:</td>
            <td class="num">${totalRequests}</td>
            <td class="num" style="color: #1e3a8a;">PHP ${Number(totalRevenue).toFixed(2)}</td>
            <td class="num">100%</td>
          </tr>
        </tfoot>
      </table>
    ` : ''}

    ${(scope === 'all' || scope === 'monthly' || scope === 'summary') && monthlyData.length > 0 ? `
      <!-- Monthly Quantities Table -->
      <div class="section-title">
        <span>Monthly Operations & Quantities Overview (${now.getFullYear()})</span>
        <span class="tag">Monthly Processing</span>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Month</th>
            <th style="text-align: right;">Received</th>
            <th style="text-align: right;">Approved / Issued</th>
            <th style="text-align: right;">Pending / Review</th>
            <th style="text-align: right;">Declined</th>
            <th style="text-align: right;">Completion Rate</th>
          </tr>
        </thead>
        <tbody>
          ${monthlyData.map((m) => {
            const total = Number(m.totalQuantity) || 0;
            const app = Number(m.approvedQuantity) || 0;
            const rate = total > 0 ? `${Math.round((app / total) * 100)}%` : '0%';
            return `<tr>
              <td style="font-weight: 700;">${m.monthName}</td>
              <td class="num">${total}</td>
              <td class="num" style="color: #166534; font-weight: 700;">${app}</td>
              <td class="num" style="color: #b45309;">${m.pendingQuantity || 0}</td>
              <td class="num" style="color: #9f1239;">${m.declinedQuantity || 0}</td>
              <td class="num">${rate}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    ` : ''}

    ${(scope === 'all' || scope === 'applications') && requests.length > 0 ? `
      <!-- Applications Pipeline Detailed Log -->
      <div class="section-title">
        <span>Application Pipeline & Request Log</span>
        <span class="tag">Total Records: ${requests.length}</span>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 14%;">Tracking</th>
            <th>Applicant Name</th>
            <th>Document Requested</th>
            <th style="width: 12%; text-align: right;">Fee</th>
            <th style="width: 14%;">Status</th>
            <th style="width: 16%;">Date Submitted</th>
          </tr>
        </thead>
        <tbody>
          ${requests.map((r) => {
            const s = (r.status || 'pending').toLowerCase();
            let badgeClass = 'status-pending';
            if (s === 'under_review' || s === 'processing') badgeClass = 'status-review';
            if (s === 'approved' || s === 'ready_for_pickup') badgeClass = 'status-approved';
            if (s === 'issued' || s === 'completed') badgeClass = 'status-issued';
            if (s === 'declined' || s === 'rejected') badgeClass = 'status-declined';

            return `<tr>
              <td style="font-weight: 700; font-family: monospace;">${r.tracking_number}</td>
              <td style="font-weight: 600;">${r.resident_name || 'N/A'}</td>
              <td>${r.document_title || 'Barangay Certificate'}</td>
              <td class="num">PHP ${Number(r.fee || 0).toFixed(2)}</td>
              <td><span class="status-badge ${badgeClass}">${(r.status || 'pending').toUpperCase()}</span></td>
              <td style="font-size: 9px; color: #64748b;">${r.created_at ? new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    ` : ''}

    <!-- Signatory Section -->
    <div class="signatory-container">
      <div class="sig-col">
        <div class="sig-role-title">Prepared & Attested By:</div>
        <div class="sig-name">${adminName}</div>
        <div class="sig-title">${adminRole} • Operations & Records</div>
      </div>
      <div class="sig-col">
        <div class="sig-role-title">Noted & Officially Approved By:</div>
        <div class="sig-name">${punongBarangay}</div>
        <div class="sig-title">${config.signatory_title || 'Punong Barangay'} • Head of Local Government</div>
      </div>
    </div>

    <!-- Official Report Footer -->
    <div class="report-footer">
      <div>Official Document of ${barangayName} • City of ${municipality}</div>
      <div>Generated on ${dateFormatted} at ${timeFormatted} • Control Ref: ${controlNo}</div>
    </div>
  </div>
</body>
</html>`;
}
