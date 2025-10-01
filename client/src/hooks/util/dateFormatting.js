export const formatDateInTimezone = (utcDate, timezone, options = {}) => {
  if (!utcDate) return 'Unknown date';
  
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  
  if (isNaN(date.getTime())) return 'Invalid date';
  
  return date.toLocaleString('en-US', {
    timeZone: timezone,
    ...options
  });
};