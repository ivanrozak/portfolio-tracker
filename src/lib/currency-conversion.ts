import { createServerSupabaseClient } from './supabase-server'

// Simple exchange rate cache to avoid frequent API calls
const exchangeRateCache = new Map<string, { rate: number; timestamp: number }>()
const CACHE_TTL = 10 * 60 * 1000 // 10 minutes cache for exchange rates

// Free Exchange Rate API (no API key required)
const EXCHANGE_API_BASE = 'https://api.exchangerate-api.com/v4/latest'

// Fetch real-time exchange rate from API
async function fetchRealtimeExchangeRate(fromCurrency: string, toCurrency: string): Promise<number | null> {
  try {
    const response = await fetch(`${EXCHANGE_API_BASE}/${fromCurrency}`, {
      headers: {
        'User-Agent': 'Portfolio-Tracker/1.0'
      }
    })

    if (!response.ok) {
      throw new Error(`Exchange API error: ${response.status}`)
    }

    const data = await response.json()
    
    if (data.rates && data.rates[toCurrency]) {
      return data.rates[toCurrency]
    }

    return null
  } catch (error) {
    console.error(`Error fetching exchange rate from API for ${fromCurrency}-${toCurrency}:`, error)
    return null
  }
}

export async function getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
  if (fromCurrency === toCurrency) return 1

  const cacheKey = `${fromCurrency}-${toCurrency}`
  const cached = exchangeRateCache.get(cacheKey)
  
  // Return cached rate if still valid
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.rate
  }

  // Try to fetch real-time rate first
  const realtimeRate = await fetchRealtimeExchangeRate(fromCurrency, toCurrency)
  
  if (realtimeRate) {
    // Cache the new rate
    exchangeRateCache.set(cacheKey, { rate: realtimeRate, timestamp: Date.now() })
    
    // Save to database for backup
    try {
      await updateExchangeRateInDB(fromCurrency, toCurrency, realtimeRate, 'exchangerate-api')
    } catch (error) {
      console.error('Failed to save exchange rate to DB:', error)
    }
    
    return realtimeRate
  }

  // Fallback to database
  try {
    const supabase = await createServerSupabaseClient()
    
    const { data, error } = await supabase
      .from('exchange_rates')
      .select('rate')
      .eq('from_currency', fromCurrency)
      .eq('to_currency', toCurrency)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!error && data) {
      const rate = data.rate
      exchangeRateCache.set(cacheKey, { rate, timestamp: Date.now() })
      return rate
    }
  } catch (error) {
    console.error('Error fetching exchange rate from DB:', error)
  }

  // Final fallback to static rates (updated with current market rates)
  const fallbackRates: Record<string, number> = {
    'IDR-USD': 0.000061, // ~16,460 IDR = 1 USD (current market rate as of Sep 2025)
    'USD-IDR': 16460,
  }
  
  const rate = fallbackRates[cacheKey] || 1
  exchangeRateCache.set(cacheKey, { rate, timestamp: Date.now() })
  return rate
}

export async function convertCurrency(
  amount: number, 
  fromCurrency: string, 
  toCurrency: string = 'USD'
): Promise<number> {
  const rate = await getExchangeRate(fromCurrency, toCurrency)
  return amount * rate
}

export async function convertToUSD(amount: number, currency: string): Promise<number> {
  return convertCurrency(amount, currency, 'USD')
}

// Get current exchange rate for display
export function getDisplayExchangeRate(fromCurrency: string, toCurrency: string = 'USD'): number {
  if (fromCurrency === toCurrency) return 1
  
  const cacheKey = `${fromCurrency}-${toCurrency}`
  const cached = exchangeRateCache.get(cacheKey)
  
  if (cached) return cached.rate
  
  // Fallback rates for display
  const fallbackRates: Record<string, number> = {
    'IDR-USD': 0.000066,
    'USD-IDR': 15000,
  }
  
  return fallbackRates[cacheKey] || 1
}

// Internal function to save exchange rate to database
async function updateExchangeRateInDB(
  fromCurrency: string, 
  toCurrency: string, 
  rate: number,
  source: string = 'api'
): Promise<void> {
  const supabase = await createServerSupabaseClient()
  
  await supabase
    .from('exchange_rates')
    .insert({
      from_currency: fromCurrency,
      to_currency: toCurrency,
      rate,
      source,
      date: new Date().toISOString().split('T')[0]
    })
}

// Public function to manually update exchange rate (for admin use)
export async function updateExchangeRate(
  fromCurrency: string, 
  toCurrency: string, 
  rate: number,
  source: string = 'manual'
): Promise<void> {
  try {
    await updateExchangeRateInDB(fromCurrency, toCurrency, rate, source)
    
    // Update cache
    const cacheKey = `${fromCurrency}-${toCurrency}`
    exchangeRateCache.set(cacheKey, { rate, timestamp: Date.now() })
    
  } catch (error) {
    console.error('Error updating exchange rate:', error)
    throw error
  }
}