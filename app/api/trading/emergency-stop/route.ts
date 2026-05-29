import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { tradingConfig, auditLogs, brokerConnections, tradingSettings } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

export const runtime = 'nodejs'

/**
 * POST /api/trading/emergency-stop
 *
 * Arrêt d'urgence idempotent :
 *  1. Désactive autoTrade dans tradingConfig (source de vérité Serverless)
 *  2. Désactive autoTrade dans tradingSettings (compatibilité UI)
 *  3. Désactive toutes les connexions brokers actives
 *  4. Inscrit un log d'audit critique
 *
 * L'opération est idempotente : si autoTrade est déjà false,
 * aucun effet de bord n'est généré mais le log reste écrit.
 */
export async function POST(req: Request) {
  // Authentification
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const userId = session.user.id
  const db = getDb()

  try {
    // 1. Mise à jour atomique du shared state (tradingConfig)
    //    Upsert : crée l'enregistrement s'il n'existe pas encore
    await db
      .insert(tradingConfig)
      .values({ userId, autoTrade: false })
      .onConflictDoUpdate({
        target: tradingConfig.userId,
        set: { autoTrade: false, updatedAt: new Date() },
      })

    // 2. Synchronisation avec tradingSettings (source UI)
    await db
      .update(tradingSettings)
      .set({ autoTrade: false, updatedAt: new Date() })
      .where(eq(tradingSettings.userId, userId))

    // 3. Désactivation de toutes les connexions brokers actives
    //    Empêche tout nouvel ordre via l'API place-order
    await db
      .update(brokerConnections)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(brokerConnections.userId, userId))

    // 4. Log d'audit critique — immuable, non modifiable après insert
    const reqHeaders = await headers()
    await db.insert(auditLogs).values({
      action: 'EMERGENCY_STOP_TRIGGERED',
      userId,
      severity: 'critical',
      metadata: {
        ip: reqHeaders.get('x-forwarded-for') ?? req.headers.get('x-forwarded-for'),
        userAgent: reqHeaders.get('user-agent') ?? req.headers.get('user-agent'),
        timestamp: new Date().toISOString(),
      },
    })

    return NextResponse.json({
      ok: true,
      status: 'Emergency stop executed',
      userId,
      executedAt: new Date().toISOString(),
    })
  } catch (error) {
    // Log l'échec également pour traçabilité post-incident
    console.error('[EMERGENCY_STOP] Critical failure:', error)

    try {
      const reqHeaders = await headers()
      await db.insert(auditLogs).values({
        action: 'EMERGENCY_STOP_FAILED',
        userId,
        severity: 'critical',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          ip: reqHeaders.get('x-forwarded-for'),
        },
      })
    } catch {
      // Si même le log échoue, on ne peut rien faire de plus
    }

    return NextResponse.json(
      { error: 'Critical failure during emergency stop' },
      { status: 500 }
    )
  }
}
