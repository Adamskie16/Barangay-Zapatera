// Resident/src/core/storageService.ts
import { supabase, isSupabaseConfigured } from './supabase';

export interface FileUploadOptions {
  bucket?: 'documents' | 'public_assets';
  maxSizeBytes?: number;
  allowedMimeTypes?: string[];
  onProgress?: (percent: number) => void;
  upsert?: boolean;
}

export interface StoredFileResult {
  success: boolean;
  bucket: string;
  storagePath: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileSizeFormatted: string;
  fileUrl?: string;
  signedUrl?: string;
  error?: string;
}

const DEFAULT_DOC_ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const DEFAULT_AVATAR_ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

/**
 * Format bytes to human readable format (KB, MB)
 */
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 KB';
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Sanitize filename to prevent directory traversal & collision
 */
export function sanitizeFileName(name: string): string {
  const clean = name.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase();
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  const parts = clean.split('.');
  if (parts.length > 1) {
    const ext = parts.pop();
    return `${parts.join('_')}_${timestamp}_${randomSuffix}.${ext}`;
  }
  return `${clean}_${timestamp}_${randomSuffix}`;
}

/**
 * Validate a file against size and MIME type limits
 */
export function validateFile(
  file: File | Blob,
  fileName: string,
  options: { maxSizeBytes?: number; allowedMimeTypes?: string[] } = {}
): { valid: boolean; error?: string } {
  const maxSize = options.maxSizeBytes || 10 * 1024 * 1024; // 10MB
  const allowedTypes = options.allowedMimeTypes || DEFAULT_DOC_ALLOWED_TYPES;

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File is too large (${formatFileSize(file.size)}). Maximum allowed size is ${formatFileSize(maxSize)}.`,
    };
  }

  const mime = file.type || '';
  const isAllowedMime = allowedTypes.includes(mime);
  const ext = fileName.split('.').pop()?.toLowerCase();
  const isAllowedExt = ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'doc', 'docx'].includes(ext || '');

  if (!isAllowedMime && !isAllowedExt) {
    return {
      valid: false,
      error: `File type not supported. Allowed formats: JPG, PNG, WebP, PDF, DOC, DOCX.`,
    };
  }

  return { valid: true };
}

/**
 * Upload a requirement document to Supabase Storage ('documents' private bucket)
 */
export async function uploadResidentRequirementFile(
  userId: string,
  requirementName: string,
  file: File | Blob,
  originalFileName: string,
  options: FileUploadOptions = {}
): Promise<StoredFileResult> {
  const validation = validateFile(file, originalFileName, options);
  if (!validation.valid) {
    return {
      success: false,
      bucket: 'documents',
      storagePath: '',
      fileName: originalFileName,
      fileType: file.type || 'application/octet-stream',
      fileSize: file.size,
      fileSizeFormatted: formatFileSize(file.size),
      error: validation.error,
    };
  }

  const sanitized = sanitizeFileName(originalFileName);
  const safeReqFolder = requirementName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  const storagePath = `${userId}/requirements/${safeReqFolder}/${sanitized}`;

  if (!isSupabaseConfigured()) {
    // Fallback: Offline Mock URL
    return {
      success: true,
      bucket: 'documents',
      storagePath,
      fileName: originalFileName,
      fileType: file.type || 'application/pdf',
      fileSize: file.size,
      fileSizeFormatted: formatFileSize(file.size),
      fileUrl: typeof URL !== 'undefined' ? URL.createObjectURL(file) : undefined,
    };
  }

  try {
    const { data, error } = await supabase.storage
      .from('documents')
      .upload(storagePath, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: options.upsert !== false,
      });

    if (error) {
      console.error('Supabase Storage Upload Error:', error);
      return {
        success: false,
        bucket: 'documents',
        storagePath: '',
        fileName: originalFileName,
        fileType: file.type || 'application/octet-stream',
        fileSize: file.size,
        fileSizeFormatted: formatFileSize(file.size),
        error: error.message || 'Failed to upload document to secure storage.',
      };
    }

    // Generate signed URL (expires in 1 hour) for immediate UI display
    let signedUrl = '';
    const { data: signedData } = await supabase.storage
      .from('documents')
      .createSignedUrl(data.path, 3600);
    if (signedData?.signedUrl) {
      signedUrl = signedData.signedUrl;
    }

    return {
      success: true,
      bucket: 'documents',
      storagePath: data.path,
      fileName: originalFileName,
      fileType: file.type || 'application/octet-stream',
      fileSize: file.size,
      fileSizeFormatted: formatFileSize(file.size),
      fileUrl: signedUrl || (typeof URL !== 'undefined' ? URL.createObjectURL(file) : undefined),
      signedUrl,
    };
  } catch (err: any) {
    return {
      success: false,
      bucket: 'documents',
      storagePath: '',
      fileName: originalFileName,
      fileType: file.type || 'application/octet-stream',
      fileSize: file.size,
      fileSizeFormatted: formatFileSize(file.size),
      error: err?.message || 'An unexpected error occurred during upload.',
    };
  }
}

/**
 * Upload User Profile Avatar to Supabase Storage ('public_assets' bucket)
 */
export async function uploadUserAvatar(
  userId: string,
  file: File | Blob,
  originalFileName: string
): Promise<StoredFileResult> {
  const validation = validateFile(file, originalFileName, {
    maxSizeBytes: 5 * 1024 * 1024,
    allowedMimeTypes: DEFAULT_AVATAR_ALLOWED_TYPES,
  });

  if (!validation.valid) {
    return {
      success: false,
      bucket: 'public_assets',
      storagePath: '',
      fileName: originalFileName,
      fileType: file.type || 'image/jpeg',
      fileSize: file.size,
      fileSizeFormatted: formatFileSize(file.size),
      error: validation.error,
    };
  }

  const sanitized = sanitizeFileName(originalFileName);
  const storagePath = `avatars/${userId}/${sanitized}`;

  if (!isSupabaseConfigured()) {
    return {
      success: true,
      bucket: 'public_assets',
      storagePath,
      fileName: originalFileName,
      fileType: file.type || 'image/jpeg',
      fileSize: file.size,
      fileSizeFormatted: formatFileSize(file.size),
      fileUrl: typeof URL !== 'undefined' ? URL.createObjectURL(file) : undefined,
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
      return {
        success: false,
        bucket: 'public_assets',
        storagePath: '',
        fileName: originalFileName,
        fileType: file.type || 'image/jpeg',
        fileSize: file.size,
        fileSizeFormatted: formatFileSize(file.size),
        error: error.message || 'Failed to upload avatar.',
      };
    }

    const { data: publicUrlData } = supabase.storage
      .from('public_assets')
      .getPublicUrl(data.path);

    return {
      success: true,
      bucket: 'public_assets',
      storagePath: data.path,
      fileName: originalFileName,
      fileType: file.type || 'image/jpeg',
      fileSize: file.size,
      fileSizeFormatted: formatFileSize(file.size),
      fileUrl: publicUrlData?.publicUrl,
    };
  } catch (err: any) {
    return {
      success: false,
      bucket: 'public_assets',
      storagePath: '',
      fileName: originalFileName,
      fileType: file.type || 'image/jpeg',
      fileSize: file.size,
      fileSizeFormatted: formatFileSize(file.size),
      error: err?.message || 'Avatar upload failed.',
    };
  }
}

/**
 * Get signed URL for secure viewing/downloading of private files
 */
export async function getSignedFileUrl(
  bucket: string,
  storagePath: string,
  expiresInSeconds: number = 3600
): Promise<string | null> {
  if (!isSupabaseConfigured() || !storagePath) return null;
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(storagePath, expiresInSeconds);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteStoredFile(
  bucket: string,
  storagePath: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured() || !storagePath) {
    return { success: true };
  }
  try {
    const { error } = await supabase.storage.from(bucket).remove([storagePath]);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Delete operation failed' };
  }
}

/**
 * Replace a file in Supabase Storage cleanly without leaving orphaned files
 */
export async function replaceStoredFile(
  bucket: string,
  oldStoragePath: string | null | undefined,
  userId: string,
  requirementName: string,
  newFile: File | Blob,
  originalFileName: string
): Promise<StoredFileResult> {
  // 1. Upload new file
  const uploadResult = await uploadResidentRequirementFile(
    userId,
    requirementName,
    newFile,
    originalFileName
  );

  // 2. If upload succeeded and there was an old file, clean up old file
  if (uploadResult.success && oldStoragePath && oldStoragePath !== uploadResult.storagePath) {
    await deleteStoredFile(bucket, oldStoragePath);
  }

  return uploadResult;
}
