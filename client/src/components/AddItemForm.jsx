import React, { useState } from 'react';
import { X, Upload, Plus, Minus, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import CSItemSearch from './CSItemSearch';

const AddItemForm = ({ type, onClose, onAdd, userSession }) => {
  const [formData, setFormData] = useState({
    name: '',
    skin_name: '',
    condition: '',
    variant: '',
    buy_price: '',
    quantity: 1,
    image_url: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file');
        return;
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image file size must be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setFormData(prev => ({ ...prev, image_url: e.target.result }));
      };
      reader.readAsDataURL(file);
    }
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
      
      const newInvestment = {
        user_id: userSession.id,
        type: type.toLowerCase().slice(0, -1),
        name: formData.name.trim(),
        skin_name: formData.skin_name?.trim() || null,
        condition: formData.condition?.trim() || null,
        variant: formData.variant || formData.selectedVariant || 'normal',
        buy_price: buyPrice,
        current_price: Math.max(0.01, currentPrice),
        quantity: Math.max(1, parseInt(formData.quantity)),
        image_url: formData.image_url || null
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
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">Upload Image</label>
                <div className="border-2 border-dashed border-orange-500/30 rounded-lg p-6 text-center hover:border-orange-500/50 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center">
                    {formData.image_url ? (
                      <img src={formData.image_url} alt="Preview" className="w-24 h-24 object-cover rounded mb-2" />
                    ) : (
                      <>
                        <Upload className="w-10 h-10 text-orange-500 mb-3" />
                        <span className="text-sm text-gray-400">Click to upload image</span>
                      </>
                    )}
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Custom Name</label>
                <input
                  type="text"
                  placeholder="Enter custom name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none transition-colors"
                  required
                  maxLength={100}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Base Skin Name</label>
                <input
                  type="text"
                  placeholder="Enter base skin name"
                  value={formData.skin_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, skin_name: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none transition-colors"
                  maxLength={100}
                />
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
                    // Store variant information
                    stattrak: item.stattrak || false,
                    souvenir: item.souvenir || false,
                    selectedVariant: item.selectedVariant || 'normal',
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
                            !formData.stattrak && !formData.souvenir
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
                              formData.stattrak
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
                              formData.souvenir
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