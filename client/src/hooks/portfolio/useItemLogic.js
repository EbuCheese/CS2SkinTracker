import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/supabaseClient';
import { formatDateInTimezone, useItemFormatting } from '@/hooks/util';
import { useToast } from '@/contexts/ToastContext';
import { useUserSettings } from '@/contexts/UserSettingsContext';

/**
 * Shared logic hook for both ItemCard and ItemList components
 * Consolidates all state management, calculations, and handlers
 */
export const useItemLogic = ({
  item,
  userSession,
  onUpdate,
  onRemove,
  isNew = false,
  isPriceLoading = false,
  isSoldItem = false,
  relatedInvestment = null,
  refreshSingleItemPrice,
  updateItemState,
  setInvestments
}) => {
  // Hooks
  const { timezone } = useUserSettings();
  const toast = useToast();
  const { displayName } = useItemFormatting();

  // UI State
  const [animationClass, setAnimationClass] = useState('');
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);

  // Popup State
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

  // Async Operation State
  const [asyncState, setAsyncState] = useState({
    isLoading: false,
    operation: null,
    error: null
  });

  // Popup Helpers
  const showPopup = useCallback((config) => {
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
  }, []);

  const closePopup = useCallback(() => {
    setPopup(prev => ({ ...prev, isOpen: false }));
  }, []);

  // Error Handler
  const getErrorMessage = useCallback((error) => {
    if (error.message.includes('Invalid user context')) {
      return 'Authentication error: Please refresh the page and re-enter your beta key.';
    }
    if (error.message.includes('not found or access denied')) {
      return 'Access denied: You can only update your own investments.';
    }
    return `Operation failed: ${error.message}`;
  }, []);

  // Async Operation Handler
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

  // Base Metrics Calculation
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

  // Profit Metrics Calculation
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

  // Sales Summary Calculation
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

  // Display Values Calculation
  const displayValues = useMemo(() => {
    const rawName = isSoldItem ? item.item_name : item.name;
    const skinName = isSoldItem ? item.item_skin_name : item.skin_name;
    const condition = isSoldItem ? item.item_condition : item.condition;
    const variant = isSoldItem ? item.item_variant : item.variant;
    
    const isMusicKit = rawName?.includes('Music Kit');
    
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

  // memoized Variant Badge
  const variantBadge = useMemo(() => {
  const rawName = isSoldItem ? item.item_name : item.name;
  const variant = isSoldItem ? item.item_variant : item.variant;
  
  const isNameBasedSouvenir = item.isNameBasedSouvenir ||
    rawName?.startsWith('Souvenir Charm') ||
    rawName?.includes('Souvenir Package');
  const isNameBasedStatTrak = item.isNameBasedStatTrak ||
    rawName?.startsWith('StatTrak™ Music Kit') ||
    (rawName?.startsWith('StatTrak™') && rawName?.includes('Music Kit Box'));
  
  const showSouvenirBadge = isNameBasedSouvenir || (variant === 'souvenir');
  const showStatTrakBadge = isNameBasedStatTrak || (variant === 'stattrak');
  
  if (!showSouvenirBadge && !showStatTrakBadge) return null;
  
  return {
    show: true,
    type: showStatTrakBadge ? 'stattrak' : 'souvenir',
    label: showStatTrakBadge ? 'ST' : 'SV',
    className: showStatTrakBadge 
      ? 'bg-gradient-to-r from-orange-500 to-red-500'
      : 'bg-gradient-to-r from-yellow-500 to-yellow-600'
  };
}, [isSoldItem, item.item_name, item.name, item.variant, item.item_variant, item.isNameBasedSouvenir, item.isNameBasedStatTrak]);

  // Helper Functions
  const hasValidPriceData = useCallback((item) => {
    return item.current_price !== null && 
           item.current_price !== undefined && 
           !isNaN(item.current_price);
  }, []);

  const isBidOnlyPrice = useCallback(() => {
    if (!item.available_prices || !item.price_source) return false;
    
    try {
      const prices = typeof item.available_prices === 'string' 
        ? JSON.parse(item.available_prices) 
        : item.available_prices;
      
      if (!Array.isArray(prices) || prices.length === 0) return false;
      
      const currentMarketplace = item.price_source;
      
      if (currentMarketplace === 'manual') return false;
      
      const currentPriceData = prices.find(p => p.marketplace === currentMarketplace);
      
      return currentPriceData?.is_bid_price === true;
    } catch (e) {
      console.error('Error parsing available_prices:', e);
      return false;
    }
  }, [item.available_prices, item.price_source]);

  const getAvailableMarketplaces = useCallback(() => {
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
  }, [item.available_prices]);

  const fullItemName = useMemo(() => 
    displayName(item, { includeCondition: true, format: 'full' }), 
    [item, displayName]
  );

  // Animation Effect
  useEffect(() => {
    if (isNew) {
      setAnimationClass('animate-slide-in-from-top');
      const timer = setTimeout(() => {
        setAnimationClass('');
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isNew]);

  // Modal Handlers
  const handleStartEdit = useCallback(() => {
    setShowEditModal(true);
  }, []);

  const handleStartSell = useCallback(() => {
    setShowSellModal(true);
  }, []);

  const handleSellSubmit = useCallback(async (quantity, pricePerUnit) => {
    setShowSellModal(false);
    
    const totalSaleValue = pricePerUnit * quantity;
    const profitLoss = (pricePerUnit - baseMetrics.buyPrice) * quantity;
    
    await handleAsyncOperation(
      'PARTIAL_SALE',
      handleConfirmedSale,
      quantity, pricePerUnit, totalSaleValue, profitLoss
    );
  }, [baseMetrics.buyPrice, handleAsyncOperation]);

  // Confirmed Sale Handler
  const handleConfirmedSale = useCallback(async (quantity, pricePerUnit, totalSaleValue, profitLoss) => {
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
        onRemove?.(item.id, false, soldItemData, false);
      } else {
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
  }, [item, userSession, onUpdate, onRemove, toast, getErrorMessage, closePopup]);

  // Revert Sale Handler
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

  // Confirmed Revert Handler
  const handleConfirmedRevert = useCallback(async () => {
    try {
      closePopup();
      setAsyncState({ isLoading: true, operation: 'REVERT_SALE', error: null });
      
      const { data: revertResult, error: revertError } = await supabase.rpc('revert_investment_sale', {
        p_sale_id: item.id,
        p_user_id: userSession.id
      });
      
      if (revertError) throw new Error(`Revert failed: ${revertError.message}`);
      
      if (revertResult.type === 'quantity_restored') {
        const relatedInvestmentId = revertResult.investment_id;
        const quantityRestored = revertResult.quantity_restored;
        const saleValueLost = revertResult.sale_value_lost;
        
        if (relatedInvestment) {
          const buyPrice = relatedInvestment.buy_price || item.buy_price_per_unit;
          const realizedPLRemoved = (item.price_per_unit - buyPrice) * quantityRestored;
          
          const restorationNote = `Restored ${quantityRestored} units from sale reversion on ${formatDateInTimezone(new Date(), timezone, { month: 'numeric', day: 'numeric', year: 'numeric' })}`;

          let updatedNotes;
          if (relatedInvestment.notes && relatedInvestment.notes.trim() !== '') {
            updatedNotes = relatedInvestment.notes + '\n' + restorationNote;
          } else {
            updatedNotes = restorationNote;
          }

          const updatedInvestment = {
            ...relatedInvestment,
            quantity: revertResult.new_investment_quantity,
            total_sold_quantity: Math.max(0, (relatedInvestment.total_sold_quantity || 0) - quantityRestored),
            total_sale_value: Math.max(0, (relatedInvestment.total_sale_value || 0) - saleValueLost),
            realized_profit_loss: (relatedInvestment.realized_profit_loss || 0) - realizedPLRemoved,
            unrealized_profit_loss: (relatedInvestment.current_price - buyPrice) * revertResult.new_investment_quantity,
            notes: updatedNotes
          };
          
          onUpdate(relatedInvestmentId, updatedInvestment, false, null, true);
        }
        
        toast.saleReverted(fullItemName, quantityRestored, saleValueLost, false);
        
      } else if (revertResult.type === 'investment_recreated') {
        const wasOriginalDatePreserved = revertResult.original_created_at !== null;
        
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
      
      if (investmentIdToRefresh) {
        updateItemState(investmentIdToRefresh, { isPriceLoading: true });
        
        setTimeout(() => {
          refreshSingleItemPrice(
            investmentIdToRefresh,
            userSession,
            (itemId, refreshedItemData) => {
              setInvestments(prev => prev.map(inv =>
                inv.id === itemId ? refreshedItemData : inv
              ));
              updateItemState(itemId, { isPriceLoading: false });
            },
            (itemId, error) => {
              console.error('Failed to refresh price after reversion:', error);
              updateItemState(itemId, { isPriceLoading: false });
              toast.warning('Price data will be updated on next refresh');
            }
          );
        }, 1000);
      }

      onRemove(item.id, false);
      
    } catch (err) {
      console.error('Error reverting sale:', err);
      toast.error(getErrorMessage(err));
    } finally {
      setAsyncState({ isLoading: false, operation: null, error: null });
    }
  }, [item, userSession, relatedInvestment, timezone, onUpdate, onRemove, updateItemState, refreshSingleItemPrice, setInvestments, toast, fullItemName, getErrorMessage, closePopup]);

  // Edit Submit Handler
  const handleEditSubmit = useCallback(async (formData) => {
    await handleAsyncOperation('EDIT_SUBMIT', async () => {
      const updateData = {
        condition: formData.condition,
        variant: formData.variant,
        quantity: parseInt(formData.quantity),
        buy_price: parseFloat(formData.buy_price),
        notes: formData.notes?.trim() === '' ? null : (formData.notes?.trim() || null)
      };

      if (updateData.quantity < 1 || updateData.quantity > 9999) {
        throw new Error('Quantity must be between 1 and 9999');
      }
      
      if (updateData.buy_price <= 0) {
        throw new Error('Buy price must be greater than 0');
      }

      if (formData.price_source === 'manual') {
        const manualPriceValue = formData.manual_price ? parseFloat(formData.manual_price) : null;
        
        if (manualPriceValue === null || manualPriceValue === '') {
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
          const { error: priceError } = await supabase.rpc('set_investment_price_override', {
            p_investment_id: item.id,
            p_user_id: userSession.id,
            p_override_price: manualPriceValue,
            p_use_override: true
          });
          
          if (priceError) throw priceError;
        }
        
      } else if (formData.price_source !== item.price_source || item.preferred_marketplace_override) {
        const { error: marketplaceError } = await supabase.rpc('set_investment_marketplace_override', {
          p_investment_id: item.id,
          p_user_id: userSession.id,
          p_marketplace: formData.price_source
        });
        
        if (marketplaceError) throw marketplaceError;
        
      } else {
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

      const { error } = await supabase.rpc('update_investment_with_context', {
        investment_id: item.id,
        investment_data: updateData,
        context_user_id: userSession.id
      });

      if (error) throw error;
      
      const itemIdentityChanged = 
        formData.condition !== item.condition ||
        formData.variant !== item.variant;

      const updatedItem = {
        ...item,
        ...updateData,
        market_price_override: formData.price_source === 'manual' ? parseFloat(formData.manual_price) : null,
        use_override: formData.price_source === 'manual',
        preferred_marketplace_override: formData.price_source === 'global' ? null : 
          (formData.price_source === 'manual' ? item.preferred_marketplace_override : formData.price_source),
        
        current_price: formData.price_source === 'manual' ? parseFloat(formData.manual_price) :
          (getAvailableMarketplaces().find(mp => mp.marketplace === formData.price_source)?.price || item.current_price),
        
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

      if (itemIdentityChanged) {
        updateItemState(item.id, { isPriceLoading: true });
        
        setTimeout(() => {
          refreshSingleItemPrice(
            item.id,
            userSession,
            (itemId, refreshedItemData) => {
              setInvestments(prev => prev.map(inv =>
                inv.id === itemId ? refreshedItemData : inv
              ));
              updateItemState(itemId, { isPriceLoading: false });
            },
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
  }, [item, userSession, onUpdate, getAvailableMarketplaces, updateItemState, refreshSingleItemPrice, setInvestments, toast, fullItemName, getErrorMessage, handleAsyncOperation]);

  // Sold Edit Submit Handler
  const handleSoldEditFormSubmit = useCallback(async (formData) => {
    await handleAsyncOperation('EDIT_SOLD_SUBMIT', async () => {
      const quantity = parseInt(formData.quantity_sold);
      const pricePerUnit = parseFloat(formData.price_per_unit);
      
      if (quantity < 1 || quantity > 9999) {
        throw new Error('Quantity must be between 1 and 9999');
      }
      
      if (pricePerUnit <= 0) {
        throw new Error('Sale price must be greater than 0');
      }

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
      
      const newTotalSaleValue = quantity * pricePerUnit;
      const oldQuantity = item.quantity_sold;
      const oldSaleValue = item.total_sale_value;
      const quantityDiff = quantity - oldQuantity;
      const saleValueDiff = newTotalSaleValue - oldSaleValue;
      
      const updatedItem = {
        ...item,
        quantity_sold: quantity,
        price_per_unit: pricePerUnit,
        total_sale_value: newTotalSaleValue,
        notes: formData.notes?.trim() || null
      };

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
        
        onUpdate(item.investment_id, updatedInvestment, false, null, true);
      }

      onUpdate(item.id, updatedItem, false);

      toast.saleRecordUpdated(fullItemName);
      setShowEditModal(false);

    }).catch(err => {
      toast.error(getErrorMessage(err));
    });
  }, [item, userSession, relatedInvestment, onUpdate, toast, fullItemName, getErrorMessage, handleAsyncOperation]);

  // Return all state and handlers
  return {
    // State
    animationClass,
    showBreakdown,
    setShowBreakdown,
    showEditModal,
    setShowEditModal,
    showSellModal,
    setShowSellModal,
    popup,
    asyncState,
    
    // Calculated Values
    baseMetrics,
    profitMetrics,
    salesSummary,
    displayValues,
    variantBadge,
    fullItemName,
    
    // Helper Functions
    hasValidPriceData,
    isBidOnlyPrice,
    getAvailableMarketplaces,
    
    // Handlers
    showPopup,
    closePopup,
    handleStartEdit,
    handleStartSell,
    handleSellSubmit,
    handleRevertSale,
    handleEditSubmit,
    handleSoldEditFormSubmit
  };
};