import React, { useState, useCallback } from 'react';

// A reusable image component that handles loading states, errors, and fallbacks.
const ImageWithLoading = ({
  src,
  alt,
  className = '',
  imageClassName = '',
  fallbackClassName = '',
  customFallback,
  onLoad,
  onError,
  lazy = true,
  spinnerColor = 'orange-500',
  spinnerSize = 'w-4 h-4'
}) => {
  // Track image loading and error states
  const [imageLoading, setImageLoading] = useState(!!src);
  const [imageError, setImageError] = useState(false);

  // Handle successful image load
  const handleImageLoad = useCallback((e) => {
    setImageLoading(false);
    setImageError(false);
    onLoad?.(e);
  }, [onLoad]);

  // Handle image load errors with fallback mechanism
  const handleImageError = useCallback((e) => {
    setImageLoading(false);
    setImageError(true);
    // Only set fallback SVG if we haven't already tried it (prevents infinite loop)
    if (!e.target.dataset.fallback) {
      e.target.dataset.fallback = 'true';
      // Base64 encoded SVG placeholder - gray background with circle and exclamation
      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiBmaWxsPSIjMzc0MTUxIi8+CjxwYXRoIGQ9Ik0yNCAzNkMzMC42Mjc0IDM2IDM2IDMwLjYyNzQgMzYgMjRDMzYgMTcuMzcyNiAzMC42Mjc0IDEyIDI0IDEyQzE3LjM3MjYgMTIgMTIgMTcuMzcyNiAxMiAyNEMxMiAzMC42Mjc0IDE3LjM3MjYgMzYgMjQgMzZaIiBzdHJva2U9IiM2QjczODAiIHN0cm9rZS13aWR0aD0iMiIvPgo8cGF0aCBkPSJNMjQgMjBWMjgiIHN0cm9rZT0iIzZCNzM4MCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4K';
    }
    onError?.(e);
  }, [onError]);

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Loading spinner - positioned absolutely but only shown when loading */}
      {imageLoading && !imageError && src && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
          <div className={`${spinnerSize} border-2 border-${spinnerColor} border-t-transparent rounded-full animate-spin`}></div>
        </div>
      )}

      {/* Main image element - always takes full space */}
      {src && !imageError && (
        <img
          src={src}
          alt={alt}
          className={`w-full h-full object-contain ${imageClassName}`}
          style={{ 
            opacity: imageLoading ? 0 : 1,
            transition: 'opacity 200ms ease-in-out'
          }}
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading={lazy ? 'lazy' : 'eager'}
        />
      )}

      {/* Fallback content when no src is provided or image failed to load */}
      {(!src || imageError) && !imageLoading && (
        <div className={`w-full h-full flex items-center justify-center bg-gray-700 ${fallbackClassName}`}>
          {customFallback || (
            <span className="text-xs font-medium text-white">
              {alt?.substring(0, 2)?.toUpperCase() || '??'}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageWithLoading;