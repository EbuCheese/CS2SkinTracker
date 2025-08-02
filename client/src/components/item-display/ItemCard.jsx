import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { TrendingUp, TrendingDown, Minus, Plus, Loader2, Edit2, Save, X } from 'lucide-react';
import { supabase } from '@/supabaseClient';
import { PopupManager } from '@/components/ui';
import { useScrollLock } from '@/hooks/util';

  // Dropdown options for item conditions (CS2 skin wear levels)
  const CONDITION_OPTIONS = [
    { value: '', label: 'Select condition' },
    { value: 'Factory New', label: 'Factory New' },
    { value: 'Minimal Wear', label: 'Minimal Wear' },
    { value: 'Field-Tested', label: 'Field-Tested' },
    { value: 'Well-Worn', label: 'Well-Worn' },
    { value: 'Battle-Scarred', label: 'Battle-Scarred' }
  ];

  // Dropdown options for item variants (special types)
  const VARIANT_OPTIONS = [
    { value: 'normal', label: 'Normal' },
    { value: 'stattrak', label: 'StatTrak™' },
    { value: 'souvenir', label: 'Souvenir' }
  ];

  // mode of item card
  const ITEM_MODES = {
    VIEW: 'view',
    SELLING: 'selling', 
    EDITING: 'editing'
  };

// Main ItemCard Component - Displays individual investment items with interactive features
const ItemCard = React.memo(({ item, userSession, onUpdate, onDelete, onRemove, onRefresh, isNew = false, isSoldItem = false }) => {
  // UI state management
  const [mode, setMode] = useState(ITEM_MODES.VIEW); // 'view', 'selling', 'editing'
  const [soldPrice, setSoldPrice] = useState('');
  const [soldQuantity, setSoldQuantity] = useState(1);
  const [animationClass, setAnimationClass] = useState('');

  // Consolidated popup state management - handles all modal dialogs
  const [popup, setPopup] = useState({
    isOpen: false,
    type: 'info', // 'info', 'error', 'confirm', 'success', 'note'
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null,
    confirmText: 'OK',
    cancelText: 'Cancel',
    data: null // Additional data for complex popups
  });

  // Helper function to display popup dialogs
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

  // Helper function to close popup dialogs
  const closePopup = () => {
    setPopup(prev => ({ ...prev, isOpen: false }));
  };

  // Async operation state management - tracks loading states and errors
  const [asyncState, setAsyncState] = useState({
  isLoading: false,
  operation: null,
  error: null
});

// error handler
const getErrorMessage = useCallback((error) => {
  if (error.message.includes('Invalid user context')) {
    return 'Authentication error: Please refresh the page and re-enter your beta key.';
  }
  if (error.message.includes('not found or access denied')) {
    return 'Access denied: You can only update your own investments.';
  }
  return `Operation failed: ${error.message}`;
}, []);

// Prevent body scroll when popup is open
useScrollLock(popup.isOpen);

// Generic async operation handler with loading states and error handling
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

// Memoized calculation of all item metrics and profit/loss data
const itemMetrics = useMemo(() => {
  if (isSoldItem) {
    const buyPrice = item.buy_price_per_unit || 0;
    const sellPrice = item.price_per_unit || 0;
    const quantity = item.quantity_sold || 0;
    const totalInvestment = buyPrice * quantity;
    const totalProfitLoss = (sellPrice - buyPrice) * quantity;
    
    return {
      buyPrice,
      currentPrice: sellPrice,
      quantity,
      availableQuantity: 0,
      isFullySold: true,
      totalProfitLoss,
      totalInvestment,
      profitPercentage: totalInvestment > 0 ? ((totalProfitLoss / totalInvestment) * 100).toFixed(2) : '0.00'
    };
  }

  // Active investments - USE PRE-CALCULATED VALUES FROM DATABASE
  const totalProfitLoss = (item.realized_profit_loss || 0) + (item.unrealized_profit_loss || 0);
  const totalInvestment = (item.buy_price || 0) * (item.original_quantity || item.quantity || 0);
  
  return {
    buyPrice: item.buy_price || 0,
    currentPrice: item.current_price || 0,
    quantity: item.quantity || 0,
    availableQuantity: item.quantity || 0,
    isFullySold: (item.quantity || 0) === 0,
    // Use pre-calculated values instead of recalculating
    totalProfitLoss,
    totalInvestment,
    // Calculate percentage from pre-calculated profit/loss values
    profitPercentage: totalInvestment > 0 ? ((totalProfitLoss / totalInvestment) * 100).toFixed(2) : '0.00'
  };
}, [
  isSoldItem,
  item.buy_price_per_unit,
  item.price_per_unit,
  item.quantity_sold,
  item.buy_price,
  item.current_price,
  item.quantity,
  item.realized_profit_loss,
  item.unrealized_profit_loss,
  item.original_quantity
]);

  // Destructure calculated metrics for easier access
  const {
    soldItems, availableQuantity, originalQuantity, isFullySold,
    realizedProfitLoss, unrealizedProfitLoss, totalProfitLoss,
    totalInvestment, buyPrice, currentPrice, quantity, profitPercentage,
    totalSaleValue, averageSalePrice
  } = itemMetrics;

const salePreview = useMemo(() => {
  if (!soldPrice || !soldQuantity || mode !== 'selling') return null;
  
  const pricePerUnit = parseFloat(soldPrice);
  const quantity = parseInt(soldQuantity);
  
  if (isNaN(pricePerUnit) || isNaN(quantity)) return null;
  
  const totalSaleValue = pricePerUnit * quantity;
  const profitLoss = (pricePerUnit - itemMetrics.buyPrice) * quantity;
  const investment = itemMetrics.buyPrice * quantity;
  const percentage = investment > 0 ? ((profitLoss / investment) * 100).toFixed(2) : '0.00';
  
  return { totalSaleValue, profitLoss, percentage };
}, [soldPrice, soldQuantity, mode, itemMetrics.buyPrice]);

const displayValues = useMemo(() => ({
  name: isSoldItem ? item.item_name : item.name,
  skinName: isSoldItem ? item.item_skin_name : item.skin_name,
  condition: isSoldItem ? item.item_condition : item.condition,
  variant: isSoldItem ? item.item_variant : item.variant
}), [
  isSoldItem,
  item.item_name,
  item.name,
  item.item_skin_name,
  item.skin_name,
  item.item_condition,
  item.condition,
  item.item_variant,
  item.variant
]);

// destructured
const { name, skinName, condition, variant } = displayValues;

const validateSaleInput = useCallback((price, quantity) => {
  const priceNum = parseFloat(price);
  const quantityNum = parseInt(quantity);
  
  if (!price || isNaN(priceNum) || priceNum <= 0) {
    return { isValid: false, error: 'Please enter a valid price per unit greater than 0' };
  }
  
  if (!quantity || quantityNum < 1 || quantityNum > itemMetrics.availableQuantity) {
    return { isValid: false, error: `Please enter a valid quantity between 1 and ${itemMetrics.availableQuantity}` };
  }
  
  return { isValid: true, error: null };
}, [itemMetrics.availableQuantity]);

// Handles different field names between sold items and active investments
const getEditFormDefaults = useCallback(() => ({
  condition: displayValues.condition || '',
  variant: displayValues.variant || 'normal',
  quantity: isSoldItem ? item.quantity_sold : (item.quantity || 1),
  buy_price: isSoldItem ? item.buy_price_per_unit : (item.buy_price || 0),
  notes: item.notes || ''
}), [displayValues.condition, displayValues.variant, isSoldItem, 
    item.quantity_sold, item.quantity, item.buy_price_per_unit, item.buy_price, item.notes]);

// Edit form state management
const [editForm, setEditForm] = useState(null);

// Initialize edit form and open edit mode
const handleStartEdit = useCallback(() => {
  setEditForm(getEditFormDefaults());
  setMode(ITEM_MODES.EDITING);
}, [getEditFormDefaults]);

// Initialize sell form and open sell mode
const handleStartSell = useCallback(() => {
  setMode(ITEM_MODES.SELLING);
  setSoldQuantity(Math.min(1, availableQuantity));
  setSoldPrice('');
}, [availableQuantity]);

  // Handle slide-in animation for newly added items
  useEffect(() => {
    if (isNew) {
      setAnimationClass('animate-slide-in-from-top');
      const timer = setTimeout(() => {
        setAnimationClass('');
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isNew]);

  // Reset sold quantity when starting to edit sales
  useEffect(() => {
  if (mode === ITEM_MODES.SELLING) {
    setSoldQuantity(Math.min(1, availableQuantity));
    setSoldPrice('');
  }
}, [mode, itemMetrics.availableQuantity]); // Update dependency

// Handle partial sale submission with validation and confirmation
const handlePartialSale = useCallback(async () => {
  const validation = validateSaleInput(soldPrice, soldQuantity);
  
  if (!validation.isValid) {
    showPopup({
      type: 'error',
      title: 'Error',
      message: validation.error
    });
    return;
  }
  
  const pricePerUnit = parseFloat(soldPrice);
  const quantity = parseInt(soldQuantity);
  const totalSaleValue = pricePerUnit * quantity;
  const profitLoss = (pricePerUnit - itemMetrics.buyPrice) * quantity;
  const investment = itemMetrics.buyPrice * quantity;
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
}, [soldPrice, soldQuantity, validateSaleInput, itemMetrics.buyPrice, handleAsyncOperation, showPopup]);

// Process confirmed sale through database RPC function
const handleConfirmedSale = async (quantity, pricePerUnit, totalSaleValue, profitLoss) => {
  try {
    closePopup();
    setAsyncState({ isLoading: true, operation: 'PARTIAL_SALE', error: null });
    
    // Single RPC call handles everything
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
    
    // Optimistic update based on sale result
    if (remainingQuantity === 0) {
      onRemove?.(item.id); // Item fully sold
    } else {
      // Partial sale - update with new values
      onUpdate(item.id, {
        ...item,
        quantity: remainingQuantity,
        total_sold_quantity: (item.total_sold_quantity || 0) + quantity,
        total_sale_value: (item.total_sale_value || 0) + totalSaleValue,
        // Let DB recalculate unrealized P&L on next refresh
      });
    }
    
    showPopup({
      type: 'success',
      title: 'Success',
      message: `Successfully sold ${quantity} units for $${totalSaleValue.toFixed(2)}`
    });
    
    // Reset form state
    setMode(ITEM_MODES.VIEW);
    setSoldPrice('');
    setSoldQuantity(1);
    
    // REMOVED: Immediate onRefresh() call - trust debounced refresh
    
  } catch (err) {
    console.error('Error processing sale:', err);
    showPopup({
      type: 'error',
      title: 'Error',
      message: getErrorMessage(err)
    });
  } finally {
    setAsyncState({ isLoading: false, operation: null, error: null });
  }
};

// Handle quantity adjustment for liquid items (cases, etc.) with rpc func  
const handleQuantityUpdate = useCallback(async (newQuantity) => {
  if (newQuantity < 1 || newQuantity > 9999 || newQuantity === itemMetrics.availableQuantity) return;
  
  try {
    setAsyncState({ isLoading: true, operation: 'QUANTITY_UPDATE', error: null });
    
    const { error } = await supabase.rpc('update_investment_with_context', {
      investment_id: item.id,
      investment_data: { quantity: newQuantity },
      context_user_id: userSession.id
    });

    if (error) throw error;
    
    // Optimistic update - immediate UI feedback
    const updatedItem = {
      ...item,
      quantity: newQuantity,
      unrealized_profit_loss: (itemMetrics.currentPrice - itemMetrics.buyPrice) * newQuantity,
    };

    onUpdate(item.id, updatedItem);

  } catch (err) {
    console.error('Error updating quantity:', err);
    showPopup({
      type: 'error',
      title: 'Error',
      message: getErrorMessage(err)
    });
  } finally {
    setAsyncState({ isLoading: false, operation: null, error: null });
  }
}, [item.id, itemMetrics.availableQuantity, itemMetrics.currentPrice, itemMetrics.buyPrice, 
    userSession.id, onUpdate]);

// Handle edit form submission with validation with rpc func
const handleEditFormSubmit = useCallback(async () => {
  await handleAsyncOperation('EDIT_SUBMIT', async () => {
    // Prepare update data with type conversion
    const updateData = {
      condition: editForm.condition,
      variant: editForm.variant,
      quantity: parseInt(editForm.quantity),
      buy_price: parseFloat(editForm.buy_price),
      notes: editForm.notes?.trim() || null
    };

    // Validate input data
    if (updateData.quantity < 1 || updateData.quantity > 9999) {
      throw new Error('Quantity must be between 1 and 9999');
    }
    
    if (updateData.buy_price <= 0) {
      throw new Error('Buy price must be greater than 0');
    }

    // Update through database RPC with user context
    const { error } = await supabase.rpc('update_investment_with_context', {
      investment_id: item.id,
      investment_data: updateData,
      context_user_id: userSession.id
    });

    if (error) throw error;
    
    // Update local state with new values and recalculated metrics
    const updatedItem = {
      ...item,
      ...updateData,
      unrealized_profit_loss: (item.current_price - updateData.buy_price) * updateData.quantity,
      original_quantity: Math.max(item.original_quantity || item.quantity, updateData.quantity)
    };

    onUpdate(item.id, updatedItem);
    setMode(ITEM_MODES.VIEW);
  }).catch(err => {
  console.error('Error updating item:', err);
    showPopup({
      type: 'error',
      title: 'Error',
      message: getErrorMessage(err) // ← Use the unified handler here
    });
  });
}, [handleAsyncOperation, editForm, item, userSession.id, onUpdate]);

  // Cancel edit form and reset to defaults
const handleEditFormCancel = useCallback(() => {
  setEditForm(null);
  setMode(ITEM_MODES.VIEW);
}, []);

// Handle edit form field changes
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
              alt={name} 
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <div className="text-gray-400 text-xs text-center">No Image</div>
          )}
          
          {/* Variant badges overlay (StatTrak/Souvenir indicators) */}
          {(variant && variant !== 'normal') && (
            <div className="absolute top-0 right-0 flex flex-col gap-0.5">
              {variant === 'stattrak' && (
                <span className="text-[10px] px-1 py-0.5 rounded-sm bg-orange-500 text-white font-medium shadow-sm">
                  ST
                </span>
              )}
              {variant === 'souvenir' && (
                <span className="text-[10px] px-1 py-0.5 rounded-sm bg-yellow-500 text-white font-medium shadow-sm">
                  SV
                </span>
              )}
            </div>
          )}

          {/* Sold indicator overlay for fully sold items */}
          {isFullySold && (
            <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
              <span className="text-green-400 text-xs font-medium">SOLD</span>
            </div>
          )}
        </div>
        
        {/* Main content area with item details */}
        <div className="flex-1 min-w-0">
          {/* Item name - handles different field names for sold vs active items */}
          <h3 className="font-medium text-white truncate">
            {name}
          </h3>

          {/* Skin name if available */}
          {(skinName) && (
            <p className="text-sm text-gray-400 truncate">
              {skinName}
            </p>
          )}

          {/* Conditional rendering based on item type (sold vs active) */}
          {isSoldItem ? (
            // Sold item display
            <>
              {/* Condition and Variant Display for Sold Items */}
              <div className="flex items-center space-x-2 mt-1">
                {(condition) && (
                  <p className="text-xs text-gray-500 truncate">{condition}</p>
                )}
                
                {/* Variant badges for sold items */}
                {(variant && variant !== 'normal') && (
                  <div className="flex items-center space-x-1">
                    {(variant) === 'stattrak' && (
                      <span className="text-xs px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                        StatTrak™
                      </span>
                    )}
                    {(variant) === 'souvenir' && (
                      <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                        Souvenir
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Price comparison grid for sold items */}
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

                {/* Notes display with popup on click */}
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

                {/* Additional sale details */}
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
              {/* Condition and Variant Display for Active Items */}
              <div className="flex items-center space-x-2 mt-1">
                {(condition) && (
                  <p className="text-xs text-gray-500 truncate">{condition}</p>
                )}
                
                {/* Variant badges for active items */}
                {(variant && variant !== 'normal') && (
                  <div className="flex items-center space-x-1">
                    {variant === 'stattrak' && (
                      <span className="text-xs px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                        StatTrak™
                      </span>
                    )}
                    {variant === 'souvenir' && (
                      <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                        Souvenir
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Notes display with popup on click */}
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
              
              {/* Price comparison grid for active investments */}
              <div className="mt-2 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-gray-400 mb-0.5">Buy:</div>
                    <div className="text-white">
                      ${item.buy_price.toFixed(2)}
                      {/* Show original quantity if different from current */}
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

              {/* Quantity display with sold status indicator */}
              <div className="mt-2 text-sm">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400">Remaining:</span>
                  <span className="text-white">{availableQuantity}</span>
                  {/* Show sold quantity if any items have been sold */}
                  {soldItems > 0 && (
                    <span className="text-green-400">
                      ({soldItems} sold)
                    </span>
                  )}
                </div>
              </div>

              {/* Sales summary section for partially sold items */}
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
              
              {/* Quantity adjustment controls - only available for liquid/case items that support bulk quantities */}
              {!isFullySold && (item.type === 'liquid' || item.type === 'case') && mode !== 'editing' && (
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
        
        {/* Right sidebar - P&L display and action buttons */}
        <div className="text-right flex-shrink-0 self-start">
          <div className={`flex items-center space-x-1 ${
            totalProfitLoss >= 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {totalProfitLoss >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span className="font-medium">${Math.abs(totalProfitLoss).toFixed(2)}</span>
            <span className="text-xs">({profitPercentage}%)</span>
          </div>
          
          {/* P&L breakdown for items with mixed realized/unrealized gains - helps users understand split */}
          {soldItems > 0 && availableQuantity > 0 && (
            <div className="text-xs text-gray-400 mt-1">
              <div>Realized: {realizedProfitLoss >= 0 ? '+' : '-'}${Math.abs(realizedProfitLoss).toFixed(2)}</div>
              <div>Unrealized: {unrealizedProfitLoss >= 0 ? '+' : '-'}${Math.abs(unrealizedProfitLoss).toFixed(2)}</div>
            </div>
          )}
          
          {/* Action buttons - only shown for active investments, not sold items */}
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
              
              {/* Dynamic sell button - changes text based on sale history */}
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
      
      {/* Edit form modal - comprehensive item details editing */}
      {mode === ITEM_MODES.EDITING && !isSoldItem && (
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
          
          {/* Two-column layout for form efficiency */}
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
                {CONDITION_OPTIONS.map(option => (
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
                {VARIANT_OPTIONS.map(option => (
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

          {/* Notes field with character counter for user guidance */}
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
      
      {/* Partial sale form - handles selling portions of investment positions */}
      {mode === ITEM_MODES.SELLING && !isFullySold && !isSoldItem && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <h5 className="text-sm font-medium text-white mb-2">
            Sell Items ({availableQuantity} available)
          </h5>
          <div className="space-y-3">
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
            
            {/* Real-time sale preview - helps users understand transaction impact before confirming */}
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
              {salePreview && (
                <div className="text-xs text-gray-400 bg-gray-700/50 p-2 rounded">
                  <div>Total sale value: ${salePreview.totalSaleValue.toFixed(2)}</div>
                  <div className={salePreview.profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}>
                    Profit/Loss: {salePreview.profitLoss >= 0 ? '+' : '-'}${Math.abs(salePreview.profitLoss).toFixed(2)} ({salePreview.percentage}%)
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
                  setMode(ITEM_MODES.VIEW);
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

        {/* Centralized popup system - handles all modal dialogs (confirmations, errors, notes, etc.) */}
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