// Resident/src/core/commentService.ts
// Real-time comments & official replies service for Barangay Zapatera bulletins

import { supabase, isSupabaseConfigured } from './supabase';
import { checkContentModeration } from './contentModerationService';

export interface BulletinComment {
  id: string;
  news_id: string;
  author_id?: string;
  author_name: string;
  author_role: 'resident' | 'admin' | 'super_admin';
  author_avatar?: string;
  content: string;
  parent_id?: string | null;
  reply_to_name?: string | null;
  is_official_response: boolean;
  is_pinned?: boolean;
  created_at: string;
  updated_at?: string;
}

const STORAGE_KEY = 'zapatera_bulletin_comments';

// Circuit breaker state to prevent spamming 404s when SQL migration has not been run in Supabase yet
let isRemoteTableAvailable: boolean | null = null;
let lastTableCheckTime = 0;
const CHECK_COOLDOWN_MS = 60000; // Check remote table at most once every 60s if known missing
let hasLoggedMissingNotice = false;

function shouldSkipRemote(): boolean {
  if (!isSupabaseConfigured()) return true;
  if (isRemoteTableAvailable === false) {
    if (Date.now() - lastTableCheckTime > CHECK_COOLDOWN_MS) {
      // Cooldown expired, allow 1 probe to check if user ran the SQL migration
      return false;
    }
    return true;
  }
  return false;
}

function handleRemoteError(err: any) {
  const errMsg = String(err?.message || err?.details || err || '').toLowerCase();
  const isMissingTable =
    err?.code === 'PGRST205' ||
    errMsg.includes('could not find the table') ||
    errMsg.includes('schema cache') ||
    err?.status === 404;

  if (isMissingTable) {
    isRemoteTableAvailable = false;
    lastTableCheckTime = Date.now();
    if (!hasLoggedMissingNotice) {
      console.info(
        '%c[Zapatera Bulletins]%c Supabase table "public.bulletin_comments" is not yet deployed. Comments will operate seamlessly in local storage and cross-tab BroadcastChannel mode.',
        'color: #2563eb; font-weight: bold;',
        'color: inherit;'
      );
      hasLoggedMissingNotice = true;
    }
  }
}

function getLocalComments(): BulletinComment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalComments(comments: BulletinComment[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(comments));
  } catch (err) {
    console.warn('Could not save comments locally:', err);
  }
}

/**
 * Batch fetch comment counts for all announcements in ONE call (avoids N+1 query spam)
 */
export async function getBulletinCommentCounts(newsIds?: string[]): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};

  // Initialize requested IDs with 0
  if (newsIds) {
    newsIds.forEach((id) => {
      counts[id] = 0;
    });
  }

  // Count from local cache
  const localList = getLocalComments();
  localList.forEach((c) => {
    if (!newsIds || newsIds.includes(String(c.news_id))) {
      counts[c.news_id] = (counts[c.news_id] || 0) + 1;
    }
  });

  if (shouldSkipRemote()) {
    return counts;
  }

  try {
    const { data, error } = await supabase
      .from('bulletin_comments')
      .select('id, news_id');

    if (error) {
      handleRemoteError(error);
      return counts;
    }

    if (data) {
      isRemoteTableAvailable = true;
      const remoteCounts: Record<string, number> = {};
      data.forEach((row: any) => {
        const nid = String(row.news_id);
        if (!newsIds || newsIds.includes(nid)) {
          remoteCounts[nid] = (remoteCounts[nid] || 0) + 1;
        }
      });
      return { ...counts, ...remoteCounts };
    }
  } catch (err) {
    handleRemoteError(err);
  }

  return counts;
}

/**
 * Fetch all comments for a specific bulletin / announcement
 */
export async function getBulletinComments(newsId: string): Promise<BulletinComment[]> {
  const localList = getLocalComments().filter((c) => String(c.news_id) === String(newsId));

  if (shouldSkipRemote()) {
    return localList.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  try {
    const { data, error } = await supabase
      .from('bulletin_comments')
      .select('*')
      .eq('news_id', String(newsId))
      .order('created_at', { ascending: true });

    if (error) {
      handleRemoteError(error);
      return localList;
    }

    if (data) {
      isRemoteTableAvailable = true;
      const allLocal = getLocalComments();
      const existingIds = new Set(data.map((c: any) => c.id));
      const filteredOther = allLocal.filter((c) => String(c.news_id) !== String(newsId) && !existingIds.has(c.id));
      saveLocalComments([...filteredOther, ...data]);
      return data;
    }
  } catch (err) {
    handleRemoteError(err);
  }

  return localList;
}

/**
 * Add a new comment or official reply to a bulletin
 */
export async function postBulletinComment(commentData: {
  news_id: string;
  author_id?: string;
  author_name: string;
  author_role?: 'resident' | 'admin' | 'super_admin';
  author_avatar?: string;
  content: string;
  parent_id?: string | null;
  reply_to_name?: string | null;
  is_official_response?: boolean;
}) {
  // AI Content Moderation & Profanity Guard
  const modResult = checkContentModeration(commentData.content);
  if (!modResult.isClean) {
    throw new Error(modResult.warningMessage);
  }

  const newComment: BulletinComment = {
    id: `cm-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    news_id: String(commentData.news_id),
    author_id: commentData.author_id,
    author_name: commentData.author_name || 'Resident',
    author_role: commentData.author_role || 'resident',
    author_avatar: commentData.author_avatar || '',
    content: commentData.content.trim(),
    parent_id: commentData.parent_id || null,
    reply_to_name: commentData.reply_to_name || null,
    is_official_response: !!commentData.is_official_response,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // 1. Immediately store in local cache
  const localList = getLocalComments();
  localList.push(newComment);
  saveLocalComments(localList);

  // 2. Broadcast immediately to any other active tabs/windows
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      const bc = new BroadcastChannel('zapatera_security_channel');
      bc.postMessage({
        type: 'BULLETIN_COMMENT_ADDED',
        comment: newComment,
        news_id: newComment.news_id,
      });
      bc.close();
    } catch {}
  }

  // 3. Persist to Supabase if table is available
  if (!shouldSkipRemote()) {
    try {
      const payload: any = {
        news_id: newComment.news_id,
        author_id: newComment.author_id || null,
        author_name: newComment.author_name,
        author_role: newComment.author_role,
        author_avatar: newComment.author_avatar || null,
        content: newComment.content,
        parent_id: newComment.parent_id || null,
        reply_to_name: newComment.reply_to_name || null,
        is_official_response: newComment.is_official_response,
        created_at: newComment.created_at,
        updated_at: newComment.updated_at,
      };

      const { data, error } = await supabase.from('bulletin_comments').insert([payload]).select();
      if (error) {
        handleRemoteError(error);
      } else if (data && data[0]) {
        isRemoteTableAvailable = true;
        const realComment = data[0];
        const updatedLocal = getLocalComments().map((c) => (c.id === newComment.id ? realComment : c));
        saveLocalComments(updatedLocal);
        return realComment;
      }
    } catch (err) {
      handleRemoteError(err);
    }
  }

  return newComment;
}

/**
 * Delete a comment (Admin / Author)
 */
export async function deleteBulletinComment(commentId: string, newsId?: string): Promise<boolean> {
  // Update local cache
  const all = getLocalComments().filter((c) => c.id !== commentId && c.parent_id !== commentId);
  saveLocalComments(all);

  // Broadcast deletion
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      const bc = new BroadcastChannel('zapatera_security_channel');
      bc.postMessage({
        type: 'BULLETIN_COMMENT_DELETED',
        commentId,
        news_id: newsId,
      });
      bc.close();
    } catch {}
  }

  if (!shouldSkipRemote()) {
    try {
      const { error } = await supabase.from('bulletin_comments').delete().eq('id', commentId);
      if (error) {
        handleRemoteError(error);
      }
    } catch (err) {
      handleRemoteError(err);
    }
  }

  return true;
}

/**
 * Subscribe in REAL TIME to comments on an announcement
 */
export function subscribeToBulletinComments(newsId: string, onUpdate: () => void): () => void {
  let channel: any = null;
  let broadcastChannel: BroadcastChannel | null = null;

  // 1. Supabase Realtime Subscription (only if remote table is enabled/available)
  if (!shouldSkipRemote()) {
    try {
      const channelId = `bulletin-comments-${String(newsId).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      channel = supabase
        .channel(channelId)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'bulletin_comments',
          },
          (payload: any) => {
            const row = payload.new || payload.old;
            if (row && (!row.news_id || String(row.news_id) === String(newsId))) {
              onUpdate();
            }
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('Realtime comment subscription error:', err);
    }
  }

  // 2. BroadcastChannel subscription for instantaneous local tab sync
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      broadcastChannel = new BroadcastChannel('zapatera_security_channel');
      broadcastChannel.onmessage = (event) => {
        if (
          event.data?.type === 'BULLETIN_COMMENT_ADDED' ||
          event.data?.type === 'BULLETIN_COMMENT_DELETED'
        ) {
          if (!event.data.news_id || String(event.data.news_id) === String(newsId)) {
            onUpdate();
          }
        }
      };
    } catch {}
  }

  // 3. Storage event listener for cross-tab sync
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      onUpdate();
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorage);
  }

  // Return unsubscribe cleanup handler
  return () => {
    if (channel) supabase.removeChannel(channel);
    if (broadcastChannel) broadcastChannel.close();
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorage);
    }
  };
}

export interface ResidentCommentHistoryItem {
  comment: BulletinComment;
  news_id: string;
  announcementTitle?: string;
  announcementDate?: string;
  replies: BulletinComment[];
  adminReplies: BulletinComment[];
  hasAdminReply: boolean;
}

/**
 * Fetch all comments and discussions started or participated in by a specific resident,
 * grouped with official admin/superadmin replies for easy tracking.
 */
export async function getUserCommentHistory(
  userId?: string,
  userName?: string
): Promise<ResidentCommentHistoryItem[]> {
  // 1. Get all local comments
  let allComments = getLocalComments();

  // 2. Fetch remote if available to ensure full history
  if (!shouldSkipRemote()) {
    try {
      const { data, error } = await supabase
        .from('bulletin_comments')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        isRemoteTableAvailable = true;
        const map = new Map<string, BulletinComment>();
        allComments.forEach((c) => map.set(c.id, c));
        data.forEach((c: any) => map.set(c.id, c));
        allComments = Array.from(map.values());
        saveLocalComments(allComments);
      }
    } catch {}
  }

  // Filter comments authored by this resident
  const userComments = allComments.filter((c) => {
    if (userId && c.author_id && String(c.author_id) === String(userId)) return true;
    if (userName && c.author_name?.trim().toLowerCase() === userName.trim().toLowerCase()) return true;
    return false;
  });

  // Group replies
  const historyItems: ResidentCommentHistoryItem[] = userComments.map((comment) => {
    // Find all replies to this comment
    const replies = allComments.filter((r) => r.parent_id === comment.id);
    const adminReplies = replies.filter(
      (r) => r.author_role === 'admin' || r.author_role === 'super_admin' || r.is_official_response
    );

    return {
      comment,
      news_id: comment.news_id,
      replies,
      adminReplies,
      hasAdminReply: adminReplies.length > 0,
    };
  });

  // Sort newest first
  return historyItems.sort(
    (a, b) => new Date(b.comment.created_at).getTime() - new Date(a.comment.created_at).getTime()
  );
}
