'use client'

import { useState, useEffect, useCallback } from 'react'
import { Transaction } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { History } from 'lucide-react'
import { formatCurrency } from '@/lib/currency'

interface TransactionHistoryListProps {
  refreshTrigger?: number
}

export default function TransactionHistoryList({ refreshTrigger }: TransactionHistoryListProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'buy' | 'sell'>('all')

  const fetchTransactions = useCallback(async () => {
    try {
      const response = await fetch('/api/transactions')
      if (!response.ok) {
        throw new Error('Failed to fetch transactions')
      }
      const data = await response.json()
      setTransactions(data.transactions || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTransactions()
  }, [refreshTrigger, fetchTransactions])

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading transaction history...</div>
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

  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>No transactions found. Add your first transaction to get started.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  // Filter transactions
  const filteredTransactions = transactions.filter(t => {
    if (filterType === 'all') return true
    return t.transaction_type === filterType
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Transaction History
            </CardTitle>
            <CardDescription>
              Complete history of all buy and sell transactions
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant={filterType === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('all')}
            >
              All
            </Button>
            <Button
              variant={filterType === 'buy' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('buy')}
            >
              Buys
            </Button>
            <Button
              variant={filterType === 'sell' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('sell')}
            >
              Sells
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Symbol</TableHead>
              <TableHead>Asset Type</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Total Value</TableHead>
              <TableHead>Realized P&L</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions
              .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
              .map((transaction) => {
                const totalValue = transaction.quantity * transaction.price
                const realizedPnL = transaction.realized_pnl || 0

                return (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-medium">
                      {new Date(transaction.transaction_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={transaction.transaction_type === 'buy' ? 'default' : 'secondary'}>
                        {transaction.transaction_type.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold">{transaction.symbol}</TableCell>
                    <TableCell>
                      <Badge variant={transaction.asset_type === 'stock' ? 'outline' : 'secondary'}>
                        {transaction.asset_type}
                      </Badge>
                    </TableCell>
                    <TableCell>{transaction.quantity.toLocaleString()}</TableCell>
                    <TableCell>{formatCurrency(transaction.price, transaction.currency)}</TableCell>
                    <TableCell>
                      <div className={transaction.transaction_type === 'buy' ? 'text-blue-600' : 'text-purple-600'}>
                        {formatCurrency(totalValue, transaction.currency)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {transaction.transaction_type === 'sell' && realizedPnL !== 0 ? (
                        <div className={`flex flex-col ${realizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          <span>{realizedPnL >= 0 ? '+' : ''}{formatCurrency(Math.abs(realizedPnL), transaction.currency)}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {transaction.notes ? (
                        <span className="text-xs text-gray-600">{transaction.notes}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
          </TableBody>
        </Table>

        {/* Summary Stats */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-600">Total Transactions</div>
              <div className="text-lg font-bold">{filteredTransactions.length}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Buy Transactions</div>
              <div className="text-lg font-bold text-blue-600">
                {transactions.filter(t => t.transaction_type === 'buy').length}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Sell Transactions</div>
              <div className="text-lg font-bold text-purple-600">
                {transactions.filter(t => t.transaction_type === 'sell').length}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
