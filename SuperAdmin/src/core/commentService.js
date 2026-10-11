// SuperAdmin/src/core/commentService.js
// Real-time comments & official replies service for Barangay Zapatera Bulletins (SuperAdmin)

import { supabase, isSupabaseConfigured } from './supabase';

const STORAGE_KEY = 'zapatera_bulletin_comments';

// Circuit breaker state to prevent spamming 404s when SQL migration has not been run in Supabase yet
let isRemoteTableAvailable = null;
let lastTableCheckTime = 0;
const CHECK_COOLDOWN_MS = 60000;
let hasLoggedMissingNotice = false;

function shouldSkipRemote() {
  if (!isSupabaseConfigured()) return true;
  if (isRemoteTableAvailable === false) {
    if (Date.now() - lastTableCheckTime > CHECK_COOLDOWN_MS) {
      return false; // Cooldown expired, allow 1 check
    }
    return true;
  }
  return false;
}

function handleRemoteError(err) {
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

function getLocalComments() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalComments(comments) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(comments));
  } catch (err) {
    console.warn('Could not save comments locally:', err);
  }
}

/**
 * Batch fetch comment counts for all announcements in ONE call (avoids N+1 query spam)
 */
export async function getBulletinCommentCounts(newsIds) {
  const counts = {};

  if (newsIds && Array.isArray(newsIds)) {
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
      const remoteCounts = {};
      data.forEach((row) => {
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
 * Fetch all comments for a specific bulletin
 */
export async function getBulletinComments(newsId) {
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
      const existingIds = new Set(data.map((c) => c.id));
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
 * Post an official reply or remark to a bulletin comment
 */
export async function postOfficialReply({
  news_id,
  adminUser,
  content,
  parent_id = null,
  reply_to_name = null,
}) {
  const newComment = {
    id: `cm-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    news_id: String(news_id),
    author_id: adminUser?.id || null,
    author_name: adminUser?.full_name || 'Barangay Administration',
    author_role: adminUser?.role === 'super_admin' ? 'super_admin' : 'admin',
    author_avatar: adminUser?.avatar_url || '',
    content: content.trim(),
    parent_id: parent_id || null,
    reply_to_name: reply_to_name || null,
    is_official_response: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // 1. Save locally
  const localList = getLocalComments();
  localList.push(newComment);
  saveLocalComments(localList);

  // 2. Broadcast immediately
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
      const payload = {
        news_id: newComment.news_id,
        author_id: newComment.author_id,
        author_name: newComment.author_name,
        author_role: newComment.author_role,
        author_avatar: newComment.author_avatar,
        content: newComment.content,
        parent_id: newComment.parent_id,
        reply_to_name: newComment.reply_to_name,
        is_official_response: true,
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
 * Delete a comment from bulletin
 */
export async function deleteBulletinComment(commentId, newsId) {
  const all = getLocalComments().filter((c) => c.id !== commentId && c.parent_id !== commentId);
  saveLocalComments(all);

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
 * Subscribe in real time to comments
 */
export function subscribeToBulletinComments(newsId, onUpdate) {
  let channel = null;
  let broadcastChannel = null;

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
          (payload) => {
            const row = payload.new || payload.old;
            if (row && (!row.news_id || String(row.news_id) === String(newsId))) {
              onUpdate();
            }
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('Realtime subscription error:', err);
    }
  }

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

  const handleStorage = (e) => {
    if (e.key === STORAGE_KEY) {
      onUpdate();
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorage);
  }

  return () => {
    if (channel) supabase.removeChannel(channel);
    if (broadcastChannel) broadcastChannel.close();
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorage);
    }
  };
}
