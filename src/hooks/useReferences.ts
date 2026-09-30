import { useCallback, useEffect, useRef, useState } from 'react'
import type { VaultApi } from '../api/VaultApi.ts'
import type { Reference } from '../types/vault.ts'

const POLL_INTERVAL_MS = 2500

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
export function useReferences(api: VaultApi): UseReferencesResult {
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
    try {
      const result = await api.listReferences()
      if (!mounted.current) return
      setReferences(result)
      setError(null)
    } catch (cause: unknown) {
      if (!mounted.current) return
      setError(cause instanceof Error ? cause.message : 'No se pudo cargar la bóveda')
    }
  }, [api])

  useEffect(() => {
    // `loading` arranca en true y solo se apaga al resolver: ponerlo a true
    // aquí de forma síncrona provocaría un render extra en cada cambio de api.
    // refresh es async: sus setState ocurren tras el await, no en este render.
    // oxlint-disable-next-line react/set-state-in-effect
    void refresh().finally(() => {
      if (mounted.current) setLoading(false)
    })
  }, [refresh])

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
