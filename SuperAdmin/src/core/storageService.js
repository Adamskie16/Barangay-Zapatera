// SuperAdmin/src/core/storageService.js
import { supabase, isSupabaseConfigured } from './supabase';

export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 KB';
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const sanitizeFileName = (name) => {
  const clean = name.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase();
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  const parts = clean.split('.');
  if (parts.length > 1) {
    const ext = parts.pop();
    return `${parts.join('_')}_${timestamp}_${randomSuffix}.${ext}`;
  }
  return `${clean}_${timestamp}_${randomSuffix}`;
};

export const uploadSuperAdminAvatar = async (userId, file) => {
  if (!file) return { success: false, error: 'No file provided' };

  const sanitized = sanitizeFileName(file.name || 'avatar.jpg');
  const storagePath = `avatars/${userId}/${sanitized}`;

  if (!isSupabaseConfigured()) {
    return {
      success: true,
      url: typeof URL !== 'undefined' ? URL.createObjectURL(file) : '',
      path: storagePath,
    };
  }

  try {
    const { data, error } = await supabase.storage
      .from('public_assets')
      .upload(storagePath, file, {
        contentType: file.type || 'image/jpeg',
        upsert: true,
      });

    if (error) {
      return { success: false, error: error.message };
    }

    const { data: publicUrlData } = supabase.storage
      .from('public_assets')
      .getPublicUrl(data.path);

    return {
      success: true,
      url: publicUrlData?.publicUrl,
      path: data.path,
    };
  } catch (err) {
    return { success: false, error: err?.message || 'Upload failed' };
  }
};

export const getSignedAttachmentUrl = async (storagePath, expiresIn = 3600) => {
  if (!isSupabaseConfigured() || !storagePath) return null;
  try {
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(storagePath, expiresIn);

    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
};

export const downloadStoredAttachment = async (storagePath, downloadFileName) => {
  if (!isSupabaseConfigured() || !storagePath) {
    alert('Storage not configured or invalid file path.');
    return;
  }

  try {
    const { data, error } = await supabase.storage
      .from('documents')
      .download(storagePath);

    if (error || !data) {
      const signedUrl = await getSignedAttachmentUrl(storagePath, 60);
      if (signedUrl) {
        window.open(signedUrl, '_blank');
        return;
      }
      alert(`Download failed: ${error?.message || 'File not accessible'}`);
      return;
    }

    const blobUrl = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = downloadFileName || storagePath.split('/').pop() || 'attachment';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  } catch (err) {
    alert(`Download failed: ${err?.message || 'Unknown error'}`);
  }
};
