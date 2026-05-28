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

const running: Map<RunningKey, ConnectorHandle> =
  globalThis.__priceConnectors__ ?? new Map()
globalThis.__priceConnectors__ = running

function key(broker: BrokerName, symbol: string): RunningKey {
  return `${broker}:${symbol}`
}

export async function ensurePriceStream(params: {
  broker: BrokerName
  symbols: string[]
}): Promise<void> {
  // Only skip on Vercel production (serverless — no persistent WS).
  // Local NODE_ENV=production (e.g. `next build && next start`) is allowed.
  if (process.env.VERCEL === '1') return

  const adapter = getBrokerAdapter(params.broker)
  const toStart = params.symbols.filter((s) => !running.has(key(params.broker, s)))
  if (toStart.length === 0) return

  const sub = await adapter.subscribePrices({
    symbols: toStart,
    onTick: (tick) => PriceHub.publish(tick),
    onError: () => {
      // Swallow silently; consumers rely on stale prices or fail the risk check.
    },
  })

  // One subscription can cover many symbols; register a shared handle per symbol.
  const handle: ConnectorHandle = { close: () => sub.close() }
  for (const s of toStart) running.set(key(params.broker, s), handle)
}

export function stopPriceStream(params: {
  broker: BrokerName
  symbols: string[]
}): void {
  const closed = new Set<ConnectorHandle>()
  for (const symbol of params.symbols) {
    const k = key(params.broker, symbol)
    const handle = running.get(k)
    if (handle && !closed.has(handle)) {
      handle.close()
      closed.add(handle)
    }
    running.delete(k)
  }
}
