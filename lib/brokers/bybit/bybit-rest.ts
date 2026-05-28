import crypto from 'node:crypto'
import { getBybitEnv } from '@/lib/brokers/bybit/env'

type HttpMethod = 'GET' | 'POST'

type BybitRestOptions = {
  method: HttpMethod
  path: string
  query?: Record<string, string>
  body?: Record<string, unknown>
}

function toQueryString(query: Record<string, string> | undefined): string {
  if (!query) return ''
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) params.set(k, v)
  const str = params.toString()
  return str ? `?${str}` : ''
}

export class BybitRestClient {
  private readonly key: string
  private readonly secret: string
  private readonly recvWindowMs: number
  private readonly baseUrl: string

  constructor() {
    const env = getBybitEnv()
    this.key = env.BYBIT_API_KEY
    this.secret = env.BYBIT_API_SECRET
    this.recvWindowMs = env.BYBIT_RECV_WINDOW_MS
    this.baseUrl = env.BYBIT_TESTNET ? 'https://api-testnet.bybit.com' : 'https://api.bybit.com'
  }

  private sign(payload: string): string {
    return crypto.createHmac('sha256', this.secret).update(payload).digest('hex')
  }

  async request<T>(opts: BybitRestOptions): Promise<T> {
    const ts = Date.now().toString()
    const recvWindow = this.recvWindowMs.toString()
    const body = opts.body ? JSON.stringify(opts.body) : ''
    const queryString = toQueryString(opts.query)

    // Bybit v5 signing: sign = HMAC_SHA256(secret, timestamp + apiKey + recvWindow + body)
    // Some endpoints also include query in signature; to stay compatible with common implementations,
    // include query for GET requests by signing the queryString (without leading '?') as body substitute.
    const signingBody =
      opts.method === 'GET' ? (queryString.startsWith('?') ? queryString.slice(1) : queryString) : body
    const signaturePayload = `${ts}${this.key}${recvWindow}${signingBody}`
    const sign = this.sign(signaturePayload)

    const url = `${this.baseUrl}${opts.path}${queryString}`

    const res = await fetch(url, {
      method: opts.method,
      headers: {
        'Content-Type': 'application/json',
        'X-BAPI-API-KEY': this.key,
        'X-BAPI-SIGN': sign,
        'X-BAPI-SIGN-TYPE': '2',
        'X-BAPI-TIMESTAMP': ts,
        'X-BAPI-RECV-WINDOW': recvWindow,
      },
      body: opts.method === 'POST' ? body : undefined,
      cache: 'no-store',
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Bybit REST error: ${res.status} ${res.statusText} ${text}`)
    }

    const json: unknown = await res.json()
    return json as T
  }
}

