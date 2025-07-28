import { useState, useCallback } from 'react';

// Hook for handling image upload, compression, and drag-and-drop functionality
export const useImageUpload = (dispatch, formData) => {
  const [uploadingImage, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Compresses image to specified dimensions and quality
  const compressImage = useCallback((file, maxWidth = 800, maxHeight = 600, quality = 0.8) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate aspect ratio to maintain proportions
        const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
        const width = Math.floor(img.width * ratio);
        const height = Math.floor(img.height * ratio);
        
        canvas.width = width;
        canvas.height = height;
        
        // Enable high-quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert canvas to blob with specified quality
        canvas.toBlob(resolve, 'image/jpeg', quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  }, []);

  // Converts blob to base64 data URL
  const blobToBase64 = useCallback((blob) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  }, []);

  // Processes uploaded image file with validation and compression
  const processImageFile = useCallback(async (file) => {
    // Validate file type and size (max 10MB)
    if (!file?.type.startsWith('image/') || file.size > 10 * 1024 * 1024) {
      alert(!file?.type.startsWith('image/') ? 'Please select a valid image file' : 'Image must be less than 10MB');
      return;
    }
    
    try {
      setIsUploading(true);
      
      // Initial compression with 80% quality
      let quality = 0.8;
      let compressedBlob = await compressImage(file, 800, 600, quality);
      
      // If still too large (>200KB), compress further
      if (compressedBlob.size > 200 * 1024) {
        quality = 0.6;
        compressedBlob = await compressImage(file, 600, 450, quality);
      }
      
      // Convert to base64 and update form state
      const base64 = await blobToBase64(compressedBlob);
      dispatch({
        type: 'SET_ITEM_SELECTED',
        payload: {
          custom_image_url: base64,
          image_url: base64,
          // Preserve base image URL if it exists
          ...(formData.base_image_url && { base_image_url: formData.base_image_url })
        }
      });
      
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Error processing image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }, [compressImage, blobToBase64, formData.base_image_url, dispatch]);

  // Drag and drop event handlers
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      await processImageFile(file);
    }
  }, [processImageFile]);

  // File input change handler
  const handleImageUpload = useCallback(async (e) => {
    const file = e.target.files[0];
    await processImageFile(file);
  }, [processImageFile]);

  // Removes custom uploaded image and reverts to base image
  const handleRemoveImage = useCallback(() => {
    dispatch({ 
      type: 'SET_ITEM_SELECTED',
      payload: {
        custom_image_url: '',
        // Revert to base image URL if available
        image_url: formData.base_image_url || ''
      }
    });
  }, [formData.base_image_url, dispatch]);

  return {
    uploadingImage,
    isDragOver,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleImageUpload,
    handleRemoveImage
  };
};