// Treasurer/src/core/storageService.js
import { supabase, isSupabaseConfigured } from './supabase';

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

export const uploadTreasurerAvatar = async (userId, file) => {
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
