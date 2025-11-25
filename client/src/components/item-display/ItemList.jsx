import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Loader2, Edit2, ChartNoAxesColumnIncreasing, AlertTriangle, DollarSign, CalendarPlus, CalendarCheck2, Wallet, Package } from 'lucide-react';
import { supabase } from '@/supabaseClient';
import { PopupManager } from '@/components/ui';
import { EditItemModal, SellItemModal } from '@/components/forms';
import { useScrollLock, formatDateInTimezone, useItemFormatting } from '@/hooks/util';
import { useToast } from '@/contexts/ToastContext';
import { useUserSettings } from '@/contexts/UserSettingsContext';

// Imports all the logic from ItemCard - this component shares the same props and logic
const ItemList = React.memo(({ 
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
    // User settings hook
    const { timezone } = useUserSettings();
  
    // Toast Hook
    const toast = useToast();
  
    // Display name hook
    const { displayName } = useItemFormatting();
  
    // UI state management
    const [animationClass, setAnimationClass] = useState('');
    const [showBreakdown, setShowBreakdown] = useState(false);
  
    const [showEditModal, setShowEditModal] = useState(false);
    const [showSellModal, setShowSellModal] = useState(false);
  
    // Edit form states
    const [formData, setEditForm] = useState(null);
  
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
  useScrollLock(popup.isOpen || showEditModal || showSellModal);
  
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
  
  const displayValues = useMemo(() => {
    const rawName = isSoldItem ? item.item_name : item.name;
    const skinName = isSoldItem ? item.item_skin_name : item.skin_name;
    const condition = isSoldItem ? item.item_condition : item.condition;
    const variant = isSoldItem ? item.item_variant : item.variant;
    
    // Check if this is a music kit item
    const isMusicKit = rawName?.includes('Music Kit');
    
    // For music kits, strip the StatTrak™ prefix if present
    let formattedName = rawName;
    if (isMusicKit && formattedName?.startsWith('StatTrak™ ')) {
      formattedName = formattedName.replace('StatTrak™ ', '');
    }
    
    return {
      name: formattedName,
      skinName: skinName,
      condition: condition,
      variant: variant
    };
  }, [
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
  
  const fullItemName = displayName(item, { includeCondition: true, format: 'full' });
  
  // Initialize edit form and open edit mode
  const handleStartEdit = useCallback(() => {
    setShowEditModal(true);
  }, []);
  
  const handleStartSell = useCallback(() => {
    setShowSellModal(true);
  }, []);
  
  const handleSellSubmit = useCallback(async (quantity, pricePerUnit) => {
    // Close the sell modal immediately
    setShowSellModal(false);
    
    // Calculate sale metrics for processing
    const totalSaleValue = pricePerUnit * quantity;
    const profitLoss = (pricePerUnit - baseMetrics.buyPrice) * quantity;
    
    await handleAsyncOperation(
      'PARTIAL_SALE',
      handleConfirmedSale,
      quantity, pricePerUnit, totalSaleValue, profitLoss
    );
  }, [baseMetrics.buyPrice, handleAsyncOperation]);
  
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
        
      }
      
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
          const restorationNote = `Restored ${quantityRestored} units from sale reversion on ${formatDateInTimezone(new Date(), timezone, { month: 'numeric', day: 'numeric', year: 'numeric' })}`;
  
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
          notes: item.notes ? 
          `${item.notes}\nRecreated from sale reversion on ${formatDateInTimezone(new Date(), timezone, { month: 'numeric', day: 'numeric', year: 'numeric' })}` : 
          `Recreated from sale reversion on ${formatDateInTimezone(new Date(), timezone, { month: 'numeric', day: 'numeric', year: 'numeric' })}`,
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
  const handleEditSubmit = useCallback(async (formData) => {
  
    await handleAsyncOperation('EDIT_SUBMIT', async () => {
      // Prepare update data with type conversion
      const updateData = {
        condition: formData.condition,
        variant: formData.variant,
        quantity: parseInt(formData.quantity),
        buy_price: parseFloat(formData.buy_price),
        notes: formData.notes?.trim() === '' ? null : (formData.notes?.trim() || null)
      };
  
      // Validate input data
      if (updateData.quantity < 1 || updateData.quantity > 9999) {
        throw new Error('Quantity must be between 1 and 9999');
      }
      
      if (updateData.buy_price <= 0) {
        throw new Error('Buy price must be greater than 0');
      }
  
      // Handle price source changes
      if (formData.price_source === 'manual') {
        const manualPriceValue = formData.manual_price ? parseFloat(formData.manual_price) : null;
        
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
        
      } else if (formData.price_source !== item.price_source || item.preferred_marketplace_override) {
        // User selected a specific marketplace different from current
        const { error: marketplaceError } = await supabase.rpc('set_investment_marketplace_override', {
          p_investment_id: item.id,
          p_user_id: userSession.id,
          p_marketplace: formData.price_source
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
        formData.condition !== item.condition ||
        formData.variant !== item.variant;
  
      // For non-manual prices, refresh data to get updated marketplace pricing
      const updatedItem = {
        ...item,
        ...updateData,
        // Update pricing fields based on form selection
        market_price_override: formData.price_source === 'manual' ? parseFloat(formData.manual_price) : null,
        use_override: formData.price_source === 'manual',
        preferred_marketplace_override: formData.price_source === 'global' ? null : 
          (formData.price_source === 'manual' ? item.preferred_marketplace_override : formData.price_source),
        
        // Update current_price optimistically
        current_price: formData.price_source === 'manual' ? parseFloat(formData.manual_price) :
          (getAvailableMarketplaces().find(mp => mp.marketplace === formData.price_source)?.price || item.current_price),
        
        // Update price_source for display
        price_source: formData.price_source === 'manual' ? 'manual' : 
          (formData.price_source === 'global' ? (item.price_source === 'manual' ? 'csfloat' : item.price_source) : formData.price_source),
        
        unrealized_profit_loss: (
          (formData.price_source === 'manual' ? parseFloat(formData.manual_price) :
            (getAvailableMarketplaces().find(mp => mp.marketplace === formData.price_source)?.price || item.current_price)
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
  
      toast.itemUpdated(fullItemName);
      setShowEditModal(false);
  
    }).catch(err => {
      toast.error(getErrorMessage(err));
    });
  }, [handleAsyncOperation, formData, item, userSession.id, onUpdate, onRefresh, toast, fullItemName, refreshSingleItemPrice, updateItemState, setInvestments, getErrorMessage]);
  
  const handleSoldEditFormSubmit = useCallback(async (formData) => {
    await handleAsyncOperation('EDIT_SOLD_SUBMIT', async () => {
      // Validate input data
      const quantity = parseInt(formData.quantity_sold);
      const pricePerUnit = parseFloat(formData.price_per_unit);
      
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
        p_item_condition: null,
        p_item_variant: null,
        p_notes: formData.notes?.trim() === '' ? null : (formData.notes?.trim() || null),
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
        notes: formData.notes?.trim() || null
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
  
      toast.saleRecordUpdated(fullItemName);
      setShowEditModal(false);
  
    }).catch(err => {
      toast.error(getErrorMessage(err));
    });
  }, [handleAsyncOperation, formData, item, userSession.id, onUpdate, toast, fullItemName, getErrorMessage, relatedInvestment]);

  return (
    <div className={`bg-gradient-to-br from-gray-800 to-slate-800 rounded-lg p-3 border border-slate-700/50 hover:border-orange-400/30 transition-all duration-300 ${animationClass} ${profitMetrics.isFullySold ? 'opacity-75' : ''}`}>
      
      {/* HORIZONTAL LAYOUT - Main difference from card view */}
      <div className="flex items-center gap-4">
        
        {/* Image - Smaller in list view */}
        <div className="relative flex-shrink-0">
          <div className={`w-16 h-16 bg-gradient-to-br from-slate-700/30 to-gray-700/30 rounded-xl overflow-hidden border border-slate-600/40 ${profitMetrics.isFullySold ? 'backdrop-blur-[1px]' : ''}`}>
            {item.image_url ? (
              <img 
                src={item.image_url} 
                alt={displayValues.name || 'Item image'}
                className="w-full h-full object-contain p-1"
                style={{ 
                  textIndent: '-9999px' 
                }}
              />
            ) : (
              <div className="text-gray-400 text-xs text-center flex items-center justify-center h-full">No Image</div>
            )}
          </div>
          
          {/* Variant badges */}
          {(() => {
            const rawName = isSoldItem ? item.item_name : item.name;
            const isNameBasedSouvenir = item.isNameBasedSouvenir || rawName?.startsWith('Souvenir Charm') || rawName?.includes('Souvenir Package');
            const isNameBasedStatTrak = item.isNameBasedStatTrak || rawName?.startsWith('StatTrak™ Music Kit') || (rawName?.startsWith('StatTrak™') && rawName?.includes('Music Kit Box'));
            const showSouvenirBadge = isNameBasedSouvenir || (displayValues.variant === 'souvenir');
            const showStatTrakBadge = isNameBasedStatTrak || (displayValues.variant === 'stattrak');
            
            if (!showSouvenirBadge && !showStatTrakBadge) return null;
            
            return (
              <div className={`absolute -top-1 -right-1 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold shadow-lg ${
                showStatTrakBadge ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'bg-gradient-to-r from-yellow-500 to-yellow-600'
              }`}>
                {showStatTrakBadge ? 'ST' : 'SV'}
              </div>
            );
          })()}

          {profitMetrics.isFullySold && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-green-600/90 to-transparent text-white text-[9px] py-0.5 font-bold text-center rounded-b-xl">
              SOLD
            </div>
          )}
        </div>

        {/* Item Info - Takes remaining space */}
        <div className="flex-1 min-w-0 grid grid-cols-12 gap-3 items-center">
          
          {/* Name & Metadata - Col span 4 */}
          <div className="col-span-4 min-w-0">
            <h3 className="text-sm font-bold text-white truncate" title={displayValues.name}>
              {displayValues.name}
            </h3>
            {displayValues.skinName && (
              <p className="text-white/80 text-xs truncate">{displayValues.skinName}</p>
            )}
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {displayValues.condition && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-300 border border-slate-600/30 font-semibold">
                  {displayValues.condition}
                </span>
              )}
              <span className="text-[10px] text-slate-400 flex items-center">
                {isSoldItem ? <CalendarCheck2 className="w-3 h-3 mr-0.5" /> : <CalendarPlus className="w-3 h-3 mr-0.5" />}
                {formatDateInTimezone(isSoldItem ? item.sale_date : item.created_at, timezone, { month: 'short', day: 'numeric', year: '2-digit' })}
              </span>
            </div>
          </div>

          {/* Prices - Col span 3 */}
          <div className="col-span-3 flex gap-2">
            <div className="flex-1">
              <div className="text-[10px] text-slate-400 uppercase mb-0.5">{isSoldItem ? 'Sale' : 'Buy'}</div>
              <div className="text-sm font-bold text-white">
                ${isSoldItem ? item.price_per_unit?.toLocaleString('en-US', { maximumFractionDigits: 2 }) : item.buy_price?.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="flex-1">
              <div className="text-[10px] text-slate-400 uppercase mb-0.5">{isSoldItem ? 'Buy' : 'Current'}</div>
              <div className="text-sm font-bold text-white flex items-center gap-1">
                {isSoldItem ? (
                  `$${item.buy_price_per_unit?.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
                ) : (
                  <>
                    {hasValidPriceData(item) ? `$${baseMetrics.currentPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })}` : <span className="text-gray-500 text-xs">No data</span>}
                    {isPriceLoading && <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />}
                    {item.price_source === 'manual' && (
                      <div className="relative group">
                        <svg className="w-2.5 h-2.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                          Manual Price
                        </div>
                      </div>
                    )}
                    {item.price_source !== 'manual' && !isNew && isBidOnlyPrice() && (
                      <div className="relative group">
                        <AlertTriangle className="w-2.5 h-2.5 text-yellow-400" />
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                          Bid Price Only
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quantity - Col span 2 */}
          <div className="col-span-2">
            <div className="text-[10px] text-slate-400 uppercase mb-0.5">Qty</div>
            <div className="text-sm font-bold text-white">
              {isSoldItem ? baseMetrics.quantity.toLocaleString('en-US') : (
                <div className="flex items-center gap-1">
                  <span>{profitMetrics.availableQuantity.toLocaleString('en-US')}</span>
                  {salesSummary.soldItems > 0 && <span className="text-[10px] text-green-400">({salesSummary.soldItems} sold)</span>}
                </div>
              )}
            </div>
          </div>

          {/* P&L - Col span 2 */}
          <div className="col-span-2">
            <div className="text-[10px] text-slate-400 uppercase mb-0.5">P&L</div>
            <div className={`text-sm font-bold ${profitMetrics.totalProfitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {profitMetrics.totalProfitLoss >= 0 ? '+' : '-'}${Math.abs(profitMetrics.totalProfitLoss).toLocaleString('en-US', { maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-1">
              <div className={`text-[10px] ${profitMetrics.totalProfitLoss >= 0 ? 'text-green-300/80' : 'text-red-300/80'}`}>
                {parseFloat(profitMetrics.profitPercentage) >= 0 ? '+' : ''}{parseFloat(profitMetrics.profitPercentage).toLocaleString('en-US', { maximumFractionDigits: 2 })}%
              </div>
              {/* Breakdown toggle for sold items */}
              {!isSoldItem && salesSummary.hasAnySales && (
                <button
                  onClick={() => setShowBreakdown(!showBreakdown)}
                  className="text-slate-400 hover:text-slate-300 transition-colors"
                  title="Show breakdown"
                >
                  <svg 
                    className={`w-3.5 h-3.5 transition-transform ${showBreakdown ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}
            </div>
            {/* Total sale value for sold items */}
            {isSoldItem && (
              <div className="text-[10px] text-slate-400">
                total: ${item.total_sale_value?.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </div>
            )}
          </div>

          {/* Actions - Col span 1 */}
          <div className="col-span-1 flex gap-1 justify-end">
            {!isSoldItem ? (
              <>
                <button onClick={handleStartEdit} className="p-1.5 bg-slate-700/50 hover:bg-blue-600/20 text-slate-300 hover:text-blue-300 rounded transition-colors border border-slate-600/30 hover:border-blue-500/40" title="Edit">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                {!profitMetrics.isFullySold && (
                  <button onClick={handleStartSell} className="p-1.5 bg-slate-700/50 hover:bg-green-600/20 text-slate-300 hover:text-green-300 rounded transition-colors border border-slate-600/30 hover:border-green-500/40" title="Sell">
                    <DollarSign className="w-3.5 h-3.5" />
                  </button>
                )}
                <button onClick={() => onDelete(item)} className="p-1.5 bg-slate-700/50 hover:bg-red-600/30 text-slate-400 hover:text-red-300 rounded transition-colors border border-slate-600/30 hover:border-red-600/30" title="Delete">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </>
            ) : (
              <>
                <button onClick={handleStartEdit} className="p-1.5 bg-slate-700/50 hover:bg-blue-600/20 text-slate-300 hover:text-blue-300 rounded transition-colors border border-slate-600/30 hover:border-blue-500/40" title="Edit">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={handleRevertSale} disabled={asyncState.isLoading} className="p-1.5 bg-slate-700/50 hover:bg-orange-600/20 text-slate-300 hover:text-orange-300 rounded transition-colors border border-slate-600/30 hover:border-orange-500/40" title="Revert">
                  {asyncState.operation === 'REVERT_SALE' && asyncState.isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>}
                </button>
                <button onClick={() => onDelete(item)} disabled={asyncState.isLoading} className="p-1.5 bg-slate-700/50 hover:bg-red-600/30 text-slate-400 hover:text-red-300 rounded transition-colors border border-slate-600/30 hover:border-red-600/30" title="Delete">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Breakdown Section - Shows below when expanded */}
      {showBreakdown && !isSoldItem && salesSummary.hasAnySales && (
        <div className="mt-3 pt-3 border-t border-slate-700/50">
          <div className="grid  gap-3 text-xs">
            <div>
              <div className="text-slate-400 mb-1">Realized P&L</div>
              <div className={`font-semibold ${salesSummary.realizedProfitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {salesSummary.realizedProfitLoss >= 0 ? '+' : '-'}${Math.abs(salesSummary.realizedProfitLoss).toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <div className="text-slate-400 mb-1">Unrealized P&L</div>
              <div className={`font-semibold ${salesSummary.unrealizedProfitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {salesSummary.unrealizedProfitLoss >= 0 ? '+' : '-'}${Math.abs(salesSummary.unrealizedProfitLoss).toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <div className="text-slate-400 mb-1">Avg Sale Price</div>
              <div className="font-semibold text-yellow-400">
                ${salesSummary.averageSalePrice.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notes Section - Shows below if item has notes */}
      {item.notes && (
        <div className="mt-2 pt-2 border-t border-slate-700/50">
          <button
            onClick={() => showPopup({
              type: 'note',
              title: 'Item Note',
              message: item.notes,
              confirmText: 'Close'
            })}
            className="text-xs text-slate-400 italic hover:text-orange-300 transition-colors"
          >
            <span className="truncate">note: {item.notes}</span>
          </button>
        </div>
      )}

      {/* Modals - Same as ItemCard */}
      <EditItemModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        item={item}
        isSoldItem={isSoldItem}
        onSave={isSoldItem ? handleSoldEditFormSubmit : handleEditSubmit}
        isLoading={asyncState.isLoading && asyncState.operation === (isSoldItem ? 'EDIT_SOLD_SUBMIT' : 'EDIT_SUBMIT')}
      />

      <SellItemModal
        isOpen={showSellModal}
        onClose={() => setShowSellModal(false)}
        item={item}
        availableQuantity={profitMetrics.availableQuantity}
        buyPrice={baseMetrics.buyPrice}
        onConfirmSale={handleSellSubmit}
        isLoading={asyncState.isLoading && asyncState.operation === 'PARTIAL_SALE'}
      />

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

export default ItemList;