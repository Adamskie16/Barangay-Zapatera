// Admin/src/features/account/LoginDesignView.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Image as ImageIcon,
  Upload,
  Camera,
  Trash2,
  Edit3,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
  Eye,
  Search,
  X,
} from 'lucide-react';
import { StorageService } from '../../core/storage';
import { supabase, isSupabaseConfigured } from '../../core/supabase';

const DEFAULT_PORTAL_NAMES = {
  all: 'All Portals (Super Admin & Admin)',
  super_admin: 'Super Admin Portal Only',
  admin: 'Barangay Admin Portal Only',
};

export default function LoginDesignView({ isDarkMode }) {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [portalFilter, setPortalFilter] = useState('all');

  // Toast state
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deletingTitle, setDeletingTitle] = useState('');

  // Live Split-Screen Preview Modal State
  const [previewDesign, setPreviewDesign] = useState(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Form Data State
  const [formData, setFormData] = useState({
    title: '',
    badge: 'Barangay Administration',
    description: '',
    image_url: '/auth-bg.jpg',
    target_portal: 'admin',
    is_active: true,
  });

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const showNotification = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  const loadDesigns = async () => {
    setLoading(true);
    try {
      const list = await StorageService.getLoginDesignsAsync();
      setDesigns(list || []);
    } catch (err) {
      console.error('Error loading login designs in admin:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDesigns();
  }, []);

  // Open Create Modal
  const handleOpenCreate = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({
      title: 'Administrator Management System',
      badge: 'Administrative Staff Portal',
      description:
        'Secure administrative access for managing resident records, document requests, event issuances, and community services.',
      image_url: '/auth-bg.jpg',
      target_portal: 'admin',
      is_active: designs.length === 0,
    });
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (design) => {
    setIsEditing(true);
    setEditingId(design.id);
    setFormData({
      title: design.title || '',
      badge: design.badge || 'Barangay Administration',
      description: design.description || '',
      image_url: design.image_url || '/auth-bg.jpg',
      target_portal: design.target_portal || 'admin',
      is_active: design.is_active || false,
    });
    setIsFormModalOpen(true);
  };

  // Handle Image File Selection
  const handleImageFileChange = (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showNotification('Please select a valid image file (JPG, PNG, WebP).', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      if (dataUrl) {
        setFormData((prev) => ({ ...prev, image_url: dataUrl }));
        showNotification('Image loaded into form successfully.', 'info');
      }
    };
    reader.readAsDataURL(file);
  };

  // Save Form (Create or Update)
  const handleSaveDesign = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showNotification('Please enter a Title for the login design.', 'error');
      return;
    }
    if (!formData.description.trim()) {
      showNotification('Please enter a Description for the login design.', 'error');
      return;
    }
    if (!formData.image_url.trim()) {
      showNotification('Please provide an image for the login hero background.', 'error');
      return;
    }

    setSaving(true);
    try {
      if (isEditing && editingId) {
        await StorageService.updateLoginDesign(editingId, formData);
        showNotification('Login design updated successfully!');
      } else {
        await StorageService.createLoginDesign(formData);
        showNotification('New login design created and added to CMS library!');
      }
      setIsFormModalOpen(false);
      await loadDesigns();
    } catch (err) {
      console.error('Error saving login design:', err);
      showNotification('Failed to save login design. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Set As Active Design
  const handleSetActive = async (id, portal) => {
    try {
      await StorageService.setActiveLoginDesign(id, portal);
      showNotification('Hero image design is now LIVE on the login screen!', 'success');
      await loadDesigns();
    } catch (err) {
      console.error('Error activating design:', err);
      showNotification('Failed to activate design.', 'error');
    }
  };

  // Confirm and Delete Design
  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    try {
      await StorageService.deleteLoginDesign(deletingId);
      showNotification('Login design deleted from CMS library.', 'info');
      setIsDeleteModalOpen(false);
      setDeletingId(null);
      await loadDesigns();
    } catch (err) {
      console.error('Error deleting login design:', err);
      showNotification('Failed to delete login design.', 'error');
    }
  };

  // Filter and Search logic
  const filteredDesigns = designs.filter((d) => {
    const matchSearch =
      (d.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.badge || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchSearch) return false;

    if (portalFilter === 'active_only') return d.is_active;
    if (portalFilter !== 'all') return d.target_portal === portalFilter || d.target_portal === 'all';
    return true;
  });

  const activeHeroDesign = designs.find((d) => d.is_active) || designs[0];

  return (
    <div className="space-y-6 font-sans">
      {/* Toast Notification Banner */}
      {toast.show && (
        <div
          className={`p-4 rounded-xl shadow-lg border flex items-center justify-between text-xs font-semibold transition-all transform duration-300 ${
            toast.type === 'error'
              ? 'bg-rose-950/90 text-rose-200 border-rose-800'
              : toast.type === 'info'
              ? 'bg-blue-950/90 text-blue-200 border-blue-800'
              : 'bg-emerald-950/90 text-emerald-200 border-emerald-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            {toast.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
          <button
            onClick={() => setToast({ show: false, message: '', type: 'success' })}
            className="text-slate-400 hover:text-white text-xs ml-4 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header & CMS Control Toolbar */}
      <div
        className={`p-6 rounded-2xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
          isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <ImageIcon className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold tracking-tight">Login Design & Hero Image CMS</h2>
          </div>
          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Manage, upload, and customize hero pictures and text displayed on the login page split screen.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Login Design</span>
          </button>
        </div>
      </div>

      {/* ACTIVE LIVE HERO SPOTLIGHT CARD */}
      {activeHeroDesign && (
        <div
          className={`p-6 rounded-2xl border shadow-sm transition-colors ${
            isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-900 border-slate-800 text-white'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Currently Live on Login Screen
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setPreviewDesign(activeHeroDesign);
                setIsPreviewModalOpen(true);
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md transition-all cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-blue-400" />
              <span>Full Split-Screen Preview</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Visual Thumbnail */}
            <div className="lg:col-span-5 relative h-48 rounded-xl overflow-hidden border border-white/20 bg-slate-950 shadow-inner group">
              <img
                src={activeHeroDesign.image_url}
                alt={activeHeroDesign.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/auth-bg.jpg';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs">
                <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-semibold border border-white/10">
                  {DEFAULT_PORTAL_NAMES[activeHeroDesign.target_portal] || 'All Portals'}
                </span>
                <span className="text-[10px] text-slate-300">Live Status: Active</span>
              </div>
            </div>

            {/* Visual Info */}
            <div className="lg:col-span-7 space-y-3 text-white">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{activeHeroDesign.badge || 'Barangay Administration'}</span>
              </div>
              <h3 className="text-xl font-bold tracking-tight">{activeHeroDesign.title}</h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
                {activeHeroDesign.description}
              </p>
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(activeHeroDesign)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Active Design</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FILTER & SEARCH BAR */}
      <div
        className={`p-4 rounded-2xl border shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 ${
          isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search login designs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs border outline-none transition-colors ${
              isDarkMode
                ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-400 focus:border-blue-500'
                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-600'
            }`}
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setPortalFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
              portalFilter === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : isDarkMode
                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Designs ({designs.length})
          </button>
          <button
            type="button"
            onClick={() => setPortalFilter('active_only')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
              portalFilter === 'active_only'
                ? 'bg-blue-600 text-white shadow-sm'
                : isDarkMode
                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Active Only
          </button>
          <button
            type="button"
            onClick={() => setPortalFilter('admin')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
              portalFilter === 'admin'
                ? 'bg-blue-600 text-white shadow-sm'
                : isDarkMode
                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Admin Portals
          </button>
        </div>
      </div>

      {/* CMS DESIGN GALLERY GRID */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] space-y-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-xs font-semibold text-slate-400">Loading Login Design CMS Library...</p>
        </div>
      ) : filteredDesigns.length === 0 ? (
        <div
          className={`p-12 text-center rounded-2xl border border-dashed flex flex-col items-center justify-center space-y-3 ${
            isDarkMode ? 'border-slate-800 bg-slate-900/40 text-slate-400' : 'border-slate-300 bg-slate-50 text-slate-600'
          }`}
        >
          <ImageIcon className="w-10 h-10 text-slate-400" />
          <p className="text-sm font-bold">No login designs found matching your query.</p>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all cursor-pointer"
          >
            Add First Login Design
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDesigns.map((design) => (
            <div
              key={design.id}
              className={`rounded-2xl border shadow-sm overflow-hidden flex flex-col justify-between transition-all duration-300 hover:shadow-lg ${
                design.is_active
                  ? isDarkMode
                    ? 'bg-slate-900 border-blue-500/50 shadow-blue-500/10'
                    : 'bg-white border-blue-500 shadow-blue-500/10'
                  : isDarkMode
                  ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Card Image Header */}
              <div className="relative h-44 w-full bg-slate-950 overflow-hidden group">
                <img
                  src={design.image_url}
                  alt={design.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/auth-bg.jpg';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />

                {/* Status Badges */}
                <div className="absolute top-3 left-3 flex items-center space-x-2">
                  {design.is_active ? (
                    <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-extrabold shadow-md">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>LIVE ACTIVE</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-slate-900/80 text-slate-300 text-[10px] font-bold backdrop-blur-md border border-white/10">
                      Inactive
                    </span>
                  )}
                </div>

                <div className="absolute top-3 right-3">
                  <span className="px-2.5 py-1 rounded-full bg-black/60 text-white text-[10px] font-semibold backdrop-blur-md border border-white/10">
                    {design.target_portal === 'all'
                      ? 'All Portals'
                      : design.target_portal === 'super_admin'
                      ? 'Super Admin'
                      : 'Admin'}
                  </span>
                </div>

                {/* Quick Split-Screen Preview Button Overlay */}
                <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewDesign(design);
                      setIsPreviewModalOpen(true);
                    }}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-white/90 text-slate-900 text-xs font-bold hover:bg-white transition-all shadow-md cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview</span>
                  </button>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-1.5 text-xs text-blue-500 font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span className="truncate">{design.badge || 'Barangay Administration'}</span>
                  </div>
                  <h4
                    className={`text-sm font-bold leading-tight line-clamp-1 ${
                      isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {design.title}
                  </h4>
                  <p
                    className={`text-xs leading-relaxed line-clamp-2 ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-600'
                    }`}
                  >
                    {design.description}
                  </p>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  {!design.is_active ? (
                    <button
                      type="button"
                      onClick={() => handleSetActive(design.id, design.target_portal)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm flex items-center space-x-1 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Set Active</span>
                    </button>
                  ) : (
                    <span className="text-[11px] font-bold text-emerald-500 flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Active Hero</span>
                    </span>
                  )}

                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(design)}
                      className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isDarkMode
                          ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                      title="Edit Design"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeletingId(design.id);
                        setDeletingTitle(design.title);
                        setIsDeleteModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
                      title="Delete Design"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT DESIGN MODAL */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div
            className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
              isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                  <ImageIcon className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold">
                    {isEditing ? 'Edit Login Screen Design' : 'Create New Login Screen Design'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Upload hero image, configure title, badge, and target portal.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveDesign} className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* 1. Image Upload & Preview Section */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Hero Picture / Background
                </label>

                <div className="relative h-44 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-950 flex items-center justify-center group">
                  <img
                    src={formData.image_url}
                    alt="Preview"
                    className="w-full h-full object-cover object-center"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/auth-bg.jpg';
                    }}
                  />
                  <div className="absolute inset-0 bg-slate-950/40 pointer-events-none" />

                  {/* Upload Actions */}
                  <div className="absolute inset-0 flex items-center justify-center gap-3 p-4 bg-slate-950/60 opacity-90 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center space-x-1.5 transition-all cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload File</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-xs font-bold shadow-md flex items-center space-x-1.5 transition-all cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Use Camera</span>
                    </button>
                  </div>
                </div>

                {/* Hidden File Inputs */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleImageFileChange}
                  className="hidden"
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageFileChange}
                  className="hidden"
                />

                {/* Direct Image URL input */}
                <div className="pt-1">
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Or Enter Direct Image URL:
                  </label>
                  <input
                    type="text"
                    value={formData.image_url}
                    onChange={(e) => setFormData((prev) => ({ ...prev, image_url: e.target.value }))}
                    placeholder="https://... or /auth-bg.jpg"
                    className={`w-full px-3 py-2 rounded-xl text-xs border outline-none font-mono ${
                      isDarkMode
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* 2. Badge / Subtitle Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Security Badge / Subtitle Text
                </label>
                <input
                  type="text"
                  value={formData.badge}
                  onChange={(e) => setFormData((prev) => ({ ...prev, badge: e.target.value }))}
                  placeholder="e.g. Administrative Staff Portal"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs border outline-none font-medium ${
                    isDarkMode
                      ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500'
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600'
                  }`}
                />
              </div>

              {/* 3. Hero Title Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Hero Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Administrator Management System"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs border outline-none font-medium ${
                    isDarkMode
                      ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500'
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600'
                  }`}
                />
              </div>

              {/* 4. Hero Description Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Hero Description Text
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="e.g. Secure administrative access for managing resident records, document requests, event issuances, and community services."
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs border outline-none font-medium ${
                    isDarkMode
                      ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500'
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600'
                  }`}
                />
              </div>

              {/* 5. Target Portal Selector & Active Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                    Apply To Portal
                  </label>
                  <select
                    value={formData.target_portal}
                    onChange={(e) => setFormData((prev) => ({ ...prev, target_portal: e.target.value }))}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs border outline-none font-medium cursor-pointer ${
                      isDarkMode
                        ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600'
                    }`}
                  >
                    <option value="all">All Portals (SuperAdmin & Admin)</option>
                    <option value="admin">Barangay Admin Portal Only</option>
                  </select>
                </div>

                <div className="flex items-center space-x-3 pt-6">
                  <label className="relative flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold">Set as Active Login Hero</span>
                  </label>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md flex items-center space-x-1.5 transition-all cursor-pointer"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving to CMS…</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isEditing ? 'Save Changes' : 'Create Login Design'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL SPLIT-SCREEN PREVIEW MODAL */}
      {isPreviewModalOpen && previewDesign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-5xl h-[85vh] rounded-3xl overflow-hidden border border-slate-700 shadow-2xl flex flex-col bg-slate-950 text-white relative">
            {/* Top Toolbar */}
            <div className="p-4 bg-slate-900/90 border-b border-white/10 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
                  <Eye className="w-4 h-4" />
                </span>
                <span className="text-xs font-bold">Split-Screen Live Login Preview</span>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer"
              >
                Close Preview
              </button>
            </div>

            {/* Split Screen Container */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              {/* LEFT SIDE: Custom Hero Visual */}
              <div className="relative w-full lg:w-1/2 h-full bg-slate-950 overflow-hidden select-none p-10 flex flex-col justify-between">
                <img
                  src={previewDesign.image_url}
                  alt={previewDesign.title}
                  className="absolute inset-0 w-full h-full object-cover object-center"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/auth-bg.jpg';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/60 via-transparent to-blue-500/20 pointer-events-none" />

                <div className="relative z-10 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg">
                    <ShieldCheck className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-blue-300 font-bold block">
                      Barangay Administration
                    </span>
                    <h1 className="text-sm font-extrabold text-white">Barangay Zapatera</h1>
                  </div>
                </div>

                <div className="relative z-10 max-w-md my-auto py-8">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 backdrop-blur-md border border-blue-500/30 text-blue-200 text-[11px] font-semibold mb-4">
                    <Lock className="w-3 h-3 text-blue-300" />
                    {previewDesign.badge || 'Barangay Administration'}
                  </div>
                  <h2 className="text-2xl font-black text-white tracking-tight leading-tight mb-3">
                    {previewDesign.title}
                  </h2>
                  <p className="text-xs text-slate-200 leading-relaxed">{previewDesign.description}</p>
                </div>

                <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-300/80 pt-4 border-t border-white/10">
                  <span>© 2026 Barangay Zapatera, Cebu City</span>
                  <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Admin Auth Online
                  </span>
                </div>
              </div>

              {/* RIGHT SIDE: Simulated Login Form Modal */}
              <div className="w-full lg:w-1/2 h-full bg-white text-slate-900 p-10 flex flex-col justify-between overflow-y-auto">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-sm">
                      BZ
                    </div>
                    <span className="font-bold text-xs">Zapatera Admin Login</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 font-bold text-slate-600">
                    Simulation
                  </span>
                </div>

                <div className="max-w-xs mx-auto w-full space-y-4 my-auto py-6">
                  <div className="text-center space-y-1">
                    <h3 className="text-lg font-extrabold text-slate-900">Sign in to your account</h3>
                    <p className="text-xs text-slate-500">Authorized personnel credentials</p>
                  </div>

                  <div className="space-y-3">
                    <input
                      type="text"
                      disabled
                      placeholder="admin@zapatera.gov.ph"
                      className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 bg-slate-50 text-slate-500"
                    />
                    <input
                      type="password"
                      disabled
                      placeholder="••••••••••••"
                      className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 bg-slate-50 text-slate-500"
                    />
                    <button
                      type="button"
                      disabled
                      className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md cursor-not-allowed opacity-90"
                    >
                      Authenticate Access
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-center text-slate-400">
                  Preview Mode: Live rendering of split-screen hero visual.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div
            className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl space-y-4 ${
              isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center space-x-3 text-rose-500">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold">Delete Login Design?</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-white">"{deletingTitle}"</span>? This will remove the design from your CMS library.
            </p>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-lg flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
