import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { TrendingUp, TrendingDown, Minus, Plus, Loader2, Edit2, Save, X } from 'lucide-react';
import { supabase } from '@/supabaseClient';
import PopupManager from '../ui/PopupManager';
import { useScrollLock } from '@/hooks/useScrollLock';

  const CONDITION_OPTIONS = [
    { value: '', label: 'Select condition' },
    { value: 'Factory New', label: 'Factory New' },
    { value: 'Minimal Wear', label: 'Minimal Wear' },
    { value: 'Field-Tested', label: 'Field-Tested' },
    { value: 'Well-Worn', label: 'Well-Worn' },
    { value: 'Battle-Scarred', label: 'Battle-Scarred' }
  ];

  const VARIANT_OPTIONS = [
    { value: 'normal', label: 'Normal' },
    { value: 'stattrak', label: 'StatTrak™' },
    { value: 'souvenir', label: 'Souvenir' }
  ];

const ItemCard = React.memo(({ item, userSession, onUpdate, onDelete, onRemove, isNew = false, isSoldItem = false }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [soldPrice, setSoldPrice] = useState('');
  const [soldQuantity, setSoldQuantity] = useState(1);
  const [animationClass, setAnimationClass] = useState('');

  const conditionOptions = CONDITION_OPTIONS;
  const variantOptions = VARIANT_OPTIONS;

  // Consolidated popup state
  const [popup, setPopup] = useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null,
    confirmText: 'OK',
    cancelText: 'Cancel',
    data: null
  });

  // Helper function to show popup
  const showPopup = (config) => {
    setPopup({
      isOpen: true,
      type: 'info',
      title: '',
      message: '',
      onConfirm: null,
      onCancel: null,
      confirmText: 'OK',
      cancelText: 'Cancel',
      data: null,
      ...config
    });
  };

  // Helper function to close popup
  const closePopup = () => {
    setPopup(prev => ({ ...prev, isOpen: false }));
  };

  const [asyncState, setAsyncState] = useState({
  isLoading: false,
  operation: null,
  error: null
});

useScrollLock(popup.isOpen);

const handleAsyncOperation = useCallback(async (operation, operationFn, ...args) => {
  setAsyncState({ isLoading: true, operation, error: null });
  
  try {
    const result = await operationFn(...args);
    setAsyncState({ isLoading: false, operation: null, error: null });
    return result;
  } catch (error) {
    setAsyncState({ isLoading: false, operation: null, error });
    throw error;
  }
}, []);

  const itemMetrics = useMemo(() => {
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
      originalQuantity = item.original_quantity || item.quantity;
      isFullySold = availableQuantity === 0;
      
      if (item.realized_profit_loss !== undefined && item.unrealized_profit_loss !== undefined) {
        // Existing item with summary data from view
        realizedProfitLoss = item.realized_profit_loss || 0;
        unrealizedProfitLoss = item.unrealized_profit_loss || 0;
      } else {
        // Newly added item - calculate P&L manually
        realizedProfitLoss = 0; // No sales yet
        unrealizedProfitLoss = (currentPrice - buyPrice) * quantity;
      }
      
      totalProfitLoss = realizedProfitLoss + unrealizedProfitLoss;
      totalInvestment = buyPrice * originalQuantity;
    }
      
      const profitPercentage = totalInvestment > 0 ? ((totalProfitLoss / totalInvestment) * 100).toFixed(2) : '0.00';

      // Additional sales metrics from view
      const totalSaleValue = item.total_sale_value || 0;
      const averageSalePrice = item.average_sale_price || 0;

      return {
        soldItems, availableQuantity, originalQuantity, isFullySold,
        realizedProfitLoss, unrealizedProfitLoss, totalProfitLoss,
        totalInvestment, buyPrice, currentPrice, quantity, profitPercentage,
        totalSaleValue, averageSalePrice
    };
}, [item, isSoldItem]);
  
// destructure itemMetrics
  const {
    soldItems, availableQuantity, originalQuantity, isFullySold,
    realizedProfitLoss, unrealizedProfitLoss, totalProfitLoss,
    totalInvestment, buyPrice, currentPrice, quantity, profitPercentage,
    totalSaleValue, averageSalePrice
  } = itemMetrics;

const editFormDefaults = useMemo(() => ({
  condition: isSoldItem ? (item.item_condition || '') : (item.condition || ''),
  variant: item.variant || 'normal',
  quantity: isSoldItem ? item.quantity_sold : (item.quantity || 1),
  buy_price: isSoldItem ? item.buy_price_per_unit : (item.buy_price || 0),
  notes: item.notes || ''
}), [item, isSoldItem]);

const [editForm, setEditForm] = useState(editFormDefaults);

const handleStartEdit = useCallback(() => {
  setEditForm(editFormDefaults);
  setIsEditingItem(true);
  setIsEditing(false); // Close sell form
}, [editFormDefaults]);

const handleStartSell = useCallback(() => {
  setIsEditing(true);
  setIsEditingItem(false); // Close edit form if open
  setSoldQuantity(Math.min(1, availableQuantity));
  setSoldPrice('');
}, [availableQuantity]);

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
}, [isEditing, availableQuantity]); // Update dependency

const handlePartialSale = useCallback(async () => {
  const pricePerUnit = parseFloat(soldPrice);
  const quantity = parseInt(soldQuantity);
 
  if (!soldPrice || isNaN(pricePerUnit) || pricePerUnit <= 0) {
    showPopup({
      type: 'error',
      title: 'Error',
      message: 'Please enter a valid price per unit greater than 0'
    });
    return;
  }
 
  if (!quantity || quantity < 1 || quantity > itemMetrics.availableQuantity) {
    showPopup({
      type: 'error',
      title: 'Error',
      message: `Please enter a valid quantity between 1 and ${itemMetrics.availableQuantity}`
    });
    return;
  }
 
  const totalSaleValue = parseFloat(soldPrice) * soldQuantity;
  const profitLoss = (parseFloat(soldPrice) - item.buy_price) * soldQuantity;
  const investment = item.buy_price * soldQuantity;
  const percentage = investment > 0 ? ((profitLoss / investment) * 100).toFixed(2) : '0.00';

  showPopup({
    type: 'confirm',
    title: 'Confirm Sale',
    message: `Sell ${quantity} units at $${pricePerUnit.toFixed(2)} each?`,
    data: { quantity, pricePerUnit, totalSaleValue, profitLoss, percentage },
    onConfirm: () => handleAsyncOperation(
      'PARTIAL_SALE',
      handleConfirmedSale,
      quantity, pricePerUnit, totalSaleValue, profitLoss, percentage
    ),
    confirmText: 'Confirm Sale',
    cancelText: 'Cancel'
  });
}, [soldPrice, soldQuantity, itemMetrics.availableQuantity, item.buy_price, handleAsyncOperation]);

  const handleConfirmedSale = async (quantity, pricePerUnit, totalSaleValue, profitLoss) => {
    try {
      closePopup();
      
      const { data: saleResult, error: saleError } = await supabase.rpc('process_investment_sale', {
        p_investment_id: item.id,
        p_price_per_unit: pricePerUnit,
        p_quantity_to_sell: quantity,
        p_sale_notes: null,
        p_user_id: userSession.id,
        p_item_variant: item.variant || 'normal'
      });
      
      if (saleError) throw new Error(`Sale failed: ${saleError.message}`);
      
      const remainingQuantity = saleResult.remaining_quantity;
      
      if (remainingQuantity === 0) {
        if (onRemove) {
          onRemove(item.id);
        }
      } else {
        const updatedItem = {
          ...item,
          quantity: remainingQuantity,
          total_sold_quantity: (item.total_sold_quantity || 0) + quantity,
          total_sale_value: (item.total_sale_value || 0) + totalSaleValue,
          unrealized_profit_loss: (item.current_price - item.buy_price) * remainingQuantity,    
        };
        onUpdate(item.id, updatedItem);
      }
      
      showPopup({
        type: 'success',
        title: 'Success',
        message: `Successfully sold ${quantity} units for $${totalSaleValue.toFixed(2)}\nProfit/Loss: ${profitLoss >= 0 ? '+' : ''}$${profitLoss.toFixed(2)}\nRemaining quantity: ${remainingQuantity}`
      });
      
      // Refresh to get updated data from server
      if (onRefresh) {
        onRefresh();
      }

      setIsEditing(false);
      setSoldPrice('');
      setSoldQuantity(1);
      
    } catch (err) {
      console.error('Error processing sale:', err);
      showPopup({
        type: 'error',
        title: 'Error',
        message: 'Failed to process sale: ' + err.message
      });
    }
  };

const handleQuantityUpdate = useCallback(async (newQuantity) => {
  if (newQuantity < 1 || newQuantity > 9999) return;
  
  await handleAsyncOperation('QUANTITY_UPDATE', async () => {
    const { error } = await supabase.rpc('update_investment_with_context', {
      investment_id: item.id,
      investment_data: { quantity: newQuantity },
      context_user_id: userSession.id
    });

    if (error) throw error;
    
    const updatedItem = {
      ...item,
      quantity: newQuantity,
      unrealized_profit_loss: (item.current_price - item.buy_price) * newQuantity,
    };

    onUpdate(item.id, updatedItem);
  }).catch(err => {
    console.error('Error updating quantity:', err);
    
    let errorMessage = 'Failed to update quantity: ' + err.message;
    if (err.message.includes('Invalid user context')) {
      errorMessage = 'Authentication error: Please refresh the page and re-enter your beta key.';
    } else if (err.message.includes('not found or access denied')) {
      errorMessage = 'Access denied: You can only update your own investments.';
    }
    
    showPopup({
      type: 'error',
      title: 'Error',
      message: errorMessage
    });
  });
}, [handleAsyncOperation, item, userSession.id, onUpdate]);

const handleEditFormSubmit = useCallback(async () => {
  await handleAsyncOperation('EDIT_SUBMIT', async () => {
    const updateData = {
      condition: editForm.condition,
      variant: editForm.variant,
      quantity: parseInt(editForm.quantity),
      buy_price: parseFloat(editForm.buy_price),
      notes: editForm.notes?.trim() || null
    };

    if (updateData.quantity < 1 || updateData.quantity > 9999) {
      throw new Error('Quantity must be between 1 and 9999');
    }
    
    if (updateData.buy_price <= 0) {
      throw new Error('Buy price must be greater than 0');
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
  }).catch(err => {
    console.error('Error updating item:', err);
    
    let errorMessage = 'Failed to update item: ' + err.message;
    if (err.message.includes('Invalid user context')) {
      errorMessage = 'Authentication error: Please refresh the page and re-enter your beta key.';
    } else if (err.message.includes('not found or access denied')) {
      errorMessage = 'Access denied: You can only update your own investments.';
    }
    
    showPopup({
      type: 'error',
      title: 'Error',
      message: errorMessage
    });
  });
}, [handleAsyncOperation, editForm, item, userSession.id, onUpdate]);

  const handleEditFormCancel = useCallback(() => {
  setEditForm(editFormDefaults);
  setIsEditingItem(false);
}, [editFormDefaults]);

const handleEditFormChange = useCallback((field, value) => {
  setEditForm(prev => ({
    ...prev,
    [field]: value
  }));
}, []);

  return (
    <div className={`break-inside-avoid bg-gradient-to-br from-gray-800 to-slate-800 rounded-lg p-4 border border-gray-700 hover:border-orange-500/30 transition-all duration-200 ${animationClass} ${isFullySold ? 'opacity-75' : ''}`}>
      <div className="flex items-start space-x-4">
        {/* Image Container with Variant Badges */}
        <div className="relative w-20 h-16 bg-gray-700 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
          {item.image_url ? (
            <img 
              src={item.image_url} 
              alt={isSoldItem ? item.item_name : item.name} 
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <div className="text-gray-400 text-xs text-center">No Image</div>
          )}
          
          {/* Variant badges */}
          {((isSoldItem ? item.item_variant : item.variant) && (isSoldItem ? item.item_variant : item.variant) !== 'normal') && (
            <div className="absolute top-0 right-0 flex flex-col gap-0.5">
              {(isSoldItem ? item.item_variant : item.variant) === 'stattrak' && (
                <span className="text-[10px] px-1 py-0.5 rounded-sm bg-orange-500 text-white font-medium shadow-sm">
                  ST
                </span>
              )}
              {(isSoldItem ? item.item_variant : item.variant) === 'souvenir' && (
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
            <>
              {/* Condition and Variant Display for Sold Items */}
              <div className="flex items-center space-x-2 mt-1">
                {(isSoldItem ? item.item_condition : item.condition) && (
                  <p className="text-xs text-gray-500 truncate">{isSoldItem ? item.item_condition : item.condition}</p>
                )}
                
                {((isSoldItem ? item.item_variant : item.variant) && (isSoldItem ? item.item_variant : item.variant) !== 'normal') && (
                  <div className="flex items-center space-x-1">
                    {(isSoldItem ? item.item_variant : item.variant) === 'stattrak' && (
                      <span className="text-xs px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                        StatTrak™
                      </span>
                    )}
                    {(isSoldItem ? item.item_variant : item.variant) === 'souvenir' && (
                      <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                        Souvenir
                      </span>
                    )}
                  </div>
                )}
              </div>

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

                {item.notes && (
                  <div className="mt-1">
                    <button
                      onClick={() => showPopup({
                        type: 'note',
                        title: 'Item Note',
                        message: item.notes,
                        confirmText: 'Close'
                      })}
                      className="text-xs text-gray-400 italic truncate hover:text-orange-400 transition-colors text-left w-full"
                      title="Click to view full note"
                    >
                      note: {item.notes}
                    </button>
                  </div>
                )}

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
            </>
          ) : (
            <>
              {/* Condition Display */}
              <div className="flex items-center space-x-2 mt-1">
                {(isSoldItem ? item.item_condition : item.condition) && (
                  <p className="text-xs text-gray-500 truncate">{isSoldItem ? item.item_condition : item.condition}</p>
                )}
                
                {((isSoldItem ? item.item_variant : item.variant) && (isSoldItem ? item.item_variant : item.variant) !== 'normal') && (
                  <div className="flex items-center space-x-1">
                    {(isSoldItem ? item.item_variant : item.variant) === 'stattrak' && (
                      <span className="text-xs px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                        StatTrak™
                      </span>
                    )}
                    {(isSoldItem ? item.item_variant : item.variant) === 'souvenir' && (
                      <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                        Souvenir
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* ADD NOTES DISPLAY HERE */}
              {item.notes && (
                <div className="mt-1">
                  <button
                    onClick={() => showPopup({
                      type: 'note',
                      title: 'Item Note',
                      message: item.notes,
                      confirmText: 'Close'
                    })}
                    className="text-xs text-gray-400 italic truncate hover:text-orange-400 transition-colors text-left w-full"
                    title="Click to view full note"
                  >
                    note: {item.notes}
                  </button>
                </div>
              )}
              
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
                onClick={handleStartEdit}
                className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded hover:bg-blue-500/30 transition-colors block w-full flex items-center justify-center space-x-1"
              >
                <Edit2 className="w-3 h-3" />
                <span>Edit</span>
              </button>
              
              {/* Sell Button - show different states */}
              {!isFullySold ? (
                <button
                  onClick={handleStartSell}
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

          <div className="mt-3">
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Notes (Optional)
            </label>
            <textarea
              placeholder="Add any additional details (e.g., 95% fade, 0.16 float, special stickers, etc.)"
              value={editForm.notes}
              onChange={(e) => handleEditFormChange('notes', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:border-orange-500 focus:outline-none resize-none"
              rows={2}
              maxLength={300}
            />
            <p className="text-gray-400 text-xs mt-1">{editForm.notes.length}/300 characters</p>
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
              disabled={asyncState.isLoading}
              className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors disabled:opacity-50 flex items-center space-x-1"
            >
              {asyncState.isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
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
                  {(() => {
                    const profitLoss = (parseFloat(soldPrice) - item.buy_price) * soldQuantity;
                    const investment = item.buy_price * soldQuantity;
                    const percentage = investment > 0 ? ((profitLoss / investment) * 100).toFixed(2) : '0.00';
                    return `Profit/Loss: ${profitLoss >= 0 ? '+' : '-'}$${Math.abs(profitLoss).toFixed(2)} (${percentage}%)`;
                  })()}
                </div>
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePartialSale}
                disabled={asyncState.isLoading}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors disabled:opacity-50 flex items-center space-x-1"
              >
                {asyncState.isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
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

        <PopupManager
        isOpen={popup.isOpen}
        onClose={closePopup}
        type={popup.type}
        title={popup.title}
        message={popup.message}
        onConfirm={popup.onConfirm}
        onCancel={popup.onCancel}
        confirmText={popup.confirmText}
        cancelText={popup.cancelText}
        isLoading={asyncState.isLoading}
        data={popup.data}
      />
    </div>
  );
});

export default ItemCard;