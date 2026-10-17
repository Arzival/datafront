import { useCallback, useEffect, useRef, useState } from 'react'
import type { VaultApi } from '../api/VaultApi.ts'
import type { Reference } from '../types/vault.ts'

interface UseTrashResult {
  trash: Reference[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

/** Papelera de la bóveda. Se recarga a mano tras borrar, restaurar o purgar. */
export function useTrash(api: VaultApi, ready: boolean): UseTrashResult {
  const [trash, setTrash] = useState<Reference[]>([])
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
      const result = await api.listTrash()
      if (!mounted.current) return
      setTrash(result)
      setError(null)
    } catch (cause: unknown) {
      if (!mounted.current) return
      setError(cause instanceof Error ? cause.message : 'No se pudo cargar la papelera')
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

  return { trash, loading, error, refresh }
}
