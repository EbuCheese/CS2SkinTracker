import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, TrendingUp, Home, Search, Briefcase, Eye, Wrench, User } from 'lucide-react';

// Navbar Component - Responsive navigation bar for SkinWatch CS Investment Tracker
const Navbar = ({ userSession, onLogout }) => {
  // State for mobile menu toggle
  const [isOpen, setIsOpen] = useState(false);

  // Get current location for active route highlighting
  const location = useLocation();

  // Navigation items configuration
  // Each item contains display name, icon component, and route path
  const navItems = [
    { name: 'Home', icon: Home, href: '/' },
    { name: 'Check Prices', icon: Search, href: '/prices' },
    { name: 'My Investments', icon: Briefcase, href: '/investments' },
    { name: 'Price Watchlist', icon: Eye, href: '/watchlist' },
    { name: 'Craft Analysis', icon: Wrench, href: '/craft-analysis' },
    { name: 'Account', icon: User, href: '/account' }
  ];

  // Determines if a navigation item is currently active
  const isActive = (href) => location.pathname === href;

  return (
    <nav className="bg-gradient-to-r from-gray-900 via-slate-900 to-gray-900 shadow-lg border-b border-orange-500/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo Section */}
          <div className="flex items-center space-x-3">
            {/* Logo Image Container */}
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-lg">
              <img 
                src="/logoTEST10.png" 
                alt="SkinWatch Logo" 
                className="w-10 h-10 object-contain rounded-lg"
              />
            </div>

            {/* Brand Text - Hidden on small screens */}
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
                SkinWatch
              </h1>
              <p className="text-xs text-gray-400 -mt-1">CS Investment Tracker</p>
            </div>
          </div>

          {/* Desktop Navigation Menu */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 group relative overflow-hidden ${
                      active
                        ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/25'
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>

                    {/* Hover gradient overlay for inactive items */}
                    {!active && (
                      <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-red-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors duration-200"
            >
              {/* Toggle between hamburger and X icon based on menu state */}
              {isOpen ? (
                <X className="block h-6 w-6" />
              ) : (
                <Menu className="block h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {/* Animated dropdown with smooth height transition */}
      <div className={`md:hidden transition-all duration-300 ease-in-out ${
        isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
      } overflow-hidden`}>
        <div className="px-2 pt-2 pb-3 space-y-1 bg-gray-900/95 backdrop-blur-sm border-t border-orange-500/20">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setIsOpen(false)} // Close mobile menu on item click
                className={`w-full text-left px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 flex items-center space-x-3 ${
                  active
                    ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg'
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Decorative Bottom Border */}
      {/* Subtle gradient line at bottom of navbar - desktop only */}
      <div className="hidden md:block relative">
        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-orange-500 to-transparent opacity-30" />
      </div>
    </nav>
  );
};

export default Navbar;