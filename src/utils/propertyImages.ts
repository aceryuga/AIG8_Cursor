import { supabase } from '../lib/supabase';

export interface PropertyImage {
  id: string;
  property_id: string;
  image_url: string;
  image_name: string;
  image_size?: number;
  image_type?: string;
  is_primary: boolean;
  created_at: string;
}

/**
 * Fetch all images for a property
 */
export const fetchPropertyImages = async (propertyId: string): Promise<PropertyImage[]> => {
  try {
    const { data, error } = await supabase
      .from('property_images')
      .select('*')
      .eq('property_id', propertyId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching property images:', error);
    throw error;
  }
};

/**
 * Upload an image to Supabase storage and create database record
 */
export const uploadPropertyImage = async (
  file: File,
  propertyId: string,
  onProgress?: (progress: number) => void
): Promise<PropertyImage> => {
  try {
    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${propertyId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    
    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('property-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw uploadError;
    }

    onProgress?.(50);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('property-images')
      .getPublicUrl(fileName);

    onProgress?.(75);

    // Check if this is the first image for the property
    const { data: existingImages } = await supabase
      .from('property_images')
      .select('id')
      .eq('property_id', propertyId)
      .limit(1);

    const isFirstImage = !existingImages || existingImages.length === 0;

    // Insert record into database
    const { data: insertData, error: insertError } = await supabase
      .from('property_images')
      .insert({
        property_id: propertyId,
        image_url: urlData.publicUrl,
        image_name: file.name,
        image_size: file.size,
        image_type: file.type,
        is_primary: isFirstImage
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    onProgress?.(100);
    return insertData;
  } catch (error) {
    console.error('Error uploading property image:', error);
    throw error;
  }
};

/**
 * Delete an image from both storage and database
 */
export const deletePropertyImage = async (imageId: string, imageUrl: string): Promise<void> => {
  try {
    // Extract file path from URL for storage deletion
    const urlParts = imageUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];
    const propertyId = urlParts[urlParts.length - 2];
    const filePath = `${propertyId}/${fileName}`;

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('property-images')
      .remove([filePath]);

    if (storageError) {
      console.warn('Error deleting from storage:', storageError);
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('property_images')
      .delete()
      .eq('id', imageId);

    if (dbError) {
      throw dbError;
    }
  } catch (error) {
    console.error('Error deleting property image:', error);
    throw error;
  }
};

/**
 * Set an image as the primary image for a property
 */
export const setPrimaryImage = async (imageId: string): Promise<void> => {
  try {
    // First, get the property_id from the image
    const { data: imageData, error: fetchError } = await supabase
      .from('property_images')
      .select('property_id')
      .eq('id', imageId)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    // Unset all other primary images for this property
    const { error: unsetError } = await supabase
      .from('property_images')
      .update({ is_primary: false })
      .eq('property_id', imageData.property_id);

    if (unsetError) {
      throw unsetError;
    }

    // Set this image as primary
    const { error: setError } = await supabase
      .from('property_images')
      .update({ is_primary: true })
      .eq('id', imageId);

    if (setError) {
      throw setError;
    }
  } catch (error) {
    console.error('Error setting primary image:', error);
    throw error;
  }
};

/**
 * Format file size in human-readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Validate image file
 */
export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Only image files (JPEG, PNG, WebP, GIF) are allowed'
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File size must be less than 10MB'
    };
  }

  return { valid: true };
};
