// components/ui/ImageModal.jsx
import React from 'react';
import { X } from 'lucide-react';

const ImagePopupModal = ({ isOpen, onClose, imageUrl, itemName }) => {
  if (!isOpen) return null;

      return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[9998] bg-black/70 backdrop-blur-md"
        onClick={onClose}
      />
      
      {/* Modal content */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="relative max-w-2xl w-full pointer-events-auto flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Image container with close button inside */}
          <div className="relative bg-gradient-to-br from-gray-900 to-slate-900 rounded-t-xl p-3 shadow-2xl border border-slate-700/50 border-b-0 flex-1 min-h-0">
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-2 right-2 z-10 text-white hover:text-orange-400 transition-all duration-200 bg-black/60 hover:bg-black/80 rounded-full p-2 backdrop-blur-sm shadow-lg"
              aria-label="Close image"
            >
              <X className="w-5 h-5" />
            </button>
            
            <img
              src={imageUrl}
              alt={itemName}
              className="w-full h-full object-contain rounded-lg"
            />
          </div>
          
          {/* Item name */}
          {itemName && (
            <div className="bg-gradient-to-br from-gray-900 to-slate-900 rounded-b-xl px-6 py-4 shadow-2xl border border-slate-700/50 border-t-0">
              <p className="text-white text-center font-medium text-lg">
                {itemName}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ImagePopupModal;