import { z } from 'zod'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { getBrokerAdapter } from '@/lib/brokers/factory'
import type { BrokerName } from '@/lib/brokers/types'
import { PriceHub } from '@/lib/prices/price-hub'
import { ensurePriceStream } from '@/lib/prices/connectors'
import { assertNotionalWithinMaxPct, RiskBlockedError } from '@/lib/risk/risk-middleware'
import { getDb } from '@/lib/db'
import { brokerConnections, trades, tradingSettings } from '@/lib/db/schema'
import { and, eq, sql } from 'drizzle-orm'
import { McKinney } from '@/lib/env'

const bodySchema = z.object({
  broker: z.enum(['bybit', 'deriv']),
  symbol: z.string().min(1),
  side: z.enum(['buy', 'sell']),
  qty: z.number().positive(),
  type: z.enum(['market', 'limit']).default('market'),
  price: z.number().positive().optional(),
  stopLoss: z.number().positive().optional(),
  takeProfit: z.number().positive().optional(),
  leverage: z.number().int().positive().optional(),
})

function getMaxTradePct(): number {
  return McKinney().RISK_MAX_TRADE_PCT
}

async function getUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) throw new Error('Unauthorized')
  return session.user.id
}

export const runtime = 'nodejs'

export async function POST(req: Request): Promise<Response> {
  let userId: string
  try {
    userId = await getUserId()
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const json: unknown = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return Response.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 })
  }

  const input = parsed.data
  const broker = input.broker as BrokerName
  const db = getDb()

  // Kill switch: refuse if autoTrade is disabled
  const [settings] = await db
    .select()
    .from(tradingSettings)
    .where(eq(tradingSettings.userId, userId))
    .limit(1)

  if (!settings?.autoTrade) {
    return Response.json({ error: 'AUTO_TRADE_DISABLED' }, { status: 409 })
  }

  // Ensure the user has an active broker connection
  const [connection] = await db
    .select()
    .from(brokerConnections)
    .where(
      and(
        eq(brokerConnections.userId, userId),
        eq(brokerConnections.broker, broker),
        eq(brokerConnections.isActive, true)
      )
    )
    .limit(1)

  if (!connection) {
    return Response.json({ error: `No active broker connection for ${broker}` }, { status: 400 })
  }

  const adapter = getBrokerAdapter(broker)

  // Risk check: notional <= configured % of equity
  const equity = await adapter.getEquity()

  // Try to get a mark price from hub; if missing, start stream and re-check once.
  let markPrice: number
  try {
    markPrice = PriceHub.getMarkPrice(broker, input.symbol)
  } catch {
    await ensurePriceStream({ broker, symbols: [input.symbol] })
    const last = PriceHub.getLastTick(broker, input.symbol)
    if (last) markPrice = last.price
    else if (input.price) markPrice = input.price
    else return Response.json({ error: 'No mark price available for risk check' }, { status: 409 })
  }

  const maxPct = getMaxTradePct()
  try {
    assertNotionalWithinMaxPct({ equity: equity.equity, maxPct, qty: input.qty, markPrice })
  } catch (err) {
    if (err instanceof RiskBlockedError) {
      return Response.json({ error: err.code, message: err.message }, { status: 409 })
    }
    return Response.json({ error: 'Risk check failed' }, { status: 400 })
  }

  const orderResult = await adapter.placeOrder({
    symbol: input.symbol,
    side: input.side,
    qty: input.qty,
    type: input.type,
    price: input.price,
    stopLoss: input.stopLoss,
    takeProfit: input.takeProfit,
    leverage: input.leverage,
  })

  // Persist trade record
  const [created] = await db
    .insert(trades)
    .values({
      userId,
      brokerId: connection.id,
      symbol: input.symbol,
      side: input.side,
      entryPrice: sql`${markPrice}`,
      quantity: sql`${input.qty}`,
      leverage: input.leverage ?? 1,
      stopLoss: input.stopLoss ? sql`${input.stopLoss}` : null,
      takeProfit: input.takeProfit ? sql`${input.takeProfit}` : null,
      status: 'open',
    })
    .returning()

  return Response.json({
    ok: true,
    tradeId: created?.id ?? null,
    brokerOrderId: orderResult.brokerOrderId,
  })
}
