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
  Coins
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
  
  // Rétablissement immédiat de la navigation de l'utilisateur (Côté client uniquement)
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem("dashboard_active_tab") || "trades"
    }
    return "trades"
  })
  
  const [currentCapital, setCurrentCapital] = useState<number>(10000.00)

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
  const [errors, setErrors] = useState<any[]>([])
  const [brokers, setBrokers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Fonction centrale d'interrogation de la télémétrie PostgreSQL (Drizzle)
  async function refreshDashboardData() {
    try {
      const [statsData, tradesData, errorsData, brokersData] = await Promise.all([
        getTradeStats(),
        getOpenTrades(),
        getLearningErrors(),
        getBrokerConnections(),
      ])
      
      if (statsData) {
        setStats(statsData)
        setCurrentCapital(10000.00 + statsData.totalPnl)
      }
      if (tradesData) setOpenTrades(tradesData)
      if (errorsData) setErrors(errorsData)
      
      // Sécurité anti-clignotement : On écrase l'état local uniquement si les données serveur sont valides
      if (brokersData) {
        setBrokers(brokersData)
      }
      
      setLoadError(null)
    } catch (error) {
      console.error('Failed to sync data with database:', error)
    } finally {
      setLoading(false)
    }
  }

  // Amorce de la télémétrie par pulsation synchrone toutes les 4s
  useEffect(() => {
    refreshDashboardData()
    const intervalId = setInterval(refreshDashboardData, 4000)
    return () => clearInterval(intervalId)
  }, [])

  // Canal de redondance pour l'écoute instantanée des flux WebSocket
  useEffect(() => {
    const rawUrl = process.env.NEXT_PUBLIC_WS_BACKEND_URL 
      ? process.env.NEXT_PUBLIC_WS_BACKEND_URL 
      : "wss://kemma23-ai-trading-backend.hf.space/ws/frontend-dashboard"

    const targetWs = rawUrl.includes("hf.space") && !rawUrl.includes("spaces.huggingface.tech")
      ? rawUrl.replace("kemma23-ai-trading-backend.hf.space", "spaces.huggingface.tech/kemma23/ai-trading-backend")
      : rawUrl

    let tradingSocket: WebSocket | null = null

    try {
      tradingSocket = new WebSocket(targetWs)
      tradingSocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          if (message.type === "ORDER_EXECUTED") {
            setOpenTrades((prevOpenTrades) => [
              {
                id: message.order_id || Date.now(),
                symbol: "R_75",
                side: message.action.toLowerCase(),
                entryPrice: message.price.toFixed(4)
              },
              ...prevOpenTrades
            ])

            if (message.balance) {
              setCurrentCapital(message.balance)
            }

            setStats((prevStats) => {
              const isWin = message.action.toUpperCase() === "BUY"
              const newTotalTrades = prevStats.totalTrades + 1
              const newWinningTrades = isWin ? prevStats.winningTrades + 1 : prevStats.winningTrades
              const newLosingTrades = !isWin ? prevStats.losingTrades + 1 : prevStats.losingTrades

              return {
                ...prevStats,
                totalTrades: newTotalTrades,
                winningTrades: newWinningTrades,
                losingTrades: newLosingTrades,
                totalPnl: message.balance - 10000.0,
                winRate: (newWinningTrades / newTotalTrades) * 100
              }
            })
          }
        } catch (err) {
          console.error('[FRONTEND] Erreur d\'interprétation du flux direct:', err)
        }
      }
    } catch (e) {
      console.error("[WEBSOCKET] Échec allocation instance réseau streaming :", e)
    }

    return () => {
      if (tradingSocket) tradingSocket.close()
    }
  }, [])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    localStorage.setItem("dashboard_active_tab", value)
  }

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
              Déconnexion
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {loadError && (
          <div className="mb-6 p-4 rounded-lg border border-destructive/50 bg-destructive/5 text-destructive text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {loadError}
          </div>
        )}

        {/* Grille de 5 Cartes de Statistiques avec intégration du Capital */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card className="col-span-2 md:col-span-1 bg-gradient-to-br from-primary/5 via-transparent to-transparent border-primary/20">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2 text-primary font-medium">
                <Coins className="w-4 h-4" />
                Capital Actif (Equity)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-black text-foreground">
                {loading ? '—' : `${currentCapital.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}$`}
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                Solde calculé en direct
              </p>
            </CardContent>
          </Card>

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
                {stats.winningTrades} g. / {stats.losingTrades} p.
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
              <p className={`text-2xl font-bold ${loading ? 'text-muted-foreground' : stats.winRate >= 50 ? 'text-green-500' : 'text-red-500'}`}>
                {loading ? '—' : `${stats.winRate.toFixed(1)}%`}
              </p>
              <p className="text-xs text-muted-foreground">Taux de réussite</p>
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
              <p className={`text-2xl font-bold ${loading ? 'text-muted-foreground' : stats.totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {loading ? '—' : `${stats.totalPnl >= 0 ? '+' : ''}${stats.totalPnl.toFixed(2)}$`}
              </p>
              <p className="text-xs text-muted-foreground">Profit Net / Perte</p>
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
                Sévérité moy: {stats.avgErrorSeverity ? stats.avgErrorSeverity.toFixed(1) : '0.0'}/10
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
                {openTrades.length} Position{openTrades.length > 1 ? 's' : ''} Ouverte{openTrades.length > 1 ? 's' : ''}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {openTrades.map((trade) => (
                  <div key={trade.id} className={`px-3 py-1.5 rounded-full text-xs font-medium ${trade.side === 'buy' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                    {trade.symbol} {trade.side.toUpperCase()} @ {trade.entryPrice}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
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
              <span className="hidden sm:inline">Marchés</span>
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