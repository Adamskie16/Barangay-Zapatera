import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Modal,
  ActivityIndicator,
} from 'react-native';
import {
  Search,
  Megaphone,
  AlertTriangle,
  Calendar,
  MapPin,
  User,
  X,
  ArrowRight,
  Info,
  MessageSquare,
  Send,
  CornerDownRight,
  ShieldCheck,
  Trash2,
  Reply,
  Lock,
  Sparkles,
  Wrench,
  Users,
  Bell,
  Bot,
  ShieldAlert,
  Cpu,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import { BarangayAnnouncement, AnnouncementCategory, ResidentUser } from '../../types';
import {
  BulletinComment,
  getBulletinComments,
  getBulletinCommentCounts,
  postBulletinComment,
  subscribeToBulletinComments,
  deleteBulletinComment,
} from '../../core/commentService';
import ActionModal from '../../components/ActionModal';
import GlobalFooter from '../../components/GlobalFooter';
import { checkContentModeration, ModerationResult } from '../../core/contentModerationService';
import { ensureInterFontLoaded } from '../../core/fontSetup';

interface AnnouncementsViewProps {
  announcements: BarangayAnnouncement[];
  selectedAnnouncement?: BarangayAnnouncement | null;
  onCloseAnnouncementModal?: () => void;
  currentUser?: ResidentUser | null;
}

const CATEGORIES: ('All' | AnnouncementCategory)[] = [
  'All',
  'Emergency',
  'Public Advisory',
  'Government Services',
  'Community',
  'Events',
  'Maintenance',
];

const BULLETIN_CATEGORY_STORAGE_KEY = 'zapatera_resident_bulletins_category';

export default function AnnouncementsView({
  announcements,
  selectedAnnouncement: initialSelected,
  onCloseAnnouncementModal,
  currentUser,
}: AnnouncementsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem(BULLETIN_CATEGORY_STORAGE_KEY);
        if (saved && CATEGORIES.includes(saved as any)) {
          return saved;
        }
      }
    } catch {}
    return 'All';
  });
  const [activeModalItem, setActiveModalItem] = useState<BarangayAnnouncement | null>(
    initialSelected || null
  );

  const handleSelectCategory = (cat: string) => {
    setSelectedCategory(cat);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(BULLETIN_CATEGORY_STORAGE_KEY, cat);
      }
    } catch {}
  };

  useEffect(() => {
    ensureInterFontLoaded();
  }, []);

  // Comments state
  const [comments, setComments] = useState<BulletinComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState<BulletinComment | null>(null);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [commentModerationError, setCommentModerationError] = useState('');
  const [aiModerationResult, setAiModerationResult] = useState<ModerationResult | null>(null);
  const [isAiScanning, setIsAiScanning] = useState(false);
  const [aiCleanSuccessToast, setAiCleanSuccessToast] = useState(false);

  const commentInputRef = useRef<any>(null);

  // Deduplicate announcements list once for consistent metrics and filtering
  const uniqueAnnouncements = useMemo(() => {
    const seen = new Set<string>();
    return announcements.filter((ann) => {
      if (!ann || !ann.id) return false;
      if (seen.has(ann.id)) return false;
      seen.add(ann.id);
      return true;
    });
  }, [announcements]);

  // Load counts for all announcements
  useEffect(() => {
    let isMounted = true;
    const loadAllCounts = async () => {
      try {
        const counts = await getBulletinCommentCounts(uniqueAnnouncements.map((a) => a.id));
        if (isMounted) setCommentCounts(counts);
      } catch {}
    };
    if (uniqueAnnouncements.length > 0) {
      loadAllCounts();
    }
    return () => {
      isMounted = false;
    };
  }, [uniqueAnnouncements]);

  useEffect(() => {
    if (initialSelected) {
      setActiveModalItem(initialSelected);
    }
  }, [initialSelected]);

  // Load and subscribe to real-time comments when an announcement modal is open
  useEffect(() => {
    if (!activeModalItem) {
      setComments([]);
      setReplyingTo(null);
      setCommentInput('');
      return;
    }

    let isMounted = true;
    setLoadingComments(true);

    const fetchCurrentComments = async () => {
      try {
        const data = await getBulletinComments(activeModalItem.id);
        if (isMounted) {
          setComments(data);
          setLoadingComments(false);
          setCommentCounts((prev) => ({ ...prev, [activeModalItem.id]: data.length }));
        }
      } catch {
        if (isMounted) setLoadingComments(false);
      }
    };

    fetchCurrentComments();

    const unsubscribe = subscribeToBulletinComments(activeModalItem.id, () => {
      fetchCurrentComments();
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [activeModalItem]);

  const handleCloseModal = () => {
    setActiveModalItem(null);
    setReplyingTo(null);
    setCommentInput('');
    setCommentModerationError('');
    setAiModerationResult(null);
    setIsAiScanning(false);
    setAiCleanSuccessToast(false);
    onCloseAnnouncementModal?.();
  };

  const handleAutoCleanWithAi = () => {
    if (!aiModerationResult?.sanitizedText) return;
    setCommentInput(aiModerationResult.sanitizedText);
    setAiModerationResult(null);
    setCommentModerationError('');
    setAiCleanSuccessToast(true);
    setTimeout(() => {
      setAiCleanSuccessToast(false);
    }, 4000);
  };

  const handlePostComment = async () => {
    if (!commentInput.trim() || !activeModalItem || isSubmittingComment || isAiScanning) return;

    if (!currentUser) {
      alert('Please sign in to post a comment or inquiry on this announcement.');
      return;
    }

    // Run AI Content Moderation & Foul Language Sentinel Scan
    setIsAiScanning(true);
    await new Promise((r) => setTimeout(r, 320));
    const modResult = checkContentModeration(commentInput.trim());
    setIsAiScanning(false);

    if (!modResult.isClean) {
      setAiModerationResult(modResult);
      setCommentModerationError(modResult.warningMessage);
      return;
    }
    setAiModerationResult(null);
    setCommentModerationError('');

    setIsSubmittingComment(true);
    try {
      const authorRole: 'resident' | 'admin' | 'super_admin' =
        currentUser.role === 'admin' || currentUser.role === 'super_admin'
          ? currentUser.role
          : 'resident';

      const newCm = await postBulletinComment({
        news_id: activeModalItem.id,
        author_id: currentUser.id,
        author_name: currentUser.full_name || 'Resident',
        author_role: authorRole,
        author_avatar: currentUser.avatar_url,
        content: commentInput.trim(),
        parent_id: replyingTo ? replyingTo.id : null,
        reply_to_name: replyingTo ? replyingTo.author_name : null,
        is_official_response: authorRole !== 'resident',
      });

      setComments((prev) => {
        if (prev.some((c) => c.id === newCm.id)) return prev;
        return [...prev, newCm];
      });

      setCommentCounts((prev) => ({
        ...prev,
        [activeModalItem.id]: (prev[activeModalItem.id] || 0) + 1,
      }));

      setCommentInput('');
      setReplyingTo(null);
    } catch (err) {
      console.error('Failed to post comment:', err);
      alert('Could not submit comment. Please check your connection and try again.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Delete Comment Confirmation Modal State
  const [commentToDelete, setCommentToDelete] = useState<BulletinComment | null>(null);
  const [isDeletingComment, setIsDeletingComment] = useState(false);

  const promptDeleteComment = (comment: BulletinComment) => {
    setCommentToDelete(comment);
  };

  const handleConfirmDeleteComment = async () => {
    if (!commentToDelete || !activeModalItem || isDeletingComment) return;
    setIsDeletingComment(true);
    try {
      await deleteBulletinComment(commentToDelete.id, activeModalItem.id);
      setComments((prev) =>
        prev.filter((c) => c.id !== commentToDelete.id && c.parent_id !== commentToDelete.id)
      );
      setCommentCounts((prev) => ({
        ...prev,
        [activeModalItem.id]: Math.max(0, (prev[activeModalItem.id] || 1) - 1),
      }));
      setCommentToDelete(null);
    } catch (err) {
      console.error('Failed to delete comment:', err);
    } finally {
      setIsDeletingComment(false);
    }
  };

  // Category Counts & Summary Metrics
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: uniqueAnnouncements.length };
    CATEGORIES.forEach((cat) => {
      if (cat !== 'All') {
        counts[cat] = uniqueAnnouncements.filter((a) => {
          if (cat === 'Emergency') {
            return a.is_emergency || (a.category && a.category.toLowerCase() === 'emergency');
          }
          return a.category && a.category.toLowerCase() === cat.toLowerCase();
        }).length;
      }
    });
    return counts;
  }, [uniqueAnnouncements]);

  const emergencyCount = useMemo(
    () =>
      uniqueAnnouncements.filter((a) => a.is_emergency || (a.category && a.category.toLowerCase() === 'emergency')).length,
    [uniqueAnnouncements]
  );

  const totalCommentsCount = useMemo(
    () => Object.values(commentCounts).reduce((sum, n) => sum + (n || 0), 0),
    [commentCounts]
  );

  const filteredAnnouncements = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return uniqueAnnouncements.filter((ann) => {
      const title = (ann.title || '').toLowerCase();
      const desc = (ann.description || '').toLowerCase();
      const content = (ann.content || '').toLowerCase();
      const loc = (ann.location || '').toLowerCase();

      const matchesSearch =
        !q || title.includes(q) || desc.includes(q) || content.includes(q) || loc.includes(q);
      const matchesCategory =
        selectedCategory === 'All' ||
        (selectedCategory === 'Emergency'
          ? (ann.is_emergency || (ann.category && ann.category.toLowerCase() === 'emergency'))
          : (ann.category && ann.category.toLowerCase() === selectedCategory.toLowerCase()));

      return matchesSearch && matchesCategory;
    });
  }, [uniqueAnnouncements, searchQuery, selectedCategory]);

  // Group comments into root comments and their replies
  const rootComments = comments.filter((c) => !c.parent_id);
  const repliesByParent = comments.reduce((acc, c) => {
    if (c.parent_id) {
      acc[c.parent_id] = acc[c.parent_id] || [];
      acc[c.parent_id].push(c);
    }
    return acc;
  }, {} as Record<string, BulletinComment[]>);

  const formatCommentTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return 'Recent';
    }
  };

  const getBulletinVisual = (item: BarangayAnnouncement) => {
    if (item.is_emergency || item.category === 'Emergency') {
      return {
        icon: <AlertTriangle size={20} color="#dc2626" />,
        bg: '#fef2f2',
        border: '#fecaca',
        badgeBg: '#fee2e2',
        badgeText: '#b91c1c',
      };
    }
    if (item.category === 'Events') {
      return {
        icon: <Calendar size={20} color="#7c3aed" />,
        bg: '#f5f3ff',
        border: '#ddd6fe',
        badgeBg: '#ede9fe',
        badgeText: '#6d28d9',
      };
    }
    if (item.category === 'Government Services') {
      return {
        icon: <ShieldCheck size={20} color="#059669" />,
        bg: '#ecfdf5',
        border: '#a7f3d0',
        badgeBg: '#d1fae5',
        badgeText: '#047857',
      };
    }
    if (item.category === 'Maintenance') {
      return {
        icon: <Wrench size={20} color="#d97706" />,
        bg: '#fffbeb',
        border: '#fde68a',
        badgeBg: '#fef3c7',
        badgeText: '#b45309',
      };
    }
    if (item.category === 'Community') {
      return {
        icon: <Users size={20} color="#0284c7" />,
        bg: '#f0f9ff',
        border: '#bae6fd',
        badgeBg: '#e0f2fe',
        badgeText: '#0369a1',
      };
    }
    return {
      icon: <Megaphone size={20} color="#2563eb" />,
      bg: '#eff6ff',
      border: '#dbeafe',
      badgeBg: '#dbeafe',
      badgeText: '#1d4ed8',
    };
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* ================= 1. HERO & SUMMARY STRIP CARD ================= */}
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroTextCol}>
            <View style={styles.heroPill}>
              <Megaphone size={11} color="#2563eb" />
              <Text style={styles.heroPillText}>PUBLIC INFORMATION DESK</Text>
            </View>
            <Text style={styles.heroTitle}>Barangay Bulletins</Text>
            <Text style={styles.heroSubtitle}>
              Official public advisories, community programs, emergency alerts, and schedule updates.
            </Text>
          </View>
        </View>

        {/* Compact 3-Column Metrics Strip */}
        <View style={styles.summaryStrip}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{uniqueAnnouncements.length}</Text>
            <Text style={styles.summaryLabel}>Total Bulletins</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: '#dc2626' }]}>{emergencyCount}</Text>
            <Text style={styles.summaryLabel}>Emergency Alerts</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: '#2563eb' }]}>{totalCommentsCount}</Text>
            <Text style={styles.summaryLabel}>Community Q&A</Text>
          </View>
        </View>

        {/* Search Input */}
        <View style={styles.searchBox}>
          <Search size={16} color="#64748b" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search bulletins, events, advisories, or venues..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearSearchBtn}
              activeOpacity={0.7}
            >
              <X size={14} color="#64748b" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Category Filter Pills with Count Bubbles */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScrollContent}
          style={styles.categoryScroll}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            const isEmergencyCat = cat === 'Emergency';
            const count = categoryCounts[cat] ?? 0;

            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryPill,
                  isEmergencyCat && !isSelected && styles.categoryPillEmergency,
                  isSelected &&
                    (isEmergencyCat
                      ? styles.categoryPillEmergencyActive
                      : styles.categoryPillActive),
                ]}
                onPress={() => handleSelectCategory(cat)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    isEmergencyCat && !isSelected && styles.categoryPillTextEmergency,
                    isSelected && styles.categoryPillTextActive,
                  ]}
                >
                  {cat}
                </Text>
                <View
                  style={[
                    styles.categoryCountBubble,
                    isEmergencyCat && !isSelected && styles.categoryCountBubbleEmergency,
                    isSelected && styles.categoryCountBubbleActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryCountText,
                      isEmergencyCat && !isSelected && styles.categoryCountTextEmergency,
                      isSelected && styles.categoryCountTextActive,
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ================= 2. RESULTS HEADER ================= */}
      <View style={styles.resultsHeaderRow}>
        <Text style={styles.resultsTitle}>
          {selectedCategory === 'All'
            ? 'All Official Bulletins'
            : `${selectedCategory} Bulletins`}{' '}
          <Text style={styles.resultsCountMuted}>({filteredAnnouncements.length})</Text>
        </Text>

        {(selectedCategory !== 'All' || searchQuery.trim() !== '') && (
          <TouchableOpacity
            onPress={() => {
              handleSelectCategory('All');
              setSearchQuery('');
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.resetFilterLink}>Reset filters</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ================= 3. ORGANIZED BULLETIN CARDS ================= */}
      {filteredAnnouncements.length > 0 ? (
        filteredAnnouncements.map((item, index) => {
          const itemCommentCount = commentCounts[item.id] || 0;
          const visual = getBulletinVisual(item);
          const isEmergency = item.is_emergency || item.category === 'Emergency';

          return (
            <TouchableOpacity
              key={`${item.id}-${index}`}
              style={[
                styles.bulletinCard,
                isEmergency && styles.bulletinCardEmergency,
              ]}
              activeOpacity={0.88}
              onPress={() => setActiveModalItem(item)}
            >
              {/* Optional Banner Image */}
              {item.banner_url ? (
                <View style={styles.bannerImageWrap}>
                  <Image source={{ uri: item.banner_url }} style={styles.cardImage} />
                </View>
              ) : null}

              <View style={styles.cardBody}>
                {/* Card Top Header: Icon Box + Badges + Date */}
                <View style={styles.cardTopRow}>
                  <View
                    style={[
                      styles.cardIconBox,
                      { backgroundColor: visual.bg, borderColor: visual.border },
                    ]}
                  >
                    {visual.icon}
                  </View>

                  <View style={styles.cardHeaderMain}>
                    <View style={styles.badgesAndDateRow}>
                      <View style={styles.badgesGroup}>
                        <View
                          style={[
                            styles.categoryBadge,
                            { backgroundColor: visual.badgeBg },
                          ]}
                        >
                          <Text
                            style={[
                              styles.categoryBadgeText,
                              { color: visual.badgeText },
                            ]}
                          >
                            {item.category.toUpperCase()}
                          </Text>
                        </View>

                        {isEmergency ? (
                          <View style={styles.urgentBadge}>
                            <AlertTriangle size={10} color="#ffffff" />
                            <Text style={styles.urgentBadgeText}>URGENT</Text>
                          </View>
                        ) : item.is_important ? (
                          <View style={styles.importantBadge}>
                            <Sparkles size={10} color="#1d4ed8" />
                            <Text style={styles.importantBadgeText}>PRIORITY</Text>
                          </View>
                        ) : null}
                      </View>

                      <View style={styles.dateChip}>
                        <Calendar size={11} color="#64748b" />
                        <Text style={styles.cardDate}>{item.date}</Text>
                      </View>
                    </View>

                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                  </View>
                </View>

                {/* Description */}
                <Text style={styles.cardDesc} numberOfLines={3}>
                  {item.description}
                </Text>

                {/* Structured Meta Strip (Venue / Issued By) */}
                {(item.location || item.author) ? (
                  <View style={styles.metaStrip}>
                    {item.location ? (
                      <View style={styles.metaStripItem}>
                        <MapPin size={12} color="#2563eb" />
                        <Text style={styles.metaStripText} numberOfLines={1}>
                          {item.location}
                        </Text>
                      </View>
                    ) : null}
                    {item.author ? (
                      <View style={styles.metaStripItem}>
                        <User size={12} color="#64748b" />
                        <Text style={styles.metaStripTextMuted} numberOfLines={1}>
                          {item.author}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}

                {/* Footer Action Row */}
                <View style={styles.cardFooter}>
                  <View style={styles.commentCountPill}>
                    <MessageSquare size={12} color="#2563eb" />
                    <Text style={styles.commentCountText}>
                      {itemCommentCount}{' '}
                      {itemCommentCount === 1 ? 'Comment / Q&A' : 'Comments / Q&A'}
                    </Text>
                  </View>

                  <View style={styles.readMoreBtn}>
                    <Text style={styles.readMoreText}>Read Bulletin</Text>
                    <ArrowRight size={13} color="#2563eb" />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })
      ) : (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIconCircle}>
            <Megaphone size={26} color="#64748b" />
          </View>
          <Text style={styles.emptyTitle}>No Bulletins Found</Text>
          <Text style={styles.emptySubtitle}>
            No official advisories match your current search or category filter.
          </Text>
          {(selectedCategory !== 'All' || searchQuery.trim() !== '') && (
            <TouchableOpacity
              style={styles.emptyResetBtn}
              onPress={() => {
                handleSelectCategory('All');
                setSearchQuery('');
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyResetBtnText}>Show All Bulletins</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Global Developer & Institution Footer */}
      <GlobalFooter />

      {/* ================= FULL BULLETIN READER & REAL-TIME Q&A MODAL ================= */}
      {activeModalItem ? (
        <Modal visible={true} animationType="fade" transparent onRequestClose={handleCloseModal}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderLeft}>
                  <View
                    style={[
                      styles.modalHeaderIconBox,
                      (activeModalItem.is_emergency ||
                        activeModalItem.category === 'Emergency') &&
                        styles.modalHeaderIconBoxEmergency,
                    ]}
                  >
                    {activeModalItem.is_emergency ||
                    activeModalItem.category === 'Emergency' ? (
                      <AlertTriangle size={18} color="#dc2626" />
                    ) : (
                      <Megaphone size={18} color="#2563eb" />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View
                        style={[
                          styles.modalCategoryBadge,
                          (activeModalItem.is_emergency ||
                            activeModalItem.category === 'Emergency') &&
                            styles.modalCategoryBadgeEmergency,
                        ]}
                      >
                        <Text
                          style={[
                            styles.modalCategoryText,
                            (activeModalItem.is_emergency ||
                              activeModalItem.category === 'Emergency') &&
                              styles.modalCategoryTextEmergency,
                          ]}
                        >
                          {activeModalItem.category.toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.modalHeaderSub}>{activeModalItem.date}</Text>
                    </View>
                    <Text style={styles.modalHeaderLabel} numberOfLines={1}>
                      Official Barangay Bulletin
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleCloseModal}
                  style={styles.modalCloseBtn}
                  activeOpacity={0.7}
                >
                  <X size={18} color="#475569" />
                </TouchableOpacity>
              </View>

              {/* Scrollable Content + Discussion */}
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {activeModalItem.banner_url ? (
                  <Image
                    source={{ uri: activeModalItem.banner_url }}
                    style={styles.modalBanner}
                  />
                ) : null}

                <Text style={styles.modalTitleText}>{activeModalItem.title}</Text>

                {/* Structured Metadata Card */}
                <View style={styles.modalMetaCard}>
                  <View style={styles.modalMetaItem}>
                    <Calendar size={14} color="#2563eb" />
                    <Text style={styles.modalMetaLabel}>
                      Published: <Text style={styles.modalMetaVal}>{activeModalItem.date}</Text>
                    </Text>
                  </View>
                  {activeModalItem.location ? (
                    <View style={styles.modalMetaItem}>
                      <MapPin size={14} color="#2563eb" />
                      <Text style={styles.modalMetaLabel}>
                        Venue: <Text style={styles.modalMetaVal}>{activeModalItem.location}</Text>
                      </Text>
                    </View>
                  ) : null}
                  {activeModalItem.author ? (
                    <View style={styles.modalMetaItem}>
                      <User size={14} color="#2563eb" />
                      <Text style={styles.modalMetaLabel}>
                        Issued By: <Text style={styles.modalMetaVal}>{activeModalItem.author}</Text>
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Full Announcement Text */}
                <View style={styles.modalArticleBox}>
                  <Text style={styles.modalContentText}>
                    {activeModalItem.content || activeModalItem.description}
                  </Text>
                </View>

                {/* Section Divider */}
                <View style={styles.discussionDivider} />

                {/* Community Comments & Official Replies Header */}
                <View style={styles.discussionHeader}>
                  <View style={styles.discussionTitleRow}>
                    <MessageSquare size={16} color="#2563eb" />
                    <Text style={styles.discussionTitle}>
                      Community Discussion & Official Q&A
                    </Text>
                    <View style={styles.discussionCountBadge}>
                      <Text style={styles.discussionCountBadgeText}>{comments.length}</Text>
                    </View>
                  </View>
                  <Text style={styles.discussionSubtitle}>
                    Ask a question or post a remark below. Barangay Officials respond directly with verified updates.
                  </Text>
                </View>

                {/* Loading indicator */}
                {loadingComments ? (
                  <View style={styles.commentsLoadingBox}>
                    <ActivityIndicator size="small" color="#2563eb" />
                    <Text style={styles.commentsLoadingText}>Loading live comments...</Text>
                  </View>
                ) : null}

                {/* Empty State */}
                {!loadingComments && comments.length === 0 ? (
                  <View style={styles.commentsEmptyCard}>
                    <MessageSquare size={26} color="#94a3b8" />
                    <Text style={styles.commentsEmptyTitle}>No inquiries or comments yet</Text>
                    <Text style={styles.commentsEmptySubtitle}>
                      Have a question regarding this bulletin? Ask below and Barangay Officials will reply in real time.
                    </Text>
                  </View>
                ) : null}

                {/* Comments List */}
                {!loadingComments
                  ? rootComments.map((comment, commentIdx) => {
                      const replies = repliesByParent[comment.id] || [];
                      const isAuthor =
                        currentUser?.id &&
                        (comment.author_id === currentUser.id ||
                          currentUser.role === 'admin' ||
                          currentUser.role === 'super_admin');
                      const isOfficial =
                        comment.is_official_response ||
                        comment.author_role === 'admin' ||
                        comment.author_role === 'super_admin';

                      return (
                        <View
                          key={`${comment.id}-${commentIdx}`}
                          style={styles.commentItemWrapper}
                        >
                          {/* Root Comment Box */}
                          <View
                            style={[
                              styles.commentBubble,
                              isOfficial && styles.commentBubbleOfficial,
                            ]}
                          >
                            <View style={styles.commentHeaderRow}>
                              <View style={styles.commentAuthorRow}>
                                <View
                                  style={[
                                    styles.avatarCircle,
                                    isOfficial && styles.avatarCircleOfficial,
                                  ]}
                                >
                                  {isOfficial ? (
                                    <ShieldCheck size={14} color="#ffffff" />
                                  ) : (
                                    <Text style={styles.avatarInitials}>
                                      {comment.author_name.charAt(0).toUpperCase()}
                                    </Text>
                                  )}
                                </View>

                                <View>
                                  <View style={styles.nameBadgeRow}>
                                    <Text style={styles.commentAuthorName}>
                                      {comment.author_name}
                                    </Text>
                                    {isOfficial ? (
                                      <View style={styles.officialBadge}>
                                        <ShieldCheck size={10} color="#1d4ed8" />
                                        <Text style={styles.officialBadgeText}>
                                          {comment.author_role === 'super_admin'
                                            ? 'Super Admin'
                                            : 'Barangay Official'}
                                        </Text>
                                      </View>
                                    ) : null}
                                  </View>
                                  <Text style={styles.commentTime}>
                                    {formatCommentTime(comment.created_at)}
                                  </Text>
                                </View>
                              </View>

                              {Boolean(isAuthor) ? (
                                <TouchableOpacity
                                  onPress={() => promptDeleteComment(comment)}
                                  style={styles.commentDeleteBtn}
                                >
                                  <Trash2 size={13} color="#ef4444" />
                                </TouchableOpacity>
                              ) : null}
                            </View>

                            <Text style={styles.commentBodyText}>{comment.content}</Text>

                            <View style={styles.commentActionRow}>
                              <TouchableOpacity
                                style={styles.replyBtn}
                                onPress={() => {
                                  setReplyingTo(comment);
                                  commentInputRef.current?.focus();
                                }}
                              >
                                <Reply size={12} color="#2563eb" />
                                <Text style={styles.replyBtnText}>Reply</Text>
                              </TouchableOpacity>
                            </View>
                          </View>

                          {/* Nested Replies */}
                          {replies.map((reply, replyIdx) => {
                            const isReplyOfficial =
                              reply.is_official_response ||
                              reply.author_role === 'admin' ||
                              reply.author_role === 'super_admin';
                            const isReplyAuthor =
                              currentUser?.id &&
                              (reply.author_id === currentUser.id ||
                                currentUser.role === 'admin' ||
                                currentUser.role === 'super_admin');

                            return (
                              <View
                                key={`${reply.id}-${replyIdx}`}
                                style={styles.replyItemWrapper}
                              >
                                <CornerDownRight
                                  size={14}
                                  color="#94a3b8"
                                  style={styles.replyCornerIcon}
                                />
                                <View
                                  style={[
                                    styles.replyBubble,
                                    isReplyOfficial && styles.replyBubbleOfficial,
                                  ]}
                                >
                                  <View style={styles.commentHeaderRow}>
                                    <View style={styles.commentAuthorRow}>
                                      <View
                                        style={[
                                          styles.avatarCircleSmall,
                                          isReplyOfficial && styles.avatarCircleOfficial,
                                        ]}
                                      >
                                        {isReplyOfficial ? (
                                          <ShieldCheck size={12} color="#ffffff" />
                                        ) : (
                                          <Text style={styles.avatarInitialsSmall}>
                                            {reply.author_name.charAt(0).toUpperCase()}
                                          </Text>
                                        )}
                                      </View>

                                      <View>
                                        <View style={styles.nameBadgeRow}>
                                          <Text style={styles.commentAuthorName}>
                                            {reply.author_name}
                                          </Text>
                                          {isReplyOfficial ? (
                                            <View style={styles.officialBadge}>
                                              <ShieldCheck size={9} color="#1d4ed8" />
                                              <Text style={styles.officialBadgeText}>
                                                {reply.author_role === 'super_admin'
                                                  ? 'Official Response'
                                                  : 'Barangay Official'}
                                              </Text>
                                            </View>
                                          ) : null}
                                        </View>
                                        <Text style={styles.commentTime}>
                                          {formatCommentTime(reply.created_at)}
                                        </Text>
                                      </View>
                                    </View>

                                    {Boolean(isReplyAuthor) ? (
                                      <TouchableOpacity
                                        onPress={() => promptDeleteComment(reply)}
                                        style={styles.commentDeleteBtn}
                                      >
                                        <Trash2 size={12} color="#ef4444" />
                                      </TouchableOpacity>
                                    ) : null}
                                  </View>

                                  {reply.reply_to_name ? (
                                    <Text style={styles.replyingToTag}>
                                      Replying to{' '}
                                      <Text style={styles.replyingToTarget}>
                                        @{reply.reply_to_name}
                                      </Text>
                                    </Text>
                                  ) : null}

                                  <Text style={styles.commentBodyText}>{reply.content}</Text>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      );
                    })
                  : null}
              </ScrollView>

              {/* Bottom Interactive Comment Composer Bar */}
              <View style={styles.modalInputSection}>
                {replyingTo ? (
                  <View style={styles.replyBanner}>
                    <View style={styles.replyBannerLeft}>
                      <CornerDownRight size={13} color="#1d4ed8" />
                      <Text style={styles.replyBannerText}>
                        Replying to{' '}
                        <Text style={styles.replyBannerName}>{replyingTo.author_name}</Text>
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setReplyingTo(null)}
                      style={styles.replyBannerClose}
                    >
                      <X size={14} color="#64748b" />
                    </TouchableOpacity>
                  </View>
                ) : null}

                {/* AI Auto-Clean Success Banner */}
                {aiCleanSuccessToast ? (
                  <View style={styles.aiCleanSuccessBox}>
                    <View style={styles.aiCleanSuccessHeader}>
                      <View style={styles.aiCleanSuccessIconCircle}>
                        <Sparkles size={13} color="#16a34a" />
                      </View>
                      <Text style={styles.aiCleanSuccessTitle}>AI Language Sanitizer Applied</Text>
                      <View style={styles.aiCleanSuccessBadge}>
                        <Text style={styles.aiCleanSuccessBadgeText}>CLEAN & READY</Text>
                      </View>
                    </View>
                    <Text style={styles.aiCleanSuccessDesc}>
                      Restricted terms were safely censored. Your comment now complies with Barangay Zapatera civic standards.
                    </Text>
                  </View>
                ) : null}

                {/* AI Foul Word Sentinel Card (Aligned with Resident Theme) */}
                {aiModerationResult && !aiModerationResult.isClean ? (
                  <View style={styles.aiSentinelCard}>
                    {/* Top Header */}
                    <View style={styles.aiSentinelHeader}>
                      <View style={styles.aiSentinelTitleRow}>
                        <View style={styles.aiBotIconWrapper}>
                          <Bot size={16} color="#2563eb" />
                        </View>
                        <View>
                          <View style={styles.aiBrandRow}>
                            <Text style={styles.aiSentinelBrand}>ZAPATERA AI SAFETY SENTINEL</Text>
                            <View style={styles.aiNeuralPill}>
                              <Cpu size={10} color="#2563eb" />
                              <Text style={styles.aiNeuralPillText}>NEURAL GUARD</Text>
                            </View>
                          </View>
                          <Text style={styles.aiSentinelSubtitle}>Real-time Profanity & Civic Ethics Interceptor</Text>
                        </View>
                      </View>
                      <View style={styles.aiStatusBadge}>
                        <View style={styles.aiStatusDot} />
                        <Text style={styles.aiStatusBadgeText}>PROFANITY BLOCKED</Text>
                      </View>
                    </View>

                    {/* AI Analysis Diagnostic Body */}
                    <View style={styles.aiAnalysisBody}>
                      <View style={styles.aiWarningHeadline}>
                        <ShieldAlert size={15} color="#e11d48" />
                        <Text style={styles.aiWarningHeadlineText}>Prohibited Language Detected</Text>
                      </View>
                      <Text style={styles.aiAnalysisText}>
                        {aiModerationResult.aiAnalysisReason || aiModerationResult.warningMessage}
                      </Text>

                      {/* Flagged Tokens & Metrics */}
                      <View style={styles.aiFlaggedSection}>
                        <Text style={styles.aiFlaggedLabel}>
                          Intercepted Term{aiModerationResult.flaggedWords.length > 1 ? 's' : ''}:
                        </Text>
                        <View style={styles.aiFlaggedChipsRow}>
                          {aiModerationResult.flaggedWords.map((term, idx) => (
                            <View key={idx} style={styles.aiFlaggedChip}>
                              <AlertTriangle size={11} color="#e11d48" />
                              <Text style={styles.aiFlaggedChipText}>"{term}"</Text>
                              <View style={styles.aiFlaggedProhibitedTag}>
                                <Text style={styles.aiFlaggedProhibitedTagText}>RESTRICTED</Text>
                              </View>
                            </View>
                          ))}
                          {aiModerationResult.languageDetected && (
                            <View style={styles.aiLanguageChip}>
                              <Text style={styles.aiLanguageChipText}>
                                Dialect: {aiModerationResult.languageDetected}
                              </Text>
                            </View>
                          )}
                          <View style={styles.aiConfidenceChip}>
                            <Zap size={10} color="#15803d" />
                            <Text style={styles.aiConfidenceChipText}>
                              AI Confidence: {aiModerationResult.confidenceScore || 99.4}%
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Action Buttons */}
                      <View style={styles.aiActionRow}>
                        <TouchableOpacity
                          style={styles.aiAutoCleanBtn}
                          onPress={handleAutoCleanWithAi}
                          activeOpacity={0.8}
                        >
                          <Sparkles size={13} color="#ffffff" />
                          <Text style={styles.aiAutoCleanBtnText}>✨ Auto-Sanitize with AI</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.aiDismissBtn}
                          onPress={() => {
                            setAiModerationResult(null);
                            setCommentModerationError('');
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.aiDismissBtnText}>Edit Manually</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ) : null}

                {/* Fallback legacy alert box if simple moderation string set without AI object */}
                {!aiModerationResult && commentModerationError ? (
                  <View style={styles.moderationAlertBox}>
                    <AlertTriangle size={15} color="#b91c1c" />
                    <Text style={styles.moderationAlertText}>{commentModerationError}</Text>
                  </View>
                ) : null}

                {currentUser ? (
                  <View style={styles.commentInputContainer}>
                    <View style={styles.commentInputRow}>
                      <TextInput
                        ref={commentInputRef}
                        style={[
                          styles.commentInput,
                          aiModerationResult && !aiModerationResult.isClean && styles.commentInputAiBlocked,
                        ]}
                        placeholder={
                          replyingTo
                            ? `Reply to @${replyingTo.author_name}...`
                            : 'Write a comment or ask a question...'
                        }
                        placeholderTextColor="#94a3b8"
                        value={commentInput}
                        onChangeText={(text) => {
                          setCommentInput(text);
                          if (aiCleanSuccessToast) setAiCleanSuccessToast(false);
                          if (aiModerationResult) {
                            const liveCheck = checkContentModeration(text.trim());
                            if (liveCheck.isClean) {
                              setAiModerationResult(null);
                              setCommentModerationError('');
                            } else {
                              setAiModerationResult(liveCheck);
                              setCommentModerationError(liveCheck.warningMessage);
                            }
                          }
                        }}
                        multiline
                        maxLength={500}
                      />

                      <TouchableOpacity
                        style={[
                          styles.sendCommentBtn,
                          (!commentInput.trim() || isSubmittingComment || isAiScanning) &&
                            styles.sendCommentBtnDisabled,
                        ]}
                        onPress={handlePostComment}
                        disabled={!commentInput.trim() || isSubmittingComment || isAiScanning}
                        activeOpacity={0.8}
                      >
                        {isSubmittingComment || isAiScanning ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <Send size={15} color="#ffffff" />
                        )}
                      </TouchableOpacity>
                    </View>

                    {/* AI Scanning Status Bar */}
                    {isAiScanning && (
                      <View style={styles.aiScanningBar}>
                        <Cpu size={12} color="#3b82f6" />
                        <Text style={styles.aiScanningText}>
                          Zapatera AI Safety Model scanning message for community decorum...
                        </Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={styles.guestNoticeCard}>
                    <Lock size={14} color="#64748b" />
                    <Text style={styles.guestNoticeText}>
                      Sign in to your resident account to join the discussion and ask questions.
                    </Text>
                  </View>
                )}
              </View>

              {/* Footer */}
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.closeFullBtn}
                  onPress={handleCloseModal}
                  activeOpacity={0.8}
                >
                  <Text style={styles.closeFullBtnText}>Close Bulletin</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}

      {/* Delete Comment Confirmation Modal */}
      <ActionModal
        isOpen={!!commentToDelete}
        type="confirmation"
        isDestructive={true}
        title="Delete Comment"
        message={
          commentToDelete ? (
            <View style={{ gap: 12, width: '100%' }}>
              <Text
                style={{
                  fontSize: 13,
                  color: '#475569',
                  lineHeight: 19,
                  textAlign: 'center',
                }}
              >
                Are you sure you want to permanently delete this comment?
              </Text>

              <View
                style={{
                  backgroundColor: '#f8fafc',
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  borderRadius: 12,
                  padding: 12,
                  borderLeftWidth: 3,
                  borderLeftColor: '#ef4444',
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 4,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#0f172a' }}>
                    {commentToDelete.author_name}
                  </Text>
                  {commentToDelete.is_official_response ? (
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#1d4ed8' }}>
                      [Official]
                    </Text>
                  ) : null}
                </View>
                <Text
                  style={{
                    fontSize: 12,
                    color: '#334155',
                    fontStyle: 'italic',
                    lineHeight: 18,
                  }}
                  numberOfLines={4}
                >
                  "{commentToDelete.content}"
                </Text>
              </View>

              <Text
                style={{
                  fontSize: 11,
                  color: '#94a3b8',
                  textAlign: 'center',
                  lineHeight: 16,
                }}
              >
                This action cannot be undone. Any nested replies will also be permanently removed.
              </Text>
            </View>
          ) : (
            'Are you sure you want to delete this comment?'
          )
        }
        confirmText="Delete Comment"
        cancelText="Cancel"
        isProcessing={isDeletingComment}
        onConfirm={handleConfirmDeleteComment}
        onClose={() => {
          if (!isDeletingComment) setCommentToDelete(null);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 96,
  },

  /* ================= 1. HERO & SUMMARY STRIP CARD ================= */
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  heroTextCol: {
    flex: 1,
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#dbeafe',
    marginBottom: 6,
  },
  heroPillText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#2563eb',
    letterSpacing: 0.6,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 17,
    marginTop: 3,
  },

  /* Summary Metrics Strip */
  summaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 1,
  },
  summaryDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#e2e8f0',
  },

  /* Search Input */
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    color: '#0f172a',
    padding: 0,
    outlineStyle: 'none' as any,
  },
  clearSearchBtn: {
    padding: 2,
  },

  /* Category Filter Pills */
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryScrollContent: {
    gap: 6,
    paddingRight: 4,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryPillActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  categoryPillEmergency: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  categoryPillEmergencyActive: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626',
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  categoryPillTextEmergency: {
    color: '#b91c1c',
  },
  categoryPillTextActive: {
    color: '#ffffff',
  },
  categoryCountBubble: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
  },
  categoryCountBubbleEmergency: {
    backgroundColor: '#fee2e2',
  },
  categoryCountBubbleActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.24)',
  },
  categoryCountText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#475569',
  },
  categoryCountTextEmergency: {
    color: '#b91c1c',
  },
  categoryCountTextActive: {
    color: '#ffffff',
  },

  /* ================= 2. RESULTS HEADER ================= */
  resultsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  resultsTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  resultsCountMuted: {
    fontWeight: '700',
    color: '#64748b',
  },
  resetFilterLink: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#2563eb',
  },

  /* ================= 3. ORGANIZED BULLETIN CARDS ================= */
  bulletinCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#0f172a',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  bulletinCardEmergency: {
    borderColor: '#fca5a5',
    borderWidth: 1.5,
  },
  bannerImageWrap: {
    width: '100%',
    height: 148,
    backgroundColor: '#e2e8f0',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardBody: {
    padding: 15,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    marginBottom: 9,
  },
  cardIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderMain: {
    flex: 1,
  },
  badgesAndDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  badgesGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  categoryBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#dc2626',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  urgentBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#ffffff',
  },
  importantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  importantBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#1d4ed8',
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardDate: {
    fontSize: 10.5,
    color: '#64748b',
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 20,
  },
  cardDesc: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17.5,
    marginBottom: 11,
  },
  metaStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 11,
  },
  metaStripItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaStripText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  metaStripTextMuted: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  commentCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  commentCountText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#2563eb',
  },
  readMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  readMoreText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563eb',
  },

  /* Empty State */
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#1e293b',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 260,
    lineHeight: 17,
  },
  emptyResetBtn: {
    marginTop: 12,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  emptyResetBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#2563eb',
  },

  /* ================= MODAL STYLES ================= */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    width: '100%',
    maxWidth: 520,
    maxHeight: '92%',
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
    display: 'flex',
    flexDirection: 'column',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  modalHeaderIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeaderIconBoxEmergency: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  modalCategoryBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  modalCategoryBadgeEmergency: {
    backgroundColor: '#fee2e2',
  },
  modalCategoryText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1d4ed8',
  },
  modalCategoryTextEmergency: {
    color: '#b91c1c',
  },
  modalHeaderSub: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748b',
  },
  modalHeaderLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    padding: 16,
    flex: 1,
  },
  modalBanner: {
    width: '100%',
    height: 175,
    borderRadius: 14,
    marginBottom: 14,
    backgroundColor: '#cbd5e1',
  },
  modalTitleText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
    lineHeight: 23,
    marginBottom: 12,
  },
  modalMetaCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 7,
  },
  modalMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  modalMetaLabel: {
    fontSize: 11.5,
    color: '#64748b',
  },
  modalMetaVal: {
    fontWeight: '700',
    color: '#0f172a',
  },
  modalArticleBox: {
    backgroundColor: '#ffffff',
    marginBottom: 8,
  },
  modalContentText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
  },
  discussionDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 16,
  },
  discussionHeader: {
    marginBottom: 12,
  },
  discussionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  discussionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  discussionCountBadge: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  discussionCountBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1d4ed8',
  },
  discussionSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 3,
    lineHeight: 15,
  },
  commentsLoadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  commentsLoadingText: {
    fontSize: 11,
    color: '#64748b',
  },
  commentsEmptyCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    marginVertical: 8,
  },
  commentsEmptyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginTop: 8,
  },
  commentsEmptySubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  commentItemWrapper: {
    marginBottom: 12,
  },
  commentBubble: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  commentBubbleOfficial: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderLeftWidth: 3,
    borderLeftColor: '#2563eb',
  },
  commentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  commentAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircleSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircleOfficial: {
    backgroundColor: '#1d4ed8',
  },
  avatarInitials: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  avatarInitialsSmall: {
    fontSize: 10,
    fontWeight: '800',
    color: '#334155',
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  commentAuthorName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  officialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#dbeafe',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  officialBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1d4ed8',
  },
  commentTime: {
    fontSize: 10,
    color: '#94a3b8',
  },
  commentDeleteBtn: {
    padding: 4,
  },
  commentBodyText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
  },
  commentActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 6,
  },
  replyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  replyBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#2563eb',
  },
  replyItemWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
    marginLeft: 18,
  },
  replyCornerIcon: {
    marginTop: 10,
    marginRight: 6,
  },
  replyBubble: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  replyBubbleOfficial: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderLeftWidth: 3,
    borderLeftColor: '#2563eb',
  },
  replyingToTag: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 4,
  },
  replyingToTarget: {
    fontWeight: '700',
    color: '#1d4ed8',
  },
  modalInputSection: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  replyBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  replyBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  replyBannerText: {
    fontSize: 11,
    color: '#1e40af',
  },
  replyBannerName: {
    fontWeight: '700',
    color: '#1d4ed8',
  },
  replyBannerClose: {
    padding: 2,
  },
  moderationAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  moderationAlertText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: '#991b1b',
    lineHeight: 15,
  },
  // AI Sentinel Foul Word Interceptor Styles
  aiCleanSuccessBox: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1.5,
    borderColor: '#86efac',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  aiCleanSuccessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  aiCleanSuccessIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiCleanSuccessTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#15803d',
    flex: 1,
  },
  aiCleanSuccessBadge: {
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  aiCleanSuccessBadgeText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#16a34a',
    letterSpacing: 0.5,
  },
  aiCleanSuccessDesc: {
    fontSize: 10.5,
    color: '#166534',
    lineHeight: 14,
    paddingLeft: 26,
  },
  aiSentinelCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#fca5a5',
    padding: 13,
    marginBottom: 10,
    shadowColor: '#e11d48',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  aiSentinelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#fee2e2',
  },
  aiSentinelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  aiBotIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiSentinelBrand: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  aiNeuralPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  aiNeuralPillText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#2563eb',
    letterSpacing: 0.4,
  },
  aiSentinelSubtitle: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  aiStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 12,
  },
  aiStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e11d48',
  },
  aiStatusBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#be123c',
    letterSpacing: 0.5,
  },
  aiAnalysisBody: {
    paddingTop: 9,
  },
  aiWarningHeadline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  aiWarningHeadlineText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9f1239',
  },
  aiAnalysisText: {
    fontSize: 11.5,
    color: '#475569',
    lineHeight: 16,
  },
  aiFlaggedSection: {
    marginTop: 9,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#fee2e2',
  },
  aiFlaggedLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  aiFlaggedChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  aiFlaggedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
  },
  aiFlaggedChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#be123c',
    textDecorationLine: 'line-through',
  },
  aiFlaggedProhibitedTag: {
    backgroundColor: '#e11d48',
    paddingHorizontal: 4.5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  aiFlaggedProhibitedTagText: {
    fontSize: 7.5,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.4,
  },
  aiLanguageChip: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 8,
  },
  aiLanguageChipText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#475569',
  },
  aiConfidenceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 8,
  },
  aiConfidenceChipText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#15803d',
  },
  aiActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 11,
  },
  aiAutoCleanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563eb',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 9,
    shadowColor: '#2563eb',
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 2,
  },
  aiAutoCleanBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  aiDismissBtn: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  aiDismissBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#475569',
  },
  commentInputContainer: {
    width: '100%',
  },
  commentInputAiBlocked: {
    borderColor: '#fca5a5',
    borderWidth: 1.5,
    backgroundColor: '#fff1f2',
    color: '#0f172a',
  },
  aiScanningBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 8,
  },
  aiScanningText: {
    fontSize: 10.5,
    color: '#1d4ed8',
    fontWeight: '600',
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 12,
    color: '#0f172a',
    maxHeight: 70,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    outlineStyle: 'none' as any,
  },
  sendCommentBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendCommentBtnDisabled: {
    backgroundColor: '#94a3b8',
    opacity: 0.6,
  },
  guestNoticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  guestNoticeText: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
  },
  modalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
  },
  closeFullBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeFullBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
});
