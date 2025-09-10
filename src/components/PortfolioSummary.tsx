'use client'

import { useState, useEffect } from 'react'
import { CurrentPosition, PortfolioSummary as PortfolioSummaryType } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, DollarSign, Target, Award } from 'lucide-react'

interface PortfolioSummaryProps {
  refreshTrigger?: number
}

export default function PortfolioSummary({ refreshTrigger }: PortfolioSummaryProps) {
  const [summary, setSummary] = useState<PortfolioSummaryType | null>(null)
  const [realizedPnL, setRealizedPnL] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPortfolioData()
  }, [refreshTrigger])

  const fetchPortfolioData = async () => {
    try {
      // Fetch current positions (transaction-based)
      const positionsResponse = await fetch('/api/positions/current')
      if (!positionsResponse.ok) return
      
      const positionsData = await positionsResponse.json()
      const positions: CurrentPosition[] = positionsData.currentPositions || []
      
      if (positions.length === 0) {
        setSummary({
          total_value: 0,
          total_cost: 0,
          total_pnl: 0,
          total_pnl_percentage: 0
        })
        setRealizedPnL(0)
        setLoading(false)
        return
      }

      // Calculate summary in USD (using USD equivalents when available)
      let totalValue = 0
      let totalCost = 0
      let totalRealizedPnL = 0

      positions.forEach(position => {
        // Use USD equivalent if available, otherwise original currency
        const marketValue = position.usd_equivalent?.market_value || 
          ((position.current_price || 0) * position.current_quantity)
        const costBasis = position.usd_equivalent?.total_cost_basis || 
          position.total_cost_basis
        
        totalValue += marketValue
        totalCost += costBasis
        totalRealizedPnL += position.total_realized_pnl || 0
      })

      const totalUnrealizedPnL = totalValue - totalCost
      const totalPnLPercent = totalCost > 0 ? (totalUnrealizedPnL / totalCost) * 100 : 0

      setSummary({
        total_value: totalValue,
        total_cost: totalCost,
        total_pnl: totalUnrealizedPnL,
        total_pnl_percentage: totalPnLPercent
      })
      setRealizedPnL(totalRealizedPnL)

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
      title: 'Portfolio Value',
      value: `$${summary.total_value.toFixed(2)}`,
      icon: DollarSign,
      description: 'Current market value (USD)',
      subtext: 'Multi-currency converted'
    },
    {
      title: 'Cost Basis',
      value: `$${summary.total_cost.toFixed(2)}`,
      icon: Target,
      description: 'Total amount invested (USD)'
    },
    {
      title: 'Unrealized P&L',
      value: `${summary.total_pnl >= 0 ? '+' : ''}$${Math.abs(summary.total_pnl).toFixed(2)}`,
      icon: summary.total_pnl >= 0 ? TrendingUp : TrendingDown,
      description: 'Paper gains/losses (USD)',
      color: summary.total_pnl >= 0 ? 'text-green-600' : 'text-red-600',
      subtext: `${summary.total_pnl >= 0 ? '+' : ''}${summary.total_pnl_percentage.toFixed(2)}%`
    },
    {
      title: 'Realized P&L',
      value: `${realizedPnL >= 0 ? '+' : ''}$${Math.abs(realizedPnL).toFixed(2)}`,
      icon: Award,
      description: 'From completed sales (USD)',
      color: realizedPnL >= 0 ? 'text-green-600' : 'text-red-600',
      subtext: realizedPnL !== 0 ? 'From sell transactions' : 'No sales yet'
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
            {card.subtext && (
              <p className={`text-xs font-medium mt-1 ${card.color || 'text-gray-500'}`}>
                {card.subtext}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}