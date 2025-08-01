import { useMemo } from 'react';

// Calculates portfolio summary metrics for the current filtered view.
export const usePortfolioSummary = (activeTab, investments, soldItems, currentItems, groupedSoldItems, portfolioSummary = null) => {
  const calculatedSummary = useMemo(() => {
    if (activeTab === 'Sold') {
      // SOLD ITEMS VIEW: Use pre-calculated realized profit from investments_summary
     
      // If we have pre-calculated portfolio summary, use those realized values
      if (portfolioSummary && typeof portfolioSummary.total_realized_pl !== 'undefined') {
        const totalSaleValue = soldItems.reduce((sum, item) =>
          sum + parseFloat(item.total_sale_value || 0), 0);
        
        const totalBuyValue = soldItems.reduce((sum, item) => {
          const soldQuantity = parseFloat(item.quantity_sold || 0);
          const buyPrice = parseFloat(item.buy_price_per_unit || 0);
          return sum + (buyPrice * soldQuantity);
        }, 0);
        
        // Use pre-calculated realized profit from database
        const totalProfit = parseFloat(portfolioSummary.total_realized_pl || 0);
        const profitPercentage = totalBuyValue > 0 ? ((totalProfit / totalBuyValue) * 100) : 0;
        
        return {
          totalBuyValue,
          totalCurrentValue: totalSaleValue,
          totalProfit,
          profitPercentage,
          itemCount: groupedSoldItems.length
        };
      }
      
      // Fallback to manual calculation if portfolio summary not available
      const totalSaleValue = soldItems.reduce((sum, item) =>
        sum + parseFloat(item.total_sale_value || 0), 0);
     
      const totalBuyValue = soldItems.reduce((sum, item) => {
        const soldQuantity = parseFloat(item.quantity_sold || 0);
        const buyPrice = parseFloat(item.buy_price_per_unit || 0);
        return sum + (buyPrice * soldQuantity);
      }, 0);
     
      // Manual calculation from investments data
      const totalProfit = investments.reduce((sum, inv) =>
        sum + (parseFloat(inv.realized_profit_loss) || 0), 0);
     
      const profitPercentage = totalBuyValue > 0 ? ((totalProfit / totalBuyValue) * 100) : 0;
     
      return {
        totalBuyValue,
        totalCurrentValue: totalSaleValue,
        totalProfit,
        profitPercentage,
        itemCount: groupedSoldItems.length
      };
     
    } else {
      // ACTIVE INVESTMENTS VIEW: Calculate filtered view metrics
      
      // If showing all investments and we have portfolio summary, use those values for efficiency
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