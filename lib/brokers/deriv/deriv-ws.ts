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
  req_id?: string
}

type DerivBuyResponse = {
  msg_type?: 'buy'
  buy?: { contract_id?: number }
  error?: { message?: string }
}

export class DerivWsClient {
  private ws: WebSocket | null = null
  private readonly onError?: (err: unknown) => void
  // pending: req_id -> resolver for request/response pairs
  private pending = new Map<string, (data: unknown) => void>()
  // tickHandlers: registered listeners for streaming tick messages
  private tickHandlers = new Set<(msg: DerivTicksResponse) => void>()

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
        const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : '') as DerivTicksResponse

        // 1. If the message has a req_id that matches a pending request, resolve it.
        const reqId = msg?.req_id
        if (typeof reqId === 'string') {
          const cb = this.pending.get(reqId)
          if (cb) {
            this.pending.delete(reqId)
            cb(msg)
            // Do NOT return here — a tick subscribe confirmation can carry both
            // a req_id and a msg_type:'tick' simultaneously on first response.
          }
        }

        // 2. Route tick messages to all registered tick handlers.
        // This runs independently of the req_id routing above so ticks are
        // never silently dropped because they lack a req_id.
        if (msg?.msg_type === 'tick') {
          for (const handler of this.tickHandlers) {
            handler(msg)
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
      this.tickHandlers.clear()
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

    const handler = (msg: DerivTicksResponse) => {
      try {
        if (msg.error?.message) return
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

    this.tickHandlers.add(handler)

    // Subscribe to each symbol — one message per symbol.
    for (const symbol of params.symbols) {
      this.sendRaw({ ticks: symbol, subscribe: 1 })
    }

    return {
      close: () => {
        this.tickHandlers.delete(handler)
        // Send forget_all once — not once per symbol.
        try {
          this.sendRaw({ forget_all: 'ticks' })
        } catch {
          // ignore if WS already closed
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
