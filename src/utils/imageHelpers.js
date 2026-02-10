// Image upload helper functions for Supabase Storage
import { supabase } from '../lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';

const BUCKET_NAME = 'profile-pictures';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Helper function to decode base64 to ArrayBuffer (no external dependency)
const base64ToArrayBuffer = (base64) => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

// Upload profile picture to Supabase Storage
export const uploadProfilePicture = async (userId, imageUri) => {
  try {
    // Get file extension from URI
    const uriParts = imageUri.split('.');
    const ext = uriParts[uriParts.length - 1]?.toLowerCase() || 'jpg';
    const validExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';
    const fileName = `${userId}_profile_${Date.now()}.${validExt}`;
    
    // Determine content type
    const contentType = validExt === 'png' ? 'image/png' : 
                       validExt === 'webp' ? 'image/webp' : 'image/jpeg';

    // Read file as base64 using expo-file-system
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: 'base64',
    });

    // Check approximate file size (base64 is ~4/3 of original)
    const approximateSize = (base64.length * 3) / 4;
    if (approximateSize > MAX_FILE_SIZE) {
      throw new Error('Image size exceeds 5MB limit');
    }

    // Convert base64 to ArrayBuffer using built-in function
    const arrayBuffer = base64ToArrayBuffer(base64);
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, arrayBuffer, {
        cacheControl: '3600',
        upsert: true,
        contentType,
      });
    
    if (error) throw error;
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);
    
    return { success: true, url: publicUrl };
  } catch (error) {
    console.error('Upload error:', error);
    return { success: false, error: error.message };
  }
};

// Delete profile picture from Supabase Storage
export const deleteProfilePicture = async (userId) => {
  try {
    // Try to remove all possible extensions
    const extensions = ['jpg', 'jpeg', 'png', 'webp'];
    
    for (const ext of extensions) {
      const fileName = `${userId}_profile.${ext}`;
      await supabase.storage.from(BUCKET_NAME).remove([fileName]);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Delete error:', error);
    return { success: false, error: error.message };
  }
};

// Get profile picture URL
export const getProfilePictureUrl = (userId, extension = 'jpg') => {
  const fileName = `${userId}_profile.${extension}`;
  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(fileName);
  return publicUrl;
};

// Validate image file
export const validateImage = (fileSize, fileType) => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (fileSize > MAX_FILE_SIZE) {
    return { valid: false, error: 'Image size must be less than 5MB' };
  }
  
  if (!validTypes.includes(fileType.toLowerCase())) {
    return { valid: false, error: 'Only JPG, PNG, and WEBP formats are supported' };
  }
  
  return { valid: true };
};
