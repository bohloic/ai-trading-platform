'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { getTradingSettings, updateTradingSettings } from '@/app/actions/trading'
import { Settings, Shield, Zap, Bell } from 'lucide-react'

export function SettingsPanel() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
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

  useEffect(() => {
    async function load() {
      try {
        const data = await getTradingSettings()
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
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleSave = async () => {
    setSaving(true)
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
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Chargement des parametres...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Risk Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Gestion du Risque
          </CardTitle>
          <CardDescription>
            Configurez les limites de risque pour proteger votre capital
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Risque par trade</Label>
                <span className="text-sm font-medium">{settings.riskPerTrade}%</span>
              </div>
              <Slider
                value={[settings.riskPerTrade]}
                onValueChange={([value]) => setSettings({ ...settings, riskPerTrade: value })}
                min={0.5}
                max={10}
                step={0.5}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Pourcentage du capital risque sur chaque trade
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Perte journaliere max</Label>
                <span className="text-sm font-medium">{settings.maxDailyLoss}%</span>
              </div>
              <Slider
                value={[settings.maxDailyLoss]}
                onValueChange={([value]) => setSettings({ ...settings, maxDailyLoss: value })}
                min={1}
                max={20}
                step={1}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Le trading s&apos;arrete si cette limite est atteinte
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxOpenTrades">Trades ouverts max</Label>
                <Input
                  id="maxOpenTrades"
                  type="number"
                  min={1}
                  max={10}
                  value={settings.maxOpenTrades}
                  onChange={(e) => setSettings({ ...settings, maxOpenTrades: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultLeverage">Levier par defaut</Label>
                <Input
                  id="defaultLeverage"
                  type="number"
                  min={1}
                  max={100}
                  value={settings.defaultLeverage}
                  onChange={(e) => setSettings({ ...settings, defaultLeverage: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Configuration IA
          </CardTitle>
          <CardDescription>
            Ajustez le comportement de l&apos;agent de trading
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Agressivite de l&apos;IA</Label>
            <Select
              value={settings.aiAggressiveness}
              onValueChange={(value) => setSettings({ ...settings, aiAggressiveness: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="conservative">
                  Conservateur - Moins de trades, plus surs
                </SelectItem>
                <SelectItem value="moderate">
                  Modere - Equilibre risque/rendement
                </SelectItem>
                <SelectItem value="aggressive">
                  Agressif - Plus de trades, plus risques
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border border-border">
            <div>
              <Label htmlFor="autoTrade">Trading Automatique</Label>
              <p className="text-xs text-muted-foreground">
                L&apos;IA execute automatiquement les trades
              </p>
            </div>
            <Switch
              id="autoTrade"
              checked={settings.autoTrade}
              onCheckedChange={(checked) => setSettings({ ...settings, autoTrade: checked })}
            />
          </div>

          {settings.autoTrade && (
            <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                Attention: Le trading automatique execute des trades reels.
                Assurez-vous d&apos;avoir configure correctement vos limites de risque.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="notifications">Notifications temps reel</Label>
              <p className="text-xs text-muted-foreground">
                Recevez des alertes pour chaque trade
              </p>
            </div>
            <Switch
              id="notifications"
              checked={settings.notificationsEnabled}
              onCheckedChange={(checked) => setSettings({ ...settings, notificationsEnabled: checked })}
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? 'Enregistrement...' : 'Enregistrer les parametres'}
      </Button>
    </div>
  )
}
