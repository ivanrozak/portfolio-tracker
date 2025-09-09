import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { Position } from '@/types'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch positions
    const { data: positions, error } = await supabase
      .from('positions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching positions:', error)
      return NextResponse.json({ error: 'Failed to fetch positions' }, { status: 500 })
    }

    return NextResponse.json({ positions: positions || [] })
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
    const { symbol, quantity, purchase_price, asset_type, purchase_date } = body

    // Validate required fields
    if (!symbol || !quantity || !purchase_price || !asset_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Insert position
    const { data: position, error } = await supabase
      .from('positions')
      .insert({
        user_id: user.id,
        symbol: symbol.toUpperCase(),
        quantity: parseFloat(quantity),
        purchase_price: parseFloat(purchase_price),
        asset_type,
        purchase_date: purchase_date || new Date().toISOString().split('T')[0]
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating position:', error)
      return NextResponse.json({ error: 'Failed to create position' }, { status: 500 })
    }

    return NextResponse.json({ position }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Position ID is required' }, { status: 400 })
    }

    // Delete position
    const { error } = await supabase
      .from('positions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id) // Ensure user can only delete their own positions

    if (error) {
      console.error('Error deleting position:', error)
      return NextResponse.json({ error: 'Failed to delete position' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}