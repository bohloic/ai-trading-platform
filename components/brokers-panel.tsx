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

interface BrokersPanelProps {
  brokers: any[]
}

const brokerInfo: Record<string, { name: string; description: string }> = {
  bybit: { name: 'Bybit', description: 'Exchange crypto avec futures et spot' },
  exness: { name: 'Exness', description: 'Broker forex et CFD' },
  deriv: { name: 'Deriv', description: 'Options binaires et forex' },
  simulation: { name: 'Simulation', description: 'Mode demo sans argent reel' },
}

export function BrokersPanel({ brokers: initialBrokers }: BrokersPanelProps) {
  const [brokers, setBrokers] = useState(initialBrokers)
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

    setLoading(true)
    try {
      await addBrokerConnection({
        broker: formData.broker,
        apiKey: formData.broker === 'simulation' ? undefined : formData.apiKey,
        apiSecret: formData.broker === 'simulation' ? undefined : formData.apiSecret,
        isDemo: formData.isDemo,
      })
      
      // Refresh the list
      setBrokers([...brokers, {
        id: Date.now(),
        broker: formData.broker,
        isDemo: formData.isDemo,
        isActive: true,
        createdAt: new Date().toISOString(),
      }])
      
      setFormData({ broker: '', apiKey: '', apiSecret: '', isDemo: true })
      setShowForm(false)
    } catch (error) {
      console.error('Failed to add broker:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Voulez-vous vraiment supprimer cette connexion?')) return
    
    try {
      await deleteBrokerConnection(id)
      setBrokers(brokers.filter((b) => b.id !== id))
    } catch (error) {
      console.error('Failed to delete broker:', error)
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
                Connectez vos comptes de trading pour activer le trading automatique
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
            <form onSubmit={handleSubmit} className="mb-6 p-4 rounded-lg border border-border bg-muted/30">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="broker">Broker</Label>
                  <Select
                    value={formData.broker}
                    onValueChange={(value) => setFormData({ ...formData, broker: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selectionnez un broker" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bybit">Bybit - Crypto Futures</SelectItem>
                      <SelectItem value="exness">Exness - Forex/CFD</SelectItem>
                      <SelectItem value="deriv">Deriv - Options/Forex</SelectItem>
                      <SelectItem value="simulation">Simulation - Mode Demo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.broker && formData.broker !== 'simulation' && (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="apiKey">Cle API</Label>
                      <Input
                        id="apiKey"
                        type="password"
                        value={formData.apiKey}
                        onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                        placeholder="Entrez votre cle API"
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
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="isDemo">Mode Demo</Label>
                        <p className="text-xs text-muted-foreground">
                          Utilisez le compte de demonstration
                        </p>
                      </div>
                      <Switch
                        id="isDemo"
                        checked={formData.isDemo}
                        onCheckedChange={(checked) => setFormData({ ...formData, isDemo: checked })}
                      />
                    </div>
                  </>
                )}

                <Button type="submit" disabled={loading || !formData.broker}>
                  {loading ? 'Connexion...' : 'Connecter le broker'}
                </Button>
              </div>
            </form>
          )}

          {brokers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Wallet className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-4">
                Aucun broker connecte. Ajoutez votre premier broker pour commencer.
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
                  className="flex items-center justify-between p-4 rounded-lg border border-border bg-card"
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
                        <span className="font-medium text-foreground">
                          {brokerInfo[broker.broker]?.name || broker.broker}
                        </span>
                        <Badge variant={broker.isDemo ? 'secondary' : 'default'}>
                          {broker.isDemo ? 'Demo' : 'Reel'}
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
                    className="text-destructive hover:text-destructive"
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
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/50">
            <h4 className="font-medium mb-2">Bybit</h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Connectez-vous a votre compte Bybit</li>
              <li>Allez dans API Management</li>
              <li>Creez une nouvelle cle API avec permissions de trading</li>
              <li>Copiez la cle et le secret</li>
            </ol>
          </div>
          <div className="p-4 rounded-lg bg-muted/50">
            <h4 className="font-medium mb-2">Exness</h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Connectez-vous a votre espace personnel Exness</li>
              <li>Allez dans Settings &gt; API</li>
              <li>Generez vos identifiants API</li>
            </ol>
          </div>
          <div className="p-4 rounded-lg bg-muted/50">
            <h4 className="font-medium mb-2">Deriv</h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Connectez-vous a Deriv</li>
              <li>Allez dans Account Settings &gt; API Token</li>
              <li>Creez un token avec les permissions necessaires</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
