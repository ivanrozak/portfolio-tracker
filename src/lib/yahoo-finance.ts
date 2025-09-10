import { MarketPrice } from '@/types'

export async function getCurrentPrice(symbol: string): Promise<MarketPrice | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Portfolio Tracker)'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    const result = data.chart.result[0]
    
    if (!result || !result.meta) {
      return null
    }
    
    const meta = result.meta
    const price = meta.regularMarketPrice || meta.previousClose
    const previousClose = meta.chartPreviousClose || meta.previousClose
    const change = price - previousClose
    const changePercent = (change / previousClose) * 100
    
    return {
      symbol: symbol.toUpperCase(),
      price,
      change,
      changePercent,
      currency: meta.currency || 'USD'
    }
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error)
    return null
  }
}

export async function getMultiplePrices(symbols: string[]): Promise<MarketPrice[]> {
  const promises = symbols.map(symbol => getCurrentPrice(symbol))
  const results = await Promise.allSettled(promises)
  
  return results
    .filter((result): result is PromiseFulfilledResult<MarketPrice> => 
      result.status === 'fulfilled' && result.value !== null
    )
    .map(result => result.value)
}