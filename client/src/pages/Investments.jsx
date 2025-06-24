import React, { useState, useEffect } from 'react';
import { Search, Plus, X, DollarSign, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import ItemCard from '../components/ItemCard';
import AddItemForm from '../components/AddItemForm';

const InvestmentsPage = ({ userSession }) => {
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [newItemIds, setNewItemIds] = useState(new Set());

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

        {/* Items Grid - From ItemCard Component */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {getCurrentItems().map((item) => (
            <ItemCard 
              key={item.id} 
              item={item} 
              userSession={userSession}
              onUpdate={(itemId, updates) => {
                // Update the item in local state
                setInvestments(prev => prev.map(inv => 
                  inv.id === itemId ? { ...inv, ...updates } : inv
                ));
              }}
              onDelete={(itemToDelete) => {
                // Set the item to delete for confirmation modal
                setItemToDelete(itemToDelete);
              }}
              isNew={newItemIds.has(item.id)}
            />
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
            onAdd={(newItem) => {
            // Add the new item to the TOP of the investments state
            setInvestments(prev => [newItem, ...prev]);
            
            // Mark this item as new for animation
            setNewItemIds(prev => new Set([...prev, newItem.id]));
            
            // Remove the 'new' flag after animation completes
            setTimeout(() => {
              setNewItemIds(prev => {
                const updated = new Set(prev);
                updated.delete(newItem.id);
                return updated;
              });
            }, 700); // Slightly longer than animation duration
          }}
            userSession={userSession}
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