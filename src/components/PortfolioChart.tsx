'use client'

import { useState, useEffect } from 'react'
import { CurrentPosition, Transaction } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Legend } from 'recharts'
import { formatCurrency } from '@/lib/currency'

interface PortfolioChartProps {
  refreshTrigger?: number
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c']

export default function PortfolioChart({ refreshTrigger }: PortfolioChartProps) {
  const [positions, setPositions] = useState<CurrentPosition[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [chartType, setChartType] = useState<'allocation' | 'performance' | 'timeline'>('allocation')

  useEffect(() => {
    fetchData()
  }, [refreshTrigger])

  const fetchData = async () => {
    try {
      // Fetch current positions (based on transactions)
      const positionsResponse = await fetch('/api/positions/current')
      if (!positionsResponse.ok) return
      
      const positionsData = await positionsResponse.json()
      const fetchedPositions: CurrentPosition[] = positionsData.currentPositions || []
      setPositions(fetchedPositions)

      // Fetch transactions for timeline chart
      const transactionsResponse = await fetch('/api/transactions')
      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json()
        setTransactions(transactionsData.transactions || [])
      }
      
      if (fetchedPositions.length === 0) {
        setLoading(false)
        return
      }

      // Prices are already included in current positions
      // Current positions already include current prices, so no need to fetch separately

    } catch (err) {
      console.error('Failed to fetch data for charts:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (positions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Charts</CardTitle>
          <CardDescription>
            Charts will appear here once you add some positions
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  // Prepare data for allocation pie chart (always in USD)
  const allocationData = positions
    .map(position => {
      const marketValue = position.usd_equivalent 
        ? position.usd_equivalent.market_value 
        : (position.current_price || 0) * position.current_quantity
      
      return {
        name: position.symbol,
        value: marketValue,
        type: position.asset_type,
        currency: position.currency,
        originalValue: (position.current_price || 0) * position.current_quantity
      }
    })
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value)

  // Prepare data for performance bar chart (in USD)
  const performanceData = positions
    .map(position => {
      const marketValue = position.usd_equivalent 
        ? position.usd_equivalent.market_value 
        : (position.current_price || 0) * position.current_quantity
      
      const costBasis = position.usd_equivalent 
        ? position.usd_equivalent.total_cost_basis 
        : position.total_cost_basis
      
      const pnl = marketValue - costBasis
      const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0
      const realizedPnL = position.total_realized_pnl || 0

      return {
        symbol: position.symbol,
        pnl: pnl,
        pnlPercent: pnlPercent,
        realizedPnL: realizedPnL,
        marketValue: marketValue,
        currency: position.currency
      }
    })
    .filter(item => item.marketValue > 0)
    .sort((a, b) => b.pnlPercent - a.pnlPercent)

  // Prepare timeline data - show cumulative values over time
  const sortedTransactions = transactions.sort((a, b) =>
    new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
  )

  let cumulativeInvested = 0
  let cumulativeRealized = 0
  const cumulativeShares: Record<string, number> = {}

  const timelineData = sortedTransactions.map((transaction, index) => {
    // Track cumulative investment (money put in)
    if (transaction.transaction_type === 'buy') {
      cumulativeInvested += transaction.quantity * transaction.price
    }

    // Track cumulative realized P&L (profit/loss from sells)
    if (transaction.transaction_type === 'sell') {
      cumulativeRealized += transaction.realized_pnl || 0
    }

    // Track shares owned over time (for portfolio value calculation)
    if (!cumulativeShares[transaction.symbol]) {
      cumulativeShares[transaction.symbol] = 0
    }
    if (transaction.transaction_type === 'buy') {
      cumulativeShares[transaction.symbol] += transaction.quantity
    } else {
      cumulativeShares[transaction.symbol] -= transaction.quantity
    }

    return {
      date: transaction.transaction_date,
      dateLabel: new Date(transaction.transaction_date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: new Date(transaction.transaction_date).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
      }),
      cumulativeInvested,
      cumulativeRealized,
      netInvested: cumulativeInvested - Math.abs(cumulativeRealized < 0 ? cumulativeRealized : 0), // Net money in the market
      transactionType: transaction.transaction_type,
      symbol: transaction.symbol,
      index
    }
  })

  // Remove duplicate dates, keeping the last entry for each date
  const uniqueTimelineData = timelineData.reduce((acc, current) => {
    const existingIndex = acc.findIndex(item => item.date === current.date)
    if (existingIndex >= 0) {
      acc[existingIndex] = current // Replace with latest data for that date
    } else {
      acc.push(current)
    }
    return acc
  }, [] as typeof timelineData)

  const totalPortfolioValue = allocationData.reduce((sum, item) => sum + item.value, 0)

  const renderChart = () => {
    switch (chartType) {
      case 'allocation':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={allocationData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => {
                  const numValue = typeof value === 'number' ? value : 0
                  const percentage = ((numValue / totalPortfolioValue) * 100).toFixed(1)
                  return `${name} ${percentage}%`
                }}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {allocationData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number, _: string, props: { payload?: { currency?: string; originalValue?: number } }) => [
                  `$${value.toFixed(2)} USD`,
                  'Value',
                  props.payload?.currency !== 'USD' && (
                    <div className="text-xs text-gray-500">
                      Original: {formatCurrency(props.payload?.originalValue || 0, props.payload?.currency || 'USD')}
                    </div>
                  )
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        )
      
      case 'performance':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={performanceData} margin={{ top: 5, right: 30, left: 20, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="symbol" 
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                label={{ value: 'Return %', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                formatter={(value: number, name: string) => {
                  if (name === 'pnlPercent') {
                    return [`${value.toFixed(2)}%`, 'Unrealized Return %']
                  }
                  if (name === 'realizedPnL') {
                    return [`$${value.toFixed(2)}`, 'Realized P&L']
                  }
                  return [value, name]
                }}
                labelFormatter={(label) => `Symbol: ${label}`}
              />
              <Bar 
                dataKey="pnlPercent" 
                fill={'#00C49F'}
                name="pnlPercent"
              >
                {performanceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.pnlPercent >= 0 ? '#00C49F' : '#FF8042'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )
      
      case 'timeline':
        return (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={uniqueTimelineData} margin={{ top: 5, right: 30, left: 60, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis
                dataKey="dateLabel"
                angle={-45}
                textAnchor="end"
                height={80}
                tick={{ fontSize: 12 }}
                stroke="#666"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="#666"
                tickFormatter={(value) => {
                  // Format large numbers with K, M suffix
                  if (Math.abs(value) >= 1000000) {
                    return `$${(value / 1000000).toFixed(1)}M`
                  }
                  if (Math.abs(value) >= 1000) {
                    return `$${(value / 1000).toFixed(0)}K`
                  }
                  return `$${value.toFixed(0)}`
                }}
                label={{
                  value: 'Amount (USD)',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fontSize: 12, fill: '#666' }
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #ccc',
                  borderRadius: '8px',
                  padding: '12px'
                }}
                formatter={(value: number, name: string) => {
                  const formattedValue = value.toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })

                  if (name === 'cumulativeInvested') return [formattedValue, 'Total Invested']
                  if (name === 'cumulativeRealized') return [formattedValue, 'Total Realized P&L']
                  if (name === 'netInvested') return [formattedValue, 'Net Capital in Market']

                  return [formattedValue, name]
                }}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="line"
                formatter={(value) => {
                  if (value === 'cumulativeInvested') return 'Total Invested'
                  if (value === 'cumulativeRealized') return 'Realized P&L'
                  if (value === 'netInvested') return 'Net Capital'
                  return value
                }}
              />
              <Line
                type="monotone"
                dataKey="cumulativeInvested"
                stroke="#0088FE"
                name="cumulativeInvested"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#0088FE' }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="cumulativeRealized"
                stroke="#00C49F"
                name="cumulativeRealized"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#00C49F' }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="netInvested"
                stroke="#FF8042"
                name="netInvested"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 3, fill: '#FF8042' }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )
      
      default:
        return null
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg sm:text-xl">Portfolio Charts</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {chartType === 'allocation' && 'Distribution by current market value (USD)'}
              {chartType === 'performance' && 'Profit/Loss percentage by position (USD)'}
              {chartType === 'timeline' && 'Cumulative investment, realized gains, and net capital over time (USD)'}
            </CardDescription>
          </div>
          <div className="flex gap-1 sm:gap-2 flex-wrap">
            <Button
              variant={chartType === 'allocation' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('allocation')}
              className="text-xs sm:text-sm"
            >
              Allocation
            </Button>
            <Button
              variant={chartType === 'performance' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('performance')}
              className="text-xs sm:text-sm"
            >
              Performance
            </Button>
            <Button
              variant={chartType === 'timeline' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('timeline')}
              className="text-xs sm:text-sm"
            >
              Timeline
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-6">
        {renderChart()}
      </CardContent>
    </Card>
  )
}