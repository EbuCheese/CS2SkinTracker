import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, Plus, Loader2, Edit2, Save, X } from 'lucide-react';
import { supabase } from '../supabaseClient';

const ItemCard = ({ item, userSession, onUpdate, onDelete, onRemove, isNew = false, isSoldItem = false }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [soldPrice, setSoldPrice] = useState('');
  const [soldQuantity, setSoldQuantity] = useState(1);
  const [updating, setUpdating] = useState(false);
  const [animationClass, setAnimationClass] = useState('');
  
  // custom popup states
  const [showConfirmSale, setShowConfirmSale] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');
  const [salePreview, setSalePreview] = useState(null);

  // sale variables for supabase
  let soldItems, availableQuantity, originalQuantity, isFullySold;
  let realizedProfitLoss, unrealizedProfitLoss, totalProfitLoss;
  let totalInvestment, buyPrice, currentPrice, quantity;

if (isSoldItem) {
  // For sold items from investment_sales table
  buyPrice = item.buy_price_per_unit || 0;
  currentPrice = item.price_per_unit || 0;
  quantity = item.quantity_sold || 0;
  availableQuantity = 0;
  originalQuantity = quantity;
  isFullySold = true;
  soldItems = 0;
  totalProfitLoss = (item.price_per_unit - item.buy_price_per_unit) * item.quantity_sold;
  realizedProfitLoss = totalProfitLoss;
  unrealizedProfitLoss = 0;
  totalInvestment = item.buy_price_per_unit * item.quantity_sold;
} else {
  // For active investments from investment_summary view
  buyPrice = item.buy_price || 0;
  currentPrice = item.current_price || 0;
  quantity = item.quantity || 0;
  soldItems = item.total_sold_quantity || 0;
  availableQuantity = item.quantity;
  originalQuantity = item.original_quantity || item.quantity; // ← Use original_quantity from view
  isFullySold = availableQuantity === 0;
  realizedProfitLoss = item.realized_profit_loss || 0; // ← From view
  unrealizedProfitLoss = item.unrealized_profit_loss || 0; // ← From view
  totalProfitLoss = realizedProfitLoss + unrealizedProfitLoss;
  totalInvestment = item.buy_price * originalQuantity;
}
  
  const profitPercentage = totalInvestment > 0 ? ((totalProfitLoss / totalInvestment) * 100).toFixed(2) : '0.00';

  // Additional sales metrics from view
  const totalSaleValue = item.total_sale_value || 0;
  const averageSalePrice = item.average_sale_price || 0;
  
  // Edit form state - FIXED: Handle both sold and active items properly
  const [editForm, setEditForm] = useState({
    condition: isSoldItem ? (item.item_condition || '') : (item.condition || ''),
    variant: item.variant || 'normal',
    quantity: isSoldItem ? item.quantity_sold : (item.quantity || 1),
    buy_price: isSoldItem ? item.buy_price_per_unit : (item.buy_price || 0)
  });

  // Handle new item animation
  useEffect(() => {
    if (isNew) {
      setAnimationClass('animate-slide-in-from-top');
      const timer = setTimeout(() => {
        setAnimationClass('');
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isNew]);

  // Reset sold quantity when editing starts
  useEffect(() => {
    if (isEditing) {
      setSoldQuantity(Math.min(1, availableQuantity));
      setSoldPrice('');
    }
  }, [isEditing, availableQuantity]);

const handlePartialSale = async () => {
  const pricePerUnit = parseFloat(soldPrice);
  const quantity = parseInt(soldQuantity);
 
  if (!soldPrice || isNaN(pricePerUnit) || pricePerUnit <= 0) {
    setPopupMessage('Please enter a valid price per unit greater than 0');
    setShowErrorPopup(true);
    return;
  }
 
  if (!quantity || quantity < 1 || quantity > availableQuantity) {
    setPopupMessage(`Please enter a valid quantity between 1 and ${availableQuantity}`);
    setShowErrorPopup(true);
    return;
  }
 
  const totalSaleValue = pricePerUnit * quantity;
  const profitLoss = (pricePerUnit - item.buy_price) * quantity;
  
  // Show confirmation popup instead of alert
  setSalePreview({
    quantity,
    pricePerUnit,
    totalSaleValue,
    profitLoss
  });
  setShowConfirmSale(true);
};

const handleConfirmedSale = async () => {
  const { quantity, pricePerUnit, totalSaleValue, profitLoss } = salePreview;
  
  try {
    setUpdating(true);
    setShowConfirmSale(false);
    
    const { data: saleResult, error: saleError } = await supabase.rpc('process_investment_sale', {
      p_investment_id: item.id,
      p_user_id: userSession.id,
      p_quantity_to_sell: quantity,
      p_price_per_unit: pricePerUnit
    });
    
    if (saleError) throw new Error(`Sale failed: ${saleError.message}`);
    
    const remainingQuantity = saleResult.remaining_quantity;
    
    if (remainingQuantity === 0) {
      if (onRemove) {
        onRemove(item.id);
      }
    } else {
      // FIXED: Update with properly calculated remaining values
      const updatedItem = {
        ...item,
        quantity: remainingQuantity,
        total_sold_quantity: (item.total_sold_quantity || 0) + quantity,
        total_sale_value: (item.total_sale_value || 0) + totalSaleValue,
        // Recalculate unrealized profit for remaining quantity
        unrealized_profit_loss: (item.current_price - item.buy_price) * remainingQuantity,    
      };
      onUpdate(item.id, updatedItem);
    }
    
    setPopupMessage(`Successfully sold ${quantity} units for $${totalSaleValue.toFixed(2)}\nProfit/Loss: ${profitLoss >= 0 ? '+' : ''}$${profitLoss.toFixed(2)}\nRemaining quantity: ${remainingQuantity}`);
    setShowSuccessPopup(true);
    
    // Refresh to get updated data from server
    if (onRefresh) {
      onRefresh();
    }

    setIsEditing(false);
    setSoldPrice('');
    setSoldQuantity(1);
    setSalePreview(null);
    
  } catch (err) {
    console.error('Error processing sale:', err);
    setPopupMessage('Failed to process sale: ' + err.message);
    setShowErrorPopup(true);
  } finally {
    setUpdating(false);
  }
};

const handleQuantityUpdate = async (newQuantity) => {
  if (newQuantity < 1 || newQuantity > 9999) return;
  
  try {
    const { error } = await supabase.rpc('update_investment_with_context', {
      investment_id: item.id,
      investment_data: { quantity: newQuantity },
      context_user_id: userSession.id
    });

    if (error) throw error;
    
    const updatedItem = {
      ...item,
      quantity: newQuantity,
      // FIX: Only recalculate unrealized P&L for remaining quantity
      unrealized_profit_loss: (item.current_price - item.buy_price) * newQuantity,
    };

    onUpdate(item.id, updatedItem);
  } catch (err) {
    console.error('Error updating quantity:', err);
    
    if (err.message.includes('Invalid user context')) {
      setPopupMessage('Authentication error: Please refresh the page and re-enter your beta key.');
    } else if (err.message.includes('not found or access denied')) {
      setPopupMessage('Access denied: You can only update your own investments.');
    } else {
      setPopupMessage('Failed to update quantity: ' + err.message);
    }
    setShowErrorPopup(true);
  }
};

const handleEditFormSubmit = async () => {
  try {
    setUpdating(true);
    
    const updateData = {
      condition: editForm.condition,
      variant: editForm.variant,
      quantity: parseInt(editForm.quantity),
      buy_price: parseFloat(editForm.buy_price)
    };

    if (updateData.quantity < 1 || updateData.quantity > 9999) {
      setPopupMessage('Quantity must be between 1 and 9999');
      setShowErrorPopup(true);
      return;
    }
    
    if (updateData.buy_price <= 0) {
      setPopupMessage('Buy price must be greater than 0');
      setShowErrorPopup(true);
      return;
    }

    const { error } = await supabase.rpc('update_investment_with_context', {
      investment_id: item.id,
      investment_data: updateData,
      context_user_id: userSession.id
    });

    if (error) throw error;
    
    const updatedItem = {
      ...item,
      ...updateData,
      unrealized_profit_loss: (item.current_price - updateData.buy_price) * updateData.quantity,
      original_quantity: Math.max(item.original_quantity || item.quantity, updateData.quantity)
    };

    onUpdate(item.id, updatedItem);
    setIsEditingItem(false);
  } catch (err) {
    console.error('Error updating item:', err);
    
    if (err.message.includes('Invalid user context')) {
      setPopupMessage('Authentication error: Please refresh the page and re-enter your beta key.');
    } else if (err.message.includes('not found or access denied')) {
      setPopupMessage('Access denied: You can only update your own investments.');
    } else {
      setPopupMessage('Failed to update item: ' + err.message);
    }
    setShowErrorPopup(true);
  } finally {
    setUpdating(false);
  }
};

const handleEditFormCancel = () => {
  setEditForm({
    condition: isSoldItem ? (item.item_condition || '') : (item.condition || ''),
    variant: item.variant || 'normal',
    quantity: isSoldItem ? item.quantity_sold : (item.quantity || 1),
    buy_price: isSoldItem ? item.buy_price_per_unit : (item.buy_price || 0)
  });
  setIsEditingItem(false);
};

  const handleEditFormChange = (field, value) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const conditionOptions = [
    { value: '', label: 'Select condition' },
    { value: 'Factory New', label: 'Factory New' },
    { value: 'Minimal Wear', label: 'Minimal Wear' },
    { value: 'Field-Tested', label: 'Field-Tested' },
    { value: 'Well-Worn', label: 'Well-Worn' },
    { value: 'Battle-Scarred', label: 'Battle-Scarred' }
  ];

  const variantOptions = [
    { value: 'normal', label: 'Normal' },
    { value: 'stattrak', label: 'StatTrak™' },
    { value: 'souvenir', label: 'Souvenir' }
  ];

  return (
    <div className={`break-inside-avoid bg-gradient-to-br from-gray-800 to-slate-800 rounded-lg p-4 border border-gray-700 hover:border-orange-500/30 transition-all duration-200 ${animationClass} ${isFullySold ? 'opacity-75' : ''}`}>
      <div className="flex items-start space-x-4">
        {/* Image Container with Variant Badges */}
        <div className="relative w-20 h-16 bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
          {item.image_url ? (
            <img 
              src={item.image_url} 
              alt={isSoldItem ? item.item_name : item.name} 
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="text-gray-400 text-xs text-center">No Image</div>
          )}
          
          {item.variant && item.variant !== 'normal' && (
            <div className="absolute top-0 right-0 flex flex-col gap-0.5">
              {item.variant === 'stattrak' && (
                <span className="text-[10px] px-1 py-0.5 rounded-sm bg-orange-500 text-white font-medium shadow-sm">
                  ST
                </span>
              )}
              {item.variant === 'souvenir' && (
                <span className="text-[10px] px-1 py-0.5 rounded-sm bg-yellow-500 text-white font-medium shadow-sm">
                  SV
                </span>
              )}
            </div>
          )}

          {/* Sold indicator */}
          {isFullySold && (
            <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
              <span className="text-green-400 text-xs font-medium">SOLD</span>
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          {/* FIXED: Handle different field names for sold vs active items */}
          <h3 className="font-medium text-white truncate">
            {isSoldItem ? item.item_name : item.name}
          </h3>
          {(isSoldItem ? item.item_skin_name : item.skin_name) && (
            <p className="text-sm text-gray-400 truncate">
              {isSoldItem ? item.item_skin_name : item.skin_name}
            </p>
          )}

          {/* Show different info for sold items vs active investments */}
          {isSoldItem ? (
            // Sold item display
            <div className="mt-2 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-gray-400 mb-0.5">Sold:</div>
                  <div className="text-green-400">${item.price_per_unit?.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-gray-400 mb-0.5">Bought:</div>
                  <div className="text-white">${item.buy_price_per_unit?.toFixed(2)}</div>
                </div>
              </div>
              <div className="mt-1">
                <span className="text-gray-400">Quantity: </span>
                <span className="text-white">{item.quantity_sold}</span>
              </div>
              <div className="mt-1">
                <span className="text-gray-400">Sale Date: </span>
                <span className="text-white">{new Date(item.sale_date).toLocaleDateString()}</span>
              </div>
              <div className="mt-1">
                <span className="text-gray-400">Total Sale: </span>
                <span className="text-white">${item.total_sale_value?.toFixed(2)}</span>
              </div>
            </div>
          ) : (
            <>
              {/* Condition Display */}
              <div className="flex items-center space-x-2 mt-1">
                {item.condition && (
                  <p className="text-xs text-gray-500 truncate">{item.condition}</p>
                )}
                
                {item.variant && item.variant !== 'normal' && (
                  <div className="flex items-center space-x-1">
                    {item.variant === 'stattrak' && (
                      <span className="text-xs px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                        StatTrak™
                      </span>
                    )}
                    {item.variant === 'souvenir' && (
                      <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                        Souvenir
                      </span>
                    )}
                  </div>
                )}
              </div>
              
              {/* Price Display */}
              <div className="mt-2 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-gray-400 mb-0.5">Buy:</div>
                    <div className="text-white">
                      ${item.buy_price.toFixed(2)}
                      {originalQuantity > 1 && (
                        <span className="text-gray-400"> x{originalQuantity}</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-0.5">Current:</div>
                    <div className="text-white">${item.current_price.toFixed(2)}</div>
                  </div>
                </div>
              </div>

              {/* Quantity Display with Sold Status */}
              <div className="mt-2 text-sm">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400">Remaining:</span>
                  <span className="text-white">{availableQuantity}</span>
                  {soldItems > 0 && (
                    <span className="text-green-400">
                      ({soldItems} sold)
                    </span>
                  )}
                </div>
              </div>

              {/* Sales Summary for partially sold items */}
              {soldItems > 0 && (
                <div className="mt-2 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-gray-400 mb-0.5">Avg Sale:</div>
                      <div className="text-green-400">${averageSalePrice.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 mb-0.5">Realized:</div>
                      <div className={realizedProfitLoss >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {realizedProfitLoss >= 0 ? '+' : '-'}${Math.abs(realizedProfitLoss).toFixed(2)}
                      </div>
                  </div>
                  </div>
                </div>
              )}
              
              {/* Quantity Controls - only show if not fully sold and item supports quantity changes */}
              {!isFullySold && (item.type === 'liquid' || item.type === 'case') && !isEditingItem && (
                <div className="mt-2 flex items-center space-x-2">
                  <span className="text-gray-400 text-sm">Adjust:</span>
                  <button
                    onClick={() => handleQuantityUpdate(availableQuantity - 1)}
                    disabled={availableQuantity <= 1}
                    className="w-6 h-6 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleQuantityUpdate(availableQuantity + 1)}
                    disabled={availableQuantity >= 9999}
                    className="w-6 h-6 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Right side profit/loss and actions */}
        <div className="text-right flex-shrink-0 self-start">
          <div className={`flex items-center space-x-1 ${
            totalProfitLoss >= 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {totalProfitLoss >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span className="font-medium">${Math.abs(totalProfitLoss).toFixed(2)}</span>
            <span className="text-xs">({profitPercentage}%)</span>
          </div>
          
          {/* Show breakdown for items with both realized and unrealized gains */}
          {soldItems > 0 && availableQuantity > 0 && (
            <div className="text-xs text-gray-400 mt-1">
              <div>Realized: {realizedProfitLoss >= 0 ? '+' : '-'}${Math.abs(realizedProfitLoss).toFixed(2)}</div>
              <div>Unrealized: {unrealizedProfitLoss >= 0 ? '+' : '-'}${Math.abs(unrealizedProfitLoss).toFixed(2)}</div>
            </div>
          )}
          
          {/* Only show action buttons for active investments, not sold items */}
          {!isSoldItem && (
            <div className="mt-2 space-y-1">
              {/* Edit Button */}
              <button
                onClick={() => setIsEditingItem(true)}
                className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded hover:bg-blue-500/30 transition-colors block w-full flex items-center justify-center space-x-1"
              >
                <Edit2 className="w-3 h-3" />
                <span>Edit</span>
              </button>
              
              {/* Sell Button - show different states */}
              {!isFullySold ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded hover:bg-orange-500/30 transition-colors block w-full"
                >
                  {soldItems === 0 ? 'Mark Sold' : 'Sell More'}
                </button>
              ) : (
                <div className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded border border-green-500/30 text-center">
                  Fully Sold
                </div>
              )}
              
              <button
                onClick={() => onDelete(item)}
                className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded hover:bg-red-500/30 transition-colors block w-full"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Edit Item Form - only show for active investments */}
      {isEditingItem && !isSoldItem && (
        <div className="mt-4 pt-4 border-t border-gray-600">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-white">Edit Item Details</h4>
            <button
              onClick={handleEditFormCancel}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Condition
              </label>
              <select
                value={editForm.condition}
                onChange={(e) => handleEditFormChange('condition', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:border-orange-500 focus:outline-none"
              >
                {conditionOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Variant
              </label>
              <select
                value={editForm.variant}
                onChange={(e) => handleEditFormChange('variant', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:border-orange-500 focus:outline-none"
              >
                {variantOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Quantity
              </label>
              <input
                type="number"
                min="1"
                max="9999"
                value={editForm.quantity}
                onChange={(e) => handleEditFormChange('quantity', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Buy Price ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={editForm.buy_price}
                onChange={(e) => handleEditFormChange('buy_price', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:border-orange-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2 mt-4">
            <button
              onClick={handleEditFormCancel}
              className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleEditFormSubmit}
              disabled={updating}
              className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors disabled:opacity-50 flex items-center space-x-1"
            >
              {updating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      )}
      
      {/* Partial Sale Form - only show for active investments */}
      {isEditing && !isFullySold && !isSoldItem && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <h5 className="text-sm font-medium text-white mb-2">
            Sell Items ({availableQuantity} available)
          </h5>
          <div className="space-y-3">
            {/* Quantity to sell */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Quantity to sell
              </label>
              <input
                type="number"
                min="1"
                max={availableQuantity}
                value={soldQuantity}
                onChange={(e) => setSoldQuantity(Math.min(parseInt(e.target.value) || 1, availableQuantity))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:border-orange-500 focus:outline-none"
              />
            </div>
            
            {/* Sold price */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Sale price per item ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="Enter sale price per item"
                value={soldPrice}
                onChange={(e) => setSoldPrice(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:border-orange-500 focus:outline-none"
              />
            </div>

            {/* Preview */}
            {soldPrice && soldQuantity && (
              <div className="text-xs text-gray-400 bg-gray-700/50 p-2 rounded">
                <div>Total sale value: ${(parseFloat(soldPrice) * soldQuantity).toFixed(2)}</div>
                <div className={((parseFloat(soldPrice) - item.buy_price) * soldQuantity) >= 0 ? 'text-green-400' : 'text-red-400'}>
                  Profit/Loss: ${((parseFloat(soldPrice) - item.buy_price) * soldQuantity).toFixed(2)}
                </div>
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePartialSale}
                disabled={updating}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors disabled:opacity-50 flex items-center space-x-1"
              >
                {updating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                <span>Confirm Sale</span>
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setSoldPrice('');
                  setSoldQuantity(1);
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Sale Popup */}
        {showConfirmSale && salePreview && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-white mb-4">Confirm Sale</h3>
              <div className="text-gray-300 mb-6">
                <p className="mb-2">
                  Sell {salePreview.quantity} units at ${salePreview.pricePerUnit.toFixed(2)} each?
                </p>
                <div className="bg-gray-700/50 p-3 rounded">
                  <div>Total sale value: ${salePreview.totalSaleValue.toFixed(2)}</div>
                  <div className={salePreview.profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}>
                    Profit/Loss: {salePreview.profitLoss >= 0 ? '+' : ''}${salePreview.profitLoss.toFixed(2)}
                  </div>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowConfirmSale(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmedSale}
                  disabled={updating}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors disabled:opacity-50 flex items-center justify-center space-x-1"
                >
                  {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>Confirm Sale</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error Popup */}
        {showErrorPopup && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 border border-red-500 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-red-400 mb-4">Error</h3>
              <p className="text-gray-300 mb-6 whitespace-pre-line">{popupMessage}</p>
              <button
                onClick={() => setShowErrorPopup(false)}
                className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        )}

        {/* Success Popup */}
        {showSuccessPopup && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 border border-green-500 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-green-400 mb-4">Success</h3>
              <p className="text-gray-300 mb-6 whitespace-pre-line">{popupMessage}</p>
              <button
                onClick={() => setShowSuccessPopup(false)}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        )}
    </div>
  );
};

export default ItemCard;