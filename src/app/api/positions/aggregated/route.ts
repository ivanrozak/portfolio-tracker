import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { CurrentPosition, AggregatedPosition } from '@/types'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch from current_positions view (already aggregated by database)
    const { data: currentPositions, error } = await supabase
      .from('current_positions')
      .select('*')
      .eq('user_id', user.id)
      .order('last_transaction_date', { ascending: false })

    if (error) {
      console.error('Error fetching current positions:', error)
      return NextResponse.json({ error: 'Failed to fetch positions' }, { status: 500 })
    }

    if (!currentPositions || currentPositions.length === 0) {
      return NextResponse.json({ aggregatedPositions: [] })
    }

    // Map CurrentPosition to AggregatedPosition format
    const aggregatedPositions: AggregatedPosition[] = currentPositions.map((pos: CurrentPosition) => ({
      symbol: pos.symbol,
      asset_type: pos.asset_type,
      total_quantity: pos.current_quantity,
      average_price: pos.average_cost,
      total_cost: pos.total_cost_basis,
      first_purchase_date: pos.first_purchase_date,
      last_purchase_date: pos.last_transaction_date,
      purchase_count: pos.transaction_count,
      currency: pos.currency,
      total_realized_pnl: pos.total_realized_pnl,
      current_price: pos.current_price
    }))

    return NextResponse.json({ aggregatedPositions })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}