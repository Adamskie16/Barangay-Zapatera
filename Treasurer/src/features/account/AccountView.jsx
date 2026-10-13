// Treasurer/src/features/account/AccountView.jsx
import React, { useState } from 'react';
import {
  User,
  ShieldCheck,
  Mail,
  Phone,
  MapPin,
  Lock,
  CheckCircle2,
  FileCheck2,
  Receipt,
  Edit2,
  Save,
  X,
  Upload,
} from 'lucide-react';
import UserAvatar from '../../components/UserAvatar';
import { StorageService } from '../../core/storage';

export default function AccountView({ currentUser = {}, onProfileUpdated, onLogout }) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  // Profile Form States
  const [formData, setFormData] = useState({
    full_name: currentUser?.full_name || '',
    phone: currentUser?.phone || '',
    avatar_url: currentUser?.avatar_url || '',
    gender: currentUser?.gender || '',
    age: currentUser?.age || '',
  });

  const handleCopyEmail = () => {
    if (currentUser?.email) {
      navigator.clipboard.writeText(currentUser.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAvatarFile = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, avatar_url: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updated = await StorageService.updateProfileAsync({
        ...formData,
        age: formData.age ? Number(formData.age) : null,
      });

      if (onProfileUpdated) onProfileUpdated(updated);

      setNotification({
        type: 'success',
        message: 'Profile details successfully updated.',
      });
      setIsEditing(false);
    } catch (err) {
      setNotification({
        type: 'error',
        message: 'Failed to update profile. Please try again.',
      });
    } finally {
      setIsSaving(false);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-md transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="p-1 rounded-lg hover:bg-black/5 text-slate-500 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Profile Overview Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 relative z-10">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 flex-1">
            <UserAvatar
              src={isEditing ? formData.avatar_url : currentUser?.avatar_url}
              name={currentUser?.full_name || 'Barangay Treasurer'}
              role="treasurer"
              size="2xl"
              showStatus={true}
              className="ring-4 ring-blue-500/20 shadow-lg"
            />

            <div className="text-center sm:text-left space-y-2 flex-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold uppercase tracking-wider">
                <Receipt className="w-3.5 h-3.5 text-blue-600" />
                Barangay Treasurer
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {currentUser?.full_name || 'HON. MA. LOURDES S. RAMOS'}
              </h1>
              <p className="text-xs text-slate-500 font-mono">
                {currentUser?.email || 'treasurer@zapatera.gov.ph'}
              </p>
              <p className="text-xs text-slate-600 pt-1">
                Official custodian of Barangay funds and fee collections for Barangay Zapatera, Cebu City.
              </p>
            </div>
          </div>

          <div>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(false)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Form (When Active) */}
      {isEditing && (
        <form onSubmit={handleSaveProfile} className="bg-white rounded-2xl border border-blue-200 p-6 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">Edit Profile Information</h3>
            <p className="text-xs text-slate-500">Update your name, contact, and profile avatar.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Full Name</label>
              <input
                type="text"
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Contact Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(032) 503-6465"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Gender</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              >
                <option value="">Select Gender</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Age</label>
              <input
                type="number"
                min="18"
                max="100"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                placeholder="Age"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-slate-700 font-semibold mb-1">Profile Photo (Upload or URL)</label>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={formData.avatar_url}
                  onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                  placeholder="https://... or upload image"
                  className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
                <label className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer flex items-center gap-1.5 transition-colors shrink-0">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFile}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Account Details & Role Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact & Office Info */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" />
            Official Account Details
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 font-medium block mb-0.5">Email Address</span>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-mono text-slate-800 font-semibold">{currentUser?.email}</span>
                <button
                  onClick={handleCopyEmail}
                  className="text-blue-600 hover:text-blue-700 font-bold cursor-pointer text-[11px]"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <div>
              <span className="text-slate-400 font-medium block mb-0.5">Assigned Barangay Office</span>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-medium flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>197 D. Jakosalem St., Barangay Zapatera Hall, Cebu City</span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 font-medium block mb-0.5">Office Contact</span>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-medium flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{currentUser?.phone || '(032) 503-6465 • zapatera.lnb24@gmail.com'}</span>
              </div>
            </div>

            {(currentUser?.gender || currentUser?.age) && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                {currentUser?.gender && (
                  <div>
                    <span className="text-slate-400 font-medium block mb-0.5">Gender</span>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-semibold capitalize">
                      {currentUser.gender}
                    </div>
                  </div>
                )}
                {currentUser?.age && (
                  <div>
                    <span className="text-slate-400 font-medium block mb-0.5">Age</span>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-semibold">
                      {currentUser.age} years old
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Security & Role Privileges */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Security & Role Permissions
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Two-Factor Security Active
              </div>
              <p className="text-[11px] text-emerald-700">
                Your account is protected by mandatory OTP verification code on every login.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <FileCheck2 className="w-4 h-4 text-blue-600" />
                Role: Barangay Treasurer
              </div>
              <p className="text-[11px] text-blue-700">
                Authorized to collect document fees, issue official receipts, grant fee exemptions for indigent residents, and generate official financial reports.
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={onLogout}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors cursor-pointer"
              >
                Sign Out of Treasurer Portal
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
