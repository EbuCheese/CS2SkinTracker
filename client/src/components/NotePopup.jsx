import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const NotePopup = ({ isOpen, onClose, note }) => {
  if (!isOpen || !note) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop with blur */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      ></div>
      
      {/* Modal content */}
      <div className="relative bg-gray-800 border border-gray-600 hover:border-orange-500/30 rounded-lg p-6 max-w-md w-full mx-4 max-h-96 overflow-y-auto transition-colors shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Item Note</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-gray-700/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="text-gray-300 whitespace-pre-wrap break-words leading-relaxed">
          {note}
        </div>
        <button
          onClick={onClose}
          className="w-full mt-4 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
        >
          Close
        </button>
      </div>
    </div>,
    document.body
  );
};

export default NotePopup;