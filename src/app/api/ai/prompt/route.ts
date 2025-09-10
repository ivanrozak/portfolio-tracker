import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { generatePortfolioAnalysisPrompt, generateAggregatedPortfolioAnalysisPrompt, generateStockAnalysisPrompt } from '@/lib/ai-prompts'
import { getMultiplePrices } from '@/lib/yahoo-finance'
import { Position } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, symbol, currentPrice, useAggregated = true } = body

    let prompt = ''
    let analysisType = ''

    if (type === 'portfolio') {
      if (useAggregated) {
        // Fetch and aggregate positions directly
        const { data: positions, error } = await supabase
          .from('positions')
          .select('*')
          .eq('user_id', user.id)
          .order('purchase_date', { ascending: true })

        if (error) {
          console.error('Error fetching positions:', error)
          return NextResponse.json({ error: 'Failed to fetch positions' }, { status: 500 })
        }

        if (!positions || positions.length === 0) {
          return NextResponse.json({ error: 'No positions found' }, { status: 400 })
        }

        // Group and aggregate positions
        const symbolGroups = positions.reduce((groups: Record<string, Position[]>, position: Position) => {
          if (!groups[position.symbol]) {
            groups[position.symbol] = []
          }
          groups[position.symbol].push(position)
          return groups
        }, {})

        const aggregatedPositions = Object.entries(symbolGroups).map(([symbol, symbolPositions]) => {
          const totalQuantity = symbolPositions.reduce((sum, pos) => sum + pos.quantity, 0)
          const totalCost = symbolPositions.reduce((sum, pos) => sum + (pos.quantity * pos.purchase_price), 0)
          const averagePrice = totalCost / totalQuantity
          
          const sortedByDate = symbolPositions.sort((a, b) => 
            new Date(a.purchase_date).getTime() - new Date(b.purchase_date).getTime()
          )
          
          return {
            symbol,
            asset_type: symbolPositions[0].asset_type,
            total_quantity: totalQuantity,
            average_price: averagePrice,
            total_cost: totalCost,
            first_purchase_date: sortedByDate[0].purchase_date,
            last_purchase_date: sortedByDate[sortedByDate.length - 1].purchase_date,
            purchase_count: symbolPositions.length
          }
        })

        if (aggregatedPositions.length === 0) {
          return NextResponse.json({ error: 'No positions found' }, { status: 400 })
        }

        // Fetch current market prices
        const symbols = aggregatedPositions.map((p: any) => p.symbol)
        const marketPrices = await getMultiplePrices(symbols)
        
        // Create maps for price and currency
        const priceMap = marketPrices.reduce((acc, price) => {
          acc[price.symbol] = price.price
          return acc
        }, {} as Record<string, number>)

        const currencyMap = marketPrices.reduce((acc, price) => {
          acc[price.symbol] = price.currency
          return acc
        }, {} as Record<string, string>)

        // Enrich aggregated positions with current prices and currency
        const enrichedAggregatedPositions = aggregatedPositions.map((position: any) => ({
          ...position,
          current_price: priceMap[position.symbol] || undefined,
          currency: currencyMap[position.symbol] || 'USD'
        }))

        prompt = generateAggregatedPortfolioAnalysisPrompt(enrichedAggregatedPositions)
        analysisType = 'aggregated_portfolio_analysis'
      } else {
        // Original individual positions logic
        const { data: positions, error } = await supabase
          .from('positions')
          .select('*')
          .eq('user_id', user.id)

        if (error) {
          console.error('Error fetching positions:', error)
          return NextResponse.json({ error: 'Failed to fetch positions' }, { status: 500 })
        }

        if (!positions || positions.length === 0) {
          return NextResponse.json({ error: 'No positions found' }, { status: 400 })
        }

        // Fetch current market prices for all symbols
        const symbols = positions.map((p: Position) => p.symbol)
        const marketPrices = await getMultiplePrices(symbols)
        
        // Create a map of symbol to price
        const priceMap = marketPrices.reduce((acc, price) => {
          acc[price.symbol] = price.price
          return acc
        }, {} as Record<string, number>)

        // Enrich positions with current prices
        const enrichedPositions: Position[] = positions.map((position: Position) => ({
          ...position,
          current_price: priceMap[position.symbol] || undefined
        }))

        prompt = generatePortfolioAnalysisPrompt(enrichedPositions)
        analysisType = 'portfolio_analysis'
      }

    } else if (type === 'stock' && symbol && currentPrice) {
      prompt = generateStockAnalysisPrompt(symbol, currentPrice)
      analysisType = 'stock_analysis'
      
    } else {
      return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 })
    }

    // Save the generated prompt to database
    const { data: analysis, error: saveError } = await supabase
      .from('analyses')
      .insert({
        user_id: user.id,
        analysis_type: analysisType,
        prompt_used: prompt,
        result: '' // Will be filled when user saves the Claude response
      })
      .select()
      .single()

    if (saveError) {
      console.error('Error saving analysis prompt:', saveError)
      // Continue anyway, just log the error
    }

    return NextResponse.json({ 
      prompt,
      analysisId: analysis?.id || null
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Save analysis result
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { analysisId, result } = body

    if (!analysisId || !result) {
      return NextResponse.json({ error: 'Analysis ID and result are required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('analyses')
      .update({ result })
      .eq('id', analysisId)
      .eq('user_id', user.id) // Ensure user can only update their own analyses

    if (error) {
      console.error('Error saving analysis result:', error)
      return NextResponse.json({ error: 'Failed to save analysis result' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}