import { useCallback, useEffect, useRef, useState } from 'react'
import type { VaultApi } from '../api/VaultApi.ts'
import type { InboxStatus } from '../types/vault.ts'

/** Con la bandeja abierta se sondea rápido: es lo que hace que las capturas
 *  del homelab aparezcan solas mientras miras. */
const POLL_ACTIVE_MS = 4000

/** De fondo basta con mantener al día el contador de la barra lateral. */
const POLL_IDLE_MS = 30_000

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
export function useInbox(api: VaultApi, active: boolean, ready: boolean): UseInboxResult {
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
    if (!ready) return

    try {
      const result = await api.inbox()
      if (!mounted.current) return
      // Se reutilizan los elementos que no cambiaron para que las tarjetas ya
      // visibles no parpadeen en cada sondeo.
      setInbox((current) => ({
        ...result,
        items: result.items.map((incoming) => {
          const old = current.items.find((item) => item.filename === incoming.filename)

          return old && JSON.stringify(old) === JSON.stringify(incoming) ? old : incoming
        }),
      }))
      setError(null)
    } catch (cause: unknown) {
      if (!mounted.current) return
      setError(cause instanceof Error ? cause.message : 'No se pudo leer la bandeja')
    }
  }, [api, ready])

  useEffect(() => {
    if (!ready) return

    // refresh es async: sus setState ocurren tras el await, no en este render.
    // oxlint-disable-next-line react/set-state-in-effect
    void refresh().finally(() => {
      if (mounted.current) setLoading(false)
    })
  }, [refresh, ready])

  useEffect(() => {
    if (!ready) return

    const timer = setInterval(() => void refresh(), active ? POLL_ACTIVE_MS : POLL_IDLE_MS)

    return () => clearInterval(timer)
  }, [active, ready, refresh])

  return { inbox, loading, error, refresh }
}
