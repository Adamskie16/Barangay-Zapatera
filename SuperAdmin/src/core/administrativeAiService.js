// SuperAdmin/src/core/administrativeAiService.js
// Enterprise AI Copilot for Barangay Zapatera Administration
// Powers:
// 1. AI-Assisted Administrative Triage & Multilingual Decline/Correction Notice Drafting
// 2. Civic Bulletin Localization & Public Advisory Synthesizer (Cebuano, Tagalog, English)

export const DECLINE_PRESETS = [
  {
    id: 'blurry_image',
    label: 'Blurry / Unreadable Image',
    icon: '📸',
    reasonCategory: 'Document Image is Blurry / Unreadable',
  },
  {
    id: 'cutoff_id',
    label: 'Cut-off / Incomplete ID',
    icon: '✂️',
    reasonCategory: 'Document Edges Cut Off / Incomplete',
  },
  {
    id: 'missing_id',
    label: 'Missing Valid Gov ID',
    icon: '🪪',
    reasonCategory: 'Missing valid government-issued ID',
  },
  {
    id: 'invalid_residency',
    label: 'Invalid Residency Proof',
    icon: '🏠',
    reasonCategory: 'Proof of residency not accepted or outdated',
  },
  {
    id: 'incomplete_requirements',
    label: 'Incomplete Requirements',
    icon: '📋',
    reasonCategory: 'Incomplete required attachments',
  },
];

/**
 * Generates an empathetic, formal, policy-compliant decline explanation
 * tailored to the resident in their preferred language.
 */
export function generateDeclineNotice({
  residentName = 'Resident',
  documentTitle = 'Document Request',
  reasonKey = 'blurry_image',
  language = 'cebuano', // 'cebuano' | 'tagalog' | 'english'
  customNotes = '',
}) {
  const firstName = (residentName || 'Resident').split(' ')[0];

  switch (reasonKey) {
    case 'blurry_image':
      if (language === 'cebuano') {
        return (
          `Maayong adlaw ${firstName}. Wala ma-aprobahan ang imong ${documentTitle} tungod kay hanap o dili maklaro ang gisumite nga litrato sa imong ID/dokumento. ` +
          `Palihog pagkuha og tin-aw, hayag, ug tarong nga hulagway diin mabasa ang tanang teksto, ug mag-file og bag-ong request.${customNotes ? ` Pahinumdom: ${customNotes}` : ''}`
        );
      }
      if (language === 'tagalog') {
        return (
          `Magandang araw ${firstName}. Hindi naaprubahan ang iyong kahilingan para sa ${documentTitle} dahil malabo o hindi mabasa ang isinumiteng kopya ng iyong ID/dokumento. ` +
          `Mangyaring kumuha ng malinaw at maliwanag na litrato kung saan nababasa ang lahat ng detalye, at muling mag-file ng request.${customNotes ? ` Paalala: ${customNotes}` : ''}`
        );
      }
      return (
        `Good day ${firstName}. Your request for ${documentTitle} could not be approved because the submitted document image is blurry or unreadable. ` +
        `Please capture a clear, well-lit photo where all text is sharp and legible, then submit a new request.${customNotes ? ` Note: ${customNotes}` : ''}`
      );

    case 'cutoff_id':
      if (language === 'cebuano') {
        return (
          `Maayong adlaw ${firstName}. Ang gisumite nga ID alang sa imong ${documentTitle} naputol o dili kompleto ang mga kilid ug eskina. ` +
          `Palihog kuhaa ang tibuok ID diin makita ang tanang upat (4) ka eskina aron ma-beripika sa Barangay Hall ang imong dokumento.${customNotes ? ` Dugang detalye: ${customNotes}` : ''}`
        );
      }
      if (language === 'tagalog') {
        return (
          `Magandang araw ${firstName}. Ang isinumiteng ID para sa iyong ${documentTitle} ay putol o hindi kumpleto ang mga gilid at sulok. ` +
          `Mangyaring kuhanan ang buong ID kung saan kitang-kita ang lahat ng apat (4) na sulok para sa tamang pag-beripika sa Barangay Hall.${customNotes ? ` Karagdagang detalye: ${customNotes}` : ''}`
        );
      }
      return (
        `Good day ${firstName}. The ID card submitted for your ${documentTitle} appears cut off or missing borders. ` +
        `Please capture the entire document ensuring all four (4) corners and margins are fully visible inside the frame.${customNotes ? ` Additional instructions: ${customNotes}` : ''}`
      );

    case 'missing_id':
      if (language === 'cebuano') {
        return (
          `Maayong adlaw ${firstName}. Kulang ang balidong identification card sa imong gipasa alang sa ${documentTitle}. ` +
          `Palihog pag-andam og balidong government-issued ID (sama sa PhilSys National ID, Voter's Certificate, Driver's License, o SSS ID) ug i-file pag-usab ang request.${customNotes ? ` Pahinumdom: ${customNotes}` : ''}`
        );
      }
      if (language === 'tagalog') {
        return (
          `Magandang araw ${firstName}. Kulang ang wastong identification card na isinumite para sa iyong ${documentTitle}. ` +
          `Mangyaring maghanda ng balidong government-issued ID (tulad ng PhilSys National ID, Voter's Certificate, Driver's License, o SSS ID) at muling mag-file.${customNotes ? ` Paalala: ${customNotes}` : ''}`
        );
      }
      return (
        `Good day ${firstName}. Your application for ${documentTitle} is missing a valid government-issued identification card. ` +
        `Please prepare an accepted government ID (such as PhilSys National ID, Voter's Certificate, or Driver's License) and submit a new request.${customNotes ? ` Note: ${customNotes}` : ''}`
      );

    case 'invalid_residency':
      if (language === 'cebuano') {
        return (
          `Maayong adlaw ${firstName}. Ang gisumite nga pamatuod sa residency sa Barangay Zapatera wala motugma sa gikinahanglang sumbanan. ` +
          `Palihog pagsumite og kasamtangang utility bill (kuryente/tubig), opisyal nga lease contract, o voter's record nga nagpamatuod sa imong pagpuyo sa atong barangay.${customNotes ? ` Dugang giya: ${customNotes}` : ''}`
        );
      }
      if (language === 'tagalog') {
        return (
          `Magandang araw ${firstName}. Ang isinumiteng katibayan ng paninirahan sa Barangay Zapatera ay hindi pumasa sa mga kinakailangang pamantayan. ` +
          `Mangyaring magsumite ng kasalukuyang utility bill (kuryente/tubig), lease contract, o voter's record na nagpapatunay ng iyong paninirahan sa barangay.${customNotes ? ` Karagdagang gabay: ${customNotes}` : ''}`
        );
      }
      return (
        `Good day ${firstName}. The proof of residency submitted does not meet Barangay Zapatera verification requirements. ` +
        `Please provide a current utility bill (VECO/MCWD), valid lease agreement, or official residency certificate confirming your residence.${customNotes ? ` Instructions: ${customNotes}` : ''}`
      );

    default: // incomplete_requirements
      if (language === 'cebuano') {
        return (
          `Maayong adlaw ${firstName}. Wala ma-aprobahan ang imong ${documentTitle} tungod sa kulang nga mga rekisitos. ` +
          `Palihog susiha ang opisyal nga checklist sa atong Barangay Portal ug isumite ang tanang gipangayo sa dili pa mag-file pag-usab.${customNotes ? ` Mubo nga sulat gikan sa admin: ${customNotes}` : ''}`
        );
      }
      if (language === 'tagalog') {
        return (
          `Magandang araw ${firstName}. Hindi naaprubahan ang iyong ${documentTitle} dahil sa kakulangan sa mga kinakailangang dokumento. ` +
          `Mangyaring tingnan ang opisyal na checklist sa ating Barangay Portal at kumpletuhin ang mga requirements bago mag-file muli.${customNotes ? ` Mensahe mula sa admin: ${customNotes}` : ''}`
        );
      }
      return (
        `Good day ${firstName}. Your application for ${documentTitle} could not be approved due to incomplete supporting requirements. ` +
        `Please review the requirements checklist in the portal and ensure all mandatory documents are attached before filing again.${customNotes ? ` Admin note: ${customNotes}` : ''}`
      );
  }
}

/**
 * Pre-built Smart LGU Bulletin Templates
 */
export const CIVIC_ANNOUNCEMENT_TEMPLATES = [
  {
    id: 'typhoon_advisory',
    name: 'Typhoon / Weather Advisory',
    category: 'Public Advisory',
    title: 'Typhoon Weather Advisory & Barangay Disaster Preparedness Alert',
    description: 'Advisory on localized weather disturbances, emergency hotline numbers, and evacuation staging areas.',
    content:
      'BARANGAY ZAPATERA DISASTER RISK REDUCTION & MANAGEMENT COUNCIL (BDRRMC)\n\n' +
      'Pahibalo / Advisory to all residents regarding prevailing weather disturbances:\n\n' +
      '1. Emergency Operations Center (EOC) is active 24/7 at Barangay Zapatera Hall.\n' +
      '2. Evacuation staging area is established at the Zapatera Sports Complex / Gymnasium.\n' +
      '3. Residents along low-lying and flood-prone sitios are advised to monitor official advisories.\n' +
      '4. Emergency Hotlines: (032) 255-0000 | 911 | CDRRMO Cebu City.',
  },
  {
    id: 'medical_mission',
    name: 'Free Health & Medical Mission',
    category: 'Health & Wellness',
    title: 'Free Community Medical, Dental & Pediatric Health Mission',
    description: 'Comprehensive free health consultation, pediatric check-ups, and maintenance medicines for residents.',
    content:
      'BARANGAY ZAPATERA HEALTH & NUTRITION PROGRAM\n\n' +
      'In partnership with the Cebu City Health Department, Barangay Zapatera will conduct a Free Health Mission:\n\n' +
      '• Date & Time: This Saturday, 8:00 AM - 3:00 PM\n' +
      '• Venue: Barangay Zapatera Gymnasium, Rahmann St.\n' +
      '• Free Services: General Check-up, Dental Extraction, Pediatric Screening, Free Vitamins & Maintenance Medicines.\n' +
      '• Requirements: Please bring valid Resident ID or Barangay Clearance for priority queuing.',
  },
  {
    id: 'general_assembly',
    name: 'Barangay General Assembly',
    category: 'Official Notice',
    title: 'Notice of First Semester Barangay General Assembly',
    description: 'Annual statutory assembly of residents, state of barangay address, and community consultation.',
    content:
      'OFFICE OF THE BARANGAY CAPTAIN - BARANGAY ZAPATERA\n\n' +
      'Pursuant to the Local Government Code, all registered residents and household heads are cordially invited:\n\n' +
      '• Agenda: State of the Barangay Address (SOBA), Financial Audit & Treasury Report, Community Safety Ordinances, and Open Resident Forum.\n' +
      '• Date: Upcoming Sunday, 2:00 PM\n' +
      '• Venue: Barangay Zapatera Multi-Purpose Hall\n' +
      'Your active participation directly shapes our local community programs.',
  },
  {
    id: 'water_interruption',
    name: 'Utility Interruption Advisory',
    category: 'Public Advisory',
    title: 'Scheduled Water & Infrastructure Maintenance Notice',
    description: 'Notice of temporary utility maintenance and scheduled supply schedule across all sitios.',
    content:
      'PUBLIC WORKS & UTILITY NOTICE\n\n' +
      'Residents in Sitio Zapatera Proper, Rahmann, and neighboring areas are advised of scheduled maintenance:\n\n' +
      '• Scope: Pipe replacement and infrastructure repair.\n' +
      '• Duration: Tomorrow from 9:00 PM to 5:00 AM.\n' +
      '• Action Required: Please store sufficient domestic water supply prior to maintenance hours.\n' +
      'Normal utility pressure is anticipated to restore immediately after testing.',
  },
];

/**
 * Localizes an announcement into Cebuano, Tagalog, or English
 */
export function translateCivicAnnouncement({
  title = '',
  description = '',
  content = '',
  targetLanguage = 'cebuano',
}) {
  if (targetLanguage === 'cebuano') {
    return {
      title: title.toLowerCase().includes('pahibalo') ? title : `Pahibalo: ${title}`,
      description: `Opisyal nga pahibalo gikan sa Barangay Zapatera alang sa tanang residente ug pamilya sa komunidad.`,
      content:
        `OPISYAL NGA PAHIBALO - BARANGAY ZAPATERA\n\n` +
        `Alang sa kasayuran sa tanang minahal nga mga lumulupyo sa Barangay Zapatera, Cebu City:\n\n` +
        `${content}\n\n` +
        `Alang sa mga pangutana, palihog bisitaha ang Barangay Hall o kontaka ang atong Opisyal nga Linya sa Komunidad. Daghang salamat sa inyong kooperasyon.`,
    };
  }

  if (targetLanguage === 'tagalog') {
    return {
      title: title.toLowerCase().includes('pabatid') ? title : `Pabatid: ${title}`,
      description: `Opisyal na pabatid mula sa Pamahalaang Barangay ng Zapatera para sa lahat ng residente at pamilya.`,
      content:
        `OPISYAL NA PABATID - BARANGAY ZAPATERA\n\n` +
        `Para sa kaalaman ng lahat ng mga residente sa Barangay Zapatera, Lungsod ng Cebu:\n\n` +
        `${content}\n\n` +
        `Para sa mga katanungan o karagdagang impormasyon, mangyaring makipag-ugnayan sa Barangay Hall. Maraming salamat sa inyong patuloy na kooperasyon.`,
    };
  }

  // English formatting
  return {
    title: title.replace(/^(Pahibalo:\s*|Pabatid:\s*)/i, ''),
    description: description || `Official civic announcement from Barangay Zapatera Administration.`,
    content:
      `OFFICIAL BARANGAY ADVISORY - BARANGAY ZAPATERA, CEBU CITY\n\n` +
      `${content}\n\n` +
      `For inquiries or assistance, please contact the Barangay Hall Desk or visit our official community portal. Thank you for your cooperation.`,
  };
}
