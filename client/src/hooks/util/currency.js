// Currency conversion rates - update these regularly via API
const EXCHANGE_RATES = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  CAD: 1.36,
  AUD: 1.52,
  CNY: 7.24,
  JPY: 149.50,
  KRW: 1318.50,
  RUB: 92.50,
  BRL: 4.97
};

// Currency symbols and formatting
export const CURRENCY_CONFIG = {
  USD: { symbol: '$', name: 'US Dollar', decimals: 2, position: 'before' },
  EUR: { symbol: '€', name: 'Euro', decimals: 2, position: 'before' },
  GBP: { symbol: '£', name: 'British Pound', decimals: 2, position: 'before' },
  CAD: { symbol: 'CA$', name: 'Canadian Dollar', decimals: 2, position: 'before' },
  AUD: { symbol: 'A$', name: 'Australian Dollar', decimals: 2, position: 'before' },
  CNY: { symbol: '¥', name: 'Chinese Yuan', decimals: 2, position: 'before' },
  JPY: { symbol: '¥', name: 'Japanese Yen', decimals: 0, position: 'before' },
  KRW: { symbol: '₩', name: 'South Korean Won', decimals: 0, position: 'before' },
  RUB: { symbol: '₽', name: 'Russian Ruble', decimals: 2, position: 'after' },
  BRL: { symbol: 'R$', name: 'Brazilian Real', decimals: 2, position: 'before' }
};

/**
 * Get current exchange rate for a currency
 */
export const getExchangeRate = (currency = 'USD') => {
  return EXCHANGE_RATES[currency] || 1;
};

/**
 * Convert USD to target currency
 */
export const convertCurrency = (usdAmount, targetCurrency = 'USD') => {
  if (!usdAmount || isNaN(usdAmount)) return 0;
  const rate = EXCHANGE_RATES[targetCurrency] || 1;
  return usdAmount * rate;
};

/**
 * Format currency value with proper symbol and decimals
 */
export const formatCurrency = (amount, currency = 'USD', options = {}) => {
  const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.USD;
  const { 
    showSymbol = true, 
    showCode = false,
    compact = false 
  } = options;
  
  // Handle compact notation (K, M, B)
  if (compact && Math.abs(amount) >= 1000) {
    const tier = Math.floor(Math.log10(Math.abs(amount)) / 3);
    const suffix = ['', 'K', 'M', 'B', 'T'][tier];
    const scaled = amount / Math.pow(1000, tier);
    const formatted = scaled.toFixed(scaled >= 100 ? 0 : 1);
    
    if (showSymbol && config.position === 'before') {
      return `${config.symbol}${formatted}${suffix}`;
    } else if (showSymbol && config.position === 'after') {
      return `${formatted}${suffix} ${config.symbol}`;
    }
    return `${formatted}${suffix}`;
  }
  
  // Standard formatting
  const formatted = amount.toFixed(config.decimals);
  const withCommas = formatted.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  if (showCode) {
    return `${withCommas} ${currency}`;
  }
  
  if (showSymbol) {
    return config.position === 'before' 
      ? `${config.symbol}${withCommas}`
      : `${withCommas} ${config.symbol}`;
  }
  
  return withCommas;
};

/**
 * Convert and format in one step
 */
export const convertAndFormat = (usdAmount, targetCurrency = 'USD', options = {}) => {
  const converted = convertCurrency(usdAmount, targetCurrency);
  return formatCurrency(converted, targetCurrency, options);
};

/**
 * Fetch latest exchange rates (call this periodically)
 */
export const updateExchangeRates = async () => {
  try {
    // Use a free API like exchangerate-api.com or fixer.io
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    const data = await response.json();
    
    // Update rates
    Object.keys(EXCHANGE_RATES).forEach(currency => {
      if (data.rates[currency]) {
        EXCHANGE_RATES[currency] = data.rates[currency];
      }
    });
    
    // Store in sessionStorage with timestamp
    sessionStorage.setItem('exchange_rates', JSON.stringify({
      rates: EXCHANGE_RATES,
      updated: Date.now()
    }));
    
    return true;
  } catch (error) {
    console.error('Failed to update exchange rates:', error);
    return false;
  }
};

/**
 * Load rates from storage or fetch if stale
 */
export const ensureFreshRates = async () => {
  const stored = sessionStorage.getItem('exchange_rates');
  
  if (stored) {
    try {
      const { rates, updated } = JSON.parse(stored);
      const hoursSinceUpdate = (Date.now() - updated) / (1000 * 60 * 60);
      
      // Update if older than 1 hour
      if (hoursSinceUpdate < 1) {
        Object.assign(EXCHANGE_RATES, rates);
        return true;
      }
    } catch (e) {
      console.error('Failed to parse stored rates:', e);
    }
  }
  
  return await updateExchangeRates();
};

/**
 * Convert user's input currency to USD for storage
 */
export const convertToUSD = (amount, fromCurrency) => {
  if (fromCurrency === 'USD') return amount;
  
  const rate = getExchangeRate(fromCurrency);
  if (!rate || rate === 0) {
    console.error(`Invalid exchange rate for ${fromCurrency}`);
    return amount; // Fallback to original amount
  }
  
  // Divide by rate to get USD (e.g., 100 EUR / 1.087 = $91.95 USD)
  return amount / rate;
};

/**
 * Convert USD from storage to user's display currency
 */
export const convertFromUSD = (usdAmount, toCurrency) => {
  if (toCurrency === 'USD') return usdAmount;
  
  const rate = getExchangeRate(toCurrency);
  return usdAmount * rate;
};