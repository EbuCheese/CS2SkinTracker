import React, { useState } from 'react';
import { X, Upload, Plus, Minus, Loader2, FileText } from 'lucide-react';
import { supabase } from '../supabaseClient';
import CSItemSearch from './CSItemSearch';

const AddItemForm = ({ type, onClose, onAdd, userSession }) => {
  const [formData, setFormData] = useState({
    name: '',
    skin_name: '',
    condition: '',
    variant: 'normal',
    buy_price: '',
    quantity: 1,
    image_url: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      await processImageFile(file);
    }
  };

  const compressImage = (file, maxWidth = 800, maxHeight = 600, quality = 0.8) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to blob with compression
      canvas.toBlob(resolve, 'image/jpeg', quality);
    };
    
    img.src = URL.createObjectURL(file);
  });
};

const blobToBase64 = (blob) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
};

const processImageFile = async (file) => {
  if (!file) return;
  
  // Validate file type
  if (!file.type.startsWith('image/')) {
    alert('Please select a valid image file');
    return;
  }
  
  // Initial size check (before compression)
  if (file.size > 10 * 1024 * 1024) { // 10MB limit for original
    alert('Original image file size must be less than 10MB');
    return;
  }
  
  try {
    setIsUploading(true);
    
    const compressedBlob = await compressImage(file, 800, 600, 0.8);
    
    if (compressedBlob.size > 200 * 1024) {
      const recompressedBlob = await compressImage(file, 600, 450, 0.6);
      const base64 = await blobToBase64(recompressedBlob);
      setFormData(prev => ({ 
        ...prev, 
        custom_image_url: base64,
        image_url: base64 // Also update the base image to show custom image in preview
      }));
    } else {
      const base64 = await blobToBase64(compressedBlob);
      setFormData(prev => ({ 
        ...prev, 
        custom_image_url: base64,
        image_url: base64 // Also update the base image to show custom image in preview
      }));
    }
    
    console.log(`Original size: ${(file.size / 1024).toFixed(2)}KB`);
    console.log(`Compressed size: ${(compressedBlob.size / 1024).toFixed(2)}KB`);
    
  } catch (error) {
    console.error('Error compressing image:', error);
    alert('Error processing image. Please try again.');
  } finally {
    setIsUploading(false);
  }
};

const handleImageUpload = async (e) => {
  const file = e.target.files[0];
  await processImageFile(file);
};

  const validateFormData = () => {
    if (!formData.name.trim()) {
      alert('Please enter a name for the item');
      return false;
    }
    
    if (!formData.buy_price || isNaN(parseFloat(formData.buy_price)) || parseFloat(formData.buy_price) <= 0) {
      alert('Please enter a valid buy price greater than 0');
      return false;
    }
    
    if (formData.quantity < 1) {
      alert('Quantity must be at least 1');
      return false;
    }
    
    return true;
  };

  const getItemType = (displayType) => {
    const typeMap = {
      'Liquids': 'liquid',
      'Cases': 'case', 
      'Crafts': 'craft',
      'Agents': 'agent',
      'Keychains': 'keychain',
      'Graffiti': 'graffiti',
      'Patches': 'patch'
    };
    return typeMap[displayType] || displayType.toLowerCase();
  };

  const handleSubmit = async () => {
    if (!validateFormData()) return;

    if (!userSession?.id) {
      alert('No user session found');
      return;
    }

    try {
      setSubmitting(true);
      const buyPrice = parseFloat(formData.buy_price);
      
      // Generate realistic current price variation (±20%)
      const priceVariation = (Math.random() * 0.4 - 0.2);
      const currentPrice = buyPrice * (1 + priceVariation);
      
      const finalImageUrl = formData.custom_image_url || formData.image_url || null;

      const newInvestment = {
        user_id: userSession.id,
        type: getItemType(type),
        name: formData.name.trim(),
        skin_name: formData.skin_name?.trim() || null,
        condition: formData.condition?.trim() || null,
        variant: formData.variant || formData.selectedVariant || 'normal',
        buy_price: buyPrice,
        current_price: Math.max(0.01, currentPrice),
        quantity: Math.max(1, parseInt(formData.quantity)),
        image_url: finalImageUrl,
        notes: formData.notes?.trim() || null // Add notes to the investment data
      };

      console.log('Attempting to insert investment:', newInvestment);

      // Use a transaction to ensure context is maintained
      const { data: insertData, error: insertError } = await supabase.rpc('insert_investment_with_context', {
        investment_data: newInvestment,
        context_user_id: userSession.id
      });

      if (insertError) {
        console.error('Insert failed:', insertError);
        throw insertError;
      }
      
      console.log('Investment inserted successfully:', insertData);
      
      // Call the onAdd callback with the new investment data
      onAdd(insertData);
      onClose();

    } catch (err) {
      console.error('Error adding investment:', err);
      
      // Provide more specific error messages
      if (err.message.includes('row-level security policy')) {
        alert('Authentication error: Unable to verify your access. Please refresh the page and re-enter your beta key.');
      } else if (err.message.includes('foreign key')) {
        alert('User session error: Your user session is invalid. Please refresh the page and re-enter your beta key.');
      } else if (err.message.includes('context')) {
        alert('Authentication context error: Please try again or refresh the page.');
      } else {
        alert('Failed to add investment: ' + err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 to-slate-900 p-6 rounded-xl border border-orange-500/20 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-white">Add {type} Item</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="space-y-6">
          {type === 'Crafts' ? (
            <>
              {/* Base Skin Search */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Search Base Skin
                </label>
                <CSItemSearch
                  type="liquids" // Use liquids as base for skins
                  placeholder="Search base skins..."
                  value={formData.skin_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, skin_name: e.target.value }))}
                  onSelect={(item) => setFormData(prev => ({ 
                    ...prev, 
                    skin_name: item.name,
                    image_url: item.image || '',
                    // Store variant information and ensure normal is default
                    stattrak: false, // Default to false
                    souvenir: false, // Default to false
                    selectedVariant: 'normal', // Always default to normal
                    variant: 'normal', // Set variant to normal by default
                    hasStatTrak: item.hasStatTrak || false,
                    hasSouvenir: item.hasSouvenir || false
                  }))}
                  className="w-full"
                  showLargeView={true}
                  maxResults={15}
                />
              </div>

              {/* Selected base skin preview with variant controls */}
              {formData.image_url && (
                <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Selected Base Skin</label>
                  <div className="flex items-center space-x-3 mb-3">
                    <img 
                      src={formData.image_url} 
                      alt={formData.skin_name}
                      className="w-16 h-16 object-contain bg-gray-700 rounded"
                    />
                    <div className="flex-1">
                      <p className="text-white font-medium">{formData.skin_name}</p>
                      <p className="text-gray-400 text-sm">Base skin selected</p>
                      {/* Show current variant */}
                      {formData.stattrak && (
                        <span className="inline-block px-2 py-0.5 bg-orange-600 text-white rounded text-xs mt-1 mr-1">
                          StatTrak™
                        </span>
                      )}
                      {formData.souvenir && (
                        <span className="inline-block px-2 py-0.5 bg-yellow-600 text-white rounded text-xs mt-1">
                          Souvenir
                        </span>
                      )}
                      {/* Show normal variant when neither stattrak nor souvenir */}
                      {!formData.stattrak && !formData.souvenir && (
                        <span className="inline-block px-2 py-0.5 bg-blue-600 text-white rounded text-xs mt-1">
                          Normal
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Variant toggle controls - only show if variants are available */}
                  {(formData.hasStatTrak || formData.hasSouvenir) && (
                    <div className="border-t border-gray-600 pt-3">
                      <label className="block text-sm font-medium text-gray-300 mb-2">Skin Variant</label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ 
                            ...prev, 
                            stattrak: false, 
                            souvenir: false,
                            selectedVariant: 'normal',
                            variant: 'normal'
                          }))}
                          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                            (!formData.stattrak && !formData.souvenir) || formData.variant === 'normal'
                              ? 'bg-blue-600 text-white' 
                              : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                          }`}
                        >
                          Normal
                        </button>
                        
                        {formData.hasStatTrak && (
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              stattrak: true, 
                              souvenir: false,
                              selectedVariant: 'stattrak',
                              variant: 'stattrak'
                            }))}
                            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                              formData.stattrak || formData.variant === 'stattrak'
                                ? 'bg-orange-600 text-white' 
                                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                            }`}
                          >
                            StatTrak™
                          </button>
                        )}
                        
                        {formData.hasSouvenir && (
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              stattrak: false, 
                              souvenir: true,
                              selectedVariant: 'souvenir',
                              variant: 'souvenir'
                            }))}
                            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                              formData.souvenir || formData.variant === 'souvenir'
                                ? 'bg-yellow-600 text-white' 
                                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                            }`}
                          >
                            Souvenir
                          </button>
                        )}
                      </div>
                      <p className="text-gray-400 text-xs mt-2">
                        Select the variant for your base skin
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Condition Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Condition</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    { short: 'FN', full: 'Factory New' },
                    { short: 'MW', full: 'Minimal Wear' },
                    { short: 'FT', full: 'Field-Tested' },
                    { short: 'WW', full: 'Well-Worn' },
                    { short: 'BS', full: 'Battle-Scarred' }
                  ].map(({ short, full }) => (
                    <button
                      key={short}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, condition: full }))}
                      className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                        formData.condition === full
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                      }`}
                    >
                      {short}
                    </button>
                  ))}
                </div>
                {formData.condition && (
                  <p className="text-gray-400 text-xs mt-2">Selected: {formData.condition}</p>
                )}
              </div>

              {/* Custom Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Custom Craft Name</label>
                <input
                  type="text"
                  placeholder="Enter your custom craft name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none transition-colors"
                  required
                  maxLength={100}
                />
                <p className="text-gray-400 text-xs mt-1">Give your craft a unique name</p>
              </div>
              
              {/* Notes field for crafts */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4" />
                    <span>Craft Details (Optional)</span>
                  </div>
                </label>
                <textarea
                  placeholder="Add craft details (e.g., 4x Katowice 2014, specific sticker placements, float value, etc.)"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none transition-colors resize-none"
                  rows={3}
                  maxLength={300}
                />
                <p className="text-gray-400 text-xs mt-1">{formData.notes.length}/300 characters</p>
              </div>

              {/* Upload Image - moved to end as optional */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">Upload Custom Image (Optional)</label>
                <div 
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    isDragOver 
                      ? 'border-orange-500 bg-orange-500/10' 
                      : 'border-orange-500/30 hover:border-orange-500/50'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                    disabled={uploadingImage}
                  />
                  
                  {uploadingImage ? (
                    <div className="flex flex-col items-center">
                      <Loader2 className="w-10 h-10 text-orange-500 mb-3 animate-spin" />
                      <span className="text-sm text-gray-400">Processing image...</span>
                    </div>
                  ) : formData.custom_image_url ? (
                    <div className="flex flex-col items-center">
                      <img 
                        src={formData.custom_image_url} 
                        alt="Custom preview" 
                        className="w-96 h-40 object-contain rounded mb-2" 
                      />
                      <span className="text-sm text-green-400 mb-2">Custom image uploaded</span>
                      <label htmlFor="image-upload" className="text-sm text-orange-400 hover:text-orange-300 cursor-pointer">
                        Click to change image
                      </label>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, custom_image_url: '' }))}
                        className="text-xs text-gray-500 hover:text-gray-400 mt-1"
                      >
                        Remove custom image
                      </button>
                    </div>
                  ) : (
                    <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center">
                      <Upload className="w-10 h-10 text-orange-500 mb-3" />
                      <span className="text-sm text-gray-400">Click to upload or drag & drop</span>
                      <span className="text-xs text-gray-500 mt-1">
                        {formData.image_url ? 'Overrides base skin image' : 'No base image selected'}
                      </span>
                    </label>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Search {type}
                </label>
                {/* Enhanced search with larger view */}
                <CSItemSearch
                  type={type.toLowerCase()} // This should be 'liquids' or 'cases'
                  placeholder={`Search ${type.toLowerCase()}...`}
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  onSelect={(item) => setFormData(prev => ({ 
                    ...prev, 
                    name: item.name,
                    image_url: item.image || '',
                    // Store variant information and ensure normal is default
                    stattrak: false, // Default to false
                    souvenir: false, // Default to false
                    selectedVariant: 'normal', // Always default to normal
                    variant: 'normal', // Set variant to normal by default
                    hasStatTrak: item.hasStatTrak || false,
                    hasSouvenir: item.hasSouvenir || false
                  }))}
                  className="w-full"
                  showLargeView={true} // Enable larger search results
                  maxResults={15} // Show more results in modal
                />
              </div>

              {/* Selected item preview with variant controls */}
              {formData.image_url && (
                <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Selected Item</label>
                  <div className="flex items-center space-x-3 mb-3">
                    <img 
                      src={formData.image_url} 
                      alt={formData.name}
                      className="w-16 h-16 object-contain bg-gray-700 rounded"
                    />
                    <div className="flex-1">
                      <p className="text-white font-medium">{formData.name}</p>
                      <p className="text-gray-400 text-sm">Ready to add</p>
                      {/* Show current variant */}
                      {formData.stattrak && (
                        <span className="inline-block px-2 py-0.5 bg-orange-600 text-white rounded text-xs mt-1 mr-1">
                          StatTrak™
                        </span>
                      )}
                      {formData.souvenir && (
                        <span className="inline-block px-2 py-0.5 bg-yellow-600 text-white rounded text-xs mt-1">
                          Souvenir
                        </span>
                      )}
                      {/* Show normal variant when neither stattrak nor souvenir */}
                      {!formData.stattrak && !formData.souvenir && (
                        <span className="inline-block px-2 py-0.5 bg-blue-600 text-white rounded text-xs mt-1">
                          Normal
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Variant toggle controls - only show if variants are available */}
                  {(formData.hasStatTrak || formData.hasSouvenir) && (
                    <div className="border-t border-gray-600 pt-3">
                      <label className="block text-sm font-medium text-gray-300 mb-2">Item Variant</label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ 
                            ...prev, 
                            stattrak: false, 
                            souvenir: false,
                            selectedVariant: 'normal',
                            variant: 'normal'
                          }))}
                          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                            (!formData.stattrak && !formData.souvenir) || formData.variant === 'normal'
                              ? 'bg-blue-600 text-white' 
                              : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                          }`}
                        >
                          Normal
                        </button>
                        
                        {formData.hasStatTrak && (
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              stattrak: true, 
                              souvenir: false,
                              selectedVariant: 'stattrak',
                              variant: 'stattrak'
                            }))}
                            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                              formData.stattrak || formData.variant === 'stattrak'
                                ? 'bg-orange-600 text-white' 
                                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                            }`}
                          >
                            StatTrak™
                          </button>
                        )}
                        
                        {formData.hasSouvenir && (
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              stattrak: false, 
                              souvenir: true,
                              selectedVariant: 'souvenir',
                              variant: 'souvenir'
                            }))}
                            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                              formData.souvenir || formData.variant === 'souvenir'
                                ? 'bg-yellow-600 text-white' 
                                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                            }`}
                          >
                            Souvenir
                          </button>
                        )}
                      </div>
                      <p className="text-gray-400 text-xs mt-2">
                        Select the variant you want to add to your inventory
                      </p>
                    </div>
                  )}
                  
                  {/* Notes field for selected items */}
                  <div className="border-t border-gray-600 pt-3 mt-3">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4" />
                        <span>Notes (Optional)</span>
                      </div>
                    </label>
                    <textarea
                      placeholder="Add any additional details (e.g., 95% fade, 0.16 float, special stickers, etc.)"
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none transition-colors resize-none text-sm"
                      rows={2}
                      maxLength={300}
                    />
                    <p className="text-gray-400 text-xs mt-1">{formData.notes.length}/300 characters</p>
                  </div>
                </div>
              )}
                          
              {type === 'Liquids' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Condition</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {[
                      { short: 'FN', full: 'Factory New' },
                      { short: 'MW', full: 'Minimal Wear' },
                      { short: 'FT', full: 'Field-Tested' },
                      { short: 'WW', full: 'Well-Worn' },
                      { short: 'BS', full: 'Battle-Scarred' }
                    ].map(({ short, full }) => (
                      <button
                        key={short}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, condition: full }))}
                        className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                          formData.condition === full
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                        }`}
                      >
                        {short}
                      </button>
                    ))}
                  </div>
                  {formData.condition && (
                    <p className="text-gray-400 text-xs mt-2">Selected: {formData.condition}</p>
                  )}
                </div>
              )}

              {(type === 'Liquids' || type === 'Cases') && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">Quantity</label>
                  <div className="flex items-center justify-center space-x-4">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, quantity: Math.max(1, prev.quantity - 1) }))}
                      className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center text-white transition-colors"
                    >
                      <Minus className="w-5 h-5" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      max="9999"
                      value={formData.quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, quantity: Math.max(1, parseInt(e.target.value) || 1) }))}
                      className="w-20 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-center focus:border-orange-500 focus:outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, quantity: Math.min(9999, prev.quantity + 1) }))}
                      className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center text-white transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-gray-400 text-xs text-center mt-2">Current quantity: {formData.quantity}</p>
                </div>
              )}
              
              {/* Notes field for items without variants - show outside the selected item box */}
              {formData.name && !formData.image_url && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4" />
                      <span>Notes (Optional)</span>
                    </div>
                  </label>
                  <textarea
                    placeholder="Add any additional details (e.g., 95% fade, 0.16 float, special stickers, etc.)"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none transition-colors resize-none"
                    rows={3}
                    maxLength={300}
                  />
                  <p className="text-gray-400 text-xs mt-1">{formData.notes.length}/300 characters</p>
                </div>
              )}
            </>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Buy Price</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max="999999"
                placeholder="0.00"
                value={formData.buy_price}
                onChange={(e) => setFormData(prev => ({ ...prev, buy_price: e.target.value }))}
                className="w-full pl-8 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none transition-colors"
                required
              />
            </div>
          </div>
          
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !formData.name || !formData.buy_price}
            className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 rounded-lg hover:from-orange-600 hover:to-red-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Adding Item...</span>
              </>
            ) : (
              <>
                <span>Add {type} Item</span>
                {formData.quantity > 1 && <span className="text-orange-200">({formData.quantity}x)</span>}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddItemForm;