// SuperAdmin/src/features/documents/DocumentTemplate.jsx
import React from 'react';
import { formatIssuedDateOrdinal } from './documentTemplates';

/**
 * Standard A4 Printable Document Template (210mm x 297mm)
 * Enhanced Official Barangay Zapatera Certification Layout
 * Matches official government letterhead and key-value resident table format.
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
  issuedLocation = 'Barangay Zapatera, Cebu City, Philippines',
  bodyText = 'This is to certify that the above named person is a resident of the barangay and known to be of good moral standing.',
  signatoryName = '',
  signatoryTitle = '',
  logoUrl = '',
  config = {},
}) {
  const formattedDate = formatIssuedDateOrdinal(issuedDate);

  const finalSignatoryName = signatoryName || config?.punong_barangay || config?.signatory_name || 'HON. DAVID M. AGRAVANTE';
  const finalSignatoryTitle = signatoryTitle || config?.signatory_title || 'Punong Barangay';
  const finalLogoUrl = logoUrl || config?.seal_url || '/logo.jpg';
  const finalBarangayName = config?.barangay_name || 'Barangay Zapatera';
  const finalHallAddress = config?.hall_address || '197 D. Jakosalem St., Cebu City';
  const finalContactPhone = config?.contact_phone || '(032)503-6465';
  const finalContactEmail = config?.contact_email || 'zapatera.lnb24@gmail.com';

  return (
    <div className="document-a4-page bg-white text-slate-900 font-serif leading-normal select-text shadow-xl print:shadow-none border border-slate-300 print:border-none mx-auto relative box-border overflow-hidden">
      <div className="document-inner-content flex flex-col justify-between h-full p-[15mm] sm:p-[18mm] bg-white">
        
        {/* TOP HEADER SECTION */}
        <div className="relative pb-4">
          <div className="flex items-center justify-between">
            {/* Top-Left: Official Barangay Zapatera Seal */}
            <div className="w-24 h-24 flex items-center justify-center shrink-0">
              <img
                src={finalLogoUrl}
                alt={`${finalBarangayName} Seal`}
                className="w-22 h-22 object-contain"
                onError={(e) => {
                  e.target.src = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSC7-ggP-CV3i2oxM8blZUURu7etDHFsTflESouTQ7D9IHX-_OvA0oDIPs&s=10';
                }}
              />
            </div>

            {/* Top-Center: Official Barangay Letterhead Details */}
            <div className="text-center flex-1 px-4 space-y-0.5 font-sans">
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-950 uppercase tracking-tight">
                {finalBarangayName}
              </h2>
              <p className="text-xs sm:text-sm font-semibold text-slate-900">
                {finalHallAddress}
              </p>
              <p className="text-xs sm:text-sm font-bold text-slate-900">
                {finalContactPhone}
              </p>
              <p className="text-xs font-medium text-blue-700 underline">
                email add: {finalContactEmail}
              </p>
            </div>

            {/* Top-Right: Bagong Pilipinas Emblem / PH Gov Seal */}
            <div className="w-24 h-24 flex flex-col items-center justify-center shrink-0">
              <svg className="w-20 h-14" viewBox="0 0 120 70" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Bagong Pilipinas stylized wings */}
                <path d="M10 35 C 30 10, 60 5, 110 8 C 80 20, 50 28, 20 42 Z" fill="#0038A8" />
                <path d="M15 42 C 35 25, 65 22, 105 24 C 75 34, 45 42, 25 54 Z" fill="#CE1126" />
                <path d="M25 54 C 45 40, 75 38, 100 40 C 70 48, 45 54, 30 62 Z" fill="#FCD116" />
                {/* Sun element */}
                <circle cx="28" cy="22" r="8" fill="#FCD116" />
                <path d="M28 10 L28 14 M28 30 L28 34 M16 22 L20 22 M36 22 L40 22 M19 13 L22 16 M34 28 L37 31 M19 31 L22 28 M34 16 L37 13" stroke="#FCD116" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-900 font-sans mt-0.5">
                BAGONG PILIPINAS
              </span>
            </div>
          </div>

          {/* OFFICE OF THE PUNONG BARANGAY BANNER */}
          <div className="mt-5 text-center">
            <h3 className="text-base sm:text-lg font-black uppercase tracking-widest text-slate-950 font-sans">
              OFFICE OF THE PUNONG BARANGAY
            </h3>
            <div className="w-full h-1 bg-slate-950 mt-2"></div>
          </div>
        </div>

        {/* DOCUMENT TITLE */}
        <div className="text-center my-4">
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-slate-950">
            {documentTitle}
          </h1>
        </div>

        {/* STRUCTURED KEY-VALUE RESIDENT INFORMATION TABLE */}
        <div className="my-3 font-sans text-sm sm:text-base space-y-2 px-2">
          <div className="grid grid-cols-12 items-baseline">
            <span className="col-span-4 font-bold text-slate-900">Name</span>
            <span className="col-span-1 font-bold text-slate-900 text-center">:</span>
            <span className="col-span-7 font-extrabold uppercase text-slate-950 tracking-wide">
              {name || '________________________________________'}
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
              {dateOfBirth || '____________________'}
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

        {/* CERTIFICATION BODY PARAGRAPHS */}
        <div className="space-y-4 text-justify text-sm sm:text-base font-serif pt-4 leading-relaxed">
          <p className="indent-10">
            {bodyText}
          </p>

          <p className="indent-10">
            This certification is issued upon the request of the above-named person for whatever legal purpose it may serve.
          </p>

          <p className="indent-10">
            Issued and signed this <span className="font-bold text-slate-950">{formattedDate}</span> at{' '}
            <span className="font-bold text-slate-950">{issuedLocation}</span>.
          </p>
        </div>

        {/* SIGNATURE & OFFICIAL SEAL SECTION */}
        <div className="mt-8 pt-6 flex items-end justify-between">
          {/* Official Seal Watermark / Box */}
          <div className="w-36 h-28 border-2 border-dashed border-slate-400 rounded-lg flex flex-col items-center justify-center text-center p-2 text-slate-400">
            <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-slate-500">
              NOT VALID WITHOUT
            </span>
            <span className="text-[11px] font-sans font-black uppercase tracking-widest text-slate-600 mt-0.5">
              OFFICIAL SEAL
            </span>
          </div>

          {/* Punong Barangay Signature */}
          <div className="text-center min-w-[260px]">
            <div className="h-12"></div>
            <p className="text-base sm:text-lg font-black text-slate-950 uppercase font-sans tracking-wide border-b-2 border-slate-900 pb-1">
              {finalSignatoryName}
            </p>
            <p className="text-xs sm:text-sm font-bold text-slate-700 uppercase font-sans mt-1">
              {finalSignatoryTitle}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
