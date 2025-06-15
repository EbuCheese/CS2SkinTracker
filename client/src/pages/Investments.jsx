import React, { useState, useEffect } from 'react';
import { Search, Plus, Upload, X, Minus, Edit3, DollarSign, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

const InvestmentsPage = ({ userSession }) => {
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const tabs = ['All', 'Liquids', 'Crafts', 'Cases'];

  // Fetch investments from Supabase
  useEffect(() => {
    if (userSession?.id) {
      fetchInvestments();
    } else {
      setLoading(false);
      setError('No user session found. Please validate your beta key.');
    }
  }, [userSession]);

  const fetchInvestments = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching investments for user:', userSession.id);
      
      const { data, error } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', userSession.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('Investments fetched:', data);
      setInvestments(data ?? []);
    
      // If no investments found, that's normal for a new user
      if (!data || data.length === 0) {
        console.log('No investments found for user - this is normal for new users');
      }

      } catch (err) {
      const errorMessage = `Failed to fetch investments: ${err.message}`;
      setError(errorMessage);
      console.error('Error fetching investments:', err);
    } finally {
      setLoading(false);
    }

    const retry = () => {
    if (userSession?.id) {
      fetchInvestments();
    } else {
      setError('No user session found. Please validate your beta key first.');
    }
  };

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
        const reader = new FileReader();
        reader.onload = (e) => {
          setFormData(prev => ({ ...prev, image_url: e.target.result }));
        };
        reader.readAsDataURL(file);
      }
    };

    const handleSubmit = async () => {
      if (!formData.name || !formData.buy_price) {
        alert('Please fill in required fields');
        return;
      }

      if (!betaUser?.id) {
        alert('No beta user found');
        return;
      }

      try {
        setSubmitting(true);
        const buyPrice = parseFloat(formData.buy_price);
        
        if (isNaN(buyPrice) || buyPrice <= 0) {
          alert('Please enter a valid buy price');
          return;
        }
        
        const newInvestment = {
          user_id: betaUser.id,
          type: type.toLowerCase().slice(0, -1), // Remove 's' and lowercase
          name: formData.name.trim(),
          skin_name: formData.skin_name?.trim() || null,
          condition: formData.condition?.trim() || null,
          buy_price: buyPrice,
          current_price: buyPrice * (1 + (Math.random() * 0.4 - 0.2)), // Random current price for demo
          quantity: Math.max(1, formData.quantity),
          image_url: formData.image_url || null
        };

        const { data, error } = await supabase
          .from('investments')
          .insert([newInvestment])
          .select()
          .single();

        if (error) throw error;
        
        setInvestments(prev => [data, ...prev]);
        onClose();
      } catch (err) {
        console.error('Error adding investment:', err);
        alert('Failed to add investment: ' + err.message);
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
                />
                <input
                  type="text"
                  placeholder="Base Skin Name"
                  value={formData.skin_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, skin_name: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none"
                />
              </>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder={`Search ${type.toLowerCase()}...`}
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none"
                    required
                  />
                </div>
                
                {type === 'Liquids' && (
                  <input
                    type="text"
                    placeholder="Condition (e.g., Field-Tested)"
                    value={formData.condition}
                    onChange={(e) => setFormData(prev => ({ ...prev, condition: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none"
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
                        value={formData.quantity}
                        onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                        className="w-16 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-center focus:border-orange-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, quantity: prev.quantity + 1 }))}
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
        alert('Please enter a valid sold price');
        return;
      }
      
      try {
        setUpdating(true);
        const { error } = await supabase
          .from('investments')
          .update({ sold_price: price })
          .eq('id', item.id);

        if (error) throw error;
        
        // Update local state
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
        alert('Failed to update sold price: ' + err.message);
      } finally {
        setUpdating(false);
      }
    };

    const handleQuantityUpdate = async (newQuantity) => {
      if (newQuantity < 1) return;
      
      try {
        const { error } = await supabase
          .from('investments')
          .update({ quantity: newQuantity })
          .eq('id', item.id);

        if (error) throw error;
        
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
        alert('Failed to update quantity: ' + err.message);
      }
    };

    const handleDeleteItem = async () => {
      if (!confirm('Are you sure you want to delete this investment?')) return;
      
      try {
        const { error } = await supabase
          .from('investments')
          .delete()
          .eq('id', item.id);

        if (error) throw error;
        
        // Update local state
        setInvestments(prev => prev.filter(inv => inv.id !== item.id));
      } catch (err) {
        console.error('Error deleting investment:', err);
        alert('Failed to delete investment: ' + err.message);
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
            <h3 className="font-medium text-white">{item.name}</h3>
            {item.skin_name && (
              <p className="text-sm text-gray-400">{item.skin_name}</p>
            )}
            {item.condition && (
              <p className="text-xs text-gray-500">{item.condition}</p>
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
                  className="w-6 h-6 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center text-white"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-white text-sm w-8 text-center">{item.quantity}</span>
                <button
                  onClick={() => handleQuantityUpdate(item.quantity + 1)}
                  className="w-6 h-6 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center text-white"
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
                onClick={handleDeleteItem}
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
                onClick={() => setIsEditing(false)}
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
      filteredItems = filteredItems.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.skin_name && item.skin_name.toLowerCase().includes(searchQuery.toLowerCase()))
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
    </div>
  );
};

export default InvestmentsPage;