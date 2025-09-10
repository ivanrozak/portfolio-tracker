'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CurrentPosition, MarketPrice } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { RefreshCw, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react'
import { formatCurrency } from '@/lib/currency'
import TransactionForm from './TransactionForm'

interface CurrentPositionsListProps {
  refreshTrigger?: number
}

export default function CurrentPositionsList({ refreshTrigger }: CurrentPositionsListProps) {
  const [positions, setPositions] = useState<CurrentPosition[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedPosition, setSelectedPosition] = useState<CurrentPosition | null>(null)
  const [showSellDialog, setShowSellDialog] = useState(false)

  const fetchCurrentPositions = async () => {
    try {
      const response = await fetch('/api/positions/current')
      if (!response.ok) {
        throw new Error('Failed to fetch current positions')
      }
      const data = await response.json()
      setPositions(data.currentPositions || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch positions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCurrentPositions()
  }, [refreshTrigger])

  const handleSellClick = (position: CurrentPosition) => {
    setSelectedPosition(position)
    setShowSellDialog(true)
  }

  const handleTransactionSuccess = () => {
    setShowSellDialog(false)
    setSelectedPosition(null)
    fetchCurrentPositions()
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading current positions...</div>
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
          <CardTitle>Current Positions</CardTitle>
          <CardDescription>No positions found. Add your first transaction to get started.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Positions</CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                Based on transaction history with realized P&L tracking
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchCurrentPositions}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
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
                <TableHead>Unrealized P&L</TableHead>
                <TableHead>Realized P&L</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {positions.map((position) => {
                const currentPrice = position.current_price || 0
                const marketValue = position.usd_equivalent?.market_value || (currentPrice * position.current_quantity)
                const costBasis = position.usd_equivalent?.total_cost_basis || position.total_cost_basis
                const unrealizedPnl = marketValue - costBasis
                const unrealizedPnlPercent = costBasis > 0 ? (unrealizedPnl / costBasis) * 100 : 0
                const realizedPnl = position.total_realized_pnl || 0

                // Show USD equivalent if available, otherwise show original currency
                const displayCurrency = position.usd_equivalent ? 'USD' : position.currency
                const displayAvgCost = position.usd_equivalent?.average_cost || position.average_cost
                const displayCurrentPrice = position.usd_equivalent?.current_price || currentPrice

                return (
                  <TableRow key={position.symbol}>
                    <TableCell className="font-medium">
                      <div>
                        {position.symbol}
                        {position.currency !== 'USD' && (
                          <div className="text-xs text-gray-500">
                            {formatCurrency(position.current_price || 0, position.currency)}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={position.asset_type === 'stock' ? 'default' : 'secondary'}>
                        {position.asset_type}
                      </Badge>
                    </TableCell>
                    <TableCell>{position.current_quantity.toLocaleString()}</TableCell>
                    <TableCell>
                      {formatCurrency(displayAvgCost, displayCurrency)}
                      {position.currency !== 'USD' && position.usd_equivalent && (
                        <div className="text-xs text-gray-500">
                          {formatCurrency(position.average_cost, position.currency)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {displayCurrentPrice > 0 ? (
                        <div>
                          {formatCurrency(displayCurrentPrice, displayCurrency)}
                          {position.currency !== 'USD' && position.usd_equivalent && (
                            <div className="text-xs text-gray-500">
                              {formatCurrency(position.current_price || 0, position.currency)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {marketValue > 0 ? formatCurrency(marketValue, displayCurrency) : '-'}
                    </TableCell>
                    <TableCell>
                      {marketValue > 0 ? (
                        <div className={`flex flex-col ${unrealizedPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          <span>{unrealizedPnl >= 0 ? '+' : ''}{formatCurrency(Math.abs(unrealizedPnl), displayCurrency)}</span>
                          <span className="text-xs">({unrealizedPnl >= 0 ? '+' : ''}{unrealizedPnlPercent.toFixed(2)}%)</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {realizedPnl !== 0 ? (
                        <span className={realizedPnl >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {realizedPnl >= 0 ? '+' : ''}{formatCurrency(Math.abs(realizedPnl), position.currency)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSellClick(position)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Minus className="h-4 w-4 mr-1" />
                        Sell
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showSellDialog} onOpenChange={setShowSellDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sell {selectedPosition?.symbol}</DialogTitle>
          </DialogHeader>
          {selectedPosition && (
            <TransactionForm
              prefilledPosition={selectedPosition}
              onSuccess={handleTransactionSuccess}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}