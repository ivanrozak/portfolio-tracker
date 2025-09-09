import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { generatePortfolioAnalysisPrompt, generateStockAnalysisPrompt } from '@/lib/ai-prompts'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, symbol, currentPrice } = body

    let prompt = ''
    let analysisType = ''

    if (type === 'portfolio') {
      // Fetch user's positions
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

      prompt = generatePortfolioAnalysisPrompt(positions)
      analysisType = 'portfolio_analysis'

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