import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getCurrentPrice } from '@/lib/yahoo-finance'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch transactions
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching transactions:', error)
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
    }

    return NextResponse.json({ transactions: transactions || [] })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { symbol, transaction_type, quantity, price, asset_type, transaction_date, currency = 'USD', notes } = body

    // Validate required fields
    if (!symbol || !transaction_type || !quantity || !price || !asset_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!['buy', 'sell'].includes(transaction_type)) {
      return NextResponse.json({ error: 'Invalid transaction type' }, { status: 400 })
    }

    let realized_pnl = 0

    // For sell transactions, calculate realized P&L
    if (transaction_type === 'sell') {
      // Get current position to calculate average cost
      const { data: currentPositions, error: posError } = await supabase
        .from('current_positions')
        .select('*')
        .eq('user_id', user.id)
        .eq('symbol', symbol.toUpperCase())
        .single()

      if (posError || !currentPositions) {
        return NextResponse.json({ error: 'Position not found for sell transaction' }, { status: 400 })
      }

      if (currentPositions.current_quantity < quantity) {
        return NextResponse.json({ error: 'Insufficient shares to sell' }, { status: 400 })
      }

      // Calculate realized P&L: (sell_price - avg_cost) * quantity
      realized_pnl = (price - currentPositions.average_cost) * quantity
    }

    // Insert transaction
    const { data: transaction, error } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        symbol: symbol.toUpperCase(),
        transaction_type,
        quantity: parseFloat(quantity),
        price: parseFloat(price),
        asset_type,
        currency,
        transaction_date: transaction_date || new Date().toISOString().split('T')[0],
        realized_pnl: transaction_type === 'sell' ? realized_pnl : 0,
        notes: notes || null
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating transaction:', error)
      return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 })
    }

    return NextResponse.json({ transaction }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}