export function formatCurrency(amount: number, currency: string = 'USD'): string {
  const currencyMap: Record<string, { symbol: string; decimals: number }> = {
    'USD': { symbol: '$', decimals: 2 },
    'IDR': { symbol: 'Rp', decimals: 0 }, // Indonesian Rupiah
    'EUR': { symbol: '€', decimals: 2 },
    'GBP': { symbol: '£', decimals: 2 },
    'JPY': { symbol: '¥', decimals: 0 },
  };

  const config = currencyMap[currency] || { symbol: currency, decimals: 2 };
  
  // Format with appropriate decimals
  const formatted = amount.toFixed(config.decimals);
  
  // Add thousand separators
  const parts = formatted.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  return `${config.symbol}${parts.join('.')}`;
}

export function getCurrencyDecimals(currency: string): number {
  const currencyMap: Record<string, number> = {
    'USD': 2,
    'IDR': 0,
    'EUR': 2,
    'GBP': 2,
    'JPY': 0,
  };
  
  return currencyMap[currency] || 2;
}