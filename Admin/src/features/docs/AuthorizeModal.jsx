// Admin/src/features/docs/AuthorizeModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Lock, Key, ShieldCheck, Check, Trash2, ExternalLink } from 'lucide-react';
import { supabase, supabaseAnonKey } from '../../core/supabase';

export default function AuthorizeModal({
  isOpen,
  onClose,
  authToken,
  setAuthToken,
  apiKey,
  setApiKey,
}) {
  const [tokenInput, setTokenInput] = useState(authToken || '');
  const [apiKeyInput, setApiKeyInput] = useState(apiKey || supabaseAnonKey || '');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setTokenInput(authToken || '');
    setApiKeyInput(apiKey || supabaseAnonKey || '');
  }, [authToken, apiKey, isOpen]);

  // Attempt auto-fill from live Supabase session if user is logged in
  const handleAutoFillFromSession = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.access_token) {
        setTokenInput(data.session.access_token);
      }
    } catch (e) {
      console.warn('Could not retrieve active session:', e);
    }
  };

  const handleSave = () => {
    setAuthToken(tokenInput.trim());
    setApiKey(apiKeyInput.trim());
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 400);
  };

  const handleClear = () => {
    setTokenInput('');
    setAuthToken('');
    setApiKey(supabaseAnonKey);
    setApiKeyInput(supabaseAnonKey);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Available authorizations</h3>
              <p className="text-[11px] text-slate-500 font-medium">Configure credentials to test protected API routes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Bearer JWT Auth */}
          <div className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs text-slate-800">BearerAuth</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-blue-100 text-blue-700">
                  http (bearer)
                </span>
              </div>
              <button
                type="button"
                onClick={handleAutoFillFromSession}
                className="text-[11px] font-bold text-[#3b5bfd] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Key className="w-3 h-3" />
                <span>Auto-fill active admin token</span>
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              JWT access token passed via the <code className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 font-mono text-[11px]">Authorization: Bearer &lt;token&gt;</code> header.
            </p>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Value (JWT Token)
              </label>
              <textarea
                rows={3}
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full text-xs font-mono p-2.5 rounded-xl border border-slate-300 focus:border-[#3b5bfd] focus:ring-2 focus:ring-blue-100 outline-none transition-all bg-white"
              />
            </div>
          </div>

          {/* ApiKey Auth */}
          <div className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs text-slate-800">ApiKeyAuth</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700">
                  header (apikey)
                </span>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Default Anon Key Set</span>
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Supabase public anonymous key passed in the <code className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 font-mono text-[11px]">apikey</code> header to establish project access.
            </p>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Value (Supabase Anon Key)
              </label>
              <textarea
                rows={2}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full text-xs font-mono p-2.5 rounded-xl border border-slate-300 focus:border-[#3b5bfd] focus:ring-2 focus:ring-blue-100 outline-none transition-all bg-white"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={handleClear}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Auth</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSave}
              className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-sm flex items-center gap-1.5 transition-all cursor-pointer ${
                isSaved ? 'bg-emerald-600' : 'bg-[#10b981] hover:bg-[#059669]'
              }`}
            >
              {isSaved ? <Check className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              <span>{isSaved ? 'Authorized!' : 'Authorize'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
