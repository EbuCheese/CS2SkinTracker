import { useMemo } from 'react';

export const useRecentActivity = (investments, soldItems) => {
  return useMemo(() => {
    if (investments.length === 0 && soldItems.length === 0) return [];
    
    // Process recent purchases
    const recentInvestments = investments
      .filter(inv => {
        return inv.created_at &&
               parseFloat(inv.original_quantity || inv.quantity) > 0 &&
               parseFloat(inv.buy_price) > 0;
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 12) // Increased from 10 to 12
      .map(inv => {
        const purchaseQuantity = parseFloat(inv.original_quantity || inv.quantity);
        const purchasePrice = parseFloat(inv.buy_price);
       
        const subtitle = inv.condition && inv.condition.toLowerCase() !== 'unknown'
          ? `${inv.condition} • Qty: ${purchaseQuantity}`
          : `Qty: ${purchaseQuantity}`;
       
        return {
          ...inv,
          type: 'purchase',
          date: new Date(inv.created_at),
          title: `${inv.name}${inv.skin_name ? ` (${inv.skin_name})` : ''}`,
          subtitle: subtitle,
          amount: purchasePrice * purchaseQuantity,
          isPositive: false,
          image_url: inv.image_url
        };
      });
      
    // Process recent sales
    const recentSales = soldItems
      .filter(sale => sale.sale_date && parseFloat(sale.total_sale_value) > 0)
      .sort((a, b) => new Date(b.sale_date) - new Date(a.sale_date))
      .slice(0, 12)
      .map(sale => {
        const subtitle = sale.item_condition && sale.item_condition.toLowerCase() !== 'unknown'
          ? `${sale.item_condition} • Qty: ${sale.quantity_sold}`
          : `Qty: ${sale.quantity_sold}`;
      
        return {
          ...sale,
          type: 'sale',
          date: new Date(sale.sale_date),
          // Map database fields to match formatting hook expectations
          name: sale.item_name || 'Unknown Item',
          skin_name: sale.item_skin_name,
          condition: sale.item_condition,
          variant: sale.item_variant || 'normal',
          quantity: sale.quantity_sold,
          // original fields for compatibility
          item_name: sale.item_name,
          item_skin_name: sale.item_skin_name,
          item_condition: sale.item_condition,
          item_variant: sale.item_variant,
          subtitle: subtitle,
          amount: parseFloat(sale.total_sale_value),
          isPositive: true,
          image_url: sale.image_url
        };
      });
      
    return [...recentInvestments, ...recentSales]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 12); 
  }, [investments, soldItems]);
};