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
          business_name: businessName || name,
          permittee_name: permittee || (typeof name === 'string' ? name : formatResidentName(name)) || '________________________________________',
          business_address: address || 'Cherry Court Bldg., Gen. Maxilom Ave., Brgy. Zapatera, Cebu City',
          nature_of_business: natureOfBusiness || purpose || 'General Merchandise & Services',
          contact_number: contactNo || '',
          capital_invested: capitalInvested || '1,290,000.00',
          gross_sales: grossSales || '300,000.00',
          purpose: purpose || "the renewal of Mayor's Business Permit.",
          issued_date: issuedDate || new Date().toISOString().split('T')[0],
          punong_barangay_name: finalSignatoryName,
          punong_barangay_title: finalSignatoryTitle,
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
    <div className="document-a4-page bg-white text-slate-900 font-serif leading-normal select-text shadow-xl print:shadow-none border border-slate-300 print:border-none mx-auto relative box-border overflow-hidden">
      {/* Subtle Background Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.035] select-none">
        <img
          src={finalLogoUrl}
          alt="Watermark"
          className="w-[450px] h-[450px] object-contain grayscale"
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
      </div>

      <div className="document-inner-content relative flex flex-col justify-between h-full p-[14mm] sm:p-[17mm] bg-white">

        {/* TOP HEADER SECTION */}
        <div className="relative pb-3">
          <div className="flex items-center justify-between">
            {/* Top-Left: Official Barangay Zapatera Seal */}
            <div className="w-22 h-22 sm:w-24 sm:h-24 flex items-center justify-center shrink-0">
              <img
                src={finalLogoUrl}
                alt={`${finalBarangayName} Seal`}
                className="w-20 h-20 sm:w-22 sm:h-22 object-contain"
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
            <div className="flex items-center space-x-1.5 shrink-0">
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

          {/* OFFICE OF THE PUNONG BARANGAY BANNER */}
          <div className="mt-4 text-center">
            <h3 className="text-sm sm:text-base font-black uppercase tracking-widest text-slate-950 font-sans">
              OFFICE OF THE PUNONG BARANGAY
            </h3>
            <div className="w-full h-[2.5px] bg-slate-950 mt-1.5"></div>
          </div>
        </div>

        {/* DOCUMENT TITLE */}
        <div className="text-center my-3">
          <h1 className="text-lg sm:text-xl font-black uppercase tracking-wider text-slate-950">
            {documentTitle}
          </h1>
        </div>

        {/* STRUCTURED KEY-VALUE INFORMATION SECTION */}
        {isBusiness ? (
          /* Business Clearance Key-Value Table (matching uploaded official photo) */
          <div className="my-2.5 font-sans text-xs sm:text-[13px] space-y-1.5 px-2">
            <div className="grid grid-cols-12 items-baseline">
              <span className="col-span-4 font-bold text-slate-900 uppercase">BUSINESS NAME</span>
              <span className="col-span-1 font-bold text-slate-900 text-center">:</span>
              <span className="col-span-7 font-black uppercase text-slate-950 tracking-wide">
                {businessName || name || '________________________________________'}
              </span>
            </div>

            <div className="grid grid-cols-12 items-baseline">
              <span className="col-span-4 font-bold text-slate-900 uppercase">PERMITTEE</span>
              <span className="col-span-1 font-bold text-slate-900 text-center">:</span>
              <span className="col-span-7 font-extrabold uppercase text-slate-950">
                {permittee || formatResidentName(name) || '________________________________________'}
              </span>
            </div>

            <div className="grid grid-cols-12 items-baseline">
              <span className="col-span-4 font-bold text-slate-900 uppercase">ADDRESS</span>
              <span className="col-span-1 font-bold text-slate-900 text-center">:</span>
              <span className="col-span-7 font-medium text-slate-900">
                {address || 'Cherry Court Bldg., Gen. Maxilom Ave., Brgy. Zapatera, Cebu City'}
              </span>
            </div>

            <div className="grid grid-cols-12 items-baseline">
              <span className="col-span-4 font-bold text-slate-900 uppercase">NATURE OF BUSINESS</span>
              <span className="col-span-1 font-bold text-slate-900 text-center">:</span>
              <span className="col-span-7 font-medium text-slate-900">
                {natureOfBusiness || purpose || 'General Merchandise & Services'}
              </span>
            </div>

            <div className="grid grid-cols-12 items-baseline">
              <span className="col-span-4 font-bold text-slate-900 uppercase">CONTACT NUMBER</span>
              <span className="col-span-1 font-bold text-slate-900 text-center">:</span>
              <span className="col-span-7 font-medium text-slate-900 font-mono">
                {contactNo || '____________________'}
              </span>
            </div>

            <div className="grid grid-cols-12 items-baseline">
              <span className="col-span-4 font-bold text-slate-900 uppercase">CAPITAL INVESTED</span>
              <span className="col-span-1 font-bold text-slate-900 text-center">:</span>
              <span className="col-span-7 font-bold text-slate-950 font-mono">
                {capitalInvested ? (capitalInvested.startsWith('₱') ? capitalInvested : `₱${capitalInvested}`) : '₱1,290,000.00'}
              </span>
            </div>

            <div className="grid grid-cols-12 items-baseline">
              <span className="col-span-4 font-bold text-slate-900 uppercase">GROSS SALES</span>
              <span className="col-span-1 font-bold text-slate-900 text-center">:</span>
              <span className="col-span-7 font-bold text-slate-950 font-mono">
                {grossSales ? (grossSales.startsWith('₱') ? grossSales : `₱${grossSales}`) : '₱300,000.00'}
              </span>
            </div>
          </div>
        ) : (
          /* Standard Resident Clearance Key-Value Table */
          <div className="my-2.5 font-sans text-xs sm:text-[13px] space-y-2 px-2">
            <div className="grid grid-cols-12 items-baseline">
              <span className="col-span-4 font-bold text-slate-900">Name</span>
              <span className="col-span-1 font-bold text-slate-900 text-center">:</span>
              <span className="col-span-7 font-extrabold uppercase text-slate-950 tracking-wide">
                {formatResidentName(name) || '________________________________________'}
              </span>
            </div>

            <div className="grid grid-cols-12 items-baseline">
              <span className="col-span-4 font-bold text-slate-900">Address</span>
              <span className="col-span-1 font-bold text-slate-900 text-center">:</span>
              <span className="col-span-7 font-medium text-slate-900">
                {address || '195 D. Jakosalem St., Brgy. Zapatera, Cebu City'}
              </span>
            </div>

            <div className="grid grid-cols-12 items-baseline">
              <span className="col-span-4 font-bold text-slate-900">Date of Birth</span>
              <span className="col-span-1 font-bold text-slate-900 text-center">:</span>
              <span className="col-span-7 font-medium text-slate-900">
                {formattedDob}
              </span>
            </div>

            <div className="grid grid-cols-12 items-baseline">
              <span className="col-span-4 font-bold text-slate-900">Contact No.</span>
              <span className="col-span-1 font-bold text-slate-900 text-center">:</span>
              <span className="col-span-7 font-medium text-slate-900 font-mono">
                {contactNo || '____________________'}
              </span>
            </div>

            <div className="grid grid-cols-12 items-baseline">
              <span className="col-span-4 font-bold text-slate-900">Years in Barangay</span>
              <span className="col-span-1 font-bold text-slate-900 text-center">:</span>
              <span className="col-span-7 font-medium text-slate-900">
                {yearsInBarangay || '____________________'}
              </span>
            </div>

            <div className="grid grid-cols-12 items-baseline">
              <span className="col-span-4 font-bold text-slate-900">Purpose</span>
              <span className="col-span-1 font-bold text-slate-900 text-center">:</span>
              <span className="col-span-7 font-bold text-slate-950 uppercase">
                {purpose || 'ANY LEGAL PURPOSE'}
              </span>
            </div>
          </div>
        )}

        {/* CERTIFICATION BODY PARAGRAPHS */}
        <div className="space-y-3.5 text-justify text-xs sm:text-sm font-serif pt-3 leading-relaxed">
          <p className="indent-8">
            {bodyText}
          </p>

          <p className="indent-8">
            {isBusiness
              ? `This certification is issued to ${businessName || name || 'the permittee'} for ${purpose || "the renewal / application of Mayor's Business Permit"}.`
              : 'This certification is issued upon the request of the above-named person for whatever legal purpose it may serve.'}
          </p>

          <p className="indent-8">
            Issued on this <span className="font-bold text-slate-950">{formattedDate}</span> at{' '}
            <span className="font-bold text-slate-950">{issuedLocation}</span>.
          </p>
        </div>

        {/* SIGNATURE & OFFICIAL PAYMENT / SEAL SECTION */}
        <div className="mt-auto pt-5 relative flex items-end justify-between min-h-[140px]">
          {/* Left Column: Official Receipt breakdown (if fee > 0) + Official Seal Notice */}
          <div className="flex flex-col justify-end">
            {/* O.R. Payment Breakdown Box (ONLY SHOWN WHEN FEE > 0) */}
            {hasFee && (
              <div className="font-sans text-[10px] sm:text-[11px] text-slate-900 space-y-0.5 mb-3 select-text">
                <div className="grid grid-cols-12 items-baseline">
                  <span className="col-span-5 font-semibold text-slate-800">O.R. No.</span>
                  <span className="col-span-1 text-center font-bold text-slate-800">:</span>
                  <span className="col-span-6 font-bold text-slate-950">{orNumber || '________________'}</span>
                </div>
                <div className="grid grid-cols-12 items-baseline">
                  <span className="col-span-5 font-semibold text-slate-800">Fee</span>
                  <span className="col-span-1 text-center font-bold text-slate-800">:</span>
                  <span className="col-span-6 font-bold text-slate-950">₱{numFee.toFixed(2)}</span>
                </div>
                <div className="grid grid-cols-12 items-baseline">
                  <span className="col-span-5 font-semibold text-slate-800">Doc. Stamps</span>
                  <span className="col-span-1 text-center font-bold text-slate-800">:</span>
                  <span className="col-span-6 font-bold text-slate-950">₱{numDocStamps.toFixed(2)}</span>
                </div>
                <div className="grid grid-cols-12 items-baseline">
                  <span className="col-span-5 font-bold text-slate-900">Total Amount</span>
                  <span className="col-span-1 text-center font-bold text-slate-900">:</span>
                  <span className="col-span-6 font-extrabold text-slate-950">₱{totalAmount.toFixed(2)}</span>
                </div>
                <div className="grid grid-cols-12 items-baseline">
                  <span className="col-span-5 font-semibold text-slate-800">Date</span>
                  <span className="col-span-1 text-center font-bold text-slate-800">:</span>
                  <span className="col-span-6 font-medium text-slate-900">{formattedDateOnly}</span>
                </div>
              </div>
            )}

            {/* Official Seal Watermark / Notice - Lowest Bottom Left (No broken line design) */}
            <div className="flex flex-col items-start justify-end pb-0.5 text-slate-500 select-none">
              <span className="text-[9px] sm:text-[10px] font-sans font-bold uppercase tracking-wider text-slate-500">
                NOT VALID WITHOUT
              </span>
              <span className="text-[10px] sm:text-[11px] font-sans font-black uppercase tracking-widest text-slate-700 mt-0.5">
                OFFICIAL SEAL
              </span>
            </div>
          </div>

          {/* Punong Barangay Signature - Lower Middle */}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-0 text-center min-w-[240px] sm:min-w-[270px]">
            <div className="h-10 sm:h-12"></div>
            <p className="text-sm sm:text-base font-black text-slate-950 uppercase font-sans tracking-wide border-b-2 border-slate-900 pb-1">
              {finalSignatoryName}
            </p>
            <p className="text-[11px] sm:text-xs font-bold text-slate-700 uppercase font-sans mt-0.5">
              {finalSignatoryTitle}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
