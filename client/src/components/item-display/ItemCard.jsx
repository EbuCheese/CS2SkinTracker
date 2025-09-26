import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Loader2, Edit2, Save, AlertTriangle, Info, Calendar, DollarSign, Store, Package } from 'lucide-react';
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

  // comparison prop function
  const areItemsEqual = (prevProps, nextProps) => {
  // Critical props that should trigger re-renders
  const criticalProps = [
    'item.id',
    'item.quantity',
    'item.current_price',
    'item.buy_price', 
    'item.realized_profit_loss',
    'item.unrealized_profit_loss',
    'item.total_sold_quantity',
    'item.total_sale_value',
    'item.notes',
    'item.condition',
    'item.variant',
    'isNew',
    'isPriceLoading',
    'isSoldItem'
  ];

  // Check if any critical prop has changed
  for (const prop of criticalProps) {
    const keys = prop.split('.');
    let prevValue = prevProps;
    let nextValue = nextProps;
    
    for (const key of keys) {
      prevValue = prevValue?.[key];
      nextValue = nextValue?.[key];
    }
    
    if (prevValue !== nextValue) {
      return false;
    }
  }

  // Special check for itemStates since it's a Map
  const prevItemState = prevProps.itemStates?.get(prevProps.item.id) || { isNew: false, isPriceLoading: false };
  const nextItemState = nextProps.itemStates?.get(nextProps.item.id) || { isNew: false, isPriceLoading: false };
  
  if (prevItemState.isNew !== nextItemState.isNew || 
      prevItemState.isPriceLoading !== nextItemState.isPriceLoading) {
    return false;
  }

  return true;
};

// Main ItemCard Component - Displays individual investment items with interactive features
const ItemCard = React.memo(({ 
  item, 
  userSession, 
  onUpdate, 
  onDelete, 
  onRemove, 
  onRefresh, 
  isNew = false, 
  isPriceLoading = false, 
  isSoldItem = false, 
  relatedInvestment = null, 
  refreshSingleItemPrice,
  updateItemState,
  setInvestments 
}) => {  
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
  
  // Check if valid prices
  const availableMarketplaces = getAvailableMarketplaces();
  const isCurrentSourceAvailable = availableMarketplaces.some(mp => mp.marketplace === currentPriceSource);
  
  // If no marketplaces available OR current source isn't available, default to manual
  const effectivePriceSource = (availableMarketplaces.length === 0 || !isCurrentSourceAvailable) 
    ? 'manual' 
    : currentPriceSource;

  return {
    condition: displayValues.condition || '',
    variant: displayValues.variant || 'normal',
    quantity: item.quantity || 1,
    buy_price: item.buy_price || 0,
    notes: item.notes || '',
    price_source: effectivePriceSource,
    manual_price: item.market_price_override || item.current_price || ''
  };
}, [isSoldItem, displayValues.condition, displayValues.variant, 
    item.quantity_sold, item.price_per_unit, item.quantity, item.buy_price, item.notes,
    item.price_source, item.preferred_marketplace_override, item.market_price_override, item.current_price, getAvailableMarketplaces]);

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
    
    let investmentIdToRefresh = null;
    
    if (revertResult.type === 'quantity_restored') {
      investmentIdToRefresh = revertResult.investment_id;
    } else if (revertResult.type === 'investment_recreated') {
      investmentIdToRefresh = revertResult.new_investment_id;
    }
    
    // refresh the single price of the reverted item
    if (investmentIdToRefresh) {
      updateItemState(investmentIdToRefresh, { isPriceLoading: true });
      
      setTimeout(() => {
        refreshSingleItemPrice(
          investmentIdToRefresh,
          userSession,
          // Success callback
          (itemId, refreshedItemData) => {
            setInvestments(prev => prev.map(inv =>
              inv.id === itemId ? refreshedItemData : inv
            ));
            updateItemState(itemId, { isPriceLoading: false });
          },
          // Error callback
          (itemId, error) => {
            console.error('Failed to refresh price after reversion:', error);
            updateItemState(itemId, { isPriceLoading: false });
            toast.warning('Price data will be updated on next refresh');
          }
        );
      }, 1000);
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
      const manualPriceValue = editForm.manual_price ? parseFloat(editForm.manual_price) : null;
      
      if (manualPriceValue === null || manualPriceValue === '') {
        // User wants to clear manual override - revert to no pricing
        const { error: priceError } = await supabase.rpc('set_investment_price_override', {
          p_investment_id: item.id,
          p_user_id: userSession.id,
          p_override_price: null,
          p_use_override: false
        });
        
        if (priceError) throw priceError;
      } else if (isNaN(manualPriceValue) || manualPriceValue <= 0) {
        throw new Error('Manual price must be greater than 0 or left empty to remove override');
      } else {
        // Valid manual price
        const { error: priceError } = await supabase.rpc('set_investment_price_override', {
          p_investment_id: item.id,
          p_user_id: userSession.id,
          p_override_price: manualPriceValue,
          p_use_override: true
        });
        
        if (priceError) throw priceError;
      }
      
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
    
    // After successful database update, check if item identity changed
    const itemIdentityChanged = 
      editForm.condition !== item.condition ||
      editForm.variant !== item.variant ||
      editForm.name !== item.name ||
      editForm.skin_name !== item.skin_name;

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

    // Refresh price if item identity changed
    if (itemIdentityChanged) {
      updateItemState(item.id, { isPriceLoading: true });
      
      setTimeout(() => {
        refreshSingleItemPrice(
          item.id,
          userSession,
          // Success callback
          (itemId, refreshedItemData) => {
            setInvestments(prev => prev.map(inv =>
              inv.id === itemId ? refreshedItemData : inv
            ));
            updateItemState(itemId, { isPriceLoading: false });
          },
          // Error callback
          (itemId, error) => {
            console.error('Failed to refresh price after edit:', error);
            updateItemState(itemId, { isPriceLoading: false });
            toast.warning('Price data will be updated on next refresh');
          }
        );
      }, 1000);
    }

    setMode(ITEM_MODES.VIEW);
    toast.itemUpdated(fullItemName);

  }).catch(err => {
    toast.error(getErrorMessage(err));
  });
}, [handleAsyncOperation, editForm, item, userSession.id, onUpdate, onRefresh, toast, fullItemName, refreshSingleItemPrice, updateItemState, setInvestments, getErrorMessage]);

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
  <div className={`break-inside-avoid bg-gradient-to-br from-gray-800 to-slate-800 rounded-xl p-5 border border-slate-700/50 hover:border-orange-400/30 shadow-xl hover:shadow-orange-500/5 transition-all duration-300 ${animationClass} ${profitMetrics.isFullySold ? 'opacity-75' : ''} overflow-hidden`}>
    {/* Header Section */}
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-start space-x-4">
        {/* Image Container with Variant Badges */}
        <div className="relative group">
          <div className="w-20 h-20 bg-gradient-to-br from-slate-700/30 to-gray-700/30 rounded-2xl overflow-hidden border border-slate-600/40 shadow-lg">
            {item.image_url ? (
              <img src={item.image_url} alt={name} className="w-full h-full object-contain p-1" />
            ) : (
              <div className="text-gray-400 text-xs text-center flex items-center justify-center h-full">No Image</div>
            )}
          </div>
          
          {/* Variant badges */}
          {(variant && variant !== 'normal') && (
            <div className={`absolute -top-1 -right-1 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-lg ${
              variant === 'stattrak' 
                ? 'bg-gradient-to-r from-orange-500 to-red-500' 
                : 'bg-gradient-to-r from-yellow-500 to-yellow-600'
            }`}>
              {variant === 'stattrak' ? 'ST' : 'SV'}
            </div>
          )}

          {/* Sold indicator for fully sold items */}
          {profitMetrics.isFullySold && (
            <div className="absolute inset-0 bg-green-500/10 rounded-2xl flex items-center justify-center backdrop-blur-[1px]">
              <span className="bg-green-500/90 text-white text-xs px-2 py-1 rounded-full font-medium">SOLD</span>
            </div>
          )}
        </div>
        
        {/* Title and metadata section */}
        <div className="space-y-1.5 flex-1 min-w-0">
          <div>
            <h3 className="text-base font-bold text-white leading-tight truncate" title={name}>
              {name.length > 25 ? `${name.slice(0, 25)}...` : name}
            </h3>
            {skinName && (
              <p className="text-white font-medium text-xs leading-tight truncate">{skinName}</p>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            {condition && (
              <span className="text-xs px-2 py-1 rounded-md bg-slate-700/50 text-slate-300 border border-slate-600/30">
                {condition}
              </span>
            )}
            <span className="text-xs text-slate-400 flex items-center">
              <Calendar className="w-3 h-3 mr-1" />
              {new Date(isSoldItem ? item.sale_date : item.created_at).toLocaleDateString()}
            </span>
          </div>

          {/* Notes display */}
          {item.notes && (
            <div className="mt-2">
              <button
                onClick={() => showPopup({
                  type: 'note',
                  title: 'Item Note',
                  message: item.notes,
                  confirmText: 'Close'
                })}
                className="text-xs text-slate-400 italic hover:text-orange-300 transition-colors flex items-center space-x-1"
              >
                <span className="truncate max-w-[200px]">note: {item.notes}</span>
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* P&L Display */}
      <div className="text-right flex-shrink-0">
        <div className={`text-lg font-bold flex items-center justify-end space-x-1 ${
          profitMetrics.totalProfitLoss >= 0 ? 'text-green-400' : 'text-red-400'
        }`}>
          <span>
            {profitMetrics.totalProfitLoss >= 0 ? '+' : '-'}$
            {Math.abs(profitMetrics.totalProfitLoss).toLocaleString('en-US', { maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className={`text-xs ${
          profitMetrics.totalProfitLoss >= 0 ? 'text-green-300/80' : 'text-red-300/80'
        }`}>
          {parseFloat(profitMetrics.profitPercentage) >= 0 ? '+' : ''}{parseFloat(profitMetrics.profitPercentage).toLocaleString('en-US', { maximumFractionDigits: 2 })}%
        </div>
        
        {/* Breakdown of profits */}
        {!isSoldItem && salesSummary.hasAnySales && (
          <div className="mt-0.5 text-[10px] text-slate-400 leading-tight space-y-0">
            <div>
              {salesSummary.realizedProfitLoss >= 0 ? '+' : '-'}${Math.abs(salesSummary.realizedProfitLoss).toLocaleString('en-US', { maximumFractionDigits: 2 })} real
            </div>
            <div>
              {salesSummary.unrealizedProfitLoss >= 0 ? '+' : '-'}${Math.abs(salesSummary.unrealizedProfitLoss).toLocaleString('en-US', { maximumFractionDigits: 2 })} unreal
            </div>
            <div className="text-yellow-400">
              avg: ${salesSummary.averageSalePrice.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Metrics Section */}
    <div className="grid grid-cols-3 gap-3 mb-3">
      <div className="bg-slate-800/40 rounded-lg p-2 border border-slate-700/30">
        <div className="flex items-center space-x-1 mb-0.5">
          <DollarSign className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-[11px] text-slate-400 uppercase tracking-wide">
            {isSoldItem ? 'Sale Price' : 'Buy Price'}
          </span>
        </div>
        <div className="text-sm font-bold text-white">
          ${isSoldItem ? 
            item.price_per_unit?.toLocaleString('en-US', { maximumFractionDigits: 2 }) : 
            item.buy_price?.toLocaleString('en-US', { maximumFractionDigits: 2 })
          }
        </div>
      </div>
      
      <div className="bg-slate-800/40 rounded-lg p-2 border border-slate-700/30 relative">
        <div className="flex items-center space-x-1 mb-0.5">
          <Store className="w-3.5 h-3.5 text-orange-400" />
          <span className="text-[11px] text-slate-400 uppercase tracking-wide">
            {isSoldItem ? 'Buy Price' : 'Current'}
          </span>
        </div>
        <div className="text-sm font-bold text-white">
          {isSoldItem ? (
            `$${item.buy_price_per_unit?.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
          ) : (
            <div className="flex items-center space-x-1">
              {hasValidPriceData(item) ? (
                <span>${baseMetrics.currentPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
              ) : (
                <span className="text-gray-500 text-sm">No data</span>
              )}
              {isPriceLoading && <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />}
              {item.price_source === 'manual' && (
                <div className="relative group">
                  <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    Manual Price
                  </div>
                </div>
              )}
              {item.price_source !== 'manual' && !isNew && isBidOnlyPrice() && (
                <div className="relative group">
                  <AlertTriangle className="w-3 h-3 text-yellow-400 mt-0.5" />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    Bid Price Only
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="bg-slate-800/40 rounded-lg p-2 border border-slate-700/30">
        <div className="flex items-center space-x-1 mb-0.5">
          <Package className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-[11px] text-slate-400 uppercase tracking-wide">
            {isSoldItem ? 'Total Sale' : 'Quantity'}
          </span>
        </div>
        <div className="text-sm font-bold text-white">
          {isSoldItem ? (
            `$${item.total_sale_value?.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
          ) : (
            <div className="flex items-center space-x-1">
              <span>{profitMetrics.availableQuantity.toLocaleString('en-US')}</span>
              {salesSummary.soldItems > 0 && (
                <span className="text-xs text-green-400">
                  ({salesSummary.soldItems.toLocaleString('en-US')} sold)
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Actions at bottom */}
    <div className="flex space-x-1.5">
      {!isSoldItem ? (
        <>
          <button
            onClick={handleStartEdit}
            className="flex-1 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center justify-center space-x-1 border border-slate-600/30 hover:border-slate-500/50"
          >
            <Edit2 className="w-3 h-3" />
            <span>Edit</span>
          </button>
          {!profitMetrics.isFullySold ? (
            <button
              onClick={handleStartSell}
              className="flex-1 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center justify-center space-x-1 border border-slate-600/30 hover:border-slate-500/50"
            >
              <DollarSign className="w-3 h-3" />
              <span>{salesSummary.soldItems === 0 ? 'Sell' : 'Sell More'}</span>
            </button>
          ) : (
            <div className="flex-1 bg-green-700/20 text-green-400 px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center justify-center border border-green-600/30">
              Fully Sold
            </div>
          )}
          <button
            onClick={() => onDelete(item)}
            className="bg-slate-700/50 hover:bg-red-600/30 text-slate-400 hover:text-red-300 px-2 py-1.5 rounded-md transition-colors border border-slate-600/30 hover:border-red-600/30"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </>
      ) : (
        <>
          <button
            onClick={handleStartEdit}
            className="flex-1 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center justify-center space-x-1 border border-slate-600/30 hover:border-slate-500/50"
          >
            <Edit2 className="w-3 h-3" />
            <span>Edit</span>
          </button>
          <button
            onClick={handleRevertSale}
            disabled={asyncState.isLoading}
            className="flex-1 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center justify-center space-x-1 border border-slate-600/30 hover:border-slate-500/50 disabled:opacity-50"
          >
            {asyncState.operation === 'REVERT_SALE' && asyncState.isLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            )}
            <span>Revert</span>
          </button>
          <button
            onClick={() => onDelete(item)}
            disabled={asyncState.isLoading}
            className="bg-slate-700/50 hover:bg-red-600/30 text-slate-400 hover:text-red-300 px-2 py-1.5 rounded-md transition-colors border border-slate-600/30 hover:border-red-600/30 disabled:opacity-50"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </>
      )}
    </div>
      
    {/* Edit Form - restrict fields for sold items */}
    {mode === ITEM_MODES.EDITING && (
      <div className="mt-4 pt-4 border-t border-gray-700 space-y-3">
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
                <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center space-x-1">
                  <span>Current Price</span>
                  {editForm.price_source === 'manual' && (
                    <div className="relative group">
                      <Info className="w-3 h-3 mt-0.5 text-gray-500 hover:text-gray-400 cursor-help" />
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        Leave empty and save to remove manual pricing
                      </div>
                    </div>
                  )}
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
      <div className="mt-4 pt-4 border-t border-gray-700">
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

    {/* Centralized popup system */}
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
}, areItemsEqual);

export default ItemCard;