import { useMemo } from 'react';

// Calculates portfolio summary metrics for the current filtered view.
export const usePortfolioSummary = (activeTab, investments, soldItems, currentItems, groupedSoldItems, portfolioSummary = null) => {
  const calculatedSummary = useMemo(() => {
    if (activeTab === 'Sold') {
      // SOLD ITEMS VIEW: Always calculate client-side for optimistic updates
      // This ensures immediate UI feedback when items are sold
      
      // Use efficient bulk calculations instead of multiple reduces
      let totalSaleValue = 0;
      let totalBuyValue = 0;
      let totalRealizedPL = 0;
      
      soldItems.forEach(item => {
        const saleValue = parseFloat(item.total_sale_value || 0);
        const quantitySold = parseFloat(item.quantity_sold || 0);
        const buyPrice = parseFloat(item.buy_price_per_unit || 0);
        const buyValue = buyPrice * quantitySold;
        
        totalSaleValue += saleValue;
        totalBuyValue += buyValue;
        totalRealizedPL += (saleValue - buyValue); // More efficient than separate calculation
      });
      
      const profitPercentage = totalBuyValue > 0 ? ((totalRealizedPL / totalBuyValue) * 100) : 0;
      
      return {
        totalBuyValue,
        totalCurrentValue: totalSaleValue,
        totalProfit: totalRealizedPL,
        profitPercentage,
        itemCount: groupedSoldItems.length
      };
      
    } else {
      // ACTIVE INVESTMENTS VIEW: Use server values when possible
      
      // If showing all investments and we have portfolio summary, use pre-calculated values
      if (currentItems.length === investments.length && portfolioSummary) {
        const currentPortfolioValue = parseFloat(portfolioSummary.current_portfolio_value || 0);
        const totalInvestment = parseFloat(portfolioSummary.total_investment || 0);
        const totalUnrealizedPL = parseFloat(portfolioSummary.total_unrealized_pl || 0);
        const profitPercentage = parseFloat(portfolioSummary.profit_percentage || 0);
        
        return {
          totalBuyValue: totalInvestment,
          totalCurrentValue: currentPortfolioValue,
          totalProfit: totalUnrealizedPL,
          profitPercentage,
          itemCount: parseInt(portfolioSummary.total_items || 0)
        };
      }
      
      // Calculate filtered view metrics manually
      const filteredValue = currentItems.reduce((sum, item) =>
        sum + (parseFloat(item.current_price || 0) * parseFloat(item.quantity || 0)), 0);
      
      const filteredBuyValue = currentItems.reduce((sum, item) =>
        sum + (parseFloat(item.buy_price || 0) * parseFloat(item.quantity || 0)), 0);
      
      // Use pre-calculated unrealized profit from investments_summary view
      const filteredProfit = currentItems.reduce((sum, item) =>
        sum + (parseFloat(item.unrealized_profit_loss) || 0), 0);
      
      const filteredProfitPercentage = filteredBuyValue > 0 ?
        ((filteredProfit / filteredBuyValue) * 100) : 0;
        
      return {
        totalBuyValue: filteredBuyValue,
        totalCurrentValue: filteredValue,
        totalProfit: filteredProfit,
        profitPercentage: filteredProfitPercentage,
        itemCount: currentItems.length
      };
    }
  }, [activeTab, investments, soldItems, groupedSoldItems, currentItems, portfolioSummary]);
  
  return calculatedSummary;
};