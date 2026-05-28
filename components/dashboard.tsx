'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { signOut } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'
import { TrendingUp, TrendingDown, Activity, Brain, AlertTriangle, Settings, LogOut, Wallet, BarChart3, LineChart } from 'lucide-react'
import { TradesPanel } from './trades-panel'
import { AILearningPanel } from './ai-learning-panel'
import { BrokersPanel } from './brokers-panel'
import { SettingsPanel } from './settings-panel'
import { TradingViewPanel } from './tradingview-panel'
import { EmergencyStopButton } from './emergency-stop-button'
import { getTradeStats, getOpenTrades, getLearningErrors, getBrokerConnections } from '@/app/actions/trading'

interface DashboardProps {
  user: {
    id: string
    name: string
    email: string
  }
}

export function Dashboard({ user }: DashboardProps) {
  const router = useRouter()
  const [stats, setStats] = useState({
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    totalPnl: 0,
    avgPnlPercent: 0,
    winRate: 0,
    totalErrors: 0,
    avgErrorSeverity: 0,
  })
  const [openTrades, setOpenTrades] = useState<any[]>([])
  const [errors, setErrors] = useState<any[]>([])
  const [brokers, setBrokers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
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
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user.name}
            </span>
            <EmergencyStopButton />
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Deconnexion
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
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
              <p className="text-2xl font-bold text-foreground">{stats.totalTrades}</p>
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
              <p className={`text-2xl font-bold ${stats.winRate >= 50 ? 'text-green-500' : 'text-red-500'}`}>
                {stats.winRate.toFixed(1)}%
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
              <p className={`text-2xl font-bold ${stats.totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {stats.totalPnl >= 0 ? '+' : ''}{stats.totalPnl.toFixed(2)}$
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
              <p className="text-2xl font-bold text-foreground">{stats.totalErrors}</p>
              <p className="text-xs text-muted-foreground">
                Severite moy: {stats.avgErrorSeverity.toFixed(1)}/10
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Open Positions Alert */}
        {openTrades.length > 0 && (
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
                  <div
                    key={trade.id}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                      trade.side === 'buy'
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
