import type { BrokerName } from '@/lib/brokers/types'
import { getBrokerAdapter } from '@/lib/brokers/factory'
import { PriceHub } from '@/lib/prices/price-hub'

type RunningKey = `${BrokerName}:${string}`

type ConnectorHandle = {
  close: () => void
}

declare global {
  // eslint-disable-next-line no-var
  var __priceConnectors__: Map<RunningKey, ConnectorHandle> | undefined
}

const running: Map<RunningKey, ConnectorHandle> = globalThis.__priceConnectors__ ?? new Map()
globalThis.__priceConnectors__ = running

function key(broker: BrokerName, symbol: string): RunningKey {
  return `${broker}:${symbol}`
}

export async function ensurePriceStream(params: { broker: BrokerName; symbols: string[] }): Promise<void> {
  // Vercel serverless is not reliable for long-running outbound WebSockets.
  // In production deployments, prefer client-side streams or a dedicated worker.
  if (process.env.VERCEL === '1' || process.env.NODE_ENV === 'production') return

  const adapter = getBrokerAdapter(params.broker)
  const toStart = params.symbols.filter((s) => !running.has(key(params.broker, s)))
  if (toStart.length === 0) return

  const sub = await adapter.subscribePrices({
    symbols: toStart,
    onTick: (tick) => PriceHub.publish(tick),
    onError: () => {
      // intentionally swallow; consumers will rely on stale prices or fail risk check
    },
  })

  // One subscription can cover many symbols; register a shared handle for each started symbol.
  const handle: ConnectorHandle = { close: () => sub.close() }
  for (const s of toStart) running.set(key(params.broker, s), handle)
}

