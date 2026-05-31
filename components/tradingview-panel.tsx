'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

type TradingViewMarket = 'crypto' | 'forex' | 'stocks'

function toTvSymbol(market: TradingViewMarket, raw: string): string {
  const v = raw.trim().toUpperCase()
  if (!v) return 'BYBIT:BTCUSDT'

  if (market === 'crypto') {
    if (v.includes(':')) return v
    return `BYBIT:${v.replace('/', '')}`
  }

  if (market === 'forex') {
    if (v.includes(':')) return v
    return `FX:${v.replace('/', '')}`
  }

  if (v.includes(':')) return v
  return `NASDAQ:${v}`
}

export function TradingViewPanel() {
  const containerId = 'tradingview_widget_container'

  const [market, setMarket] = useState<TradingViewMarket>('crypto')
  const [symbolInput, setSymbolInput] = useState('BTCUSDT')
  const [appliedSymbol, setAppliedSymbol] = useState('BTCUSDT')

  const tvSymbol = useMemo(() => toTvSymbol(market, appliedSymbol), [market, appliedSymbol])

  useEffect(() => {
    const container = document.getElementById(containerId)
    if (!container) return

    container.innerHTML = ''

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/tv.js'
    script.async = true

    script.onload = () => {
      // CORRECTION DU TYPE : On indique à TypeScript que widget accepte n'importe quelle configuration
      const w = window as unknown as {
        TradingView?: {
          widget: new (cfg: Record<string, unknown>) => unknown
        }
      }

      if (w.TradingView && container.clientWidth > 0) {
        try {
          // CORRECTION : L'utilisation de 'new' est maintenant validée par le typage ci-dessus
          new w.TradingView.widget({
            autosize: true,
            symbol: tvSymbol,
            interval: '15',
            timezone: 'Etc/UTC',
            theme: 'dark',
            style: '1',
            locale: 'fr',
            enable_publishing: false,
            allow_symbol_change: true,
            hide_top_toolbar: false,
            hide_legend: false,
            container_id: containerId,
          })
        } catch (err) {
          console.error('[TRADINGVIEW] Erreur lors de l\'initialisation du widget:', err)
        }
      }
    }

    container.appendChild(script)
  }, [tvSymbol])

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>TradingView</CardTitle>
          <CardDescription>Marchés en temps réel (widget TradingView).</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Marché</Label>
            <Select value={market} onValueChange={(v) => setMarket(v as TradingViewMarket)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="crypto">Crypto</SelectItem>
                <SelectItem value="forex">Forex</SelectItem>
                <SelectItem value="stocks">Actions</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Symbole</Label>
            <div className="flex gap-2">
              <Input
                value={symbolInput}
                onChange={(e) => setSymbolInput(e.target.value)}
                placeholder="Ex: BTCUSDT ou BINANCE:BTCUSDT ou FX:EURUSD"
              />
              <Button type="button" onClick={() => setAppliedSymbol(symbolInput)}>
                Afficher
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Astuce: tu peux saisir directement un symbole TradingView complet comme `BINANCE:BTCUSDT`.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 min-h-[500px]">
          <div className="h-[65vh] min-h-[500px] w-full bg-muted/10 rounded-b-lg" id={containerId} />
        </CardContent>
      </Card>
    </div>
  )
}