'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { addBrokerConnection, deleteBrokerConnection } from '@/app/actions/trading'
import { Wallet, Plus, Trash2, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface BrokerItem {
  id: number
  broker: string
  isDemo: boolean | null
  isActive: boolean | null
  createdAt: Date | string
}

interface BrokersPanelProps {
  brokers: BrokerItem[]
}

const brokerInfo: Record<string, { name: string; description: string }> = {
  bybit: { name: 'Bybit', description: 'Exchange crypto avec futures et spot' },
  exness: { name: 'Exness', description: 'Broker forex et CFD' },
  deriv: { name: 'Deriv', description: 'Options binaires et forex' },
  simulation: { name: 'Simulation', description: 'Moteur de simulation IA sans argent réel' },
}

export function BrokersPanel({ brokers: initialBrokers }: BrokersPanelProps) {
  const [brokers, setBrokers] = useState<BrokerItem[]>(initialBrokers)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    broker: '',
    apiKey: '',
    apiSecret: '',
    isDemo: true,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.broker) return

    // Sécurité : Si c'est une simulation, pas besoin de clés d'API globales
    if (formData.broker !== 'simulation' && (!formData.apiKey || !formData.apiSecret)) {
      toast.error("Veuillez renseigner vos identifiants d'API de trading.")
      return
    }

    setLoading(true)
    try {
      await addBrokerConnection({
        broker: formData.broker,
        apiKey: formData.broker === 'simulation' ? 'SIMULATION_KEY' : formData.apiKey,
        apiSecret: formData.broker === 'simulation' ? 'SIMULATION_SECRET' : formData.apiSecret,
        isDemo: formData.broker === 'simulation' ? true : formData.isDemo,
      })

      const newConnection: BrokerItem = {
        id: Date.now(),
        broker: formData.broker,
        isDemo: formData.broker === 'simulation' ? true : formData.isDemo,
        isActive: true,
        createdAt: new Date().toISOString(),
      }

      setBrokers((prev) => [...prev, newConnection])
      toast.success(`${brokerInfo[formData.broker]?.name || formData.broker} configuré avec succès !`)

      setFormData({ broker: '', apiKey: '', apiSecret: '', isDemo: true })
      setShowForm(false)
    } catch (error) {
      console.error('Failed to add broker:', error)
      toast.error("Échec de la liaison avec le broker. Vérifiez vos paramètres.")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Voulez-vous vraiment supprimer cette connexion ? Cela arrêtera les flux associés.')) return

    try {
      await deleteBrokerConnection(id)
      setBrokers((prev) => prev.filter((b) => b.id !== id))
      toast.error("Connexion broker révoquée.")
    } catch (error) {
      console.error('Failed to delete broker:', error)
      toast.error("Impossible de supprimer la configuration.")
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                Connexions Brokers
              </CardTitle>
              <CardDescription>
                Connectez vos comptes de trading ou activez le simulateur pour animer le Dashboard.
              </CardDescription>
            </div>
            <Button onClick={() => setShowForm(!showForm)} variant={showForm ? 'outline' : 'default'}>
              <Plus className="w-4 h-4 mr-2" />
              {showForm ? 'Annuler' : 'Ajouter'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showForm && (
            <form onSubmit={handleSubmit} className="mb-6 p-4 rounded-lg border border-border bg-muted/30 animate-in fade-in-50 duration-200">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="broker">Broker</Label>
                  <Select
                    value={formData.broker}
                    onValueChange={(value) => setFormData({
                      ...formData,
                      broker: value,
                      isDemo: value === 'simulation' ? true : formData.isDemo
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez un environnement" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bybit">Bybit - Crypto Futures</SelectItem>
                      <SelectItem value="exness">Exness - Forex/CFD</SelectItem>
                      <SelectItem value="deriv">Deriv - Options/Forex</SelectItem>
                      <SelectItem value="simulation">Simulation - Mode Démo IA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* MODIFICATION : Masquage intelligent des entrées si mode simulation sélectionné */}
                {formData.broker && formData.broker !== 'simulation' ? (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="apiKey">Clé API</Label>
                      <Input
                        id="apiKey"
                        type="password"
                        value={formData.apiKey}
                        onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                        placeholder="Entrez votre clé API"
                        required
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="apiSecret">Secret API</Label>
                      <Input
                        id="apiSecret"
                        type="password"
                        value={formData.apiSecret}
                        onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                        placeholder="Entrez votre secret API"
                        required
                      />
                    </div>

                    <div className="flex items-center justify-between border-t border-border/50 pt-2">
                      <div>
                        <Label htmlFor="isDemo">Mode Démo / Sandbox</Label>
                        <p className="text-xs text-muted-foreground">
                          Utiliser le réseau de testnet du broker
                        </p>
                      </div>
                      <Switch
                        id="isDemo"
                        checked={formData.isDemo}
                        onCheckedChange={(checked) => setFormData({ ...formData, isDemo: checked })}
                      />
                    </div>
                  </>
                ) : formData.broker === 'simulation' ? (
                  <div className="p-3 rounded bg-primary/5 border border-primary/20 text-xs text-muted-foreground">
                    💡 <strong>Mode Simulation :</strong> L'IA va générer et alimenter de fausses transactions d'entraînement directement sur votre interface sans nécessiter de clés réelles.
                  </div>
                ) : null}

                <Button type="submit" disabled={loading || !formData.broker} className="mt-2">
                  {loading ? 'Interconnexion...' : formData.broker === 'simulation' ? 'Activer le Simulateur' : 'Enregistrer le compte broker'}
                </Button>
              </div>
            </form>
          )}

          {brokers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Wallet className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-4 max-w-sm">
                Aucun canal de trading actif. Ajoutez votre compte ou le simulateur d'IA pour démarrer la réception de signaux.
              </p>
              {!showForm && (
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter un broker
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {brokers.map((broker) => (
                <div
                  key={broker.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-muted/10 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-full ${broker.isActive ? 'bg-green-500/10' : 'bg-muted'}`}>
                      {broker.isActive ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground text-sm">
                          {brokerInfo[broker.broker]?.name || broker.broker}
                        </span>
                        <Badge variant={broker.broker === 'simulation' || broker.isDemo ? 'secondary' : 'default'}>
                          {broker.broker === 'simulation' ? 'Simulateur' : broker.isDemo ? 'Démo' : 'Réel'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {brokerInfo[broker.broker]?.description}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(broker.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Instructions de connexion</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="p-4 rounded-lg bg-muted/40 border border-border/40">
            <h4 className="font-medium text-sm mb-2 text-primary">Bybit</h4>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>API Management Bybit</li>
              <li>Créer une clé système</li>
              <li>Activer permissions "Trading"</li>
            </ol>
          </div>
          <div className="p-4 rounded-lg bg-muted/40 border border-border/40">
            <h4 className="font-medium text-sm mb-2 text-primary">Exness</h4>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Paramètres personnels</li>
              <li>Onglet API de terminal</li>
              <li>Générer jeton d'accès</li>
            </ol>
          </div>
          <div className="p-4 rounded-lg bg-muted/40 border border-border/40">
            <h4 className="font-medium text-sm mb-2 text-primary">Deriv</h4>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Account Settings</li>
              <li>Section API Token</li>
              <li>Permissions "Trade & Read"</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}