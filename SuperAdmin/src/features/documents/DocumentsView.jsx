// SuperAdmin/src/features/documents/DocumentsView.jsx
import React, { useState, useMemo } from 'react';
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
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  LayoutGrid,
  Table as TableIcon,
} from 'lucide-react';
import { formatCurrency, sanitizeInput } from '../../core/security';
import { StorageService } from '../../core/storage';
import { supabase, isSupabaseConfigured } from '../../core/supabase';
import DocumentManagement from './DocumentManagement';
import ActionModal from '../../components/ActionModal';
import DocumentTemplate from './DocumentTemplate';
import { documentTemplates } from './documentTemplates';

export default function DocumentsView({ docTypes = [], onSaveDocType, onDeleteDocType, currentUser, isDarkMode, config = {} }) {
  const [subTab, setSubTab] = useState('generator'); // 'generator' | 'info'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogStatusFilter, setCatalogStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'INACTIVE'
  const [showTemplatePreview, setShowTemplatePreview] = useState(false);

  // Service Catalog Table Sorting & Pagination State
  const [catalogSortKey, setCatalogSortKey] = useState('code'); // 'code' | 'title' | 'fee' | 'processing_time' | 'requirements' | 'is_active'
  const [catalogSortDir, setCatalogSortDir] = useState('asc'); // 'asc' | 'desc'
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogItemsPerPage, setCatalogItemsPerPage] = useState(10);
  const [catalogViewMode, setCatalogViewMode] = useState('table'); // 'table' | 'grid'

  const handleCatalogSort = (key) => {
    if (catalogSortKey === key) {
      setCatalogSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setCatalogSortKey(key);
      setCatalogSortDir('asc');
    }
    setCatalogPage(1);
  };

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
    validity_months: 6,
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
    setShowTemplatePreview(false);
    setFormData({
      code: `BC-0${docTypes.length + 1}`,
      title: '',
      description: '',
      fee: 0,
      fee_type: 'fixed',
      is_variable_fee: false,
      processing_days: 1,
      validity_months: 6,
      requirementsList: [
        { id: `req-create-1`, selectedOption: 'No Required Documents (None)', customText: '' },
      ],
      is_active: true,
      template_type: 'standard',
      template_title: '',
      template_body: 'This is to certify that the above named person is a resident of the barangay and known to be of good moral standing.',
      doc_stamps: 30,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (doc) => {
    setEditingDoc(doc);
    setShowTemplatePreview(false);
    const isVar = Boolean(doc.is_variable_fee || doc.fee_type === 'variable');
    const parsedValidityMonths = Math.max(
      1,
      parseInt(doc.validity_months, 10) ||
        (doc.validity ? parseInt(String(doc.validity).replace(/[^0-9]/g, ''), 10) : 6) ||
        6
    );
    setFormData({
      code: doc.code || '',
      title: doc.title || '',
      description: doc.description || '',
      fee: isVar ? 0 : (Number(doc.fee) > 0 ? Number(doc.fee) : 0),
      fee_type: isVar ? 'variable' : 'fixed',
      is_variable_fee: isVar,
      processing_days: doc.processing_days || 1,
      validity_months: parsedValidityMonths,
      requirementsList: parseRequirementsToList(doc.requirements || doc.requirementsStr),
      is_active: doc.is_active !== false,
      template_type: doc.template_type || (isBiz ? 'business' : 'standard'),
      template_title: doc.template_title || doc.title || '',
      template_body: doc.template_body || doc.description || 'This is to certify that the above named person is a resident of the barangay and known to be of good moral standing.',
      doc_stamps: doc.doc_stamps || 30,
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
    const validityMonths = Math.max(1, parseInt(formData.validity_months, 10) || 6);
    const validityText = `${validityMonths} ${validityMonths === 1 ? 'Month' : 'Months'} from issuance`;
    const docPayload = {
      id: editingDoc ? editingDoc.id : undefined,
      code: sanitizeInput(formData.code).toUpperCase(),
      title: sanitizeInput(formData.title),
      description: sanitizeInput(formData.description),
      fee: isVar ? 0 : (Number(formData.fee) || 0),
      fee_type: isVar ? 'variable' : 'fixed',
      is_variable_fee: isVar,
      processing_days: Number(formData.processing_days) || 1,
      validity_months: validityMonths,
      validity: validityText,
      requirements: requirementsList,
      is_active: formData.is_active,
      template_type: formData.template_type || 'standard',
      template_title: sanitizeInput(formData.template_title || formData.title || ''),
      template_body: sanitizeInput(formData.template_body || ''),
      doc_stamps: Number(formData.doc_stamps) || 30,
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

  // Sort document services
  const sortedDocTypes = useMemo(() => {
    const list = [...filteredDocTypes];
    list.sort((a, b) => {
      let valA = a[catalogSortKey];
      let valB = b[catalogSortKey];

      if (catalogSortKey === 'code' || catalogSortKey === 'title') {
        const strA = (valA || '').toString().toLowerCase();
        const strB = (valB || '').toString().toLowerCase();
        return catalogSortDir === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
      }

      if (catalogSortKey === 'fee') {
        const numA = (a.fee_type === 'variable' || a.is_variable_fee) ? -1 : Number(a.fee || 0);
        const numB = (b.fee_type === 'variable' || b.is_variable_fee) ? -1 : Number(b.fee || 0);
        return catalogSortDir === 'asc' ? numA - numB : numB - numA;
      }

      if (catalogSortKey === 'processing_time') {
        const daysA = Number(a.processing_days || 1);
        const daysB = Number(b.processing_days || 1);
        return catalogSortDir === 'asc' ? daysA - daysB : daysB - daysA;
      }

      if (catalogSortKey === 'requirements') {
        const countA = Array.isArray(a.requirements) ? a.requirements.length : 0;
        const countB = Array.isArray(b.requirements) ? b.requirements.length : 0;
        return catalogSortDir === 'asc' ? countA - countB : countB - countA;
      }

      if (catalogSortKey === 'is_active') {
        const actA = a.is_active ? 1 : 0;
        const actB = b.is_active ? 1 : 0;
        return catalogSortDir === 'asc' ? actA - actB : actB - actA;
      }

      const defA = (valA ?? '').toString().toLowerCase();
      const defB = (valB ?? '').toString().toLowerCase();
      return catalogSortDir === 'asc' ? defA.localeCompare(defB) : defB.localeCompare(defA);
    });
    return list;
  }, [filteredDocTypes, catalogSortKey, catalogSortDir]);

  // Pagination calculations
  const totalCatalogItems = sortedDocTypes.length;
  const totalCatalogPages = Math.max(1, Math.ceil(totalCatalogItems / catalogItemsPerPage));
  const validCatalogPage = Math.min(catalogPage, totalCatalogPages);
  const catalogStartIndex = (validCatalogPage - 1) * catalogItemsPerPage;
  const paginatedCatalogDocs = sortedDocTypes.slice(catalogStartIndex, catalogStartIndex + catalogItemsPerPage);

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
            onClick={() => {
              setSubTab('info');
              setCatalogStatusFilter('ALL');
              setCatalogSearch('');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              subTab === 'info'
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
          className={`relative overflow-hidden rounded-[26px] p-5 text-white shadow-lg transition-all cursor-pointer bg-linear-to-br from-[#38bdf8] via-[#0ea5e9] to-[#0284c7] shadow-sky-500/15 hover:scale-[1.01] ${
            subTab === 'generator' ? 'ring-4 ring-offset-2 ring-sky-400' : ''
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
            <p className="text-3xl font-extrabold tracking-tight">
              Templates
            </p>
            <p className="text-xs font-semibold text-white/90 mt-1">Official A4 Layouts</p>
            <p className="text-[11px] text-white/75 mt-1">
              Clearance, Certification, Residency, Indigency, Jobseeker, Business
            </p>
          </div>
        </div>

        {/* Card 2: Active Service Catalog */}
        <div
          onClick={() => {
            setSubTab('info');
            setCatalogStatusFilter('ALL');
            setCatalogSearch('');
          }}
          className={`relative overflow-hidden rounded-[26px] p-5 text-white shadow-lg transition-all cursor-pointer bg-linear-to-br from-[#818cf8] via-[#6366f1] to-[#4f46e5] shadow-indigo-500/15 hover:scale-[1.01] ${
            subTab === 'info' ? 'ring-4 ring-offset-2 ring-indigo-400' : ''
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
          onClick={() => {
            setSubTab('info');
            setCatalogStatusFilter('ALL');
            setCatalogSearch('');
          }}
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
              {config?.punong_barangay || config?.captainName || config?.signatory_name || 'HON. DAVID M. AGRAVANTE'}
            </p>
            <p className="text-xs font-semibold text-white/90 mt-1">Punong Barangay</p>
            <p className="text-[11px] text-white/75 mt-1">Default certificate signatory</p>
          </div>
        </div>
      </div>

      {/* SUB-TAB 1: DOCUMENT GENERATOR & PRINT */}
      {subTab === 'generator' && (
        <DocumentManagement
          docTypes={docTypes}
          config={config}
          onNavigateToCatalog={() => {
            setSubTab('info');
            setCatalogStatusFilter('ALL');
            setCatalogSearch('');
          }}
        />
      )}

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
                    onClick={() => {
                      setCatalogStatusFilter(tab.key);
                      setCatalogPage(1);
                    }}
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
              <div className="relative min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => {
                    setCatalogSearch(e.target.value);
                    setCatalogPage(1);
                  }}
                  placeholder="Search service title or code..."
                  className="w-full pl-9 pr-8 py-2 bg-[#f4f7fb] border border-transparent focus:border-blue-200 focus:bg-white rounded-full text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none transition-all"
                />
                {catalogSearch && (
                  <button
                    onClick={() => {
                      setCatalogSearch('');
                      setCatalogPage(1);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* View Switcher: Table vs Cards */}
              <div className="inline-flex items-center bg-[#f4f7fb] p-1 rounded-full border border-slate-200/60 self-center">
                <button
                  type="button"
                  onClick={() => setCatalogViewMode('table')}
                  className={`p-1.5 rounded-full transition-all cursor-pointer ${
                    catalogViewMode === 'table'
                      ? 'bg-white text-[#3b5bfd] shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Table View"
                >
                  <TableIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setCatalogViewMode('grid')}
                  className={`p-1.5 rounded-full transition-all cursor-pointer ${
                    catalogViewMode === 'grid'
                      ? 'bg-white text-[#3b5bfd] shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Card View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
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

          {/* VIEW MODE 1: SORTABLE SERVICE CATALOG TABLE WITH PAGINATION */}
          {catalogViewMode === 'table' && (
            <div className="bg-white rounded-[26px] border border-slate-100/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f8fafd] text-slate-400 uppercase tracking-wider font-bold border-b border-slate-100 text-[10px]">
                    <tr>
                      <th className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleCatalogSort('code')}
                          className={`inline-flex items-center gap-1.5 font-bold transition-colors uppercase tracking-wider cursor-pointer group select-none ${
                            catalogSortKey === 'code' ? 'text-[#3b5bfd]' : 'hover:text-[#3b5bfd] text-slate-400'
                          }`}
                        >
                          <span>Code</span>
                          <span className={`p-0.5 rounded ${catalogSortKey === 'code' ? 'bg-blue-50 text-[#3b5bfd]' : ''}`}>
                            {catalogSortKey === 'code' ? (
                              catalogSortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#3b5bfd]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#3b5bfd]" />
                            ) : (
                              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-60 group-hover:opacity-100 group-hover:text-[#3b5bfd]" />
                            )}
                          </span>
                        </button>
                      </th>
                      <th className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleCatalogSort('title')}
                          className={`inline-flex items-center gap-1.5 font-bold transition-colors uppercase tracking-wider cursor-pointer group select-none ${
                            catalogSortKey === 'title' ? 'text-[#3b5bfd]' : 'hover:text-[#3b5bfd] text-slate-400'
                          }`}
                        >
                          <span>Document Service Title</span>
                          <span className={`p-0.5 rounded ${catalogSortKey === 'title' ? 'bg-blue-50 text-[#3b5bfd]' : ''}`}>
                            {catalogSortKey === 'title' ? (
                              catalogSortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#3b5bfd]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#3b5bfd]" />
                            ) : (
                              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-60 group-hover:opacity-100 group-hover:text-[#3b5bfd]" />
                            )}
                          </span>
                        </button>
                      </th>
                      <th className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleCatalogSort('fee')}
                          className={`inline-flex items-center gap-1.5 font-bold transition-colors uppercase tracking-wider cursor-pointer group select-none ${
                            catalogSortKey === 'fee' ? 'text-[#3b5bfd]' : 'hover:text-[#3b5bfd] text-slate-400'
                          }`}
                        >
                          <span>Processing Fee</span>
                          <span className={`p-0.5 rounded ${catalogSortKey === 'fee' ? 'bg-blue-50 text-[#3b5bfd]' : ''}`}>
                            {catalogSortKey === 'fee' ? (
                              catalogSortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#3b5bfd]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#3b5bfd]" />
                            ) : (
                              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-60 group-hover:opacity-100 group-hover:text-[#3b5bfd]" />
                            )}
                          </span>
                        </button>
                      </th>
                      <th className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleCatalogSort('processing_time')}
                          className={`inline-flex items-center gap-1.5 font-bold transition-colors uppercase tracking-wider cursor-pointer group select-none ${
                            catalogSortKey === 'processing_time' ? 'text-[#3b5bfd]' : 'hover:text-[#3b5bfd] text-slate-400'
                          }`}
                        >
                          <span>Turnaround Time</span>
                          <span className={`p-0.5 rounded ${catalogSortKey === 'processing_time' ? 'bg-blue-50 text-[#3b5bfd]' : ''}`}>
                            {catalogSortKey === 'processing_time' ? (
                              catalogSortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#3b5bfd]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#3b5bfd]" />
                            ) : (
                              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-60 group-hover:opacity-100 group-hover:text-[#3b5bfd]" />
                            )}
                          </span>
                        </button>
                      </th>
                      <th className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleCatalogSort('requirements')}
                          className={`inline-flex items-center gap-1.5 font-bold transition-colors uppercase tracking-wider cursor-pointer group select-none ${
                            catalogSortKey === 'requirements' ? 'text-[#3b5bfd]' : 'hover:text-[#3b5bfd] text-slate-400'
                          }`}
                        >
                          <span>Requirements</span>
                          <span className={`p-0.5 rounded ${catalogSortKey === 'requirements' ? 'bg-blue-50 text-[#3b5bfd]' : ''}`}>
                            {catalogSortKey === 'requirements' ? (
                              catalogSortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#3b5bfd]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#3b5bfd]" />
                            ) : (
                              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-60 group-hover:opacity-100 group-hover:text-[#3b5bfd]" />
                            )}
                          </span>
                        </button>
                      </th>
                      <th className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleCatalogSort('is_active')}
                          className={`inline-flex items-center gap-1.5 font-bold transition-colors uppercase tracking-wider cursor-pointer group select-none ${
                            catalogSortKey === 'is_active' ? 'text-[#3b5bfd]' : 'hover:text-[#3b5bfd] text-slate-400'
                          }`}
                        >
                          <span>Status</span>
                          <span className={`p-0.5 rounded ${catalogSortKey === 'is_active' ? 'bg-blue-50 text-[#3b5bfd]' : ''}`}>
                            {catalogSortKey === 'is_active' ? (
                              catalogSortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#3b5bfd]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#3b5bfd]" />
                            ) : (
                              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-60 group-hover:opacity-100 group-hover:text-[#3b5bfd]" />
                            )}
                          </span>
                        </button>
                      </th>
                      <th className="py-3.5 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/80 font-medium">
                    {paginatedCatalogDocs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-14 text-center text-slate-400">
                          <div className="w-12 h-12 rounded-2xl bg-[#f4f7fb] flex items-center justify-center mx-auto mb-3 text-slate-300">
                            <FileText className="w-6 h-6" />
                          </div>
                          <p className="text-sm font-bold text-slate-700">No matching document services</p>
                          <p className="text-xs text-slate-400 mt-0.5">Try clearing your search query or status filter.</p>
                        </td>
                      </tr>
                    ) : (
                      paginatedCatalogDocs.map((doc) => (
                        <tr
                          key={doc.id || doc.code}
                          className="hover:bg-slate-50/70 transition-colors group"
                        >
                          <td className="p-4 whitespace-nowrap">
                            <span className="font-mono text-xs font-extrabold text-[#3b5bfd] bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                              {doc.code}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#3b5bfd] flex items-center justify-center shrink-0 border border-blue-100">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="min-w-0 max-w-xs sm:max-w-md">
                                <p className="font-bold text-slate-900 text-xs sm:text-sm truncate">{doc.title}</p>
                                <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5" title={doc.description}>{doc.description}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            {doc.is_variable_fee || doc.fee_type === 'variable' ? (
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                Depends on Claim
                              </span>
                            ) : Number(doc.fee) > 0 ? (
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold font-mono bg-slate-100 text-slate-800 border border-slate-200">
                                {formatCurrency(doc.fee)}
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                FREE / Exempt
                              </span>
                            )}
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span>{doc.processing_time || `${doc.processing_days || 1} day(s)`}</span>
                              </div>
                              <div className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-semibold">
                                <ShieldCheck className="w-3 h-3 text-[#3b5bfd]" />
                                <span>
                                  {doc.validity ||
                                    `${doc.validity_months || 6} ${Number(doc.validity_months || 6) === 1 ? 'Month' : 'Months'} from issuance`}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            {doc.requirements && doc.requirements.length > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#f4f7fb] text-slate-700 border border-slate-200/60" title={doc.requirements.join(', ')}>
                                <CheckCircle className="w-3 h-3 text-emerald-500" />
                                <span>{doc.requirements.length} item(s)</span>
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400">None</span>
                            )}
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            <Badge variant={doc.is_active ? 'active' : 'inactive'}>
                              {doc.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          <td className="py-4 px-5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end space-x-1.5">
                              <button
                                type="button"
                                onClick={() => openEditModal(doc)}
                                className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-[#f4f7fb] hover:bg-slate-200/70 rounded-full flex items-center space-x-1 transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>Edit</span>
                              </button>
                              {onDeleteDocType && (
                                <button
                                  type="button"
                                  onClick={() => openDeleteModal(doc)}
                                  className="px-2.5 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-full flex items-center space-x-1 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Remove</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalCatalogItems > 0 && (
                <div className="p-4 bg-white border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <span>
                      Showing <strong className="text-slate-800 font-bold">{catalogStartIndex + 1}</strong> to{' '}
                      <strong className="text-slate-800 font-bold">{Math.min(catalogStartIndex + catalogItemsPerPage, totalCatalogItems)}</strong> of{' '}
                      <strong className="text-slate-800 font-bold">{totalCatalogItems}</strong> services
                    </span>
                    <span className="text-slate-300">•</span>
                    <div className="flex items-center gap-1">
                      <span>Show</span>
                      <select
                        value={catalogItemsPerPage}
                        onChange={(e) => {
                          setCatalogItemsPerPage(Number(e.target.value));
                          setCatalogPage(1);
                        }}
                        className="bg-[#f4f7fb] border border-slate-200/80 rounded-lg px-2 py-0.5 text-xs font-bold text-slate-700 focus:outline-none"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={validCatalogPage <= 1}
                      onClick={() => setCatalogPage((p) => Math.max(1, p - 1))}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 font-bold text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors cursor-pointer inline-flex items-center gap-1"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Prev</span>
                    </button>

                    {Array.from({ length: totalCatalogPages }, (_, i) => i + 1).map((pg) => {
                      const isCurrent = pg === validCatalogPage;
                      return (
                        <button
                          key={pg}
                          type="button"
                          onClick={() => setCatalogPage(pg)}
                          className={`min-w-[28px] h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            isCurrent
                              ? 'bg-[#3b5bfd] text-white shadow-xs'
                              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                          }`}
                        >
                          {pg}
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      disabled={validCatalogPage >= totalCatalogPages}
                      onClick={() => setCatalogPage((p) => Math.min(totalCatalogPages, p + 1))}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 font-bold text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors cursor-pointer inline-flex items-center gap-1"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW MODE 2: CARD GRID (Without Open in Generator Button) */}
          {catalogViewMode === 'grid' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {paginatedCatalogDocs.length === 0 ? (
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
                  paginatedCatalogDocs.map((doc) => (
                    <div
                      key={doc.id || doc.code}
                      className={`bg-white rounded-[26px] border ${
                        doc.is_active ? 'border-slate-100/80' : 'border-slate-200 bg-slate-50/60 opacity-80'
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

                        {/* Issuance Fee, Processing Time & Validity Info */}
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="p-3 bg-[#f4f7fb] rounded-2xl border border-slate-200/60 flex items-center space-x-3">
                            <div className="w-9 h-9 rounded-xl bg-white text-emerald-600 flex items-center justify-center shadow-2xs shrink-0">
                              <DollarSign className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Processing Fee</p>
                              <p className="text-xs font-extrabold text-slate-800 mt-0.5 truncate">
                                {doc.is_variable_fee || doc.fee_type === 'variable' ? (
                                  <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                    Depends on Claim
                                  </span>
                                ) : Number(doc.fee) > 0 ? (
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
                                {doc.processing_time || `${doc.processing_days || 1} ${Number(doc.processing_days || 1) === 1 ? 'Day' : 'Days'}`}
                              </p>
                            </div>
                          </div>

                          <div className="p-3 bg-[#f4f7fb] rounded-2xl border border-slate-200/60 flex items-center space-x-3">
                            <div className="w-9 h-9 rounded-xl bg-white text-indigo-600 flex items-center justify-center shadow-2xs shrink-0">
                              <ShieldCheck className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Validity Period</p>
                              <p className="text-xs font-extrabold text-slate-800 mt-0.5 truncate">
                                {doc.validity ||
                                  `${doc.validity_months || 6} ${Number(doc.validity_months || 6) === 1 ? 'Month' : 'Months'} from issuance`}
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

                      {/* Card Actions (Open in Generator Removed) */}
                      <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
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
                  ))
                )}
              </div>

              {/* Grid Pagination Controls */}
              {totalCatalogItems > 0 && (
                <div className="p-4 bg-white rounded-2xl border border-slate-100/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <span>
                      Showing <strong className="text-slate-800 font-bold">{catalogStartIndex + 1}</strong> to{' '}
                      <strong className="text-slate-800 font-bold">{Math.min(catalogStartIndex + catalogItemsPerPage, totalCatalogItems)}</strong> of{' '}
                      <strong className="text-slate-800 font-bold">{totalCatalogItems}</strong> services
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={validCatalogPage <= 1}
                      onClick={() => setCatalogPage((p) => Math.max(1, p - 1))}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 font-bold text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors cursor-pointer inline-flex items-center gap-1"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Prev</span>
                    </button>

                    {Array.from({ length: totalCatalogPages }, (_, i) => i + 1).map((pg) => {
                      const isCurrent = pg === validCatalogPage;
                      return (
                        <button
                          key={pg}
                          type="button"
                          onClick={() => setCatalogPage(pg)}
                          className={`min-w-[28px] h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            isCurrent
                              ? 'bg-[#3b5bfd] text-white shadow-xs'
                              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                          }`}
                        >
                          {pg}
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      disabled={validCatalogPage >= totalCatalogPages}
                      onClick={() => setCatalogPage((p) => Math.min(totalCatalogPages, p + 1))}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 font-bold text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors cursor-pointer inline-flex items-center gap-1"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

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
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          fee_type: 'fixed',
                          is_variable_fee: false,
                          fee: Number(prev.fee) > 0 ? prev.fee : (editingDoc && !editingDoc.is_variable_fee && editingDoc.fee_type !== 'variable' && Number(editingDoc.fee) > 0 ? editingDoc.fee : 0),
                        }))
                      }
                      className={`px-3 py-2.5 text-xs font-bold rounded-2xl border transition-all cursor-pointer text-center ${formData.fee_type !== 'variable' && !formData.is_variable_fee
                        ? 'bg-[#3b5bfd] border-[#3b5bfd] text-white shadow-xs shadow-blue-500/20'
                        : 'bg-[#f4f7fb] border-transparent text-slate-600 hover:bg-slate-200/70'
                        }`}
                    >
                      Fixed Fee
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          fee_type: 'variable',
                          is_variable_fee: true,
                          fee: 0,
                        }))
                      }
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

              {(formData.fee_type === 'variable' || formData.is_variable_fee) ? (
                <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-2xl text-slate-700 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-extrabold text-xs text-amber-950">Processing Fee: Depends on Claim</p>
                    <p className="text-[11px] text-amber-800/90 mt-0.5 leading-relaxed">
                      Standard processing fee is hidden since this service fee depends on claim. The fee will be evaluated and collected upon claiming at the Barangay Hall, and will display as "Depends on Claim" on document cards and to residents.
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                  <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                    Validity Period (Months)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    required
                    value={formData.validity_months}
                    onChange={(e) => setFormData({ ...formData, validity_months: e.target.value })}
                    placeholder="e.g. 6"
                    className="w-full px-3.5 py-2.5 text-xs bg-[#f4f7fb] border border-slate-200/80 focus:bg-white focus:border-[#3b5bfd] rounded-2xl outline-none font-bold transition-all"
                  />
                  <p className="text-[10px] text-slate-400 font-semibold mt-1">
                    Resident view:{' '}
                    <span className="text-[#3b5bfd]">
                      {Math.max(1, parseInt(formData.validity_months, 10) || 1)}{' '}
                      {Math.max(1, parseInt(formData.validity_months, 10) || 1) === 1
                        ? 'Month'
                        : 'Months'}{' '}
                      from issuance
                    </span>
                  </p>
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

              {/* Certificate Template Designer & Live A4 Print Output (Requested Feature) */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-800 uppercase tracking-wider">
                      Certificate Template &amp; Live A4 Print Output
                    </label>
                    <p className="text-[10px] text-slate-400">
                      Configure the printable A4 certificate wording and template layout for this service
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowTemplatePreview(!showTemplatePreview)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold text-[#3b5bfd] bg-blue-50 hover:bg-blue-100 border border-blue-200/80 transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>{showTemplatePreview ? 'Hide Live A4 Preview' : 'Show Live A4 Preview'}</span>
                  </button>
                </div>

                {/* Template Layout Selection */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, template_type: 'standard' })}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      formData.template_type !== 'business'
                        ? 'border-[#3b5bfd] bg-blue-50/70 text-slate-900 shadow-2xs'
                        : 'border-slate-200 bg-[#f4f7fb] text-slate-600 hover:bg-white'
                    }`}
                  >
                    <p className="font-extrabold text-xs text-slate-900">Standard Certificate</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Resident key-value table &amp; certification body</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, template_type: 'business' })}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      formData.template_type === 'business'
                        ? 'border-[#3b5bfd] bg-blue-50/70 text-slate-900 shadow-2xs'
                        : 'border-slate-200 bg-[#f4f7fb] text-slate-600 hover:bg-white'
                    }`}
                  >
                    <p className="font-extrabold text-xs text-slate-900">Business / Commercial Clearance</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Business Name, Permittee, Capital &amp; Gross Sales</p>
                  </button>
                </div>

                {/* Printed Certificate Title on A4 */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Printed Certificate Title (A4 Header)
                  </label>
                  <input
                    type="text"
                    value={formData.template_title !== undefined ? formData.template_title : (formData.title || '')}
                    onChange={(e) => setFormData({ ...formData, template_title: e.target.value })}
                    placeholder={formData.title ? formData.title.toUpperCase() : 'e.g. BARANGAY CLEARANCE'}
                    className="w-full px-3.5 py-2 text-xs bg-[#f4f7fb] border border-slate-200/80 focus:bg-white focus:border-[#3b5bfd] rounded-2xl outline-none font-bold uppercase transition-all"
                  />
                </div>

                {/* Template Legal Body */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Certificate Legal Body Statement
                  </label>
                  <textarea
                    rows={2}
                    value={formData.template_body}
                    onChange={(e) => setFormData({ ...formData, template_body: e.target.value })}
                    placeholder="This is to certify that the above named person is a bona fide resident..."
                    className="w-full px-3.5 py-2 text-xs bg-[#f4f7fb] border border-slate-200/80 focus:bg-white focus:border-[#3b5bfd] rounded-2xl outline-none font-serif transition-all"
                  />
                </div>

                {/* Live A4 Print Output Rule Notice */}
                <div className={`p-3 rounded-2xl border text-xs ${
                  Number(formData.fee) > 0
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}>
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className={`w-2 h-2 rounded-full ${Number(formData.fee) > 0 ? 'bg-emerald-600' : 'bg-slate-400'}`}></span>
                    <span>
                      {Number(formData.fee) > 0
                        ? `Paid Service (Fee: ₱${Number(formData.fee).toFixed(2)})`
                        : 'Free Service (₱0.00 / Exempt)'}
                    </span>
                  </div>
                  <p className="text-[11px] mt-1 text-slate-600">
                    {Number(formData.fee) > 0
                      ? '✓ Live A4 Print Preview will display the Official Receipt breakdown (O.R. No., Fee, Doc. Stamps ₱30.00, Total Amount, Date) in the lower-left area (matching official barangay clearance format).'
                      : '✓ Live A4 Print Preview will display cleanly without an Official Receipt breakdown box.'}
                  </p>
                </div>

                {/* Embedded Live A4 Template Preview (when toggled) */}
                {showTemplatePreview && (
                  <div className="p-3 bg-slate-100 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[11px] font-bold text-slate-700">Live A4 Print Preview Simulation:</span>
                      <span className="text-[10px] text-slate-500 font-medium">Sample Preview (Scaled)</span>
                    </div>
                    <div className="overflow-x-auto flex justify-center py-3 bg-white rounded-xl border border-slate-200 max-h-[480px] overflow-y-auto">
                      <div style={{ transform: 'scale(0.55)', transformOrigin: 'top center' }}>
                        <DocumentTemplate
                          documentTitle={formData.template_title || (formData.title ? formData.title.toUpperCase() : 'BARANGAY CLEARANCE')}
                          name="Sample Resident / Applicant"
                          address="Barangay Zapatera, Cebu City"
                          dateOfBirth="1995-01-01"
                          contactNo="0917-000-0000"
                          yearsInBarangay="5 years"
                          purpose={formData.description || ""}
                          issuedDate={new Date().toISOString().split('T')[0]}
                          issuedLocation="Barangay Zapatera, Cebu City"
                          bodyText={formData.template_body || 'This is to certify that the above named person has complied with all community requirements.'}
                          config={config}
                          fee={Number(formData.fee) || 0}
                          docStamps={30}
                          orNumber="OR-2026-0001"
                          templateType={formData.template_type || 'standard'}
                          businessName=""
                          permittee=""
                          natureOfBusiness=""
                          capitalInvested=""
                          grossSales=""
                        />
                      </div>
                    </div>
                  </div>
                )}
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
