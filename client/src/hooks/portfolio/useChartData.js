import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/supabaseClient';
import { useAdvancedDebounce, formatChartDate } from '@/hooks/util';

export const useChartData = (userSession, selectedTimePeriod, hasInvestments) => {
  const [chartData, setChartData] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);
  const hasInitiallyLoaded = useRef(false);
  const lastTimePeriod = useRef(null);

  // fetch chart data from db
  const fetchChartData = useCallback(async (timePeriod) => {
    if (!hasInvestments) return;
   
    try {
      setChartLoading(true);
     
      const { data, error } = await supabase.rpc('get_chart_data', {
        context_user_id: userSession.id,
        time_period: timePeriod
      });

      if (error) {
        console.error('Chart data fetch failed:', error);
        return;
      }

      const chartResult = typeof data === 'string' ? JSON.parse(data) : data;
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
     
      // transform data to graph for time period
      const transformedData = chartResult.data.map(point => {
        const { formattedDate, date, isToday } = formatChartDate(point, chartResult.granularity, timePeriod);
       
        return {
          date: formattedDate,
          rawDate: date,
          totalValue: parseFloat(point.value),
          invested: parseFloat(point.invested),
          profitLoss: parseFloat(point.profit_loss),
          returnPercentage: parseFloat(point.return_percentage),
          isCurrentValue: isToday && chartResult.granularity === 'hourly' ||
                        (chartResult.granularity === 'daily' && isToday) ||
                        (chartResult.granularity === 'monthly' && date.getMonth() === currentMonth)
        };
      });

      transformedData.sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate));
      setChartData(transformedData);
     
    } catch (err) {
      console.error('Error fetching chart data:', err);
    } finally {
      setChartLoading(false);
    }
  }, [userSession?.id, hasInvestments]);

  // debounce the chart data to prevent spamming time frames
  const { debouncedFunction: debouncedFetchChartData } = useAdvancedDebounce(
    fetchChartData,
    300,
    {
      leading: false,
      trailing: true,
      maxWait: 1500
    }
  );

  useEffect(() => {
    if (hasInvestments) {
      const isInitialLoad = !hasInitiallyLoaded.current;
      
      if (isInitialLoad) {
        // For initial load, fetch immediately without debouncing
        fetchChartData(selectedTimePeriod);
        hasInitiallyLoaded.current = true;
      } else {
        // For subsequent time period changes, use debounced version
        debouncedFetchChartData(selectedTimePeriod);
      }
      
      lastTimePeriod.current = selectedTimePeriod;
    }
  }, [selectedTimePeriod, fetchChartData, debouncedFetchChartData, hasInvestments]);

  // Reset initial load flag when hasInvestments changes from false to true
  useEffect(() => {
    if (hasInvestments && !hasInitiallyLoaded.current) {
      hasInitiallyLoaded.current = false;
    }
  }, [hasInvestments]);

  return {
    chartData,
    chartLoading,
    refetchChartData: debouncedFetchChartData
  };
};