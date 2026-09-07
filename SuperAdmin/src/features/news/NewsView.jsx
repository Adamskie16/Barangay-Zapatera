// SuperAdmin/src/features/news/NewsView.jsx
import React, { useState, useEffect } from 'react';
import {
  Newspaper,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  Calendar,
  MapPin,
  User,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle2,
  X,
  Upload,
  Image as ImageIcon,
  ExternalLink,
  Sparkles,
  Layers,
  Megaphone,
  Radio,
  FileText,
  ShieldCheck
} from 'lucide-react';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import { StorageService } from '../../core/storage';

const CATEGORIES = [
  'All',
  'Emergency',
  'Public Advisory',
  'Government Services',
  'Community',
  'Events',
  'Maintenance'
];

export default function NewsView({ currentUser, isDarkMode }) {
  const [newsList, setNewsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [filterEmergencyOnly, setFilterEmergencyOnly] = useState(false);

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    category: 'Public Advisory',
    description: '',
    content: '',
    banner_url: '',
    location: 'Barangay Zapatera, Cebu City',
    author: currentUser?.full_name || 'Office of the Super Admin',
    is_important: false,
    is_emergency: false,
    is_published: true,
    target_audience: 'all',
  });

  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    loadNews();
  }, []);

  const loadNews = async () => {
    setLoading(true);
    const data = await StorageService.getNewsAsync();
    setNewsList(data);
    setLoading(false);
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const handleOpenCreateModal = () => {
    setEditingItem(null);
    setFormData({
      title: '',
      category: 'Public Advisory',
      description: '',
      content: '',
      banner_url: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=800&q=80',
      location: 'Barangay Zapatera, Cebu City',
      author: currentUser?.full_name || 'Office of the Super Admin',
      is_important: false,
      is_emergency: false,
      is_published: true,
      target_audience: 'all',
    });
    setFormError('');
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      title: item.title || '',
      category: item.category || 'Public Advisory',
      description: item.description || '',
      content: item.content || '',
      banner_url: item.banner_url || '',
      location: item.location || 'Barangay Zapatera, Cebu City',
      author: item.author || currentUser?.full_name || 'Office of the Super Admin',
      is_important: !!item.is_important,
      is_emergency: !!item.is_emergency,
      is_published: item.is_published !== false,
      target_audience: item.target_audience || 'all',
    });
    setFormError('');
    setIsFormModalOpen(true);
  };

  const handleOpenPreview = (item) => {
    setPreviewItem(item);
    setIsPreviewModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setFormError('Article title is required.');
      return;
    }
    if (!formData.description.trim()) {
      setFormError('A brief summary/description is required.');
      return;
    }
    if (!formData.content.trim()) {
      setFormError('Full article content is required.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const payload = {
        ...formData,
        id: editingItem ? editingItem.id : undefined,
        created_by: currentUser?.id || null,
        created_by_name: currentUser?.full_name || currentUser?.email || 'Super Admin',
      };

      await StorageService.saveNews(payload, currentUser);
      setIsFormModalOpen(false);
      await loadNews();
      showToast(editingItem ? 'News bulletin updated successfully!' : 'New article published across all systems!');
    } catch (err) {
      setFormError('Failed to save news bulletin. Please check database connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    try {
      await StorageService.deleteNews(deletingId);
      setIsDeleteModalOpen(false);
      setDeletingId(null);
      await loadNews();
      showToast('Article deleted successfully.');
    } catch (err) {
      showToast('Error deleting article.');
    }
  };

  const handleTogglePublish = async (item) => {
    const updated = {
      ...item,
      is_published: !item.is_published,
    };
    await StorageService.saveNews(updated, currentUser);
    await loadNews();
    showToast(updated.is_published ? 'Article broadcasted to residents.' : 'Article set to draft mode.');
  };

  // Filtered Articles
  const filteredNews = newsList.filter((item) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (item.title || '').toLowerCase().includes(q) ||
      (item.description || '').toLowerCase().includes(q) ||
      (item.content || '').toLowerCase().includes(q) ||
      (item.author || '').toLowerCase().includes(q) ||
      (item.location || '').toLowerCase().includes(q);

    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesEmergency = !filterEmergencyOnly || item.is_emergency;

    return matchesSearch && matchesCategory && matchesEmergency;
  });

  // KPI Metrics
  const totalCount = newsList.length;
  const emergencyCount = newsList.filter((n) => n.is_emergency).length;
  const publishedCount = newsList.filter((n) => n.is_published !== false).length;
  const advisoryCount = newsList.filter((n) => n.category === 'Public Advisory' || n.category === 'Government Services').length;

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-700 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center space-x-3 border border-emerald-500/50 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-200" />
          <span className="font-semibold text-sm">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className={`p-6 md:p-8 rounded-2xl shadow-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${isDarkMode
        ? 'bg-slate-900 border-slate-800 text-white'
        : 'bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 border-slate-800 text-white'
        }`}>
        <div>
          <div className="flex items-center space-x-2.5 mb-2">
            <div className="p-2 bg-blue-500/20 border border-blue-400/30 rounded-lg text-blue-300">
              <Megaphone className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-xs font-bold tracking-widest text-blue-400 uppercase">
              Super Admin Broadcast & Global News Control
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Barangay News & Bulletin Management</h1>
          <p className="text-slate-300 text-sm mt-1 max-w-2xl">
            Author and oversee all public news articles, official announcements, emergency advisories, and municipal notices synchronized with the Resident Portal.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center space-x-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-900/40 hover:shadow-blue-700/50 transition-all duration-200 shrink-0 cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          <span>Post Global Announcement</span>
        </button>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-5 rounded-2xl border shadow-sm flex items-center justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Bulletins</p>
            <h3 className={`text-2xl font-extrabold mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{totalCount}</h3>
            <p className="text-xs text-slate-400 mt-0.5">Global database entries</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Newspaper className="w-6 h-6" />
          </div>
        </div>

        <div className={`p-5 rounded-2xl border shadow-sm flex items-center justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-rose-400">Emergency Alerts</p>
            <h3 className="text-2xl font-extrabold text-rose-500 mt-1">{emergencyCount}</h3>
            <p className="text-xs text-rose-400/80 font-semibold mt-0.5">High-priority broadcast</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className={`p-5 rounded-2xl border shadow-sm flex items-center justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">Live for Residents</p>
            <h3 className="text-2xl font-extrabold text-emerald-500 mt-1">{publishedCount}</h3>
            <p className="text-xs text-slate-400 mt-0.5">Active in mobile/web app</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Radio className="w-6 h-6" />
          </div>
        </div>

        <div className={`p-5 rounded-2xl border shadow-sm flex items-center justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-400">Public Advisories</p>
            <h3 className="text-2xl font-extrabold text-indigo-400 mt-1">{advisoryCount}</h3>
            <p className="text-xs text-slate-400 mt-0.5">Services & health guides</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Megaphone className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className={`p-4 md:p-5 rounded-2xl border shadow-sm space-y-4 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search news by title, keywords, location, or author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${isDarkMode
                ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-500'
                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                }`}
            />
          </div>

          {/* Emergency Filter Toggle */}
          <button
            type="button"
            onClick={() => setFilterEmergencyOnly(!filterEmergencyOnly)}
            className={`inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 ${filterEmergencyOnly
              ? 'bg-rose-700 text-white shadow-md shadow-rose-900/30'
              : isDarkMode
                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{filterEmergencyOnly ? 'Showing Emergency Only' : 'Emergency Filter'}</span>
          </button>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none text-xs">
          <span className="text-slate-400 font-bold uppercase tracking-wider shrink-0 mr-1 flex items-center">
            <Filter className="w-3.5 h-3.5 mr-1" /> Category:
          </span>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 cursor-pointer ${selectedCategory === cat
                ? 'bg-blue-600 text-white shadow-sm font-bold'
                : isDarkMode
                  ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* News Cards Grid */}
      {loading ? (
        <div className={`rounded-2xl border p-12 text-center ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
          }`}>
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="font-semibold text-sm">Fetching synchronized news from Supabase database...</p>
        </div>
      ) : filteredNews.length === 0 ? (
        <div className={`rounded-2xl border border-dashed p-12 text-center ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-300 text-slate-500'
          }`}>
          <Newspaper className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>No News Bulletins Found</h3>
          <p className="text-sm max-w-md mx-auto mt-1">
            {searchQuery || selectedCategory !== 'All' || filterEmergencyOnly
              ? 'No announcements match your search criteria or category filter.'
              : 'There are no active news articles yet. Click below to publish your first announcement.'}
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="mt-4 inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Post First Bulletin</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredNews.map((item) => (
            <div
              key={item.id}
              className={`rounded-2xl border transition-all duration-200 flex flex-col overflow-hidden shadow-sm hover:shadow-md ${isDarkMode ? 'bg-slate-900' : 'bg-white'
                } ${item.is_emergency
                  ? 'border-rose-500/50 ring-2 ring-rose-500/20'
                  : item.is_important
                    ? 'border-blue-500/50 ring-2 ring-blue-500/10'
                    : isDarkMode ? 'border-slate-800' : 'border-slate-200'
                }`}
            >
              {/* Banner Image */}
              <div className="relative h-44 bg-slate-800 overflow-hidden group">
                <img
                  src={item.banner_url || 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=600&q=80'}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />

                {/* Badges on Banner */}
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                  <span
                    className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-md shadow-sm ${item.category === 'Emergency' || item.is_emergency
                      ? 'bg-rose-700 text-white border border-rose-500'
                      : item.category === 'Government Services'
                        ? 'bg-indigo-700 text-white border border-indigo-500'
                        : item.category === 'Maintenance'
                          ? 'bg-amber-600 text-white border border-amber-500'
                          : 'bg-blue-700 text-white border border-blue-500'
                      }`}
                  >
                    {item.category}
                  </span>

                  {item.is_emergency && (
                    <span className="text-[10px] font-extrabold uppercase px-2 py-1 rounded-md bg-rose-700 text-white flex items-center space-x-1 animate-pulse">
                      <AlertTriangle className="w-3 h-3" />
                      <span>URGENT</span>
                    </span>
                  )}
                </div>

                {/* Published Status Badge */}
                <div className="absolute top-3 right-3">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1 ${item.is_published !== false
                      ? 'bg-emerald-500/90 text-white border border-emerald-400'
                      : 'bg-slate-700/90 text-slate-300 border border-slate-600'
                      }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${item.is_published !== false ? 'bg-white animate-ping' : 'bg-slate-400'}`} />
                    <span>{item.is_published !== false ? 'LIVE' : 'DRAFT'}</span>
                  </span>
                </div>

                {/* Date & Location at bottom of banner */}
                <div className="absolute bottom-2.5 left-3 right-3 text-white text-xs flex items-center justify-between">
                  <span className="flex items-center space-x-1 font-semibold text-slate-200">
                    <Calendar className="w-3.5 h-3.5 text-blue-300" />
                    <span>{item.date || new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </span>
                  {item.location && (
                    <span className="flex items-center space-x-1 text-slate-300 truncate max-w-[150px]">
                      <MapPin className="w-3.5 h-3.5 text-rose-300 shrink-0" />
                      <span className="truncate">{item.location}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <h3 className={`text-base font-bold leading-snug line-clamp-2 hover:text-blue-500 transition-colors ${isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}>
                    {item.title}
                  </h3>
                  <p className={`text-xs mt-2 line-clamp-3 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                    {item.description}
                  </p>
                </div>

                {/* Author Info */}
                <div className={`pt-3 border-t flex items-center justify-between text-xs ${isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-500'
                  }`}>
                  <span className="flex items-center space-x-1 font-medium truncate max-w-[170px]">
                    <User className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{item.author || 'Super Admin'}</span>
                  </span>

                  <span className="text-[11px] font-semibold uppercase">
                    Audience: {item.target_audience || 'All'}
                  </span>
                </div>

                {/* Action Toolbar */}
                <div className="pt-2 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleOpenPreview(item)}
                    className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                    <span>Preview</span>
                  </button>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => handleTogglePublish(item)}
                      title={item.is_published !== false ? 'Unpublish from resident app' : 'Publish to resident app'}
                      className={`p-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${item.is_published !== false
                        ? 'text-emerald-400 hover:bg-emerald-500/10'
                        : 'text-slate-400 hover:bg-slate-800'
                        }`}
                    >
                      {item.is_published !== false ? <CheckCircle2 className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>

                    <button
                      onClick={() => handleOpenEditModal(item)}
                      title="Edit bulletin"
                      className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => {
                        setDeletingId(item.id);
                        setIsDeleteModalOpen(true);
                      }}
                      title="Delete bulletin"
                      className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT NEWS MODAL */}
      {isFormModalOpen && (
        <Modal
          isOpen={isFormModalOpen}
          onClose={() => setIsFormModalOpen(false)}
          title={editingItem ? 'Edit Barangay Bulletin' : 'Publish New Barangay Announcement'}
          size="lg"
        >
          <form onSubmit={handleFormSubmit} className="space-y-4">
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Announcement Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Free Medical Mission & Health Clearance Day"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium text-slate-900"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium bg-white text-slate-900"
                >
                  {CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Venue / Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Barangay Zapatera Gymnasium, Rahmann St."
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Brief Summary / Card Description <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                placeholder="Short summary displayed on the card in resident dashboard..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium resize-none text-slate-900"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Full Bulletin Content & Advisory Details <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={6}
                placeholder="Complete bulletin announcement text, program schedules, guidelines, contact details, requirements..."
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-xs leading-relaxed text-slate-900"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Banner Image URL
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={formData.banner_url}
                  onChange={(e) => setFormData({ ...formData, banner_url: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Author / Issuing Body
                </label>
                <input
                  type="text"
                  placeholder="e.g. Office of the Super Admin"
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium text-slate-900"
                />
              </div>
            </div>

            {/* Checkbox Options */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5 text-slate-900">
              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_emergency}
                  onChange={(e) => setFormData({ ...formData, is_emergency: e.target.checked })}
                  className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
                />
                <span className="text-xs font-bold text-rose-800 flex items-center space-x-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Mark as Urgent / Emergency Broadcast (Red Alert Banner)</span>
                </span>
              </label>

              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_important}
                  onChange={(e) => setFormData({ ...formData, is_important: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="text-xs font-semibold text-slate-700">
                  Feature prominently as Important Notice
                </span>
              </label>

              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_published}
                  onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <span className="text-xs font-semibold text-slate-700">
                  Publish immediately to Resident Portal
                </span>
              </label>
            </div>

            <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>{editingItem ? 'Update Bulletin' : 'Publish Announcement'}</span>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* PREVIEW RESIDENT VIEW MODAL */}
      {isPreviewModalOpen && previewItem && (
        <Modal
          isOpen={isPreviewModalOpen}
          onClose={() => setIsPreviewModalOpen(false)}
          title="Resident Portal View Preview"
          size="lg"
        >
          <div className="space-y-4">
            <div className="relative h-48 rounded-xl overflow-hidden bg-slate-100">
              <img
                src={previewItem.banner_url || 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=800&q=80'}
                alt={previewItem.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 text-white">
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded bg-blue-600 text-white mb-1.5 inline-block">
                  {previewItem.category}
                </span>
                <h2 className="text-lg font-bold leading-tight">{previewItem.title}</h2>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 py-1 border-b border-slate-100">
              <span className="flex items-center space-x-1 font-semibold text-slate-700">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>{previewItem.date || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              </span>
              <span className="flex items-center space-x-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>{previewItem.author || 'Barangay Zapatera Office'}</span>
              </span>
            </div>

            {previewItem.location && (
              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl flex items-center space-x-2 text-xs font-semibold text-blue-900">
                <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Location: {previewItem.location}</span>
              </div>
            )}

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Bulletin Content</h4>
              <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                {previewItem.content || previewItem.description}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsPreviewModalOpen(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Confirm Delete Announcement"
          size="sm"
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium">
              Are you sure you want to delete this news bulletin? This will remove it from the Resident Portal immediately.
            </div>

            <div className="flex justify-end space-x-2.5 pt-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
