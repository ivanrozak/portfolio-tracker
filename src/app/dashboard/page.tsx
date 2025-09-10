'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import PortfolioSummary from '@/components/PortfolioSummary'
import AddPosition from '@/components/AddPosition'
import PositionsList from '@/components/PositionsList'
import AggregatedPositionsList from '@/components/AggregatedPositionsList'
import PortfolioChart from '@/components/PortfolioChart'
import AIAnalysis from '@/components/AIAnalysis'
import { LogOut, Plus } from 'lucide-react'

export default function Dashboard() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [showAddPosition, setShowAddPosition] = useState(false)
  const [showAggregated, setShowAggregated] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const handlePositionAdded = () => {
    setRefreshTrigger(prev => prev + 1)
    setShowAddPosition(false)
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
            <div className="flex items-center gap-4">
              <Button
                variant={showAggregated ? "default" : "outline"}
                onClick={() => setShowAggregated(true)}
                size="sm"
              >
                Aggregated View
              </Button>
              <Button
                variant={!showAggregated ? "default" : "outline"}
                onClick={() => setShowAggregated(false)}
                size="sm"
              >
                Individual Trades
              </Button>
              <Button
                onClick={() => setShowAddPosition(!showAddPosition)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Position
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

        {/* Add Position Form */}
        {showAddPosition && (
          <AddPosition onSuccess={handlePositionAdded} />
        )}

        {/* Charts Section */}
        <PortfolioChart refreshTrigger={refreshTrigger} />

        {/* Positions List */}
        {showAggregated ? (
          <AggregatedPositionsList refreshTrigger={refreshTrigger} />
        ) : (
          <PositionsList refreshTrigger={refreshTrigger} />
        )}

        {/* AI Analysis Section */}
        <AIAnalysis />
      </div>
    </div>
  )
}