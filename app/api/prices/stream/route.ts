import { z } from 'zod'
import { PriceHub } from '@/lib/prices/price-hub'
import { ensurePriceStream } from '@/lib/prices/connectors'
import type { BrokerName, PriceTick } from '@/lib/brokers/types'

const querySchema = z.object({
  broker: z.enum(['bybit', 'deriv']),
  symbols: z.string().min(1),
})

function parseSymbols(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

export const runtime = 'nodejs'

export async function GET(req: Request): Promise<Response> {
  if (process.env.VERCEL === '1' || process.env.NODE_ENV === 'production') {
    return Response.json(
      {
        error: 'REALTIME_DISABLED_IN_PROD',
        message:
          'Le flux serveur (WS brokers -> SSE) est désactivé en production sur Vercel. Utilisez l’onglet TradingView ou une stratégie realtime côté client/worker.',
      },
      { status: 410 }
    )
  }

  const url = new URL(req.url)
  const parsed = querySchema.safeParse({
    broker: url.searchParams.get('broker'),
    symbols: url.searchParams.get('symbols'),
  })
  if (!parsed.success) {
    return Response.json({ error: 'Invalid query', details: parsed.error.flatten() }, { status: 400 })
  }

  const broker = parsed.data.broker as BrokerName
  const symbols = parseSymbols(parsed.data.symbols)
  if (symbols.length === 0) return Response.json({ error: 'No symbols provided' }, { status: 400 })

  // Start upstream WS streams (best-effort).
  await ensurePriceStream({ broker, symbols })

  const encoder = new TextEncoder()
  const keepAliveMs = 15_000

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const write = (text: string) => controller.enqueue(encoder.encode(text))
      write('event: ready\ndata: {}\n\n')

      const unsubscribers: Array<() => void> = []

      const onTick = (tick: PriceTick) => {
        write(`event: tick\ndata: ${JSON.stringify(tick)}\n\n`)
      }

      for (const symbol of symbols) {
        const sub = PriceHub.subscribe(broker, symbol, onTick)
        unsubscribers.push(sub.unsubscribe)
      }

      const keepAlive = setInterval(() => {
        write(`event: ping\ndata: ${Date.now()}\n\n`)
      }, keepAliveMs)

      const abort = () => {
        clearInterval(keepAlive)
        for (const u of unsubscribers) u()
        try {
          controller.close()
        } catch {
          // ignore
        }
      }

      // Abort on client disconnect.
      req.signal.addEventListener('abort', abort, { once: true })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}

