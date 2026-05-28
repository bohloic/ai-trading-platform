'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { trades, aiDecisions, aiLearningErrors, aiPatterns, brokerConnections, tradingSettings } from '@/lib/db/schema'
import { and, desc, eq, sql } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

// Trades
export async function getTrades() {
  const userId = await getUserId()
  return db
    .select()
    .from(trades)
    .where(eq(trades.userId, userId))
    .orderBy(desc(trades.createdAt))
    .limit(50)
}

export async function getOpenTrades() {
  const userId = await getUserId()
  return db
    .select()
    .from(trades)
    .where(and(eq(trades.userId, userId), eq(trades.status, 'open')))
    .orderBy(desc(trades.openedAt))
}

// AI Decisions
export async function getRecentDecisions() {
  const userId = await getUserId()
  return db
    .select()
    .from(aiDecisions)
    .where(eq(aiDecisions.userId, userId))
    .orderBy(desc(aiDecisions.createdAt))
    .limit(20)
}

// AI Learning Errors
export async function getLearningErrors() {
  const userId = await getUserId()
  return db
    .select()
    .from(aiLearningErrors)
    .where(eq(aiLearningErrors.userId, userId))
    .orderBy(desc(aiLearningErrors.createdAt))
    .limit(20)
}

// AI Patterns
export async function getPatterns() {
  const userId = await getUserId()
  return db
    .select()
    .from(aiPatterns)
    .where(eq(aiPatterns.userId, userId))
    .orderBy(desc(aiPatterns.successRate))
}

// Broker Connections
export async function getBrokerConnections() {
  const userId = await getUserId()
  return db
    .select()
    .from(brokerConnections)
    .where(eq(brokerConnections.userId, userId))
    .orderBy(desc(brokerConnections.createdAt))
}

export async function addBrokerConnection(data: {
  broker: string
  apiKey?: string
  apiSecret?: string
  isDemo?: boolean
}) {
  const userId = await getUserId()
  await db.insert(brokerConnections).values({
    userId,
    broker: data.broker,
    apiKey: data.apiKey,
    apiSecret: data.apiSecret,
    isDemo: data.isDemo ?? true,
    isActive: true,
  })
  revalidatePath('/')
}

export async function deleteBrokerConnection(id: number) {
  const userId = await getUserId()
  await db.delete(brokerConnections).where(
    and(eq(brokerConnections.id, id), eq(brokerConnections.userId, userId))
  )
  revalidatePath('/')
}

export async function emergencyStop() {
  const userId = await getUserId()

  // 1) Disable auto trading for the user
  const existingSettings = await getTradingSettings()
  if (existingSettings) {
    await db
      .update(tradingSettings)
      .set({ autoTrade: false, updatedAt: new Date() })
      .where(eq(tradingSettings.userId, userId))
  }

  // 2) Deactivate all broker connections (prevents placing new orders via UI/routes)
  await db
    .update(brokerConnections)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(brokerConnections.userId, userId))

  revalidatePath('/')
  return { ok: true }
}

// Trading Settings
export async function getTradingSettings() {
  const userId = await getUserId()
  const [settings] = await db
    .select()
    .from(tradingSettings)
    .where(eq(tradingSettings.userId, userId))
    .limit(1)
  return settings
}

export async function updateTradingSettings(data: {
  riskPerTrade?: string
  maxDailyLoss?: string
  maxOpenTrades?: number
  defaultLeverage?: number
  tradingPairs?: string[]
  aiAggressiveness?: string
  autoTrade?: boolean
  notificationsEnabled?: boolean
}) {
  const userId = await getUserId()
  
  const existingSettings = await getTradingSettings()
  
  if (existingSettings) {
    await db
      .update(tradingSettings)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(tradingSettings.userId, userId))
  } else {
    await db.insert(tradingSettings).values({
      userId,
      ...data,
    })
  }
  revalidatePath('/')
}

// Stats
export async function getTradeStats() {
  const userId = await getUserId()
  
  const [stats] = await db
    .select({
      totalTrades: sql<number>`count(*)`,
      winningTrades: sql<number>`count(*) filter (where ${trades.pnl}::numeric > 0)`,
      losingTrades: sql<number>`count(*) filter (where ${trades.pnl}::numeric < 0)`,
      totalPnl: sql<string>`coalesce(sum(${trades.pnl}::numeric), 0)`,
      avgPnlPercent: sql<string>`coalesce(avg(${trades.pnlPercent}::numeric), 0)`,
    })
    .from(trades)
    .where(and(eq(trades.userId, userId), eq(trades.status, 'closed')))

  const [errorStats] = await db
    .select({
      totalErrors: sql<number>`count(*)`,
      avgSeverity: sql<string>`coalesce(avg(${aiLearningErrors.errorSeverity}), 0)`,
    })
    .from(aiLearningErrors)
    .where(eq(aiLearningErrors.userId, userId))

  return {
    totalTrades: Number(stats?.totalTrades ?? 0),
    winningTrades: Number(stats?.winningTrades ?? 0),
    losingTrades: Number(stats?.losingTrades ?? 0),
    totalPnl: parseFloat(stats?.totalPnl ?? '0'),
    avgPnlPercent: parseFloat(stats?.avgPnlPercent ?? '0'),
    winRate: stats?.totalTrades ? (Number(stats.winningTrades) / Number(stats.totalTrades)) * 100 : 0,
    totalErrors: Number(errorStats?.totalErrors ?? 0),
    avgErrorSeverity: parseFloat(errorStats?.avgSeverity ?? '0'),
  }
}
