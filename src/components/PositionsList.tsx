'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Position, MarketPrice } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Trash2, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react'

interface PositionsListProps {
  refreshTrigger?: number
}

export default function PositionsList({ refreshTrigger }: PositionsListProps) {
  const [positions, setPositions] = useState<Position[]>([])
  const [prices, setPrices] = useState<Record<string, MarketPrice>>({})
  const [loading, setLoading] = useState(true)
  const [pricesLoading, setPricesLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const fetchPositions = async () => {
    try {
      const response = await fetch('/api/positions')
      if (!response.ok) {
        throw new Error('Failed to fetch positions')
      }
      const data = await response.json()
      setPositions(data.positions || [])
      
      // Fetch current prices for all symbols
      if (data.positions && data.positions.length > 0) {
        fetchPrices(data.positions.map((p: Position) => p.symbol))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch positions')
    } finally {
      setLoading(false)
    }
  }

  const fetchPrices = async (symbols: string[]) => {
    if (symbols.length === 0) return
    
    setPricesLoading(true)
    try {
      const response = await fetch(`/api/market/prices?symbols=${symbols.join(',')}`)
      if (response.ok) {
        const data = await response.json()
        const pricesMap: Record<string, MarketPrice> = {}
        data.prices?.forEach((price: MarketPrice) => {
          pricesMap[price.symbol] = price
        })
        setPrices(pricesMap)
      }
    } catch (err) {
      console.error('Failed to fetch prices:', err)
    } finally {
      setPricesLoading(false)
    }
  }

  const deletePosition = async (id: string) => {
    if (!confirm('Are you sure you want to delete this position?')) return

    try {
      const response = await fetch(`/api/positions?id=${id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete position')
      }
      
      setPositions(prev => prev.filter(p => p.id !== id))
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete position')
    }
  }

  useEffect(() => {
    fetchPositions()
  }, [refreshTrigger])

  const refreshPrices = () => {
    const symbols = positions.map(p => p.symbol)
    fetchPrices(symbols)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading positions...</div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">{error}</div>
        </CardContent>
      </Card>
    )
  }

  if (positions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Positions</CardTitle>
          <CardDescription>No positions found. Add your first position to get started.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Your Positions</CardTitle>
            <CardDescription>
              Manage your stock and cryptocurrency positions
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshPrices}
            disabled={pricesLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${pricesLoading ? 'animate-spin' : ''}`} />
            Refresh Prices
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Avg Cost</TableHead>
              <TableHead>Current Price</TableHead>
              <TableHead>Market Value</TableHead>
              <TableHead>P&L</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {positions.map((position) => {
              const currentPrice = prices[position.symbol]?.price || 0
              const marketValue = currentPrice * position.quantity
              const costBasis = position.purchase_price * position.quantity
              const pnl = marketValue - costBasis
              const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0

              return (
                <TableRow key={position.id}>
                  <TableCell className="font-medium">{position.symbol}</TableCell>
                  <TableCell>
                    <Badge variant={position.asset_type === 'stock' ? 'default' : 'secondary'}>
                      {position.asset_type}
                    </Badge>
                  </TableCell>
                  <TableCell>{position.quantity}</TableCell>
                  <TableCell>${position.purchase_price.toFixed(2)}</TableCell>
                  <TableCell>
                    {currentPrice > 0 ? (
                      <div className="flex items-center gap-1">
                        ${currentPrice.toFixed(2)}
                        {prices[position.symbol] && (
                          <span className={`text-xs flex items-center ${
                            prices[position.symbol].changePercent >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {prices[position.symbol].changePercent >= 0 ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            {Math.abs(prices[position.symbol].changePercent).toFixed(2)}%
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {marketValue > 0 ? `$${marketValue.toFixed(2)}` : '-'}
                  </TableCell>
                  <TableCell>
                    {marketValue > 0 ? (
                      <div className={`flex flex-col ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        <span>{pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}</span>
                        <span className="text-xs">({pnl >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%)</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deletePosition(position.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}