// SuperAdmin/src/features/documents/DocumentInfoManagement.jsx
import React, { useState, useEffect } from 'react';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  Clock,
  DollarSign,
  Printer,
  ShieldCheck,
  Search,
  Filter,
  Eye
} from 'lucide-react';
import { formatCurrency, sanitizeInput } from '../../core/security';
import { db } from '../../supabaseClient';
import DocumentManagement from './DocumentManagement';

export default function DocumentInfoManagement({ docTypes = [], onSaveDocType, onDeleteDocType }) {
  const [subTab, setSubTab] = useState('table'); // 'table' | 'generator'
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const STANDARD_REQUIRED_DOCS = [
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

    if (cleanList.length === 0) {
      return [
        { id: `req-init-1`, selectedOption: STANDARD_REQUIRED_DOCS[0], customText: '' },
        { id: `req-init-2`, selectedOption: STANDARD_REQUIRED_DOCS[1], customText: '' },
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

  // Modal State for CRUD
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    title: '',
    description: '',
    fee: 0,
    processing_days: 1,
    requirementsList: [
      { id: 'req-init-1', selectedOption: STANDARD_REQUIRED_DOCS[0], customText: '' },
      { id: 'req-init-2', selectedOption: STANDARD_REQUIRED_DOCS[1], customText: '' },
    ],
    is_active: true,
  });

  const handleAddRequirement = () => {
    setFormData((prev) => ({
      ...prev,
      requirementsList: [
        ...prev.requirementsList,
        {
          id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          selectedOption: STANDARD_REQUIRED_DOCS[0],
          customText: '',
        },
      ],
    }));
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

  // Generator & Print State
  const [selectedDocId, setSelectedDocId] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [residents, setResidents] = useState([]);
  const [selectedResident, setSelectedResident] = useState('');
  const [purpose, setPurpose] = useState('Local Employment Application');

  useEffect(() => {
    async function loadResidents() {
      const list = await db.getResidents();
      setResidents(list);
      if (list.length > 0) {
        setSelectedResident(list[0].fullName);
      }
    }
    loadResidents();
  }, []);

  useEffect(() => {
    if (docTypes.length > 0 && !selectedDocId) {
      setSelectedDocId(docTypes[0].id || docTypes[0].code);
    }
  }, [docTypes, selectedDocId]);

  const selectedDoc = docTypes.find((d) => d.id === selectedDocId || d.code === selectedDocId) || docTypes[0];

  // Open Modal for Create
  const openCreateModal = () => {
    setEditingDoc(null);
    setFormData({
      code: `DT-0${docTypes.length + 1}`,
      title: '',
      description: '',
      fee: 0,
      processing_days: 1,
      requirementsList: [
        { id: `req-create-1`, selectedOption: STANDARD_REQUIRED_DOCS[0], customText: '' },
        { id: `req-create-2`, selectedOption: STANDARD_REQUIRED_DOCS[1], customText: '' },
      ],
      is_active: true,
    });
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const openEditModal = (doc) => {
    setEditingDoc(doc);
    setFormData({
      code: doc.code || '',
      title: doc.title || '',
      description: doc.description || '',
      fee: doc.fee || 0,
      processing_days: doc.processing_days || 1,
      requirementsList: parseRequirementsToList(doc.requirements || doc.requirementsStr),
      is_active: doc.is_active !== false,
    });
    setIsModalOpen(true);
  };

  // Submit Handler for Form (Create/Update in Supabase)
  const handleSubmit = async (e) => {
    e.preventDefault();

    const requirementsList = formData.requirementsList
      .map((item) => {
        if (item.selectedOption === 'Other / Custom Document...') {
          return item.customText.trim();
        }
        return item.selectedOption.trim();
      })
      .filter(Boolean);

    const docPayload = {
      id: editingDoc ? editingDoc.id : undefined,
      code: sanitizeInput(formData.code).toUpperCase(),
      title: sanitizeInput(formData.title),
      description: sanitizeInput(formData.description),
      fee: Number(formData.fee) || 0,
      processing_days: Number(formData.processing_days) || 1,
      requirements: requirementsList,
      is_active: formData.is_active,
    };

    await onSaveDocType(docPayload);
    setIsModalOpen(false);
  };

  // Filtered List
  const filteredDocTypes = docTypes.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && doc.is_active) ||
      (statusFilter === 'inactive' && !doc.is_active);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-bold">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Document Information & Templates</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage barangay document types, processing fees, turn-around SLA, and dynamic certificate templates.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              onClick={() => setSubTab('table')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                subTab === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Document Information Table
            </button>
            <button
              onClick={() => setSubTab('generator')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                subTab === 'generator' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Document Generator & Print
            </button>
          </div>

          <button
            onClick={openCreateModal}
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-blue-900/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Document Template</span>
          </button>
        </div>
      </div>

      {/* Sub-Tab 1: Document Information Table */}
      {subTab === 'table' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search document title, code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <Filter size={14} />
                <span>Filter Status:</span>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Documents ({docTypes.length})</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold uppercase text-slate-500 tracking-wider">
                    <th className="px-6 py-4">Code</th>
                    <th className="px-6 py-4">Document Title & Description</th>
                    <th className="px-6 py-4">Issuance Fee</th>
                    <th className="px-6 py-4">SLA (Turnaround)</th>
                    <th className="px-6 py-4">Requirements</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredDocTypes.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400">
                        <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="font-semibold">No document information templates found.</p>
                        <p className="text-[11px] text-slate-400 mt-1">Click "Add New Document Type" to create one.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredDocTypes.map((doc) => (
                      <tr key={doc.id || doc.code} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-emerald-700">
                          <span className="bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                            {doc.code}
                          </span>
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          <p className="font-bold text-slate-900 text-sm">{doc.title}</p>
                          <p className="text-slate-500 text-[11px] mt-0.5 line-clamp-2">{doc.description}</p>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-800">
                          <span className="inline-flex items-center gap-1">
                            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                            {doc.fee > 0 ? formatCurrency(doc.fee) : <span className="text-emerald-600 font-extrabold">FREE</span>}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-700">
                          <span className="inline-flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg">
                            <Clock className="w-3.5 h-3.5 text-blue-600" />
                            {doc.processing_days} Day(s)
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <ul className="space-y-1 max-w-xs">
                            {doc.requirements?.slice(0, 2).map((req, idx) => (
                              <li key={idx} className="flex items-center text-[11px] text-slate-600 truncate">
                                <CheckCircle className="w-3 h-3 text-emerald-500 mr-1.5 shrink-0" />
                                <span className="truncate">{req}</span>
                              </li>
                            ))}
                            {(doc.requirements?.length || 0) > 2 && (
                              <li className="text-[10px] text-slate-400 font-semibold pl-4">
                                +{(doc.requirements?.length || 0) - 2} more requirement(s)
                              </li>
                            )}
                          </ul>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={doc.is_active ? 'active' : 'inactive'}>
                            {doc.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => {
                                setSelectedDocId(doc.id || doc.code);
                                setSubTab('generator');
                              }}
                              title="Preview Document"
                              className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openEditModal(doc)}
                              title="Edit Document Info"
                              className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete "${doc.title}"?`)) {
                                  onDeleteDocType(doc.id || doc.code);
                                }
                              }}
                              title="Delete Document"
                              className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Document Generator & Print */}
      {subTab === 'generator' && (
        <DocumentManagement docTypes={docTypes} />
      )}

      {/* CRUD Modal for Add / Edit Document Type */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingDoc ? 'Edit Document Template' : 'Add New Document Template'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
              <label className="block text-xs font-bold text-slate-700 mb-1">Issuance Fee (PHP)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.fee}
                onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

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
            <label className="block text-xs font-bold text-slate-700 mb-1">Description & Scope</label>
            <textarea
              rows={3}
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Provide document scope and details..."
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
                <option value="true">Active Template</option>
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
              {formData.requirementsList.map((item, index) => (
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
                    {formData.requirementsList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRequirement(item.id)}
                        title="Remove this requirement"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

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
              ))}

              {/* Ghost Button to add more required documents */}
              <button
                type="button"
                onClick={handleAddRequirement}
                className="w-full py-2.5 px-3 border border-dashed border-blue-400 hover:border-blue-600 bg-blue-50/40 hover:bg-blue-50 text-blue-600 hover:text-blue-700 font-semibold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.99]"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add More Required Documents</span>
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
            >
              {editingDoc ? 'Update Document Info' : 'Save New Document Type'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Print Preview Modal */}
      {isPreviewOpen && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setIsPreviewOpen(false)}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
          ></div>
          <div className="relative bg-white w-full max-w-4xl h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col z-10">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <Printer size={20} className="text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Print Preview - {selectedDoc.title}</h3>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsPreviewOpen(false)}
                  className="px-6 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    window.print();
                    setIsPreviewOpen(false);
                  }}
                  className="bg-blue-600 text-white px-8 py-2 text-xs font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                >
                  Print Document
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-12 bg-slate-200 flex justify-center">
              <div className="w-[210mm] min-h-[297mm] bg-white shadow-xl p-[20mm] space-y-12">
                <div className="text-center space-y-1">
                  <p className="text-xs uppercase tracking-widest">Republic of the Philippines</p>
                  <p className="text-sm font-bold">Province of Cebu</p>
                  <p className="text-sm font-bold">City of Cebu</p>
                  <p className="text-lg font-black text-blue-600 mt-2 uppercase text-center">Barangay Zapatera</p>
                  <p className="text-xs italic text-slate-500">Office of the Barangay Captain</p>
                </div>

                <div className="h-[2px] bg-blue-600 w-full"></div>

                <div className="py-8">
                  <h1 className="text-center font-black text-3xl text-slate-900 uppercase tracking-[0.2em]">
                    {selectedDoc.title}
                  </h1>
                </div>

                <div className="space-y-8 text-base text-slate-800 leading-loose">
                  <p className="font-bold">TO WHOM IT MAY CONCERN:</p>
                  <p className="indent-12 text-justify">
                    This is to certify that <span className="font-black text-slate-900 underline">{selectedResident || '[RESIDENT NAME]'}</span>, of legal age, Filipino, is a bona fide resident of Barangay Zapatera, Cebu City.
                  </p>
                  <p className="indent-12 text-justify">{selectedDoc.description}</p>
                  <p className="indent-12 text-justify">
                    This certification is being issued upon request for <span className="font-black text-slate-900 underline">{purpose || '[PURPOSE]'}</span> and for whatever legal purpose it may serve.
                  </p>
                  <p className="indent-12">
                    Issued this <span className="font-bold text-slate-900">{new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</span> at Barangay Zapatera, Cebu City.
                  </p>
                </div>

                <div className="pt-28 flex justify-end">
                  <div className="text-center space-y-1">
                    <div className="w-64 border-b-2 border-slate-900 mb-2"></div>
                    <p className="text-lg font-black text-slate-900 uppercase tracking-wider">Hon. Ricardo Dalisay</p>
                    <p className="text-xs font-bold text-slate-500 uppercase text-center">Barangay Captain</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
