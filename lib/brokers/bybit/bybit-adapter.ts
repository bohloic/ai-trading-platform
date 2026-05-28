import type { BrokerAdapter, AccountEquity, NewOrder, OrderResult, PriceSubscription, PriceTick } from '@/lib/brokers/types'
import { BybitRestClient } from '@/lib/brokers/bybit/bybit-rest'
import { subscribeBybitTickers } from '@/lib/brokers/bybit/bybit-ws'

type BybitApiResponse<T> = {
  retCode: number
  retMsg: string
  result?: T
}

export class BybitAdapter implements BrokerAdapter {
  name = 'bybit' as const
  private readonly rest = new BybitRestClient()

  async getEquity(): Promise<AccountEquity> {
    const res = await this.rest.request<
      BybitApiResponse<{
        list?: Array<{ totalEquity?: string; coin?: unknown; accountType?: string }>
      }>
    >({
      method: 'GET',
      path: '/v5/account/wallet-balance',
      query: { accountType: 'UNIFIED' },
    })

    if (res.retCode !== 0) throw new Error(`Bybit getEquity failed: ${res.retMsg}`)
    const equityStr = res.result?.list?.[0]?.totalEquity
    const equity = equityStr ? Number(equityStr) : NaN
    if (!Number.isFinite(equity)) throw new Error('Bybit getEquity: invalid equity')
    return { equity, currency: 'USDT' }
  }

  async placeOrder(order: NewOrder): Promise<OrderResult> {
    const side = order.side === 'buy' ? 'Buy' : 'Sell'
    const type = order.type === 'market' ? 'Market' : 'Limit'

    const res = await this.rest.request<
      BybitApiResponse<{
        orderId?: string
      }>
    >({
      method: 'POST',
      path: '/v5/order/create',
      body: {
        category: 'linear',
        symbol: order.symbol.replace('/', '').toUpperCase(),
        side,
        orderType: type,
        qty: order.qty.toString(),
        ...(order.type === 'limit' && order.price ? { price: order.price.toString() } : {}),
        ...(order.takeProfit ? { takeProfit: order.takeProfit.toString() } : {}),
        ...(order.stopLoss ? { stopLoss: order.stopLoss.toString() } : {}),
      },
    })

    if (res.retCode !== 0) throw new Error(`Bybit placeOrder failed: ${res.retMsg}`)
    const orderId = res.result?.orderId
    if (!orderId) throw new Error('Bybit placeOrder: missing orderId')
    return { brokerOrderId: orderId, raw: res }
  }

  async subscribePrices(params: {
    symbols: string[]
    onTick: (tick: PriceTick) => void
    onError?: (err: unknown) => void
  }): Promise<PriceSubscription> {
    // subscribeBybitTickers emits ticks with broker: 'bybit', which satisfies PriceTick.
    // We cast the onTick wrapper explicitly instead of using `as any`.
    const sub = subscribeBybitTickers({
      symbols: params.symbols,
      onTick: (tick) => params.onTick(tick as PriceTick),
      onError: params.onError,
    })
    return sub
  }
}
