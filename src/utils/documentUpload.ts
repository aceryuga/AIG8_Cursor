import { supabase } from '../lib/supabase';

export interface DocumentMetadata {
  id: string;
  lease_id?: string;
  property_id?: string;
  tenant_id?: string;
  name: string;
  url: string;
  doc_type?: string;
  uploaded_by?: string;
  uploaded_at?: string;
}

export interface UploadProgress {
  fileId: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
}

/**
 * Upload a file to Supabase Storage documents bucket
 */
export const uploadDocumentToStorage = async (
  file: File,
  propertyId?: string
): Promise<{ url: string; path: string }> => {
  try {
    // Generate unique file path
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const filePath = propertyId ? `${propertyId}/${fileName}` : `general/${fileName}`;

    // Upload file to Supabase Storage
    const { error } = await supabase.storage
      .from('documents')
      .upload(filePath, file);

    if (error) {
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath);

    return {
      url: urlData.publicUrl,
      path: filePath
    };
  } catch (error) {
    console.error('Error uploading document:', error);
    throw error;
  }
};

/**
 * Save document metadata to the documents table
 */
export const saveDocumentMetadata = async (
  metadata: Omit<DocumentMetadata, 'id' | 'uploaded_at'>
): Promise<DocumentMetadata> => {
  try {
    const { data, error } = await supabase
      .from('documents')
      .insert(metadata)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error saving document metadata:', error);
    throw error;
  }
};

/**
 * Upload document with metadata
 */
export const uploadDocument = async (
  file: File,
  propertyId?: string,
  leaseId?: string,
  tenantId?: string,
  docType?: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<DocumentMetadata> => {
  try {
    // Upload file to storage
    const { url } = await uploadDocumentToStorage(file, propertyId);

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Save metadata
    const metadata = await saveDocumentMetadata({
      name: file.name,
      url,
      property_id: propertyId,
      lease_id: leaseId,
      tenant_id: tenantId,
      doc_type: docType,
      uploaded_by: user.id
    });

    return metadata;
  } catch (error) {
    console.error('Error uploading document:', error);
    throw error;
  }
};

/**
 * Fetch documents for a property
 */
export const fetchPropertyDocuments = async (propertyId: string): Promise<DocumentMetadata[]> => {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('property_id', propertyId)
      .not('name', 'like', '[DELETED]%') // Filter out soft-deleted documents
      .order('uploaded_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching property documents:', error);
    throw error;
  }
};

/**
 * Fetch all documents for a user
 */
export const fetchUserDocuments = async (): Promise<DocumentMetadata[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('uploaded_by', user.id)
      .not('name', 'like', '[DELETED]%') // Filter out soft-deleted documents
      .order('uploaded_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching user documents:', error);
    throw error;
  }
};

/**
 * Delete document from storage and database
 */
export const deleteDocument = async (documentId: string, filePath: string): Promise<void> => {
  try {
    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('documents')
      .remove([filePath]);

    if (storageError) {
      console.warn('Error deleting from storage:', storageError);
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId);

    if (dbError) {
      throw dbError;
    }
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
};

/**
 * Update document metadata
 */
export const updateDocumentMetadata = async (
  documentId: string,
  updates: Partial<Pick<DocumentMetadata, 'name' | 'doc_type'>>
): Promise<DocumentMetadata> => {
  try {
    const { data, error } = await supabase
      .from('documents')
      .update(updates)
      .eq('id', documentId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error updating document metadata:', error);
    throw error;
  }
};

/**
 * Soft delete a document (removes from storage but keeps record in database)
 */
export const softDeleteDocument = async (documentId: string): Promise<void> => {
  try {
    // First, get the document to get the file path and name
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('url, name')
      .eq('id', documentId)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    // Extract file path from URL
    console.log('🔍 Debug - Original document URL:', document.url);
    const url = new URL(document.url);
    console.log('🔍 Debug - Parsed URL pathname:', url.pathname);
    
    const filePath = url.pathname.split('/').pop(); // Get the file name
    console.log('🔍 Debug - Extracted file path (filename only):', filePath);
    
    // Try to extract full path (everything after /documents/)
    const pathParts = url.pathname.split('/documents/');
    const fullPath = pathParts.length > 1 ? pathParts[1] : null;
    console.log('🔍 Debug - Extracted full path:', fullPath);

    if (fullPath) {
      console.log('🔍 Debug - Attempting to delete from storage with full path:', fullPath);
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([fullPath]);

      if (storageError) {
        console.warn('❌ Error deleting file from storage:', storageError);
        // Continue with database update even if storage deletion fails
      } else {
        console.log('✅ Successfully deleted file from storage');
      }
    } else {
      console.warn('⚠️ No file path extracted, skipping storage deletion');
    }

    // Update the document record to mark as deleted (set name to indicate deletion)
    const { error: updateError } = await supabase
      .from('documents')
      .update({ 
        name: `[DELETED] ${document.name}` // Mark as deleted by prefixing name
      })
      .eq('id', documentId);

    if (updateError) {
      throw updateError;
    }

  } catch (error) {
    console.error('Error soft deleting document:', error);
    throw error;
  }
};
