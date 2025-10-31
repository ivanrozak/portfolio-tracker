import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { generatePortfolioAnalysisPrompt, generateAggregatedPortfolioAnalysisPrompt, generateStockAnalysisPrompt, generateIndonesianBulkReportPrompt, generatePortfolioResumeOnly } from '@/lib/ai-prompts'
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
    const { type, symbol, currentPrice, useAggregated = true, useIndonesian = false, resumeOnly = false } = body

    let prompt = ''
    let analysisType = ''

    if (type === 'portfolio') {
      if (useAggregated) {
        // Use the aggregated positions API endpoint (no duplicate logic)
        const { data: aggregatedPositions, error } = await supabase
          .from('current_positions')
          .select('*')
          .eq('user_id', user.id)
          .order('last_transaction_date', { ascending: false })

        if (error) {
          console.error('Error fetching aggregated positions:', error)
          return NextResponse.json({ error: 'Failed to fetch positions' }, { status: 500 })
        }

        if (!aggregatedPositions || aggregatedPositions.length === 0) {
          return NextResponse.json({ error: 'No positions found' }, { status: 400 })
        }

        // Fetch current market prices
        const symbols = aggregatedPositions.map((p: { symbol: string }) => p.symbol)
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

        // Map current_positions to AggregatedPosition format for AI prompts
        const enrichedAggregatedPositions = aggregatedPositions.map(position => ({
          symbol: position.symbol,
          asset_type: position.asset_type,
          total_quantity: position.current_quantity,
          average_price: position.average_cost,
          total_cost: position.total_cost_basis,
          first_purchase_date: position.first_purchase_date,
          last_purchase_date: position.last_transaction_date,
          purchase_count: position.transaction_count,
          current_price: priceMap[position.symbol] || undefined,
          currency: position.currency || currencyMap[position.symbol] || 'USD',
          total_realized_pnl: position.total_realized_pnl
        }))

        if (resumeOnly) {
          prompt = generatePortfolioResumeOnly(enrichedAggregatedPositions)
          analysisType = 'portfolio_resume_only'
        } else if (useIndonesian) {
          prompt = generateIndonesianBulkReportPrompt(enrichedAggregatedPositions)
          analysisType = 'indonesian_bulk_report'
        } else {
          prompt = generateAggregatedPortfolioAnalysisPrompt(enrichedAggregatedPositions)
          analysisType = 'aggregated_portfolio_analysis'
        }
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