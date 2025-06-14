import React, { useState } from 'react';
import { Search, Plus, Upload, X, Minus, Edit3, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

const InvestmentsPage = () => {
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Sample data for demonstration
  const [liquidItems, setLiquidItems] = useState([
    {
      id: 'liquid_1',
      name: 'AK-47 | Redline',
      condition: 'Field-Tested',
      buyPrice: 45.50,
      currentPrice: 52.30,
      soldPrice: null,
      quantity: 2,
      image: 'https://via.placeholder.com/80x60/ff6b35/ffffff?text=AK-47'
    }
  ]);
  
  const [craftItems, setCraftItems] = useState([
    {
      id: 'craft_1',
      name: 'Custom AK-47 Blue Gem',
      skinName: 'AK-47 | Case Hardened',
      buyPrice: 1250.00,
      currentPrice: 1450.00,
      soldPrice: null,
      image: null
    }
  ]);
  
  const [caseItems, setCaseItems] = useState([
    {
      id: 'case_1',
      name: 'Chroma 3 Case',
      buyPrice: 0.85,
      currentPrice: 0.92,
      soldPrice: null,
      quantity: 50,
      image: 'https://via.placeholder.com/80x60/4a90e2/ffffff?text=Case'
    }
  ]);

  const tabs = ['All', 'Liquids', 'Crafts', 'Cases'];

  const AddItemForm = ({ type, onClose, onAdd }) => {
    const [formData, setFormData] = useState({
      name: '',
      skinName: '',
      buyPrice: '',
      quantity: 1,
      image: null
    });

    const handleImageUpload = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setFormData(prev => ({ ...prev, image: e.target.result }));
        };
        reader.readAsDataURL(file);
      }
    };

    const handleSubmit = () => {
      if (formData.name && formData.buyPrice) {
        onAdd(formData);
        onClose();
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
                      {formData.image ? (
                        <img src={formData.image} alt="Preview" className="w-20 h-20 object-cover rounded" />
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
                  value={formData.skinName}
                  onChange={(e) => setFormData(prev => ({ ...prev, skinName: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none"
                  required
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
              value={formData.buyPrice}
              onChange={(e) => setFormData(prev => ({ ...prev, buyPrice: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none"
              required
            />
            
            <button
              type="button"
              onClick={handleSubmit}
              className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-2 rounded-lg hover:from-orange-600 hover:to-red-700 transition-all duration-200 font-medium"
            >
              Add Item
            </button>
          </div>
        </div>
      </div>
    );
  };

  const ItemCard = ({ item, type, onUpdateSoldPrice, onUpdateQuantity }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [soldPrice, setSoldPrice] = useState(item.soldPrice || '');
    
    const profitLoss = item.soldPrice ? 
      (type === 'Liquids' || type === 'Cases' ? 
        (item.soldPrice - item.buyPrice) * item.quantity : 
        item.soldPrice - item.buyPrice) : 
      (type === 'Liquids' || type === 'Cases' ? 
        (item.currentPrice - item.buyPrice) * item.quantity : 
        item.currentPrice - item.buyPrice);
    
    const profitPercentage = ((profitLoss / (type === 'Liquids' || type === 'Cases' ? 
      item.buyPrice * item.quantity : 
      item.buyPrice)) * 100).toFixed(2);

    return (
      <div className="bg-gradient-to-br from-gray-800 to-slate-800 rounded-lg p-4 border border-gray-700 hover:border-orange-500/30 transition-all duration-200">
        <div className="flex items-start space-x-4">
          <div className="w-20 h-16 bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
            {item.image ? (
              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
            ) : (
              <div className="text-gray-400 text-xs text-center">No Image</div>
            )}
          </div>
          
          <div className="flex-1">
            <h3 className="font-medium text-white">{item.name}</h3>
            {item.skinName && (
              <p className="text-sm text-gray-400">{item.skinName}</p>
            )}
            {item.condition && (
              <p className="text-xs text-gray-500">{item.condition}</p>
            )}
            
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-400">Buy: </span>
                <span className="text-white">${item.buyPrice.toFixed(2)}</span>
                {(type === 'Liquids' || type === 'Cases') && (
                  <span className="text-gray-400"> x{item.quantity}</span>
                )}
              </div>
              <div>
                <span className="text-gray-400">Current: </span>
                <span className="text-white">${item.currentPrice.toFixed(2)}</span>
              </div>
            </div>
            
            {(type === 'Liquids' || type === 'Cases') && (
              <div className="mt-2 flex items-center space-x-2">
                <span className="text-gray-400 text-sm">Qty:</span>
                <button
                  onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1), type)}
                  className="w-6 h-6 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center text-white"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-white text-sm w-8 text-center">{item.quantity}</span>
                <button
                  onClick={() => onUpdateQuantity(item.id, item.quantity + 1, type)}
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
            
            <div className="mt-2">
              {!item.soldPrice ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded hover:bg-orange-500/30 transition-colors"
                >
                  Mark Sold
                </button>
              ) : (
                <div className="text-xs text-gray-400">
                  Sold: ${item.soldPrice.toFixed(2)}
                </div>
              )}
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
                onClick={() => {
                  onUpdateSoldPrice(item.id, parseFloat(soldPrice), type);
                  setIsEditing(false);
                }}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
              >
                Save
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

  const getAllItems = () => {
    return [
      ...liquidItems.map(item => ({ ...item, type: 'Liquids' })),
      ...craftItems.map(item => ({ ...item, type: 'Crafts' })),
      ...caseItems.map(item => ({ ...item, type: 'Cases' }))
    ];
  };

  const getCurrentItems = () => {
    switch (activeTab) {
      case 'All':
        return getAllItems();
      case 'Liquids':
        return liquidItems;
      case 'Crafts':
        return craftItems;
      case 'Cases':
        return caseItems;
      default:
        return [];
    }
  };

  // Generate unique IDs with type prefix
  const generateId = (type) => {
    const prefix = type.toLowerCase().substring(0, 5);
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `${prefix}_${timestamp}_${random}`;
  };

  const addItem = (formData) => {
    const itemType = activeTab;
    const newItem = {
      id: generateId(itemType),
      ...formData,
      buyPrice: parseFloat(formData.buyPrice),
      currentPrice: parseFloat(formData.buyPrice) * (1 + Math.random() * 0.4 - 0.2), // Random current price for demo
      soldPrice: null
    };

    switch (itemType) {
      case 'Liquids':
        setLiquidItems(prev => [...prev, newItem]);
        break;
      case 'Crafts':
        setCraftItems(prev => [...prev, newItem]);
        break;
      case 'Cases':
        setCaseItems(prev => [...prev, newItem]);
        break;
    }
  };

  const updateSoldPrice = (id, soldPrice, itemType) => {
    const updateFunction = (items) => 
      items.map(item => item.id === id ? { ...item, soldPrice } : item);

    // Determine which array to update based on item type
    const targetType = itemType || activeTab;
    
    switch (targetType) {
      case 'Liquids':
        setLiquidItems(updateFunction);
        break;
      case 'Crafts':
        setCraftItems(updateFunction);
        break;
      case 'Cases':
        setCaseItems(updateFunction);
        break;
    }
  };

  const updateQuantity = (id, quantity, itemType) => {
    const updateFunction = (items) => 
      items.map(item => item.id === id ? { ...item, quantity } : item);

    // Determine which array to update based on item type
    const targetType = itemType || activeTab;
    
    switch (targetType) {
      case 'Liquids':
        setLiquidItems(updateFunction);
        break;
      case 'Cases':
        setCaseItems(updateFunction);
        break;
    }
  };

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
            <ItemCard
              key={item.id}
              item={item}
              type={item.type || activeTab}
              onUpdateSoldPrice={updateSoldPrice}
              onUpdateQuantity={updateQuantity}
            />
          ))}
        </div>

        {getCurrentItems().length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <DollarSign className="w-8 h-8 text-gray-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-400 mb-2">No investments yet</h3>
            <p className="text-gray-500">
              {activeTab === 'All' 
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
            onAdd={addItem}
          />
        )}
      </div>
    </div>
  );
};

export default InvestmentsPage;