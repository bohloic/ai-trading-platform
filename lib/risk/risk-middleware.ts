export class RiskBlockedError extends Error {
  readonly name = 'RiskBlockedError'
  readonly code = 'RISK_BLOCKED'
  constructor(message: string) {
    super(message)
  }
}

export function assertNotionalWithinMaxPct(params: {
  equity: number
  maxPct: number
  qty: number
  markPrice: number
}): void {
  const { equity, maxPct, qty, markPrice } = params

  if (!Number.isFinite(equity) || equity <= 0) throw new Error('Invalid equity')
  if (!Number.isFinite(maxPct) || maxPct <= 0 || maxPct >= 1) throw new Error('Invalid maxPct')
  if (!Number.isFinite(qty) || qty <= 0) throw new Error('Invalid qty')
  if (!Number.isFinite(markPrice) || markPrice <= 0) throw new Error('Invalid markPrice')

  const notional = qty * markPrice
  const maxNotional = equity * maxPct
  if (notional > maxNotional) {
    throw new RiskBlockedError(`Trade blocked by risk: notional ${notional} > max ${maxNotional}`)
  }
}

