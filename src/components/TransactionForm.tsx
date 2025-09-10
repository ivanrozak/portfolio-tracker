'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { PlusCircle, Minus, TrendingUp, TrendingDown } from 'lucide-react'
import { CurrentPosition } from '@/types'
import { formatCurrency } from '@/lib/currency'

const formSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required').toUpperCase(),
  transactionType: z.enum(['buy', 'sell'], { message: 'Please select transaction type' }),
  quantity: z.number().positive('Quantity must be positive'),
  price: z.number().positive('Price must be positive'),
  assetType: z.enum(['stock', 'crypto'], { message: 'Please select an asset type' }),
  transactionDate: z.string().optional(),
  currency: z.enum(['USD', 'IDR'], { message: 'Please select currency' }),
  notes: z.string().optional()
})

type FormData = z.infer<typeof formSchema>

interface TransactionFormProps {
  onSuccess?: () => void
  prefilledPosition?: CurrentPosition
}

export default function TransactionForm({ onSuccess, prefilledPosition }: TransactionFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [currentPositions, setCurrentPositions] = useState<CurrentPosition[]>([])
  const router = useRouter()

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      symbol: prefilledPosition?.symbol || '',
      transactionType: 'buy',
      quantity: 0,
      price: 0,
      assetType: prefilledPosition?.asset_type || 'stock',
      currency: prefilledPosition?.currency as 'USD' | 'IDR' || 'USD',
      transactionDate: new Date().toISOString().split('T')[0],
      notes: ''
    }
  })

  const transactionType = form.watch('transactionType')
  const symbol = form.watch('symbol')

  useEffect(() => {
    if (prefilledPosition) {
      form.reset({
        symbol: prefilledPosition.symbol,
        transactionType: 'sell',
        quantity: 0,
        price: prefilledPosition.current_price || 0,
        assetType: prefilledPosition.asset_type,
        currency: prefilledPosition.currency as 'USD' | 'IDR',
        transactionDate: new Date().toISOString().split('T')[0],
        notes: ''
      })
    }
  }, [prefilledPosition, form])

  useEffect(() => {
    fetchCurrentPositions()
  }, [])

  const fetchCurrentPositions = async () => {
    try {
      const response = await fetch('/api/positions/current')
      if (response.ok) {
        const data = await response.json()
        setCurrentPositions(data.currentPositions || [])
      }
    } catch (err) {
      console.error('Failed to fetch current positions:', err)
    }
  }

  const currentPosition = currentPositions.find(pos => pos.symbol === symbol)

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    setError('')

    // Validate sell transaction
    if (data.transactionType === 'sell' && currentPosition) {
      if (data.quantity > currentPosition.current_quantity) {
        setError(`Insufficient shares. You currently own ${currentPosition.current_quantity} shares.`)
        setLoading(false)
        return
      }
    }

    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol: data.symbol,
          transaction_type: data.transactionType,
          quantity: data.quantity,
          price: data.price,
          asset_type: data.assetType,
          currency: data.currency,
          transaction_date: data.transactionDate,
          notes: data.notes
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add transaction')
      }

      form.reset()
      onSuccess?.()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const estimatedPnL = currentPosition && transactionType === 'sell' 
    ? (form.watch('price') - currentPosition.average_cost) * form.watch('quantity')
    : null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {transactionType === 'buy' ? (
            <>
              <PlusCircle className="h-5 w-5 text-green-600" />
              Buy {transactionType === 'buy' && symbol ? symbol : 'Assets'}
            </>
          ) : (
            <>
              <Minus className="h-5 w-5 text-red-600" />
              Sell {transactionType === 'sell' && symbol ? symbol : 'Assets'}
            </>
          )}
        </CardTitle>
        <CardDescription>
          {transactionType === 'buy' 
            ? 'Add a new buy transaction to your portfolio'
            : 'Sell existing shares and realize gains/losses'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {currentPosition && transactionType === 'sell' && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Current Position</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <div>Shares owned: {currentPosition.current_quantity.toLocaleString()}</div>
              <div>Average cost: {formatCurrency(currentPosition.average_cost, currentPosition.currency)}</div>
              <div>Current price: {formatCurrency(currentPosition.current_price || 0, currentPosition.currency)}</div>
              {currentPosition.total_realized_pnl !== 0 && (
                <div>Previous realized P&L: {formatCurrency(currentPosition.total_realized_pnl, currentPosition.currency)}</div>
              )}
            </div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="transactionType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transaction Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select transaction type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="buy">Buy</SelectItem>
                        <SelectItem value="sell">Sell</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="symbol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Symbol</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="AAPL, BBCA.JK, BTC, etc." 
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        disabled={!!prefilledPosition}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="assetType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asset Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select asset type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="stock">Stock</SelectItem>
                        <SelectItem value="crypto">Cryptocurrency</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="IDR">IDR (Rp)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="any" 
                        placeholder="100"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                    {transactionType === 'sell' && currentPosition && (
                      <p className="text-sm text-gray-600">
                        Available: {currentPosition.current_quantity.toLocaleString()} shares
                      </p>
                    )}
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price per Share</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="any" 
                        placeholder="150.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {estimatedPnL !== null && form.watch('quantity') > 0 && (
              <div className={`p-3 rounded-lg ${estimatedPnL >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className={`flex items-center gap-2 ${estimatedPnL >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                  {estimatedPnL >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  <span className="font-medium">
                    Estimated P&L: {estimatedPnL >= 0 ? '+' : ''}{formatCurrency(Math.abs(estimatedPnL), currentPosition?.currency || 'USD')}
                  </span>
                </div>
                <p className="text-sm mt-1 opacity-75">
                  Based on average cost of {formatCurrency(currentPosition?.average_cost || 0, currentPosition?.currency || 'USD')}
                </p>
              </div>
            )}

            <FormField
              control={form.control}
              name="transactionDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transaction Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Add any additional notes about this transaction..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading 
                ? `${transactionType === 'buy' ? 'Adding' : 'Selling'}...` 
                : `${transactionType === 'buy' ? 'Add Buy' : 'Sell'} Transaction`
              }
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}