import React from 'react';

export interface BusinessPermitPayment {
  has_fee: boolean;
  or_number?: string;
  fee_amount?: number;
  doc_stamps_amount?: number;
  total_amount?: number;
  payment_date?: string;
}

export interface BusinessPermitData {
  business_name: string;
  permittee_name: string;
  business_address: string;
  nature_of_business: string;
  contact_number: string;
  capital_invested?: string | number;
  gross_sales?: string | number;
  purpose?: string;
  issued_date: string;
  punong_barangay_name?: string;
  punong_barangay_title?: string;
  payment?: BusinessPermitPayment;
  document_title?: string;
  body_text?: string;
}

export interface BarangayBusinessClearanceProps {
  data?: BusinessPermitData;
  // Allow flat props as fallback
  business_name?: string;
  permittee_name?: string;
  business_address?: string;
  nature_of_business?: string;
  contact_number?: string;
  capital_invested?: string | number;
  gross_sales?: string | number;
  purpose?: string;
  issued_date?: string;
  punong_barangay_name?: string;
  punong_barangay_title?: string;
  payment?: BusinessPermitPayment;
  document_title?: string;
  body_text?: string;
  logoUrl?: string;
  className?: string;
}

/**
 * Format helper for currency values (e.g. 1290000 -> ₱1,290,000.00)
 */
function formatCurrency(val?: string | number): string {
  if (val === undefined || val === null || val === '') return '';
  const str = String(val).replace(/[^\d.-]/g, '');
  const num = parseFloat(str);
  if (isNaN(num)) return String(val);
  return `₱${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Formats a date into ordinal day format:
 * e.g. "2026-10-26" -> "26th day of October, 2026"
 */
function formatOrdinalDate(dateStr?: string): { dayOrdinal: string; month: string; year: string; full: string } {
  let d: Date;
  if (!dateStr) {
    d = new Date();
  } else {
    d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
    if (isNaN(d.getTime())) d = new Date();
  }

  const day = d.getDate();
  let suffix = 'th';
  if (day % 10 === 1 && day !== 11) suffix = 'st';
  else if (day % 10 === 2 && day !== 12) suffix = 'nd';
  else if (day % 10 === 3 && day !== 13) suffix = 'rd';

  const month = d.toLocaleDateString('en-US', { month: 'long' });
  const year = d.getFullYear().toString();
  const dayOrdinal = `${day}${suffix}`;

  return {
    dayOrdinal,
    month,
    year,
    full: `${dayOrdinal} day of ${month}, ${year}`,
  };
}

/**
 * Official Printable "Barangay Business Clearance" Document Template
 * Standard A4 canvas: 210mm x 297mm.
 * Fills the full sheet with exact font hierarchy:
 * - Office of the Punong Barangay: 14pt
 * - Document type title: 16pt
 * - Details below: 12pt
 * - NOT VALID WITHOUT OFFICIAL SEAL anchored at the lowest left
 * - Punong Barangay signature in the lower-middle
 */
export const BarangayBusinessClearance: React.FC<BarangayBusinessClearanceProps> = ({
  data,
  business_name,
  permittee_name,
  business_address,
  nature_of_business,
  contact_number,
  capital_invested,
  gross_sales,
  purpose,
  issued_date,
  punong_barangay_name,
  punong_barangay_title,
  payment,
  logoUrl = '/logo.png',
  className = '',
}) => {
  // Merge data prop with flat props
  const bName = data?.business_name ?? business_name ?? '';
  const pName = data?.permittee_name ?? permittee_name ?? '';
  const bAddress = data?.business_address ?? business_address ?? '';
  const nBusiness = data?.nature_of_business ?? nature_of_business ?? '';
  const cNumber = data?.contact_number ?? contact_number ?? '';
  const cInvested = data?.capital_invested ?? capital_invested ?? '';
  const gSales = data?.gross_sales ?? gross_sales ?? '';
  const bPurpose = data?.purpose ?? purpose ?? '';
  const docTitle = data?.document_title ?? document_title ?? 'BARANGAY BUSINESS CLEARANCE';
  const customBody = data?.body_text ?? body_text ?? '';
  const iDate = data?.issued_date ?? issued_date ?? new Date().toISOString().split('T')[0];
  const pSignatory = data?.punong_barangay_name ?? punong_barangay_name ?? 'HON. DAVID M. AGRAVANTE';
  const pTitle = data?.punong_barangay_title ?? punong_barangay_title ?? 'Punong Barangay';

  const paymentData = data?.payment ?? payment;
  const hasFee = Boolean(paymentData?.has_fee && (paymentData?.fee_amount ?? 0) > 0);
  const feeAmount = paymentData?.fee_amount ?? 500;
  const docStampsAmount = paymentData?.doc_stamps_amount ?? 30;
  const totalAmount = paymentData?.total_amount ?? feeAmount + docStampsAmount;
  const orNumber = paymentData?.or_number ?? '';
  const paymentDate = paymentData?.payment_date ?? iDate;

  const dateObj = formatOrdinalDate(iDate);
  const formattedPaymentDate = (() => {
    if (!paymentDate) return `${dateObj.month} ${dateObj.dayOrdinal.replace(/\D/g, '')}, ${dateObj.year}`;
    const pd = new Date(paymentDate.includes('T') ? paymentDate : `${paymentDate}T00:00:00`);
    if (isNaN(pd.getTime())) return paymentDate;
    return pd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  })();

  return (
    <div
      className={`barangay-business-clearance bg-white text-slate-900 font-serif leading-normal select-text shadow-xl print:shadow-none border border-slate-300 print:border-none mx-auto relative box-border overflow-hidden ${className}`}
      style={{
        width: '210mm',
        height: '297mm',
        maxHeight: '297mm',
        boxSizing: 'border-box',
      }}
    >
      {/* Subtle Background Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none">
        <img
          src={logoUrl}
          alt="Watermark"
          className="w-[480px] h-[480px] object-contain grayscale"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      </div>

      {/* Main Printable Content Container: full 297mm height flex container */}
      <div className="relative flex flex-col justify-between h-full px-[18mm] pt-[14mm] pb-[12mm] bg-white box-border">
        {/* TOP SECTION: Letterhead, Titles, 2-Column Details, & Issuance Body */}
        <div className="flex-1 flex flex-col">
          {/* 1. OFFICIAL LETTERHEAD HEADER */}
          <div className="relative pb-2">
            <div className="flex items-center justify-between">
              {/* Top-Left: Circular Official Barangay Seal */}
              <div className="w-20 h-20 sm:w-22 sm:h-22 flex items-center justify-center shrink-0">
                <img
                  src={logoUrl}
                  alt="Barangay Zapatera Seal"
                  className="w-18 h-18 sm:w-20 sm:h-20 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/logo.png';
                  }}
                />
              </div>

              {/* Top-Center: Stacked Official Header Text */}
              <div className="text-center flex-1 px-3 space-y-0.5 font-sans">
                <p className="text-[11px] sm:text-xs font-semibold text-slate-800 tracking-wide uppercase">
                  Republic of the Philippines
                </p>
                <p className="text-[11px] sm:text-xs font-semibold text-slate-800 tracking-wide">
                  City of Cebu
                </p>
                <h2 className="text-base sm:text-lg font-black text-slate-950 uppercase tracking-tight">
                  Barangay Zapatera
                </h2>
                <p className="text-[11px] sm:text-xs font-medium text-slate-800">
                  197 D. Jakosalem St., Cebu City
                </p>
                <p className="text-[11px] sm:text-xs font-semibold text-slate-900">
                  (032) 503-6465
                </p>
                <p className="text-[10px] sm:text-[11px] font-medium text-blue-700 underline">
                  email add: zapatera.lnb24@gmail.com
                </p>
              </div>

              {/* Top-Right: Twin Official Seals Side-by-Side */}
              <div className="flex items-center space-x-2 shrink-0">
                <div className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center">
                  <img
                    src="/bagong_pilipinas.png"
                    alt="Bagong Pilipinas"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
                <div className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center">
                  <img
                    src="/cebu_city_seal.png"
                    alt="City of Cebu Seal"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Horizontal separator: Solid dark divider bar */}
            <div className="w-full h-[2.5px] bg-slate-950 mt-3"></div>
          </div>

          {/* 2. DOCUMENT TITLES */}
          <div className="text-center mt-7 mb-7 space-y-5">
            {/* Centered Office Heading: Exact Font Size 14pt */}
            <h3 className="text-[14pt] leading-tight font-black uppercase tracking-widest text-slate-950 font-serif">
              OFFICE OF THE PUNONG BARANGAY
            </h3>

            {/* Main Document Title: Exact Font Size 16pt (dynamically editable from Step 3) */}
            <h1 className="text-[16pt] leading-tight font-black uppercase tracking-wider text-slate-950 font-serif pt-1">
              {docTitle}
            </h1>
          </div>

          {/* 3. TWO-COLUMN BUSINESS DETAILS GRID: Exact Font Size 12pt */}
          <div className="font-sans text-[12pt] space-y-2.5 my-3">
            {/* BUSINESS NAME */}
            <div className="flex items-baseline">
              <span className="w-[210px] shrink-0 font-bold text-slate-900 uppercase">BUSINESS NAME</span>
              <span className="w-[24px] shrink-0 font-bold text-slate-900 text-center">:</span>
              <span className="flex-1 font-black uppercase text-slate-950 tracking-wide">
                {bName || '________________________________________'}
              </span>
            </div>

            {/* PERMITTEE */}
            <div className="flex items-baseline">
              <span className="w-[210px] shrink-0 font-bold text-slate-900 uppercase">PERMITTEE</span>
              <span className="w-[24px] shrink-0 font-bold text-slate-900 text-center">:</span>
              <span className="flex-1 font-bold text-slate-950">
                {pName || '________________________________________'}
              </span>
            </div>

            {/* ADDRESS */}
            <div className="flex items-baseline">
              <span className="w-[210px] shrink-0 font-bold text-slate-900 uppercase">ADDRESS</span>
              <span className="w-[24px] shrink-0 font-bold text-slate-900 text-center">:</span>
              <span className="flex-1 font-normal text-slate-900">
                {bAddress || '________________________________________'}
              </span>
            </div>

            {/* NATURE OF BUSINESS */}
            <div className="flex items-baseline">
              <span className="w-[210px] shrink-0 font-bold text-slate-900 uppercase">NATURE OF BUSINESS</span>
              <span className="w-[24px] shrink-0 font-bold text-slate-900 text-center">:</span>
              <span className="flex-1 font-normal text-slate-900">
                {nBusiness || '____________________'}
              </span>
            </div>

            {/* CONTACT NUMBER */}
            <div className="flex items-baseline">
              <span className="w-[210px] shrink-0 font-bold text-slate-900 uppercase">CONTACT NUMBER</span>
              <span className="w-[24px] shrink-0 font-bold text-slate-900 text-center">:</span>
              <span className="flex-1 font-normal text-slate-900 font-mono">
                {cNumber || '____________________'}
              </span>
            </div>

            {/* CAPITAL INVESTED */}
            <div className="flex items-baseline">
              <span className="w-[210px] shrink-0 font-bold text-slate-900 uppercase">CAPITAL INVESTED</span>
              <span className="w-[24px] shrink-0 font-bold text-slate-900 text-center">:</span>
              <span className="flex-1 font-bold text-slate-950 font-mono">
                {cInvested ? (String(cInvested).startsWith('₱') ? cInvested : formatCurrency(cInvested)) : '____________________'}
              </span>
            </div>

            {/* GROSS SALES */}
            <div className="flex items-baseline">
              <span className="w-[210px] shrink-0 font-bold text-slate-900 uppercase">GROSS SALES</span>
              <span className="w-[24px] shrink-0 font-bold text-slate-900 text-center">:</span>
              <span className="flex-1 font-bold text-slate-950 font-mono">
                {gSales ? (String(gSales).startsWith('₱') ? gSales : formatCurrency(gSales)) : '____________________'}
              </span>
            </div>
          </div>

          {/* Dynamic paragraph text below the grid: Exact Font Size 12pt (dynamically editable from Step 3) */}
          <div className="space-y-5 text-justify text-[12pt] font-serif pt-4 leading-relaxed">
            <p className="indent-10">
              {customBody ? (
                bName && customBody.includes('the permittee') ? (
                  (() => {
                    const parts = customBody.split('the permittee');
                    return (
                      <>
                        {parts[0]}
                        <span className="font-bold text-slate-950 uppercase">{bName}</span>
                        {parts.slice(1).join('the permittee')}
                      </>
                    );
                  })()
                ) : (
                  customBody
                )
              ) : (
                <>
                  This certification is issued to <span className="font-bold text-slate-950 uppercase">{bName || '____________________'}</span> for {bPurpose ? bPurpose : '____________________'}
                </>
              )}
            </p>

            <p className="text-center font-serif pt-2">
              Issued on this <span className="font-bold text-slate-950">{dateObj.dayOrdinal}</span> day of{' '}
              <span className="font-bold text-slate-950">{dateObj.month}</span>,{' '}
              <span className="font-bold text-slate-950">{dateObj.year}</span> at{' '}
              <span className="font-bold text-slate-950">Barangay Zapatera, Cebu City</span>.
            </p>
          </div>

          {/* Conditional O.R. Details Block (positioned on the left in the blank space below / next to the issuance line) */}
          {hasFee && (
            <div className="w-[300px] font-sans text-[11pt] sm:text-[12pt] text-slate-900 space-y-1 select-text mt-5 mb-2">
              <div className="flex items-baseline">
                <span className="w-[115px] shrink-0 font-semibold text-slate-800">O.R. No.</span>
                <span className="w-[16px] shrink-0 font-bold text-slate-800 text-center">:</span>
                <span className="font-bold text-slate-950 font-mono whitespace-nowrap">{orNumber || ''}</span>
              </div>
              <div className="flex items-baseline">
                <span className="w-[115px] shrink-0 font-semibold text-slate-800">Fee</span>
                <span className="w-[16px] shrink-0 font-bold text-slate-800 text-center">:</span>
                <span className="font-bold text-slate-950 font-mono whitespace-nowrap">₱{feeAmount.toFixed(2)}</span>
              </div>
              <div className="flex items-baseline">
                <span className="w-[115px] shrink-0 font-semibold text-slate-800">Doc. Stamps</span>
                <span className="w-[16px] shrink-0 font-bold text-slate-800 text-center">:</span>
                <span className="font-bold text-slate-950 font-mono whitespace-nowrap">₱{docStampsAmount.toFixed(2)}</span>
              </div>
              <div className="flex items-baseline">
                <span className="w-[115px] shrink-0 font-bold text-slate-900">Total Amount</span>
                <span className="w-[16px] shrink-0 font-bold text-slate-900 text-center">:</span>
                <span className="font-black text-slate-950 font-mono whitespace-nowrap">₱{totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex items-baseline">
                <span className="w-[115px] shrink-0 font-semibold text-slate-800">Date</span>
                <span className="w-[16px] shrink-0 font-bold text-slate-800 text-center">:</span>
                <span className="font-medium text-slate-900 whitespace-nowrap">{formattedPaymentDate}</span>
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM SECTION: Punong Barangay to the Center, Official Seal at Lowest Left */}
        <div className="mt-auto pt-4 flex flex-col justify-end">
          {/* Punong Barangay Signature Centered Horizontally */}
          <div className="text-center mx-auto min-w-[280px] pb-4">
            <p className="text-[14pt] font-bold text-slate-950 uppercase font-serif tracking-wide leading-tight">
              {pSignatory}
            </p>
            <p className="text-[12pt] font-normal text-slate-800 font-serif mt-1 leading-tight">
              {pTitle}
            </p>
          </div>

          {/* Absolute Lowest Left: NOT VALID WITHOUT OFFICIAL SEAL */}
          <div className="select-none text-slate-600">
            <p className="text-[9.5pt] font-sans font-bold uppercase tracking-wider text-slate-600 leading-tight">
              NOT VALID WITHOUT
            </p>
            <p className="text-[9.5pt] font-sans font-bold uppercase tracking-wider text-slate-600 leading-tight">
              OFFICIAL SEAL
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BarangayBusinessClearance;
