'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { getTradingSettings, updateTradingSettings, getBrokerConnections } from '@/app/actions/trading'
import { Settings, Shield, Zap, Bell, CheckCircle, AlertTriangle, Info } from 'lucide-react'
import { toast } from 'sonner'

type SaveStatus = 'idle' | 'saving' | 'success' | 'error'

export function SettingsPanel() {
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [isSimulating, setIsSimulating] = useState(false)
  const [settings, setSettings] = useState({
    riskPerTrade: 2,
    maxDailyLoss: 5,
    maxOpenTrades: 3,
    defaultLeverage: 1,
    tradingPairs: ['BTC/USDT', 'ETH/USDT'],
    aiAggressiveness: 'moderate',
    autoTrade: false,
    notificationsEnabled: true,
  })

  // 1. Chargement des paramètres ET vérification du mode actif (Simulation vs Réel)
  useEffect(() => {
    async function load() {
      try {
        const [data, brokersData] = await Promise.all([
          getTradingSettings(),
          getBrokerConnections()
        ])

        // Vérifie si le seul canal actif ou si un canal de simulation est configuré
        const hasSimulation = brokersData?.some(b => b.broker === 'simulation' && b.isActive)
        setIsSimulating(!!hasSimulation)

        if (data) {
          setSettings({
            riskPerTrade: parseFloat(data.riskPerTrade || '0.02') * 100,
            maxDailyLoss: parseFloat(data.maxDailyLoss || '0.05') * 100,
            maxOpenTrades: data.maxOpenTrades || 3,
            defaultLeverage: data.defaultLeverage || 1,
            tradingPairs: (data.tradingPairs as string[]) || ['BTC/USDT', 'ETH/USDT'],
            aiAggressiveness: data.aiAggressiveness || 'moderate',
            autoTrade: data.autoTrade || false,
            notificationsEnabled: data.notificationsEnabled ?? true,
          })
        }
      } catch (error) {
        console.error('Failed to load settings:', error)
        toast.error("Erreur lors de la récupération de vos configurations serveur.")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // 2. Sauvegarde et application sur la base de données Drizzle (Vercel)
  const handleSave = async () => {
    setSaveStatus('saving')
    const savingToastId = toast.loading("Synchronisation de vos règles de risque...")

    try {
      await updateTradingSettings({
        riskPerTrade: (settings.riskPerTrade / 100).toFixed(4),
        maxDailyLoss: (settings.maxDailyLoss / 100).toFixed(4),
        maxOpenTrades: settings.maxOpenTrades,
        defaultLeverage: settings.defaultLeverage,
        tradingPairs: settings.tradingPairs,
        aiAggressiveness: settings.aiAggressiveness,
        autoTrade: settings.autoTrade,
        notificationsEnabled: settings.notificationsEnabled,
      })

      setSaveStatus('success')
      toast.success("Configurations mises à jour sur le Cloud !", { id: savingToastId })
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (error) {
      console.error('Failed to save settings:', error)
      setSaveStatus('error')
      toast.error("Échec de l'enregistrement de vos paramètres de risque.", { id: savingToastId })
      setTimeout(() => setSaveStatus('idle'), 4000)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-sm text-muted-foreground">Chargement des paramètres de protection...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Risk Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="w-5 h-5 text-primary" />
            Gestion du Risque Global
          </CardTitle>
          <CardDescription>
            Configurez les coupe-circuits automatiques pour protéger votre capital d'investissement.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Risque par trade</Label>
                <span className="text-sm font-bold bg-muted px-2 py-0.5 rounded text-primary">{settings.riskPerTrade}%</span>
              </div>
              <Slider
                value={[settings.riskPerTrade]}
                onValueChange={([value]) => setSettings({ ...settings, riskPerTrade: value })}
                min={0.5}
                max={10}
                step={0.5}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Allocation de marge maximale allouée par le modèle PPO sur chaque signal détecté.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Perte journalière maximale</Label>
                <span className="text-sm font-bold bg-muted px-2 py-0.5 rounded text-destructive">{settings.maxDailyLoss}%</span>
              </div>
              <Slider
                value={[settings.maxDailyLoss]}
                onValueChange={([value]) => setSettings({ ...settings, maxDailyLoss: value })}
                min={1}
                max={20}
                step={1}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Le coupe-circuit global fige l'IA si la perte glissante sur 24h atteint ce seuil.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="maxOpenTrades" className="text-xs">Positions simultanées max</Label>
                <Input
                  id="maxOpenTrades"
                  type="number"
                  min={1}
                  max={10}
                  value={settings.maxOpenTrades}
                  onChange={(e) =>
                    setSettings({ ...settings, maxOpenTrades: parseInt(e.target.value) || 1 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultLeverage" className="text-xs">Levier par défaut (Crypto)</Label>
                <Input
                  id="defaultLeverage"
                  type="number"
                  min={1}
                  max={100}
                  value={settings.defaultLeverage}
                  onChange={(e) =>
                    setSettings({ ...settings, defaultLeverage: parseInt(e.target.value) || 1 })
                  }
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="w-5 h-5 text-yellow-500" />
            Configuration de l'Agent Autonome (PPO)
          </CardTitle>
          <CardDescription>
            Ajustez l'agressivité mathématique et le mode opératoire de l'intelligence artificielle.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Profil de prise de décision</Label>
            <Select
              value={settings.aiAggressiveness}
              onValueChange={(value) => setSettings({ ...settings, aiAggressiveness: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="conservative">
                  Conservateur - Filtre strict (Précision élevée, volume faible)
                </SelectItem>
                <SelectItem value="moderate">
                  Modéré - Compromis équilibré (Standard de production)
                </SelectItem>
                <SelectItem value="aggressive">
                  Agressif - Exploitation intensive (Volume élevé, risques accrus)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
            <div>
              <Label htmlFor="autoTrade" className="text-sm font-semibold">Exécution automatique des signaux</Label>
              <p className="text-xs text-muted-foreground">
                Autorise l'IA à transmettre ses ordres directement au broker sélectionné.
              </p>
            </div>
            <Switch
              id="autoTrade"
              checked={settings.autoTrade}
              onCheckedChange={(checked) => setSettings({ ...settings, autoTrade: checked })}
            />
          </div>

          {/* AJUSTEMENT : Affichage intelligent adaptatif */}
          {settings.autoTrade && (
            isSimulating ? (
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 flex items-start gap-2">
                <Info className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                <p className="text-xs text-green-600 dark:text-green-400">
                  <strong>Mode Simulation actif :</strong> L'activation du trading automatique va lancer le flux d'ordres virtuels générés par l'IA. Aucun fonds réel n'est engagé.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                <p className="text-xs text-yellow-600 dark:text-yellow-400">
                  <strong>Attention :</strong> Aucun module de simulation exclusif n'est détecté. Le trading automatique transmettra des ordres fermes sur vos brokers connectés. Surveillez vos positions ou utilisez des comptes démo.
                </p>
              </div>
            )
          )}
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="w-5 h-5 text-blue-500" />
            Canaux de Télémétrie
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="notifications">Alertes instantanées de l'interface</Label>
              <p className="text-xs text-muted-foreground">
                Afficher des bannières à l'écran pour chaque prise ou clôture de position par l'IA.
              </p>
            </div>
            <Switch
              id="notifications"
              checked={settings.notificationsEnabled}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, notificationsEnabled: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Bottom status indicators */}
      {saveStatus === 'success' && (
        <div className="flex items-center gap-2 text-green-500 text-xs p-3 rounded-lg bg-green-500/10 border border-green-500/30">
          <CheckCircle className="w-4 h-4 shrink-0" />
          Règles de trading appliquées sur la base de données.
        </div>
      )}
      {saveStatus === 'error' && (
        <div className="flex items-center gap-2 text-destructive text-xs p-3 rounded-lg bg-destructive/10 border border-destructive/30">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Échec de la communication réseau avec l'infrastructure.
        </div>
      )}

      <Button onClick={handleSave} disabled={saveStatus === 'saving'} className="w-full font-semibold">
        {saveStatus === 'saving' ? 'Synchronisation Cloud...' : 'Appliquer et Enregistrer les paramètres'}
      </Button>
    </div>
  )
}