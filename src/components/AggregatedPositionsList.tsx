'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AggregatedPosition, MarketPrice } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, TrendingUp, TrendingDown, Info } from 'lucide-react'
import { formatCurrency } from '@/lib/currency'

interface AggregatedPositionsListProps {
  refreshTrigger?: number
}

export default function AggregatedPositionsList({ refreshTrigger }: AggregatedPositionsListProps) {
  const [positions, setPositions] = useState<AggregatedPosition[]>([])
  const [prices, setPrices] = useState<Record<string, MarketPrice>>({})
  const [loading, setLoading] = useState(true)
  const [pricesLoading, setPricesLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchAggregatedPositions = async () => {
    try {
      const response = await fetch('/api/positions/aggregated')
      if (!response.ok) {
        throw new Error('Failed to fetch aggregated positions')
      }
      const data = await response.json()
      setPositions(data.aggregatedPositions || [])
      
      // Fetch current prices for all symbols
      if (data.aggregatedPositions && data.aggregatedPositions.length > 0) {
        fetchPrices(data.aggregatedPositions.map((p: AggregatedPosition) => p.symbol))
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

  useEffect(() => {
    fetchAggregatedPositions()
  }, [refreshTrigger])

  const refreshPrices = () => {
    const symbols = positions.map(p => p.symbol)
    fetchPrices(symbols)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading aggregated positions...</div>
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
          <CardTitle>Your Portfolio (Aggregated)</CardTitle>
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
            <CardTitle>Your Portfolio (Aggregated View)</CardTitle>
            <CardDescription className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              Multiple purchases of the same symbol are combined with average cost
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
              <TableHead>Total Qty</TableHead>
              <TableHead>Avg Cost</TableHead>
              <TableHead>Current Price</TableHead>
              <TableHead>Market Value</TableHead>
              <TableHead>P&L</TableHead>
              <TableHead>Purchases</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {positions.map((position) => {
              const marketPrice = prices[position.symbol]
              const currentPrice = marketPrice?.price || 0
              const currency = marketPrice?.currency || 'USD'
              const marketValue = currentPrice * position.total_quantity
              const costBasis = position.total_cost
              const pnl = marketValue - costBasis
              const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0

              return (
                <TableRow key={position.symbol}>
                  <TableCell className="font-medium">{position.symbol}</TableCell>
                  <TableCell>
                    <Badge variant={position.asset_type === 'stock' ? 'default' : 'secondary'}>
                      {position.asset_type}
                    </Badge>
                  </TableCell>
                  <TableCell>{position.total_quantity.toLocaleString()}</TableCell>
                  <TableCell>{formatCurrency(position.average_price, currency)}</TableCell>
                  <TableCell>
                    {currentPrice > 0 ? (
                      <div className="flex items-center gap-1">
                        {formatCurrency(currentPrice, currency)}
                        {marketPrice && (
                          <span className={`text-xs flex items-center ${
                            marketPrice.changePercent >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {marketPrice.changePercent >= 0 ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            {Math.abs(marketPrice.changePercent).toFixed(2)}%
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {marketValue > 0 ? formatCurrency(marketValue, currency) : '-'}
                  </TableCell>
                  <TableCell>
                    {marketValue > 0 ? (
                      <div className={`flex flex-col ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        <span>{pnl >= 0 ? '+' : ''}{formatCurrency(Math.abs(pnl), currency)}</span>
                        <span className="text-xs">({pnl >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%)</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{position.purchase_count} purchase{position.purchase_count > 1 ? 's' : ''}</div>
                      <div className="text-xs text-gray-500">
                        {position.first_purchase_date === position.last_purchase_date 
                          ? position.first_purchase_date
                          : `${position.first_purchase_date} - ${position.last_purchase_date}`
                        }
                      </div>
                    </div>
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