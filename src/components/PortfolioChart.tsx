'use client'

import { useState, useEffect } from 'react'
import { Position, MarketPrice, CurrentPosition, Transaction } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts'
import { formatCurrency } from '@/lib/currency'
import { convertToUSD } from '@/lib/currency-conversion'
import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react'

interface PortfolioChartProps {
  refreshTrigger?: number
  useAggregated?: boolean
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c']

export default function PortfolioChart({ refreshTrigger, useAggregated = true }: PortfolioChartProps) {
  const [positions, setPositions] = useState<CurrentPosition[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [prices, setPrices] = useState<Record<string, MarketPrice>>({})
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
      // But we can still fetch for additional metadata if needed
      const symbols = fetchedPositions.map(p => p.symbol)
      const pricesResponse = await fetch(`/api/market/prices?symbols=${symbols.join(',')}`)
      
      if (pricesResponse.ok) {
        const pricesData = await pricesResponse.json()
        const pricesMap: Record<string, MarketPrice> = {}
        pricesData.prices?.forEach((price: MarketPrice) => {
          pricesMap[price.symbol] = price
        })
        setPrices(pricesMap)
      }

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

  // Prepare timeline data for transaction history
  const timelineData = transactions
    .sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime())
    .reduce((acc, transaction) => {
      const date = transaction.transaction_date
      const existingEntry = acc.find(entry => entry.date === date)
      
      if (existingEntry) {
        if (transaction.transaction_type === 'buy') {
          existingEntry.invested += transaction.quantity * transaction.price
        } else {
          existingEntry.realized += transaction.realized_pnl || 0
        }
      } else {
        acc.push({
          date,
          invested: transaction.transaction_type === 'buy' ? transaction.quantity * transaction.price : 0,
          realized: transaction.transaction_type === 'sell' ? (transaction.realized_pnl || 0) : 0
        })
      }
      
      return acc
    }, [] as Array<{ date: string; invested: number; realized: number }>)

  const totalPortfolioValue = allocationData.reduce((sum, item) => sum + item.value, 0)

  const renderChart = () => {
    switch (chartType) {
      case 'allocation':
        return (
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={allocationData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => {
                  const percentage = ((value / totalPortfolioValue) * 100).toFixed(1)
                  return `${name} ${percentage}%`
                }}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {allocationData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number, name, props: any) => [
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
          <ResponsiveContainer width="100%" height={350}>
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
            <LineChart data={timelineData} margin={{ top: 5, right: 30, left: 20, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                label={{ value: 'Amount (USD)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  `$${value.toFixed(2)}`,
                  name === 'invested' ? 'Invested' : 'Realized P&L'
                ]}
              />
              <Line 
                type="monotone" 
                dataKey="invested" 
                stroke="#0088FE" 
                name="invested"
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="realized" 
                stroke="#00C49F" 
                name="realized"
                strokeWidth={2}
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Portfolio Charts</CardTitle>
            <CardDescription>
              {chartType === 'allocation' && 'Distribution by current market value (USD)'}
              {chartType === 'performance' && 'Profit/Loss percentage by position (USD)'}
              {chartType === 'timeline' && 'Investment and realized gains over time (USD)'}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant={chartType === 'allocation' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('allocation')}
            >
              Allocation
            </Button>
            <Button
              variant={chartType === 'performance' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('performance')}
            >
              Performance
            </Button>
            <Button
              variant={chartType === 'timeline' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('timeline')}
            >
              Timeline
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {renderChart()}
      </CardContent>
    </Card>
  )
}