'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import PortfolioSummary from '@/components/PortfolioSummary'
import AddPosition from '@/components/AddPosition'
import PositionsList from '@/components/PositionsList'
import AggregatedPositionsList from '@/components/AggregatedPositionsList'
import TransactionForm from '@/components/TransactionForm'
import CurrentPositionsList from '@/components/CurrentPositionsList'
import PortfolioChart from '@/components/PortfolioChart'
import AIAnalysis from '@/components/AIAnalysis'
import ExchangeRateDisplay from '@/components/ExchangeRateDisplay'
import { LogOut, Plus } from 'lucide-react'

export default function Dashboard() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [showAddTransaction, setShowAddTransaction] = useState(false)
  const [viewMode, setViewMode] = useState<'current' | 'aggregated' | 'individual'>('current')
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const handleTransactionAdded = () => {
    setRefreshTrigger(prev => prev + 1)
    setShowAddTransaction(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Portfolio Tracker</h1>
              <p className="text-gray-600">Track your investments and get AI-powered insights</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant={viewMode === 'current' ? "default" : "outline"}
                onClick={() => setViewMode('current')}
                size="sm"
              >
                Current Positions
              </Button>
              <Button
                variant={viewMode === 'aggregated' ? "default" : "outline"}
                onClick={() => setViewMode('aggregated')}
                size="sm"
              >
                Aggregated View
              </Button>
              <Button
                variant={viewMode === 'individual' ? "default" : "outline"}
                onClick={() => setViewMode('individual')}
                size="sm"
              >
                Individual Trades
              </Button>
              <Button
                onClick={() => setShowAddTransaction(!showAddTransaction)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Transaction
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Portfolio Summary Cards */}
        <PortfolioSummary refreshTrigger={refreshTrigger} />

        {/* Add Transaction Form */}
        {showAddTransaction && (
          <TransactionForm onSuccess={handleTransactionAdded} />
        )}

        {/* Charts Section */}
        <PortfolioChart refreshTrigger={refreshTrigger} useAggregated={viewMode === 'aggregated'} />

        {/* Positions List */}
        {viewMode === 'current' && (
          <CurrentPositionsList refreshTrigger={refreshTrigger} />
        )}
        {viewMode === 'aggregated' && (
          <AggregatedPositionsList refreshTrigger={refreshTrigger} />
        )}
        {viewMode === 'individual' && (
          <PositionsList refreshTrigger={refreshTrigger} />
        )}

        {/* Exchange Rate Display */}
        <ExchangeRateDisplay />

        {/* AI Analysis Section */}
        <AIAnalysis />
      </div>
    </div>
  )
}