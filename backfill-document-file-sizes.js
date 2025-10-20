/**
 * Backfill Script: Populate file_size for existing documents
 * 
 * This script:
 * 1. Fetches all documents from the documents table
 * 2. For each document, retrieves the file size from storage.objects.metadata
 * 3. Updates the documents table with the correct file size
 * 
 * Usage: node backfill-document-file-sizes.js
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase credentials');
  console.error('Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Extract file path from document URL
 */
function extractFilePath(url) {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/documents/');
    return pathParts.length > 1 ? pathParts[1] : null;
  } catch (error) {
    console.error('Error parsing URL:', url, error);
    return null;
  }
}

/**
 * Get file size from storage metadata
 */
async function getFileSizeFromStorage(filePath) {
  try {
    // List the file to get its metadata
    const { data, error } = await supabase
      .storage
      .from('documents')
      .list(filePath.substring(0, filePath.lastIndexOf('/')), {
        search: filePath.substring(filePath.lastIndexOf('/') + 1)
      });

    if (error) {
      console.error('Storage error:', error);
      return null;
    }

    if (data && data.length > 0) {
      return data[0].metadata?.size || null;
    }

    return null;
  } catch (error) {
    console.error('Error getting file size from storage:', error);
    return null;
  }
}

/**
 * Alternative method: Query storage.objects directly for file size
 */
async function getFileSizeFromStorageTable(filePath) {
  try {
    const { data, error } = await supabase
      .rpc('get_storage_object_metadata', { file_path: filePath });

    if (error) {
      // Try direct SQL query if RPC doesn't exist
      const { data: objectData, error: queryError } = await supabase
        .from('storage.objects')
        .select('metadata')
        .eq('bucket_id', 'documents')
        .eq('name', filePath)
        .single();

      if (queryError) {
        console.error('Query error:', queryError);
        return null;
      }

      return objectData?.metadata?.size || null;
    }

    return data?.size || null;
  } catch (error) {
    console.error('Error querying storage table:', error);
    return null;
  }
}

/**
 * Main backfill function
 */
async function backfillDocumentFileSizes() {
  console.log('🚀 Starting file size backfill process...\n');

  try {
    // Fetch all documents that need file size updates (where file_size is 0 or null)
    const { data: documents, error: fetchError } = await supabase
      .from('documents')
      .select('id, name, url, file_size')
      .or('file_size.is.null,file_size.eq.0')
      .not('name', 'like', '[DELETED]%'); // Skip deleted documents

    if (fetchError) {
      console.error('❌ Error fetching documents:', fetchError);
      return;
    }

    console.log(`📄 Found ${documents.length} documents to process\n`);

    if (documents.length === 0) {
      console.log('✅ No documents need updating. All file sizes are already set!');
      return;
    }

    let successCount = 0;
    let errorCount = 0;
    let notFoundCount = 0;

    // Process each document
    for (const doc of documents) {
      const filePath = extractFilePath(doc.url);
      
      if (!filePath) {
        console.log(`⚠️  Could not extract file path from URL: ${doc.name}`);
        errorCount++;
        continue;
      }

      console.log(`Processing: ${doc.name}`);
      console.log(`  File path: ${filePath}`);

      // Try to get file size from storage using SQL
      const { data: storageData, error: storageError } = await supabase
        .from('storage.objects')
        .select('metadata')
        .eq('bucket_id', 'documents')
        .eq('name', filePath)
        .maybeSingle();

      if (storageError) {
        console.log(`  ❌ Error querying storage: ${storageError.message}`);
        errorCount++;
        continue;
      }

      if (!storageData) {
        console.log(`  ⚠️  File not found in storage (may have been deleted)`);
        notFoundCount++;
        continue;
      }

      const fileSize = storageData.metadata?.size || storageData.metadata?.contentLength;

      if (!fileSize) {
        console.log(`  ⚠️  File size not available in metadata`);
        notFoundCount++;
        continue;
      }

      // Update the document with the file size
      const { error: updateError } = await supabase
        .from('documents')
        .update({ file_size: fileSize })
        .eq('id', doc.id);

      if (updateError) {
        console.log(`  ❌ Error updating document: ${updateError.message}`);
        errorCount++;
      } else {
        console.log(`  ✅ Updated with size: ${formatFileSize(fileSize)}`);
        successCount++;
      }

      console.log('');
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 BACKFILL SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully updated: ${successCount}`);
    console.log(`⚠️  Not found in storage: ${notFoundCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📄 Total processed: ${documents.length}`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Unexpected error during backfill:', error);
  }
}

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Run the backfill
backfillDocumentFileSizes()
  .then(() => {
    console.log('✅ Backfill process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Backfill process failed:', error);
    process.exit(1);
  });

