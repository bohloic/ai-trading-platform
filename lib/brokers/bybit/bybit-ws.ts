import { getBybitEnv } from '@/lib/brokers/bybit/env'
import type { PriceTick } from '@/lib/brokers/types'

type BybitWsClose = () => void

type SubscribeParams = {
  symbols: string[]
  onTick: (tick: PriceTick) => void
  onError?: (err: unknown) => void
}

function normalizeSymbol(symbol: string): string {
  // Bybit public streams typically use symbols like BTCUSDT (linear/spot differs).
  return symbol.replace('/', '').toUpperCase()
}

export function subscribeBybitTickers(params: SubscribeParams): { close: BybitWsClose } {
  const env = getBybitEnv()
  const url = env.BYBIT_TESTNET ? 'wss://stream-testnet.bybit.com/v5/public/linear' : 'wss://stream.bybit.com/v5/public/linear'
  const ws = new WebSocket(url)

  const topics = params.symbols.map((s) => `tickers.${normalizeSymbol(s)}`)

  ws.addEventListener('open', () => {
    ws.send(
      JSON.stringify({
        op: 'subscribe',
        args: topics,
      })
    )
  })

  ws.addEventListener('message', (ev) => {
    try {
      const data = JSON.parse(typeof ev.data === 'string' ? ev.data : '')
      // v5 tickers message shape: { topic, data: { lastPrice, symbol }, ts }
      const topic: unknown = data?.topic
      const payload: unknown = data?.data
      const ts: unknown = data?.ts ?? Date.now()
      if (typeof topic !== 'string' || !payload || typeof payload !== 'object') return

      const symbol = (payload as { symbol?: unknown }).symbol
      const lastPrice = (payload as { lastPrice?: unknown }).lastPrice
      if (typeof symbol !== 'string' || typeof lastPrice !== 'string') return

      const price = Number(lastPrice)
      if (!Number.isFinite(price)) return

      params.onTick({
        broker: 'bybit',
        symbol,
        price,
        ts: typeof ts === 'number' ? ts : Date.now(),
      })
    } catch (err) {
      params.onError?.(err)
    }
  })

  ws.addEventListener('error', (ev) => {
    params.onError?.(ev)
  })

  return {
    close: () => {
      try {
        ws.close()
      } catch {
        // ignore
      }
    },
  }
}

