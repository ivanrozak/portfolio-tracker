import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { Position } from '@/types'

export interface AggregatedPosition {
  symbol: string;
  asset_type: 'stock' | 'crypto';
  total_quantity: number;
  average_price: number;
  total_cost: number;
  first_purchase_date: string;
  last_purchase_date: string;
  purchase_count: number;
  current_price?: number;
}

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all positions for the user
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
      return NextResponse.json({ aggregatedPositions: [] })
    }

    // Group positions by symbol and aggregate
    const symbolGroups = positions.reduce((groups: Record<string, Position[]>, position: Position) => {
      if (!groups[position.symbol]) {
        groups[position.symbol] = []
      }
      groups[position.symbol].push(position)
      return groups
    }, {})

    // Calculate aggregated positions
    const aggregatedPositions: AggregatedPosition[] = Object.entries(symbolGroups).map(([symbol, symbolPositions]) => {
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

    return NextResponse.json({ aggregatedPositions })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}