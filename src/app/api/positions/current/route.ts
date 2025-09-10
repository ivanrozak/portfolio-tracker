import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getMultiplePrices } from '@/lib/yahoo-finance'
import { convertToUSD } from '@/lib/currency-conversion'
import { CurrentPosition } from '@/types'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch current positions from the view
    const { data: positions, error } = await supabase
      .from('current_positions')
      .select('*')
      .eq('user_id', user.id)
      .order('symbol', { ascending: true })

    if (error) {
      console.error('Error fetching current positions:', error)
      return NextResponse.json({ error: 'Failed to fetch current positions' }, { status: 500 })
    }

    if (!positions || positions.length === 0) {
      return NextResponse.json({ currentPositions: [] })
    }

    // Fetch current market prices
    const symbols = positions.map((p: CurrentPosition) => p.symbol)
    const marketPrices = await getMultiplePrices(symbols)
    
    // Create maps for price and currency
    const priceMap = marketPrices.reduce((acc, price) => {
      acc[price.symbol] = price
      return acc
    }, {} as Record<string, { price: number; currency: string }>)

    // Enrich positions with current prices and USD equivalents
    const enrichedPositions = await Promise.all(
      positions.map(async (position: CurrentPosition) => {
        const marketData = priceMap[position.symbol]
        const currentPrice = marketData?.price || 0
        const originalCurrency = marketData?.currency || position.currency || 'USD'

        let usd_equivalent = undefined
        
        // If the position is not in USD, calculate USD equivalents
        if (originalCurrency !== 'USD') {
          const usdPrice = currentPrice > 0 ? await convertToUSD(currentPrice, originalCurrency) : 0
          const usdAvgCost = await convertToUSD(position.average_cost, originalCurrency)
          const usdTotalCost = await convertToUSD(position.total_cost_basis, originalCurrency)
          const usdMarketValue = usdPrice * position.current_quantity

          usd_equivalent = {
            current_price: usdPrice,
            average_cost: usdAvgCost,
            total_cost_basis: usdTotalCost,
            market_value: usdMarketValue
          }
        }

        return {
          ...position,
          current_price: currentPrice,
          currency: originalCurrency,
          usd_equivalent
        }
      })
    )

    return NextResponse.json({ currentPositions: enrichedPositions })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}