import React, { useCallback } from 'react';
import { Loader2, Edit2, AlertTriangle, DollarSign, CalendarPlus, CalendarCheck2} from 'lucide-react';
import { PopupManager } from '@/components/ui';
import { EditItemModal, SellItemModal } from '@/components/forms';
import { useItemLogic } from '@/hooks/portfolio';
import { useScrollLock, formatDateInTimezone } from '@/hooks/util';
import { useUserSettings } from '@/contexts/UserSettingsContext';
import { convertAndFormat } from '@/hooks/util/currency';

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
    const { timezone, currency } = useUserSettings();
  
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

  useScrollLock(popup.isOpen || showEditModal || showSellModal);

  const formatPrice = useCallback((usdAmount) => {
    return convertAndFormat(usdAmount, currency);
  }, [currency]);

  const { name, skinName, condition, variant } = displayValues;

  return (
    <div className={`bg-gradient-to-br from-gray-800 to-slate-800 rounded-lg p-3 border border-slate-700/50 hover:border-orange-400/30 transition-all duration-300 ${animationClass} ${profitMetrics.isFullySold ? 'opacity-75' : ''}`}>
      
      {/* HORIZONTAL LIST LAYOUT */}
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
          {variantBadge && (
            <div className={`absolute -top-1 -right-1 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold shadow-lg ${variantBadge.className} ${profitMetrics.isFullySold ? 'opacity-75' : ''}`}>
              {variantBadge.label}
            </div>
          )}

          {profitMetrics.isFullySold && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-green-600/90 to-transparent text-white text-[9px] py-0.5 font-bold text-center rounded-b-xl">
              SOLD
            </div>
          )}
        </div>

        {/* Item Info - Takes remaining space */}
        <div className="flex-1 min-w-0 grid grid-cols-12 gap-3 items-center">
          
          {/* Name & Metadata */}
          <div className="col-span-4 min-w-0">
            <h3 className="text-sm font-bold text-white truncate" title={displayValues.name}>
              {displayValues.name}
            </h3>
            {displayValues.skinName && (
              <p className="text-white/80 text-xs truncate">{displayValues.skinName}</p>
            )}
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {displayValues.condition && (
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-300 border border-slate-600/30 font-semibold">
                  {displayValues.condition}
                </span>
              )}
              <span className="text-[11px] text-slate-400 flex items-center">
                {isSoldItem ? <CalendarCheck2 className="w-3 h-3 mr-0.5" /> : <CalendarPlus className="w-3 h-3 mr-0.5" />}
                {formatDateInTimezone(isSoldItem ? item.sale_date : item.created_at, timezone, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          </div>

          {/* Prices Section */}
          <div className="col-span-3 flex gap-2">
            {/* Buy/Sale Price */}
            <div className="flex-1">
              <div className="text-[10px] text-slate-400 uppercase mb-0.5">
                {isSoldItem ? 'Sale' : 'Buy'}
              </div>
              <div className="text-sm font-bold text-white">
                {formatPrice(isSoldItem ? item.price_per_unit : item.buy_price)}
              </div>
            </div>
            
            {/* Current/Buy Price */}
            <div className="flex-1">
              <div className="text-[10px] text-slate-400 uppercase mb-0.5">
                {isSoldItem ? 'Buy' : 'Current'}
              </div>
              <div className="text-sm font-bold text-white flex items-center gap-1">
                {isSoldItem ? (
                  formatPrice(item.buy_price_per_unit) 
                ) : (
                  <>
                    {hasValidPriceData(item) ? (
                      formatPrice(baseMetrics.currentPrice) 
                    ) : (
                      <span className="text-gray-500 text-xs">No data</span>
                    )}
                    {isPriceLoading && <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />}
                    {/* Manual price indicator */}
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
                    {/* Bid only indicator */}
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

          {/* Quantity */}
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

          {/* P&L Section */}
          <div className="col-span-2">
            <div className="text-[10px] text-slate-400 uppercase mb-0.5">P&L</div>
            {/* P&L Amount */}
            <div className={`text-sm font-bold ${profitMetrics.totalProfitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {profitMetrics.totalProfitLoss >= 0 ? '+' : '-'}
              {formatPrice(Math.abs(profitMetrics.totalProfitLoss))}
            </div>
            <div className="flex items-center gap-1">
              {/* P&L Percentage */}
              <div className={`text-[10px] ${profitMetrics.totalProfitLoss >= 0 ? 'text-green-300/80' : 'text-red-300/80'}`}>
                {parseFloat(profitMetrics.profitPercentage) >= 0 ? '+' : ''}
                {parseFloat(profitMetrics.profitPercentage).toLocaleString('en-US', { maximumFractionDigits: 2 })}%
              </div>
              {/* Breakdown toggle*/}
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
                total: {formatPrice(item.total_sale_value)}
              </div>
            )}
          </div>

          {/* Actions */}
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

      {/* Breakdown Section */}
      {showBreakdown && !isSoldItem && salesSummary.hasAnySales && (
        <div className="mt-3 pt-3 border-t border-slate-700/50">
          <div className="grid gap-3 text-xs">
            {/* Realized P&L */}
            <div>
              <div className="text-slate-400 mb-1">Realized P&L</div>
              <div className={`font-semibold ${salesSummary.realizedProfitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {salesSummary.realizedProfitLoss >= 0 ? '+' : '-'}
                {formatPrice(Math.abs(salesSummary.realizedProfitLoss))}
              </div>
            </div>
            
            {/* Unrealized P&L */}
            <div>
              <div className="text-slate-400 mb-1">Unrealized P&L</div>
              <div className={`font-semibold ${salesSummary.unrealizedProfitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {salesSummary.unrealizedProfitLoss >= 0 ? '+' : '-'}
                {formatPrice(Math.abs(salesSummary.unrealizedProfitLoss))}
              </div>
            </div>
            
            {/* Avg Sale Price */}
            <div>
              <div className="text-slate-400 mb-1">Avg Sale Price</div>
              <div className="font-semibold text-yellow-400">
                {formatPrice(salesSummary.averageSalePrice)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notes Section - Shows on bottom if item has notes */}
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