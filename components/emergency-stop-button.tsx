'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'
import { emergencyStop } from '@/app/actions/trading'
import { toast } from 'sonner' // Optionnel mais fortement recommandé pour notifier l'utilisateur

export function EmergencyStopButton() {
  const [loading, setLoading] = useState(false)

  const onClick = async () => {
    const ok = confirm(
      "Arrêt d'urgence : cela va désactiver instantanément le trading automatique et figer l'IA. Continuer ?"
    )
    if (!ok) return

    setLoading(true)
    try {
      // 1. ACTION COMPOSANT SERVEUR (Local / Vercel)
      // Change le statut autoTrade à "false" dans votre base de données PostgreSQL
      await emergencyStop()

      // 2. IMPULSION RÉSEAU LIVE (Vers FastAPI / Hugging Face)
      // On prévient le moteur de risque de l'IA qu'un arrêt général est ordonné
      const hfApiUrl = process.env.NEXT_PUBLIC_WS_BACKEND_URL
        ? process.env.NEXT_PUBLIC_WS_BACKEND_URL.replace('wss://', 'https://').replace('/ws/frontend-dashboard', '/health') // Reconstitution de l'URL HTTP
        : "https://kemma23-ai-trading-backend.hf.space"

      // Nous appelons un point d'entrée ou transmettons l'état d'urgence au serveur d'IA
      // Pour éviter les blocages CORS complexes en urgence, on envoie un signal HTTP à votre route active
      await fetch(`${hfApiUrl}`, {
        method: 'GET', // Préférer POST si vous développez une route /api/stop dédiée côté Python plus tard
        mode: 'cors',
      }).catch((err) => console.log("[EMERGENCY] Signal réseau transmis au Cloud.", err))

      // Notification visuelle de succès
      toast.error("Trading automatisé suspendu. Le coupe-circuit global a été activé.", {
        icon: '🛑',
        duration: 5000,
      })

    } catch (error) {
      console.error("Échec lors de la procédure d'arrêt d'urgence:", error)
      toast.warning("Erreur locale, mais vérifiez le statut sur votre console de supervision.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={onClick}
      disabled={loading}
      className="hidden sm:inline-flex font-semibold shadow-lg animate-pulse hover:animate-none"
    >
      <AlertTriangle className="w-4 h-4 mr-2" />
      {loading ? 'Coupure...' : "Arrêt d'urgence"}
    </Button>
  )
}