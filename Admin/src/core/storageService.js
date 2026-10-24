// Admin/src/core/storageService.js
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

/**
 * Convert an image file into a compact, persistent Data URL (resized up to 320x320)
 * so avatars always persist in localStorage and profiles.avatar_url even if bucket RLS blocks upload.
 */
export const fileToCompressedDataUrl = (file, maxDim = 320, quality = 0.85) =>
  new Promise((resolve) => {
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const rawDataUrl = e.target?.result || '';
        if (typeof Image === 'undefined' || typeof document === 'undefined') {
          resolve(rawDataUrl);
          return;
        }
        const img = new Image();
        img.onload = () => {
          try {
            let width = img.width || maxDim;
            let height = img.height || maxDim;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              const compressed = canvas.toDataURL('image/jpeg', quality);
              resolve(compressed || rawDataUrl);
            } else {
              resolve(rawDataUrl);
            }
          } catch {
            resolve(rawDataUrl);
          }
        };
        img.onerror = () => resolve(rawDataUrl);
        img.src = rawDataUrl;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    } catch {
      resolve('');
    }
  });

/**
 * Upload an admin avatar to Supabase Storage ('avatars' or 'public_assets') with automatic DataURL fallback
 */
export const uploadAdminAvatar = async (userId, file) => {
  if (!file) return { success: false, error: 'No file provided' };

  const sanitized = sanitizeFileName(file.name || 'avatar.jpg');
  const storagePath = `avatars/${userId || 'admin'}/${sanitized}`;
  const fallbackDataUrl = await fileToCompressedDataUrl(file);

  if (!isSupabaseConfigured()) {
    return {
      success: true,
      url: fallbackDataUrl || (typeof URL !== 'undefined' ? URL.createObjectURL(file) : ''),
      path: storagePath,
    };
  }

  try {
    let bucketName = 'avatars';
    let targetPath = `${userId || 'admin'}/${sanitized}`;

    let { data, error } = await supabase.storage
      .from('avatars')
      .upload(targetPath, file, {
        contentType: file.type || 'image/jpeg',
        upsert: true,
      });

    if (error) {
      bucketName = 'public_assets';
      targetPath = storagePath;
      const fallbackUpload = await supabase.storage
        .from('public_assets')
        .upload(targetPath, file, {
          contentType: file.type || 'image/jpeg',
          upsert: true,
        });
      data = fallbackUpload.data;
      error = fallbackUpload.error;
    }

    if (error || !data?.path) {
      if (fallbackDataUrl) {
        return {
          success: true,
          url: fallbackDataUrl,
          path: storagePath,
        };
      }
      return { success: false, error: error?.message || 'Upload failed' };
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(data.path);

    return {
      success: true,
      url: publicUrlData?.publicUrl || fallbackDataUrl,
      path: data.path,
    };
  } catch (err) {
    if (fallbackDataUrl) {
      return {
        success: true,
        url: fallbackDataUrl,
        path: storagePath,
      };
    }
    return { success: false, error: err?.message || 'Upload failed' };
  }
};

/**
 * Upload an announcement / news bulletin banner to public_assets bucket
 */
export const uploadNewsBanner = async (file) => {
  if (!file) return { success: false, error: 'No file provided' };

  const sanitized = sanitizeFileName(file.name || 'news_banner.jpg');
  const storagePath = `news/${sanitized}`;

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
      console.warn('Supabase storage upload error:', error.message);
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
    console.warn('Supabase storage exception:', err);
    return { success: false, error: err?.message || 'Upload failed' };
  }
};

/**
 * Generate a signed URL for viewing private resident requirement documents
 */
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

/**
 * Download an attachment file from Supabase Storage
 */
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
      // Try fallback to signed URL download
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
