'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import PortfolioSummary from '@/components/PortfolioSummary'
import AggregatedPositionsList from '@/components/AggregatedPositionsList'
import TransactionForm from '@/components/TransactionForm'
import CurrentPositionsList from '@/components/CurrentPositionsList'
import TransactionHistoryList from '@/components/TransactionHistoryList'
import PortfolioChart from '@/components/PortfolioChart'
import AIAnalysis from '@/components/AIAnalysis'
import ExchangeRateDisplay from '@/components/ExchangeRateDisplay'
import { LogOut, Plus } from 'lucide-react'

export default function Dashboard() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [showAddTransaction, setShowAddTransaction] = useState(false)
  const [viewMode, setViewMode] = useState<'current' | 'aggregated' | 'history'>('current')
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
        <div className="container mx-auto px-3 sm:px-4 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Portfolio Tracker</h1>
              <p className="text-sm sm:text-base text-gray-600">Track your investments and get AI-powered insights</p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-wrap">
              {/* View Mode Buttons */}
              <div className="flex flex-wrap gap-1 sm:gap-2">
                <Button
                  variant={viewMode === 'current' ? "default" : "outline"}
                  onClick={() => setViewMode('current')}
                  size="sm"
                  className="text-xs sm:text-sm"
                >
                  Current
                </Button>
                <Button
                  variant={viewMode === 'aggregated' ? "default" : "outline"}
                  onClick={() => setViewMode('aggregated')}
                  size="sm"
                  className="text-xs sm:text-sm"
                >
                  Aggregated
                </Button>
                <Button
                  variant={viewMode === 'history' ? "default" : "outline"}
                  onClick={() => setViewMode('history')}
                  size="sm"
                  className="text-xs sm:text-sm"
                >
                  History
                </Button>
              </div>
              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowAddTransaction(!showAddTransaction)}
                  className="flex items-center gap-2 text-xs sm:text-sm"
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Add Transaction</span>
                  <span className="sm:hidden">Add</span>
                </Button>
                <Button variant="outline" onClick={handleLogout} size="sm" className="text-xs sm:text-sm">
                  <LogOut className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Portfolio Summary Cards */}
        <PortfolioSummary refreshTrigger={refreshTrigger} />

        {/* Add Transaction Form */}
        {showAddTransaction && (
          <TransactionForm onSuccess={handleTransactionAdded} />
        )}

        {/* Charts Section - Always shows current portfolio state */}
        <PortfolioChart refreshTrigger={refreshTrigger} />

        {/* Positions List */}
        {viewMode === 'current' && (
          <CurrentPositionsList refreshTrigger={refreshTrigger} />
        )}
        {viewMode === 'aggregated' && (
          <AggregatedPositionsList refreshTrigger={refreshTrigger} />
        )}
        {viewMode === 'history' && (
          <TransactionHistoryList refreshTrigger={refreshTrigger} />
        )}

        {/* Exchange Rate Display */}
        <ExchangeRateDisplay />

        {/* AI Analysis Section */}
        <AIAnalysis />
      </div>
    </div>
  )
}