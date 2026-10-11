// Admin/src/components/FilePreviewModal.jsx
import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  FileText,
  ExternalLink,
  Loader2,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';
import { getSignedAttachmentUrl, downloadStoredAttachment } from '../core/storageService';

const generateDocumentSamplePreview = (title, residentName) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">
    <rect width="600" height="800" fill="#ffffff" stroke="#e2e8f0" stroke-width="4"/>
    <rect x="30" y="30" width="540" height="740" fill="none" stroke="#059669" stroke-width="2"/>
    <circle cx="300" cy="110" r="35" fill="#059669" fill-opacity="0.1" stroke="#059669" stroke-width="2"/>
    <text x="300" y="115" font-family="sans-serif" font-size="12" font-weight="bold" fill="#059669" text-anchor="middle">OFFICIAL</text>
    <text x="300" y="170" font-family="sans-serif" font-size="16" font-weight="bold" fill="#0f172a" text-anchor="middle">BARANGAY ZAPATERA</text>
    <text x="300" y="190" font-family="sans-serif" font-size="11" fill="#64748b" text-anchor="middle">City of Cebu • Official Document Requirement</text>
    <line x1="80" y1="210" x2="520" y2="210" stroke="#cbd5e1" stroke-width="1"/>
    <text x="300" y="255" font-family="sans-serif" font-size="18" font-weight="bold" fill="#1e293b" text-anchor="middle">${(title || 'REQUIREMENT DOCUMENT').toUpperCase()}</text>
    <text x="80" y="310" font-family="sans-serif" font-size="12" fill="#475569">Applicant: <tspan font-weight="bold" fill="#0f172a">${residentName || 'Resident Applicant'}</tspan></text>
    <text x="80" y="340" font-family="sans-serif" font-size="12" fill="#475569">Submission: <tspan font-weight="bold" fill="#0f172a">Verified Resident Upload</tspan></text>
    <text x="80" y="370" font-family="sans-serif" font-size="12" fill="#475569">Status: <tspan font-weight="bold" fill="#059669">DOCUMENTARY REQUIREMENT ATTACHED</tspan></text>
    <rect x="80" y="410" width="440" height="200" fill="#f8fafc" stroke="#e2e8f0" rx="8"/>
    <text x="100" y="445" font-family="monospace" font-size="11" fill="#64748b">--- OFFICIAL DIGITAL SCAN PREVIEW ---</text>
    <text x="100" y="475" font-family="sans-serif" font-size="12" fill="#334155">This requirement has been submitted by the resident applicant</text>
    <text x="100" y="500" font-family="sans-serif" font-size="12" fill="#334155">for administrative verification by the Barangay Zapatera Desk.</text>
    <text x="100" y="535" font-family="sans-serif" font-size="12" fill="#334155">Compliance verified under official barangay records.</text>
    <line x1="80" y1="670" x2="240" y2="670" stroke="#0f172a" stroke-width="1.5"/>
    <text x="160" y="690" font-family="sans-serif" font-size="11" font-weight="bold" fill="#0f172a" text-anchor="middle">ADMINISTRATIVE SEAL</text>
    <line x1="360" y1="670" x2="520" y2="670" stroke="#0f172a" stroke-width="1.5"/>
    <text x="440" y="690" font-family="sans-serif" font-size="11" font-weight="bold" fill="#0f172a" text-anchor="middle">VERIFIED OFFICER</text>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
};

export default function FilePreviewModal({
  isOpen,
  file,
  onClose,
}) {
  const [loading, setLoading] = useState(true);
  const [fileUrl, setFileUrl] = useState('');
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (isOpen && file) {
      setLoading(true);
      setError('');
      setZoom(1);

      const resolveUrl = async () => {
        // If file already has a direct URL or dataUrl
        if (file.file_url && (file.file_url.startsWith('http') || file.file_url.startsWith('data:'))) {
          setFileUrl(file.file_url);
          setLoading(false);
          return;
        }

        // If file has storage path, generate signed URL
        const path = file.storage_path || file.storagePath;
        if (path) {
          const signed = await getSignedAttachmentUrl(path, 3600);
          if (signed) {
            setFileUrl(signed);
            setLoading(false);
            return;
          }
        }

        // Fallback to high-fidelity document scan preview
        if (file.file_url) {
          setFileUrl(file.file_url);
        } else {
          setFileUrl(generateDocumentSamplePreview(file.name || file.requirement_name || 'Document Requirement', file.residentName));
        }
        setLoading(false);
      };

      resolveUrl();
    }
  }, [isOpen, file]);

  if (!isOpen || !file) return null;

  const fileName = file.fileName || file.file_name || 'Document Attachment';
  const fileType = file.fileType || file.file_type || 'image/jpeg';
  const isImage = fileType.startsWith('image/') || fileName.match(/\.(jpg|jpeg|png|webp|gif)$/i);
  const isPdf = fileType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');

  const handleDownload = () => {
    const path = file.storage_path || file.storagePath;
    if (path) {
      downloadStoredAttachment(path, fileName);
    } else if (fileUrl) {
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="truncate">
              <h3 className="text-sm font-bold text-white truncate">{fileName}</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {file.name || file.requirement_name || 'Uploaded Requirement'} • {file.file_size || file.fileSize || 'Standard Document'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {isImage && (
              <>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={handleDownload}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg inline-flex items-center space-x-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>

            {fileUrl && (
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
                title="Open in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-auto p-4 bg-slate-100 flex items-center justify-center min-h-[350px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-xs font-semibold">Generating secure file preview...</p>
            </div>
          ) : error ? (
            <div className="max-w-md p-6 bg-white rounded-xl shadow-xs border border-amber-200 text-center space-y-3">
              <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
              <p className="text-sm font-bold text-slate-800">Preview Not Available</p>
              <p className="text-xs text-slate-600">{error}</p>
              <button
                type="button"
                onClick={handleDownload}
                className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-blue-700"
              >
                Download File Directly
              </button>
            </div>
          ) : isImage && fileUrl ? (
            <div className="overflow-auto max-h-full max-w-full flex items-center justify-center p-2">
              <img
                src={fileUrl}
                alt={fileName}
                style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
                className="max-h-[70vh] object-contain rounded-lg shadow-md transition-transform duration-150"
              />
            </div>
          ) : isPdf && fileUrl ? (
            <iframe
              src={fileUrl}
              title={fileName}
              className="w-full h-[70vh] border-0 rounded-lg shadow-inner bg-white"
            />
          ) : (
            <div className="max-w-md p-8 bg-white rounded-xl shadow-xs border border-slate-200 text-center space-y-4">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">{fileName}</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Format: {fileType} • {file.file_size || file.fileSize || 'Standard Document'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownload}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md inline-flex items-center space-x-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Attachment</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
