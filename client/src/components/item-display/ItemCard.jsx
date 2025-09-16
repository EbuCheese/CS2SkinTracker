import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { TrendingUp, TrendingDown, Loader2, Edit2, Save, AlertTriangle, Info } from 'lucide-react';
import { supabase } from '@/supabaseClient';
import { PopupManager } from '@/components/ui';
import { useScrollLock } from '@/hooks/util';
import { useToast } from '@/contexts/ToastContext';

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
const ItemCard = React.memo(({ item, userSession, onUpdate, onDelete, onRemove, onRefresh, isNew = false, isPriceLoading = false, isSoldItem = false, relatedInvestment = null }) => {
  // Add toast hook
  const toast = useToast();

  // UI state management
  const [mode, setMode] = useState(ITEM_MODES.VIEW); // 'view', 'selling', 'editing'
  const [soldPrice, setSoldPrice] = useState('');
  const [soldQuantity, setSoldQuantity] = useState(1);
  const [animationClass, setAnimationClass] = useState('');

  // Edit form states
  const [editForm, setEditForm] = useState(null);
  const [soldEditForm, setSoldEditForm] = useState(null);

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
const baseMetrics = useMemo(() => {
  const buyPrice = isSoldItem ? item.buy_price_per_unit || 0 : item.buy_price || 0;
  const currentPrice = isSoldItem ? item.price_per_unit || 0 : item.current_price || 0;
  const quantity = isSoldItem ? item.quantity_sold || 0 : item.quantity || 0;
  
  return { buyPrice, currentPrice, quantity };
}, [
  isSoldItem,
  item.buy_price_per_unit,
  item.price_per_unit, 
  item.quantity_sold,
  item.buy_price,
  item.current_price,
  item.quantity
]);

const profitMetrics = useMemo(() => {
  if (isSoldItem) {
    const totalInvestment = baseMetrics.buyPrice * baseMetrics.quantity;
    const totalProfitLoss = (baseMetrics.currentPrice - baseMetrics.buyPrice) * baseMetrics.quantity;
    
    return {
      totalProfitLoss,
      totalInvestment,
      profitPercentage: totalInvestment > 0 ? ((totalProfitLoss / totalInvestment) * 100).toFixed(2) : '0.00',
      isFullySold: true,
      availableQuantity: 0
    };
  }

  // Use pre-calculated values for active investments
  const totalProfitLoss = (item.realized_profit_loss || 0) + (item.unrealized_profit_loss || 0);
  const totalInvestment = baseMetrics.buyPrice * (item.original_quantity || baseMetrics.quantity);
  const availableQuantity = baseMetrics.quantity;
  const isFullySold = availableQuantity === 0;
  
  return {
    totalProfitLoss,
    totalInvestment,
    profitPercentage: totalInvestment > 0 ? ((totalProfitLoss / totalInvestment) * 100).toFixed(2) : '0.00',
    isFullySold,
    availableQuantity
  };
}, [
  isSoldItem,
  baseMetrics,
  item.realized_profit_loss,
  item.unrealized_profit_loss,
  item.original_quantity
]);

const salesSummary = useMemo(() => {
  const soldItems = item.total_sold_quantity || 0;
  const totalSaleValue = item.total_sale_value || 0;
  const originalQuantity = item.original_quantity || baseMetrics.quantity;
  
  if (soldItems === 0) return { soldItems: 0, hasAnySales: false };
  
  return {
    soldItems,
    originalQuantity,
    averageSalePrice: totalSaleValue / soldItems,
    realizedProfitLoss: item.realized_profit_loss || 0,
    unrealizedProfitLoss: item.unrealized_profit_loss || 0,
    totalSaleValue,
    hasAnySales: true
  };
}, [
  item.total_sold_quantity,
  item.total_sale_value, 
  item.realized_profit_loss,
  item.unrealized_profit_loss,
  item.original_quantity,
  baseMetrics.quantity
]);

const salePreview = useMemo(() => {
  // Early return if not in selling mode - prevents unnecessary calculations
  if (mode !== ITEM_MODES.SELLING) return null;
  
  const pricePerUnit = parseFloat(soldPrice);
  const quantity = parseInt(soldQuantity);
  
  if (!soldPrice || !soldQuantity || isNaN(pricePerUnit) || isNaN(quantity)) return null;
  
  const totalSaleValue = pricePerUnit * quantity;
  const profitLoss = (pricePerUnit - baseMetrics.buyPrice) * quantity;
  const investment = baseMetrics.buyPrice * quantity;
  const percentage = investment > 0 ? ((profitLoss / investment) * 100).toFixed(2) : '0.00';
  
  return { totalSaleValue, profitLoss, percentage };
}, [mode, soldPrice, soldQuantity, baseMetrics.buyPrice]);

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

// helper to check for valid price
const hasValidPriceData = (item) => {
  return item.current_price !== null && 
         item.current_price !== undefined && 
         !isNaN(item.current_price);
};

// helper to detect item with bid only pricing
const isBidOnlyPrice = () => {
  // Early return if no price data available
  if (!item.available_prices || !item.price_source) return false;
  
  try {
    const prices = typeof item.available_prices === 'string' 
      ? JSON.parse(item.available_prices) 
      : item.available_prices;
    
    if (!Array.isArray(prices) || prices.length === 0) return false;
    
    const currentMarketplace = item.price_source;
    
    // Skip bid detection for manual pricing
    if (currentMarketplace === 'manual') return false;
    
    const currentPriceData = prices.find(p => p.marketplace === currentMarketplace);
    
    // Check for bid-only indicators in the available price data
    return currentPriceData?.is_bid_price === true;
  } catch (e) {
    console.error('Error parsing available_prices:', e);
    return false;
  }
};

// helper to get all available marketplaces for item
const getAvailableMarketplaces = () => {
  if (!item.available_prices) return [];
  
  try {
    const prices = typeof item.available_prices === 'string' 
      ? JSON.parse(item.available_prices) 
      : item.available_prices;
    
    return prices.map(p => ({
      marketplace: p.marketplace,
      price: p.price,
      last_updated: p.last_updated,
      is_bid_price: p.is_bid_price
    }));
  } catch (e) {
    console.error('Error parsing available prices:', e);
    return [];
  }
};

// With this comprehensive version that handles all item types:
const buildItemDisplayName = () => {
  let displayName = '';
  
  // Add variant prefix (Souvenir, StatTrak™)
  if (variant === 'souvenir') {
    displayName += 'Souvenir ';
  } else if (variant === 'stattrak') {
    displayName += 'StatTrak™ ';
  }
  
  // Add base name and skin name
  if (skinName) {
    displayName += `${name ? 'Custom':''} ${skinName}`;
  } else {
    displayName += name;
  }
  
  // Add condition in parentheses if present
  if (condition) {
    displayName += ` (${condition})`;
  }
  
  return displayName;
};

const fullItemName = buildItemDisplayName();

const validateSaleInput = useCallback((price, quantity) => {
  const priceNum = parseFloat(price);
  const quantityNum = parseInt(quantity);
  
  if (!price || isNaN(priceNum) || priceNum <= 0) {
    return { isValid: false, error: 'Please enter a valid price per unit greater than 0' };
  }
  
  if (!quantity || quantityNum < 1 || quantityNum > profitMetrics.availableQuantity) {
    return { isValid: false, error: `Please enter a valid quantity between 1 and ${profitMetrics.availableQuantity}` };
  }
  
  return { isValid: true, error: null };
}, [profitMetrics.availableQuantity]);

// Handles different field names between sold items and active investments
const getEditFormDefaults = useCallback(() => {
  if (isSoldItem) {
    return {
      quantity_sold: item.quantity_sold || 1,
      price_per_unit: item.price_per_unit || 0,
      notes: item.notes || ''
    };
  }
  
  // Use the actual marketplace being used, not "global"
  const currentPriceSource = item.price_source === 'manual' ? 'manual' : 
    (item.preferred_marketplace_override || item.price_source || 'csfloat');
  
  return {
    condition: displayValues.condition || '',
    variant: displayValues.variant || 'normal',
    quantity: item.quantity || 1,
    buy_price: item.buy_price || 0,
    notes: item.notes || '',
    price_source: currentPriceSource,
    manual_price: item.market_price_override || item.current_price || 0
  };
}, [isSoldItem, displayValues.condition, displayValues.variant, 
    item.quantity_sold, item.price_per_unit, item.quantity, item.buy_price, item.notes,
    item.price_source, item.preferred_marketplace_override, item.market_price_override, item.current_price]);

// Initialize edit form and open edit mode
const handleStartEdit = useCallback(() => {
  if (isSoldItem) {
    setSoldEditForm(getEditFormDefaults());
  } else {
    setEditForm(getEditFormDefaults());
  }
  setMode(ITEM_MODES.EDITING);
}, [isSoldItem, getEditFormDefaults]);

// Initialize sell form and open sell mode
const handleStartSell = useCallback(() => {
  setMode(ITEM_MODES.SELLING);
  setSoldQuantity(Math.min(1, profitMetrics.availableQuantity));
  setSoldPrice('');
}, [profitMetrics.availableQuantity]);

// handle the reverted sale
const handleRevertSale = useCallback(async () => {
  if (!isSoldItem) return;
  
  const quantityToRestore = item.quantity_sold || 0;
  const saleValueToLose = item.total_sale_value || 0;
  
  showPopup({
    type: 'confirm',
    title: 'Revert Sale',
    message: `Revert the sale of ${quantityToRestore}x "${fullItemName}" back to your inventory?`,
    data: {
      revertValue: saleValueToLose
    },
    onConfirm: () => handleAsyncOperation(
      'REVERT_SALE',
      handleConfirmedRevert
    ),
    confirmText: 'Revert Sale',
    cancelText: 'Cancel'
  });
}, [isSoldItem, item.quantity_sold, item.total_sale_value, fullItemName, handleAsyncOperation, showPopup]);

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
    setSoldQuantity(Math.min(1, profitMetrics.availableQuantity));
    setSoldPrice('');
  }
}, [mode, profitMetrics.availableQuantity]);

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
  const profitLoss = (pricePerUnit - baseMetrics.buyPrice) * quantity;
  const investment = baseMetrics.buyPrice * quantity;
  const percentage = investment > 0 ? ((profitLoss / investment) * 100).toFixed(2) : '0.00';

  showPopup({
    type: 'confirm',
    title: 'Confirm Sale',
    message: `Sell ${quantity} "${fullItemName}" at $${pricePerUnit.toFixed(2)} each?`,
    data: { quantity, pricePerUnit, totalSaleValue, profitLoss, percentage },
    onConfirm: () => handleAsyncOperation(
      'PARTIAL_SALE',
      handleConfirmedSale,
      quantity, pricePerUnit, totalSaleValue, profitLoss, percentage
    ),
    confirmText: 'Confirm Sale',
    cancelText: 'Cancel'
  });
}, [soldPrice, soldQuantity, validateSaleInput, baseMetrics.buyPrice, handleAsyncOperation, showPopup]);

// Process confirmed sale through database RPC function
const handleConfirmedSale = async (quantity, pricePerUnit, totalSaleValue, profitLoss) => {
  try {
    closePopup();
    setAsyncState({ isLoading: true, operation: 'PARTIAL_SALE', error: null });
    
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
    const isFullSale = remainingQuantity === 0;
    
    // Create sold item data
    const soldItemData = {
      id: saleResult.sale_id,
      investment_id: item.id,
      user_id: userSession.id,
      quantity_sold: quantity,
      price_per_unit: pricePerUnit,
      total_sale_value: totalSaleValue,
      sale_date: new Date().toISOString(),
      item_name: item.name,
      item_skin_name: item.skin_name,
      item_condition: item.condition,
      buy_price_per_unit: item.buy_price,
      image_url: item.image_url || null,
      notes: item.notes,
      item_variant: item.variant || 'normal',
      item_type: saleResult.item_type || item.type
    };
    
    if (isFullSale) {
      // FULL SALE
      onRemove?.(item.id, false, soldItemData, false);
      
      // enhanced show full sale toast
      toast.fullSaleCompleted(fullItemName, quantity, totalSaleValue, profitLoss);

    } else {
      // PARTIAL SALE
      const updatedItem = {
        ...item,
        quantity: remainingQuantity,
        total_sold_quantity: (item.total_sold_quantity || 0) + quantity,
        total_sale_value: (item.total_sale_value || 0) + totalSaleValue,
        realized_profit_loss: (item.realized_profit_loss || 0) + profitLoss,
        unrealized_profit_loss: (item.current_price - item.buy_price) * remainingQuantity
      };
      onUpdate(item.id, updatedItem, false, soldItemData);
      
      // enhanced show partial sale toast
      toast.partialSaleCompleted(fullItemName, quantity, remainingQuantity, totalSaleValue, profitLoss);
    }
    
    // Reset form state
    setMode(ITEM_MODES.VIEW);
    setSoldPrice('');
    setSoldQuantity(1);
    
  } catch (err) {
    console.error('Error processing sale:', err);
    toast.error(getErrorMessage(err));
  } finally {
    setAsyncState({ isLoading: false, operation: null, error: null });
  }
};

// Handle the actual reverting of item back to investments
const handleConfirmedRevert = async () => {
  try {
    closePopup();
    setAsyncState({ isLoading: true, operation: 'REVERT_SALE', error: null });
    
    const { data: revertResult, error: revertError } = await supabase.rpc('revert_investment_sale', {
      p_sale_id: item.id,
      p_user_id: userSession.id
    });
    
    if (revertError) throw new Error(`Revert failed: ${revertError.message}`);
    
    // Handle the two scenarios based on the simplified response
    if (revertResult.type === 'quantity_restored') {
      // Original investment exists - update it with restored quantity
      const relatedInvestmentId = revertResult.investment_id;
      const quantityRestored = revertResult.quantity_restored;
      const saleValueLost = revertResult.sale_value_lost;
      
      // Reconstruct investment data if relatedInvestment is null
      let updatedInvestment;

      if (relatedInvestment) {
        // Calculate profit/loss changes
        const buyPrice = relatedInvestment.buy_price || item.buy_price_per_unit;
        const realizedPLRemoved = (item.price_per_unit - buyPrice) * quantityRestored;
        
        // Match the database function's note format exactly
        const restorationNote = `Restored ${quantityRestored} units from sale reversion on ${new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}`;
        
        let updatedNotes;
        if (relatedInvestment.notes && relatedInvestment.notes.trim() !== '') {
          updatedNotes = relatedInvestment.notes + '\n' + restorationNote;
        } else {
          updatedNotes = restorationNote;
        }

        updatedInvestment = {
          ...relatedInvestment,
          quantity: revertResult.new_investment_quantity,
          total_sold_quantity: Math.max(0, (relatedInvestment.total_sold_quantity || 0) - quantityRestored),
          total_sale_value: Math.max(0, (relatedInvestment.total_sale_value || 0) - saleValueLost),
          realized_profit_loss: (relatedInvestment.realized_profit_loss || 0) - realizedPLRemoved,
          unrealized_profit_loss: (relatedInvestment.current_price - buyPrice) * revertResult.new_investment_quantity,
          notes: updatedNotes
        };
        
        // Update the related investment
        onUpdate(relatedInvestmentId, updatedInvestment, false, null, true);
      } 
      
      toast.saleReverted(fullItemName, quantityRestored, saleValueLost, false);
      
    } else if (revertResult.type === 'investment_recreated') {
      // Investment was deleted - new one was created
      const wasOriginalDatePreserved = revertResult.original_created_at !== null;
      
      // Create the new investment data for immediate UI update
      const newInvestmentData = {
        id: revertResult.new_investment_id,
        user_id: userSession.id,
        type: item.item_type || 'liquid',
        name: item.item_name,
        skin_name: item.item_skin_name,
        condition: item.item_condition,
        variant: item.item_variant || 'normal',
        buy_price: item.buy_price_per_unit,
        current_price: item.buy_price_per_unit,
        quantity: revertResult.quantity_restored,
        image_url: item.image_url,
        notes: item.notes ? `${item.notes}\nRecreated from sale reversion on ${new Date().toLocaleDateString()}` : `Recreated from sale reversion on ${new Date().toLocaleDateString()}`,
        created_at: revertResult.original_created_at || new Date().toISOString(),
        total_sold_quantity: 0,
        total_sale_value: 0,
        realized_profit_loss: 0,
        unrealized_profit_loss: 0,
        original_quantity: revertResult.quantity_restored
      };
      
      // Add the new investment to the UI immediately
      onUpdate(revertResult.new_investment_id, newInvestmentData, false, null, true);
    
      toast.saleReverted(
        fullItemName, 
        revertResult.quantity_restored, 
        revertResult.sale_value_lost, 
        true,
        wasOriginalDatePreserved
      );
    }
    
    // Remove this sold item from the UI
    onRemove(item.id, false);
    
  } catch (err) {
    console.error('Error reverting sale:', err);
    toast.error(getErrorMessage(err));
  } finally {
    setAsyncState({ isLoading: false, operation: null, error: null });
  }
};

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

    // Handle price source changes
    if (editForm.price_source === 'manual') {
      // Manual price logic remains the same
      const manualPriceValue = parseFloat(editForm.manual_price);
      if (isNaN(manualPriceValue) || manualPriceValue <= 0) {
        throw new Error('Manual price must be greater than 0');
      }
      
      const { error: priceError } = await supabase.rpc('set_investment_price_override', {
        p_investment_id: item.id,
        p_user_id: userSession.id,
        p_override_price: manualPriceValue,
        p_use_override: true
      });
      
      if (priceError) throw priceError;
      
    } else if (editForm.price_source !== item.price_source || item.preferred_marketplace_override) {
      // User selected a specific marketplace different from current
      const { error: marketplaceError } = await supabase.rpc('set_investment_marketplace_override', {
        p_investment_id: item.id,
        p_user_id: userSession.id,
        p_marketplace: editForm.price_source
      });
      
      if (marketplaceError) throw marketplaceError;
      
    } else {
      // Clear any existing overrides to use true global preference
      const { error: priceError } = await supabase.rpc('set_investment_price_override', {
        p_investment_id: item.id,
        p_user_id: userSession.id,
        p_override_price: null,
        p_use_override: false
      });
      
      if (priceError) throw priceError;
      
      const { error: marketplaceError } = await supabase.rpc('set_investment_marketplace_override', {
        p_investment_id: item.id,
        p_user_id: userSession.id,
        p_marketplace: null
      });
      
      if (marketplaceError) throw marketplaceError;
    }

    // Update through database RPC with user context
    const { error } = await supabase.rpc('update_investment_with_context', {
      investment_id: item.id,
      investment_data: updateData,
      context_user_id: userSession.id
    });

    if (error) throw error;
    
    // For non-manual prices, refresh data to get updated marketplace pricing
    const updatedItem = {
  ...item,
  ...updateData,
  // Update pricing fields based on form selection
  market_price_override: editForm.price_source === 'manual' ? parseFloat(editForm.manual_price) : null,
  use_override: editForm.price_source === 'manual',
  preferred_marketplace_override: editForm.price_source === 'global' ? null : 
    (editForm.price_source === 'manual' ? item.preferred_marketplace_override : editForm.price_source),
  
  // Update current_price optimistically
  current_price: editForm.price_source === 'manual' ? parseFloat(editForm.manual_price) :
    (getAvailableMarketplaces().find(mp => mp.marketplace === editForm.price_source)?.price || item.current_price),
  
  // Update price_source for display
  price_source: editForm.price_source === 'manual' ? 'manual' : 
    (editForm.price_source === 'global' ? (item.price_source === 'manual' ? 'csfloat' : item.price_source) : editForm.price_source),
  
  unrealized_profit_loss: (
    (editForm.price_source === 'manual' ? parseFloat(editForm.manual_price) :
      (getAvailableMarketplaces().find(mp => mp.marketplace === editForm.price_source)?.price || item.current_price)
    ) - updateData.buy_price
  ) * updateData.quantity,
  
  original_quantity: Math.max(item.original_quantity || item.quantity, updateData.quantity)
};

onUpdate(item.id, updatedItem, false);
    
    setMode(ITEM_MODES.VIEW);
    toast.itemUpdated(fullItemName);

  }).catch(err => {
    toast.error(getErrorMessage(err));
  });
}, [handleAsyncOperation, editForm, item, userSession.id, onUpdate, onRefresh, toast, fullItemName, getErrorMessage]);

const handleSoldEditFormSubmit = useCallback(async () => {
  await handleAsyncOperation('EDIT_SOLD_SUBMIT', async () => {
    // Validate input data
    const quantity = parseInt(soldEditForm.quantity_sold);
    const pricePerUnit = parseFloat(soldEditForm.price_per_unit);
    
    if (quantity < 1 || quantity > 9999) {
      throw new Error('Quantity must be between 1 and 9999');
    }
    
    if (pricePerUnit <= 0) {
      throw new Error('Sale price must be greater than 0');
    }

    // Update through database RPC - only pass editable fields
    const { data: result, error } = await supabase.rpc('update_investment_sale_with_context', {
      p_sale_id: item.id,
      p_quantity_sold: quantity,
      p_price_per_unit: pricePerUnit,
      p_item_condition: null, // Don't change condition
      p_item_variant: null,   // Don't change variant
      p_notes: soldEditForm.notes?.trim() || null,
      p_user_id: userSession.id
    });

    if (error) throw error;
    
    // Calculate new values for optimistic update
    const newTotalSaleValue = quantity * pricePerUnit;
    const oldQuantity = item.quantity_sold;
    const oldSaleValue = item.total_sale_value;
    const quantityDiff = quantity - oldQuantity;
    const saleValueDiff = newTotalSaleValue - oldSaleValue;
    
    // Optimistic update for sold item - only update allowed fields
    const updatedItem = {
      ...item,
      quantity_sold: quantity,
      price_per_unit: pricePerUnit,
      total_sale_value: newTotalSaleValue,
      notes: soldEditForm.notes?.trim() || null
      // condition and variant remain unchanged
    };

    // Update related active investment if it exists
    if (item.investment_id && relatedInvestment) {
        const buyPrice = relatedInvestment.buy_price;
        const oldProfitLoss = (item.price_per_unit - buyPrice) * oldQuantity;
        const newProfitLoss = (pricePerUnit - buyPrice) * quantity;
        const profitLossDiff = newProfitLoss - oldProfitLoss;
        
        const updatedInvestment = {
          ...relatedInvestment,
          total_sold_quantity: (relatedInvestment.total_sold_quantity || 0) + quantityDiff,
          total_sale_value: (relatedInvestment.total_sale_value || 0) + saleValueDiff,
          realized_profit_loss: (relatedInvestment.realized_profit_loss || 0) + profitLossDiff
        };
        
        // Call onUpdate for the related investment (pass a flag to indicate this is a related update)
        onUpdate(item.investment_id, updatedInvestment, false, null, true);
    }

    onUpdate(item.id, updatedItem, false);
    setMode(ITEM_MODES.VIEW);
    setSoldEditForm(null);

    toast.saleRecordUpdated(fullItemName);

  }).catch(err => {
    toast.error(getErrorMessage(err));
  });
}, [handleAsyncOperation, soldEditForm, item, userSession.id, onUpdate, toast, fullItemName, getErrorMessage, relatedInvestment]);

// Cancel edit form and reset to defaults
const handleEditFormCancel = useCallback(() => {
  setEditForm(null);
  setSoldEditForm(null);
  setMode(ITEM_MODES.VIEW);
}, []);

// Handle edit form field changes
const handleEditFormChange = useCallback((field, value) => {
  setEditForm(prev => ({
    ...prev,
    [field]: value
  }));
}, []);

const handleSoldEditFormChange = useCallback((field, value) => {
  setSoldEditForm(prev => ({
    ...prev,
    [field]: value
  }));
}, []);

const showSalesBreakdown = !isSoldItem && salesSummary.hasAnySales;

  return (
    <div className={`break-inside-avoid bg-gradient-to-br from-gray-800 to-slate-800 rounded-lg p-4 border border-gray-700 hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/10 transition-all duration-300 ${animationClass} ${profitMetrics.isFullySold ? 'opacity-75' : ''}`}>
      <div className="flex items-start space-x-4">
        {/* Image Container with Variant Badges */}
        <div className="relative w-20 h-20 bg-gray-700/50 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center border border-gray-600/50">
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
          {profitMetrics.isFullySold && (
            <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
              <span className="text-green-400 text-xs font-semibold bg-green-600/30 px-0.5 py-0.5 rounded">SOLD</span>
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
              <div className={`flex items-center ${(variant && variant !== 'normal') ? 'space-x-2 mt-1' : ''}`}>
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

              <div>
                <span className="text-gray-400 text-xs">Sale Date: </span>
                <span className="text-white text-xs">
                  {item.sale_date ? new Date(item.sale_date).toLocaleDateString() : 'Unknown'}
                </span>
              </div>

              {/* Notes display with popup on click */}
                {item.notes && (
                  <div>
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

                {/* Additional sale details */}
                <div className="mt-1">
                  <span className="text-gray-400">Quantity: </span>
                  <span className="text-white">{item.quantity_sold}</span>
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
              <div className={`flex items-center ${(variant && variant !== 'normal') ? 'space-x-2 mt-1' : ''}`}>
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

              {/* Purchase Date for active items */}
              <div>
                <span className="text-gray-400 text-xs">Purchased: </span>
                <span className="text-white text-xs">
                  {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Unknown'}
                </span>
              </div>

              {/* Notes display with popup on click */}
              {item.notes && (
                <div>
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
                      ${baseMetrics.buyPrice.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-0.5">Current:</div>
                    <div className="text-white">
                      {hasValidPriceData(item) ? ( 
                        <div className="flex items-center space-x-1">
                            <span>${baseMetrics.currentPrice.toFixed(2)}</span>
                            {/* Price loading indicator for recently added items */} 
                            {isNew && (
                              <div className="relative group">
                                <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                  Loading current price...
                                </div>
                              </div>
                            )}
                            
                            {/* Manual price icon */}
                            {item.price_source === 'manual' && (
                              <div className="relative group">
                                <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                  Custom price override
                                </div>
                              </div>
                            )}
                            
                            {/* Bid price icon - only show for non-manual prices and exclude new items */}
                            {item.price_source !== 'manual' && !isNew && isBidOnlyPrice() && (
                              <div className="relative group">
                                <AlertTriangle className="w-3 h-3 text-yellow-400" />
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                  Bid-only price (buy order)
                                </div>
                              </div>
                            )}
                          </div>
                        ) : ( <span className="text-gray-500 text-sm flex items-center space-x-1">
                            {isPriceLoading ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Loading...</span>
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                <span>No data</span>
                              </>
                            )}
                          </span>
                        )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quantity display with sold status indicator */}
              <div className="mt-2 text-sm">
                <div className="flex items-center space-x-1.5">
                  <span className="text-gray-400">Remaining:</span>
                  <span className="text-white">{profitMetrics.availableQuantity}</span>
                  {/* Show sold quantity if any items have been sold */}
                  {salesSummary.soldItems > 0 && (
                    <span className="text-green-400 text-xs">
                      ({salesSummary.soldItems} sold)
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
        
        {/* Right sidebar - P&L display and action buttons */}
        <div className="text-right flex-shrink-0 self-start w-28">
          <div className={`flex items-center space-x-1 ${
            profitMetrics.totalProfitLoss >= 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {profitMetrics.totalProfitLoss >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span className="font-medium">${Math.abs(profitMetrics.totalProfitLoss).toFixed(2)}</span>
            <span className="text-xs">({profitMetrics.profitPercentage}%)</span>
          </div>
          
          {/* P&L breakdown for items with mixed realized/unrealized gains - helps users understand split */}
          {showSalesBreakdown && (
            <div className="text-xs text-gray-400 mt-1">
              <div>Realized: {salesSummary.realizedProfitLoss >= 0 ? '+' : '-'}${Math.abs(salesSummary.realizedProfitLoss).toFixed(2)}</div>
              <div>Unrealized: {salesSummary.unrealizedProfitLoss >= 0 ? '+' : '-'}${Math.abs(salesSummary.unrealizedProfitLoss).toFixed(2)}</div>
              <div>Avg Sale: ${salesSummary.averageSalePrice.toFixed(2)}</div>
            </div>
          )}
          
          {/* Action buttons for active items */}
          {!isSoldItem && (
            <div className="mt-2 space-y-1">
              {/* Edit Button */}
              <button
                onClick={handleStartEdit}
                className="text-xs bg-blue-500/20 text-blue-400 px-3 py-1.5 rounded hover:bg-blue-500/30 transition-colors block w-full flex items-center justify-center space-x-1 transform hover:scale-103 active:scale-95 transition-transform"
              >
                <Edit2 className="w-3 h-3" />
                <span>Edit</span>
              </button>
              
              {/* Dynamic sell button - changes text based on sale history */}
              {!profitMetrics.isFullySold ? (
                <button
                  onClick={handleStartSell}
                  className="text-xs bg-orange-500/20 text-orange-400 px-3 py-1.5 rounded hover:bg-orange-500/30 transition-colors block w-full transform hover:scale-103 active:scale-95 transition-transform"
                >
                  {salesSummary.soldItems === 0 ? 'Mark Sold' : 'Sell More'}
                </button>
              ) : (
                <div className="text-xs bg-green-500/20 text-green-400 px-3 py-1.5 rounded border border-green-500/30 text-center">
                  Fully Sold
                </div>
              )}
              
              <button
                onClick={() => onDelete(item)}
                className="text-xs bg-red-500/20 text-red-400 px-3 py-1.5 rounded hover:bg-red-500/30 transition-colors block w-full transform hover:scale-103 active:scale-95 transition-transform"
              >
                Delete
              </button>
            </div>
          )}

          {/* Action buttons for sold items */}
          {isSoldItem && (
          <div className="mt-2 space-y-1">
            <button
              onClick={handleStartEdit}
              disabled={asyncState.isLoading}
              className="text-xs bg-blue-500/20 text-blue-400 px-3 py-1.5 rounded hover:bg-blue-500/30 transition-colors block w-full flex items-center justify-center space-x-1 disabled:opacity-50 transform hover:scale-103 active:scale-95 transition-transform"
            >
              <Edit2 className="w-3 h-3" />
              <span>Edit Sale</span>
            </button>
            
            <button
              onClick={handleRevertSale}
              disabled={asyncState.isLoading}
              className="text-xs bg-amber-500/20 text-amber-400 px-3 py-1.5 rounded hover:bg-amber-500/30 transition-colors block w-full flex items-center justify-center space-x-1 disabled:opacity-50 transform hover:scale-103 active:scale-95 transition-transform">
              {asyncState.operation === 'REVERT_SALE' && asyncState.isLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              )}
              <span>Revert Sale</span>
            </button>
            
            <button
              onClick={() => onDelete(item)}
              disabled={asyncState.isLoading}
              className="text-xs bg-red-500/20 text-red-400 px-3 py-1.5 rounded hover:bg-red-500/30 transition-colors block w-full disabled:opacity-50 transform hover:scale-103 active:scale-95 transition-transform"
            >
              Delete Sale
            </button>
          </div>
          )}
        </div>
      </div>
      
      {/* Edit Form - restrict fields for sold items */}
      {mode === ITEM_MODES.EDITING && (
        <div className="space-y-3">
          {isSoldItem ? (
            // SOLD ITEM EDIT FORM - Only allow quantity and price changes
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Quantity Sold
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="9999"
                    value={soldEditForm.quantity_sold}
                    onChange={(e) => handleSoldEditFormChange('quantity_sold', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Sale Price (each)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={soldEditForm.price_per_unit}
                    onChange={(e) => handleSoldEditFormChange('price_per_unit', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>
              
              {/* Notes field */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={soldEditForm.notes}
                  onChange={(e) => handleSoldEditFormChange('notes', e.target.value)}
                  placeholder="Add notes about this sale..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none resize-none"
                  rows="2"
                />
              </div>
            </>
          ) : (
            // ACTIVE ITEM EDIT FORM - Allow all fields
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Condition
                  </label>
                  <select
                    value={editForm.condition}
                    onChange={(e) => handleEditFormChange('condition', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                  >
                    {CONDITION_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Variant
                  </label>
                  <select
                    value={editForm.variant}
                    onChange={(e) => handleEditFormChange('variant', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                  >
                    {VARIANT_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="9999"
                    value={editForm.quantity}
                    onChange={(e) => handleEditFormChange('quantity', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Buy Price (each)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={editForm.buy_price}
                    onChange={(e) => handleEditFormChange('buy_price', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>    

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Price Source
                    </label>
                    <select
                      value={editForm.price_source}
                      onChange={(e) => handleEditFormChange('price_source', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                    >
                      {/* Remove the "Global Preference" option entirely */}
                      {getAvailableMarketplaces().map(mp => (
                        <option key={mp.marketplace} value={mp.marketplace}>
                          {mp.marketplace.toUpperCase()}
                          {mp.is_bid_price ? ' (Bid)' : ''}
                        </option>
                      ))}
                      <option value="manual">Set Manual Price</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Current Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={editForm.price_source === 'manual' ? editForm.manual_price : 
                        (getAvailableMarketplaces().find(mp => mp.marketplace === editForm.price_source)?.price?.toFixed(2) || 
                        item.current_price?.toFixed(2) || '')}
                      onChange={(e) => handleEditFormChange('manual_price', e.target.value)}
                      disabled={editForm.price_source !== 'manual'}
                      className={`w-full px-3 py-2 border border-gray-600 rounded-lg text-white focus:border-orange-500 focus:outline-none ${
                        editForm.price_source !== 'manual' 
                          ? 'bg-gray-600 cursor-not-allowed opacity-75' 
                          : 'bg-gray-700'
                      }`}
                      placeholder={editForm.price_source !== 'manual' ? 'Managed automatically' : 'Enter manual price'}
                    />
                  </div>
                </div>
              
              
              {/* Notes field */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => handleEditFormChange('notes', e.target.value)}
                  placeholder="Add notes about this investment..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none resize-none"
                  rows="2"
                />
              </div>
            </>
          )}
          
          {/* Form buttons remain the same */}
          <div className="flex space-x-2">
            <button
              onClick={isSoldItem ? handleSoldEditFormSubmit : handleEditFormSubmit}
              disabled={asyncState.isLoading}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {asyncState.isLoading ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={handleEditFormCancel}
              disabled={asyncState.isLoading}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Partial sale form - handles selling portions of investment positions */}
      {mode === ITEM_MODES.SELLING && !profitMetrics.isFullySold && !isSoldItem && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <h5 className="text-sm font-medium text-white mb-2">
            Sell Items ({profitMetrics.availableQuantity} available)
          </h5>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Quantity to sell
              </label>
              <input
                type="number"
                min="1"
                max={profitMetrics.availableQuantity}
                value={soldQuantity}
                onChange={(e) => setSoldQuantity(Math.min(parseInt(e.target.value) || 1, profitMetrics.availableQuantity))}
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