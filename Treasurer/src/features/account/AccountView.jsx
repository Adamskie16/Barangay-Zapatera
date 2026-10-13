// Treasurer/src/features/account/AccountView.jsx
import React, { useState } from 'react';
import {
  User,
  ShieldCheck,
  Mail,
  Phone,
  MapPin,
  Lock,
  KeyRound,
  CheckCircle2,
  Landmark,
  FileCheck2,
} from 'lucide-react';
import UserAvatar from '../../components/UserAvatar';

export default function AccountView({ currentUser = {}, onLogout }) {
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = () => {
    if (currentUser?.email) {
      navigator.clipboard.writeText(currentUser.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Overview Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
          <UserAvatar
            src={currentUser?.avatar_url}
            name={currentUser?.full_name || 'Barangay Treasurer'}
            role="treasurer"
            size="2xl"
            showStatus={true}
            className="ring-4 ring-amber-500/20 shadow-lg"
          />

          <div className="text-center sm:text-left space-y-2 flex-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold uppercase tracking-wider">
              <Landmark className="w-3.5 h-3.5 text-amber-600" />
              Barangay Treasurer
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {currentUser?.full_name || 'HON. MA. LOURDES S. RAMOS'}
            </h1>
            <p className="text-xs text-slate-500 font-mono">
              {currentUser?.email || 'treasurer@zapatera.gov.ph'}
            </p>
            <p className="text-xs text-slate-600 pt-1">
              Official Custodian of Barangay Funds & Revenue Auditor for Barangay Zapatera, Cebu City.
            </p>
          </div>
        </div>
      </div>

      {/* Account Details & Role Permissions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact & Office Info */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <User className="w-4 h-4 text-amber-600" />
            Official Account Details
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 font-medium block mb-0.5">Email Address</span>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-mono text-slate-800 font-semibold">{currentUser?.email}</span>
                <button
                  onClick={handleCopyEmail}
                  className="text-amber-600 hover:text-amber-700 font-bold cursor-pointer text-[11px]"
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
                <span>(032) 503-6465 • zapatera.lnb24@gmail.com</span>
              </div>
            </div>
          </div>
        </div>

        {/* Security & Role Privileges */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Security & Audit Privileges
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Two-Factor Authentication Active
              </div>
              <p className="text-[11px] text-emerald-700">
                Your account is protected by mandatory 6-digit OTP verification upon each login session.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <FileCheck2 className="w-4 h-4 text-amber-600" />
                Role: Read-Only Financial Auditing
              </div>
              <p className="text-[11px] text-amber-700">
                Strict least-privilege role: You have full visibility over revenue ledgers and certified statements, with zero document processing/approval rights.
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
