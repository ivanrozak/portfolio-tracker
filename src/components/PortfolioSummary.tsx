'use client'

import { useState, useEffect } from 'react'
import { AggregatedPosition, MarketPrice, PortfolioSummary as PortfolioSummaryType } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, DollarSign, PieChart } from 'lucide-react'
import { formatCurrency } from '@/lib/currency'

interface PortfolioSummaryProps {
  refreshTrigger?: number
}

export default function PortfolioSummary({ refreshTrigger }: PortfolioSummaryProps) {
  const [summary, setSummary] = useState<PortfolioSummaryType | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPortfolioData()
  }, [refreshTrigger])

  const fetchPortfolioData = async () => {
    try {
      // Fetch aggregated positions
      const positionsResponse = await fetch('/api/positions/aggregated')
      if (!positionsResponse.ok) return
      
      const positionsData = await positionsResponse.json()
      const positions: AggregatedPosition[] = positionsData.aggregatedPositions || []
      
      if (positions.length === 0) {
        setSummary({
          total_value: 0,
          total_cost: 0,
          total_pnl: 0,
          total_pnl_percentage: 0
        })
        setLoading(false)
        return
      }

      // Fetch current prices
      const symbols = positions.map(p => p.symbol)
      const pricesResponse = await fetch(`/api/market/prices?symbols=${symbols.join(',')}`)
      
      let prices: Record<string, MarketPrice> = {}
      if (pricesResponse.ok) {
        const pricesData = await pricesResponse.json()
        pricesData.prices?.forEach((price: MarketPrice) => {
          prices[price.symbol] = price
        })
      }

      // Calculate summary with currency conversion (simplified - assume same base currency for now)
      let totalValue = 0
      let totalCost = 0

      positions.forEach(position => {
        const currentPrice = prices[position.symbol]?.price || 0
        totalValue += currentPrice * position.total_quantity
        totalCost += position.total_cost
      })

      const totalPnL = totalValue - totalCost
      const totalPnLPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0

      setSummary({
        total_value: totalValue,
        total_cost: totalCost,
        total_pnl: totalPnL,
        total_pnl_percentage: totalPnLPercent
      })

    } catch (err) {
      console.error('Failed to fetch portfolio data:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!summary) {
    return null
  }

  const summaryCards = [
    {
      title: 'Total Value',
      value: `$${summary.total_value.toFixed(2)}`,
      icon: DollarSign,
      description: 'Current portfolio value'
    },
    {
      title: 'Total Cost',
      value: `$${summary.total_cost.toFixed(2)}`,
      icon: PieChart,
      description: 'Total amount invested'
    },
    {
      title: 'Total P&L',
      value: `${summary.total_pnl >= 0 ? '+' : ''}$${summary.total_pnl.toFixed(2)}`,
      icon: summary.total_pnl >= 0 ? TrendingUp : TrendingDown,
      description: 'Unrealized gains/losses',
      color: summary.total_pnl >= 0 ? 'text-green-600' : 'text-red-600'
    },
    {
      title: 'Total Return',
      value: `${summary.total_pnl_percentage >= 0 ? '+' : ''}${summary.total_pnl_percentage.toFixed(2)}%`,
      icon: summary.total_pnl_percentage >= 0 ? TrendingUp : TrendingDown,
      description: 'Percentage return',
      color: summary.total_pnl_percentage >= 0 ? 'text-green-600' : 'text-red-600'
    }
  ]

  return (
    <div className="grid gap-4 md:grid-cols-4 mb-6">
      {summaryCards.map((card, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className={`h-4 w-4 ${card.color || 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${card.color || ''}`}>
              {card.value}
            </div>
            <p className="text-xs text-muted-foreground">
              {card.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}