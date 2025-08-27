import { useMemo } from 'react';

export const usePortfolioSummary = (
  activeTab, 
  investments, 
  soldItems, 
  currentItems,
  groupedSoldItems, 
  portfolioSummary = null,
  optimisticSoldItems = [],
  searchQuery = ''
) => {
    const calculatedSummary = useMemo(() => {
  if (activeTab === 'Sold') {
    if (!searchQuery) {
      // Combine three sources of sold item data:
      // 1. Investments with partial sales (still in investments array)
      // 2. Items that were fully sold optimistically (no longer in investments)
      // 3. Historical sold items from database
      
      // Source 1: Investments with realized profit/loss (partial sales)
      const partialSoldInvestments = investments.filter(inv =>
        parseFloat(inv.total_sold_quantity || 0) > 0
      );
      
      // Source 2: Optimistically fully sold items (passed as parameter)
      const optimisticallyFullySold = optimisticSoldItems || [];
      
      // Calculate metrics from partial sales
      const partialSalesMetrics = partialSoldInvestments.reduce((acc, inv) => {
        const soldQuantity = parseFloat(inv.total_sold_quantity || 0);
        const realizedPL = parseFloat(inv.realized_profit_loss || 0);
        const saleValue = parseFloat(inv.total_sale_value || 0);
        const buyPrice = parseFloat(inv.buy_price || 0);
        const soldBuyValue = soldQuantity * buyPrice;
        
        return {
          totalRealizedPL: acc.totalRealizedPL + realizedPL,
          totalSaleValue: acc.totalSaleValue + saleValue,
          totalBuyValue: acc.totalBuyValue + soldBuyValue,
          soldQuantity: acc.soldQuantity + soldQuantity
        };
      }, { totalRealizedPL: 0, totalSaleValue: 0, totalBuyValue: 0, soldQuantity: 0 });
      
      // Calculate metrics from optimistic full sales
      const optimisticSalesMetrics = optimisticallyFullySold.reduce((acc, soldItem) => {
        const quantity = parseFloat(soldItem.quantity || 0);
        const salePrice = parseFloat(soldItem.salePrice || 0);
        const buyPrice = parseFloat(soldItem.buyPrice || 0);
        const saleValue = quantity * salePrice;
        const buyValue = quantity * buyPrice;
        const profitLoss = (salePrice - buyPrice) * quantity;
        
        return {
          totalRealizedPL: acc.totalRealizedPL + profitLoss,
          totalSaleValue: acc.totalSaleValue + saleValue,
          totalBuyValue: acc.totalBuyValue + buyValue,
          soldQuantity: acc.soldQuantity + quantity
        };
      }, { totalRealizedPL: 0, totalSaleValue: 0, totalBuyValue: 0, soldQuantity: 0 });
      
      // Combine both sources
      const totalRealizedPL = partialSalesMetrics.totalRealizedPL + optimisticSalesMetrics.totalRealizedPL;
      const totalSaleValue = partialSalesMetrics.totalSaleValue + optimisticSalesMetrics.totalSaleValue;
      const totalBuyValue = partialSalesMetrics.totalBuyValue + optimisticSalesMetrics.totalBuyValue;
      const totalSoldQuantity = partialSalesMetrics.soldQuantity + optimisticSalesMetrics.soldQuantity;
      
      const profitPercentage = totalBuyValue > 0 ? ((totalRealizedPL / totalBuyValue) * 100) : 0;
      
      return {
        totalBuyValue,
        totalCurrentValue: totalSaleValue,
        totalProfit: totalRealizedPL,
        profitPercentage,
        itemCount: totalSoldQuantity
      };
    } else {
      // WITH SEARCH: Calculate only from what's currently displayed (currentItems from filtering hook)
      const filteredSoldMetrics = currentItems.reduce((acc, soldItem) => {
        const soldQuantity = parseFloat(soldItem.quantity_sold || 0);
        const salePrice = parseFloat(soldItem.price_per_unit || 0);
        const buyPrice = parseFloat(soldItem.buy_price_per_unit || 0);
        const saleValue = soldQuantity * salePrice;
        const buyValue = soldQuantity * buyPrice;
        const profitLoss = (salePrice - buyPrice) * soldQuantity;
        
        return {
          totalRealizedPL: acc.totalRealizedPL + profitLoss,
          totalSaleValue: acc.totalSaleValue + saleValue,
          totalBuyValue: acc.totalBuyValue + buyValue,
          soldQuantity: acc.soldQuantity + soldQuantity
        };
      }, { totalRealizedPL: 0, totalSaleValue: 0, totalBuyValue: 0, soldQuantity: 0 });
      
      const profitPercentage = filteredSoldMetrics.totalBuyValue > 0 ? 
        ((filteredSoldMetrics.totalRealizedPL / filteredSoldMetrics.totalBuyValue) * 100) : 0;
      
      return {
        totalBuyValue: filteredSoldMetrics.totalBuyValue,
        totalCurrentValue: filteredSoldMetrics.totalSaleValue,
        totalProfit: filteredSoldMetrics.totalRealizedPL,
        profitPercentage,
        itemCount: filteredSoldMetrics.soldQuantity
      };
    }
  } else {
    // ACTIVE INVESTMENTS VIEW 
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
      itemCount: currentItems.reduce((sum, item) => sum + parseFloat(item.quantity || 0), 0)
    };
  }
}, [activeTab, investments, soldItems, groupedSoldItems, currentItems, portfolioSummary, optimisticSoldItems, searchQuery]);
  
  return calculatedSummary;
};