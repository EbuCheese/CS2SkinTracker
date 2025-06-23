import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Plus, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

const ItemCard = ({ item, userSession, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [soldPrice, setSoldPrice] = useState(item.sold_price?.toString() || '');
  const [updating, setUpdating] = useState(false);
  
  const profitLoss = item.sold_price ? 
    ((item.sold_price - item.buy_price) * item.quantity) : 
    ((item.current_price - item.buy_price) * item.quantity);
  
  const totalBuyPrice = item.buy_price * item.quantity;
  const profitPercentage = totalBuyPrice > 0 ? ((profitLoss / totalBuyPrice) * 100).toFixed(2) : '0.00';

  const handleSoldPriceUpdate = async () => {
    const price = parseFloat(soldPrice);
    if (!soldPrice || isNaN(price) || price <= 0) {
      alert('Please enter a valid sold price greater than 0');
      return;
    }
    
    try {
      setUpdating(true);
      
      // Use the new context-aware function
      const { data, error } = await supabase.rpc('update_investment_with_context', {
        investment_id: item.id,
        investment_data: { sold_price: price },
        context_user_id: userSession.id
      });

      if (error) {
        console.error('Update failed:', error);
        throw error;
      }
      
      console.log('Investment updated successfully:', data);
      
      // Notify parent component of the update
      onUpdate(item.id, { sold_price: price });
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating sold price:', err);
      
      // Provide more specific error messages
      if (err.message.includes('Invalid user context')) {
        alert('Authentication error: Please refresh the page and re-enter your beta key.');
      } else if (err.message.includes('not found or access denied')) {
        alert('Access denied: You can only update your own investments.');
      } else {
        alert('Failed to update sold price: ' + err.message);
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleQuantityUpdate = async (newQuantity) => {
    if (newQuantity < 1 || newQuantity > 9999) return;
    
    try {
      // Use the new context-aware function
      const { data, error } = await supabase.rpc('update_investment_with_context', {
        investment_id: item.id,
        investment_data: { quantity: newQuantity },
        context_user_id: userSession.id
      });

      if (error) {
        console.error('Update failed:', error);
        throw error;
      }
      
      console.log('Investment quantity updated successfully:', data);
      
      // Notify parent component of the update
      onUpdate(item.id, { quantity: newQuantity });
    } catch (err) {
      console.error('Error updating quantity:', err);
      
      // Provide more specific error messages
      if (err.message.includes('Invalid user context')) {
        alert('Authentication error: Please refresh the page and re-enter your beta key.');
      } else if (err.message.includes('not found or access denied')) {
        alert('Access denied: You can only update your own investments.');
      } else {
        alert('Failed to update quantity: ' + err.message);
      }
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-800 to-slate-800 rounded-lg p-4 border border-gray-700 hover:border-orange-500/30 transition-all duration-200">
      <div className="flex items-start space-x-4">
        {/* Image Container with Variant Badges */}
        <div className="relative w-20 h-16 bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
          {item.image_url ? (
            <img 
              src={item.image_url} 
              alt={item.name} 
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="text-gray-400 text-xs text-center">No Image</div>
          )}
          
          {/* Variant badges positioned absolutely over the image */}
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
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-white truncate">{item.name}</h3>
          {item.skin_name && (
            <p className="text-sm text-gray-400 truncate">{item.skin_name}</p>
          )}
          
          {/* Condition Display */}
          <div className="flex items-center space-x-2 mt-1">
            {item.condition && (
              <p className="text-xs text-gray-500 truncate">{item.condition}</p>
            )}
            
            {/* Full variant names for better clarity */}
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
          
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-400">Buy: </span>
              <span className="text-white">${item.buy_price.toFixed(2)}</span>
              {item.quantity > 1 && (
                <span className="text-gray-400"> x{item.quantity}</span>
              )}
            </div>
            <div>
              <span className="text-gray-400">Current: </span>
              <span className="text-white">${item.current_price.toFixed(2)}</span>
            </div>
          </div>
          
          {(item.type === 'liquid' || item.type === 'case') && (
            <div className="mt-2 flex items-center space-x-2">
              <span className="text-gray-400 text-sm">Qty:</span>
              <button
                onClick={() => handleQuantityUpdate(item.quantity - 1)}
                disabled={item.quantity <= 1}
                className="w-6 h-6 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="text-white text-sm w-8 text-center">{item.quantity}</span>
              <button
                onClick={() => handleQuantityUpdate(item.quantity + 1)}
                disabled={item.quantity >= 9999}
                className="w-6 h-6 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
        
        {/* Right side profit/loss and actions */}
        <div className="text-right flex-shrink-0">
          <div className={`flex items-center space-x-1 ${
            profitLoss >= 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {profitLoss >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span className="font-medium">${Math.abs(profitLoss).toFixed(2)}</span>
            <span className="text-xs">({profitPercentage}%)</span>
          </div>
          
          <div className="mt-2 space-y-1">
            {!item.sold_price ? (
              <button
                onClick={() => setIsEditing(true)}
                className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded hover:bg-orange-500/30 transition-colors block w-full"
              >
                Mark Sold
              </button>
            ) : (
              <div className="text-xs text-gray-400">
                Sold: ${item.sold_price.toFixed(2)}
              </div>
            )}
            <button
              onClick={() => onDelete(item)}
              className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded hover:bg-red-500/30 transition-colors block w-full"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
      
      {/* Editing section */}
      {isEditing && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="flex items-center space-x-2">
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="Sold price"
              value={soldPrice}
              onChange={(e) => setSoldPrice(e.target.value)}
              className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:border-orange-500 focus:outline-none"
            />
            <button
              onClick={handleSoldPriceUpdate}
              disabled={updating}
              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors disabled:opacity-50 flex items-center space-x-1"
            >
              {updating ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              <span>Save</span>
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setSoldPrice(item.sold_price?.toString() || '');
              }}
              className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemCard;