// SuperAdmin/src/features/documents/DocumentTemplate.jsx
import React from 'react';
import { formatIssuedDateOrdinal } from './documentTemplates';

/**
 * Standard A4 Printable Document Template (210mm x 297mm)
 * Used identically for live on-screen preview and browser print / PDF generation.
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
  const finalMunicipality = config?.municipality || 'City of Cebu';
  const finalProvince = config?.province || 'Cebu';
  const finalHallAddress = config?.hall_address || '197 D. Jakosalem St., Cebu City';
  const finalContactPhone = config?.contact_phone || '(032) 253-1234';
  const finalContactEmail = config?.contact_email || 'info@barangayzapatera.gov.ph';

  return (
    <div className="document-a4-page bg-white text-slate-900 font-serif leading-normal select-text shadow-xl print:shadow-none border border-slate-200 print:border-none mx-auto relative box-border overflow-hidden">
      <div className="document-inner-content flex flex-col justify-between h-full p-[18mm] sm:p-[20mm]">
        
        {/* HEADER SECTION */}
        <div className="text-center space-y-1 relative pb-4 border-b-2 border-slate-900">
          {/* Logo */}
          <div className="absolute left-0 top-0 w-20 h-20 flex items-center justify-center">
            <img
              src={finalLogoUrl}
              alt={`${finalBarangayName} Seal`}
              className="w-18 h-18 object-contain rounded-full border border-slate-300"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>

          <div className="space-y-0.5">
            <p className="text-xs uppercase tracking-widest font-sans font-medium text-slate-700">
              Republic of the Philippines
            </p>
            <p className="text-sm font-bold uppercase tracking-wider text-slate-800">
              {finalMunicipality}, {finalProvince}
            </p>
            <p className="text-lg font-extrabold uppercase tracking-wide text-blue-900 font-sans">
              {finalBarangayName}
            </p>
          </div>

          <div className="text-[11px] text-slate-600 font-sans space-y-0.5 pt-1">
            <p>{finalHallAddress}</p>
            <p>{finalContactPhone} • email add: {finalContactEmail}</p>
          </div>

          <div className="pt-2">
            <span className="inline-block text-xs font-bold uppercase tracking-wider px-3 py-0.5 bg-blue-900 text-white rounded font-sans">
              Office of the Punong Barangay
            </span>
          </div>
        </div>

        {/* DOCUMENT TITLE */}
        <div className="text-center my-6">
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-slate-950 underline decoration-2 underline-offset-8">
            {documentTitle}
          </h1>
        </div>

        {/* RECIPIENT SALUTATION */}
        <div className="space-y-1">
          <p className="font-bold text-sm sm:text-base uppercase tracking-wide text-slate-900">
            TO WHOM IT MAY CONCERN:
          </p>
        </div>

        {/* BODY PARAGRAPHS */}
        <div className="space-y-4 text-justify text-sm sm:text-base indent-8">
          <p>
            This is to certify that{' '}
            <span className="font-bold uppercase text-slate-950 underline decoration-1">
              {name || '________________________'}
            </span>
            , of legal age, Filipino, residing at{' '}
            <span className="font-bold text-slate-950">
              {address || '________________________'}
            </span>
            {yearsInBarangay ? (
              <span>
                , has been a bona fide resident of this Barangay for{' '}
                <span className="font-bold text-slate-950">{yearsInBarangay}</span>
              </span>
            ) : null}
            .
          </p>

          <p>
            {bodyText}
          </p>

          <p>
            This certification is issued upon the request of the above-named person for the purpose of:{' '}
            <span className="font-bold text-slate-950 uppercase underline decoration-1">
              {purpose || 'ANY LEGAL PURPOSE'}
            </span>
            .
          </p>

          <p>
            Issued and signed this <span className="font-bold text-slate-950">{formattedDate}</span> at{' '}
            <span className="font-bold text-slate-950">{issuedLocation}</span>.
          </p>
        </div>

        {/* SIGNATURE & OFFICIAL SEAL SECTION */}
        <div className="mt-8 pt-4 flex items-end justify-between">
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
          <div className="text-center min-w-[240px]">
            <div className="h-10"></div>
            <p className="text-sm sm:text-base font-black text-slate-950 uppercase font-sans tracking-wide border-b-2 border-slate-900 pb-1">
              {finalSignatoryName}
            </p>
            <p className="text-xs font-bold text-slate-600 uppercase font-sans mt-1">
              {finalSignatoryTitle}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
