// Admin/src/features/docs/OpenApiJsonModal.jsx
import React, { useState } from 'react';
import { X, Copy, Check, Download, FileJson } from 'lucide-react';
import { generateOpenApiSpec } from './apiData';
import { supabaseUrl, supabaseAnonKey } from '../../core/supabase';

export default function OpenApiJsonModal({ isOpen, onClose }) {
  const [copied, setCopied] = useState(false);
  const spec = generateOpenApiSpec(supabaseUrl, supabaseAnonKey);
  const jsonString = JSON.stringify(spec, null, 2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'openapi-zapatera.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#3b5bfd] flex items-center justify-center shadow-xs">
              <FileJson className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-slate-900 font-mono">/openapi.json</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  OpenAPI 3.1.0
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Official Machine-Readable Schema Specification</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Spec'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#3b5bfd] hover:bg-blue-700 text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .json</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Code Content */}
        <div className="flex-1 overflow-auto p-4 bg-slate-950 font-mono text-[12px] text-slate-200 leading-relaxed select-text">
          <pre>{jsonString}</pre>
        </div>
      </div>
    </div>
  );
}
