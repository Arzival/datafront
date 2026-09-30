import { useCallback, useEffect, useRef, useState } from 'react'
import type { VaultApi } from '../api/VaultApi.ts'
import type { Reference } from '../types/vault.ts'

const POLL_INTERVAL_MS = 2500

/**
 * Devuelve la lista nueva reutilizando los objetos anteriores que no han
 * cambiado. Sin esto, cada sondeo entrega objetos nuevos y todas las tarjetas
 * se vuelven a renderizar aunque su contenido sea idéntico.
 */
function mergeById(current: Reference[], incoming: Reference[]): Reference[] {
  const previous = new Map(current.map((item) => [item.id, item]))

  return incoming.map((item) => {
    const old = previous.get(item.id)

    return old && JSON.stringify(old) === JSON.stringify(item) ? old : item
  })
}

interface UseReferencesResult {
  references: Reference[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  /** Inserta o reemplaza una referencia sin esperar al siguiente fetch. */
  upsert: (reference: Reference) => void
  removeLocal: (id: string) => void
}

/**
 * Lista de referencias con sondeo automático: mientras alguna esté en cola o
 * clasificándose, refresca cada 2.5s para ver el resultado en cuanto llega.
 */
export function useReferences(api: VaultApi, ready: boolean): UseReferencesResult {
  const [references, setReferences] = useState<Reference[]>([])
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
      const result = await api.listReferences()
      if (!mounted.current) return
      // Se conserva el objeto anterior de cada referencia que no cambió, para
      // que React no vuelva a pintar tarjetas idénticas en cada sondeo.
      setReferences((current) => mergeById(current, result))
      setError(null)
    } catch (cause: unknown) {
      if (!mounted.current) return
      setError(cause instanceof Error ? cause.message : 'No se pudo cargar la bóveda')
    }
  }, [api, ready])

  useEffect(() => {
    if (!ready) return

    // `loading` arranca en true y solo se apaga al resolver: ponerlo a true
    // aquí de forma síncrona provocaría un render extra en cada cambio de api.
    // refresh es async: sus setState ocurren tras el await, no en este render.
    // oxlint-disable-next-line react/set-state-in-effect
    void refresh().finally(() => {
      if (mounted.current) setLoading(false)
    })
  }, [refresh, ready])

  const hasWorkInFlight = references.some(
    (item) => item.status === 'pending' || item.status === 'processing',
  )

  useEffect(() => {
    if (!hasWorkInFlight) return
    const timer = setInterval(() => void refresh(), POLL_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [hasWorkInFlight, refresh])

  const upsert = useCallback((reference: Reference) => {
    setReferences((current) => {
      const exists = current.some((item) => item.id === reference.id)
      if (exists) return current.map((item) => (item.id === reference.id ? reference : item))
      return [reference, ...current]
    })
  }, [])

  const removeLocal = useCallback((id: string) => {
    setReferences((current) => current.filter((item) => item.id !== id))
  }, [])

  return { references, loading, error, refresh, upsert, removeLocal }
}
