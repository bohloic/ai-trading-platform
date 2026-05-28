import type { PriceTick } from '@/lib/brokers/types'
import { getDerivEnv } from '@/lib/brokers/deriv/env'

type DerivWsClientOptions = {
  onError?: (err: unknown) => void
}

type DerivAuthorizeResponse = {
  msg_type?: 'authorize'
  authorize?: { currency?: string; is_virtual?: number }
  error?: { message?: string }
}

type DerivBalanceResponse = {
  msg_type?: 'balance'
  balance?: { balance?: number; currency?: string }
  error?: { message?: string }
}

type DerivTicksResponse = {
  msg_type?: 'tick'
  tick?: { quote?: number; symbol?: string; epoch?: number }
  subscription?: { id?: string }
  error?: { message?: string }
}

type DerivBuyResponse = {
  msg_type?: 'buy'
  buy?: { contract_id?: number }
  error?: { message?: string }
}

export class DerivWsClient {
  private ws: WebSocket | null = null
  private readonly onError?: (err: unknown) => void
  private pending = new Map<string, (data: unknown) => void>()

  constructor(opts: DerivWsClientOptions = {}) {
    this.onError = opts.onError
  }

  async connect(): Promise<void> {
    if (this.ws) return
    const env = getDerivEnv()
    const url = `wss://ws.derivws.com/websockets/v3?app_id=${encodeURIComponent(env.DERIV_APP_ID)}`
    const ws = new WebSocket(url)
    this.ws = ws

    ws.addEventListener('message', (ev) => {
      try {
        const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : '')
        const reqId: unknown = msg?.req_id
        if (typeof reqId === 'string') {
          const cb = this.pending.get(reqId)
          if (cb) {
            this.pending.delete(reqId)
            cb(msg)
            return
          }
        }
      } catch (err) {
        this.onError?.(err)
      }
    })

    ws.addEventListener('error', (ev) => this.onError?.(ev))

    await new Promise<void>((resolve, reject) => {
      const onOpen = () => {
        ws.removeEventListener('open', onOpen)
        resolve()
      }
      const onClose = () => {
        ws.removeEventListener('close', onClose)
        reject(new Error('Deriv WS closed before open'))
      }
      ws.addEventListener('open', onOpen)
      ws.addEventListener('close', onClose, { once: true })
    })
  }

  close(): void {
    try {
      this.ws?.close()
    } finally {
      this.ws = null
      this.pending.clear()
    }
  }

  private sendRaw(payload: Record<string, unknown>): void {
    if (!this.ws) throw new Error('Deriv WS not connected')
    this.ws.send(JSON.stringify(payload))
  }

  request<T>(payload: Record<string, unknown>): Promise<T> {
    const reqId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
    return new Promise<T>((resolve) => {
      this.pending.set(reqId, (data) => resolve(data as T))
      this.sendRaw({ ...payload, req_id: reqId })
    })
  }

  async authorize(): Promise<DerivAuthorizeResponse> {
    const env = getDerivEnv()
    return this.request<DerivAuthorizeResponse>({ authorize: env.DERIV_TOKEN })
  }

  async getBalance(): Promise<DerivBalanceResponse> {
    return this.request<DerivBalanceResponse>({ balance: 1, subscribe: 0 })
  }

  subscribeTicks(params: {
    symbols: string[]
    onTick: (tick: PriceTick) => void
    onError?: (err: unknown) => void
  }): { close: () => void } {
    if (!this.ws) throw new Error('Deriv WS not connected')
    const ws = this.ws

    const subscriptions = new Set<string>()
    const handler = (ev: MessageEvent) => {
      try {
        const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : '') as DerivTicksResponse
        if (msg.error?.message) return
        if (msg.msg_type !== 'tick') return
        const q = msg.tick?.quote
        const symbol = msg.tick?.symbol
        const epoch = msg.tick?.epoch
        if (typeof q !== 'number' || typeof symbol !== 'string') return
        const ts = typeof epoch === 'number' ? epoch * 1000 : Date.now()
        params.onTick({ broker: 'deriv', symbol, price: q, ts })
      } catch (err) {
        params.onError?.(err)
      }
    }

    ws.addEventListener('message', handler)

    for (const symbol of params.symbols) {
      subscriptions.add(symbol)
      this.sendRaw({ ticks: symbol, subscribe: 1 })
    }

    return {
      close: () => {
        ws.removeEventListener('message', handler)
        for (const symbol of subscriptions) {
          try {
            this.sendRaw({ forget_all: 'ticks' })
          } catch {
            // ignore
          }
        }
      },
    }
  }

  async buyContract(params: {
    price: number
    parameters: Record<string, unknown>
  }): Promise<DerivBuyResponse> {
    return this.request<DerivBuyResponse>({
      buy: params.price,
      parameters: params.parameters,
    })
  }
}

