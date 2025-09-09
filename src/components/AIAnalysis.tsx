'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Copy, MessageSquare, Zap, CheckCircle } from 'lucide-react'

export default function AIAnalysis() {
  const [prompt, setPrompt] = useState('')
  const [analysisResult, setAnalysisResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [analysisId, setAnalysisId] = useState<string | null>(null)

  const generatePortfolioPrompt = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/ai/prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'portfolio' }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate prompt')
      }

      const data = await response.json()
      setPrompt(data.prompt)
      setAnalysisId(data.analysisId)
    } catch (err) {
      console.error('Error generating prompt:', err)
      setPrompt('Error: ' + (err instanceof Error ? err.message : 'Failed to generate prompt'))
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const saveAnalysisResult = async () => {
    if (!analysisId || !analysisResult.trim()) {
      alert('Please paste Claude\'s response before saving')
      return
    }

    try {
      const response = await fetch('/api/ai/prompt', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analysisId,
          result: analysisResult
        }),
      })

      if (response.ok) {
        alert('Analysis saved successfully!')
        setAnalysisResult('')
        setPrompt('')
        setAnalysisId(null)
      } else {
        throw new Error('Failed to save analysis')
      }
    } catch (err) {
      console.error('Error saving analysis:', err)
      alert('Failed to save analysis')
    }
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              AI Portfolio Analysis
            </CardTitle>
            <CardDescription>
              Generate analysis prompts for Claude Pro and save the results
            </CardDescription>
          </div>
          <Badge variant="secondary">
            Claude Pro Integration
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={generatePortfolioPrompt}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            {loading ? 'Generating...' : 'Generate Portfolio Analysis Prompt'}
          </Button>
        </div>

        {prompt && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium">Generated Prompt for Claude Pro:</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyToClipboard}
                  className="flex items-center gap-2"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <Textarea
                value={prompt}
                readOnly
                className="min-h-[200px] font-mono text-sm"
                placeholder="Generated prompt will appear here..."
              />
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">How to use:</h4>
              <ol className="text-sm text-blue-800 space-y-1">
                <li>1. Click "Copy" to copy the prompt above</li>
                <li>2. Open Claude Pro in a new tab</li>
                <li>3. Paste and send the prompt to Claude Pro</li>
                <li>4. Copy Claude's response and paste it below</li>
                <li>5. Click "Save Analysis" to store the results</li>
              </ol>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Paste Claude's Response:</h4>
              <Textarea
                value={analysisResult}
                onChange={(e) => setAnalysisResult(e.target.value)}
                className="min-h-[150px]"
                placeholder="Paste Claude Pro's analysis response here..."
              />
              <div className="flex justify-end mt-2">
                <Button 
                  onClick={saveAnalysisResult}
                  disabled={!analysisResult.trim() || !analysisId}
                  variant="outline"
                >
                  Save Analysis
                </Button>
              </div>
            </div>
          </div>
        )}

        {!prompt && (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Click the button above to generate an AI analysis prompt for your portfolio</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}