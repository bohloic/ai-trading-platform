'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'
import { emergencyStop } from '@/app/actions/trading'

export function EmergencyStopButton() {
  const [loading, setLoading] = useState(false)

  const onClick = async () => {
    const ok = confirm(
      "Arrêt d'urgence: cela désactive le trading auto et coupe les connexions brokers. Continuer ?"
    )
    if (!ok) return

    setLoading(true)
    try {
      await emergencyStop()
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
      className="hidden sm:inline-flex"
    >
      <AlertTriangle className="w-4 h-4 mr-2" />
      {loading ? 'Arrêt...' : "Arrêt d'urgence"}
    </Button>
  )
}

