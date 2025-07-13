import React, { useState, useMemo, useCallback, memo } from 'react';
import { X, Upload, Plus, Minus, Loader2, FileText } from 'lucide-react';
import { supabase } from '../supabaseClient';
import CSItemSearch from './CSItemSearch';
import VariantControls from './VariantControls';
import ConditionSelector from './ConditionSelector';

// Move static data outside component
const INITIAL_FORM_DATA = {
  name: '',
  skin_name: '',
  condition: '',
  variant: 'normal',
  buy_price: '',
  quantity: 1,
  image_url: '',
  notes: ''
};

const TYPE_MAP = {
  'Liquids': 'liquid',
  'Cases': 'case', 
  'Crafts': 'craft',
  'Agents': 'agent',
  'Stickers': 'sticker',
  'Keychains': 'keychain',
  'Graffiti': 'graffiti',
  'Patches': 'patch'
};

const ERROR_MESSAGES = {
  'row-level security policy': 'Authentication error: Please refresh and re-enter your beta key.',
  'foreign key': 'User session error: Please refresh and re-enter your beta key.',
  'context': 'Authentication context error: Please try again or refresh the page.'
};

// Memoized sub-components
const VariantBadge = memo(({ stattrak, souvenir }) => {
  if (stattrak) {
    return (
      <span className="inline-block px-2 py-0.5 bg-orange-600 text-white rounded text-xs mt-1 mr-1">
        StatTrak™
      </span>
    );
  }
  
  if (souvenir) {
    return (
      <span className="inline-block px-2 py-0.5 bg-yellow-600 text-white rounded text-xs mt-1">
        Souvenir
      </span>
    );
  }
  
  return (
    <span className="inline-block px-2 py-0.5 bg-blue-600 text-white rounded text-xs mt-1">
      Normal
    </span>
  );
});

const ImageUploadSection = memo(({ 
  isDragOver, 
  uploadingImage, 
  customImageUrl, 
  imageUrl,
  onDragOver, 
  onDragLeave, 
  onDrop, 
  onImageUpload, 
  onRemoveImage 
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-300 mb-3">Upload Custom Image (Optional)</label>
    <div 
      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
        isDragOver 
          ? 'border-orange-500 bg-orange-500/10' 
          : 'border-orange-500/30 hover:border-orange-500/50'
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <input
        type="file"
        accept="image/*"
        onChange={onImageUpload}
        className="hidden"
        id="image-upload"
        disabled={uploadingImage}
      />
      
      {uploadingImage ? (
        <div className="flex flex-col items-center">
          <Loader2 className="w-10 h-10 text-orange-500 mb-3 animate-spin" />
          <span className="text-sm text-gray-400">Processing image...</span>
        </div>
      ) : customImageUrl ? (
        <div className="flex flex-col items-center">
          <img 
            src={customImageUrl} 
            alt="Custom preview" 
            className="w-96 h-40 object-contain rounded mb-2" 
          />
          <span className="text-sm text-green-400 mb-2">Custom image uploaded</span>
          <label htmlFor="image-upload" className="text-sm text-orange-400 hover:text-orange-300 cursor-pointer">
            Click to change image
          </label>
          <button
            type="button"
            onClick={onRemoveImage}
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
            {imageUrl ? 'Overrides base skin image' : 'No base image selected'}
          </span>
        </label>
      )}
    </div>
  </div>
));

const QuantitySelector = memo(({ quantity, onQuantityChange }) => (
  <div>
    <label className="block text-sm font-medium text-gray-300 mb-3">Quantity</label>
    <div className="flex items-center justify-center space-x-4">
      <button
        type="button"
        onClick={() => onQuantityChange(-1)}
        className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center text-white transition-colors"
      >
        <Minus className="w-5 h-5" />
      </button>
      <input
        type="number"
        min="1"
        max="9999"
        value={quantity}
        onChange={(e) => onQuantityChange(Math.max(1, parseInt(e.target.value) || 1) - quantity)}
        className="w-20 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-center focus:border-orange-500 focus:outline-none transition-colors"
      />
      <button
        type="button"
        onClick={() => onQuantityChange(1)}
        className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center text-white transition-colors"
      >
        <Plus className="w-5 h-5" />
      </button>
    </div>
    <p className="text-gray-400 text-xs text-center mt-2">Current quantity: {quantity}</p>
  </div>
));

const AddItemForm = memo(({ type, onClose, onAdd, userSession }) => {
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Memoize derived values
  const itemType = useMemo(() => TYPE_MAP[type] || type.toLowerCase(), [type]);
  
  const isFormValid = useMemo(() => {
    return formData.name.trim() &&
           formData.buy_price &&
           !isNaN(parseFloat(formData.buy_price)) &&
           parseFloat(formData.buy_price) > 0 &&
           formData.quantity >= 1 &&
           (!['Liquids', 'Crafts'].includes(type) || formData.condition) &&
           (type !== 'Crafts' || formData.skin_name?.trim());
  }, [formData.name, formData.buy_price, formData.quantity, formData.condition, formData.skin_name, type]);

  // Memoize callbacks
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const compressImage = useCallback((file, maxWidth = 800, maxHeight = 600, quality = 0.8) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
        const width = Math.floor(img.width * ratio);
        const height = Math.floor(img.height * ratio);
        
        canvas.width = width;
        canvas.height = height;
        
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(resolve, 'image/jpeg', quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  }, []);

  const blobToBase64 = useCallback((blob) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  }, []);

  const processImageFile = useCallback(async (file) => {
    if (!file?.type.startsWith('image/') || file.size > 10 * 1024 * 1024) {
      alert(!file?.type.startsWith('image/') ? 'Please select a valid image file' : 'Image must be less than 10MB');
      return;
    }
    
    try {
      setIsUploading(true);
      
      let quality = 0.8;
      let compressedBlob = await compressImage(file, 800, 600, quality);
      
      if (compressedBlob.size > 200 * 1024) {
        quality = 0.6;
        compressedBlob = await compressImage(file, 600, 450, quality);
      }
      
      const base64 = await blobToBase64(compressedBlob);
      setFormData(prev => ({ 
        ...prev, 
        custom_image_url: base64,
        image_url: base64
      }));
      
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Error processing image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }, [compressImage, blobToBase64]);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      await processImageFile(file);
    }
  }, [processImageFile]);

  const handleImageUpload = useCallback(async (e) => {
    const file = e.target.files[0];
    await processImageFile(file);
  }, [processImageFile]);

  const handleRemoveImage = useCallback(() => {
    setFormData(prev => ({ ...prev, custom_image_url: '' }));
  }, []);

  const handleVariantChange = useCallback((variant) => {
    setFormData(prev => ({ 
      ...prev, 
      stattrak: variant === 'stattrak',
      souvenir: variant === 'souvenir',
      selectedVariant: variant,
      variant: variant
    }));
  }, []);

  const handleQuantityChange = useCallback((delta) => {
    setFormData(prev => ({ 
      ...prev, 
      quantity: Math.max(1, Math.min(9999, prev.quantity + delta))
    }));
  }, []);

  const handleConditionChange = useCallback((condition) => {
    setFormData(prev => ({ ...prev, condition }));
  }, []);

  const handleFormDataChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleItemSelect = useCallback((item) => {
    setFormData(prev => ({ 
      ...prev, 
      name: item.name,
      image_url: item.image || '',
      stattrak: false,
      souvenir: false,
      selectedVariant: 'normal',
      variant: 'normal',
      hasStatTrak: item.hasStatTrak || false,
      hasSouvenir: item.hasSouvenir || false
    }));
  }, []);

  const handleSkinSelect = useCallback((item) => {
    setFormData(prev => ({ 
      ...prev, 
      skin_name: item.name,
      image_url: item.image || '',
      stattrak: false,
      souvenir: false,
      selectedVariant: 'normal',
      variant: 'normal',
      hasStatTrak: item.hasStatTrak || false,
      hasSouvenir: item.hasSouvenir || false
    }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!isFormValid || !userSession?.id) {
      alert(!userSession?.id ? 'No user session found' : 'Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      const buyPrice = parseFloat(formData.buy_price);
      
      const priceVariation = (Math.random() * 0.4 - 0.2);
      const currentPrice = Math.max(0.01, buyPrice * (1 + priceVariation));
      const quantity = Math.max(1, parseInt(formData.quantity));
      
      const newInvestment = {
        user_id: userSession.id,
        type: itemType,
        name: formData.name.trim(),
        skin_name: formData.skin_name?.trim() || null,
        condition: formData.condition?.trim() || null,
        variant: formData.variant || 'normal',
        buy_price: buyPrice,
        current_price: currentPrice,
        quantity: quantity,
        image_url: formData.custom_image_url || formData.image_url || null,
        notes: formData.notes?.trim() || null
      };

      const { data: insertData, error: insertError } = await supabase.rpc('insert_investment_with_context', {
        investment_data: newInvestment,
        context_user_id: userSession.id
      });

      if (insertError) throw insertError;
      
      onAdd(insertData);
      onClose();

    } catch (err) {
      console.error('Error adding investment:', err);
      
      const errorType = Object.keys(ERROR_MESSAGES).find(key => err.message.includes(key));
      alert(errorType ? ERROR_MESSAGES[errorType] : `Failed to add investment: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }, [isFormValid, userSession, formData, itemType, onAdd, onClose]);

  // Memoize search components
  const itemSearch = useMemo(() => (
    <CSItemSearch
      type={type.toLowerCase()}
      placeholder={`Search ${type.toLowerCase()}...`}
      value={formData.name}
      onChange={(e) => handleFormDataChange('name', e.target.value)}
      onSelect={handleItemSelect}
      className="w-full"
      showLargeView={true}
      maxResults={15}
    />
  ), [type, formData.name, handleFormDataChange, handleItemSelect]);

  const skinSearch = useMemo(() => (
    <CSItemSearch
      type="liquids"
      placeholder="Search base skins..."
      value={formData.skin_name}
      onChange={(e) => handleFormDataChange('skin_name', e.target.value)}
      onSelect={handleSkinSelect}
      className="w-full"
      showLargeView={true}
      maxResults={15}
    />
  ), [formData.skin_name, handleFormDataChange, handleSkinSelect]);

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
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Search Base Skin <span className="text-red-400">*</span>
                </label>
                {skinSearch}
              </div>

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
                      <VariantBadge stattrak={formData.stattrak} souvenir={formData.souvenir} />
                    </div>
                  </div>
                  
                  <VariantControls
                    hasStatTrak={formData.hasStatTrak}
                    hasSouvenir={formData.hasSouvenir}
                    selectedVariant={formData.selectedVariant || formData.variant}
                    onVariantChange={handleVariantChange}
                    type="Skin"
                  />
                </div>
              )}

              <ConditionSelector
                selectedCondition={formData.condition}
                onConditionChange={handleConditionChange}
                required={true}
              />

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
                  onChange={(e) => handleFormDataChange('notes', e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none transition-colors resize-none"
                  rows={3}
                  maxLength={300}
                />
                <p className="text-gray-400 text-xs mt-1">{formData.notes.length}/300 characters</p>
              </div>

              <ImageUploadSection
                isDragOver={isDragOver}
                uploadingImage={uploadingImage}
                customImageUrl={formData.custom_image_url}
                imageUrl={formData.image_url}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onImageUpload={handleImageUpload}
                onRemoveImage={handleRemoveImage}
              />
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Search {type} <span className="text-red-400">*</span>
                </label>
                {itemSearch}
              </div>

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
                      <VariantBadge stattrak={formData.stattrak} souvenir={formData.souvenir} />
                    </div>
                  </div>
                  
                  <VariantControls
                    hasStatTrak={formData.hasStatTrak}
                    hasSouvenir={formData.hasSouvenir}
                    selectedVariant={formData.selectedVariant || formData.variant}
                    onVariantChange={handleVariantChange}
                    type="Item"
                  />
                  
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
                      onChange={(e) => handleFormDataChange('notes', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none transition-colors resize-none text-sm"
                      rows={2}
                      maxLength={300}
                    />
                    <p className="text-gray-400 text-xs mt-1">{formData.notes.length}/300 characters</p>
                  </div>
                </div>
              )}
                          
              {type === 'Liquids' && (
                <ConditionSelector
                  selectedCondition={formData.condition}
                  onConditionChange={handleConditionChange}
                  required={true}
                />
              )}

              {(type === 'Liquids' || type === 'Cases') && (
                <QuantitySelector
                  quantity={formData.quantity}
                  onQuantityChange={handleQuantityChange}
                />
              )}
              
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
                    onChange={(e) => handleFormDataChange('notes', e.target.value)}
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
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Buy Price <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max="999999"
                placeholder="0.00"
                value={formData.buy_price}
                onChange={(e) => handleFormDataChange('buy_price', e.target.value)}
                className="w-full pl-8 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none transition-colors"
                required
              />
            </div>
          </div>
          
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isFormValid || submitting}
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
});

AddItemForm.displayName = 'AddItemForm';
export default AddItemForm;