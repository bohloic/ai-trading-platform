import type { BrokerName, PriceTick } from '@/lib/brokers/types'

type Listener = (tick: PriceTick) => void

type SymbolKey = `${BrokerName}:${string}`

function keyFor(broker: BrokerName, symbol: string): SymbolKey {
  return `${broker}:${symbol}`
}

class PriceHubImpl {
  private last = new Map<SymbolKey, PriceTick>()
  private listeners = new Map<SymbolKey, Set<Listener>>()

  publish(tick: PriceTick): void {
    const key = keyFor(tick.broker, tick.symbol)
    this.last.set(key, tick)
    const ls = this.listeners.get(key)
    if (!ls) return
    for (const fn of ls) fn(tick)
  }

  getLastTick(broker: BrokerName, symbol: string): PriceTick | null {
    return this.last.get(keyFor(broker, symbol)) ?? null
  }

  getMarkPrice(broker: BrokerName, symbol: string): number {
    const last = this.getLastTick(broker, symbol)
    if (!last) throw new Error(`No price available for ${broker}:${symbol}`)
    return last.price
  }

  subscribe(broker: BrokerName, symbol: string, listener: Listener): { unsubscribe: () => void } {
    const key = keyFor(broker, symbol)
    let set = this.listeners.get(key)
    if (!set) {
      set = new Set()
      this.listeners.set(key, set)
    }
    set.add(listener)
    return {
      unsubscribe: () => {
        const current = this.listeners.get(key)
        if (!current) return
        current.delete(listener)
        if (current.size === 0) this.listeners.delete(key)
      },
    }
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __priceHub__: PriceHubImpl | undefined
}

export const PriceHub: PriceHubImpl = globalThis.__priceHub__ ?? new PriceHubImpl()
globalThis.__priceHub__ = PriceHub

