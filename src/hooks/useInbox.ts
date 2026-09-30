import { useCallback, useEffect, useRef, useState } from 'react'
import type { VaultApi } from '../api/VaultApi.ts'
import type { InboxStatus } from '../types/vault.ts'

const POLL_INTERVAL_MS = 15_000

const EMPTY: InboxStatus = { path: '', exists: false, rejectReasons: [], items: [] }

interface UseInboxResult {
  inbox: InboxStatus
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

/**
 * Bandeja del homelab. Sondea con calma: los archivos llegan por Syncthing
 * cuando llegan, y no hay nada que esperar en tiempo real.
 *
 * `active` permite apagar el sondeo cuando la vista no está abierta, sin dejar
 * de tener el recuento para el contador de la barra lateral.
 */
export function useInbox(api: VaultApi, active: boolean): UseInboxResult {
  const [inbox, setInbox] = useState<InboxStatus>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const refresh = useCallback(async () => {
    try {
      const result = await api.inbox()
      if (!mounted.current) return
      setInbox(result)
      setError(null)
    } catch (cause: unknown) {
      if (!mounted.current) return
      setError(cause instanceof Error ? cause.message : 'No se pudo leer la bandeja')
    }
  }, [api])

  useEffect(() => {
    // refresh es async: sus setState ocurren tras el await, no en este render.
    // oxlint-disable-next-line react/set-state-in-effect
    void refresh().finally(() => {
      if (mounted.current) setLoading(false)
    })
  }, [refresh])

  useEffect(() => {
    if (!active) return
    const timer = setInterval(() => void refresh(), POLL_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [active, refresh])

  return { inbox, loading, error, refresh }
}
