import { useEffect, useState } from 'react'
import type { VaultApi } from '../api/VaultApi.ts'
import type { Provider } from '../types/vault.ts'

interface UseProvidersResult {
  providers: Provider[]
  loading: boolean
  error: string | null
}

const INITIAL: UseProvidersResult = { providers: [], loading: true, error: null }

export function useProviders(api: VaultApi): UseProvidersResult {
  const [state, setState] = useState<UseProvidersResult>(INITIAL)

  useEffect(() => {
    let active = true

    api
      .listProviders()
      .then((providers) => {
        if (active) setState({ providers, loading: false, error: null })
      })
      .catch((cause: unknown) => {
        if (!active) return
        setState({
          providers: [],
          loading: false,
          error:
            cause instanceof Error ? cause.message : 'No se pudieron cargar los proveedores',
        })
      })

    return () => {
      active = false
    }
  }, [api])

  return state
}
