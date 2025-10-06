import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/supabaseClient';
import { useAdvancedDebounce, formatChartDate } from '@/hooks/util';
import { useUserSettings } from '@/contexts/UserSettingsContext';

export const useChartData = (userSession, selectedTimePeriod, hasInvestments) => {
  const { timezone } = useUserSettings();

  const [chartData, setChartData] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);
  const hasInitiallyLoaded = useRef(false);
  const lastTimePeriod = useRef(null);

  const ENABLE_MOCK_DATA = true; // Toggle this for testing

// Mock data generator
const generateMockData = (timePeriod) => {
  const scenarios = {
    '1D': Array.from({ length: 24 }, (_, i) => ({
      date: new Date(Date.now() - (23 - i) * 60 * 60 * 1000).toISOString(),
      value: 1000 + Math.random() * 100,
      invested: 1000,
      profit_loss: Math.random() * 100 - 50,
      return_percentage: (Math.random() * 10 - 5).toFixed(2)
    })),
    '5D': Array.from({ length: 120 }, (_, i) => ({
      date: new Date(Date.now() - (119 - i) * 60 * 60 * 1000).toISOString(),
      value: 1000 + i * 2 + Math.random() * 50,
      invested: 1000,
      profit_loss: i * 2 + Math.random() * 50,
      return_percentage: ((i * 2 / 1000) * 100).toFixed(2)
    })),
    '1M': Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString(),
      value: 1000 + i * 10 + Math.random() * 50,
      invested: 1000,
      profit_loss: i * 10 + Math.random() * 50,
      return_percentage: ((i * 10 / 1000) * 100).toFixed(2)
    })),
    '6M': Array.from({ length: 180 }, (_, i) => ({
      date: new Date(Date.now() - (179 - i) * 24 * 60 * 60 * 1000).toISOString(),
      value: 1000 + i * 5 + Math.random() * 100,
      invested: 1000,
      profit_loss: i * 5 + Math.random() * 100,
      return_percentage: ((i * 5 / 1000) * 100).toFixed(2)
    })),
    '1Y': Array.from({ length: 365 }, (_, i) => ({
      date: new Date(Date.now() - (364 - i) * 24 * 60 * 60 * 1000).toISOString(),
      value: 1000 + i * 3 + Math.random() * 150,
      invested: 1000,
      profit_loss: i * 3 + Math.random() * 150,
      return_percentage: ((i * 3 / 1000) * 100).toFixed(2)
    })),
    '5Y': Array.from({ length: 60 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (59 - i));
    date.setDate(1); // First of month
    date.setHours(0, 0, 0, 0);
    
    return {
      date: date.toISOString(),
      value: 1000 + i * 50 + Math.random() * 200,
      invested: 1000,
      profit_loss: i * 50 + Math.random() * 200,
      return_percentage: ((i * 50 / 1000) * 100).toFixed(2)
    };
  }),
    'MAX': Array.from({ length: 60 }, (_, i) => ({
      date: new Date(Date.now() - (59 - i) * 30 * 24 * 60 * 60 * 1000).toISOString(),
      value: 1000 + i * 50 + Math.random() * 200,
      invested: 1000,
      profit_loss: i * 50 + Math.random() * 200,
      return_percentage: ((i * 50 / 1000) * 100).toFixed(2)
    }))
  };

  return scenarios[timePeriod] || scenarios['1M'];
};

  // fetch chart data from db
  const fetchChartData = useCallback(async (timePeriod) => {
  if (!hasInvestments) return;
  
  try {
    setChartLoading(true);
    
    // MOCK DATA TOGGLE
    if (ENABLE_MOCK_DATA) {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockData = generateMockData(timePeriod);
      const chartResult = {
        granularity: ['1D', '5D'].includes(timePeriod) ? 'hourly' : 
                     ['1Y', '5Y', 'MAX'].includes(timePeriod) ? 'monthly' : 'daily',
        data: mockData
      };
      
      // Continue with same transformation logic
      const transformedData = chartResult.data.map(point => {
        const { formattedDate, date, isToday } = formatChartDate(
          point,
          chartResult.granularity,
          timePeriod,
          timezone
        );
        
        return {
          date: formattedDate,
          rawDate: date,
          totalValue: parseFloat(point.value),
          invested: parseFloat(point.invested),
          profitLoss: parseFloat(point.profit_loss),
          returnPercentage: parseFloat(point.return_percentage),
          isCurrentValue: isToday
        };
      });
      
      transformedData.sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate));
      setChartData(transformedData);
      return;
    }
     
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
     
      // Transform data with user's timezone
      const transformedData = chartResult.data.map(point => {
        const { formattedDate, date, isToday } = formatChartDate(
          point, 
          chartResult.granularity, 
          timePeriod,
          timezone
        );
       
        return {
          date: formattedDate,
          rawDate: date,
          totalValue: parseFloat(point.value),
          invested: parseFloat(point.invested),
          profitLoss: parseFloat(point.profit_loss),
          returnPercentage: parseFloat(point.return_percentage),
          isCurrentValue: isToday && chartResult.granularity === 'hourly' ||
                        (chartResult.granularity === 'daily' && isToday) ||
                        (chartResult.granularity === 'monthly' && 
                         date.getMonth() === new Date().getMonth())
        };
      });

      transformedData.sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate));
      setChartData(transformedData);

          console.log('Raw data before transform:', chartResult.data);
      console.log('Transformed data:', transformedData);
      console.log('Data passed to chart:', chartData);

    } catch (err) {
      console.error('Error fetching chart data:', err);
    } finally {
      setChartLoading(false);
    }
  }, [userSession?.id, hasInvestments, timezone]);

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