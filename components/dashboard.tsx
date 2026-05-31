"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { signOut } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Brain,
  AlertTriangle,
  Settings,
  LogOut,
  Wallet,
  BarChart3,
  LineChart,
} from 'lucide-react'
import { TradesPanel } from './trades-panel'
import { AILearningPanel } from './ai-learning-panel'
import { BrokersPanel } from './brokers-panel'
import { SettingsPanel } from './settings-panel'
import { TradingViewPanel } from './tradingview-panel'
import { EmergencyStopButton } from './emergency-stop-button'
import {
  getTradeStats,
  getOpenTrades,
  getLearningErrors,
  getBrokerConnections,
} from '@/app/actions/trading'

interface DashboardProps {
  user: {
    id: string
    name: string
    email: string
  }
}

type Stats = {
  totalTrades: number
  winningTrades: number
  losingTrades: number
  totalPnl: number
  avgPnlPercent: number
  winRate: number
  totalErrors: number
  avgErrorSeverity: number
}

export function Dashboard({ user }: DashboardProps) {
  const router = useRouter()
  const [stats, setStats] = useState<Stats>({
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    totalPnl: 0,
    avgPnlPercent: 0,
    winRate: 0,
    totalErrors: 0,
    avgErrorSeverity: 0,
  })
  const [openTrades, setOpenTrades] = useState<
    { id: number; symbol: string; side: string; entryPrice: string }[]
  >([])
  const [errors, setErrors] = useState<
    {
      id: number
      errorType: string
      errorSeverity: number | null
      whatWentWrong: string
      lessonLearned: string
      correctionApplied: string | null
      timesRepeated: number | null
    }[]
  >([])
  const [brokers, setBrokers] = useState<
    {
      id: number
      broker: string
      isDemo: boolean | null
      isActive: boolean | null
      createdAt: Date
    }[]
  >([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const [statsData, tradesData, errorsData, brokersData] = await Promise.all([
          getTradeStats(),
          getOpenTrades(),
          getLearningErrors(),
          getBrokerConnections(),
        ])
        setStats(statsData)
        setOpenTrades(tradesData)
        setErrors(errorsData)
        setBrokers(brokersData)
        setLoadError(null)
      } catch (error) {
        console.error('Failed to load data:', error)
        setLoadError('Impossible de charger les donnees. Verifiez votre connexion.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // BRANCHEMENT DIRECT DU MOTEUR DE PRODUCTION PPO (FASTAPI WEBSOCKET)
  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_BACKEND_URL || "ws://127.0.0.1:8000/ws/frontend-dashboard"
    const tradingSocket = new WebSocket(wsUrl)

    tradingSocket.onopen = () => {
      console.log('[FRONTEND] Liaison active avec le moteur de trading FastAPI.')
    }

    tradingSocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)

        // Traitement des mises à jour d'ordres envoyées par l'IA
        if (message.type === "ORDER_EXECUTED") {
          // 1. Ajout dynamique de la nouvelle position ouverte dans l'alerte
          setOpenTrades((prevOpenTrades) => [
            {
              id: message.order_id || Date.now(),
              symbol: "R_75", // Symbole de l'indice synthétique Deriv par défaut
              side: message.action.toLowerCase(),
              entryPrice: message.price.toFixed(4)
            },
            ...prevOpenTrades
          ])

          // 2. Recalcul instantané des statistiques globales du Dashboard
          setStats((prevStats) => {
            const isWin = message.action.toUpperCase() === "BUY" // Hypothèse ou calcul de la métrique
            const newTotalTrades = prevStats.totalTrades + 1
            const newWinningTrades = isWin ? prevStats.winningTrades + 1 : prevStats.winningTrades
            const newLosingTrades = !isWin ? prevStats.losingTrades + 1 : prevStats.losingTrades

            return {
              ...prevStats,
              totalTrades: newTotalTrades,
              winningTrades: newWinningTrades,
              losingTrades: newLosingTrades,
              totalPnl: message.balance - 10000.0, // Évolution par rapport au capital de départ
              winRate: (newWinningTrades / newTotalTrades) * 100
            }
          })
        }

        // Traitement optionnel des flux de marché pour vos graphiques
        if (message.type === "MARKET_UPDATE") {
          // Si vous possédez un state local pour le prix courant, mettez-le à jour ici
        }

      } catch (err) {
        console.error('[FRONTEND] Erreur lors du parsing des données WebSocket:', err)
      }
    }

    tradingSocket.onerror = (error) => {
      console.error('[FRONTEND] Erreur de canal WebSocket:', error)
    }

    tradingSocket.onclose = () => {
      console.log('[FRONTEND] Connexion déconnectée du serveur de signaux.')
    }

    // Coupure propre de l'écoute si l'utilisateur change de page
    return () => {
      tradingSocket.close()
    }
  }, [])

  const handleSignOut = async () => {
    await signOut()
    router.push('/sign-in')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Brain className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-semibold text-foreground">AI Trading Bot</h1>
              <p className="text-xs text-muted-foreground">Apprentissage continu</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">{user.name}</span>
            <EmergencyStopButton />
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Deconnexion
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Load error banner */}
        {loadError && (
          <div className="mb-6 p-4 rounded-lg border border-destructive/50 bg-destructive/5 text-destructive text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {loadError}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Total Trades
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">
                {loading ? '—' : stats.totalTrades}
              </p>
              <p className="text-xs text-muted-foreground">
                {stats.winningTrades} gagnants / {stats.losingTrades} perdants
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Win Rate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p
                className={`text-2xl font-bold ${loading ? 'text-muted-foreground' : stats.winRate >= 50 ? 'text-green-500' : 'text-red-500'
                  }`}
              >
                {loading ? '—' : `${stats.winRate.toFixed(1)}%`}
              </p>
              <p className="text-xs text-muted-foreground">Taux de reussite</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                PnL Total
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p
                className={`text-2xl font-bold ${loading ? 'text-muted-foreground' : stats.totalPnl >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}
              >
                {loading
                  ? '—'
                  : `${stats.totalPnl >= 0 ? '+' : ''}${stats.totalPnl.toFixed(2)}$`}
              </p>
              <p className="text-xs text-muted-foreground">Profit/Perte</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Erreurs IA
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">
                {loading ? '—' : stats.totalErrors}
              </p>
              <p className="text-xs text-muted-foreground">
                Severite moy: {stats.avgErrorSeverity.toFixed(1)}/10
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Open Positions Alert */}
        {!loading && openTrades.length > 0 && (
          <Card className="mb-6 border-yellow-500/50 bg-yellow-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-yellow-500" />
                {openTrades.length} Position{openTrades.length > 1 ? 's' : ''} Ouverte
                {openTrades.length > 1 ? 's' : ''}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {openTrades.map((trade) => (
                  <div
                    key={trade.id}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium ${trade.side === 'buy'
                      ? 'bg-green-500/10 text-green-500'
                      : 'bg-red-500/10 text-red-500'
                      }`}
                  >
                    {trade.symbol} {trade.side.toUpperCase()} @ {trade.entryPrice}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Tabs */}
        <Tabs defaultValue="trades" className="space-y-4">
          <TabsList className="grid grid-cols-5 w-full max-w-2xl">
            <TabsTrigger value="trades" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Trades</span>
            </TabsTrigger>
            <TabsTrigger value="learning" className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              <span className="hidden sm:inline">IA</span>
            </TabsTrigger>
            <TabsTrigger value="brokers" className="flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              <span className="hidden sm:inline">Brokers</span>
            </TabsTrigger>
            <TabsTrigger value="markets" className="flex items-center gap-2">
              <LineChart className="w-4 h-4" />
              <span className="hidden sm:inline">Marches</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Config</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trades">
            <TradesPanel />
          </TabsContent>

          <TabsContent value="learning">
            <AILearningPanel errors={errors} />
          </TabsContent>

          <TabsContent value="brokers">
            <BrokersPanel brokers={brokers} />
          </TabsContent>

          <TabsContent value="markets">
            <TradingViewPanel />
          </TabsContent>

          <TabsContent value="settings">
            <SettingsPanel />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}