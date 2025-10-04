// Shared utility functions for chart logic

// Formats numeric price values as USD currency
export const formatPrice = (price) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(price);
};

// Available time periods for chart display
export const timePeriods = [
  { label: '1D', value: '1D' },
  { label: '5D', value: '5D' },
  { label: '1M', value: '1M' },
  { label: '6M', value: '6M' },
  { label: 'YTD', value: 'YTD' },
  { label: '1Y', value: '1Y' },
  { label: '5Y', value: '5Y' },
  { label: 'MAX', value: 'MAX' }
];

// Formats date based on granularity, time period, and user's timezone
export const formatChartDate = (point, granularity, selectedTimePeriod, timezone = 'UTC') => {
  const date = new Date(point.date);
  
  // Check if date is today in user's timezone
  const now = new Date();
  const todayInUserTz = now.toLocaleDateString('en-US', { timeZone: timezone });
  const dateInUserTz = date.toLocaleDateString('en-US', { timeZone: timezone });
  const isToday = todayInUserTz === dateInUserTz;
 
  let formattedDate;
  const options = { timeZone: timezone };
  
  if (granularity === 'hourly') {
    if (isToday) {
      // Today's hourly data: show just time
      formattedDate = date.toLocaleTimeString('en-US', {
        ...options,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } else {
      // Past hourly data: show date + time
      formattedDate = date.toLocaleDateString('en-US', {
        ...options,
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        hour12: true
      });
    }
  } else if (granularity === 'daily') {
    formattedDate = date.toLocaleDateString('en-US', {
      ...options,
      month: 'short',
      day: 'numeric'
    });
  } else { // monthly
    formattedDate = date.toLocaleDateString('en-US', {
      ...options,
      month: 'short',
      year: 'numeric'
    });
  }
 
  return { formattedDate, date, isToday };
};