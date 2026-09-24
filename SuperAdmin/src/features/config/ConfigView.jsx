// SuperAdmin/src/features/config/ConfigView.jsx
import React, { useState } from 'react';
import { Settings, Save, Shield, CheckCircle, Image, Globe, Mail, Phone, Clock, FileCode } from 'lucide-react';
import { sanitizeInput } from '../../core/security';

export default function ConfigView({ config, onSaveConfig }) {
  const [formData, setFormData] = useState({ ...config });
  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
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

      <form onSubmit={handleSubmit} className="space-y-6">
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
              <input
                type="text"
                value={formData.seal_url || ''}
                onChange={(e) => setFormData({ ...formData, seal_url: e.target.value })}
                className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
              />
              {formData.seal_url && (
                <img
                  src={formData.seal_url}
                  alt="Seal Preview"
                  className="w-10 h-10 rounded-full border border-slate-200 object-cover"
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
            className="inline-flex items-center space-x-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-900/20 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save System Configurations</span>
          </button>
        </div>
      </form>
    </div>
  );
}
