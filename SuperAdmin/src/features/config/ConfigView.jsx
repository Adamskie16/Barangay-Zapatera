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
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">System Configurations</h2>
          <p className="text-xs text-slate-500 mt-1">
            Global governance parameters, official barangay branding, contact metadata, and automated issuance controls.
          </p>
        </div>
        {isSaved && (
          <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 animate-fade-in">
            <CheckCircle className="w-4 h-4 mr-1 text-emerald-600" /> Settings Saved!
          </span>
        )}
      </div>

      <form onSubmit={handleInitiateSave} className="space-y-6">
        {/* Barangay Branding & Seal */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Shield className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Barangay Identification</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Barangay Name</label>
              <input
                type="text"
                required
                value={formData.barangay_name || ''}
                onChange={(e) => setFormData({ ...formData, barangay_name: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Municipality / City</label>
              <input
                type="text"
                required
                value={formData.municipality || ''}
                onChange={(e) => setFormData({ ...formData, municipality: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Province</label>
              <input
                type="text"
                required
                value={formData.province || ''}
                onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Barangay Hall Physical Address</label>
            <input
              type="text"
              value={formData.hall_address || ''}
              onChange={(e) => setFormData({ ...formData, hall_address: e.target.value })}
              placeholder="e.g. 197 D. Jakosalem St., Cebu City"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Official Seal Image URL</label>
            <div className="flex items-center space-x-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={formData.seal_url || ''}
                  onChange={(e) => setFormData({ ...formData, seal_url: e.target.value })}
                  placeholder="https://... or upload official seal"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
              <label
                className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 flex items-center space-x-1.5 cursor-pointer shrink-0 transition-colors"
                title="Upload Official Seal Image"
              >
                {uploadingSeal ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                ) : (
                  <Upload className="w-3.5 h-3.5 text-blue-600" />
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
                  className="w-10 h-10 rounded-full border border-slate-200 object-cover shrink-0"
                />
              )}
            </div>
          </div>
        </div>

        {/* Official Document Signatory Settings */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Shield className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Official Document Signatory</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Punong Barangay / Signatory Full Name</label>
              <input
                type="text"
                value={formData.punong_barangay || ''}
                onChange={(e) => setFormData({ ...formData, punong_barangay: e.target.value })}
                placeholder="e.g. HON. DAVID M. AGRAVANTE"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Signatory Title / Designation</label>
              <input
                type="text"
                value={formData.signatory_title || ''}
                onChange={(e) => setFormData({ ...formData, signatory_title: e.target.value })}
                placeholder="e.g. Punong Barangay"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Operational & Contact Settings */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Clock className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Office & Contact Parameters</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Office Hours</label>
              <input
                type="text"
                value={formData.office_hours || ''}
                onChange={(e) => setFormData({ ...formData, office_hours: e.target.value })}
                placeholder="Mon - Fri: 8:00 AM - 5:00 PM"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Contact Email</label>
              <input
                type="email"
                value={formData.contact_email || ''}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Hotline / Phone</label>
              <input
                type="text"
                value={formData.contact_phone || ''}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Issuance Controls & Notifications */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <FileCode className="w-5 h-5 text-purple-600" />
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Document Control Formatting</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Document Tracking Code Prefix</label>
              <input
                type="text"
                required
                value={formData.doc_prefix}
                onChange={(e) => setFormData({ ...formData, doc_prefix: e.target.value })}
                placeholder="e.g. BZ-2026"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono font-bold"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Tracking numbers will format as: <span className="font-mono font-bold text-blue-700">{formData.doc_prefix}-XXXX</span>
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Automated Resident Email Alerts</label>
              <select
                value={formData.auto_notify}
                onChange={(e) => setFormData({ ...formData, auto_notify: e.target.value === 'true' })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-semibold"
              >
                <option value="true">Enabled (Auto dispatch status changes)</option>
                <option value="false">Disabled (Manual updates only)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end pt-2">
          <button
            type="submit"
            className="inline-flex items-center space-x-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-900/20 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save System Configurations</span>
          </button>
        </div>
      </form>

      {/* Security Verification Modal for System Configuration */}
      <Modal
        isOpen={isSecurityModalOpen}
        onClose={() => {
          setIsSecurityModalOpen(false);
          setSecurityPassword('');
          setSecurityError('');
        }}
        title="Security Verification - Save System Configurations"
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 flex items-start space-x-3">
            <Shield className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-blue-950">Authorize System Configuration</p>
              <p className="text-xs text-blue-800 mt-1">
                Please enter your logged-in administrator password to authorize modifications to global barangay parameters, official branding seal, and document numbering controls.
              </p>
            </div>
          </div>

          {securityError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center space-x-2 font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{securityError}</span>
            </div>
          )}

          <div className="p-3.5 rounded-xl border bg-slate-50 border-slate-200 space-y-2">
            <label className="block font-bold text-xs flex items-center text-slate-700">
              <Lock className="w-3.5 h-3.5 mr-1 text-slate-500" /> Logged-in Account Password (Required to Authorize)
            </label>
            <div className="relative">
              <input
                type={showSecurityPassword ? 'text' : 'password'}
                required
                autoFocus
                value={securityPassword}
                onChange={(e) => {
                  setSecurityPassword(e.target.value);
                  setSecurityError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleConfirmSaveConfig();
                  }
                }}
                placeholder="Enter your logged-in account password"
                className="w-full pl-3 pr-10 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono text-xs bg-white text-slate-900"
              />
              <button
                type="button"
                onClick={() => setShowSecurityPassword(!showSecurityPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showSecurityPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setIsSecurityModalOpen(false);
                setSecurityPassword('');
                setSecurityError('');
              }}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isVerifyingPassword || !securityPassword.trim()}
              onClick={handleConfirmSaveConfig}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-900/20 flex items-center space-x-2 transition-all cursor-pointer"
            >
              {isVerifyingPassword ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifying…</span>
                </>
              ) : (
                <>
                  <Shield className="w-3.5 h-3.5" />
                  <span>Authorize & Save Configurations</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
