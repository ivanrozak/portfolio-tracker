'use client'

import { useState, useEffect } from 'react'
import { Position, MarketPrice } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'

interface PortfolioChartProps {
  refreshTrigger?: number
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c']

export default function PortfolioChart({ refreshTrigger }: PortfolioChartProps) {
  const [positions, setPositions] = useState<Position[]>([])
  const [prices, setPrices] = useState<Record<string, MarketPrice>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [refreshTrigger])

  const fetchData = async () => {
    try {
      // Fetch positions
      const positionsResponse = await fetch('/api/positions')
      if (!positionsResponse.ok) return
      
      const positionsData = await positionsResponse.json()
      const fetchedPositions: Position[] = positionsData.positions || []
      setPositions(fetchedPositions)
      
      if (fetchedPositions.length === 0) {
        setLoading(false)
        return
      }

      // Fetch current prices
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

  // Prepare data for pie chart (allocation by value)
  const allocationData = positions
    .map(position => {
      const currentPrice = prices[position.symbol]?.price || 0
      const marketValue = currentPrice * position.quantity
      return {
        name: position.symbol,
        value: marketValue,
        type: position.asset_type
      }
    })
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value)

  // Prepare data for performance bar chart
  const performanceData = positions
    .map(position => {
      const currentPrice = prices[position.symbol]?.price || 0
      const marketValue = currentPrice * position.quantity
      const costBasis = position.purchase_price * position.quantity
      const pnl = marketValue - costBasis
      const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0

      return {
        symbol: position.symbol,
        pnl: pnl,
        pnlPercent: pnlPercent,
        marketValue: marketValue
      }
    })
    .filter(item => item.marketValue > 0)
    .sort((a, b) => b.pnlPercent - a.pnlPercent)

  const totalPortfolioValue = allocationData.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Portfolio Allocation Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Allocation</CardTitle>
          <CardDescription>
            Distribution by current market value
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={allocationData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => {
                  const percentage = ((parseFloat(value as unknown as string) / totalPortfolioValue) * 100).toFixed(1)
                  return `${name} ${percentage}%`
                }}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {allocationData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Value']}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Performance Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Position Performance</CardTitle>
          <CardDescription>
            Profit/Loss percentage by position
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={performanceData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
                    return [`${value.toFixed(2)}%`, 'Return %']
                  }
                  return [value, name]
                }}
                labelFormatter={(label) => `Symbol: ${label}`}
              />
              <Bar 
                dataKey="pnlPercent" 
                // fill={(entry: number) => entry >= 0 ? '#00C49F' : '#FF8042'}
                fill={'#00C49F'}
                name="pnlPercent"
              >
                {performanceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.pnlPercent >= 0 ? '#00C49F' : '#FF8042'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}