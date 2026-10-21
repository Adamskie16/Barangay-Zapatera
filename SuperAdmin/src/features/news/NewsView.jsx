// SuperAdmin/src/features/news/NewsView.jsx
import React, { useState, useEffect, useMemo } from 'react';
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
  CheckCircle2,
  X,
  Upload,
  Image as ImageIcon,
  ExternalLink,
  Radio,
  Clock,
  ChevronRight,
  Loader2,
  CalendarDays,
  ShieldCheck,
  MessageSquare,
  Send,
  CornerDownRight,
  Reply,
  MessageCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  LayoutGrid,
  Table as TableIcon,
  Sparkles,
} from 'lucide-react';
import {
  getBulletinComments,
  getBulletinCommentCounts,
  postOfficialReply,
  deleteBulletinComment,
  subscribeToBulletinComments
} from '../../core/commentService';
import { translateCivicAnnouncement, CIVIC_ANNOUNCEMENT_TEMPLATES } from '../../core/administrativeAiService';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import EventCalendar from '../../components/EventCalendar';
import ActionModal from '../../components/ActionModal';
import { StorageService } from '../../core/storage';
import { uploadNewsBanner } from '../../core/storageService';
import { formatDate, sanitizeInput } from '../../core/security';

const CATEGORIES = [
  'All',
  'Emergency',
  'Public Advisory',
  'Government Services',
  'Community',
  'Maintenance'
];

// Helper to format/parse dates in Philippine Standard Time (PST/PHT: UTC+8)
function getPHTDateKey(raw) {
  if (!raw) return null;
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return null;
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch {
    return null;
  }
}

function getPhilippineDateTimeLocal(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  try {
    const phtParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(d);
    const map = {};
    phtParts.forEach((p) => { map[p.type] = p.value; });
    return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}`;
  } catch {
    return new Date(d.getTime() + 8 * 3600000).toISOString().slice(0, 16);
  }
}

function fromPhilippineDateTimeLocal(localStr) {
  if (!localStr) return null;
  return new Date(`${localStr}:00+08:00`).toISOString();
}

export default function NewsView({ currentUser, events = [], onSaveEvent, onDeleteEvent, isDarkMode = false }) {
  const [newsList, setNewsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [filterEmergencyOnly, setFilterEmergencyOnly] = useState(false);

  // Calendar feature state
  const [selectedDate, setSelectedDate] = useState(null);
  const [showCalendar, setShowCalendar] = useState(true);

  // Table View & Document Requests Pagination/Sorting Logic
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'
  const [sortKey, setSortKey] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset to page 1 on search, category, or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, filterEmergencyOnly, selectedDate, pageSize]);

  const handleSort = (columnKey) => {
    if (!columnKey) return;
    if (sortKey === columnKey) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortKey('created_at');
        setSortDirection('desc');
      }
    } else {
      setSortKey(columnKey);
      setSortDirection('asc');
    }
  };

  // Real-Time Resident Comments & Official Replies State
  const [commentCounts, setCommentCounts] = useState({});
  const [selectedNewsForComments, setSelectedNewsForComments] = useState(null);
  const [bulletinComments, setBulletinComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [adminReplyText, setAdminReplyText] = useState('');
  const [replyingToComment, setReplyingToComment] = useState(null);
  const [submittingReply, setSubmittingReply] = useState(false);

  // Load comment counts for all news bulletins
  useEffect(() => {
    let isMounted = true;
    const loadCounts = async () => {
      try {
        const counts = await getBulletinCommentCounts(newsList.map((item) => item.id));
        if (isMounted) setCommentCounts(counts);
      } catch (err) {
        console.error('Failed to load comment counts:', err);
      }
    };
    if (newsList.length > 0) {
      loadCounts();
    }
    return () => {
      isMounted = false;
    };
  }, [newsList]);

  // Subscribe to real-time comment updates for open modal
  useEffect(() => {
    if (!selectedNewsForComments) return;
    const unsub = subscribeToBulletinComments(selectedNewsForComments.id, async () => {
      const list = await getBulletinComments(selectedNewsForComments.id);
      setBulletinComments(list);
      setCommentCounts((prev) => ({ ...prev, [selectedNewsForComments.id]: list.length }));
    });
    return unsub;
  }, [selectedNewsForComments]);

  const handleOpenCommentsModal = async (newsItem) => {
    setSelectedNewsForComments(newsItem);
    setReplyingToComment(null);
    setAdminReplyText('');
    setLoadingComments(true);
    try {
      const list = await getBulletinComments(newsItem.id);
      setBulletinComments(list);
      setCommentCounts((prev) => ({ ...prev, [newsItem.id]: list.length }));
    } finally {
      setLoadingComments(false);
    }
  };

  const handleSendAdminReply = async (e) => {
    e?.preventDefault();
    if (!adminReplyText.trim() || !selectedNewsForComments || submittingReply) return;
    setSubmittingReply(true);
    try {
      const reply = await postOfficialReply({
        news_id: selectedNewsForComments.id,
        adminUser: currentUser,
        content: adminReplyText.trim(),
        parent_id: replyingToComment?.id || null,
        reply_to_name: replyingToComment?.author_name || null,
      });

      setBulletinComments((prev) => {
        if (prev.some((c) => c.id === reply.id)) return prev;
        return [...prev, reply];
      });

      setCommentCounts((prev) => ({
        ...prev,
        [selectedNewsForComments.id]: (prev[selectedNewsForComments.id] || 0) + 1,
      }));

      setAdminReplyText('');
      setReplyingToComment(null);
    } catch (err) {
      console.error('Failed to post official reply:', err);
      alert('Could not post reply. Please check your connection.');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleDeleteComment = (commentId) => {
    if (!selectedNewsForComments) return;
    const commentObj = bulletinComments.find((c) => c.id === commentId);
    const snippet = commentObj?.content
      ? `"${commentObj.content.length > 50 ? commentObj.content.slice(0, 50) + '...' : commentObj.content}"`
      : 'this comment';

    setActionModal({
      isOpen: true,
      type: 'warning',
      title: 'Delete Comment',
      message: (
        <div className="space-y-3 text-left">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Are you sure you want to permanently delete {snippet}?
          </p>
          <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-xl text-xs text-red-600 dark:text-red-400">
            <strong>Warning:</strong> Any nested replies to this comment will also be permanently removed.
          </div>
        </div>
      ),
      confirmText: 'Delete Comment',
      cancelText: 'Cancel',
      isDestructive: true,
      onConfirm: async () => {
        await deleteBulletinComment(commentId, selectedNewsForComments.id);
        setBulletinComments((prev) => prev.filter((c) => c.id !== commentId && c.parent_id !== commentId));
        setCommentCounts((prev) => ({
          ...prev,
          [selectedNewsForComments.id]: Math.max(0, (prev[selectedNewsForComments.id] || 1) - 1),
        }));
        setActionModal((prev) => ({ ...prev, isOpen: false }));
      },
      onClose: () => setActionModal((prev) => ({ ...prev, isOpen: false })),
    });
  };

  // Reusable Feedback ActionModal State
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

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    category: 'Public Advisory',
    description: '',
    content: '',
    banner_url: '',
    location: 'Barangay Zapatera, Cebu City',
    event_date: '',
    author: currentUser?.full_name || 'Barangay Administration',
    is_important: false,
    is_emergency: false,
    is_published: true,
    target_audience: 'residents',
    duration_days: 7,
  });

  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    loadNews();
  }, []);

  const loadNews = async () => {
    setLoading(true);
    try {
      const [newsData, eventsData] = await Promise.all([
        StorageService.getNewsAsync(),
        StorageService.getEventsAsync ? StorageService.getEventsAsync() : Promise.resolve([]),
      ]);

      // Combine news with historical events if not already present
      const combined = [...(newsData || [])];
      const existingTitles = new Set(combined.map((n) => (n.title || '').trim().toLowerCase()));

      if (Array.isArray(eventsData)) {
        eventsData.forEach((evt) => {
          const titleKey = (evt.title || '').trim().toLowerCase();
          if (!existingTitles.has(titleKey)) {
            combined.push({
              id: evt.id,
              title: evt.title,
              category: 'Events',
              description: evt.description || '',
              content: evt.description || '',
              banner_url: evt.image_url || '',
              location: evt.location || 'Barangay Zapatera Gymnasium',
              event_date: evt.event_date || evt.date || '',
              created_at: evt.created_at || evt.event_date || new Date().toISOString(),
              author: evt.created_by_name || 'Barangay Administration',
              is_important: false,
              is_emergency: false,
              is_published: evt.status !== 'archived',
              target_audience: evt.target_audience || 'residents',
              is_event_source: true,
              is_archived: evt.is_archived || evt.status === 'archived',
            });
            existingTitles.add(titleKey);
          }
        });
      }

      // Check for duration auto-expiration and filter soft-archived items
      const nowTime = Date.now();
      const activeCombined = [];
      for (const item of combined) {
        if (item.is_archived === true || item.deleted_at) continue;
        if (item.expires_at && new Date(item.expires_at).getTime() <= nowTime) {
          try {
            await StorageService.archiveNews(item.id, {
              ...currentUser,
              full_name: 'System Auto-Expire (Duration Reached)',
            });
          } catch {}
          continue;
        }
        activeCombined.push(item);
      }

      setNewsList(activeCombined);
    } catch (err) {
      console.warn('Failed to load news bulletins:', err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const handleOpenCreateModal = (prefillCategory = 'Public Advisory') => {
    setEditingItem(null);
    const isEventCat = prefillCategory === 'Events';
    setFormData({
      title: '',
      category: prefillCategory,
      description: '',
      content: '',
      banner_url: '',
      location: 'Barangay Zapatera, Cebu City',
      event_date: isEventCat ? new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16) : '',
      author: currentUser?.full_name || 'Barangay Administration',
      is_important: false,
      is_emergency: false,
      is_published: true,
      target_audience: 'residents',
      duration_days: 7,
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
      event_date: item.event_date ? new Date(item.event_date).toISOString().slice(0, 16) : '',
      author: item.author || currentUser?.full_name || 'Barangay Administration',
      is_important: !!item.is_important,
      is_emergency: !!item.is_emergency,
      is_published: item.is_published !== false,
      target_audience: item.target_audience || 'residents',
      duration_days: item.duration_days !== undefined ? item.duration_days : (item.expires_at ? Math.max(1, Math.round((new Date(item.expires_at).getTime() - new Date(item.created_at || Date.now()).getTime()) / 86400000)) : 7),
    });
    setFormError('');
    setIsFormModalOpen(true);
  };

  const handleOpenPreview = (item) => {
    setPreviewItem(item);
    setIsPreviewModalOpen(true);
  };

  // Helper to compress uploaded images as a lightweight fallback
  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds 10MB limit. Please select a smaller image.');
      return;
    }
    setIsUploading(true);
    try {
      // 1. First attempt to upload to Supabase Storage (public_assets bucket)
      const uploadRes = await uploadNewsBanner(file);
      if (uploadRes?.success && uploadRes?.url) {
        setFormData((prev) => ({ ...prev, banner_url: uploadRes.url }));
        return;
      }

      // 2. Fallback to lightweight compressed image data URL if Supabase storage is unavailable or fails
      const compressedDataUrl = await compressImage(file);
      setFormData((prev) => ({ ...prev, banner_url: compressedDataUrl }));
    } catch (err) {
      console.warn('Image upload/processing error, falling back to compressed thumbnail:', err);
      try {
        const compressedDataUrl = await compressImage(file);
        setFormData((prev) => ({ ...prev, banner_url: compressedDataUrl }));
      } catch (_) {}
    } finally {
      setIsUploading(false);
    }
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
      let expiresAt = null;
      let durationVal = formData.duration_days;
      if (formData.duration_days === 'custom' || formData.expires_at) {
        expiresAt = formData.expires_at ? new Date(formData.expires_at).toISOString() : null;
        durationVal = 'custom';
      } else {
        const durationNum = Number(formData.duration_days !== undefined ? formData.duration_days : 7);
        expiresAt = durationNum > 0
          ? new Date(Date.now() + durationNum * 86400000).toISOString()
          : null;
        durationVal = durationNum;
      }

      const payload = {
        ...formData,
        duration_days: durationVal,
        expires_at: expiresAt,
        id: editingItem ? editingItem.id : undefined,
        event_date: formData.event_date ? new Date(formData.event_date).toISOString() : null,
        created_by: currentUser?.id || null,
        created_by_name: currentUser?.full_name || currentUser?.email || 'Super Admin',
      };

      await StorageService.saveNews(payload, currentUser);

      // If category is Events, also synchronize with event storage if available
      if (formData.category === 'Events' && onSaveEvent) {
        try {
          await onSaveEvent({
            id: payload.id,
            title: payload.title,
            description: payload.description,
            event_date: payload.event_date || new Date().toISOString(),
            location: payload.location,
            image_url: payload.banner_url,
            status: payload.is_published ? 'upcoming' : 'archived',
            target_audience: payload.target_audience,
          });
        } catch {}
      }

      setIsFormModalOpen(false);
      await loadNews();

      setActionModal({
        isOpen: true,
        type: 'success',
        title: editingItem ? 'Announcement Updated' : 'Announcement Published',
        message: editingItem
          ? 'Your bulletin and scheduled date have been updated successfully.'
          : 'Your bulletin has been published and scheduled on the community calendar.',
        buttonText: 'OK',
        onClose: () => setActionModal({ isOpen: false }),
      });
    } catch (err) {
      setFormError('Failed to save news bulletin. Please try again.');
      setActionModal({
        isOpen: true,
        type: 'error',
        title: 'Publish Failed',
        message: 'Something went wrong while publishing the announcement. Please try again.',
        buttonText: 'Close',
        onClose: () => setActionModal({ isOpen: false }),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePromptDeleteNews = (item) => {
    setActionModal({
      isOpen: true,
      type: 'confirmation',
      title: 'Move Announcement to Archive?',
      message: `Are you sure you want to move "${item.title}" to Archive & Trash? You can restore it anytime.`,
      confirmText: 'Move to Archive',
      cancelText: 'Cancel',
      isDestructive: true,
      isLoading: false,
      onConfirm: async () => {
        setActionModal((prev) => ({ ...prev, isLoading: true }));
        try {
          await StorageService.archiveNews(item.id, currentUser);
          if (item.category === 'Events' && onDeleteEvent) {
            try {
              await onDeleteEvent(item.id);
            } catch {}
          }
          await loadNews();
          setActionModal({
            isOpen: true,
            type: 'success',
            title: 'Announcement Archived',
            message: 'The announcement has been moved to Archive & Trash.',
            buttonText: 'OK',
            onClose: () => setActionModal({ isOpen: false }),
          });
        } catch (err) {
          setActionModal({
            isOpen: true,
            type: 'error',
            title: 'Archive Failed',
            message: 'Unable to archive the announcement. Please try again.',
            buttonText: 'Close',
            onClose: () => setActionModal({ isOpen: false }),
          });
        }
      },
      onClose: () => setActionModal({ isOpen: false }),
    });
  };

  const handleTogglePublish = async (item) => {
    const updated = {
      ...item,
      is_published: !item.is_published,
    };
    await StorageService.saveNews(updated, currentUser);
    await loadNews();
    showToast(updated.is_published ? 'Article published to residents.' : 'Article unpublished.');
  };

  // Filtered Articles (Search, Category, Emergency, Calendar Date)
  const filteredNews = useMemo(() => {
    return newsList.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (item.title || '').toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q) ||
        (item.content || '').toLowerCase().includes(q) ||
        (item.author || '').toLowerCase().includes(q) ||
        (item.location || '').toLowerCase().includes(q);

      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;

      let matchesDate = true;
      if (selectedDate) {
        const itemDateStr = item.event_date || item.scheduled_date || item.event_datetime || (item.category === 'Events' ? item.created_at : null);
        if (itemDateStr) {
          const key = getPHTDateKey(itemDateStr);
          matchesDate = key === selectedDate;
        } else {
          matchesDate = false;
        }
      }

      return matchesSearch && matchesCategory && matchesDate;
    });
  }, [newsList, searchQuery, selectedCategory, selectedDate]);

  // Calendar events feed (items with an event_date or categorized as Events)
  const calendarItems = useMemo(() => {
    return newsList.filter((n) => n.event_date || n.scheduled_date || n.category === 'Events');
  }, [newsList]);

  // Upcoming scheduled items
  const upcomingItems = useMemo(() => {
    const now = new Date();
    return calendarItems
      .filter((n) => {
        const d = new Date(n.event_date || n.created_at);
        return !isNaN(d.getTime()) && d >= new Date(now.setHours(0, 0, 0, 0));
      })
      .sort((a, b) => new Date(a.event_date || a.created_at) - new Date(b.event_date || b.created_at));
  }, [calendarItems]);

  // Sort filtered news records
  const sortedNews = useMemo(() => {
    return [...filteredNews].sort((a, b) => {
      let valA = a[sortKey];
      let valB = b[sortKey];

      if (sortKey === 'created_at' || sortKey === 'event_date') {
        const dateA = new Date(valA || 0).getTime();
        const dateB = new Date(valB || 0).getTime();
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      }
      if (sortKey === 'status') {
        valA = a.is_published !== false ? 'published' : 'draft';
        valB = b.is_published !== false ? 'published' : 'draft';
      }

      const cmp = String(valA || '').localeCompare(String(valB || ''), undefined, { numeric: true, sensitivity: 'base' });
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [filteredNews, sortKey, sortDirection]);

  // Document Requests 10-Row Pagination Computation
  const totalEntries = sortedNews.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = totalEntries === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endIndex = Math.min(safeCurrentPage * pageSize, totalEntries);
  const paginatedNews = sortedNews.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (safeCurrentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (safeCurrentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  // KPI Metrics
  const totalCount = newsList.length;
  const emergencyCount = newsList.filter((n) => n.is_emergency).length;
  const publishedCount = newsList.filter((n) => n.is_published !== false).length;
  const scheduledCount = calendarItems.length;

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
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-6 md:p-8 rounded-2xl shadow-xl text-white border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">News, Bulletins & Barangay Events</h1>
          <p className="text-slate-300 text-sm mt-1 max-w-2xl leading-relaxed">
            Create and manage announcements, advisories, and events for residents.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowCalendar((prev) => !prev)}
            className={`inline-flex items-center space-x-2 px-4 py-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
              showCalendar
                ? 'bg-blue-600/30 border-blue-400 text-blue-200 hover:bg-blue-600/40'
                : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>{showCalendar ? 'Calendar Panel Active' : 'Show Calendar'}</span>
          </button>

          <button
            onClick={() => handleOpenCreateModal('Public Advisory')}
            className="inline-flex items-center justify-center space-x-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-900/40 transition-all duration-200 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Publish Announcement</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-5 rounded-2xl border shadow-sm flex items-center justify-between transition-colors ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Bulletins</p>
            <h3 className={`text-2xl font-extrabold mt-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{totalCount}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Published barangay records</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex items-center justify-center text-blue-600">
            <Newspaper className="w-6 h-6" />
          </div>
        </div>

        <div className={`p-5 rounded-2xl border shadow-sm flex items-center justify-between transition-colors ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-500">Scheduled Events</p>
            <h3 className={`text-2xl font-extrabold mt-1 ${isDarkMode ? 'text-white' : 'text-indigo-700'}`}>{scheduledCount}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Linked on calendar</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 flex items-center justify-center text-indigo-600">
            <CalendarDays className="w-6 h-6" />
          </div>
        </div>

        <div className={`p-5 rounded-2xl border shadow-sm flex items-center justify-between transition-colors ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-rose-500">Emergency Alerts</p>
            <h3 className="text-2xl font-extrabold text-rose-600 mt-1">{emergencyCount}</h3>
            <p className="text-xs text-rose-500 font-semibold mt-0.5">High-priority broadcast</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center justify-center text-rose-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className={`p-5 rounded-2xl border shadow-sm flex items-center justify-between transition-colors ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-500">Live in Portal</p>
            <h3 className="text-2xl font-extrabold text-emerald-600 mt-1">{publishedCount}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Accessible by residents</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-center text-emerald-600">
            <Radio className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className={`p-4 md:p-5 rounded-2xl border shadow-sm space-y-4 transition-colors ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title, keywords, location, or author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* View Mode Toggle */}
            <div className={`flex items-center rounded-xl p-1 border ${
              isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'
            }`}>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
                title="Table View (10-row default)"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Table</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
                title="Card Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Cards</span>
              </button>
            </div>
          </div>
        </div>

        {/* Category Filter Pills & Date Filter Banner */}
        <div className={`flex flex-wrap items-center justify-between gap-2 pt-1 border-t ${
          isDarkMode ? 'border-slate-800' : 'border-slate-100'
        }`}>
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none text-xs">
            <span className="text-slate-400 font-bold uppercase tracking-wider shrink-0 mr-1 flex items-center">
              <Filter className="w-3.5 h-3.5 mr-1" /> Category:
            </span>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-sm font-bold'
                    : isDarkMode
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {selectedDate && (
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-800 dark:text-blue-300 font-semibold">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>Date: {selectedDate}</span>
              <button
                onClick={() => setSelectedDate(null)}
                className="text-blue-600 hover:text-rose-600 font-bold ml-1 cursor-pointer"
                title="Clear date filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main 2-Column Split: Bulletins Feed (8 Cols) | Interactive Event Calendar (4 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* News Bulletins & Events Feed */}
        <div className={showCalendar ? 'lg:col-span-8 space-y-4' : 'lg:col-span-12 space-y-4'}>
          {selectedDate && (
            <div className={`p-3.5 rounded-2xl flex items-center justify-between text-xs font-semibold border ${
              isDarkMode ? 'bg-blue-950/50 border-blue-800 text-blue-200' : 'bg-blue-50 border border-blue-200 text-blue-900'
            }`}>
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
                <span>
                  Showing announcements & events for:{' '}
                  <strong className="font-bold">
                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </strong>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-[11px] font-bold">
                  {filteredNews.length} record(s)
                </span>
              </div>
              <button
                onClick={() => setSelectedDate(null)}
                className="text-blue-600 dark:text-blue-400 hover:text-rose-500 font-bold flex items-center space-x-1 cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
                <span>Show All Dates</span>
              </button>
            </div>
          )}

          {loading ? (
            <div className={`rounded-2xl border p-12 text-center text-slate-500 ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="font-semibold text-sm">Loading official announcements & events...</p>
            </div>
          ) : filteredNews.length === 0 ? (
            <div className={`rounded-2xl border border-dashed p-12 text-center ${
              isDarkMode ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-white border-slate-300 text-slate-600'
            }`}>
              <Newspaper className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>No Bulletins or Events Found</h3>
              <p className="text-sm max-w-md mx-auto mt-1">
                {searchQuery || selectedCategory !== 'All' || filterEmergencyOnly || selectedDate
                  ? 'No announcements match your search criteria or selected calendar date.'
                  : 'There are no active bulletins yet. Click below to publish your first announcement or schedule an event.'}
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                {selectedDate && (
                  <button
                    onClick={() => setSelectedDate(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Clear Date Filter
                  </button>
                )}
                <button
                  onClick={() => handleOpenCreateModal('Public Advisory')}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Announcement</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {viewMode === 'table' ? (
                <div className={`rounded-2xl border overflow-hidden shadow-sm transition-colors ${
                  isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className={`uppercase tracking-wider font-semibold border-b ${
                        isDarkMode
                          ? 'bg-slate-800/60 text-slate-400 border-slate-800'
                          : 'bg-slate-50 text-slate-500 border-slate-200'
                      }`}>
                        <tr>
                          <th className="p-4">
                            <button
                              type="button"
                              onClick={() => handleSort('title')}
                              className="inline-flex items-center gap-1.5 font-semibold hover:text-blue-500 transition-colors uppercase tracking-wider cursor-pointer group select-none"
                            >
                              <span>Article / Headline</span>
                              {sortKey === 'title' ? (
                                sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-500" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-500" />
                              ) : (
                                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-60 group-hover:opacity-100" />
                              )}
                            </button>
                          </th>
                          <th className="p-4">
                            <button
                              type="button"
                              onClick={() => handleSort('category')}
                              className="inline-flex items-center gap-1.5 font-semibold hover:text-blue-500 transition-colors uppercase tracking-wider cursor-pointer group select-none"
                            >
                              <span>Category</span>
                              {sortKey === 'category' ? (
                                sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-500" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-500" />
                              ) : (
                                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-60 group-hover:opacity-100" />
                              )}
                            </button>
                          </th>
                          <th className="p-4">
                            <button
                              type="button"
                              onClick={() => handleSort('created_at')}
                              className="inline-flex items-center gap-1.5 font-semibold hover:text-blue-500 transition-colors uppercase tracking-wider cursor-pointer group select-none"
                            >
                              <span>Date / Schedule</span>
                              {sortKey === 'created_at' ? (
                                sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-500" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-500" />
                              ) : (
                                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-60 group-hover:opacity-100" />
                              )}
                            </button>
                          </th>
                          <th className="p-4">
                            <button
                              type="button"
                              onClick={() => handleSort('target_audience')}
                              className="inline-flex items-center gap-1.5 font-semibold hover:text-blue-500 transition-colors uppercase tracking-wider cursor-pointer group select-none"
                            >
                              <span>Audience</span>
                              {sortKey === 'target_audience' ? (
                                sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-500" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-500" />
                              ) : (
                                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-60 group-hover:opacity-100" />
                              )}
                            </button>
                          </th>
                          <th className="p-4">
                            <span>Resident Comments</span>
                          </th>
                          <th className="p-4">
                            <button
                              type="button"
                              onClick={() => handleSort('status')}
                              className="inline-flex items-center gap-1.5 font-semibold hover:text-blue-500 transition-colors uppercase tracking-wider cursor-pointer group select-none"
                            >
                              <span>Status</span>
                              {sortKey === 'status' ? (
                                sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-500" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-500" />
                              ) : (
                                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-60 group-hover:opacity-100" />
                              )}
                            </button>
                          </th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-200'}`}>
                        {paginatedNews.map((item) => {
                          const commentsCount = commentCounts[item.id] || 0;
                          return (
                            <tr
                              key={item.id}
                              className={`transition-colors ${
                                isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'
                              }`}
                            >
                              {/* Title & Preview */}
                              <td className="p-4">
                                <div className="flex items-center space-x-3 min-w-[220px]">
                                  <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700/50 flex items-center justify-center">
                                    {item.banner_url ? (
                                      <img
                                        src={item.banner_url}
                                        alt={item.title}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <Newspaper className="w-5 h-5 text-slate-400" />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center space-x-1.5 flex-wrap">
                                      <p className={`font-bold text-xs truncate max-w-xs ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                        {item.title}
                                      </p>
                                      {item.is_emergency && (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-rose-600 text-white">
                                          Emergency
                                        </span>
                                      )}
                                      {item.is_important && !item.is_emergency && (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-blue-600 text-white">
                                          Priority
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5">
                                      {item.description || item.content || 'Barangay announcement record'}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              {/* Category */}
                              <td className="p-4 whitespace-nowrap">
                                <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase ${
                                  item.category === 'Emergency' || item.is_emergency
                                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                                    : item.category === 'Events'
                                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800'
                                    : item.category === 'Government Services'
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                                    : item.category === 'Maintenance'
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                                }`}>
                                  {item.category || 'General'}
                                </span>
                              </td>

                              {/* Date / Schedule */}
                              <td className="p-4 whitespace-nowrap text-slate-500 dark:text-slate-400">
                                {item.event_date ? (
                                  <div className="flex items-center space-x-1.5 text-indigo-600 dark:text-indigo-400 font-semibold">
                                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                                    <span>{new Date(item.event_date).toLocaleDateString()}</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center space-x-1.5">
                                    <Clock className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                                    <span>{formatDate(item.created_at || new Date())}</span>
                                  </div>
                                )}
                              </td>

                              {/* Audience */}
                              <td className="p-4 whitespace-nowrap text-slate-600 dark:text-slate-300 capitalize">
                                {item.target_audience || 'All Residents'}
                              </td>

                              {/* Feedback / Comments */}
                              <td className="p-4 whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => handleOpenCommentsModal(item)}
                                  className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                                    commentsCount > 0
                                      ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 hover:bg-blue-100'
                                      : 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 hover:bg-slate-100'
                                  }`}
                                  title="View resident feedback"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span>{commentsCount} {commentsCount === 1 ? 'Comment' : 'Comments'}</span>
                                </button>
                              </td>

                              {/* Status */}
                              <td className="p-4 whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => handleTogglePublish(item)}
                                  className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
                                    item.is_published !== false
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-100'
                                      : 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 hover:bg-slate-200'
                                  }`}
                                  title="Click to toggle publish status"
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${item.is_published !== false ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                                  <span>{item.is_published !== false ? 'Published' : 'Draft'}</span>
                                </button>
                              </td>

                              {/* Actions */}
                              <td className="p-4 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end space-x-1">
                                  <button
                                    onClick={() => handleOpenPreview(item)}
                                    className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer"
                                    title="Preview Bulletin"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleOpenEditModal(item)}
                                    className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-colors cursor-pointer"
                                    title="Edit Bulletin"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handlePromptDeleteNews(item)}
                                    className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                                    title="Delete Bulletin"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className={`grid gap-6 ${showCalendar ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'}`}>
                  {paginatedNews.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-2xl border transition-all duration-200 flex flex-col overflow-hidden shadow-sm hover:shadow-md ${
                    item.is_emergency
                      ? 'border-rose-300 ring-2 ring-rose-500/20'
                      : item.category === 'Events' || item.event_date
                      ? isDarkMode ? 'border-indigo-900/60 bg-slate-900' : 'border-indigo-200 bg-white hover:border-indigo-400'
                      : item.is_important
                      ? isDarkMode ? 'border-blue-900/60 bg-slate-900' : 'border-blue-300 ring-2 ring-blue-500/10 bg-white'
                      : isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
                  }`}
                >
                  {/* Banner Image */}
                  {item.banner_url ? (
                    <div className="relative h-44 bg-slate-800 overflow-hidden group">
                      <img
                        src={item.banner_url}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />

                      {/* Category Badges */}
                      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-md shadow-sm ${
                            item.category === 'Emergency' || item.is_emergency
                              ? 'bg-rose-700 text-white border border-rose-500'
                              : item.category === 'Events'
                              ? 'bg-indigo-600 text-white border border-indigo-400'
                              : 'bg-blue-600 text-white border border-blue-400'
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
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1 ${
                          item.is_published !== false
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
                          <span>
                            {item.event_date
                              ? formatDate(item.event_date)
                              : item.date || (item.created_at ? formatDate(item.created_at) : 'Official Notice')}
                          </span>
                        </span>
                        {item.location && (
                          <span className="flex items-center space-x-1 text-slate-300 truncate max-w-[150px]">
                            <MapPin className="w-3.5 h-3.5 text-rose-300 shrink-0" />
                            <span className="truncate">{item.location}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className={`p-3.5 border-b flex items-center justify-between gap-2 ${
                      isDarkMode ? 'border-slate-800' : 'border-slate-100'
                    }`}>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-md shadow-xs ${
                            item.category === 'Emergency' || item.is_emergency
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : item.category === 'Events'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {item.category}
                        </span>
                        {item.is_emergency && (
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-rose-600 text-white flex items-center space-x-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>URGENT</span>
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1 ${
                          item.is_published !== false
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${item.is_published !== false ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        <span>{item.is_published !== false ? 'LIVE' : 'DRAFT'}</span>
                      </span>
                    </div>
                  )}

                  {/* Card Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-2">
                      {/* Prominent Event Schedule Tag if date present */}
                      {(item.event_date || item.scheduled_date) && (
                        <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold">
                          <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>Event / Scheduled Date: {formatDate(item.event_date || item.scheduled_date)}</span>
                        </div>
                      )}

                      <h3 className={`font-bold text-base line-clamp-2 hover:text-blue-500 transition-colors ${
                        isDarkMode ? 'text-white' : 'text-slate-900'
                      }`}>
                        {item.title}
                      </h3>
                      <p className={`text-xs line-clamp-3 leading-relaxed ${
                        isDarkMode ? 'text-slate-400' : 'text-slate-600'
                      }`}>
                        {item.description}
                      </p>
                    </div>

                    {/* Author & Footer Meta */}
                    <div className={`pt-3 border-t flex items-center justify-between text-xs ${
                      isDarkMode ? 'border-slate-800 text-slate-500' : 'border-slate-100 text-slate-500'
                    }`}>
                      <div className="flex items-center space-x-1.5 truncate max-w-[170px]">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate font-medium">{item.author || 'Super Admin'}</span>
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleOpenCommentsModal(item)}
                          className="relative p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Resident Inquiries & Official Replies"
                        >
                          <MessageSquare className="w-4 h-4" />
                          {(commentCounts[item.id] || 0) > 0 && (
                            <span className="absolute -top-1 -right-1.5 bg-blue-600 text-white text-[9px] font-extrabold rounded-full px-1 min-w-[16px] h-4 flex items-center justify-center shadow-xs">
                              {commentCounts[item.id]}
                            </span>
                          )}
                        </button>
                        <button
                          onClick={() => handleOpenPreview(item)}
                          className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="Preview full article"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="Edit announcement"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleTogglePublish(item)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            item.is_published !== false
                              ? 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                          title={item.is_published !== false ? 'Live (Click to Unpublish)' : 'Draft (Click to Publish)'}
                        >
                          <Radio className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handlePromptDeleteNews(item)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                          title="Delete announcement"
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

              {/* Document Requests Consistent Pagination Footer */}
              <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs transition-colors ${
                isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-600'
              }`}>
                <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-start">
                  <span className="font-medium">
                    Showing <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{startIndex}</span> to{' '}
                    <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{endIndex}</span> of{' '}
                    <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{totalEntries}</span> entries
                  </span>

                  <div className="flex items-center space-x-1.5 text-xs">
                    <span className="hidden md:inline text-slate-500">Rows per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className={`px-2 py-1 text-xs border rounded-md font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors ${
                        isDarkMode
                          ? 'bg-slate-800 border-slate-700 text-white'
                          : 'bg-white border-slate-300 text-slate-800'
                      }`}
                    >
                      {[10, 25, 50].map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(1)}
                    disabled={safeCurrentPage === 1}
                    className={`p-1.5 rounded-lg border disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors ${
                      isDarkMode
                        ? 'border-slate-800 hover:bg-slate-800 text-slate-300'
                        : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                    }`}
                    title="First page"
                  >
                    <ChevronsLeft className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safeCurrentPage === 1}
                    className={`p-1.5 rounded-lg border disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors ${
                      isDarkMode
                        ? 'border-slate-800 hover:bg-slate-800 text-slate-300'
                        : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                    }`}
                    title="Previous page"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center space-x-1">
                    {getPageNumbers().map((num, i) =>
                      num === '...' ? (
                        <span key={`dots-${i}`} className="px-2 py-1 text-slate-400">
                          …
                        </span>
                      ) : (
                        <button
                          key={`page-${num}`}
                          type="button"
                          onClick={() => setCurrentPage(num)}
                          className={`min-w-[28px] h-7 px-2 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                            safeCurrentPage === num
                              ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                              : isDarkMode
                              ? 'border-slate-800 hover:bg-slate-800 text-slate-300'
                              : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          {num}
                        </button>
                      )
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safeCurrentPage === totalPages}
                    className={`p-1.5 rounded-lg border disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors ${
                      isDarkMode
                        ? 'border-slate-800 hover:bg-slate-800 text-slate-300'
                        : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                    }`}
                    title="Next page"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={safeCurrentPage === totalPages}
                    className={`p-1.5 rounded-lg border disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors ${
                      isDarkMode
                        ? 'border-slate-800 hover:bg-slate-800 text-slate-300'
                        : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                    }`}
                    title="Last page"
                  >
                    <ChevronsRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Side Event & Bulletin Calendar (4 Cols) */}
        {showCalendar && (
          <div className="lg:col-span-4 space-y-6">
            {/* Event Calendar Widget */}
            <EventCalendar
              events={calendarItems}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              isDarkMode={isDarkMode}
            />

            {/* Upcoming Schedules Card */}
            <div className={`p-5 rounded-2xl border shadow-xs space-y-4 transition-colors ${
              isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className={`flex items-center justify-between border-b pb-3 ${
                isDarkMode ? 'border-slate-800' : 'border-slate-100'
              }`}>
                <div className="flex items-center space-x-2">
                  <CalendarDays className="w-4 h-4 text-blue-500" />
                  <h4 className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Upcoming Schedules</h4>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                  {upcomingItems.length} active
                </span>
              </div>

              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {upcomingItems.length > 0 ? (
                  upcomingItems.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => {
                        const dateStr = u.event_date || u.created_at;
                        if (dateStr) {
                          const d = new Date(dateStr);
                          const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                          setSelectedDate(k);
                        }
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer group ${
                        isDarkMode
                          ? 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 hover:border-blue-500'
                          : 'bg-slate-50 hover:bg-blue-50 border-slate-100 hover:border-blue-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-bold text-blue-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-blue-500" />
                          {formatDate(u.event_date || u.created_at)}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                          isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-white border border-slate-200 text-slate-600'
                        }`}>
                          {u.category}
                        </span>
                      </div>
                      <h5 className={`font-bold text-xs truncate group-hover:text-blue-400 ${
                        isDarkMode ? 'text-slate-200' : 'text-slate-800'
                      }`}>
                        {u.title}
                      </h5>
                      {u.location && (
                        <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-1 truncate">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{u.location}</span>
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-slate-400 space-y-1">
                    <Calendar className="w-8 h-8 text-slate-500 mx-auto" />
                    <p className="text-xs font-semibold">No upcoming events scheduled</p>
                    <p className="text-[11px]">Set an event date when publishing to populate this schedule.</p>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleOpenCreateModal('Events')}
                className="w-full py-2 px-3 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Schedule New Barangay Event</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Form Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingItem ? 'Edit Official Announcement / Event' : 'Publish Official Bulletin / Event'}
        darkMode={isDarkMode}
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span className="font-semibold">{formError}</span>
            </div>
          )}

          {/* AI Civic Bulletin Assistant & Public Advisory Synthesizer Toolbar */}
          <div className={`p-3.5 border rounded-xl space-y-2.5 ${
            isDarkMode
              ? 'bg-gradient-to-r from-blue-950/60 via-indigo-950/60 to-slate-900 border-blue-800/60'
              : 'bg-gradient-to-r from-blue-50 via-indigo-50 to-emerald-50 border-blue-200'
          }`}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-blue-500" />
                <span className={`font-bold text-xs ${isDarkMode ? 'text-blue-300' : 'text-slate-900'}`}>
                  AI Assistant: LGU Bulletin Templates & Localization
                </span>
              </div>

              {/* Quick Translation / Localization Bar */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`text-[10px] font-bold uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Translate:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const res = translateCivicAnnouncement({
                      title: formData.title,
                      description: formData.description,
                      content: formData.content,
                      targetLanguage: 'cebuano',
                    });
                    setFormData((prev) => ({
                      ...prev,
                      title: res.title,
                      description: res.description,
                      content: res.content,
                    }));
                  }}
                  className={`px-2 py-1 text-[11px] font-bold border rounded-lg cursor-pointer transition-colors ${
                    isDarkMode
                      ? 'bg-slate-800 text-blue-300 border-blue-700/60 hover:bg-slate-700'
                      : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'
                  }`}
                  title="Translate into Cebuano / Bisaya dialect"
                >
                  🇵🇭 Bisaya
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const res = translateCivicAnnouncement({
                      title: formData.title,
                      description: formData.description,
                      content: formData.content,
                      targetLanguage: 'tagalog',
                    });
                    setFormData((prev) => ({
                      ...prev,
                      title: res.title,
                      description: res.description,
                      content: res.content,
                    }));
                  }}
                  className={`px-2 py-1 text-[11px] font-bold border rounded-lg cursor-pointer transition-colors ${
                    isDarkMode
                      ? 'bg-slate-800 text-indigo-300 border-indigo-700/60 hover:bg-slate-700'
                      : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'
                  }`}
                  title="Translate into Tagalog"
                >
                  Tagalog
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const res = translateCivicAnnouncement({
                      title: formData.title,
                      description: formData.description,
                      content: formData.content,
                      targetLanguage: 'english',
                    });
                    setFormData((prev) => ({
                      ...prev,
                      title: res.title,
                      description: res.description,
                      content: res.content,
                    }));
                  }}
                  className={`px-2 py-1 text-[11px] font-bold border rounded-lg cursor-pointer transition-colors ${
                    isDarkMode
                      ? 'bg-slate-800 text-emerald-300 border-emerald-700/60 hover:bg-slate-700'
                      : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                  }`}
                  title="Format as formal English advisory"
                >
                  English
                </button>
              </div>
            </div>

            {/* LGU Bulletin Quick Templates */}
            <div className={`flex items-center gap-1.5 flex-wrap pt-1 border-t ${
              isDarkMode ? 'border-slate-800' : 'border-blue-100/70'
            }`}>
              <span className={`text-[10px] font-bold uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Smart Templates:
              </span>
              {CIVIC_ANNOUNCEMENT_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      title: tmpl.title,
                      category: tmpl.category,
                      description: tmpl.description,
                      content: tmpl.content,
                    }));
                  }}
                  className={`px-2 py-0.5 text-[11px] font-semibold border rounded-md cursor-pointer transition-colors ${
                    isDarkMode
                      ? 'bg-slate-800 text-slate-200 border-slate-700 hover:border-blue-500 hover:text-white'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400'
                  }`}
                >
                  {tmpl.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={`block text-xs font-bold mb-1 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
              Announcement Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Barangay General Assembly & Medical Mission"
              className={`w-full px-3 py-2 text-xs rounded-xl focus:ring-2 focus:ring-blue-500 ${
                isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'border border-slate-300 bg-white'
              }`}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs font-bold mb-1 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className={`w-full px-3 py-2 text-xs rounded-xl focus:ring-2 focus:ring-blue-500 ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'border border-slate-300 bg-white'
                }`}
              >
                {CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={`block text-xs font-bold mb-1 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                Event / Scheduled Date (Calendar)
              </label>
              <input
                type="datetime-local"
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                className={`w-full px-3 py-2 text-xs rounded-xl focus:ring-2 focus:ring-blue-500 ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'border border-slate-300 bg-white'
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs font-bold mb-1 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Location / Venue</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. Barangay Zapatera Gymnasium"
                className={`w-full px-3 py-2 text-xs rounded-xl focus:ring-2 focus:ring-blue-500 ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'border border-slate-300 bg-white'
                }`}
              />
            </div>

            <div>
              <label className={`block text-xs font-bold mb-1 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Target Audience</label>
              <select
                value={formData.target_audience}
                onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                className={`w-full px-3 py-2 text-xs rounded-xl focus:ring-2 focus:ring-blue-500 ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'border border-slate-300 bg-white'
                }`}
              >
                <option value="residents">All Residents</option>
                <option value="youth">Youth & Students</option>
                <option value="seniors">Senior Citizens</option>
                <option value="pwds">Persons with Disabilities (PWD)</option>
              </select>
            </div>
          </div>

          {/* Posting Duration & Expiry Config */}
          <div className={`p-3 rounded-xl border space-y-2 ${
            isDarkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-blue-50/50 border-blue-100'
          }`}>
            <div className="flex items-center justify-between">
              <label className={`text-xs font-bold flex items-center gap-1.5 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                <span>Posting Duration (Auto-Delete / Archive)</span>
              </label>
              <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                {Number(formData.duration_days) > 0 ? `Auto-archives in ${formData.duration_days} days` : 'Permanent (No Expiry)'}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
              {[
                { label: '3 Days', value: 3 },
                { label: '7 Days', value: 7 },
                { label: '14 Days', value: 14 },
                { label: '30 Days', value: 30 },
                { label: '60 Days', value: 60 },
                { label: 'Permanent', value: 0 },
                { label: '📅 Custom Date', value: 'custom' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    if (opt.value === 'custom') {
                      setFormData({ ...formData, duration_days: 'custom' });
                    } else {
                      const days = opt.value;
                      const exp = days > 0 ? new Date(Date.now() + days * 86400000).toISOString() : null;
                      setFormData({ ...formData, duration_days: days, expires_at: exp });
                    }
                  }}
                  className={`py-1.5 px-2 text-[11px] font-bold rounded-lg border transition-all cursor-pointer text-center ${
                    formData.duration_days === opt.value || (opt.value === 'custom' && formData.duration_days === 'custom')
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : isDarkMode
                      ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {formData.duration_days === 'custom' && (
              <div className={`mt-2.5 p-3 rounded-xl border space-y-1.5 animate-in fade-in duration-200 ${
                isDarkMode ? 'bg-slate-800/80 border-blue-900/50' : 'bg-blue-50/70 border-blue-200'
              }`}>
                <label className="block text-xs font-bold text-blue-600 dark:text-blue-400">
                  Select Expiration Date & Time (Philippine Time):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="datetime-local"
                    value={getPhilippineDateTimeLocal(formData.expires_at)}
                    min={getPhilippineDateTimeLocal(new Date())}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({
                        ...formData,
                        duration_days: 'custom',
                        expires_at: fromPhilippineDateTimeLocal(val),
                      });
                    }}
                    className={`flex-1 px-3 py-2 text-xs rounded-lg border font-mono ${
                      isDarkMode
                        ? 'bg-slate-900 border-slate-700 text-white focus:ring-blue-500'
                        : 'bg-white border-blue-300 text-slate-900 focus:ring-blue-500'
                    }`}
                  />
                  {formData.expires_at && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, expires_at: null, duration_days: 0 })}
                      className="px-2.5 py-2 text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-lg cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-blue-600 dark:text-blue-400">
                  Calculated based on Philippine Standard Time (UTC+8). The announcement will automatically move to Archive & Trash when the duration ends.
                </p>
              </div>
            )}
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              When the duration ends or the set date arrives, this announcement will automatically move to Archive & Trash.
            </p>
          </div>

          <div>
            <label className={`block text-xs font-bold mb-1 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
              Short Summary / Highlight <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief 1-2 sentence preview for cards and notifications..."
              className={`w-full px-3 py-2 text-xs rounded-xl focus:ring-2 focus:ring-blue-500 ${
                isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'border border-slate-300 bg-white'
              }`}
            />
          </div>

          <div>
            <label className={`block text-xs font-bold mb-1 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
              Full Announcement Content <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Provide complete guidelines, instructions, requirements, or schedule details..."
              className={`w-full px-3 py-2 text-xs rounded-xl focus:ring-2 focus:ring-blue-500 ${
                isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'border border-slate-300 bg-white'
              }`}
            />
          </div>

          {/* Banner Image Input & Upload */}
          <div>
            <label className={`block text-xs font-bold mb-1 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Banner Image URL or Upload</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={formData.banner_url}
                onChange={(e) => setFormData({ ...formData, banner_url: e.target.value })}
                placeholder="Enter image URL or upload below (optional)..."
                className={`flex-1 px-3 py-2 text-xs rounded-xl focus:ring-2 focus:ring-blue-500 ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'border border-slate-300 bg-white'
                }`}
              />
              <label className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>{isUploading ? 'Uploading...' : 'Upload'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
            </div>
          </div>

          {/* Flags & Published Toggle */}
          <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl border ${
            isDarkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
          }`}>
            <label className={`flex items-center space-x-2 text-xs font-semibold cursor-pointer ${
              isDarkMode ? 'text-slate-300' : 'text-slate-700'
            }`}>
              <input
                type="checkbox"
                checked={formData.is_important}
                onChange={(e) => setFormData({ ...formData, is_important: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <span>Important Notice</span>
            </label>

            <label className="flex items-center space-x-2 text-xs font-semibold text-rose-500 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_emergency}
                onChange={(e) => setFormData({ ...formData, is_emergency: e.target.checked })}
                className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
              />
              <span>Emergency Alert</span>
            </label>

            <label className="flex items-center space-x-2 text-xs font-semibold text-emerald-500 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_published}
                onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <span>Live in Portal</span>
            </label>
          </div>

          <div className={`pt-3 border-t flex items-center justify-end space-x-2 ${
            isDarkMode ? 'border-slate-800' : 'border-slate-100'
          }`}>
            <button
              type="button"
              onClick={() => setIsFormModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Publishing...' : editingItem ? 'Save Changes' : 'Publish Bulletin'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Full Article Preview Modal */}
      {previewItem && (
        <Modal
          isOpen={isPreviewModalOpen}
          onClose={() => setIsPreviewModalOpen(false)}
          title={previewItem.title}
          darkMode={isDarkMode}
        >
          <div className="space-y-4 text-xs">
            {previewItem.banner_url && (
              <div className="w-full h-52 rounded-xl overflow-hidden bg-slate-800">
                <img
                  src={previewItem.banner_url}
                  alt={previewItem.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className={`flex flex-wrap items-center justify-between gap-2 border-b pb-3 ${
              isDarkMode ? 'border-slate-800' : 'border-slate-100'
            }`}>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                  {previewItem.category}
                </span>
                {previewItem.is_emergency && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-600 text-white">
                    Emergency Alert
                  </span>
                )}
              </div>

              <div className="text-slate-400 font-medium">
                {previewItem.event_date ? (
                  <span className="text-indigo-400 font-bold flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Event: {formatDate(previewItem.event_date)}
                  </span>
                ) : (
                  <span>Published {formatDate(previewItem.created_at)}</span>
                )}
              </div>
            </div>

            {previewItem.location && (
              <div className={`flex items-center space-x-1.5 font-semibold ${
                isDarkMode ? 'text-slate-300' : 'text-slate-700'
              }`}>
                <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                <span>Venue: {previewItem.location}</span>
              </div>
            )}

            <div className={`p-3 rounded-xl border font-medium leading-relaxed ${
              isDarkMode ? 'bg-slate-800/80 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}>
              {previewItem.description}
            </div>

            <div className={`text-xs leading-relaxed whitespace-pre-line ${
              isDarkMode ? 'text-slate-300' : 'text-slate-800'
            }`}>
              {previewItem.content}
            </div>

            <div className={`pt-3 border-t flex items-center justify-between text-slate-400 ${
              isDarkMode ? 'border-slate-800' : 'border-slate-100'
            }`}>
              <span>Author: <strong className={isDarkMode ? 'text-white' : 'text-slate-700'}>{previewItem.author || 'Super Admin'}</strong></span>
              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(false)}
                className={`px-4 py-1.5 font-bold text-xs rounded-xl cursor-pointer ${
                  isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Close Preview
              </button>
            </div>
          </div>
        </Modal>
      )}

            {/* Resident Comments & Official Barangay Replies Modal */}
      {selectedNewsForComments && (
        <Modal
          isOpen={!!selectedNewsForComments}
          onClose={() => {
            setSelectedNewsForComments(null);
            setReplyingToComment(null);
            setAdminReplyText('');
          }}
          title="Resident Inquiries & Official Barangay Replies"
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4 max-h-[75vh] flex flex-col">
            {/* Bulletin Reference Header */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                  {selectedNewsForComments.category}
                </span>
                <span className="text-xs text-slate-500">{formatDate(selectedNewsForComments.created_at)}</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{selectedNewsForComments.title}</h4>
              <p className="text-xs text-slate-600 line-clamp-2">{selectedNewsForComments.description}</p>
            </div>

            {/* Comment Thread List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-[160px] max-h-[380px]">
              {loadingComments ? (
                <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Loading resident comments...</span>
                </div>
              ) : bulletinComments.length === 0 ? (
                <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 p-6">
                  <MessageSquare className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">No resident inquiries or comments yet</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    When residents post questions or feedback from their portal, they will appear here in real time.
                  </p>
                </div>
              ) : (
                bulletinComments
                  .filter((c) => !c.parent_id)
                  .map((rootComment) => {
                    const replies = bulletinComments.filter((c) => c.parent_id === rootComment.id);
                    const isRootOfficial = rootComment.is_official_response || rootComment.author_role === 'admin' || rootComment.author_role === 'super_admin';

                    return (
                      <div key={rootComment.id} className="space-y-2">
                        {/* Root Comment Box */}
                        <div className={`p-3.5 rounded-xl border ${isRootOfficial ? 'bg-blue-50/70 border-blue-200' : 'bg-white border-slate-200'} shadow-2xs`}>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-2">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${isRootOfficial ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                                {isRootOfficial ? <ShieldCheck className="w-4 h-4" /> : rootComment.author_name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center space-x-1.5">
                                  <span className="text-xs font-bold text-slate-900">{rootComment.author_name}</span>
                                  {isRootOfficial && (
                                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-600 text-white">
                                      Official Response
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400">{formatDate(rootComment.created_at)}</span>
                              </div>
                            </div>

                            <div className="flex items-center space-x-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setReplyingToComment(rootComment);
                                }}
                                className="px-2 py-1 text-[11px] font-bold text-blue-600 hover:bg-blue-100 rounded-lg flex items-center space-x-1 transition-colors cursor-pointer"
                              >
                                <Reply className="w-3 h-3" />
                                <span>Reply</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteComment(rootComment.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete comment"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <p className="text-xs text-slate-700 mt-2 leading-relaxed whitespace-pre-wrap">{rootComment.content}</p>
                        </div>

                        {/* Nested Replies */}
                        {replies.map((reply) => {
                          const isReplyOfficial = reply.is_official_response || reply.author_role === 'admin' || reply.author_role === 'super_admin';

                          return (
                            <div key={reply.id} className="flex items-start space-x-2 pl-6">
                              <CornerDownRight className="w-4 h-4 text-slate-400 mt-2 shrink-0" />
                              <div className={`flex-1 p-3 rounded-xl border ${isReplyOfficial ? 'bg-blue-50/90 border-blue-300' : 'bg-white border-slate-200'} shadow-2xs`}>
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center space-x-2">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${isReplyOfficial ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                                      {isReplyOfficial ? <ShieldCheck className="w-3.5 h-3.5" /> : reply.author_name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <div className="flex items-center space-x-1.5">
                                        <span className="text-xs font-bold text-slate-900">{reply.author_name}</span>
                                        {isReplyOfficial && (
                                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-600 text-white">
                                            Official Response
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[10px] text-slate-400">{formatDate(reply.created_at)}</span>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteComment(reply.id)}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                    title="Delete reply"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                {reply.reply_to_name && (
                                  <p className="text-[10px] text-slate-500 mt-1">
                                    Replying to <span className="font-bold text-blue-600">@{reply.reply_to_name}</span>
                                  </p>
                                )}

                                <p className="text-xs text-slate-700 mt-1.5 leading-relaxed whitespace-pre-wrap">{reply.content}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })
              )}
            </div>

            {/* Admin Response Composer */}
            <form onSubmit={handleSendAdminReply} className="pt-3 border-t border-slate-200 space-y-2">
              {replyingToComment && (
                <div className="flex items-center justify-between bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg text-xs text-blue-800">
                  <div className="flex items-center space-x-1.5">
                    <CornerDownRight className="w-3.5 h-3.5 text-blue-600" />
                    <span>Replying to <strong className="font-bold">@{replyingToComment.author_name}</strong></span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyingToComment(null)}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder={replyingToComment ? `Type official reply to @${replyingToComment.author_name}...` : 'Write an official barangay remark or public notice...'}
                  value={adminReplyText}
                  onChange={(e) => setAdminReplyText(e.target.value)}
                  className="flex-1 text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900"
                />
                <button
                  type="submit"
                  disabled={!adminReplyText.trim() || submittingReply}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  {submittingReply ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>{replyingToComment ? 'Send Reply' : 'Post Remark'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Confirmation & Alert Feedback Modal */}
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
