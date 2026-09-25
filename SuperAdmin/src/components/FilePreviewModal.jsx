// SuperAdmin/src/components/FilePreviewModal.jsx
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
} from 'lucide-react';
import { getSignedAttachmentUrl, downloadStoredAttachment } from '../core/storageService';

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
        if (file.file_url && (file.file_url.startsWith('http') || file.file_url.startsWith('data:'))) {
          setFileUrl(file.file_url);
          setLoading(false);
          return;
        }

        const path = file.storage_path || file.storagePath;
        if (path) {
          const signed = await getSignedAttachmentUrl(path, 3600);
          if (signed) {
            setFileUrl(signed);
            setLoading(false);
            return;
          }
        }

        if (file.file_url) {
          setFileUrl(file.file_url);
        } else {
          setError('Unable to load file preview. You can try downloading the file.');
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
