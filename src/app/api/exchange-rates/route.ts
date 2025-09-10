import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getExchangeRate, updateExchangeRate } from '@/lib/currency-conversion'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    // If specific currency pair requested
    if (from && to) {
      const rate = await getExchangeRate(from, to)
      return NextResponse.json({
        from_currency: from,
        to_currency: to,
        rate,
        timestamp: new Date().toISOString()
      })
    }

    // Otherwise return all recent rates from database
    const supabase = await createServerSupabaseClient()
    
    const { data: rates, error } = await supabase
      .from('exchange_rates')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('Error fetching exchange rates:', error)
      return NextResponse.json({ error: 'Failed to fetch exchange rates' }, { status: 500 })
    }

    return NextResponse.json({ rates: rates || [] })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Check if user is authenticated (basic security)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, from_currency, to_currency, rate } = body

    if (action === 'refresh') {
      // Refresh common currency pairs
      const currencyPairs = [
        ['USD', 'IDR'],
        ['IDR', 'USD'],
      ]

      const results = []
      for (const [from, to] of currencyPairs) {
        try {
          const currentRate = await getExchangeRate(from, to)
          results.push({
            from_currency: from,
            to_currency: to,
            rate: currentRate,
            status: 'updated'
          })
        } catch (error) {
          results.push({
            from_currency: from,
            to_currency: to,
            error: error instanceof Error ? error.message : 'Failed to update',
            status: 'error'
          })
        }
      }

      return NextResponse.json({ 
        message: 'Exchange rates refreshed',
        results
      })
    }

    if (action === 'update' && from_currency && to_currency && rate) {
      await updateExchangeRate(from_currency, to_currency, parseFloat(rate), 'manual')
      
      return NextResponse.json({ 
        message: 'Exchange rate updated successfully',
        from_currency,
        to_currency,
        rate: parseFloat(rate)
      })
    }

    return NextResponse.json({ error: 'Invalid action or missing parameters' }, { status: 400 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}