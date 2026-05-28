export type BrokerName = 'bybit' | 'deriv'

export type PriceTick = {
  broker: BrokerName
  symbol: string
  price: number
  ts: number
}

export type AccountEquity = {
  equity: number
  currency: string
}

export type NewOrder = {
  symbol: string
  side: 'buy' | 'sell'
  qty: number
  type: 'market' | 'limit'
  price?: number
  stopLoss?: number
  takeProfit?: number
  leverage?: number
}

export type OrderResult = {
  brokerOrderId: string
  raw?: unknown
}

export type PriceSubscription = {
  close: () => void
}

export interface BrokerAdapter {
  name: BrokerName
  getEquity(): Promise<AccountEquity>
  placeOrder(order: NewOrder): Promise<OrderResult>
  subscribePrices(params: {
    symbols: string[]
    onTick: (tick: PriceTick) => void
    onError?: (err: unknown) => void
  }): Promise<PriceSubscription>
}

