'use client'

import { useState, useEffect } from 'react'
import { CurrentPosition } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { RefreshCw, Minus, Info } from 'lucide-react'
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg sm:text-xl">Current Positions</CardTitle>
              <CardDescription className="flex items-center gap-2 text-xs sm:text-sm">
                <Info className="h-3 w-3 sm:h-4 sm:w-4" />
                Based on transaction history with realized P&L tracking
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchCurrentPositions}
              disabled={loading}
              className="text-xs sm:text-sm"
            >
              <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm">Symbol</TableHead>
                  <TableHead className="text-xs sm:text-sm">Type</TableHead>
                  <TableHead className="text-xs sm:text-sm">Quantity</TableHead>
                  <TableHead className="text-xs sm:text-sm">Avg Cost</TableHead>
                  <TableHead className="text-xs sm:text-sm">Current Price</TableHead>
                  <TableHead className="text-xs sm:text-sm">Market Value</TableHead>
                  <TableHead className="text-xs sm:text-sm">Unrealized P&L</TableHead>
                  <TableHead className="text-xs sm:text-sm">Realized P&L</TableHead>
                  <TableHead className="text-xs sm:text-sm">Actions</TableHead>
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
                        <span className="text-xs sm:text-sm font-medium">{position.symbol}</span>
                        {position.currency !== 'USD' && (
                          <div className="text-xs text-gray-500">
                            {formatCurrency(position.current_price || 0, position.currency)}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={position.asset_type === 'stock' ? 'default' : 'secondary'} className="text-xs">
                        {position.asset_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm">{position.current_quantity.toLocaleString()}</TableCell>
                    <TableCell className="text-xs sm:text-sm">
                      {formatCurrency(displayAvgCost, displayCurrency)}
                      {position.currency !== 'USD' && position.usd_equivalent && (
                        <div className="text-xs text-gray-500">
                          {formatCurrency(position.average_cost, position.currency)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm">
                      {displayCurrentPrice > 0 ? (
                        <div>
                          <span className="text-xs sm:text-sm">{formatCurrency(displayCurrentPrice, displayCurrency)}</span>
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
                    <TableCell className="text-xs sm:text-sm">
                      {marketValue > 0 ? formatCurrency(marketValue, displayCurrency) : '-'}
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm">
                      {marketValue > 0 ? (
                        <div className={`flex flex-col ${unrealizedPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          <span className="text-xs sm:text-sm">{unrealizedPnl >= 0 ? '+' : ''}{formatCurrency(Math.abs(unrealizedPnl), displayCurrency)}</span>
                          <span className="text-xs">({unrealizedPnl >= 0 ? '+' : ''}{unrealizedPnlPercent.toFixed(2)}%)</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm">
                      {realizedPnl !== 0 ? (
                        <span className={`text-xs sm:text-sm ${realizedPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs sm:text-sm"
                      >
                        <Minus className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                        <span className="hidden sm:inline">Sell</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
            </Table>
          </div>
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