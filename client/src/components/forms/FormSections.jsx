// ItemSelection, SelectedItemDisplay, CraftNameInput, BuyPriceInput
import React, { useMemo } from 'react';
import { FileText } from 'lucide-react';
import { CSItemSearch } from '@/components/search';
import { VariantControls } from '@/components/forms';
import { VariantBadge } from './SharedFormComponents';

// Consolidate item selection logic
export const ItemSelectionSection = ({ 
  type, 
  searchType, 
  formData, 
  handleFormDataChange, 
  handleItemSelect, 
  handleSkinSelect,
  searchValue,
  onSearchChange,
  compact = false 
}) => {
  // Determine if we're working with crafts (special handling required)
  const isCrafts = type === 'Crafts';
  
  // Memoize the search component to prevent unnecessary re-renders
  // Different behavior for crafts vs standard items:
  // - Crafts: Search for base skins using 'liquids' type
  // - Standard: Search for items using the specified searchType
  const itemSearch = useMemo(() => (
    <CSItemSearch
      type={isCrafts ? 'liquids' : searchType}
      placeholder={isCrafts ? 'Search base skins...' : `Search ${type.toLowerCase()}...`}
      value={isCrafts ? formData.skin_name : (searchValue || formData.name)}
      onChange={isCrafts 
        ? (e) => handleFormDataChange('skin_name', e.target.value)
        : onSearchChange || ((e) => handleFormDataChange('name', e.target.value))
      }
      onSelect={isCrafts ? handleSkinSelect : handleItemSelect}
      className="w-full"
      showLargeView={true}
      maxResults={15}
      excludeSpecialItems={isCrafts} // Exclude special items for craft base selection
    />
  ), [type, searchType, formData, handleFormDataChange, handleItemSelect, handleSkinSelect, searchValue, onSearchChange, isCrafts]);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">
        {isCrafts ? 'Search Base Skin' : `Search ${type}`} <span className="text-red-400">*</span>
      </label>
      {itemSearch}
    </div>
  );
};

// Shows the currently selected item with image, name, variant controls, and notes section.
export const SelectedItemDisplay = ({ 
  formData, 
  type, 
  handleVariantChange, 
  handleFormDataChange,
  compact = false 
}) => {
  const isCrafts = type === 'Crafts';

  // For crafts, use skin_name; for standard items, use name
  const displayName = isCrafts ? formData.skin_name : formData.name;
  const displayImage = formData.image_url;
  
  // Don't render anything if no item is selected
  if (!displayName) return null;

  // Check if this is any music kit box (normal or StatTrak)
  const isMusicKitBox = displayName?.includes('Music Kit Box');
  const hasStatTrakInName = displayName?.includes('StatTrak™');

  return (
    <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
      <label className="block text-sm font-medium text-gray-300 mb-2">
        {isCrafts ? 'Selected Base Skin' : 'Selected Item'}
      </label>

      {/* Item preview with image and basic info */}
      <div className="flex items-center space-x-3 mb-3">
        {displayImage && (
          <img 
            src={displayImage} 
            alt={displayName}
            className="w-16 h-16 object-contain bg-gray-700 rounded"
          />
        )}
        <div className="flex-1">
          <p className="text-white font-medium">{displayName}</p>
          <p className="text-gray-400 text-sm">
            {isCrafts ? 'Base skin selected' : 'Ready to add'}
          </p>
          {/* Show current variant status (StatTrak/Souvenir) */}
          <VariantBadge 
            stattrak={formData.stattrak || hasStatTrakInName} 
            souvenir={formData.souvenir} 
          />
        </div>
      </div>
      
      {/* StatTrak/Souvenir variant controls - hide for all music kit boxes */}
      {!isMusicKitBox && (
        <VariantControls
          hasStatTrak={formData.hasStatTrak}
          hasSouvenir={formData.hasSouvenir}
          selectedVariant={formData.selectedVariant || formData.variant}
          onVariantChange={handleVariantChange}
          type={isCrafts ? "Skin" : "Item"}
        />
      )}
      
      {/* Notes section for additional item details */}
      <div className="border-t border-gray-600 pt-3 mt-3">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4" />
            <span>Notes (Optional)</span>
          </div>
        </label>
        <textarea
          placeholder={isCrafts 
            ? "Add craft details (e.g., 4x Katowice 2014, specific sticker placements, float value, etc.)"
            : "Add any additional details (e.g., 95% fade, 0.16 float, special stickers, etc.)"
          }
          value={formData.notes}
          onChange={(e) => handleFormDataChange('notes', e.target.value)}
          className={`w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none transition-colors resize-none ${
            compact ? 'text-sm' : ''
          }`}
          rows={compact ? 2 : 3}
          maxLength={300}
        />
        {/* Character count indicator */}
        <p className="text-gray-400 text-xs mt-1">{formData.notes.length}/300 characters</p>
      </div>
    </div>
  );
};

// Specialized input field for craft items to enter a custom craft name.
export const CraftNameInput = ({ formData, handleFormDataChange }) => (
  <div>
    <label className="block text-sm font-medium text-gray-300 mb-2">
      Custom Craft Name <span className="text-red-400">*</span>
    </label>
    <input
      type="text"
      placeholder="Enter your custom craft name"
      value={formData.name}
      onChange={(e) => handleFormDataChange('name', e.target.value)}
      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none transition-colors"
      required
      maxLength={100}
    />
    <p className="text-gray-400 text-xs mt-1">Give your craft a unique name</p>
  </div>
);

// Standardized price input field with currency symbol and validation.
export const BuyPriceInput = ({ formData, handleFormDataChange, compact = false }) => (
  <div>
    <label className="block text-sm font-medium text-gray-300 mb-2">
      Buy Price <span className="text-red-400">*</span>
    </label>
    <div className="relative">
      {/* Dollar sign prefix */}
      <span className={`absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 ${compact ? 'text-sm' : ''}`}>
        $
      </span>
      <input
        type="number"
        step="0.01"
        min="0.01"
        max="999999"
        placeholder="0.00"
        value={formData.buy_price}
        onChange={(e) => handleFormDataChange('buy_price', e.target.value)}
        className={`w-full pr-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none transition-colors ${
          compact 
            ? 'pl-7 py-2 text-sm' 
            : 'pl-8 py-3'
        }`}
        required
      />
    </div>
  </div>
);