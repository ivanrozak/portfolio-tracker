import { NextRequest, NextResponse } from 'next/server'
import { getMultiplePrices, getCurrentPrice } from '@/lib/yahoo-finance'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbolsParam = searchParams.get('symbols')
    const symbol = searchParams.get('symbol')

    if (!symbolsParam && !symbol) {
      return NextResponse.json({ error: 'Either symbols or symbol parameter is required' }, { status: 400 })
    }

    if (symbol) {
      // Single symbol request
      const price = await getCurrentPrice(symbol)
      if (!price) {
        return NextResponse.json({ error: 'Failed to fetch price data' }, { status: 404 })
      }
      return NextResponse.json({ price })
    }

    if (symbolsParam) {
      // Multiple symbols request
      const symbols = symbolsParam.split(',').map(s => s.trim().toUpperCase())
      
      if (symbols.length > 20) {
        return NextResponse.json({ error: 'Too many symbols (max 20)' }, { status: 400 })
      }

      const prices = await getMultiplePrices(symbols)
      return NextResponse.json({ prices })
    }

  } catch (error) {
    console.error('Error fetching market prices:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}