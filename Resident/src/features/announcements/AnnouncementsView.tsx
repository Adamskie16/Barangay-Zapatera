// Resident/src/features/announcements/AnnouncementsView.tsx
import React, { useState, useEffect, useRef } from 'react';
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
  Share2,
  Bookmark,
  ArrowRight,
  Info,
  MessageSquare,
  Send,
  CornerDownRight,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  Reply,
  Lock,
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

export default function AnnouncementsView({
  announcements,
  selectedAnnouncement: initialSelected,
  onCloseAnnouncementModal,
  currentUser,
}: AnnouncementsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeModalItem, setActiveModalItem] = useState<BarangayAnnouncement | null>(initialSelected || null);

  // Comments state
  const [comments, setComments] = useState<BulletinComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState<BulletinComment | null>(null);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});

  const commentInputRef = useRef<any>(null);

  // Load counts for all announcements
  useEffect(() => {
    let isMounted = true;
    const loadAllCounts = async () => {
      try {
        const counts = await getBulletinCommentCounts(announcements.map((a) => a.id));
        if (isMounted) setCommentCounts(counts);
      } catch {}
    };
    if (announcements.length > 0) {
      loadAllCounts();
    }
    return () => {
      isMounted = false;
    };
  }, [announcements]);

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

    // Subscribe to REAL TIME updates
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
    onCloseAnnouncementModal?.();
  };

  const handlePostComment = async () => {
    if (!commentInput.trim() || !activeModalItem || isSubmittingComment) return;

    if (!currentUser) {
      alert('Please sign in to post a comment or inquiry on this announcement.');
      return;
    }

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
      setComments((prev) => prev.filter((c) => c.id !== commentToDelete.id && c.parent_id !== commentToDelete.id));
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

  const filteredAnnouncements = announcements.filter((ann) => {
    const matchesSearch =
      ann.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ann.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ann.content.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'All' || ann.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Barangay Bulletins & News</Text>
        <Text style={styles.subtitle}>
          Official public advisories, community programs, emergency notices, and schedule updates.
        </Text>

        <View style={styles.searchBar}>
          <Search size={16} color="#64748b" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search bulletins, events, advisories..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Category Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryPill,
                selectedCategory === cat && styles.categoryPillActive,
                cat === 'Emergency' && styles.categoryPillEmergency,
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text
                style={[
                  styles.categoryPillText,
                  selectedCategory === cat && styles.categoryPillTextActive,
                  cat === 'Emergency' && selectedCategory !== 'Emergency' && styles.categoryPillTextEmergency,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Main Bulletins Feed */}
      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        {filteredAnnouncements.map((item) => {
          const itemCommentCount = commentCounts[item.id] || 0;
          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.card,
                item.is_emergency && styles.cardEmergency,
                item.is_important && !item.is_emergency && styles.cardImportant,
              ]}
              activeOpacity={0.88}
              onPress={() => setActiveModalItem(item)}
            >
              {item.banner_url ? (
                <Image source={{ uri: item.banner_url }} style={styles.cardImage} />
              ) : null}

              <View style={styles.cardBody}>
                <View style={styles.cardMetaRow}>
                  <View
                    style={[
                      styles.categoryBadge,
                      item.is_emergency && styles.categoryBadgeEmergency,
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryBadgeText,
                        item.is_emergency && styles.categoryBadgeTextEmergency,
                      ]}
                    >
                      {item.category.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.cardDate}>{item.date}</Text>
                </View>

                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDesc} numberOfLines={3}>{item.description}</Text>

                <View style={styles.cardFooter}>
                  {item.location ? (
                    <View style={styles.locationRow}>
                      <MapPin size={12} color="#64748b" />
                      <Text style={styles.locationText} numberOfLines={1}>{item.location}</Text>
                    </View>
                  ) : <View />}

                  <View style={styles.cardActionsRight}>
                    {/* Real-time comment pill */}
                    <View style={styles.commentCountPill}>
                      <MessageSquare size={12} color="#2563eb" />
                      <Text style={styles.commentCountText}>
                        {itemCommentCount} {itemCommentCount === 1 ? 'comment' : 'comments'}
                      </Text>
                    </View>

                    <View style={styles.readMoreRow}>
                      <Text style={styles.readMoreText}>Read</Text>
                      <ArrowRight size={12} color="#1d4ed8" />
                    </View>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        {filteredAnnouncements.length === 0 && (
          <View style={styles.emptyBox}>
            <Megaphone size={36} color="#94a3b8" />
            <Text style={styles.emptyTitle}>No announcements found</Text>
            <Text style={styles.emptySubtitle}>
              Try searching with another keyword or selecting "All" categories.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Full Announcement Reader & Real-Time Comments Modal */}
      {activeModalItem && (
        <Modal visible={true} animationType="slide" transparent onRequestClose={handleCloseModal}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalCategoryBadge}>
                  <Text style={styles.modalCategoryText}>{activeModalItem.category.toUpperCase()}</Text>
                </View>
                <TouchableOpacity onPress={handleCloseModal} style={styles.modalCloseBtn}>
                  <X size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* Scrollable Content + Discussion */}
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {activeModalItem.banner_url && (
                  <Image source={{ uri: activeModalItem.banner_url }} style={styles.modalBanner} />
                )}

                <Text style={styles.modalTitleText}>{activeModalItem.title}</Text>

                <View style={styles.modalMetaCard}>
                  <View style={styles.modalMetaItem}>
                    <Calendar size={13} color="#64748b" />
                    <Text style={styles.modalMetaLabel}>Date: <Text style={styles.modalMetaVal}>{activeModalItem.date}</Text></Text>
                  </View>
                  {activeModalItem.location && (
                    <View style={styles.modalMetaItem}>
                      <MapPin size={13} color="#64748b" />
                      <Text style={styles.modalMetaLabel}>Venue: <Text style={styles.modalMetaVal}>{activeModalItem.location}</Text></Text>
                    </View>
                  )}
                  {activeModalItem.author && (
                    <View style={styles.modalMetaItem}>
                      <User size={13} color="#64748b" />
                      <Text style={styles.modalMetaLabel}>Issued by: <Text style={styles.modalMetaVal}>{activeModalItem.author}</Text></Text>
                    </View>
                  )}
                </View>

                <Text style={styles.modalContentText}>{activeModalItem.content}</Text>

                {/* Section Divider */}
                <View style={styles.discussionDivider} />

                {/* Community Comments & Official Replies Header */}
                <View style={styles.discussionHeader}>
                  <View style={styles.discussionTitleRow}>
                    <MessageSquare size={18} color="#1d4ed8" />
                    <Text style={styles.discussionTitle}>
                      Community Discussion & Official Q&A
                    </Text>
                    <View style={styles.discussionCountBadge}>
                      <Text style={styles.discussionCountBadgeText}>{comments.length}</Text>
                    </View>
                  </View>
                  <Text style={styles.discussionSubtitle}>
                    Residents can ask questions or post remarks. SuperAdmin & Admin can reply directly with official notices.
                  </Text>
                </View>

                {/* Loading indicator */}
                {loadingComments && (
                  <View style={styles.commentsLoadingBox}>
                    <ActivityIndicator size="small" color="#2563eb" />
                    <Text style={styles.commentsLoadingText}>Loading live comments...</Text>
                  </View>
                )}

                {/* Empty State */}
                {!loadingComments && comments.length === 0 && (
                  <View style={styles.commentsEmptyCard}>
                    <MessageSquare size={28} color="#94a3b8" />
                    <Text style={styles.commentsEmptyTitle}>No inquiries or comments yet</Text>
                    <Text style={styles.commentsEmptySubtitle}>
                      Have a question regarding this announcement? Ask below and Barangay Officials will reply in real time.
                    </Text>
                  </View>
                )}

                {/* Comments List */}
                {!loadingComments && rootComments.map((comment) => {
                  const replies = repliesByParent[comment.id] || [];
                  const isAuthor =
                    currentUser?.id &&
                    (comment.author_id === currentUser.id ||
                      currentUser.role === 'admin' ||
                      currentUser.role === 'super_admin');
                  const isOfficial = comment.is_official_response || comment.author_role === 'admin' || comment.author_role === 'super_admin';

                  return (
                    <View key={comment.id} style={styles.commentItemWrapper}>
                      {/* Root Comment Box */}
                      <View style={[styles.commentBubble, isOfficial && styles.commentBubbleOfficial]}>
                        <View style={styles.commentHeaderRow}>
                          <View style={styles.commentAuthorRow}>
                            <View style={[styles.avatarCircle, isOfficial && styles.avatarCircleOfficial]}>
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
                                <Text style={styles.commentAuthorName}>{comment.author_name}</Text>
                                {isOfficial && (
                                  <View style={styles.officialBadge}>
                                    <ShieldCheck size={10} color="#1d4ed8" />
                                    <Text style={styles.officialBadgeText}>
                                      {comment.author_role === 'super_admin' ? 'Super Admin' : 'Barangay Official'}
                                    </Text>
                                  </View>
                                )}
                              </View>
                              <Text style={styles.commentTime}>{formatCommentTime(comment.created_at)}</Text>
                            </View>
                          </View>

                          {/* Delete Button for Author / Admin */}
                          {isAuthor && (
                            <TouchableOpacity
                              onPress={() => promptDeleteComment(comment)}
                              style={styles.commentDeleteBtn}
                            >
                              <Trash2 size={13} color="#ef4444" />
                            </TouchableOpacity>
                          )}
                        </View>

                        <Text style={styles.commentBodyText}>{comment.content}</Text>

                        {/* Reply Button */}
                        <View style={styles.commentActionRow}>
                          <TouchableOpacity
                            style={styles.replyBtn}
                            onPress={() => {
                              setReplyingTo(comment);
                              commentInputRef.current?.focus();
                            }}
                          >
                            <Reply size={12} color="#1d4ed8" />
                            <Text style={styles.replyBtnText}>Reply</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Nested Replies */}
                      {replies.map((reply) => {
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
                          <View key={reply.id} style={styles.replyItemWrapper}>
                            <CornerDownRight size={14} color="#94a3b8" style={styles.replyCornerIcon} />
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
                                      <Text style={styles.commentAuthorName}>{reply.author_name}</Text>
                                      {isReplyOfficial && (
                                        <View style={styles.officialBadge}>
                                          <ShieldCheck size={9} color="#1d4ed8" />
                                          <Text style={styles.officialBadgeText}>
                                            {reply.author_role === 'super_admin'
                                              ? 'Official Response'
                                              : 'Barangay Official'}
                                          </Text>
                                        </View>
                                      )}
                                    </View>
                                    <Text style={styles.commentTime}>{formatCommentTime(reply.created_at)}</Text>
                                  </View>
                                </View>

                                {isReplyAuthor && (
                                  <TouchableOpacity
                                    onPress={() => promptDeleteComment(reply)}
                                    style={styles.commentDeleteBtn}
                                  >
                                    <Trash2 size={12} color="#ef4444" />
                                  </TouchableOpacity>
                                )}
                              </View>

                              {reply.reply_to_name && (
                                <Text style={styles.replyingToTag}>
                                  Replying to <Text style={styles.replyingToTarget}>@{reply.reply_to_name}</Text>
                                </Text>
                              )}

                              <Text style={styles.commentBodyText}>{reply.content}</Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  );
                })}
              </ScrollView>

              {/* Bottom Interactive Comment Composer Bar */}
              <View style={styles.modalInputSection}>
                {/* Active Reply Banner */}
                {replyingTo && (
                  <View style={styles.replyBanner}>
                    <View style={styles.replyBannerLeft}>
                      <CornerDownRight size={13} color="#1d4ed8" />
                      <Text style={styles.replyBannerText}>
                        Replying to <Text style={styles.replyBannerName}>{replyingTo.author_name}</Text>
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setReplyingTo(null)} style={styles.replyBannerClose}>
                      <X size={14} color="#64748b" />
                    </TouchableOpacity>
                  </View>
                )}

                {currentUser ? (
                  <View style={styles.commentInputRow}>
                    <TextInput
                      ref={commentInputRef}
                      style={styles.commentInput}
                      placeholder={
                        replyingTo
                          ? `Reply to @${replyingTo.author_name}...`
                          : 'Write a comment or ask a question...'
                      }
                      placeholderTextColor="#94a3b8"
                      value={commentInput}
                      onChangeText={setCommentInput}
                      multiline
                      maxLength={500}
                    />

                    <TouchableOpacity
                      style={[
                        styles.sendCommentBtn,
                        (!commentInput.trim() || isSubmittingComment) && styles.sendCommentBtnDisabled,
                      ]}
                      onPress={handlePostComment}
                      disabled={!commentInput.trim() || isSubmittingComment}
                      activeOpacity={0.8}
                    >
                      {isSubmittingComment ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Send size={15} color="#ffffff" />
                      )}
                    </TouchableOpacity>
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
                <TouchableOpacity style={styles.closeFullBtn} onPress={handleCloseModal}>
                  <Text style={styles.closeFullBtnText}>Close Bulletin</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Delete Comment Confirmation Modal */}
      <ActionModal
        isOpen={!!commentToDelete}
        type="confirmation"
        isDestructive={true}
        title="Delete Comment"
        message={
          commentToDelete ? (
            <View style={{ gap: 12, width: '100%' }}>
              <Text style={{ fontSize: 13, color: '#475569', lineHeight: 19, textAlign: 'center' }}>
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#0f172a' }}>
                    {commentToDelete.author_name}
                  </Text>
                  {commentToDelete.is_official_response && (
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#1d4ed8' }}>
                      [Official]
                    </Text>
                  )}
                </View>
                <Text
                  style={{ fontSize: 12, color: '#334155', fontStyle: 'italic', lineHeight: 18 }}
                  numberOfLines={4}
                >
                  "{commentToDelete.content}"
                </Text>
              </View>

              <Text style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', lineHeight: 16 }}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 10,
    lineHeight: 15,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#0f172a',
    padding: 0,
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryPillActive: {
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8',
  },
  categoryPillEmergency: {
    borderColor: '#fecdd3',
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  categoryPillTextActive: {
    color: '#ffffff',
  },
  categoryPillTextEmergency: {
    color: '#be123c',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 90,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  cardEmergency: {
    borderColor: '#fecdd3',
    borderWidth: 1.5,
  },
  cardImportant: {
    borderColor: '#bfdbfe',
  },
  cardImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#cbd5e1',
  },
  cardBody: {
    padding: 14,
  },
  cardMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadgeEmergency: {
    backgroundColor: '#ffe4e6',
  },
  categoryBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1d4ed8',
  },
  categoryBadgeTextEmergency: {
    color: '#be123c',
  },
  cardDate: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 19,
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    marginRight: 8,
  },
  locationText: {
    fontSize: 11,
    color: '#64748b',
  },
  cardActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 12,
  },
  commentCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563eb',
  },
  readMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readMoreText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 240,
  },
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
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    display: 'flex',
    flexDirection: 'column',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalCategoryBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  modalCategoryText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1d4ed8',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
    flex: 1,
  },
  modalBanner: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 14,
    backgroundColor: '#cbd5e1',
  },
  modalTitleText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 23,
    marginBottom: 10,
  },
  modalMetaCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  modalMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalMetaLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  modalMetaVal: {
    fontWeight: '700',
    color: '#1e293b',
  },
  modalContentText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
    marginBottom: 10,
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
    fontSize: 10,
    fontWeight: '700',
    color: '#1d4ed8',
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
    paddingHorizontal: 12,
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
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 12,
    color: '#0f172a',
    maxHeight: 70,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sendCommentBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1d4ed8',
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
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  closeFullBtn: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeFullBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
});
