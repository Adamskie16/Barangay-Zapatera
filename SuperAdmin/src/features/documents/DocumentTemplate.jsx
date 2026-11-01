// SuperAdmin/src/features/documents/DocumentTemplate.jsx
import React from 'react';
import { formatIssuedDateOrdinal, formatResidentName } from './documentTemplates';
import BarangayBusinessClearance from './BarangayBusinessClearance';

/**
 * Standard A4 Printable Document Template (210mm x 297mm)
 * Enhanced Official Barangay Zapatera Certification Layout
 * Matches official government letterhead and key-value resident/business table format.
 * Dynamically toggles Official Receipt (O.R.) payment breakdown when fee > 0.
 */
export default function DocumentTemplate({
  documentTitle = 'BARANGAY CERTIFICATION',
  name = '',
  address = '',
  dateOfBirth = '',
  contactNo = '',
  yearsInBarangay = '',
  purpose = '',
  issuedDate = '',
  issuedLocation = 'Barangay Zapatera, Cebu City',
  bodyText = 'This is to certify that the above named person is a resident of the barangay and known to be of good moral standing.',
  signatoryName = '',
  signatoryTitle = '',
  logoUrl = '',
  config = {},
  // Fee & Payment breakdown props (matches uploaded official clearance photo)
  fee = 0,
  docStamps = 30,
  orNumber = '',
  // Business clearance props
  templateType = 'standard', // 'standard' | 'business'
  businessName = '',
  permittee = '',
  natureOfBusiness = '',
  capitalInvested = '',
  grossSales = '',
}) {
  const formattedDate = formatIssuedDateOrdinal(issuedDate);

  // Formatted date for O.R. receipt (e.g. "October 26, 2026")
  const formattedDateOnly = (() => {
    if (!issuedDate) {
      const today = new Date();
      return today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }
    const d = new Date(issuedDate + (issuedDate.includes('T') ? '' : 'T00:00:00'));
    return isNaN(d.getTime())
      ? issuedDate
      : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  })();

  const formattedDob = dateOfBirth ? (
    /^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)
      ? new Date(dateOfBirth + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : dateOfBirth
  ) : '____________________';

  const numFee = Number(fee) || 0;
  const numDocStamps = Number(docStamps) || 30;
  const totalAmount = numFee + numDocStamps;
  const hasFee = numFee > 0;

  const isBusiness =
    templateType === 'business' ||
    Boolean(businessName) ||
    documentTitle?.toUpperCase().includes('BUSINESS');

  const finalSignatoryName = signatoryName || config?.punong_barangay || config?.captainName || config?.signatory_name || 'HON. DAVID M. AGRAVANTE';
  const finalSignatoryTitle = signatoryTitle || config?.signatory_title || 'Punong Barangay';
  const finalLogoUrl = logoUrl || (config?.seal_url && !config.seal_url.includes('gstatic') && config.seal_url !== '/zapatera_seal.png' ? config.seal_url : '/logo.png');
  const finalBarangayName = config?.barangay_name || 'Barangay Zapatera';
  const finalMunicipality = config?.municipality || 'City of Cebu';
  const finalHallAddress = config?.hall_address || '197 D. Jakosalem St., Cebu City';
  const finalContactPhone = config?.contact_phone || '(032) 503-6465';
  const finalContactEmail = config?.contact_email || 'zapatera.lnb24@gmail.com';

  // If business permit template is selected, render official Barangay Business Clearance
  if (isBusiness) {
    return (
      <BarangayBusinessClearance
        data={{
          business_name: businessName,
          permittee_name: permittee || (typeof name === 'string' ? name : formatResidentName(name)) || '',
          business_address: address || '',
          nature_of_business: natureOfBusiness || '',
          contact_number: contactNo || '',
          capital_invested: capitalInvested || '',
          gross_sales: grossSales || '',
          purpose: purpose || '',
          issued_date: issuedDate || new Date().toISOString().split('T')[0],
          punong_barangay_name: finalSignatoryName,
          punong_barangay_title: finalSignatoryTitle,
          document_title: documentTitle,
          body_text: bodyText,
          payment: {
            has_fee: hasFee,
            or_number: orNumber,
            fee_amount: numFee,
            doc_stamps_amount: numDocStamps,
            total_amount: totalAmount,
            payment_date: issuedDate,
          },
        }}
        logoUrl={finalLogoUrl}
      />
    );
  }

  return (
    <div
      className="document-a4-page bg-white text-slate-900 font-serif leading-normal select-text shadow-xl print:shadow-none border border-slate-300 print:border-none mx-auto relative box-border overflow-hidden"
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
          src={finalLogoUrl}
          alt="Watermark"
          className="w-[480px] h-[480px] object-contain grayscale"
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
      </div>

      <div className="document-inner-content relative flex flex-col justify-between h-full px-[18mm] pt-[14mm] pb-[12mm] bg-white box-border">
        {/* TOP SECTION: Letterhead, Titles, & Body */}
        <div className="flex-1 flex flex-col">
          {/* TOP HEADER SECTION */}
          <div className="relative pb-2">
            <div className="flex items-center justify-between">
              {/* Top-Left: Official Barangay Zapatera Seal */}
              <div className="w-20 h-20 sm:w-22 sm:h-22 flex items-center justify-center shrink-0">
                <img
                  src={finalLogoUrl}
                  alt={`${finalBarangayName} Seal`}
                  className="w-18 h-18 sm:w-20 sm:h-20 object-contain"
                  onError={(e) => {
                    e.target.src = '/logo.png';
                  }}
                />
              </div>

              {/* Top-Center: Official Republic / Barangay Letterhead Details */}
              <div className="text-center flex-1 px-3 space-y-0.5 font-sans">
                <p className="text-[11px] sm:text-xs font-semibold text-slate-700 tracking-wide uppercase">
                  Republic of the Philippines
                </p>
                <p className="text-[11px] sm:text-xs font-semibold text-slate-700 tracking-wide">
                  {finalMunicipality}
                </p>
                <h2 className="text-base sm:text-lg font-black text-slate-950 uppercase tracking-tight">
                  {finalBarangayName}
                </h2>
                <p className="text-[11px] sm:text-xs font-medium text-slate-800">
                  {finalHallAddress}
                </p>
                <p className="text-[11px] sm:text-xs font-semibold text-slate-900">
                  {finalContactPhone}
                </p>
                <p className="text-[10px] sm:text-[11px] font-medium text-blue-700 underline">
                  email add: {finalContactEmail}
                </p>
              </div>

              {/* Top-Right: Official City of Cebu Seal & Bagong Pilipinas Logo */}
              <div className="flex items-center space-x-2 shrink-0">
                <div className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center">
                  <img
                    src="/bagong_pilipinas.png"
                    alt="Bagong Pilipinas"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
                <div className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center">
                  <img
                    src="/cebu_city_seal.png"
                    alt="City of Cebu Seal"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Horizontal Divider Bar */}
            <div className="w-full h-[2.5px] bg-slate-950 mt-3"></div>
          </div>

          {/* DOCUMENT TITLES */}
          <div className="text-center mt-7 mb-7 space-y-5">
            {/* OFFICE OF THE PUNONG BARANGAY: Exact Font Size 14pt */}
            <h3 className="text-[14pt] leading-tight font-black uppercase tracking-widest text-slate-950 font-serif">
              OFFICE OF THE PUNONG BARANGAY
            </h3>

            {/* DOCUMENT TITLE: Exact Font Size 16pt */}
            <h1 className="text-[16pt] leading-tight font-black uppercase tracking-wider text-slate-950 font-serif pt-1">
              {documentTitle}
            </h1>
          </div>

          {/* STRUCTURED KEY-VALUE INFORMATION SECTION: Exact Font Size 12pt */}
          <div className="font-sans text-[12pt] space-y-2.5 my-3">
            <div className="flex items-baseline">
              <span className="w-[210px] shrink-0 font-bold text-slate-900 uppercase">NAME</span>
              <span className="w-[24px] shrink-0 font-bold text-slate-900 text-center">:</span>
              <span className="flex-1 font-black uppercase text-slate-950 tracking-wide">
                {formatResidentName(name) || '________________________________________'}
              </span>
            </div>

            <div className="flex items-baseline">
              <span className="w-[210px] shrink-0 font-bold text-slate-900 uppercase">ADDRESS</span>
              <span className="w-[24px] shrink-0 font-bold text-slate-900 text-center">:</span>
              <span className="flex-1 font-normal text-slate-900">
                {address || '________________________________________'}
              </span>
            </div>

            <div className="flex items-baseline">
              <span className="w-[210px] shrink-0 font-bold text-slate-900 uppercase">DATE OF BIRTH</span>
              <span className="w-[24px] shrink-0 font-bold text-slate-900 text-center">:</span>
              <span className="flex-1 font-normal text-slate-900">
                {formattedDob}
              </span>
            </div>

            <div className="flex items-baseline">
              <span className="w-[210px] shrink-0 font-bold text-slate-900 uppercase">CONTACT NO.</span>
              <span className="w-[24px] shrink-0 font-bold text-slate-900 text-center">:</span>
              <span className="flex-1 font-normal text-slate-900 font-mono">
                {contactNo || '____________________'}
              </span>
            </div>

            <div className="flex items-baseline">
              <span className="w-[210px] shrink-0 font-bold text-slate-900 uppercase">YEARS IN BARANGAY</span>
              <span className="w-[24px] shrink-0 font-bold text-slate-900 text-center">:</span>
              <span className="flex-1 font-normal text-slate-900">
                {yearsInBarangay || '____________________'}
              </span>
            </div>

            <div className="flex items-baseline">
              <span className="w-[210px] shrink-0 font-bold text-slate-900 uppercase">PURPOSE</span>
              <span className="w-[24px] shrink-0 font-bold text-slate-900 text-center">:</span>
              <span className="flex-1 font-bold text-slate-950 uppercase">
                {purpose ? purpose.toUpperCase() : '____________________'}
              </span>
            </div>
          </div>

          {/* CERTIFICATION BODY PARAGRAPHS: Exact Font Size 12pt */}
          <div className="space-y-5 text-justify text-[12pt] font-serif pt-4 leading-relaxed">
            <p className="indent-10">
              {bodyText}
            </p>

            <p className="indent-10">
              This certification is issued upon the request of the above-named person for whatever legal purpose it may serve.
            </p>

            <p className="text-center font-serif pt-2">
              Issued on this <span className="font-bold text-slate-950">{formattedDate}</span> at{' '}
              <span className="font-bold text-slate-950">{issuedLocation}</span>.
            </p>
          </div>

          {/* O.R. FINANCIAL BLOCK: Positioned on the left in the blank space below / next to the issuance line */}
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
                <span className="font-bold text-slate-950 font-mono whitespace-nowrap">₱{numFee.toFixed(2)}</span>
              </div>
              <div className="flex items-baseline">
                <span className="w-[115px] shrink-0 font-semibold text-slate-800">Doc. Stamps</span>
                <span className="w-[16px] shrink-0 font-bold text-slate-800 text-center">:</span>
                <span className="font-bold text-slate-950 font-mono whitespace-nowrap">₱{numDocStamps.toFixed(2)}</span>
              </div>
              <div className="flex items-baseline">
                <span className="w-[115px] shrink-0 font-bold text-slate-900">Total Amount</span>
                <span className="w-[16px] shrink-0 font-bold text-slate-900 text-center">:</span>
                <span className="font-black text-slate-950 font-mono whitespace-nowrap">₱{totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex items-baseline">
                <span className="w-[115px] shrink-0 font-semibold text-slate-800">Date</span>
                <span className="w-[16px] shrink-0 font-bold text-slate-800 text-center">:</span>
                <span className="font-medium text-slate-900 whitespace-nowrap">{formattedDateOnly}</span>
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM SECTION: Punong Barangay to the Center, Official Seal at Lowest Left */}
        <div className="mt-auto pt-4 flex flex-col justify-end">
          {/* Punong Barangay Signature Centered Horizontally */}
          <div className="text-center mx-auto min-w-[280px] pb-4">
            <p className="text-[14pt] font-bold text-slate-950 uppercase font-serif tracking-wide leading-tight">
              {finalSignatoryName}
            </p>
            <p className="text-[12pt] font-normal text-slate-800 font-serif mt-1 leading-tight">
              {finalSignatoryTitle}
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
}
