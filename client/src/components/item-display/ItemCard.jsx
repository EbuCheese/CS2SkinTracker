import React, { useCallback } from 'react';
import { Loader2, Edit2, ChartNoAxesColumnIncreasing, AlertTriangle, DollarSign, CalendarPlus, CalendarCheck2, Wallet, Package } from 'lucide-react';
import { PopupManager } from '@/components/ui';
import { ImagePopupModal } from '@/components/item-display';
import { EditItemModal, SellItemModal } from '@/components/forms';
import { useItemLogic } from '@/hooks/portfolio';
import { useScrollLock, formatDateInTimezone } from '@/hooks/util';
import { useUserSettings } from '@/contexts/UserSettingsContext';
import { convertAndFormat } from '@/hooks/util/currency';

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
    'isSoldItem',
    'item.price_source',
    'item.available_prices',
    'item.market_price_override',
    'item.use_override',
    'relatedInvestment.total_sold_quantity',
    'relatedInvestment.realized_profit_loss'
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
  setInvestments,
  onOpenImageModal 
}) => {  
  // User settings hook
  const { timezone } = useUserSettings();

  const { currency } = useUserSettings();
  
  // format price 
  const formatPrice = useCallback((usdAmount) => {
    return convertAndFormat(usdAmount, currency);
  }, [currency]);

  // Use the shared logic hook
  const {
    animationClass,
    showBreakdown,
    setShowBreakdown,
    showEditModal,
    setShowEditModal,
    showSellModal,
    setShowSellModal,
    popup,
    asyncState,
    baseMetrics,
    profitMetrics,
    salesSummary,
    displayValues,
    variantBadge,
    fullItemName,
    hasValidPriceData,
    isBidOnlyPrice,
    showPopup,
    closePopup,
    handleStartEdit,
    handleStartSell,
    handleSellSubmit,
    handleRevertSale,
    handleEditSubmit,
    handleSoldEditFormSubmit
  } = useItemLogic({
    item,
    userSession,
    onUpdate,
    onRemove,
    isNew,
    isPriceLoading,
    isSoldItem,
    relatedInvestment,
    refreshSingleItemPrice,
    updateItemState,
    setInvestments
  });

// Prevent body scroll when popup is open
useScrollLock(popup.isOpen || showEditModal || showSellModal);

// Destructured display values
const { name, skinName, condition } = displayValues;

  return (
  <div className={`break-inside-avoid bg-gradient-to-br from-gray-800 to-slate-800 rounded-xl p-5 border border-slate-700/50 hover:border-orange-400/30 shadow-xl hover:shadow-orange-500/5 transition-all duration-300 ${animationClass} ${profitMetrics.isFullySold ? 'opacity-75' : ''} overflow-hidden`}>
    {/* Header Section */}
    <div className="flex items-start justify-between mb-4 gap-3">
      <div className="flex items-start space-x-3 min-w-0 flex-1">
        {/* Image Container with Variant Badges */}
        <div className="relative group">
          <button
            onClick={() => onOpenImageModal?.(item.image_url, fullItemName)}
            className="w-20 h-20 bg-gradient-to-br from-slate-700/30 to-gray-700/30 rounded-2xl overflow-hidden border border-slate-600/40 shadow-lg hover:border-orange-400/50 transition-all duration-200 cursor-pointer"
            disabled={!item.image_url}
          >
            {item.image_url ? (
              <img 
                src={item.image_url} 
                alt={name || 'Item image'}
                className="w-full h-full object-contain p-1 transition-transform duration-200 group-hover:scale-110"
              />
            ) : (
              <div className="text-gray-400 text-xs text-center flex items-center justify-center h-full">
                No Image
              </div>
            )}
          </button>
          
          {/* Hover overlay hint */}
          {item.image_url && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 rounded-2xl pointer-events-none flex items-center justify-center">
              <svg 
                className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
            </div>
          )}
  
      {/* Variant badges */}
      {variantBadge && (
        <div className={`absolute -top-1 -right-1 z-10 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-lg ${variantBadge.className} ${profitMetrics.isFullySold ? 'opacity-65' : ''}`}>
          {variantBadge.label}
        </div>
      )}

      {/* Sold indicator for fully sold items */}
      {profitMetrics.isFullySold && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-green-600/90 via-green-500/70 to-transparent text-white text-[10px] py-0.5 font-bold text-center rounded-b-2xl">
          SOLD
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
          
          {/* Show condition and date */}
          <div className="flex items-center gap-1 flex-wrap">
            {condition && (
              <span className="text-xs px-1.5 py-1 rounded-md bg-slate-700/50 text-slate-300 border border-slate-600/30 font-semibold whitespace-nowrap">
                {condition}
              </span>
            )}
            <span className="text-xs text-slate-400 flex items-center whitespace-nowrap">
              {isSoldItem ? (
                <CalendarCheck2 className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
              ) : (
                <CalendarPlus className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
              )}
              {formatDateInTimezone(
                isSoldItem ? item.sale_date : item.created_at, 
                timezone, 
                { month: 'short', day: 'numeric', year: 'numeric' }
              )}
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
                <span className="truncate max-w-[170px]">note: {item.notes}</span>
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* P&L Display */}
      <div className="text-right flex-shrink-0 min-w-0">
        <div className={`text-lg font-bold ${
          profitMetrics.totalProfitLoss >= 0 ? 'text-green-400' : 'text-red-400'
        }`}>
          <span>
            {profitMetrics.totalProfitLoss >= 0 ? '+' : '-'}
            {formatPrice(Math.abs(profitMetrics.totalProfitLoss))}
          </span>
        </div>
        <div className={`text-xs ${
          profitMetrics.totalProfitLoss >= 0 ? 'text-green-300/80' : 'text-red-300/80'
        }`}>
          {parseFloat(profitMetrics.profitPercentage) >= 0 ? '+' : ''}{parseFloat(profitMetrics.profitPercentage).toLocaleString('en-US', { maximumFractionDigits: 2 })}%
        </div>
        
        {/* Total sale breakdown for sold items */}
        {isSoldItem && (
          <div className="mt-1 text-[11px] text-slate-400">
            total: {formatPrice(item.total_sale_value)}
          </div>
        )}
        
        {/* Breakdown of profits */}
        {!isSoldItem && salesSummary.hasAnySales && (
          <div className="mt-0.5 flex flex-col items-end">
            <button
              onClick={() => setShowBreakdown(!showBreakdown)}
              className="text-[11px] text-slate-400 hover:text-slate-300 transition-colors flex items-center space-x-0.5"
            >
              <span>breakdown</span>
              <svg 
                className={`w-3 h-3 mt-0.5 transition-transform ${showBreakdown ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showBreakdown && (
              <div className="mt-1 text-[11px] text-slate-400 leading-tight space-y-0 text-right">
                <div>
                  {salesSummary.realizedProfitLoss >= 0 ? '+' : '-'}
                  {formatPrice(Math.abs(salesSummary.realizedProfitLoss))} rlzd
                </div>
                <div>
                  {salesSummary.unrealizedProfitLoss >= 0 ? '+' : '-'}
                  {formatPrice(Math.abs(salesSummary.unrealizedProfitLoss))} unrlzd
                </div>
                <div className="text-yellow-400">
                  avg: {formatPrice(salesSummary.averageSalePrice)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>

    {/* Metrics Section */}
    <div className="grid grid-cols-3 gap-3 mb-3">
      <div className="bg-slate-800/40 rounded-lg p-2 border border-slate-700/30">
        <div className="flex items-center space-x-1 mb-0.5">
          {isSoldItem ? (
          <DollarSign className="w-3.5 h-3.5 text-green-400" />
          ) : (
            <Wallet className="w-3.5 h-3.5 text-blue-400" />
          )}
          <span className="text-[11px] text-slate-400 uppercase tracking-wide">
            {isSoldItem ? 'Sale Price' : 'Buy Price'}
          </span>
        </div>
        <div className="text-sm font-bold text-white">
          {formatPrice(isSoldItem ? item.price_per_unit : item.buy_price)}
        </div>
      </div>
      
      {/* Current or Buy Price */}
      <div className="bg-slate-800/40 rounded-lg p-2 border border-slate-700/30 relative">
        <div className="flex items-center space-x-1 mb-0.5">
          {isSoldItem ? (
          <Wallet className="w-3.5 h-3.5 text-blue-400" />
          ) : (
            <ChartNoAxesColumnIncreasing className="w-3.5 h-3.5 text-orange-400" />
          )}
          <span className="text-[11px] text-slate-400 uppercase tracking-wide">
            {isSoldItem ? 'Buy Price' : 'Current'}
          </span>
        </div>
        <div className="text-sm font-bold text-white">
          {isSoldItem ? (
            formatPrice(item.buy_price_per_unit)
          ) : (
            <div className="flex items-center space-x-1">
              {hasValidPriceData(item) ? (
                <span>{formatPrice(baseMetrics.currentPrice)}</span>
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
      
      {/* Quantity */}
      <div className="bg-slate-800/40 rounded-lg p-2 border border-slate-700/30">
        <div className="flex items-center space-x-1 mb-0.5">
          <Package className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-[11px] text-slate-400 uppercase tracking-wide">
            Quantity
          </span>
        </div>
        <div className="text-sm font-bold text-white">
        {isSoldItem ? (
          baseMetrics.quantity.toLocaleString('en-US')
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

    {/* Bottom Action Buttons */}
    <div className="flex space-x-1.5">
      {!isSoldItem ? (
        <>
          <button
            onClick={handleStartEdit}
            className="flex-1 bg-slate-700/50 hover:bg-blue-600/20 text-slate-300 hover:text-blue-300 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center justify-center space-x-1 border border-slate-600/30 hover:border-blue-500/40"          >
            <Edit2 className="w-3 h-3" />
            <span>Edit</span>
          </button>
          {!profitMetrics.isFullySold ? (
            <button
              onClick={handleStartSell}
              className="flex-1 bg-slate-700/50 hover:bg-green-600/20 text-slate-300 hover:text-green-300 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center justify-center space-x-1 border border-slate-600/30 hover:border-green-500/40"            >
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
            className="flex-1 bg-slate-700/50 hover:bg-blue-600/20 text-slate-300 hover:text-blue-300 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center justify-center space-x-1 border border-slate-600/30 hover:border-blue-500/40"          >
            <Edit2 className="w-3 h-3" />
            <span>Edit</span>
          </button>
          <button
            onClick={handleRevertSale}
            disabled={asyncState.isLoading}
            className="flex-1 bg-slate-700/50 hover:bg-orange-600/20 text-slate-300 hover:text-orange-300 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center justify-center space-x-1 border border-slate-600/30 hover:border-orange-500/40"          >
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