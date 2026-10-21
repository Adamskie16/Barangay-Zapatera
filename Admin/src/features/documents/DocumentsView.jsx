// Admin/src/features/documents/DocumentsView.jsx
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
  Lock,
  Loader2,
  Sliders,
  AlertCircle,
  Printer,
} from 'lucide-react';
import { formatCurrency, sanitizeInput } from '../../core/security';
import { StorageService } from '../../core/storage';
import DocumentManagement from './DocumentManagement';
import ActionModal from '../../components/ActionModal';

export default function DocumentsView({ docTypes = [], onSaveDocType, onDeleteDocType, currentUser, isDarkMode, config = {} }) {
  const [subTab, setSubTab] = useState('generator'); // 'generator' | 'info'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);

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

    // If cleanList is empty or explicitly contains "None" / "No Required Documents", return No Required Documents option
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
        localStorage.getItem('zapatera_admin_session') ||
        localStorage.getItem('zapatera_superadmin_session') ||
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

  return (
    <div className="space-y-6">
      {/* Full-Screen Processing Loading Overlay Modal */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-16 h-16 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center mx-auto text-blue-600">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{processingTitle || 'Processing Action...'}</h3>
              <p className="text-xs text-slate-500 mt-1">{processingMessage || 'Saving changes to official barangay services...'}</p>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-blue-600 h-full w-2/3 animate-pulse rounded-full"></div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab Navigation Header */}
      <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
        <button
          onClick={() => setSubTab('generator')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            subTab === 'generator'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Printer size={16} />
          <span>Official Document Generator & Print</span>
        </button>

        <button
          onClick={() => setSubTab('info')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            subTab === 'info'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sliders size={16} />
          <span>Document Information Management</span>
        </button>
      </div>

      {/* SUB-TAB 1: DOCUMENT GENERATOR & PRINT */}
      {subTab === 'generator' && <DocumentManagement docTypes={docTypes} config={config} />}

      {/* SUB-TAB 2: DOCUMENT INFORMATION MANAGEMENT */}
      {subTab === 'info' && (
        <>
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Document Information Management</h2>
              <p className="text-xs text-slate-500 mt-1">
                Configure barangay document types, issuance fees, and required attachment guidelines for resident requests.
              </p>
            </div>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-900/20 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Document Template</span>
            </button>
          </div>

          {/* Document Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {docTypes.length === 0 ? (
              <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-40 text-slate-400" />
                <h3 className="text-base font-bold text-slate-700">No Document Information Types</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Click "Add New Document Type" above to configure barangay document guidelines.
                </p>
              </div>
            ) : (
              docTypes.map((doc) => (
                <div
                  key={doc.id || doc.code}
                  className={`bg-white rounded-2xl border ${
                    doc.is_active ? 'border-slate-200' : 'border-slate-300 bg-slate-50/60 opacity-80'
                  } p-6 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow`}
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {doc.code}
                        </span>
                        <h3 className="text-lg font-bold text-slate-900 mt-2">{doc.title}</h3>
                      </div>
                      <Badge variant={doc.is_active ? 'active' : 'inactive'}>
                        {doc.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">{doc.description}</p>

                    {/* Issuance Fee Info */}
                    <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center space-x-2">
                      <DollarSign className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400">Processing Fee</p>
                        <p className="text-xs font-bold text-slate-800">
                          {doc.fee_type === 'variable' || doc.is_variable_fee ? (
                            <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              Depends upon claim
                            </span>
                          ) : doc.fee > 0 ? (
                            formatCurrency(doc.fee)
                          ) : (
                            'FREE / Exempt'
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Requirements List */}
                    <div className="mt-4">
                      <p className="text-xs font-bold text-slate-700 mb-2">Required Attachments / Guidelines:</p>
                      {(!doc.requirements || doc.requirements.length === 0 || (doc.requirements.length === 1 && (doc.requirements[0].toLowerCase().includes('no required document') || doc.requirements[0].toLowerCase() === 'none' || doc.requirements[0].toLowerCase().startsWith('none (')))) ? (
                        <div className="flex items-center text-xs text-slate-500 italic bg-slate-50 py-2 px-3 rounded-xl border border-slate-200">
                          <CheckCircle className="w-3.5 h-3.5 text-blue-500 mr-2 shrink-0" />
                          <span>No required documents / No attachments needed</span>
                        </div>
                      ) : (
                        <ul className="space-y-1">
                          {doc.requirements?.map((req, idx) => (
                            <li key={idx} className="flex items-center text-xs text-slate-600">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-500 mr-2 shrink-0" />
                              <span>{req}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
                    <button
                      onClick={() => openEditModal(doc)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit Info</span>
                    </button>
                    {onDeleteDocType && (
                      <button
                        onClick={() => openDeleteModal(doc)}
                        className="px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer"
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

          {/* Security Verification - Save/Create Document Info Modal */}
          <Modal
            isOpen={isSaveSecurityModalOpen}
            onClose={() => {
              setIsSaveSecurityModalOpen(false);
              setSavePasswordInput('');
              setSaveAuthError('');
              setIsModalOpen(true);
            }}
            title={`Security Verification - ${editingDoc ? 'Update' : 'Add'} Document Information`}
            darkMode={isDarkMode}
          >
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-blue-950/60 border border-blue-800/80 rounded-xl text-blue-200 flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm text-blue-100">{editingDoc ? 'Authorize Document Info Update' : 'Authorize New Document Type'}</p>
                  <p className="text-xs text-blue-300 mt-1">
                    Please confirm your logged-in account password to authorize {editingDoc ? 'updating' : 'adding'} document guidelines for{' '}
                    <strong className="text-white">{formData.title || 'Document Type'}</strong> (
                    <span className="font-mono text-blue-200">{formData.code || 'CODE'}</span>).
                  </p>
                </div>
              </div>

              {saveAuthError && (
                <div className="p-3 bg-red-950/80 border border-red-800 text-red-200 rounded-xl flex items-center space-x-2 font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{saveAuthError}</span>
                </div>
              )}

              <div className="p-3.5 rounded-xl border bg-slate-950/80 border-slate-800 space-y-2">
                <label className={`block font-bold text-xs flex items-center ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                  <Lock className="w-3.5 h-3.5 mr-1" /> Logged-in Account Password (Required to Authorize)
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
                    placeholder="Enter your logged-in account password"
                    className={`w-full pl-3 pr-10 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 font-mono text-xs ${
                      isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSavePassword(!showSavePassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showSavePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => {
                    setIsSaveSecurityModalOpen(false);
                    setSavePasswordInput('');
                    setSaveAuthError('');
                    setIsModalOpen(true);
                  }}
                  className={`px-4 py-2 font-medium rounded-lg cursor-pointer ${
                    isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSaving || !savePasswordInput.trim()}
                  onClick={handleSaveExecute}
                  className="px-4 py-2 font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-md shadow-blue-900/20 disabled:opacity-50 flex items-center space-x-2 cursor-pointer"
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
            title="Security Verification - Delete Document Information"
            darkMode={isDarkMode}
          >
            {deletingDoc && (
              <div className="space-y-4 text-xs">
                <div className="p-4 bg-rose-950/60 border border-rose-800/80 rounded-xl text-rose-200 flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-sm text-rose-100">Permanent Deletion</p>
                    <p className="text-xs text-rose-300 mt-1">
                      Are you sure you want to permanently delete the document information for{' '}
                      <strong className="text-white">{deletingDoc.title}</strong> (
                      <span className="font-mono text-rose-200">{deletingDoc.code}</span>)?
                    </p>
                  </div>
                </div>

                {deleteAuthError && (
                  <div className="p-3 bg-red-950/80 border border-red-800 text-red-200 rounded-xl flex items-center space-x-2 font-medium">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>{deleteAuthError}</span>
                  </div>
                )}

                <div className="p-3.5 rounded-xl border bg-slate-950/80 border-slate-800 space-y-2">
                  <label className={`block font-bold text-xs flex items-center ${isDarkMode ? 'text-rose-300' : 'text-rose-700'}`}>
                    <Lock className="w-3.5 h-3.5 mr-1" /> Logged-in Account Password (Required to Delete)
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
                      placeholder="Enter your logged-in account password"
                      className={`w-full pl-3 pr-10 py-2 border rounded-xl focus:ring-2 focus:ring-rose-500 font-mono text-xs ${
                        isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowDeletePassword(!showDeletePassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      {showDeletePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => {
                      setIsDeleteModalOpen(false);
                      setDeletePasswordInput('');
                      setDeleteAuthError('');
                    }}
                    className={`px-4 py-2 font-medium rounded-lg cursor-pointer ${
                      isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting || !deletePasswordInput.trim()}
                    onClick={handleDeleteExecute}
                    className="px-4 py-2 font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-md shadow-rose-900/20 disabled:opacity-50 flex items-center space-x-2 cursor-pointer"
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
            title={editingDoc ? 'Edit Document Template' : 'Add New Document Template'}
          >
            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Document Code</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g. BC-01"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Processing Fee Option</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, fee_type: 'fixed', is_variable_fee: false })}
                      className={`px-2.5 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer text-center ${
                        formData.fee_type !== 'variable' && !formData.is_variable_fee
                          ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-2xs font-bold'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Fixed Fee
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, fee_type: 'variable', is_variable_fee: true, fee: 0 })}
                      className={`px-2.5 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer text-center ${
                        formData.fee_type === 'variable' || formData.is_variable_fee
                          ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-2xs font-bold'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Depends on Claim
                    </button>
                  </div>
                </div>
              </div>

              {formData.fee_type === 'variable' || formData.is_variable_fee ? (
                <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-blue-900 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-xs">Fee Depends on Claim (Variable)</p>
                    <p className="text-[11px] text-blue-800 mt-0.5 leading-relaxed">
                      The processing fee will be assessed and entered by the admin when the document is officially marked as claimed. The claimed fee will then automatically reflect in all document fee collections.
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Standard Processing Fee (PHP) <span className="text-slate-400 font-normal">(Set 0 for Free / Exempt)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.fee}
                    onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Document Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Barangay Clearance"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description & Purpose Scope</label>
                <textarea
                  rows={2}
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe document purpose and certificate eligibility"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Turnaround Days (SLA)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.processing_days}
                    onChange={(e) => setFormData({ ...formData, processing_days: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="true">Active Document Template</option>
                    <option value="false">Inactive / Suspended</option>
                  </select>
                </div>
              </div>

              {/* Required Documents Section with Dropdown List & Ghost Button */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Required Documents
                  </label>
                  <span className="text-[11px] font-medium text-slate-400">
                    Select required attachments from the list
                  </span>
                </div>

                <div className="space-y-2">
                  {formData.requirementsList.length === 0 ? (
                    <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl text-center">
                      <p className="text-xs font-bold text-emerald-800">No Required Documents Set</p>
                      <p className="text-[11px] text-emerald-600 mt-0.5">
                        Residents will not be required to attach or upload any supporting files when requesting this document.
                      </p>
                    </div>
                  ) : (
                    formData.requirementsList.map((item, index) => (
                      <div
                        key={item.id}
                        className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                            {index + 1}
                          </span>
                          <div className="flex-1">
                            <select
                              value={item.selectedOption}
                              onChange={(e) => handleRequirementChange(item.id, 'selectedOption', e.target.value)}
                              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 cursor-pointer"
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
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {item.selectedOption === 'No Required Documents (None)' && (
                          <div className="pl-7 text-[11px] text-emerald-700 font-medium flex items-center space-x-1.5">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>No attachments required. Residents can submit their request without uploading files.</span>
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
                              className="w-full px-3 py-1.5 text-xs border border-blue-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        )}
                      </div>
                    ))
                  )}

                  {/* Ghost Button to add more required documents */}
                  <button
                    type="button"
                    onClick={handleAddRequirement}
                    className="w-full py-2.5 px-3 border border-dashed border-blue-400 hover:border-blue-600 bg-blue-50/40 hover:bg-blue-50 text-blue-600 hover:text-blue-700 font-semibold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.99]"
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

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm cursor-pointer flex items-center space-x-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Proceed to Security Authorization</span>
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
