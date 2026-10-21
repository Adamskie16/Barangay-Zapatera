// Admin/src/features/documents/documentTemplates.js

export const documentTemplates = {
  barangayCertification: {
    id: 'barangayCertification',
    code: 'BC-01',
    title: 'BARANGAY CERTIFICATION',
    defaultBody:
      'This is to certify that the above named person is a resident of the barangay and known to be of good moral standing.',
    defaultPurpose: 'Local Employment Application',
    suggestedPurposes: [
      'Local Employment Application',
      'Overseas Employment (POEA/DMW)',
      'Bank Account Opening',
      'Postal ID Application',
      'NBI / Police Clearance Requirement',
      'School Admission / Scholarship',
      'Loan / Financial Assistance',
      'Legal & Identification Purposes',
    ],
  },
  barangayClearance: {
    id: 'barangayClearance',
    code: 'BC-02',
    title: 'BARANGAY CLEARANCE',
    defaultBody:
      'This is to certify that the above named person is a law-abiding citizen with good moral standing, and has NO DEROGATORY RECORD on file in this barangay.',
    defaultPurpose: 'Employment Requirement',
    suggestedPurposes: [
      'Employment Requirement',
      'Business Permit Application',
      'TIN / SSS / PhilHealth Registration',
      'Driver\'s License Application',
      'Firearms License Application',
      'Bank Requirement',
    ],
  },
  certificateOfResidency: {
    id: 'certificateOfResidency',
    code: 'BC-03',
    title: 'CERTIFICATE OF RESIDENCY',
    defaultBody:
      'This is to certify that the above named person is a bona fide resident of Barangay Zapatera, Cebu City, residing at the address indicated above.',
    defaultPurpose: 'Proof of Residency',
    suggestedPurposes: [
      'Proof of Residency',
      'Voter Registration (COMELEC)',
      'Government Cash Assistance (4Ps / AICS)',
      'Senior Citizen ID Application',
      'PWD ID Application',
      'Electric / Water Utility Connection',
      'Travel Clearance',
    ],
  },
  certificateOfGoodMoralCharacter: {
    id: 'certificateOfGoodMoralCharacter',
    code: 'BC-04',
    title: 'CERTIFICATE OF GOOD MORAL CHARACTER',
    defaultBody:
      'This is to certify that the above named person is a person of good moral character, a peace-loving citizen, and has maintained a clean record in our barangay community.',
    defaultPurpose: 'Academic & Professional Requirement',
    suggestedPurposes: [
      'Academic & Professional Requirement',
      'Scholarship Application',
      'Board Exam / PRC Requirement',
      'Military / Police Enlistment',
      'Legal Reference',
    ],
  },
  certificateOfIndigency: {
    id: 'certificateOfIndigency',
    code: 'BC-05',
    title: 'CERTIFICATE OF INDIGENCY',
    defaultBody:
      'This is to certify that the above named person belongs to the low-income / indigent family in our barangay and is in need of medical, educational, or financial assistance.',
    defaultPurpose: 'Medical & Financial Assistance',
    suggestedPurposes: [
      'Medical & Financial Assistance (DSWD/Malasakit)',
      'Hospital Bill Discount / Waiver',
      'PAO Legal Assistance',
      'Free Tuition / Educational Assistance',
    ],
  },
  firstTimeJobseeker: {
    id: 'firstTimeJobseeker',
    code: 'BC-06',
    title: 'FIRST TIME JOBSEEKER CERTIFICATE',
    defaultBody:
      'This is to certify that the above named person is a first-time jobseeker qualified to avail the benefits and fee exemptions pursuant to Republic Act No. 11261 (First Time Jobseekers Assistance Act).',
    defaultPurpose: 'First Time Job Application (RA 11261)',
    suggestedPurposes: [
      'First Time Job Application (RA 11261)',
      'Government Pre-employment Documents',
      'NBI / Police Clearance Waiver',
    ],
  },
};

/**
 * Returns ordinal suffix for given day (e.g. 1st, 2nd, 3rd, 4th, 21st, 22nd, 23rd, 31st)
 */
export function getOrdinalSuffix(day) {
  const d = parseInt(day, 10);
  if (isNaN(d)) return 'th';
  if (d > 3 && d < 21) return 'th';
  switch (d % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

/**
 * Formats a date string/object into dynamic ordinal day format:
 * e.g., "September 4, 2026" or "2026-09-04" -> "4th day of September 2026"
 */
export function formatIssuedDateOrdinal(dateInput) {
  if (!dateInput) {
    const today = new Date();
    const day = today.getDate();
    const ordinal = getOrdinalSuffix(day);
    const month = today.toLocaleString('en-US', { month: 'long' });
    const year = today.getFullYear();
    return `${day}${ordinal} day of ${month} ${year}`;
  }

  // Check if string already contains formatted text
  if (typeof dateInput === 'string' && dateInput.includes('day of')) {
    return dateInput;
  }

  const parsed = new Date(dateInput);
  if (isNaN(parsed.getTime())) {
    return dateInput;
  }

  const day = parsed.getDate();
  const ordinal = getOrdinalSuffix(day);
  const month = parsed.toLocaleString('en-US', { month: 'long' });
  const year = parsed.getFullYear();

  return `${day}${ordinal} day of ${month} ${year}`;
}

/**
 * Formats a resident's name into "Firstname Middle Name Last Name" format.
 * Examples:
 *   "Keith, Adam" -> "Adam Keith"
 *   "Keith, Adam M." -> "Adam M. Keith"
 *   "Keith, Adam Santos" -> "Adam Santos Keith"
 *   { first_name: "Adam", middle_name: "Santos", last_name: "Keith" } -> "Adam Santos Keith"
 *   { first_name: "Adam", middle_initial: "M", last_name: "Keith" } -> "Adam M. Keith"
 *   { full_name: "Keith, Adam" } -> "Adam Keith"
 */
export function formatResidentName(input) {
  if (!input) return '';

  // Case 1: Input is an object (profile / resident row)
  if (typeof input === 'object') {
    const first = (input.first_name || input.firstName || '').trim();
    const last = (input.last_name || input.lastName || '').trim();
    let middle = (input.middle_name || input.middleName || input.middle_initial || input.middleInitial || '').trim();

    if (middle.length === 1 && /^[a-zA-Z]$/.test(middle)) {
      middle = `${middle.toUpperCase()}.`;
    }

    if (first && last) {
      if (!middle && input.full_name && input.full_name.includes(',')) {
        const parsedFromFn = formatResidentName(input.full_name);
        if (parsedFromFn && parsedFromFn.split(' ').length > 2) {
          return parsedFromFn;
        }
      }
      return `${first} ${middle ? middle + ' ' : ''}${last}`.replace(/\s+/g, ' ').trim();
    }

    const rawFullName = input.full_name || input.fullName || input.name || '';
    if (rawFullName && typeof rawFullName === 'string') {
      return formatResidentName(rawFullName);
    }

    if (first || last) {
      return `${first} ${last}`.trim();
    }

    return input.email || '';
  }

  // Case 2: Input is a string
  if (typeof input === 'string') {
    const str = input.trim();
    if (!str) return '';

    // If string has a comma (e.g. "Lastname, Firstname" or "Lastname, Firstname MiddleName/MI")
    if (str.includes(',')) {
      const parts = str.split(',').map((s) => s.trim()).filter(Boolean);
      if (parts.length >= 2) {
        const lastName = parts[0];
        const firstAndMiddle = parts.slice(1).join(' ').trim();
        return `${firstAndMiddle} ${lastName}`.replace(/\s+/g, ' ').trim();
      }
    }

    return str.replace(/\s+/g, ' ').trim();
  }

  return String(input).trim();
}
