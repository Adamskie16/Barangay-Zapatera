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
  HelpCircle,
  RotateCcw,
  Sparkles,
  Phone,
  Clock,
  Cake,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../core/supabase';
import { StorageService } from '../../core/storage';
import { documentTemplates, formatIssuedDateOrdinal, formatResidentName } from './documentTemplates';
import DocumentTemplate from './DocumentTemplate';

export default function DocumentManagement({ docTypes = [], config = {} }) {
  const currentConfig = config && Object.keys(config).length > 0 ? config : StorageService.getConfig();

  // 1. Template selection state
  const templateKeys = Object.keys(documentTemplates);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('barangayCertification');
  
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
  const [issuedLocation, setIssuedLocation] = useState('Barangay Zapatera, Cebu City, Philippines');
  const [bodyText, setBodyText] = useState(documentTemplates.barangayCertification.defaultBody);
  const [signatoryName, setSignatoryName] = useState(currentConfig?.punong_barangay || currentConfig?.signatory_name || 'HON. DAVID M. AGRAVANTE');
  const [signatoryTitle, setSignatoryTitle] = useState(currentConfig?.signatory_title || 'Punong Barangay');

  useEffect(() => {
    if (currentConfig?.punong_barangay || currentConfig?.signatory_name) {
      setSignatoryName(currentConfig.punong_barangay || currentConfig.signatory_name);
    }
    if (currentConfig?.signatory_title) {
      setSignatoryTitle(currentConfig.signatory_title);
    }
  }, [currentConfig]);

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
        const { data: profileData, error: profileErr } = await supabase
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
              if (fullName) {
                fetched.push({
                  id: p.id,
                  fullName,
                  email: p.email || '',
                  address: p.address || p.purok || 'Barangay Zapatera, Cebu City',
                  dateOfBirth: p.date_of_birth || p.birthdate || p.dob || p.birthday || '',
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

  // Handle template selection
  const handleSelectTemplate = (key) => {
    setSelectedTemplateKey(key);
    const tmpl = documentTemplates[key];
    if (tmpl) {
      setDocumentTitle(tmpl.title);
      setBodyText(tmpl.defaultBody);
      setPurpose(tmpl.defaultPurpose);
    }
  };

  // Handle selecting a resident from dropdown
  const handleSelectResident = (res) => {
    const formattedName = formatResidentName(res.fullName);
    setName(formattedName);
    setResidentSearchInput(formattedName);
    if (res.address) setAddress(res.address);
    if (res.dateOfBirth) setDateOfBirth(res.dateOfBirth);
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

  const templateMeta = {
    barangayCertification: { badge: 'General Cert', subtitle: 'Residency & general legal purposes' },
    barangayClearance: { badge: 'Clearance', subtitle: 'Good moral & derogatory record check' },
    certificateOfIndigency: { badge: 'Indigency', subtitle: 'Medical, scholarship & financial aid' },
    businessClearance: { badge: 'Business', subtitle: 'Commercial & permit operations' },
  };

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
      {/* 1. Horizontal 4-Card Official Template Selector Ribbon */}
      <div className="bg-white p-4 sm:p-5 rounded-[26px] border border-slate-100/80 shadow-xs space-y-3.5">
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
                Select a preset A4 template below to auto-populate standard barangay legal wording
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {templateKeys.map((k) => {
            const tmpl = documentTemplates[k];
            const meta = templateMeta[k] || { badge: 'Official', subtitle: 'Standard barangay certificate' };
            const isActive = selectedTemplateKey === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => handleSelectTemplate(k)}
                className={`p-3.5 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                  isActive
                    ? 'border-[#3b5bfd] bg-gradient-to-br from-[#3b5bfd] to-[#2563eb] text-white shadow-md shadow-blue-500/20'
                    : 'border-slate-200/70 bg-[#f4f7fb] hover:bg-white hover:border-blue-200 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-white text-[#3b5bfd] border border-blue-100'
                    }`}
                  >
                    {meta.badge}
                  </span>
                  {isActive ? (
                    <span className="w-5 h-5 rounded-full bg-white text-[#3b5bfd] flex items-center justify-center shadow-2xs">
                      <Check size={12} className="stroke-[3]" />
                    </span>
                  ) : (
                    <FileText size={14} className="text-slate-400" />
                  )}
                </div>
                <div>
                  <p className={`text-xs font-extrabold truncate ${isActive ? 'text-white' : 'text-slate-900'}`}>
                    {tmpl.title}
                  </p>
                  <p className={`text-[10px] truncate mt-0.5 ${isActive ? 'text-white/80' : 'text-slate-400 font-medium'}`}>
                    {meta.subtitle}
                  </p>
                </div>
              </button>
            );
          })}
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
                  onBlur={() => {
                    if (name && name.includes(',')) {
                      const formatted = formatResidentName(name);
                      if (formatted) {
                        setName(formatted);
                        setResidentSearchInput(formatted);
                      }
                    }
                  }}
                  onFocus={() => setShowResidentDropdown(true)}
                  placeholder="Search registered resident or type full name..."
                  className="w-full pl-9 pr-3.5 py-2.5 bg-[#f4f7fb] border border-slate-200/80 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3b5bfd]/20 focus:border-[#3b5bfd] font-bold text-slate-900 transition-all"
                />
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              {/* Resident Dropdown Selection */}
              {showResidentDropdown && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200/80 rounded-2xl shadow-xl z-30 max-h-52 overflow-y-auto divide-y divide-slate-100">
                  {filteredResidents.length > 0 ? (
                    filteredResidents.map((r) => (
                      <div
                        key={r.id || r.email || r.fullName}
                        onClick={() => handleSelectResident(r)}
                        className="p-2.5 text-xs hover:bg-blue-50/70 cursor-pointer flex items-center justify-between transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">{r.fullName}</p>
                          <p className="text-[10px] text-slate-400 truncate">{r.address}</p>
                        </div>
                        {r.fullName.toLowerCase() === name.toLowerCase() && (
                          <Check size={14} className="text-[#3b5bfd] shrink-0 ml-2" />
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-[11px] text-slate-400 text-center">
                      No matching registered resident found. You can type manually above.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Residential Address */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                <MapPin size={12} className="text-[#3b5bfd]" />
                <span>Complete Residential Address</span>
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 197 D. Jakosalem St., Zapatera, Cebu City"
                className="w-full px-3.5 py-2 bg-[#f4f7fb] border border-slate-200/80 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3b5bfd]/20 focus:border-[#3b5bfd] text-slate-900 font-medium transition-all"
              />
            </div>

            {/* Date of Birth, Contact No, and Years in Barangay */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                  <Cake size={12} className="text-[#3b5bfd]" />
                  <span>Birthdate</span>
                </label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f4f7fb] border border-slate-200/80 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3b5bfd]/20 focus:border-[#3b5bfd] text-slate-900 transition-all"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                  <Phone size={12} className="text-[#3b5bfd]" />
                  <span>Contact No.</span>
                </label>
                <input
                  type="text"
                  value={contactNo}
                  onChange={(e) => setContactNo(e.target.value)}
                  placeholder="09171234567"
                  className="w-full px-3 py-2 bg-[#f4f7fb] border border-slate-200/80 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3b5bfd]/20 focus:border-[#3b5bfd] font-mono text-slate-900 transition-all"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                  <Clock size={12} className="text-[#3b5bfd]" />
                  <span>Residency</span>
                </label>
                <input
                  type="text"
                  value={yearsInBarangay}
                  onChange={(e) => setYearsInBarangay(e.target.value)}
                  placeholder="e.g. 5 years"
                  className="w-full px-3 py-2 bg-[#f4f7fb] border border-slate-200/80 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3b5bfd]/20 focus:border-[#3b5bfd] text-slate-900 transition-all"
                />
              </div>
            </div>
          </div>

          {/* CARD B: Certificate Content & Signatory Settings */}
          <div className="bg-white p-5 sm:p-6 rounded-[26px] border border-slate-100/80 shadow-xs space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-blue-50 text-[#3b5bfd] flex items-center justify-center">
                  <FileText size={14} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 uppercase tracking-wider text-xs">
                    Step 3 — Certificate Details & Signatory
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Customize purpose, issuance date, body text, and official signatory
                  </p>
                </div>
              </div>
            </div>

            {/* Document Header Title */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                Certificate Heading Title
              </label>
              <input
                type="text"
                required
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value.toUpperCase())}
                placeholder="e.g. BARANGAY CERTIFICATION"
                className="w-full px-3.5 py-2 bg-[#f4f7fb] border border-slate-200/80 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3b5bfd]/20 focus:border-[#3b5bfd] font-bold tracking-wide uppercase text-slate-900 transition-all"
              />
            </div>

            {/* Purpose + Quick Suggestion Pills */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                Issuance Purpose
              </label>
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="e.g. Local Employment, Scholarship, Bank Requirement"
                className="w-full px-3.5 py-2 bg-[#f4f7fb] border border-slate-200/80 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3b5bfd]/20 focus:border-[#3b5bfd] font-semibold text-slate-900 transition-all"
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
                          ? 'bg-[#3b5bfd] text-white border-[#3b5bfd] font-bold shadow-2xs'
                          : 'bg-[#f4f7fb] text-slate-600 border-slate-200/70 hover:bg-slate-200/70 font-medium'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Issued Date & Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                  <Calendar size={12} className="text-[#3b5bfd]" />
                  <span>Date Issued</span>
                </label>
                <input
                  type="date"
                  value={issuedDate}
                  onChange={(e) => setIssuedDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#f4f7fb] border border-slate-200/80 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3b5bfd]/20 focus:border-[#3b5bfd] text-slate-900 transition-all"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Place Issued
                </label>
                <input
                  type="text"
                  value={issuedLocation}
                  onChange={(e) => setIssuedLocation(e.target.value)}
                  placeholder="Barangay Zapatera, Cebu City"
                  className="w-full px-3.5 py-2 bg-[#f4f7fb] border border-slate-200/80 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3b5bfd]/20 focus:border-[#3b5bfd] text-slate-900 transition-all"
                />
              </div>
            </div>

            {/* Ordinal Date Preview Pill */}
            <div className="px-3.5 py-2.5 bg-blue-50/70 border border-blue-100 rounded-2xl text-[11px] text-blue-900 flex items-center justify-between">
              <span className="font-bold text-[#3b5bfd]">Formatted Date on Certificate:</span>
              <span className="font-serif italic font-semibold">{formatIssuedDateOrdinal(issuedDate)}</span>
            </div>

            {/* Certification Body Text */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-bold text-slate-700">Certification Body Paragraph</label>
                <button
                  type="button"
                  onClick={() => setBodyText(currentTemplateConfig.defaultBody)}
                  className="text-[10px] font-bold text-[#3b5bfd] hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw size={10} />
                  <span>Restore Default Wording</span>
                </button>
              </div>
              <textarea
                rows={3}
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#f4f7fb] border border-slate-200/80 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3b5bfd]/20 focus:border-[#3b5bfd] text-slate-900 leading-relaxed text-xs transition-all"
              />
            </div>

            {/* Signatory Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2.5 border-t border-slate-100">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Signatory Name</label>
                <input
                  type="text"
                  value={signatoryName}
                  onChange={(e) => setSignatoryName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#f4f7fb] border border-slate-200/80 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3b5bfd]/20 focus:border-[#3b5bfd] text-slate-900 font-bold transition-all"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Signatory Title</label>
                <input
                  type="text"
                  value={signatoryTitle}
                  onChange={(e) => setSignatoryTitle(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#f4f7fb] border border-slate-200/80 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3b5bfd]/20 focus:border-[#3b5bfd] text-slate-900 transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Sticky Live A4 Print Studio (7 Cols) */}
        <div className="xl:col-span-7 xl:sticky xl:top-4 bg-white rounded-[26px] p-4 sm:p-6 border border-slate-100/80 shadow-xs flex flex-col items-center justify-start overflow-hidden">
          
          {/* Studio Action Header Bar */}
          <div className="w-full flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                  Live A4 Print Preview
                </h4>
                <p className="text-[10px] text-slate-400 font-medium">
                  {documentTitle} • {name || 'Resident Applicant'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Zoom Scale Pills */}
              <div className="hidden sm:inline-flex items-center bg-[#f4f7fb] p-1 rounded-full border border-slate-200/70">
                {[
                  { label: '75%', value: 0.75 },
                  { label: '85%', value: 0.85 },
                  { label: '95%', value: 0.95 },
                ].map((z) => (
                  <button
                    key={z.label}
                    type="button"
                    onClick={() => setPreviewZoom(z.value)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                      previewZoom === z.value
                        ? 'bg-white text-[#3b5bfd] shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {z.label}
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
              />
            </div>
          </div>
        </div>

      </div>

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
        />
      </div>
    </div>
  );
}
