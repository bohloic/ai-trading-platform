import type { AccountEquity, BrokerAdapter, NewOrder, OrderResult, PriceSubscription } from '@/lib/brokers/types'
import { DerivWsClient } from '@/lib/brokers/deriv/deriv-ws'

export class DerivAdapter implements BrokerAdapter {
  name = 'deriv' as const

  async getEquity(): Promise<AccountEquity> {
    const client = new DerivWsClient()
    await client.connect()
    try {
      const auth = await client.authorize()
      if (auth.error?.message) throw new Error(`Deriv authorize failed: ${auth.error.message}`)

      const bal = await client.getBalance()
      if (bal.error?.message) throw new Error(`Deriv balance failed: ${bal.error.message}`)

      const equity = bal.balance?.balance
      const currency = bal.balance?.currency
      if (typeof equity !== 'number' || !Number.isFinite(equity)) throw new Error('Deriv getEquity: invalid balance')
      if (typeof currency !== 'string' || currency.length === 0) throw new Error('Deriv getEquity: invalid currency')
      return { equity, currency }
    } finally {
      client.close()
    }
  }

  async placeOrder(order: NewOrder): Promise<OrderResult> {
    // MVP: Deriv “buy contract” requires product-specific parameters.
    // We map a basic CFD/Forex style order is not directly available; Deriv focuses on contracts.
    // For now, treat qty as “stake” and create a minimal CALL/PUT contract placeholder.
    const client = new DerivWsClient()
    await client.connect()
    try {
      const auth = await client.authorize()
      if (auth.error?.message) throw new Error(`Deriv authorize failed: ${auth.error.message}`)

      const contractType = order.side === 'buy' ? 'CALL' : 'PUT'
      const res = await client.buyContract({
        price: order.qty,
        parameters: {
          symbol: order.symbol,
          contract_type: contractType,
          duration: 1,
          duration_unit: 'm',
          basis: 'stake',
          currency: 'USD',
        },
      })
      if (res.error?.message) throw new Error(`Deriv buy failed: ${res.error.message}`)
      const id = res.buy?.contract_id
      if (typeof id !== 'number') throw new Error('Deriv placeOrder: missing contract_id')
      return { brokerOrderId: String(id), raw: res }
    } finally {
      client.close()
    }
  }

  async subscribePrices(params: {
    symbols: string[]
    onTick: (tick: { broker: 'deriv'; symbol: string; price: number; ts: number }) => void
    onError?: (err: unknown) => void
  }): Promise<PriceSubscription> {
    const client = new DerivWsClient({ onError: params.onError })
    await client.connect()
    const auth = await client.authorize()
    if (auth.error?.message) {
      client.close()
      throw new Error(`Deriv authorize failed: ${auth.error.message}`)
    }
    const sub = client.subscribeTicks({
      symbols: params.symbols,
      // On intercepte le tick global et on l'injecte dans ton handler spécifique
      onTick: (tick) => params.onTick(tick as any),
      onError: params.onError,
    })
    return {
      close: () => {
        sub.close()
        client.close()
      },
    }
  }
}

