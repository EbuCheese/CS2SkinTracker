import { useMemo } from 'react';

// Calculates portfolio summary metrics for the current filtered view.
export const usePortfolioSummary = (activeTab, investments, soldItems, currentItems, groupedSoldItems, portfolioSummary = null) => {
  const calculatedSummary = useMemo(() => {
      if (activeTab === 'Sold') {
    // Use investments that have been sold (have realized profit/loss)
    const soldInvestments = investments.filter(inv => 
      parseFloat(inv.total_sold_quantity || 0) > 0
    );
    
    const totalRealizedPL = soldInvestments.reduce((sum, inv) => 
      sum + parseFloat(inv.realized_profit_loss || 0), 0
    );
    
    const totalSaleValue = soldInvestments.reduce((sum, inv) => 
      sum + parseFloat(inv.total_sale_value || 0), 0
    );
    
    const totalBuyValue = soldInvestments.reduce((sum, inv) => {
      const soldQuantity = parseFloat(inv.total_sold_quantity || 0);
      const buyPrice = parseFloat(inv.buy_price || 0);
      return sum + (soldQuantity * buyPrice);
    }, 0);
    
    const profitPercentage = totalBuyValue > 0 ? ((totalRealizedPL / totalBuyValue) * 100) : 0;
    
    return {
      totalBuyValue,
      totalCurrentValue: totalSaleValue,
      totalProfit: totalRealizedPL,
      profitPercentage,
      itemCount: soldInvestments.reduce((sum, inv) => 
        sum + parseFloat(inv.total_sold_quantity || 0), 0
      )
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

      // Recalculate unrealized profit using current quantities (not pre-calculated values)
      const filteredProfit = currentItems.reduce((sum, item) => {
        const currentPrice = parseFloat(item.current_price || 0);
        const buyPrice = parseFloat(item.buy_price || 0);
        const quantity = parseFloat(item.quantity || 0);
        return sum + ((currentPrice - buyPrice) * quantity);
      }, 0);

      const filteredProfitPercentage = filteredBuyValue > 0 ?
        ((filteredProfit / filteredBuyValue) * 100) : 0;
        
      return {
        totalBuyValue: filteredBuyValue,
        totalCurrentValue: filteredValue,
        totalProfit: filteredProfit,
        profitPercentage: filteredProfitPercentage,
        itemCount: currentItems.reduce((sum, item) => sum + parseFloat(item.quantity || 0), 0) // Sum quantities instead of counting items
      };
    }
  }, [activeTab, investments, soldItems, groupedSoldItems, currentItems, portfolioSummary]);
  
  return calculatedSummary;
};