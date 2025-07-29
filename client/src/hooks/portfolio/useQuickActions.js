import { useMemo } from 'react';
import { Search, Plus, DollarSign, Eye, TrendingUp } from 'lucide-react';

export const useQuickActions = (setShowQuickAdd, setShowQuickSell) => {
  return useMemo(() => [
    {
      title: 'Check Prices',
      description: 'Look up current market prices',
      icon: Search,
      color: 'from-blue-500 to-cyan-600',
      hoverColor: 'hover:from-blue-600 hover:to-cyan-700',
    },
    {
      title: 'Add New Investment',
      description: 'Add a new skin to your portfolio',
      icon: Plus,
      color: 'from-green-500 to-emerald-600',
      hoverColor: 'hover:from-green-600 hover:to-emerald-700',
      onClick: () => setShowQuickAdd(true)
    },
    {
      title: 'Sell Items',
      description: 'Record a sale from your portfolio',
      icon: DollarSign,
      color: 'from-purple-500 to-violet-600',
      hoverColor: 'hover:from-purple-600 hover:to-violet-700',
      onClick: () => setShowQuickSell(true)
    },
    {
      title: 'View Watchlist',
      description: 'Monitor items you\'re tracking',
      icon: Eye,
      color: 'from-orange-500 to-red-600',
      hoverColor: 'hover:from-orange-600 hover:to-red-700',
    },
    {
      title: 'Market Trends',
      description: 'View trending skins & market insights',
      icon: TrendingUp,
      color: 'from-rose-500 to-pink-600',
      hoverColor: 'hover:from-rose-600 hover:to-pink-700',
    },
  ], [setShowQuickAdd, setShowQuickSell]);
};