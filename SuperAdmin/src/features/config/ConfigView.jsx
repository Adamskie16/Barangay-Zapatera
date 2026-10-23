// SuperAdmin/src/features/config/ConfigView.jsx
import React, { useState } from 'react';
import {
  Settings,
  Save,
  Shield,
  CheckCircle,
  Image,
  Globe,
  Mail,
  Phone,
  Clock,
  FileCode,
  Upload,
  Lock,
  AlertTriangle,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';
import { sanitizeInput } from '../../core/security';
import { supabase, isSupabaseConfigured } from '../../core/supabase';
import { StorageService } from '../../core/storage';
import Modal from '../../components/Modal';
import SecurityVerificationModal from '../../components/SecurityVerificationModal';

export default function ConfigView({ config, onSaveConfig }) {
  const [formData, setFormData] = useState({ ...config });
  const [isSaved, setIsSaved] = useState(false);
  const [uploadingSeal, setUploadingSeal] = useState(false);

  // Security Verification Modal State
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [securityPassword, setSecurityPassword] = useState('');
  const [securityError, setSecurityError] = useState('');
  const [showSecurityPassword, setShowSecurityPassword] = useState(false);
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);

  async function verifyLoggedInPassword(inputPassword) {
    if (!inputPassword) return false;

    const session =
      (typeof StorageService !== 'undefined' && StorageService.getCurrentUser ? StorageService.getCurrentUser() : null) ||
      JSON.parse(
        localStorage.getItem('zapatera_superadmin_session') ||
        localStorage.getItem('zapatera_admin_session') ||
        'null'
      );
    const loggedInEmail = (session?.email || '').trim().toLowerCase();
    if (!loggedInEmail) return false;

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: loggedInEmail,
          password: inputPassword,
        });
        if (!error && data?.user) return true;
      } catch (e) {
        return false;
      }
    } else {
      if (session?.password && session.password === inputPassword) return true;
    }
    return false;
  }

  const handleSealUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSeal(true);
    try {
      if (isSupabaseConfigured()) {
        const sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase();
        const path = `seals/seal_${Date.now()}_${sanitized}`;
        const { data, error } = await supabase.storage.from('public_assets').upload(path, file, {
          contentType: file.type || 'image/png',
          upsert: true,
        });
        if (!error && data?.path) {
          const { data: pubData } = supabase.storage.from('public_assets').getPublicUrl(data.path);
          if (pubData?.publicUrl) {
            setFormData((prev) => ({ ...prev, seal_url: pubData.publicUrl }));
            setUploadingSeal(false);
            return;
          }
        }
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        setFormData((prev) => ({ ...prev, seal_url: ev.target.result }));
        setUploadingSeal(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setFormData((prev) => ({ ...prev, seal_url: ev.target.result }));
        setUploadingSeal(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInitiateSave = (e) => {
    e.preventDefault();
    setSecurityPassword('');
    setSecurityError('');
    setShowSecurityPassword(false);
    setIsSecurityModalOpen(true);
  };

  const handleConfirmSaveConfig = async () => {
    if (!securityPassword.trim()) {
      setSecurityError('Please enter your logged-in account password.');
      return;
    }
    setIsVerifyingPassword(true);
    setSecurityError('');

    const isValid = await verifyLoggedInPassword(securityPassword);
    if (!isValid) {
      setSecurityError('Security Verification Failed: Incorrect logged-in account password.');
      setIsVerifyingPassword(false);
      return;
    }

    setIsVerifyingPassword(false);
    setIsSecurityModalOpen(false);
    setSecurityPassword('');

    executeSaveConfig();
  };

  const executeSaveConfig = () => {
    const updated = {
      ...formData,
      barangay_name: sanitizeInput(formData.barangay_name || 'Barangay Zapatera'),
      municipality: sanitizeInput(formData.municipality || 'Cebu City'),
      province: sanitizeInput(formData.province || 'Cebu'),
      punong_barangay: sanitizeInput(formData.punong_barangay || 'HON. DAVID M. AGRAVANTE'),
      signatory_title: sanitizeInput(formData.signatory_title || 'Punong Barangay'),
      hall_address: sanitizeInput(formData.hall_address || '197 D. Jakosalem St., Cebu City'),
      office_hours: sanitizeInput(formData.office_hours || 'Mon - Fri: 8:00 AM - 5:00 PM'),
      contact_email: sanitizeInput(formData.contact_email || 'zapatera.lnb24@gmail.com'),
      contact_phone: sanitizeInput(formData.contact_phone || '(032)503-6465'),
      doc_prefix: sanitizeInput(formData.doc_prefix || 'BRGY-2026'),
    };
    onSaveConfig(updated);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="min-h-full bg-[#f4f7fb] rounded-3xl px-1 sm:px-2 py-1 space-y-6 text-slate-800 font-sans pb-12">
      {/* Top Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 px-1 pt-1">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white text-[#3b5bfd] text-[11px] font-bold uppercase tracking-wider mb-2 shadow-xs border border-slate-100">
            <Settings className="w-3.5 h-3.5 text-[#38bdf8]" />
            <span>Global Governance Parameters</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            System Configurations
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Manage official barangay identification, document signatory metadata, office hours, and automated tracking number controls.
          </p>
        </div>

        {isSaved && (
          <span className="inline-flex items-center px-4 py-2 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs self-start lg:self-auto">
            <CheckCircle className="w-4 h-4 mr-1.5 text-emerald-600" />
            <span>Settings Saved Successfully!</span>
          </span>
        )}
      </div>

      {/* 4 Colorful Gradient KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="relative overflow-hidden rounded-[24px] p-5 bg-linear-to-br from-[#3b5bfd] via-[#4f6ef7] to-[#60a5fa] text-white shadow-[0_14px_30px_-12px_rgba(59,91,253,0.45)] flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/80">Official Barangay</p>
            <h3 className="text-lg sm:text-xl font-extrabold mt-1 tracking-tight truncate">
              {formData.barangay_name || 'Barangay Zapatera'}
            </h3>
            <p className="text-[11px] text-white/80 mt-1 truncate">
              {formData.municipality || 'Cebu City'}, {formData.province || 'Cebu'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white text-[#3b5bfd] flex items-center justify-center shadow-md shrink-0">
            <Globe className="w-6 h-6" />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[24px] p-5 bg-linear-to-br from-[#10b981] via-[#14b8a6] to-[#34d399] text-white shadow-[0_14px_30px_-12px_rgba(16,185,129,0.45)] flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/80">Official Signatory</p>
            <h3 className="text-base sm:text-lg font-extrabold mt-1 tracking-tight truncate">
              {formData.punong_barangay || 'HON. DAVID M. AGRAVANTE'}
            </h3>
            <p className="text-[11px] text-white/80 mt-1 truncate">
              {formData.signatory_title || 'Punong Barangay'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white text-emerald-600 flex items-center justify-center shadow-md shrink-0">
            <Shield className="w-6 h-6" />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[24px] p-5 bg-linear-to-br from-[#6366f1] via-[#8b5cf6] to-[#a855f7] text-white shadow-[0_14px_30px_-12px_rgba(139,92,246,0.45)] flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/80">Tracking Prefix</p>
            <h3 className="text-lg sm:text-xl font-extrabold mt-1 tracking-tight font-mono">
              {formData.doc_prefix || 'BZ-2026'}
            </h3>
            <p className="text-[11px] text-white/80 mt-1 font-mono truncate">
              {formData.doc_prefix || 'BZ-2026'}-XXXX
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white text-indigo-600 flex items-center justify-center shadow-md shrink-0">
            <FileCode className="w-6 h-6" />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[24px] p-5 bg-linear-to-br from-[#f59e0b] via-[#f97316] to-[#fb923c] text-white shadow-[0_14px_30px_-12px_rgba(249,115,22,0.42)] flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/80">Resident Email Alerts</p>
            <h3 className="text-lg sm:text-xl font-extrabold mt-1 tracking-tight">
              {String(formData.auto_notify) === 'false' ? 'Manual Mode' : 'Auto Dispatch'}
            </h3>
            <p className="text-[11px] text-white/80 mt-1 truncate">
              {formData.office_hours || 'Mon - Fri: 8AM - 5PM'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white text-amber-500 flex items-center justify-center shadow-md shrink-0">
            <Mail className="w-6 h-6" />
          </div>
        </div>
      </div>

      <form onSubmit={handleInitiateSave} className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column: Barangay Identification & Signatory */}
        <div className="xl:col-span-7 space-y-6">
          {/* Barangay Branding & Seal */}
          <div className="bg-white p-6 sm:p-7 rounded-[26px] border border-slate-100 shadow-[0_8px_30px_rgb(15,23,42,0.04)] space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Barangay Identification &amp; Seal</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Official LGU name, jurisdiction, address, and seal.</p>
                </div>
              </div>
              <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                Identity
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Barangay Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.barangay_name || ''}
                  onChange={(e) => setFormData({ ...formData, barangay_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-2xl bg-[#f4f7fb] focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-[#3b5bfd] focus:outline-none font-bold text-slate-900 transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Municipality / City *
                </label>
                <input
                  type="text"
                  required
                  value={formData.municipality || ''}
                  onChange={(e) => setFormData({ ...formData, municipality: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-2xl bg-[#f4f7fb] focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-[#3b5bfd] focus:outline-none font-semibold text-slate-900 transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Province *
                </label>
                <input
                  type="text"
                  required
                  value={formData.province || ''}
                  onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-2xl bg-[#f4f7fb] focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-[#3b5bfd] focus:outline-none font-semibold text-slate-900 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Barangay Hall Physical Address
              </label>
              <input
                type="text"
                value={formData.hall_address || ''}
                onChange={(e) => setFormData({ ...formData, hall_address: e.target.value })}
                placeholder="e.g. 197 D. Jakosalem St., Cebu City"
                className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-2xl bg-[#f4f7fb] focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-[#3b5bfd] focus:outline-none font-semibold text-slate-900 transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Official Seal Image URL or Upload
              </label>
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <input
                    type="text"
                    value={formData.seal_url || ''}
                    onChange={(e) => setFormData({ ...formData, seal_url: e.target.value })}
                    placeholder="https://... or upload official seal"
                    className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-2xl bg-[#f4f7fb] focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-[#3b5bfd] focus:outline-none font-mono text-slate-900 transition-all"
                  />
                </div>
                <label
                  className="px-4 py-2.5 rounded-full text-xs font-bold bg-[#f4f7fb] hover:bg-blue-50 text-[#3b5bfd] border border-blue-200 flex items-center space-x-1.5 cursor-pointer shrink-0 transition-colors"
                  title="Upload Official Seal Image"
                >
                  {uploadingSeal ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#3b5bfd]" />
                  ) : (
                    <Upload className="w-3.5 h-3.5 text-[#3b5bfd]" />
                  )}
                  <span>{uploadingSeal ? 'Uploading…' : 'Upload Seal'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingSeal}
                    onChange={handleSealUpload}
                  />
                </label>
                {formData.seal_url && (
                  <img
                    src={formData.seal_url}
                    alt="Seal Preview"
                    className="w-10 h-10 rounded-2xl border border-slate-200 object-cover shrink-0 bg-white p-0.5 shadow-2xs"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Official Document Signatory Settings */}
          <div className="bg-white p-6 sm:p-7 rounded-[26px] border border-slate-100 shadow-[0_8px_30px_rgb(15,23,42,0.04)] space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200/80 text-[#3b5bfd] flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Official Document Signatory</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Printed on all official barangay clearances and certificates.</p>
                </div>
              </div>
              <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-blue-50 text-[#3b5bfd] border border-blue-100 shrink-0">
                Signatory
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Punong Barangay / Signatory Full Name
                </label>
                <input
                  type="text"
                  value={formData.punong_barangay || ''}
                  onChange={(e) => setFormData({ ...formData, punong_barangay: e.target.value })}
                  placeholder="e.g. HON. DAVID M. AGRAVANTE"
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-2xl bg-[#f4f7fb] focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-[#3b5bfd] focus:outline-none font-bold text-slate-900 transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Signatory Title / Designation
                </label>
                <input
                  type="text"
                  value={formData.signatory_title || ''}
                  onChange={(e) => setFormData({ ...formData, signatory_title: e.target.value })}
                  placeholder="e.g. Punong Barangay"
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-2xl bg-[#f4f7fb] focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-[#3b5bfd] focus:outline-none font-semibold text-slate-900 transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Office Contact & Document Control Formatting */}
        <div className="xl:col-span-5 space-y-6">
          {/* Operational & Contact Settings */}
          <div className="bg-white p-6 sm:p-7 rounded-[26px] border border-slate-100 shadow-[0_8px_30px_rgb(15,23,42,0.04)] space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Office &amp; Contact Parameters</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Public working hours, email, and hotline.</p>
                </div>
              </div>
              <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                Operations
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Office Hours
                </label>
                <input
                  type="text"
                  value={formData.office_hours || ''}
                  onChange={(e) => setFormData({ ...formData, office_hours: e.target.value })}
                  placeholder="Mon - Fri: 8:00 AM - 5:00 PM"
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-2xl bg-[#f4f7fb] focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-[#3b5bfd] focus:outline-none font-semibold text-slate-900 transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={formData.contact_email || ''}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-2xl bg-[#f4f7fb] focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-[#3b5bfd] focus:outline-none font-semibold text-slate-900 transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Hotline / Phone
                </label>
                <input
                  type="text"
                  value={formData.contact_phone || ''}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-2xl bg-[#f4f7fb] focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-[#3b5bfd] focus:outline-none font-semibold text-slate-900 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Issuance Controls & Notifications */}
          <div className="bg-white p-6 sm:p-7 rounded-[26px] border border-slate-100 shadow-[0_8px_30px_rgb(15,23,42,0.04)] space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200/80 text-indigo-600 flex items-center justify-center shrink-0">
                  <FileCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Document Control Formatting</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Tracking number prefix and email notifications.</p>
                </div>
              </div>
              <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                Automation
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Document Tracking Code Prefix
                </label>
                <input
                  type="text"
                  required
                  value={formData.doc_prefix}
                  onChange={(e) => setFormData({ ...formData, doc_prefix: e.target.value })}
                  placeholder="e.g. BZ-2026"
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-2xl bg-[#f4f7fb] focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-[#3b5bfd] focus:outline-none font-mono font-bold text-slate-900 transition-all"
                />
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Tracking numbers format as:{' '}
                  <span className="font-mono font-bold text-[#3b5bfd] bg-blue-50 px-2 py-0.5 rounded-full">
                    {formData.doc_prefix || 'BZ-2026'}-XXXX
                  </span>
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Automated Resident Email Alerts
                </label>
                <select
                  value={formData.auto_notify}
                  onChange={(e) => setFormData({ ...formData, auto_notify: e.target.value === 'true' })}
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-2xl bg-[#f4f7fb] focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-[#3b5bfd] focus:outline-none font-bold text-slate-800 cursor-pointer transition-all"
                >
                  <option value="true">Enabled (Auto dispatch status changes)</option>
                  <option value="false">Disabled (Manual updates only)</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
              <button
                type="submit"
                className="inline-flex items-center space-x-2 px-6 py-2.5 bg-[#3b5bfd] hover:bg-blue-700 text-white rounded-full text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save System Configurations</span>
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Security Verification Modal for System Configuration */}
      <SecurityVerificationModal
        isOpen={isSecurityModalOpen}
        onClose={() => {
          setIsSecurityModalOpen(false);
          setSecurityPassword('');
          setSecurityError('');
        }}
        onVerified={executeSaveConfig}
        title="Security Verification: Save Configuration"
        message="Please confirm your administrator password to authorize modifications to global barangay parameters, official seal, and numbering controls."
        confirmText="Verify & Save Configurations"
        isDestructive={false}
      />
    </div>
  );
}
