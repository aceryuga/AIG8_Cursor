/**
 * Bank Statement Upload Utilities
 * Handles file uploads to Supabase storage with validation and error handling
 */

import { supabase } from '../lib/supabase';

const BUCKET_NAME = 'bank-statements';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
const ALLOWED_MIME_TYPES = ['text/csv', 'application/vnd.ms-excel', 'text/plain', 'application/csv'];
const ALLOWED_EXTENSIONS = ['.csv', '.txt'];

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  success: boolean;
  filePath?: string;
  fileUrl?: string;
  error?: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate file before upload
 */
export function validateBankStatementFile(file: File): ValidationResult {
  // Check file exists
  if (!file) {
    return { valid: false, error: 'No file selected' };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    return { 
      valid: false, 
      error: `File is too large (${sizeMB}MB). Maximum allowed size is 10MB.` 
    };
  }

  // Check file size is not zero
  if (file.size === 0) {
    return { valid: false, error: 'File is empty' };
  }

  // Check file extension
  const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return { 
      valid: false, 
      error: `Invalid file type. Only CSV files are allowed. Got: ${extension}` 
    };
  }

  // Check MIME type (if available)
  if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
    return { 
      valid: false, 
      error: `Invalid file format. Expected CSV, got: ${file.type}` 
    };
  }

  return { valid: true };
}

/**
 * Generate storage path for bank statement file
 * Format: {user_id}/{timestamp}_{sanitized_filename}
 */
export function generateFilePath(userId: string, filename: string): string {
  // Sanitize filename - remove special characters, keep only alphanumeric, dots, and hyphens
  const sanitizedFilename = filename
    .replace(/[^a-zA-Z0-9.\-_]/g, '_')
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .substring(0, 100); // Limit filename length

  const timestamp = Date.now();
  return `${userId}/${timestamp}_${sanitizedFilename}`;
}

/**
 * Upload bank statement file to Supabase storage
 */
export async function uploadBankStatement(
  userId: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  try {
    // Validate file first
    const validation = validateBankStatementFile(file);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Generate file path
    const filePath = generateFilePath(userId, file.name);

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false // Don't overwrite existing files
      });

    if (error) {
      console.error('Storage upload error:', error);
      
      // Handle specific error cases
      if (error.message.includes('already exists')) {
        return { 
          success: false, 
          error: 'A file with this name was already uploaded. Please wait a moment and try again.' 
        };
      }
      
      if (error.message.includes('Bucket not found')) {
        return { 
          success: false, 
          error: 'Storage configuration error. Please contact support.' 
        };
      }

      return { 
        success: false, 
        error: `Upload failed: ${error.message}` 
      };
    }

    // Get public URL (even though bucket is private, we need the path for internal use)
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return {
      success: true,
      filePath: data.path,
      fileUrl: urlData.publicUrl
    };
  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown upload error'
    };
  }
}

/**
 * Delete bank statement file from storage
 */
export async function deleteBankStatement(filePath: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.error('Storage delete error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Delete error:', error);
    return false;
  }
}

/**
 * Read CSV file content as text
 */
export async function readFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const content = event.target?.result as string;
      resolve(content);
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Get file extension
 */
export function getFileExtension(filename: string): string {
  return filename.slice(filename.lastIndexOf('.')).toLowerCase();
}

/**
 * Check if file is CSV
 */
export function isCSVFile(file: File): boolean {
  const extension = getFileExtension(file.name);
  const mimeType = file.type;
  
  return (
    extension === '.csv' || 
    ALLOWED_MIME_TYPES.includes(mimeType)
  );
}

