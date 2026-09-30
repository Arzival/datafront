import { useCallback, useEffect, useState } from 'react'
import { httpVault, probeBackend } from '../api/httpVault.ts'
import { mockVault } from '../api/mockVault.ts'
import type { VaultApi } from '../api/VaultApi.ts'
import { API_BASE_URL, FORCE_MOCK } from '../lib/config.ts'

export type ApiStatus = 'checking' | 'http' | 'mock'

/** Si no hay backend configurado no tiene sentido ni sondear. */
const canProbe = !FORCE_MOCK && API_BASE_URL !== ''

interface UseVaultApiResult {
  api: VaultApi
  status: ApiStatus
  /** Vuelve a sondear el backend, por si lo acabas de levantar. */
  recheck: () => void
}

/**
 * Decide contra qué implementación trabajar. Si el backend no responde en
 * /health, cae a los datos de ejemplo para que la UI siga siendo usable.
 */
export function useVaultApi(): UseVaultApiResult {
  const [status, setStatus] = useState<ApiStatus>(canProbe ? 'checking' : 'mock')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!canProbe) return

    const controller = new AbortController()
    probeBackend(controller.signal).then((reachable) => {
      if (controller.signal.aborted) return
      setStatus(reachable ? 'http' : 'mock')
    })

    return () => controller.abort()
  }, [attempt])

  const recheck = useCallback(() => {
    if (!canProbe) return
    setStatus('checking')
    setAttempt((value) => value + 1)
  }, [])

  return { api: status === 'http' ? httpVault : mockVault, status, recheck }
}
