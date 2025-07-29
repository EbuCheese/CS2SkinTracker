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

// Formats date based on granularity and time period
export const formatChartDate = (point, granularity, selectedTimePeriod) => {
  const date = new Date(point.date);
  const isToday = date.toDateString() === new Date().toDateString();
  
  let formattedDate;
  if (granularity === 'hourly') {
    if (isToday) {
      formattedDate = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } else {
      formattedDate = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        hour12: true
      });
    }
  } else if (granularity === 'daily') {
    formattedDate = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  } else {
    formattedDate = date.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric'
    });
  }
  
  return { formattedDate, date, isToday };
};