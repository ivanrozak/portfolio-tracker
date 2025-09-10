'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RefreshCw } from 'lucide-react'

interface ExchangeRateInfo {
  from_currency: string
  to_currency: string
  rate: number
  timestamp: string
}

export default function ExchangeRateDisplay() {
  const [exchangeRates, setExchangeRates] = useState<ExchangeRateInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  const fetchExchangeRates = async () => {
    setLoading(true)
    try {
      // Fetch current USD-IDR rate
      const usdToIdrResponse = await fetch('/api/exchange-rates?from=USD&to=IDR')
      const idrToUsdResponse = await fetch('/api/exchange-rates?from=IDR&to=USD')

      if (usdToIdrResponse.ok && idrToUsdResponse.ok) {
        const usdToIdr = await usdToIdrResponse.json()
        const idrToUsd = await idrToUsdResponse.json()

        setExchangeRates([
          usdToIdr,
          idrToUsd
        ])
        setLastUpdated(new Date().toLocaleString())
      }
    } catch (error) {
      console.error('Error fetching exchange rates:', error)
    } finally {
      setLoading(false)
    }
  }

  const refreshRates = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/exchange-rates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'refresh' }),
      })

      if (response.ok) {
        // Fetch updated rates after refresh
        await fetchExchangeRates()
      }
    } catch (error) {
      console.error('Error refreshing exchange rates:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchExchangeRates()
  }, [])

  if (exchangeRates.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base sm:text-lg">Live Exchange Rates</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Real-time USD ↔ IDR exchange rates
              {lastUpdated && <span className="block text-xs mt-1">Last updated: {lastUpdated}</span>}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshRates}
            disabled={loading}
            className="text-xs sm:text-sm"
          >
            <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {exchangeRates.map((rate) => {
            const isUsdToIdr = rate.from_currency === 'USD'
            const displayRate = rate.rate
            const formattedRate = isUsdToIdr 
              ? `Rp ${displayRate.toLocaleString('id-ID', { maximumFractionDigits: 0 })}`
              : `$${displayRate.toFixed(6)}`

            return (
              <div 
                key={`${rate.from_currency}-${rate.to_currency}`}
                className="p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <Badge variant="secondary" className="font-mono text-xs">
                      {rate.from_currency}
                    </Badge>
                    <span className="text-gray-400 text-sm">→</span>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {rate.to_currency}
                    </Badge>
                  </div>
                  <Badge variant="outline" className="text-green-600 text-xs">
                    LIVE
                  </Badge>
                </div>
                
                <div className="text-lg sm:text-2xl font-bold text-gray-900">
                  {formattedRate}
                </div>
                
                <div className="text-xs sm:text-sm text-gray-600 mt-1">
                  1 {rate.from_currency} = {formattedRate}
                </div>
                
                <div className="text-xs text-gray-500 mt-2">
                  Source: ExchangeRate-API
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-3 sm:mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="text-xs sm:text-sm text-yellow-800">
            <strong>💡 Note:</strong> Exchange rates are fetched from a real-time API and cached for 10 minutes. 
            All portfolio calculations automatically use the latest rates for accurate USD conversion.
          </div>
        </div>
      </CardContent>
    </Card>
  )
}