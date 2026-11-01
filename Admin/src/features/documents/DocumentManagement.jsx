// Admin/src/features/documents/DocumentManagement.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Printer,
  User,
  Search,
  Check,
  RefreshCw,
  Calendar,
  MapPin,
  RotateCcw,
  Sparkles,
  Phone,
  Clock,
  Cake,
  Sliders,
  DollarSign,
  Building,
  Building2,
  Hash,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../core/supabase';
import { StorageService } from '../../core/storage';
import { documentTemplates, formatIssuedDateOrdinal, formatResidentName } from './documentTemplates';
import DocumentTemplate from './DocumentTemplate';
import BusinessPermitModal from './BusinessPermitModal';

export default function DocumentManagement({ docTypes = [], config = {}, onNavigateToCatalog }) {
  const currentConfig = config && Object.keys(config).length > 0 ? config : StorageService.getConfig();

  // 1. Template selection state
  const templateKeys = Object.keys(documentTemplates);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('barangayCertification');
  const [selectedCatalogCode, setSelectedCatalogCode] = useState('');
  
  // 2. Certificate Template
  const [documentTitle, setDocumentTitle] = useState(documentTemplates.barangayCertification.title);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('Barangay Zapatera, Cebu City');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [contactNo, setContactNo] = useState('');
  const [yearsInBarangay, setYearsInBarangay] = useState('5 years');
  const [purpose, setPurpose] = useState(documentTemplates.barangayCertification.defaultPurpose);
  const [issuedDate, setIssuedDate] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [issuedLocation, setIssuedLocation] = useState('Barangay Zapatera, Cebu City');
  const [bodyText, setBodyText] = useState(documentTemplates.barangayCertification.defaultBody);
  const [signatoryName, setSignatoryName] = useState(currentConfig?.punong_barangay || currentConfig?.captainName || currentConfig?.signatory_name || 'HON. DAVID M. AGRAVANTE');
  const [signatoryTitle, setSignatoryTitle] = useState(currentConfig?.signatory_title || 'Punong Barangay');

  // Fee & Payment Breakdown State (matches user reference photo)
  const [fee, setFee] = useState(0);
  const [docStamps, setDocStamps] = useState(30);
  const [orNumber, setOrNumber] = useState('');

  // Business Clearance Template State
  const [templateType, setTemplateType] = useState('standard'); // 'standard' | 'business'
  const [businessName, setBusinessName] = useState('');
  const [permittee, setPermittee] = useState('');
  const [natureOfBusiness, setNatureOfBusiness] = useState('');
  const [capitalInvested, setCapitalInvested] = useState('1,290,000.00');
  const [grossSales, setGrossSales] = useState('300,000.00');
  const [showBusinessPermitModal, setShowBusinessPermitModal] = useState(false);

  useEffect(() => {
    if (currentConfig?.punong_barangay || currentConfig?.captainName || currentConfig?.signatory_name) {
      setSignatoryName(currentConfig.punong_barangay || currentConfig.captainName || currentConfig.signatory_name);
    }
    if (currentConfig?.signatory_title) {
      setSignatoryTitle(currentConfig.signatory_title);
    }
  }, [currentConfig]);

  // Fetch dynamic signatory from system configuration in Supabase
  useEffect(() => {
    StorageService.getConfigAsync().then((cfg) => {
      if (cfg) {
        const fetchedName = cfg.punong_barangay || cfg.captainName || cfg.signatory_name;
        if (fetchedName) setSignatoryName(fetchedName);
        if (cfg.signatory_title) setSignatoryTitle(cfg.signatory_title);
      }
    });

    const handleConfigChange = () => {
      const cfg = StorageService.getConfig();
      if (cfg) {
        const updatedName = cfg.punong_barangay || cfg.captainName || cfg.signatory_name;
        if (updatedName) setSignatoryName(updatedName);
        if (cfg.signatory_title) setSignatoryTitle(cfg.signatory_title);
      }
    };

    window.addEventListener('zapatera_config_updated', handleConfigChange);
    return () => window.removeEventListener('zapatera_config_updated', handleConfigChange);
  }, []);

  // 3. Supabase Residents State
  const [residents, setResidents] = useState([]);
  const [loadingResidents, setLoadingResidents] = useState(false);
  const [residentSearchInput, setResidentSearchInput] = useState('');
  const [showResidentDropdown, setShowResidentDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Fetch Residents from Supabase
  const fetchResidentsFromSupabase = async () => {
    setLoadingResidents(true);
    let fetched = [];

    try {
      if (isSupabaseConfigured()) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .order('full_name', { ascending: true });

        if (profileData && profileData.length > 0) {
          profileData.forEach((p) => {
            const role = (p.role || p.user_role || '').toLowerCase();
            // Include residents or accounts without elevated admin rights
            if (role === 'resident' || role === 'user' || !role) {
              const fullName =
                formatResidentName(p) ||
                p.full_name ||
                p.fullName ||
                `${p.first_name || ''} ${p.last_name || ''}`.trim() ||
                p.email ||
                '';
              const rawDob =
                p.birth_date ||
                p.birthdate ||
                p.date_of_birth ||
                p.dob ||
                p.birthday ||
                p.resident_birth_date ||
                '';
              let formattedDob = '';
              if (rawDob) {
                const s = String(rawDob).trim();
                if (s.includes('T')) {
                  formattedDob = s.split('T')[0];
                } else if (s.includes('/')) {
                  const parts = s.split('/');
                  if (parts.length === 3 && parts[2].length === 4) {
                    formattedDob = `${parts[2]}-${String(parts[0]).padStart(2, '0')}-${String(parts[1]).padStart(2, '0')}`;
                  } else {
                    formattedDob = s;
                  }
                } else {
                  formattedDob = s;
                }
              }

              if (fullName) {
                fetched.push({
                  id: p.id,
                  fullName,
                  email: p.email || '',
                  address: p.address || p.purok || 'Barangay Zapatera, Cebu City',
                  dateOfBirth: formattedDob,
                  contactNo: p.phone || p.contact_no || p.contact_number || p.mobile || '',
                  yearsInBarangay:
                    p.years_in_barangay ||
                    p.years_of_residency ||
                    p.residency_years ||
                    (p.created_at ? `${Math.max(1, new Date().getFullYear() - new Date(p.created_at).getFullYear())} years` : ''),
                });
              }
            }
          });
        }
      }
    } catch (err) {
      console.warn('Supabase profiles fetch notice:', err);
    }

    setResidents(fetched);
    if (fetched.length > 0 && !name) {
      handleSelectResident(fetched[0]);
    }
    setLoadingResidents(false);
  };

  useEffect(() => {
    fetchResidentsFromSupabase();
  }, []);

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowResidentDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle template selection from preset ribbon
  const handleSelectTemplate = (key) => {
    setSelectedTemplateKey(key);
    const tmpl = documentTemplates[key];
    if (tmpl) {
      setDocumentTitle(tmpl.title);
      setBodyText(tmpl.defaultBody);
      setPurpose(tmpl.defaultPurpose);
      const isBiz = tmpl.templateType === 'business' || key === 'businessClearance';
      setTemplateType(isBiz ? 'business' : 'standard');
      const tmplFee = Number(tmpl.defaultFee) || 0;
      setFee(tmplFee);
      setDocStamps(Number(tmpl.docStamps) || 30);
      if (tmplFee > 0 && !orNumber) {
        setOrNumber(`OR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
      }
    }
  };

  // Handle template selection from Service Catalog DROPBOX (Requested Feature)
  const handleSelectFromCatalog = (e) => {
    const val = e.target.value;
    setSelectedCatalogCode(val);
    const found = docTypes.find((d) => (d.code || d.id) === val);
    if (!found) return;

    const docTitle = (found.template_title || found.title || found.name || '').toUpperCase();
    setDocumentTitle(docTitle);

    const isVar = Boolean(found.is_variable_fee || found.fee_type === 'variable');
    const catalogFee = isVar ? 0 : (Number(found.fee) || 0);
    setFee(catalogFee);
    setDocStamps(Number(found.doc_stamps) || 30);
    if (catalogFee > 0 && !orNumber) {
      setOrNumber(`OR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    }

    const isBiz =
      found.template_type === 'business' ||
      found.code?.toLowerCase().includes('bus') ||
      docTitle?.toLowerCase().includes('business') ||
      found.title?.toLowerCase().includes('business');
    setTemplateType(isBiz ? 'business' : 'standard');

    if (found.template_body) {
      setBodyText(found.template_body);
    } else if (found.description) {
      setBodyText(found.description);
    }

    if (found.description) {
      setPurpose(found.description);
    }

    // Match preset key if applicable
    const matchingKey = Object.keys(documentTemplates).find((k) => {
      const tmpl = documentTemplates[k];
      return (
        tmpl.code?.toLowerCase() === found.code?.toLowerCase() ||
        tmpl.title?.toLowerCase() === docTitle?.toLowerCase()
      );
    });
    if (matchingKey) {
      setSelectedTemplateKey(matchingKey);
    }
  };

  // Handle selecting a resident from dropdown
  const handleSelectResident = (res) => {
    const formattedName = formatResidentName(res.fullName);
    setName(formattedName);
    setResidentSearchInput(formattedName);
    if (res.address) setAddress(res.address);
    setDateOfBirth(res.dateOfBirth || '');
    if (res.contactNo) setContactNo(res.contactNo);
    if (res.yearsInBarangay) setYearsInBarangay(res.yearsInBarangay);
    setShowResidentDropdown(false);
  };

  // Filter residents matching search
  const filteredResidents = residents.filter((r) => {
    if (!residentSearchInput.trim()) return true;
    const query = residentSearchInput.toLowerCase();
    return (
      r.fullName.toLowerCase().includes(query) ||
      (r.email && r.email.toLowerCase().includes(query)) ||
      (r.address && r.address.toLowerCase().includes(query))
    );
  });

  // Handle Print Action
  const handlePrint = () => {
    window.print();
  };

  const [previewZoom, setPreviewZoom] = useState(0.85);

  const currentTemplateConfig = documentTemplates[selectedTemplateKey] || documentTemplates.barangayCertification;

  const handleResetCurrentTemplate = () => {
    const tmpl = documentTemplates[selectedTemplateKey];
    if (tmpl) {
      setDocumentTitle(tmpl.title);
      setBodyText(tmpl.defaultBody);
      setPurpose(tmpl.defaultPurpose);
    }
  };

  return (
    <div className="space-y-5 font-sans text-slate-800">
      {/* 1. Official Template Selector Ribbon with Service Catalog Dropbox */}
      <div className="bg-white p-4 sm:p-5 rounded-[26px] border border-slate-100/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-blue-50 text-[#3b5bfd] flex items-center justify-center">
              <Sparkles size={14} />
            </div>
            <div>
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Step 1 — Choose Official Certificate Template
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Select an official certificate or clearance template from the dropbox to generate
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setTemplateType('business');
                setSelectedTemplateKey('businessClearance');
                setShowBusinessPermitModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-full transition-all shadow-sm cursor-pointer active:scale-95"
              title="Open Official Business Clearance Form Drawer / Quick Modal"
            >
              <Building2 size={13} />
              <span>Business Clearance Drawer</span>
            </button>
            {onNavigateToCatalog && (
              <button
                type="button"
                onClick={onNavigateToCatalog}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[11px] font-bold text-[#3b5bfd] bg-blue-50 hover:bg-blue-100 rounded-full border border-blue-200/80 transition-colors cursor-pointer shadow-2xs"
                title="View Document Service Catalog"
              >
                <Sliders size={12} />
                <span>Service Catalog ({docTypes.length})</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleResetCurrentTemplate}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[11px] font-bold text-slate-600 bg-[#f4f7fb] hover:bg-slate-200/70 rounded-full border border-slate-200/70 transition-colors cursor-pointer"
              title="Reset template text to default"
            >
              <RotateCcw size={12} />
              <span>Reset Template Text</span>
            </button>
          </div>
        </div>

        {/* PRIMARY SERVICE CATALOG TEMPLATE DROPBOX ONLY */}
        <div className="bg-gradient-to-r from-blue-50/70 via-slate-50 to-indigo-50/50 border-2 border-blue-200/80 rounded-2xl p-4 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <label className="text-xs font-extrabold uppercase tracking-wide text-slate-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3b5bfd] animate-pulse"></span>
              <span>Select Certificate / Clearance Template</span>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-[#3b5bfd] text-[10px] font-mono">
                {docTypes.length > 0 ? `${docTypes.length} Available` : 'Standard Templates'}
              </span>
            </label>
            <span className="text-[11px] font-medium text-slate-500 hidden sm:inline-block">
              {fee > 0 ? (
                <span className="text-emerald-700 font-bold">● Paid Service (O.R. Breakdown enabled in Live A4)</span>
              ) : (
                <span className="text-slate-600 font-bold">● Free Service (Clean Live A4 layout)</span>
              )}
            </span>
          </div>

          <div className="relative">
            <select
              value={selectedCatalogCode}
              onChange={handleSelectFromCatalog}
              className="w-full px-4 py-3 text-xs sm:text-sm font-bold bg-white border border-slate-300 rounded-xl text-slate-800 shadow-sm focus:ring-2 focus:ring-[#3b5bfd]/30 focus:border-[#3b5bfd] outline-none cursor-pointer"
            >
              <option value="" disabled>-- Select a Template from Dropbox --</option>
              {docTypes && docTypes.length > 0 ? (
                docTypes.map((dt) => {
                  const code = dt.code || dt.id;
                  const feeLabel = (dt.is_variable_fee || dt.fee_type === 'variable')
                    ? 'Depends on Claim'
                    : dt.fee > 0
                    ? `₱${Number(dt.fee).toFixed(2)}`
                    : 'FREE / Exempt';
                  return (
                    <option key={code} value={code}>
                      {dt.code ? `[${dt.code}] ` : ''}{dt.title || dt.name} • {feeLabel}
                    </option>
                  );
                })
              ) : (
                templateKeys.map((k) => {
                  const tmpl = documentTemplates[k];
                  const feeLabel = tmpl.defaultFee ? `₱${Number(tmpl.defaultFee).toFixed(2)}` : 'FREE / Exempt';
                  return (
                    <option key={k} value={`preset:${k}`}>
                      [{tmpl.code}] {tmpl.title} • {feeLabel}
                    </option>
                  );
                })
              )}
            </select>
          </div>
        </div>
      </div>

      {/* 2. Main 2-Column Split: Left Categorized Form Controls | Right Sticky Live A4 Print Studio */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Categorized Form Sections (5 Cols) */}
        <div className="xl:col-span-5 space-y-5">
          
          {/* CARD A: Resident & Applicant Profile */}
          <div className="bg-white p-5 sm:p-6 rounded-[26px] border border-slate-100/80 shadow-xs space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-blue-50 text-[#3b5bfd] flex items-center justify-center">
                  <User size={14} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 uppercase tracking-wider text-xs">
                    Step 2 — Resident Profile
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Auto-fill from registered directory or type manually
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={fetchResidentsFromSupabase}
                disabled={loadingResidents}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-[#3b5bfd] bg-blue-50 hover:bg-blue-100/80 rounded-full border border-blue-100 transition-colors cursor-pointer disabled:opacity-50"
                title="Refresh Registered Residents"
              >
                <RefreshCw size={12} className={loadingResidents ? 'animate-spin' : ''} />
                <span>{loadingResidents ? 'Syncing...' : `${residents.length} Residents`}</span>
              </button>
            </div>

            {/* Resident Name & Searchable Directory Selector */}
            <div className="relative" ref={dropdownRef}>
              <label className="block font-bold text-slate-700 mb-1.5">
                Full Name of Resident <span className="text-rose-500">*</span>
              </label>

              <div className="relative">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setResidentSearchInput(e.target.value);
                    setShowResidentDropdown(true);
                  }}
                  onFocus={() => setShowResidentDropdown(true)}
                  placeholder="Type name or select from directory..."
                  className="w-full px-3.5 py-2.5 bg-[#f4f7fb] border border-slate-200/80 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3b5bfd]/20 focus:border-[#3b5bfd] text-slate-900 font-bold transition-all"
                />
                <Search size={14} className="absolute right-3.5 top-3.5 text-slate-400" />
              </div>

              {/* Autocomplete Resident Dropdown */}
              {showResidentDropdown && filteredResidents.length > 0 && (
                <div className="absolute z-30 left-0 right-0 mt-1.5 bg-white border border-slate-200/90 rounded-2xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100">
                  {filteredResidents.slice(0, 8).map((res) => (
                    <button
                      key={res.id}
                      type="button"
                      onClick={() => handleSelectResident(res)}
                      className="w-full px-4 py-2.5 text-left hover:bg-blue-50/70 transition-colors cursor-pointer flex items-center justify-between group"
                    >
                      <div>
                        <p className="font-extrabold text-xs text-slate-800 group-hover:text-[#3b5bfd]">
                          {res.fullName}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[280px]">
                          {res.address}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold text-[#3b5bfd] opacity-0 group-hover:opacity-100 transition-opacity">
                        Select →
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Address */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <MapPin size={12} className="text-slate-400" />
                <span>Sitio / Full Address</span>
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Sitio Zapatera Proper, Cebu City"
                className="w-full px-3 py-2 bg-[#f4f7fb] border border-slate-200/80 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3b5bfd]/20 focus:border-[#3b5bfd] text-slate-900 transition-all"
              />
            </div>

            {/* Date of Birth & Contact No (Auto-fetched & editable) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Cake size={12} className="text-slate-400" />
                  <span>Date of Birth</span>
                </label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f4f7fb] border border-slate-200/80 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3b5bfd]/20 focus:border-[#3b5bfd] text-slate-900 transition-all"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Phone size={12} className="text-slate-400" />
                  <span>Contact Number</span>
                </label>
                <input
                  type="text"
                  value={contactNo}
                  onChange={(e) => setContactNo(e.target.value)}
                  placeholder="0917-000-0000"
                  className="w-full px-3 py-2 bg-[#f4f7fb] border border-slate-200/80 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3b5bfd]/20 focus:border-[#3b5bfd] text-slate-900 font-mono transition-all"
                />
              </div>
            </div>

            {/* Years in Barangay */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Clock size={12} className="text-slate-400" />
                <span>Years of Residency</span>
              </label>
              <input
                type="text"
                value={yearsInBarangay}
                onChange={(e) => setYearsInBarangay(e.target.value)}
                placeholder="e.g. 10 years / Since birth"
                className="w-full px-3 py-2 bg-[#f4f7fb] border border-slate-200/80 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3b5bfd]/20 focus:border-[#3b5bfd] text-slate-900 transition-all"
              />
            </div>
          </div>

          {/* CARD B: Business Entity Profile (Conditional for Business Clearance) */}
          {templateType === 'business' && (
            <div className="bg-white p-5 sm:p-6 rounded-[26px] border border-blue-200/80 shadow-xs space-y-4 text-xs animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-blue-50 text-[#3b5bfd] flex items-center justify-center">
                    <Building size={14} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 uppercase tracking-wider text-xs">
                      Business Entity Details
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Commercial establishment data printed on Business Clearance
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#3b5bfd] border border-blue-100">
                  Business Clearance
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Business Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. HAGIAZO AUDIO PRODUCTIONS CO."
                    className="w-full px-3.5 py-2 bg-[#f4f7fb] border border-slate-200/80 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3b5bfd]/20 focus:border-[#3b5bfd] text-slate-900 font-bold uppercase transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Permittee / Owner</label>
                    <input
                      type="text"
                      value={permittee}
                      onChange={(e) => setPermittee(e.target.value)}
                      placeholder="e.g. Homer G. Cang"
                      className="w-full px-3 py-2 bg-[#f4f7fb] border border-slate-200/80 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3b5bfd]/20 focus:border-[#3b5bfd] text-slate-900 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nature of Business</label>
                    <input
                      type="text"
                      value={natureOfBusiness}
                      onChange={(e) => setNatureOfBusiness(e.target.value)}
                      placeholder="e.g. Music Entertainment Services"
                      className="w-full px-3 py-2 bg-[#f4f7fb] border border-slate-200/80 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3b5bfd]/20 focus:border-[#3b5bfd] text-slate-900 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Capital Invested (₱)</label>
                    <input
                      type="text"
                      value={capitalInvested}
                      onChange={(e) => setCapitalInvested(e.target.value)}
                      placeholder="1,290,000.00"
                      className="w-full px-3 py-2 bg-[#f4f7fb] border border-slate-200/80 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3b5bfd]/20 focus:border-[#3b5bfd] text-slate-900 font-mono font-semibold transition-all"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Gross Sales (₱)</label>
                    <input
                      type="text"
                      value={grossSales}
                      onChange={(e) => setGrossSales(e.target.value)}
                      placeholder="300,000.00"
                      className="w-full px-3 py-2 bg-[#f4f7fb] border border-slate-200/80 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3b5bfd]/20 focus:border-[#3b5bfd] text-slate-900 font-mono font-semibold transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CARD C: Fee Assessment & Official Receipt (O.R.) Settings */}
          <div className="bg-white p-5 sm:p-6 rounded-[26px] border border-slate-100/80 shadow-xs space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <DollarSign size={14} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 uppercase tracking-wider text-xs">
                    Official Fee &amp; Payment Breakdown
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Controls the Official Receipt box printed on the Live A4 preview
                  </p>
                </div>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                fee > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
              }`}>
                {fee > 0 ? `Paid (₱${Number(fee).toFixed(2)})` : 'FREE / Exempt'}
              </span>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Processing Fee (₱) <span className="text-slate-400 font-normal">(0 = Free)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={fee}
                    onChange={(e) => setFee(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-[#f4f7fb] border border-slate-200/80 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3b5bfd]/20 focus:border-[#3b5bfd] text-slate-900 font-bold transition-all"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Doc. Stamps (₱)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={docStamps}
                    onChange={(e) => setDocStamps(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-[#f4f7fb] border border-slate-200/80 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3b5bfd]/20 focus:border-[#3b5bfd] text-slate-900 font-bold transition-all"
                  />
                </div>
              </div>

              {fee > 0 ? (
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-emerald-950 text-[11px] flex items-center gap-1">
                      <Hash size={12} className="text-emerald-700" />
                      <span>Official Receipt (O.R.) No.</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setOrNumber(`OR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`)}
                      className="text-[10px] font-bold text-emerald-700 hover:underline cursor-pointer"
                    >
                      Generate New O.R.
                    </button>
                  </div>
                  <input
                    type="text"
                    value={orNumber}
                    onChange={(e) => setOrNumber(e.target.value)}
                    placeholder="e.g. OR-2026-8492"
                    className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl focus:outline-none text-slate-900 font-mono font-bold"
                  />
                  <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-900 pt-1 border-t border-emerald-200">
                    <span>Total Assessed Amount:</span>
                    <span className="font-black text-sm">₱{(Number(fee) + Number(docStamps)).toFixed(2)}</span>
                  </div>
                  <p className="text-[10px] text-emerald-700 italic">
                    ✓ This fee breakdown is printed on the lower-left of the Live A4 document.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-slate-500">
                  <span className="font-bold text-slate-700">Free / Exempt Service:</span> The Live A4 preview will display cleanly without an Official Receipt (O.R.) payment box.
                </div>
              )}
            </div>
          </div>

          {/* CARD D: Certificate Content & Legal Purpose */}
          <div className="bg-white p-5 sm:p-6 rounded-[26px] border border-slate-100/80 shadow-xs space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-blue-50 text-[#3b5bfd] flex items-center justify-center">
                  <FileText size={14} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 uppercase tracking-wider text-xs">
                    Step 3 — Certificate Content
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Customize printed document title, purpose, and legal body
                  </p>
                </div>
              </div>
            </div>

            {/* Document Title Header */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                Printed Document Title
              </label>
              <input
                type="text"
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value.toUpperCase())}
                placeholder="e.g. BARANGAY CLEARANCE"
                className="w-full px-3.5 py-2.5 bg-[#f4f7fb] border border-slate-200/80 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3b5bfd]/20 focus:border-[#3b5bfd] text-slate-900 font-extrabold tracking-wide uppercase transition-all"
              />
            </div>

            {/* Purpose */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                Purpose of Clearance / Request
              </label>
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="e.g. Local Employment / Mayor's Business Permit"
                className="w-full px-3.5 py-2 bg-[#f4f7fb] border border-slate-200/80 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3b5bfd]/20 focus:border-[#3b5bfd] text-slate-900 transition-all font-semibold"
              />

              {currentTemplateConfig.suggestedPurposes && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {currentTemplateConfig.suggestedPurposes.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPurpose(p)}
                      className={`text-[10px] px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                        purpose === p
                          ? 'bg-[#3b5bfd] text-white border-[#3b5bfd] font-bold'
                          : 'bg-[#f4f7fb] text-slate-600 border-slate-200 hover:bg-slate-200/70'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Custom Body Text */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-bold text-slate-700">
                  Custom Legal Certification Body
                </label>
                <button
                  type="button"
                  onClick={() => setBodyText(currentTemplateConfig.defaultBody)}
                  className="text-[10px] font-bold text-[#3b5bfd] hover:underline cursor-pointer"
                >
                  Reset Default
                </button>
              </div>
              <textarea
                rows={3}
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                placeholder="Standard certification clause..."
                className="w-full p-3 bg-[#f4f7fb] border border-slate-200/80 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3b5bfd]/20 focus:border-[#3b5bfd] text-slate-800 leading-relaxed font-serif transition-all"
              />
            </div>

            {/* Signatory Full Name & Title */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Official Document Signatory (From System Configuration)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={signatoryName}
                  onChange={(e) => setSignatoryName(e.target.value)}
                  placeholder="e.g. HON. DAVID M. AGRAVANTE"
                  className="w-full px-3 py-2 text-xs bg-[#f4f7fb] border border-slate-200/80 rounded-2xl focus:bg-white focus:outline-none font-bold text-slate-900"
                />
                <input
                  type="text"
                  value={signatoryTitle}
                  onChange={(e) => setSignatoryTitle(e.target.value)}
                  placeholder="e.g. Punong Barangay"
                  className="w-full px-3 py-2 text-xs bg-[#f4f7fb] border border-slate-200/80 rounded-2xl focus:bg-white focus:outline-none font-medium text-slate-700"
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Sticky Real-Time Live A4 Print Preview Studio (7 Cols) */}
        <div className="xl:col-span-7 bg-white p-5 sm:p-6 rounded-[26px] border border-slate-100/80 shadow-xs space-y-4 xl:sticky xl:top-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  Live A4 Print Preview
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[#3b5bfd] text-[10px] font-mono font-bold">
                  210mm × 297mm (A4)
                </span>
                {fee > 0 ? (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                    Paid • O.R. Enabled
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">
                    Free / Exempt
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                Exact pixel &amp; print matching what will be printed at the Barangay Hall
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Zoom Controls */}
              <div className="flex items-center bg-[#f4f7fb] p-1 rounded-full border border-slate-200/80">
                {[0.7, 0.85, 1.0].map((z) => (
                  <button
                    key={z}
                    type="button"
                    onClick={() => setPreviewZoom(z)}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-full transition-all cursor-pointer ${
                      previewZoom === z
                        ? 'bg-white text-[#3b5bfd] shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {Math.round(z * 100)}%
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#3b5bfd] hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-full shadow-md shadow-blue-500/25 transition-all cursor-pointer active:scale-95"
              >
                <Printer size={15} />
                <span>Print Certificate</span>
              </button>
            </div>
          </div>

          {/* Scaled A4 Preview Canvas */}
          <div className="w-full overflow-x-auto flex justify-center py-5 px-2 bg-[#f4f7fb] rounded-2xl border border-slate-200/60 max-h-[820px] overflow-y-auto">
            <div
              style={{ transform: `scale(${previewZoom})`, transformOrigin: 'top center' }}
              className="transition-transform duration-200"
            >
              <DocumentTemplate
                documentTitle={documentTitle}
                name={name}
                address={address}
                dateOfBirth={dateOfBirth}
                contactNo={contactNo}
                yearsInBarangay={yearsInBarangay}
                purpose={purpose}
                issuedDate={issuedDate}
                issuedLocation={issuedLocation}
                bodyText={bodyText}
                signatoryName={signatoryName}
                signatoryTitle={signatoryTitle}
                config={currentConfig}
                fee={fee}
                docStamps={docStamps}
                orNumber={orNumber}
                templateType={templateType}
                businessName={businessName}
                permittee={permittee}
                natureOfBusiness={natureOfBusiness}
                capitalInvested={capitalInvested}
                grossSales={grossSales}
              />
            </div>
          </div>
        </div>

      </div>

      {/* Business Clearance Quick Form Input Modal / Drawer */}
      <BusinessPermitModal
        isOpen={showBusinessPermitModal}
        onClose={() => setShowBusinessPermitModal(false)}
        initialData={{
          business_name: businessName || 'HAGIAZO AUDIO PRODUCTIONS CO.',
          permittee_name: permittee || name || 'Homer G. Cang',
          business_address: address || 'Cherry Court Bldg., Gen. Maxilom Ave., Brgy. Zapatera, Cebu City',
          nature_of_business: natureOfBusiness || 'Music Entertainment Services',
          contact_number: contactNo || '09173226058',
          capital_invested: capitalInvested || '1,290,000.00',
          gross_sales: grossSales || '300,000.00',
          purpose: purpose || "the renewal of Mayor's Business Permit.",
          issued_date: issuedDate || new Date().toISOString().split('T')[0],
          punong_barangay_name: signatoryName,
          punong_barangay_title: signatoryTitle,
          payment: {
            has_fee: fee > 0,
            or_number: orNumber || 'OR-2026-8842',
            fee_amount: Number(fee) || 500,
            doc_stamps_amount: Number(docStamps) || 30,
            total_amount: (Number(fee) || 0) + (Number(docStamps) || 0),
            payment_date: issuedDate || new Date().toISOString().split('T')[0],
          },
        }}
        onPrint={(permitData) => {
          setBusinessName(permitData.business_name);
          setPermittee(permitData.permittee_name);
          setAddress(permitData.business_address);
          setNatureOfBusiness(permitData.nature_of_business);
          setContactNo(permitData.contact_number);
          setCapitalInvested(String(permitData.capital_invested || ''));
          setGrossSales(String(permitData.gross_sales || ''));
          setPurpose(permitData.purpose || '');
          setIssuedDate(permitData.issued_date);
          if (permitData.punong_barangay_name) setSignatoryName(permitData.punong_barangay_name);
          if (permitData.punong_barangay_title) setSignatoryTitle(permitData.punong_barangay_title);
          if (permitData.payment) {
            setFee(permitData.payment.has_fee ? (permitData.payment.fee_amount || 0) : 0);
            setDocStamps(permitData.payment.doc_stamps_amount || 30);
            setOrNumber(permitData.payment.or_number || '');
          }
          setTemplateType('business');
          setSelectedTemplateKey('businessClearance');
          setShowBusinessPermitModal(false);
          setTimeout(() => {
            window.print();
          }, 150);
        }}
        residents={residents}
        defaultSignatoryName={signatoryName}
        defaultSignatoryTitle={signatoryTitle}
      />

      {/* HIDDEN PRINT ROOT: Rendered ONLY when window.print() is executed */}
      <div id="printable-document-root" className="hidden print:block">
        <DocumentTemplate
          documentTitle={documentTitle}
          name={name}
          address={address}
          dateOfBirth={dateOfBirth}
          contactNo={contactNo}
          yearsInBarangay={yearsInBarangay}
          purpose={purpose}
          issuedDate={issuedDate}
          issuedLocation={issuedLocation}
          bodyText={bodyText}
          signatoryName={signatoryName}
          signatoryTitle={signatoryTitle}
          config={currentConfig}
          fee={fee}
          docStamps={docStamps}
          orNumber={orNumber}
          templateType={templateType}
          businessName={businessName}
          permittee={permittee}
          natureOfBusiness={natureOfBusiness}
          capitalInvested={capitalInvested}
          grossSales={grossSales}
        />
      </div>
    </div>
  );
}
