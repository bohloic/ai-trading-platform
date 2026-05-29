'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

export type SocketStatus = 'connecting' | 'open' | 'closed' | 'error'

export type UseBrokerSocketReturn = {
  /** État courant de la connexion WebSocket */
  status: SocketStatus
  /** Envoie un message JSON sur le socket. No-op si non connecté. */
  send: (data: unknown) => void
  /** Ferme manuellement le socket et stoppe les reconnexions */
  disconnect: () => void
}

const MAX_RETRY_DELAY_MS = 30_000
const HEARTBEAT_INTERVAL_MS = 30_000
const BASE_DELAY_MS = 1_000
const MAX_RETRIES = 10 // Arrêt définitif après 10 tentatives (~10 min max)

/**
 * Hook de connexion WebSocket résilient avec :
 * - Reconnexion automatique (Exponential Backoff + Jitter)
 * - Heartbeat périodique pour détecter les connexions "half-open"
 * - Nettoyage complet des ressources au démontage du composant
 *
 * @param url URL WebSocket complète (wss://...)
 */
export function useBrokerSocket(url: string): UseBrokerSocketReturn {
  const [status, setStatus] = useState<SocketStatus>('closed')
  const ws = useRef<WebSocket | null>(null)
  const retryCount = useRef(0)
  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stopped = useRef(false) // Drapeau d'arrêt manuel

  const clearHeartbeat = () => {
    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current)
      heartbeatTimer.current = null
    }
  }

  const clearRetryTimer = () => {
    if (retryTimer.current) {
      clearTimeout(retryTimer.current)
      retryTimer.current = null
    }
  }

  const connect = useCallback(() => {
    if (stopped.current) return

    setStatus('connecting')

    let socket: WebSocket
    try {
      socket = new WebSocket(url)
    } catch (err) {
      console.error('[useBrokerSocket] Failed to create WebSocket:', err)
      setStatus('error')
      return
    }

    ws.current = socket

    socket.onopen = () => {
      if (stopped.current) {
        socket.close()
        return
      }

      setStatus('open')
      retryCount.current = 0

      // Heartbeat : ping toutes les 30s pour maintenir la connexion vivante
      // et détecter les connexions TCP "half-open" (routeur silencieux)
      clearHeartbeat()
      heartbeatTimer.current = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ op: 'ping' }))
        }
      }, HEARTBEAT_INTERVAL_MS)
    }

    socket.onerror = () => {
      // onerror est toujours suivi de onclose — on laisse onclose gérer la reconnexion
      setStatus('error')
    }

    socket.onclose = () => {
      clearHeartbeat()

      if (stopped.current) {
        setStatus('closed')
        return
      }

      if (retryCount.current >= MAX_RETRIES) {
        console.warn('[useBrokerSocket] Max retries reached. Stopping reconnection.')
        setStatus('closed')
        return
      }

      setStatus('connecting')

      // Exponential Backoff avec Jitter :
      // - Backoff : délai exponentiel (1s, 2s, 4s, 8s…) pour réduire la charge
      // - Jitter : aléatoire [0, 1s] pour éviter l'effet "thundering herd"
      //   (des milliers de clients qui se reconnectent simultanément)
      const jitter = Math.random() * 1_000
      const delay = Math.min(
        BASE_DELAY_MS * Math.pow(2, retryCount.current) + jitter,
        MAX_RETRY_DELAY_MS
      )

      console.debug(
        `[useBrokerSocket] Reconnecting in ${Math.round(delay)}ms (attempt ${retryCount.current + 1}/${MAX_RETRIES})`
      )

      retryTimer.current = setTimeout(() => {
        retryCount.current++
        connect()
      }, delay)
    }
  }, [url])

  useEffect(() => {
    stopped.current = false
    retryCount.current = 0
    connect()

    return () => {
      // Nettoyage complet à la destruction du composant
      stopped.current = true
      clearHeartbeat()
      clearRetryTimer()
      if (ws.current) {
        ws.current.close()
        ws.current = null
      }
    }
  }, [connect])

  const send = useCallback((data: unknown) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data))
    } else {
      console.warn('[useBrokerSocket] send() called while socket is not open')
    }
  }, [])

  const disconnect = useCallback(() => {
    stopped.current = true
    clearHeartbeat()
    clearRetryTimer()
    ws.current?.close()
    setStatus('closed')
  }, [])

  return { status, send, disconnect }
}
