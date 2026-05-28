'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getTrades } from '@/app/actions/trading'
import { TrendingUp, TrendingDown, Clock } from 'lucide-react'

export function TradesPanel() {
  const [trades, setTrades] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await getTrades()
        setTrades(data)
      } catch (error) {
        console.error('Failed to load trades:', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Chargement des trades...</p>
        </CardContent>
      </Card>
    )
  }

  if (trades.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historique des Trades</CardTitle>
          <CardDescription>
            Aucun trade pour le moment. Connectez un broker et lancez le trading automatique.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <TrendingUp className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">
              Les trades apparaitront ici une fois que l&apos;IA commencera a trader.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historique des Trades</CardTitle>
        <CardDescription>
          Derniers {trades.length} trades executes par l&apos;IA
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {trades.map((trade) => (
            <div
              key={trade.id}
              className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-full ${
                  trade.side === 'buy' 
                    ? 'bg-green-500/10 text-green-500' 
                    : 'bg-red-500/10 text-red-500'
                }`}>
                  {trade.side === 'buy' ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{trade.symbol}</span>
                    <Badge variant={trade.status === 'open' ? 'default' : 'secondary'}>
                      {trade.status === 'open' ? 'Ouvert' : trade.status === 'closed' ? 'Ferme' : 'Annule'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <span>{trade.side.toUpperCase()}</span>
                    <span>•</span>
                    <span>Entree: {trade.entryPrice}</span>
                    {trade.exitPrice && (
                      <>
                        <span>•</span>
                        <span>Sortie: {trade.exitPrice}</span>
                      </>
                    )}
                    {trade.leverage > 1 && (
                      <>
                        <span>•</span>
                        <span>{trade.leverage}x</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                {trade.pnl !== null && (
                  <p className={`font-semibold ${
                    parseFloat(trade.pnl) >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {parseFloat(trade.pnl) >= 0 ? '+' : ''}{parseFloat(trade.pnl).toFixed(2)}$
                  </p>
                )}
                {trade.pnlPercent !== null && (
                  <p className="text-xs text-muted-foreground">
                    {parseFloat(trade.pnlPercent) >= 0 ? '+' : ''}{parseFloat(trade.pnlPercent).toFixed(2)}%
                  </p>
                )}
                {trade.aiConfidence && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Confiance IA: {(parseFloat(trade.aiConfidence) * 100).toFixed(0)}%
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
