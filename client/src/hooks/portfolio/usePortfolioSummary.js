import { useMemo } from 'react';

// Calculates portfolio summary metrics for the current filtered view.
export const usePortfolioSummary = (activeTab, investments, soldItems, currentItems, groupedSoldItems) => {
  const portfolioSummary = useMemo(() => {
    if (activeTab === 'Sold') {
      // SOLD ITEMS VIEW: Use pre-calculated realized profit from investments_summary
     
      // Total revenue from all sales (what user received)
      const totalSaleValue = soldItems.reduce((sum, item) =>
        sum + parseFloat(item.total_sale_value || 0), 0);
     
      // Total original investment cost for sold quantities
      const totalBuyValue = soldItems.reduce((sum, item) => {
        const soldQuantity = parseFloat(item.quantity_sold || 0);
        const buyPrice = parseFloat(item.buy_price_per_unit || 0);
        return sum + (buyPrice * soldQuantity);
      }, 0);
     
      // Use pre-calculated realized profit from investments_summary table
      // This matches the approach used in useCalculatePortfolioHealth
      const totalProfit = investments.reduce((sum, inv) => 
        sum + (parseFloat(inv.realized_profit_loss) || 0), 0);
     
      // Percentage return on sold investments
      const profitPercentage = totalBuyValue > 0 ? ((totalProfit / totalBuyValue) * 100) : 0;
     
      return {
        totalBuyValue,                    // Original investment in sold items
        totalCurrentValue: totalSaleValue, // Revenue from sales
        totalProfit,                      // Realized profit/loss from investments_summary
        profitPercentage,                 // Return percentage
        itemCount: groupedSoldItems.length // Number of distinct sold item groups
      };
     
    } else {
      // ACTIVE INVESTMENTS VIEW: Calculate unrealized profit/loss from current positions
     
      // Current market value of filtered items
      const filteredValue = currentItems.reduce((sum, item) =>
        sum + (item.current_price * item.quantity), 0);
     
      // Original purchase cost of filtered items  
      const filteredBuyValue = currentItems.reduce((sum, item) =>
        sum + (item.buy_price * item.quantity), 0);
     
      // Use pre-calculated unrealized profit from investments_summary table
      // This ensures consistency with useCalculatePortfolioHealth
      const filteredProfit = currentItems.reduce((sum, item) => 
        sum + (parseFloat(item.unrealized_profit_loss) || 0), 0);
     
      // Percentage gain/loss on current positions
      const filteredProfitPercentage = filteredBuyValue > 0 ?
        ((filteredProfit / filteredBuyValue) * 100) : 0;
       
      return {
        totalBuyValue: filteredBuyValue,      // Original investment in current view
        totalCurrentValue: filteredValue,     // Current market value of view
        totalProfit: filteredProfit,          // Unrealized profit/loss from investments_summary
        profitPercentage: filteredProfitPercentage, // Unrealized return %
        itemCount: currentItems.length        // Number of items in current view
      };
    }
  }, [activeTab, investments, soldItems, groupedSoldItems, currentItems]);
 
  return portfolioSummary;
};