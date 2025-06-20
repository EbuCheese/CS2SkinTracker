import React, { useState, useEffect } from 'react';
import { Search, Plus, Upload, X, Minus, Edit3, DollarSign, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import CSItemSearch from '../components/CSItemSearch';

const InvestmentsPage = ({ userSession }) => {
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);

  const tabs = ['All', 'Liquids', 'Crafts', 'Cases'];

  // Fetch investments from Supabase
  useEffect(() => {
  if (!userSession) return; // wait for session to be set

  if (validateUserSession(userSession)) {
    fetchInvestments();
  } else {
    setLoading(false);
    setError('Invalid user session. Please validate your beta key.');
  }
}, [userSession]);


const fetchInvestments = async () => {
  try {
    setLoading(true);
    setError(null);

    if (!userSession?.id || typeof userSession.id !== 'string') {
      setError('Invalid user session. Please re-validate your beta key.');
      return;
    }

    console.log('Fetching investments for user:', userSession.id);

    // Use the custom function that handles context properly
    const { data, error } = await supabase.rpc('fetch_user_investments', {
      context_user_id: userSession.id
    });

    if (error) {
      console.error('Database query failed:', error);
      setError('Access denied. Please verify your beta key is valid and active.');
      return;
    }
    
    // The function returns a JSON array, so we need to parse it
    const investmentsArray = Array.isArray(data) ? data : JSON.parse(data || '[]');
    
    console.log(`Successfully loaded ${investmentsArray.length} investments`);
    setInvestments(investmentsArray);

  } catch (err) {
    console.error('Unexpected error:', err);
    setError('An unexpected error occurred. Please try again.');
  } finally {
    setLoading(false);
  }
};

  const handleDeleteItem = async () => {  
  if (!itemToDelete) return;
  
  try {
    // Use the new context-aware function
    const { data, error } = await supabase.rpc('delete_investment_with_context', {
      investment_id: itemToDelete.id,
      context_user_id: userSession.id
    });

    if (error) {
      console.error('Delete failed:', error);
      throw error;
    }
    
    console.log('Investment deleted successfully');
    
    // Update local state
    setInvestments(prev => prev.filter(inv => inv.id !== itemToDelete.id));
    setItemToDelete(null); // Clear the item to delete
  } catch (err) {
    console.error('Error deleting investment:', err);
    
    // Provide more specific error messages
    if (err.message.includes('Invalid user context')) {
      alert('Authentication error: Please refresh the page and re-enter your beta key.');
    } else if (err.message.includes('not found or access denied')) {
      alert('Access denied: You can only delete your own investments.');
    } else {
      alert('Failed to delete investment: ' + err.message);
    }
  }
};

const validateUserSession = (session) => {
  if (!session) return false;
  if (!session.id) return false;
  if (typeof session.id !== 'string') return false;
  
  // Add additional validation if needed (e.g., UUID format)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(session.id)) return false;
  
  return true;
};

const retry = () => {
    if (userSession?.id) {
      fetchInvestments();
    } else {
      setError('No user session found. Please validate your beta key first.');
    }
  };

  const AddItemForm = ({ type, onClose, onAdd }) => {
    const [formData, setFormData] = useState({
      name: '',
      skin_name: '',
      condition: '',
      buy_price: '',
      quantity: 1,
      image_url: ''
    });
    const [submitting, setSubmitting] = useState(false);

    const handleImageUpload = (e) => {
      const file = e.target.files[0];
      if (file) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          alert('Please select a valid image file');
          return;
        }
        
        // Validate file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
          alert('Image file size must be less than 5MB');
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          setFormData(prev => ({ ...prev, image_url: e.target.result }));
        };
        reader.readAsDataURL(file);
      }
    };

    const validateFormData = () => {
      if (!formData.name.trim()) {
        alert('Please enter a name for the item');
        return false;
      }
      
      if (!formData.buy_price || isNaN(parseFloat(formData.buy_price)) || parseFloat(formData.buy_price) <= 0) {
        alert('Please enter a valid buy price greater than 0');
        return false;
      }
      
      if (formData.quantity < 1) {
        alert('Quantity must be at least 1');
        return false;
      }
      
      return true;
    };

const handleSubmit = async () => {
  if (!validateFormData()) return;

  if (!userSession?.id) {
    alert('No user session found');
    return;
  }

  try {
    setSubmitting(true);
    const buyPrice = parseFloat(formData.buy_price);
    
    // Generate realistic current price variation (±20%)
    const priceVariation = (Math.random() * 0.4 - 0.2);
    const currentPrice = buyPrice * (1 + priceVariation);
    
    const newInvestment = {
      user_id: userSession.id,
      type: type.toLowerCase().slice(0, -1),
      name: formData.name.trim(),
      skin_name: formData.skin_name?.trim() || null,
      condition: formData.condition?.trim() || null,
      buy_price: buyPrice,
      current_price: Math.max(0.01, currentPrice),
      quantity: Math.max(1, parseInt(formData.quantity)),
      image_url: formData.image_url || null
    };

    console.log('Attempting to insert investment:', newInvestment);

    // CRITICAL FIX: Use a transaction to ensure context is maintained
    const { data: insertData, error: insertError } = await supabase.rpc('insert_investment_with_context', {
      investment_data: newInvestment,
      context_user_id: userSession.id
    });

    if (insertError) {
      console.error('Insert failed:', insertError);
      throw insertError;
    }
    
    console.log('Investment inserted successfully:', insertData);
    setInvestments(prev => [insertData, ...prev]);
    onClose();

  } catch (err) {
    console.error('Error adding investment:', err);
    
    // Provide more specific error messages
    if (err.message.includes('row-level security policy')) {
      alert('Authentication error: Unable to verify your access. Please refresh the page and re-enter your beta key.');
    } else if (err.message.includes('foreign key')) {
      alert('User session error: Your user session is invalid. Please refresh the page and re-enter your beta key.');
    } else if (err.message.includes('context')) {
      alert('Authentication context error: Please try again or refresh the page.');
    } else {
      alert('Failed to add investment: ' + err.message);
    }
  } finally {
    setSubmitting(false);
  }
};

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-gradient-to-br from-gray-900 to-slate-900 p-6 rounded-xl border border-orange-500/20 max-w-md w-full mx-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">Add {type} Item</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            {type === 'Crafts' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Upload Image</label>
                  <div className="border-2 border-dashed border-orange-500/30 rounded-lg p-4 text-center hover:border-orange-500/50 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                    />
                    <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center">
                      {formData.image_url ? (
                        <img src={formData.image_url} alt="Preview" className="w-20 h-20 object-cover rounded" />
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-orange-500 mb-2" />
                          <span className="text-sm text-gray-400">Click to upload image</span>
                        </>
                      )}
                    </label>
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="Custom Name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none"
                  required
                  maxLength={100}
                />
                <input
                  type="text"
                  placeholder="Base Skin Name"
                  value={formData.skin_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, skin_name: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none"
                  maxLength={100}
                />
              </>
            ) : (
              <>
                <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Search {type}
                </label>
                <CSItemSearch
                  type={type.toLowerCase()} // This should be 'liquids' or 'cases'
                  placeholder={`Search ${type.toLowerCase()}...`}
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  onSelect={(item) => setFormData(prev => ({ 
                    ...prev, 
                    name: item.name,
                    image_url: item.image || ''
                  }))}
                  className="w-full"
                />
              </div>
                          
                {type === 'Liquids' && (
                  <input
                    type="text"
                    placeholder="Condition (e.g., Field-Tested)"
                    value={formData.condition}
                    onChange={(e) => setFormData(prev => ({ ...prev, condition: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none"
                    maxLength={50}
                  />
                )}
                
                {(type === 'Liquids' || type === 'Cases') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Quantity</label>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, quantity: Math.max(1, prev.quantity - 1) }))}
                        className="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center text-white"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="9999"
                        value={formData.quantity}
                        onChange={(e) => setFormData(prev => ({ ...prev, quantity: Math.max(1, parseInt(e.target.value) || 1) }))}
                        className="w-16 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-center focus:border-orange-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, quantity: Math.min(9999, prev.quantity + 1) }))}
                        className="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center text-white"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
            
            <input
              type="number"
              step="0.01"
              min="0.01"
              max="999999"
              placeholder="Buy Price ($)"
              value={formData.buy_price}
              onChange={(e) => setFormData(prev => ({ ...prev, buy_price: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none"
              required
            />
            
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-2 rounded-lg hover:from-orange-600 hover:to-red-700 transition-all duration-200 font-medium disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Adding...</span>
                </>
              ) : (
                <span>Add Item</span>
              )}
            </button>
          </div>
        </div>
        
      </div>
    );
  };

  const ItemCard = ({ item }) => {
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
        
        // Update local state with the returned data
        setInvestments(prev => 
          prev.map(inv => 
            inv.id === item.id 
              ? { ...inv, sold_price: price }
              : inv
          )
        );
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
    
    // Update local state
    setInvestments(prev => 
      prev.map(inv => 
        inv.id === item.id 
          ? { ...inv, quantity: newQuantity }
          : inv
      )
    );
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
          <div className="w-20 h-16 bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
            {item.image_url ? (
              <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
            ) : (
              <div className="text-gray-400 text-xs text-center">No Image</div>
            )}
          </div>
          
          <div className="flex-1">
            <h3 className="font-medium text-white truncate">{item.name}</h3>
            {item.skin_name && (
              <p className="text-sm text-gray-400 truncate">{item.skin_name}</p>
            )}
            {item.condition && (
              <p className="text-xs text-gray-500 truncate">{item.condition}</p>
            )}
            
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
          
          <div className="text-right">
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
                  onClick={() => setItemToDelete(item)}
                  className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded hover:bg-red-500/30 transition-colors block w-full"
                >
                  Delete
            </button>
            </div>
          </div>
        </div>
        
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

  const getCurrentItems = () => {
    let filteredItems = investments;
    
    // Filter by tab
    if (activeTab !== 'All') {
      const typeFilter = activeTab.toLowerCase().slice(0, -1); // Remove 's' and lowercase
      filteredItems = filteredItems.filter(item => item.type === typeFilter);
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredItems = filteredItems.filter(item =>
        item.name.toLowerCase().includes(query) ||
        (item.skin_name && item.skin_name.toLowerCase().includes(query)) ||
        (item.condition && item.condition.toLowerCase().includes(query))
      );
    }
    
    return filteredItems;
  };

  // Calculate portfolio summary
  const getPortfolioSummary = () => {
    const currentItems = getCurrentItems();
    const totalBuyValue = currentItems.reduce((sum, item) => sum + (item.buy_price * item.quantity), 0);
    const totalCurrentValue = currentItems.reduce((sum, item) => {
      const price = item.sold_price || item.current_price;
      return sum + (price * item.quantity);
    }, 0);
    const totalProfit = totalCurrentValue - totalBuyValue;
    const profitPercentage = totalBuyValue > 0 ? ((totalProfit / totalBuyValue) * 100) : 0;

    return {
      totalBuyValue,
      totalCurrentValue,
      totalProfit,
      profitPercentage,
      itemCount: currentItems.length
    };
  };

  const summary = getPortfolioSummary();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 flex items-center justify-center">
        <div className="flex items-center space-x-2 text-white">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span>Loading investments...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-lg mb-2">Error</div>
          <div className="text-gray-400 mb-4">{error}</div>
          <button
            onClick={retry}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent mb-2">
            My Investments
          </h1>
          <p className="text-gray-400">Track your CS:GO skin investments and performance</p>
        </div>

        {/* Portfolio Summary */}
        {investments.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-br from-gray-800 to-slate-800 p-4 rounded-lg border border-gray-700">
              <div className="text-gray-400 text-sm">Total Invested</div>
              <div className="text-white text-xl font-semibold">${summary.totalBuyValue.toFixed(2)}</div>
            </div>
            <div className="bg-gradient-to-br from-gray-800 to-slate-800 p-4 rounded-lg border border-gray-700">
              <div className="text-gray-400 text-sm">Current Value</div>
              <div className="text-white text-xl font-semibold">${summary.totalCurrentValue.toFixed(2)}</div>
            </div>
            <div className="bg-gradient-to-br from-gray-800 to-slate-800 p-4 rounded-lg border border-gray-700">
              <div className="text-gray-400 text-sm">Total P&L</div>
              <div className={`text-xl font-semibold flex items-center space-x-1 ${
                summary.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {summary.totalProfit >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                <span>${Math.abs(summary.totalProfit).toFixed(2)} ({summary.profitPercentage.toFixed(2)}%)</span>
              </div>
            </div>
            <div className="bg-gradient-to-br from-gray-800 to-slate-800 p-4 rounded-lg border border-gray-700">
              <div className="text-gray-400 text-sm">Items</div>
              <div className="text-white text-xl font-semibold">{summary.itemCount}</div>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search investments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/25'
                  : 'bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Add Item Button */}
        {activeTab !== 'All' && (
          <div className="mb-6">
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-6 py-3 rounded-lg hover:from-orange-600 hover:to-red-700 transition-all duration-200 font-medium flex items-center space-x-2 shadow-lg"
            >
              <Plus className="w-5 h-5" />
              <span>Add {activeTab.slice(0, -1)}</span>
            </button>
          </div>
        )}

        {/* Items Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {getCurrentItems().map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>

        {getCurrentItems().length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <DollarSign className="w-8 h-8 text-gray-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-400 mb-2">
              {searchQuery ? 'No matching investments' : 'No investments yet'}
            </h3>
            <p className="text-gray-500">
              {searchQuery ? 'Try adjusting your search terms' :
                activeTab === 'All' 
                  ? 'Start by adding some items to track your investments'
                  : `Add your first ${activeTab.toLowerCase()} to get started`
              }
            </p>
          </div>
        )}

        {/* Add Item Modal */}
        {showAddForm && (
          <AddItemForm
            type={activeTab}
            onClose={() => setShowAddForm(false)}
            onAdd={() => {}}
          />
        )}
      </div>

      {itemToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-gray-900 to-slate-900 p-6 rounded-xl border border-red-500/20 max-w-sm w-full mx-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Delete Investment</h3>
              <p className="text-gray-400 mb-6">
                Are you sure you want to delete "{itemToDelete.name}"? This action cannot be undone.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setItemToDelete(null)} // Clear the item instead of setting false
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteItem}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvestmentsPage;