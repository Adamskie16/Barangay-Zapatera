// SuperAdmin/src/features/documents/DocumentsView.jsx
import React, { useState } from 'react';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  DollarSign,
  CheckCircle,
  Eye,
  EyeOff,
  AlertTriangle,
  Loader2,
  Sliders,
  AlertCircle,
  Printer,
  Clock,
  ShieldCheck,
  Search,
  X,
  Layers,
} from 'lucide-react';
import { formatCurrency, sanitizeInput } from '../../core/security';
import { StorageService } from '../../core/storage';
import { supabase, isSupabaseConfigured } from '../../core/supabase';
import DocumentManagement from './DocumentManagement';
import ActionModal from '../../components/ActionModal';

export default function DocumentsView({ docTypes = [], onSaveDocType, onDeleteDocType, currentUser, isDarkMode, config = {} }) {
  const [subTab, setSubTab] = useState('generator'); // 'generator' | 'info'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogStatusFilter, setCatalogStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'INACTIVE'

  // Reusable ActionModal State
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    buttonText: 'OK',
    onConfirm: null,
    onClose: null,
    isDestructive: false,
    isLoading: false,
  });

  // Security Verification Modal State (Save/Create/Edit)
  const [isSaveSecurityModalOpen, setIsSaveSecurityModalOpen] = useState(false);
  const [pendingDocPayload, setPendingDocPayload] = useState(null);
  const [savePasswordInput, setSavePasswordInput] = useState('');
  const [showSavePassword, setShowSavePassword] = useState(false);
  const [saveAuthError, setSaveAuthError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Security Delete Confirmation State
  const [deletingDoc, setDeletingDoc] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePasswordInput, setDeletePasswordInput] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deleteAuthError, setDeleteAuthError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Processing Loading Overlay State
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingTitle, setProcessingTitle] = useState('');
  const [processingMessage, setProcessingMessage] = useState('');

  const STANDARD_REQUIRED_DOCS = [
    'No Required Documents (None)',
    'Valid Government-Issued ID (PhilSys / Driver\'s License / Passport / UMID)',
    'Proof of Residency (Utility Bill / Lease Contract / Certificate of Tenancy)',
    'Community Tax Certificate (Cedula)',
    '2x2 Colored ID Photo (Recent, White Background)',
    '1x1 ID Picture',
    'Barangay Clearance (Previous / Valid Copy)',
    'Certificate of Indigency / Proof of Low Income',
    'DTI / SEC Business Registration Certificate',
    "Mayor's / Business Permit (Previous Year)",
    'Contract of Lease / Lessor Consent',
    'PSA Birth Certificate',
    'Affidavit of Loss / Undertaking (Notarized)',
    'Endorsement Letter / Formal Letter of Request',
    'Barangay Lupon Mediation Clearance',
    'Medical Certificate / Clinical Referral',
    'Proof of Enrollment / School ID',
    'Oath of Undertaking (First Time Jobseeker RA 11261)',
    'Other / Custom Document...',
  ];

  function parseRequirementsToList(reqs) {
    let list = [];
    if (Array.isArray(reqs)) {
      list = reqs;
    } else if (typeof reqs === 'string') {
      try {
        const parsed = JSON.parse(reqs);
        if (Array.isArray(parsed)) list = parsed;
        else list = reqs.split('\n');
      } catch {
        list = reqs.split('\n');
      }
    }
    const cleanList = list.map((r) => (typeof r === 'string' ? r.trim() : '')).filter(Boolean);

    if (
      cleanList.length === 0 ||
      (cleanList.length === 1 && (
        cleanList[0].toLowerCase().includes('no required document') ||
        cleanList[0].toLowerCase() === 'none' ||
        cleanList[0].toLowerCase().startsWith('none (')
      ))
    ) {
      return [
        { id: `req-none-${Date.now()}`, selectedOption: 'No Required Documents (None)', customText: '' },
      ];
    }

    return cleanList.map((item, idx) => {
      const matched = STANDARD_REQUIRED_DOCS.find((opt) => {
        if (opt === 'Other / Custom Document...') return false;
        const o = opt.toLowerCase().replace(/[^a-z0-9]/g, '');
        const it = item.toLowerCase().replace(/[^a-z0-9]/g, '');
        return o === it || o.includes(it) || it.includes(o);
      });
      if (matched) {
        return { id: `req-${idx}-${Date.now()}`, selectedOption: matched, customText: '' };
      }
      return { id: `req-${idx}-${Date.now()}`, selectedOption: 'Other / Custom Document...', customText: item };
    });
  }

  const [formData, setFormData] = useState({
    code: '',
    title: '',
    description: '',
    fee: 0,
    fee_type: 'fixed',
    is_variable_fee: false,
    processing_days: 1,
    requirementsList: [
      { id: 'req-init-1', selectedOption: 'No Required Documents (None)', customText: '' },
    ],
    is_active: true,
  });

  async function verifyLoggedInPassword(inputPassword) {
    if (!inputPassword) return false;

    const session =
      currentUser ||
      (typeof StorageService !== 'undefined' && StorageService.getCurrentUser ? StorageService.getCurrentUser() : null) ||
      JSON.parse(
        localStorage.getItem('zapatera_superadmin_session') ||
        localStorage.getItem('zapatera_admin_session') ||
        localStorage.getItem('zapatera_account_mgmt_session') ||
        localStorage.getItem('zapatera_resident_session') ||
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
    }
    return false;
  }

  const handleAddRequirement = () => {
    setFormData((prev) => {
      const filtered = prev.requirementsList.filter(
        (item) => item.selectedOption !== 'No Required Documents (None)'
      );
      return {
        ...prev,
        requirementsList: [
          ...filtered,
          {
            id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            selectedOption: STANDARD_REQUIRED_DOCS[1] || 'Valid Government-Issued ID (PhilSys / Driver\'s License / Passport / UMID)',
            customText: '',
          },
        ],
      };
    });
  };

  const handleRemoveRequirement = (id) => {
    setFormData((prev) => ({
      ...prev,
      requirementsList: prev.requirementsList.filter((item) => item.id !== id),
    }));
  };

  const handleRequirementChange = (id, field, value) => {
    setFormData((prev) => ({
      ...prev,
      requirementsList: prev.requirementsList.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  };

  const openCreateModal = () => {
    setEditingDoc(null);
    setFormData({
      code: `BC-0${docTypes.length + 1}`,
      title: '',
      description: '',
      fee: 0,
      fee_type: 'fixed',
      is_variable_fee: false,
      processing_days: 1,
      requirementsList: [
        { id: `req-create-1`, selectedOption: 'No Required Documents (None)', customText: '' },
      ],
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (doc) => {
    setEditingDoc(doc);
    const isVar = Boolean(doc.is_variable_fee || doc.fee_type === 'variable');
    setFormData({
      code: doc.code || '',
      title: doc.title || '',
      description: doc.description || '',
      fee: isVar ? 0 : (doc.fee || 0),
      fee_type: isVar ? 'variable' : 'fixed',
      is_variable_fee: isVar,
      processing_days: doc.processing_days || 1,
      requirementsList: parseRequirementsToList(doc.requirements || doc.requirementsStr),
      is_active: doc.is_active !== false,
    });
    setIsModalOpen(true);
  };

  const openDeleteModal = (doc) => {
    setDeletingDoc(doc);
    setDeletePasswordInput('');
    setDeleteAuthError('');
    setShowDeletePassword(false);
    setIsDeleteModalOpen(true);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const requirementsList = formData.requirementsList
      .map((item) => {
        if (item.selectedOption === 'No Required Documents (None)') {
          return null;
        }
        if (item.selectedOption === 'Other / Custom Document...') {
          return item.customText.trim();
        }
        return item.selectedOption.trim();
      })
      .filter(Boolean);

    const isVar = Boolean(formData.fee_type === 'variable' || formData.is_variable_fee);
    const docPayload = {
      id: editingDoc ? editingDoc.id : undefined,
      code: sanitizeInput(formData.code).toUpperCase(),
      title: sanitizeInput(formData.title),
      description: sanitizeInput(formData.description),
      fee: isVar ? 0 : (Number(formData.fee) || 0),
      fee_type: isVar ? 'variable' : 'fixed',
      is_variable_fee: isVar,
      processing_days: Number(formData.processing_days) || 1,
      requirements: requirementsList,
      is_active: formData.is_active,
    };

    setPendingDocPayload(docPayload);
    setSavePasswordInput('');
    setSaveAuthError('');
    setShowSavePassword(false);
    setIsModalOpen(false);
    setIsSaveSecurityModalOpen(true);
  };

  const handleSaveExecute = async () => {
    if (!savePasswordInput.trim()) return;
    setSaveAuthError('');

    const isPasswordValid = await verifyLoggedInPassword(savePasswordInput);
    if (!isPasswordValid) {
      setSaveAuthError('Security Verification Failed: Incorrect logged-in account password.');
      return;
    }

    setIsSaving(true);
    setIsProcessing(true);
    setProcessingTitle(editingDoc ? 'Updating Document Info...' : 'Adding Document Type...');
    setProcessingMessage('Verifying credentials and saving document service details...');

    try {
      if (onSaveDocType && pendingDocPayload) {
        await onSaveDocType(pendingDocPayload);
      }

      setIsSaveSecurityModalOpen(false);
      setIsModalOpen(false);

      setActionModal({
        isOpen: true,
        type: 'success',
        title: 'Document Service Saved',
        message: `The document service "${pendingDocPayload.title}" has been saved successfully.`,
        buttonText: 'OK',
        onClose: () => setActionModal({ isOpen: false }),
      });

      setPendingDocPayload(null);
      setSavePasswordInput('');
    } catch (err) {
      console.error('Error saving document type:', err);
      setActionModal({
        isOpen: true,
        type: 'error',
        title: 'Save Failed',
        message: 'Something went wrong while saving the document service. Please try again.',
        buttonText: 'Close',
        onClose: () => setActionModal({ isOpen: false }),
      });
    } finally {
      setIsSaving(false);
      setIsProcessing(false);
    }
  };

  const handleDeleteExecute = async () => {
    if (!deletePasswordInput.trim() || !deletingDoc) return;
    setDeleteAuthError('');

    const isPasswordValid = await verifyLoggedInPassword(deletePasswordInput);
    if (!isPasswordValid) {
      setDeleteAuthError('Security Verification Failed: Incorrect logged-in account password.');
      return;
    }

    setIsDeleting(true);
    setIsProcessing(true);
    setProcessingTitle('Removing Document Info...');
    setProcessingMessage(`Deleting "${deletingDoc.title}" from official services...`);

    try {
      if (onDeleteDocType) {
        await onDeleteDocType(deletingDoc.id || deletingDoc.code);
      }
      setIsDeleteModalOpen(false);

      setActionModal({
        isOpen: true,
        type: 'success',
        title: 'Document Service Removed',
        message: `The document type "${deletingDoc.title}" has been removed from official services.`,
        buttonText: 'OK',
        onClose: () => setActionModal({ isOpen: false }),
      });

      setDeletingDoc(null);
    } catch (err) {
      console.error('Error deleting document type:', err);
      setActionModal({
        isOpen: true,
        type: 'error',
        title: 'Delete Failed',
        message: 'Failed to remove document service. Please try again.',
        buttonText: 'Close',
        onClose: () => setActionModal({ isOpen: false }),
      });
    } finally {
      setIsDeleting(false);
      setIsProcessing(false);
    }
  };

  const activeDocsCount = docTypes.filter((d) => d.is_active).length;
  const inactiveDocsCount = docTypes.filter((d) => !d.is_active).length;
  const freeDocsCount = docTypes.filter((d) => Number(d.fee || 0) === 0 && d.fee_type !== 'variable' && !d.is_variable_fee).length;
  const paidDocsCount = Math.max(0, docTypes.length - freeDocsCount);

  const filteredDocTypes = docTypes.filter((doc) => {
    const matchesStatus =
      catalogStatusFilter === 'ALL' ||
      (catalogStatusFilter === 'ACTIVE' && doc.is_active) ||
      (catalogStatusFilter === 'INACTIVE' && !doc.is_active);
    const q = catalogSearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      (doc.title || '').toLowerCase().includes(q) ||
      (doc.code || '').toLowerCase().includes(q) ||
      (doc.description || '').toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-full bg-[#f4f7fb] rounded-3xl px-1 sm:px-2 py-1 space-y-6 text-slate-800 font-sans">
      {/* Full-Screen Processing Loading Overlay Modal */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-[26px] p-8 max-w-sm w-full shadow-2xl border border-slate-100 text-center space-y-4">
            <div className="w-16 h-16 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center mx-auto text-[#3b5bfd]">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">{processingTitle || 'Processing Action...'}</h3>
              <p className="text-xs text-slate-400 font-medium mt-1">{processingMessage || 'Saving changes to official barangay services...'}</p>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-[#3b5bfd] h-full w-2/3 animate-pulse rounded-full"></div>
            </div>
          </div>
        </div>
      )}

      {/* Top Header & Sub-Tab Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-1">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[#3b5bfd] text-[11px] font-bold tracking-wide mb-2 border border-blue-100">
            <FileText className="w-3.5 h-3.5" />
            <span>Templates & Service Catalog</span>
          </div>
          <h2 className="text-2xl sm:text-[26px] font-extrabold text-slate-900 tracking-tight">
            Document Catalog & Generator
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 font-medium mt-0.5">
            Generate walk-in certificates or configure document types, fees, and attachment requirements.
          </p>
        </div>

        {/* Sub-Tab Pill Switcher */}
        <div className="inline-flex items-center gap-1.5 bg-white p-1.5 rounded-full border border-slate-200/80 shadow-xs self-start lg:self-auto">
          <button
            onClick={() => setSubTab('generator')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${subTab === 'generator'
              ? 'bg-[#3b5bfd] text-white shadow-sm shadow-blue-500/25'
              : 'text-slate-600 hover:bg-[#f4f7fb]'
              }`}
          >
            <Printer size={15} />
            <span>Walk-In Generator & Print</span>
          </button>

          <button
            onClick={() => setSubTab('info')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${subTab === 'info'
              ? 'bg-[#3b5bfd] text-white shadow-sm shadow-blue-500/25'
              : 'text-slate-600 hover:bg-[#f4f7fb]'
              }`}
          >
            <Sliders size={15} />
            <span>Service Catalog ({docTypes.length})</span>
          </button>
        </div>
      </div>

      {/* 4 Colorful Gradient KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Official A4 Templates */}
        <div
          onClick={() => setSubTab('generator')}
          className={`relative overflow-hidden rounded-[26px] p-5 text-white shadow-lg transition-all cursor-pointer bg-linear-to-br from-[#38bdf8] via-[#0ea5e9] to-[#0284c7] shadow-sky-500/15 hover:scale-[1.01] ${subTab === 'generator' ? 'ring-4 ring-offset-2 ring-sky-400' : ''
            }`}
        >
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center shadow-sm">
              <Printer className="w-5 h-5 text-[#0284c7]" />
            </div>
            <span className="text-[10px] font-bold bg-white/25 backdrop-blur-xs px-2.5 py-1 rounded-full">
              Print Ready
            </span>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-extrabold tracking-tight">4 Templates</p>
            <p className="text-xs font-semibold text-white/90 mt-1">Official A4 Layouts</p>
            <p className="text-[11px] text-white/75 mt-1">Clearance, Certification, Indigency, Business</p>
          </div>
        </div>

        {/* Card 2: Active Service Catalog */}
        <div
          onClick={() => setSubTab('info')}
          className={`relative overflow-hidden rounded-[26px] p-5 text-white shadow-lg transition-all cursor-pointer bg-linear-to-br from-[#818cf8] via-[#6366f1] to-[#4f46e5] shadow-indigo-500/15 hover:scale-[1.01] ${subTab === 'info' ? 'ring-4 ring-offset-2 ring-indigo-400' : ''
            }`}
        >
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center shadow-sm">
              <Layers className="w-5 h-5 text-[#4f46e5]" />
            </div>
            <span className="text-[10px] font-bold bg-white/25 backdrop-blur-xs px-2.5 py-1 rounded-full">
              {docTypes.length} Total
            </span>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-extrabold tracking-tight">{activeDocsCount} Active</p>
            <p className="text-xs font-semibold text-white/90 mt-1">Online Request Services</p>
            <p className="text-[11px] text-white/75 mt-1">{inactiveDocsCount} inactive in catalog</p>
          </div>
        </div>

        {/* Card 3: Fee Policy Breakdown */}
        <div
          onClick={() => setSubTab('info')}
          className="relative overflow-hidden rounded-[26px] p-5 text-white shadow-lg transition-all cursor-pointer bg-linear-to-br from-[#34d399] via-[#10b981] to-[#059669] shadow-emerald-500/15 hover:scale-[1.01]"
        >
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center shadow-sm">
              <DollarSign className="w-5 h-5 text-[#059669]" />
            </div>
            <span className="text-[10px] font-bold bg-white/25 backdrop-blur-xs px-2.5 py-1 rounded-full">
              Fee Schedule
            </span>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-extrabold tracking-tight">
              {paidDocsCount} Paid / {freeDocsCount} Free
            </p>
            <p className="text-xs font-semibold text-white/90 mt-1">Issuance Fee Split</p>
            <p className="text-[11px] text-white/75 mt-1">Standard & indigent fee policies</p>
          </div>
        </div>

        {/* Card 4: Official Signatory */}
        <div
          onClick={() => setSubTab('generator')}
          className="relative overflow-hidden rounded-[26px] p-5 text-white shadow-lg transition-all cursor-pointer bg-linear-to-br from-[#fbbf24] via-[#f59e0b] to-[#ea580c] shadow-amber-500/15 hover:scale-[1.01]"
        >
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-5 h-5 text-[#ea580c]" />
            </div>
            <span className="text-[10px] font-bold bg-white/25 backdrop-blur-xs px-2.5 py-1 rounded-full">
              Signatory
            </span>
          </div>
          <div className="mt-4">
            <p className="text-lg font-extrabold tracking-tight truncate">
              {config?.captainName || 'HON. DAVID M. AGRAVANTE'}
            </p>
            <p className="text-xs font-semibold text-white/90 mt-1">Punong Barangay</p>
            <p className="text-[11px] text-white/75 mt-1">Default certificate signatory</p>
          </div>
        </div>
      </div>

      {/* SUB-TAB 1: DOCUMENT GENERATOR & PRINT */}
      {subTab === 'generator' && <DocumentManagement docTypes={docTypes} config={config} />}

      {/* SUB-TAB 2: DOCUMENT INFORMATION MANAGEMENT */}
      {subTab === 'info' && (
        <>
          {/* Filter & Action Toolbar */}
          <div className="bg-white rounded-[26px] border border-slate-100/80 p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { key: 'ALL', label: 'All Services', count: docTypes.length },
                { key: 'ACTIVE', label: 'Active', count: activeDocsCount },
                { key: 'INACTIVE', label: 'Inactive', count: inactiveDocsCount },
              ].map((tab) => {
                const isSelected = catalogStatusFilter === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setCatalogStatusFilter(tab.key)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${isSelected
                      ? 'bg-[#3b5bfd] text-white shadow-sm shadow-blue-500/25'
                      : 'bg-[#f4f7fb] text-slate-600 hover:bg-slate-200/70'
                      }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] ${isSelected ? 'bg-white/20 text-white' : 'bg-white text-slate-600'
                        }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="relative min-w-[230px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Search service title or code..."
                  className="w-full pl-9 pr-8 py-2 bg-[#f4f7fb] border border-transparent focus:border-blue-200 focus:bg-white rounded-full text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none transition-all"
                />
                {catalogSearch && (
                  <button
                    onClick={() => setCatalogSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                onClick={openCreateModal}
                className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-[#3b5bfd] hover:bg-blue-700 text-white rounded-full text-xs font-bold shadow-sm shadow-blue-500/25 transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add Document Service</span>
              </button>
            </div>
          </div>

          {/* Document Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredDocTypes.length === 0 ? (
              <div className="md:col-span-2 bg-white rounded-[26px] border border-slate-100/80 p-14 text-center text-slate-400 shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-[#f4f7fb] flex items-center justify-center mx-auto mb-3 text-slate-300">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-700">No Matching Document Services</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Try clearing your search filter or click &ldquo;Add Document Service&rdquo; to create a new entry.
                </p>
              </div>
            ) : (
              filteredDocTypes.map((doc) => (
                <div
                  key={doc.id || doc.code}
                  className={`bg-white rounded-[26px] border ${doc.is_active ? 'border-slate-100/80' : 'border-slate-200 bg-slate-50/60 opacity-80'
                    } p-6 shadow-xs flex flex-col justify-between space-y-5 hover:shadow-md transition-all`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-blue-50 text-[#3b5bfd] flex items-center justify-center shrink-0 border border-blue-100">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="font-mono text-[10px] font-extrabold text-[#3b5bfd] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                            {doc.code}
                          </span>
                          <h3 className="text-base sm:text-lg font-extrabold text-slate-900 mt-1">{doc.title}</h3>
                        </div>
                      </div>
                      <Badge variant={doc.is_active ? 'active' : 'inactive'}>
                        {doc.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-500 font-medium mt-3 leading-relaxed">{doc.description}</p>

                    {/* Issuance Fee & Processing Time Info */}
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 bg-[#f4f7fb] rounded-2xl border border-slate-200/60 flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-white text-emerald-600 flex items-center justify-center shadow-2xs shrink-0">
                          <DollarSign className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Processing Fee</p>
                          <p className="text-xs font-extrabold text-slate-800 mt-0.5 truncate">
                            {doc.fee_type === 'variable' || doc.is_variable_fee ? (
                              <span className="text-[#3b5bfd]">Depends upon claim</span>
                            ) : doc.fee > 0 ? (
                              formatCurrency(doc.fee)
                            ) : (
                              <span className="text-emerald-600">FREE / Exempt</span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="p-3 bg-[#f4f7fb] rounded-2xl border border-slate-200/60 flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-white text-[#3b5bfd] flex items-center justify-center shadow-2xs shrink-0">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Est. Turnaround</p>
                          <p className="text-xs font-extrabold text-slate-800 mt-0.5 truncate">
                            {doc.processing_time || '15–30 Minutes'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Requirements List */}
                    <div className="mt-4">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Required Attachments ({doc.requirements?.length || 0})
                      </p>
                      {(!doc.requirements ||
                        doc.requirements.length === 0 ||
                        (doc.requirements.length === 1 &&
                          (doc.requirements[0].toLowerCase().includes('no required document') ||
                            doc.requirements[0].toLowerCase() === 'none' ||
                            doc.requirements[0].toLowerCase().startsWith('none (')))) ? (
                        <div className="flex items-center text-xs text-slate-500 font-medium bg-[#f4f7fb] py-2.5 px-3.5 rounded-2xl border border-slate-200/60">
                          <CheckCircle className="w-3.5 h-3.5 text-[#3b5bfd] mr-2 shrink-0" />
                          <span>No required documents / No attachments needed</span>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {doc.requirements?.map((req, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#f4f7fb] border border-slate-200/60 text-xs text-slate-700 font-semibold"
                            >
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              <span>{req}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setSubTab('generator')}
                      className="px-3.5 py-2 text-xs font-bold text-[#3b5bfd] bg-blue-50 hover:bg-blue-100 rounded-full flex items-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Open in Generator</span>
                    </button>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openEditModal(doc)}
                        className="px-4 py-2 text-xs font-bold text-slate-700 bg-[#f4f7fb] hover:bg-slate-200/70 rounded-full flex items-center space-x-1.5 transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit Info</span>
                      </button>
                      {onDeleteDocType && (
                        <button
                          onClick={() => openDeleteModal(doc)}
                          className="px-3.5 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-full flex items-center space-x-1.5 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Security Verification - Save/Create Document Info Modal */}
          <Modal
            isOpen={isSaveSecurityModalOpen}
            onClose={() => {
              setIsSaveSecurityModalOpen(false);
              setSavePasswordInput('');
              setSaveAuthError('');
              setIsModalOpen(true);
            }}
            title={editingDoc ? 'Authorize Document Update' : 'Authorize New Document Service'}
            subtitle="Confirm your super admin password to save changes"
            maxWidth="max-w-md"
          >
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-2xl text-slate-700 flex items-start space-x-3">
                <div className="w-10 h-10 rounded-xl bg-[#3b5bfd] text-white flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-extrabold text-slate-900">
                    {editingDoc ? 'Save Service Guidelines' : 'Create Document Service'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Authorize changes for <strong className="text-slate-800">{formData.title || 'Document Type'}</strong> (
                    <span className="font-mono text-[#3b5bfd] font-bold">{formData.code || 'CODE'}</span>).
                  </p>
                </div>
              </div>

              {saveAuthError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl flex items-center space-x-2 font-bold">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{saveAuthError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block font-bold text-[11px] text-slate-600">
                  Super Admin Password
                </label>
                <div className="relative">
                  <input
                    type={showSavePassword ? 'text' : 'password'}
                    required
                    autoFocus
                    value={savePasswordInput}
                    onChange={(e) => {
                      setSavePasswordInput(e.target.value);
                      setSaveAuthError('');
                    }}
                    placeholder="Enter your super admin password..."
                    className="w-full pl-4 pr-10 py-2.5 bg-[#f4f7fb] border border-slate-200/80 focus:bg-white focus:border-[#3b5bfd] rounded-2xl font-medium text-xs text-slate-800 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSavePassword(!showSavePassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showSavePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2.5">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => {
                    setIsSaveSecurityModalOpen(false);
                    setSavePasswordInput('');
                    setSaveAuthError('');
                    setIsModalOpen(true);
                  }}
                  className="px-5 py-2.5 font-bold rounded-full cursor-pointer text-slate-600 bg-[#f4f7fb] hover:bg-slate-200/70 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSaving || !savePasswordInput.trim()}
                  onClick={handleSaveExecute}
                  className="px-6 py-2.5 font-bold text-white bg-[#3b5bfd] hover:bg-blue-700 rounded-full shadow-sm shadow-blue-500/25 disabled:opacity-50 flex items-center space-x-2 cursor-pointer transition-all"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Authorize & Save</span>
                </button>
              </div>
            </div>
          </Modal>

          {/* Security Delete Modal */}
          <Modal
            isOpen={isDeleteModalOpen}
            onClose={() => {
              setIsDeleteModalOpen(false);
              setDeletePasswordInput('');
              setDeleteAuthError('');
            }}
            title="Remove Document Service"
            subtitle="Permanent catalog deletion requires super admin authorization"
            maxWidth="max-w-md"
          >
            {deletingDoc && (
              <div className="space-y-4 text-xs">
                <div className="p-4 bg-rose-50/70 border border-rose-100 rounded-2xl text-slate-700 flex items-start space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-extrabold text-slate-900">Permanent Deletion</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Are you sure you want to remove{' '}
                      <strong className="text-slate-800">{deletingDoc.title}</strong> (
                      <span className="font-mono text-rose-600 font-bold">{deletingDoc.code}</span>)?
                    </p>
                  </div>
                </div>

                {deleteAuthError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl flex items-center space-x-2 font-bold">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{deleteAuthError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block font-bold text-[11px] text-slate-600">
                    Super Admin Password
                  </label>
                  <div className="relative">
                    <input
                      type={showDeletePassword ? 'text' : 'password'}
                      required
                      autoFocus
                      value={deletePasswordInput}
                      onChange={(e) => {
                        setDeletePasswordInput(e.target.value);
                        setDeleteAuthError('');
                      }}
                      placeholder="Enter your super admin password..."
                      className="w-full pl-4 pr-10 py-2.5 bg-[#f4f7fb] border border-slate-200/80 focus:bg-white focus:border-rose-500 rounded-2xl font-medium text-xs text-slate-800 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowDeletePassword(!showDeletePassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showDeletePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2.5">
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => {
                      setIsDeleteModalOpen(false);
                      setDeletePasswordInput('');
                      setDeleteAuthError('');
                    }}
                    className="px-5 py-2.5 font-bold rounded-full cursor-pointer text-slate-600 bg-[#f4f7fb] hover:bg-slate-200/70 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting || !deletePasswordInput.trim()}
                    onClick={handleDeleteExecute}
                    className="px-6 py-2.5 font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-full shadow-sm shadow-rose-500/25 disabled:opacity-50 flex items-center space-x-2 cursor-pointer transition-all"
                  >
                    {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Authorize & Delete</span>
                  </button>
                </div>
              </div>
            )}
          </Modal>

          {/* CRUD Form Modal */}
          <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title={editingDoc ? 'Edit Document Service' : 'Add New Document Service'}
            subtitle="Configure service code, fee policy, and attachment requirements"
          >
            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1.5">Document Code</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g. BC-01"
                    className="w-full px-3.5 py-2.5 text-xs bg-[#f4f7fb] border border-slate-200/80 focus:bg-white focus:border-[#3b5bfd] rounded-2xl outline-none font-mono font-bold uppercase transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1.5">Processing Fee Option</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, fee_type: 'fixed', is_variable_fee: false })}
                      className={`px-3 py-2.5 text-xs font-bold rounded-2xl border transition-all cursor-pointer text-center ${formData.fee_type !== 'variable' && !formData.is_variable_fee
                        ? 'bg-[#3b5bfd] border-[#3b5bfd] text-white shadow-xs shadow-blue-500/20'
                        : 'bg-[#f4f7fb] border-transparent text-slate-600 hover:bg-slate-200/70'
                        }`}
                    >
                      Fixed Fee
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, fee_type: 'variable', is_variable_fee: true, fee: 0 })}
                      className={`px-3 py-2.5 text-xs font-bold rounded-2xl border transition-all cursor-pointer text-center ${formData.fee_type === 'variable' || formData.is_variable_fee
                        ? 'bg-[#3b5bfd] border-[#3b5bfd] text-white shadow-xs shadow-blue-500/20'
                        : 'bg-[#f4f7fb] border-transparent text-slate-600 hover:bg-slate-200/70'
                        }`}
                    >
                      Depends on Claim
                    </button>
                  </div>
                </div>
              </div>

              {formData.fee_type === 'variable' || formData.is_variable_fee ? (
                <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-2xl text-slate-700 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-[#3b5bfd] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-extrabold text-xs text-slate-900">Fee Depends on Claim (Variable)</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      The processing fee will be assessed when the document is marked as claimed.
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                    Standard Processing Fee (PHP) <span className="text-slate-400 font-normal">(Set 0 for Free / Exempt)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.fee}
                    onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs bg-[#f4f7fb] border border-slate-200/80 focus:bg-white focus:border-[#3b5bfd] rounded-2xl outline-none font-bold transition-all"
                    placeholder="0.00"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5">Document Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Barangay Clearance"
                  className="w-full px-3.5 py-2.5 text-xs bg-[#f4f7fb] border border-slate-200/80 focus:bg-white focus:border-[#3b5bfd] rounded-2xl outline-none font-bold transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5">Description & Purpose Scope</label>
                <textarea
                  rows={2}
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe document purpose and certificate eligibility"
                  className="w-full px-3.5 py-2.5 text-xs bg-[#f4f7fb] border border-slate-200/80 focus:bg-white focus:border-[#3b5bfd] rounded-2xl outline-none font-medium transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1.5">Processing Time (Days)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.processing_days}
                    onChange={(e) => setFormData({ ...formData, processing_days: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs bg-[#f4f7fb] border border-slate-200/80 focus:bg-white focus:border-[#3b5bfd] rounded-2xl outline-none font-bold transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1.5">Status</label>
                  <select
                    value={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })}
                    className="w-full px-3.5 py-2.5 text-xs bg-[#f4f7fb] border border-slate-200/80 focus:bg-white focus:border-[#3b5bfd] rounded-2xl outline-none font-bold transition-all cursor-pointer"
                  >
                    <option value="true">Active Document Service</option>
                    <option value="false">Inactive / Suspended</option>
                  </select>
                </div>
              </div>

              {/* Required Documents Section */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold text-slate-600">
                    Required Attachments
                  </label>
                  <span className="text-[11px] font-medium text-slate-400">
                    Select required attachments from the list
                  </span>
                </div>

                <div className="space-y-2">
                  {formData.requirementsList.length === 0 ? (
                    <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-center">
                      <p className="text-xs font-bold text-emerald-800">No Required Documents Set</p>
                      <p className="text-[11px] text-emerald-600 mt-0.5">
                        Residents will not be required to attach supporting files.
                      </p>
                    </div>
                  ) : (
                    formData.requirementsList.map((item, index) => (
                      <div
                        key={item.id}
                        className="p-2.5 bg-[#f4f7fb] border border-slate-200/70 rounded-2xl space-y-2"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="w-5 h-5 rounded-full bg-blue-100 text-[#3b5bfd] font-bold text-[10px] flex items-center justify-center shrink-0">
                            {index + 1}
                          </span>
                          <div className="flex-1">
                            <select
                              value={item.selectedOption}
                              onChange={(e) => handleRequirementChange(item.id, 'selectedOption', e.target.value)}
                              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:border-[#3b5bfd] outline-none font-semibold text-slate-700 cursor-pointer"
                            >
                              <option value="" disabled>-- Select Required Document --</option>
                              {STANDARD_REQUIRED_DOCS.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveRequirement(item.id)}
                            title="Remove this requirement"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {item.selectedOption === 'No Required Documents (None)' && (
                          <div className="pl-7 text-[11px] text-emerald-700 font-medium flex items-center space-x-1.5">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>No attachments required.</span>
                          </div>
                        )}

                        {item.selectedOption === 'Other / Custom Document...' && (
                          <div className="pl-7">
                            <input
                              type="text"
                              required
                              value={item.customText}
                              onChange={(e) => handleRequirementChange(item.id, 'customText', e.target.value)}
                              placeholder="Specify custom requirement name..."
                              className="w-full px-3 py-1.5 text-xs border border-blue-200 rounded-xl bg-white focus:border-[#3b5bfd] outline-none"
                            />
                          </div>
                        )}
                      </div>
                    ))
                  )}

                  <button
                    type="button"
                    onClick={handleAddRequirement}
                    className="w-full py-2.5 px-3 border border-dashed border-blue-300 hover:border-[#3b5bfd] bg-blue-50/40 hover:bg-blue-50 text-[#3b5bfd] font-bold text-xs rounded-2xl flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>
                      {formData.requirementsList.length === 0
                        ? '+ Add Required Document'
                        : '+ Add More Required Documents'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-xs font-bold text-slate-600 bg-[#f4f7fb] hover:bg-slate-200/70 rounded-full cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-bold text-white bg-[#3b5bfd] hover:bg-blue-700 rounded-full shadow-sm shadow-blue-500/25 cursor-pointer flex items-center space-x-1.5 transition-all"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Proceed to Authorize</span>
                </button>
              </div>
            </form>
          </Modal>
        </>
      )}

      {/* Accessible Reusable Action Feedback Modal */}
      <ActionModal
        isOpen={actionModal.isOpen}
        type={actionModal.type}
        title={actionModal.title}
        message={actionModal.message}
        confirmText={actionModal.confirmText}
        cancelText={actionModal.cancelText}
        buttonText={actionModal.buttonText}
        onConfirm={actionModal.onConfirm}
        onClose={actionModal.onClose || (() => setActionModal({ isOpen: false }))}
        isDestructive={actionModal.isDestructive}
        isLoading={actionModal.isLoading}
      />
    </div>
  );
}
