import { API_BASE_URL } from '../lib/config.ts'
import type { ProcessingChoice, Provider, Reference } from '../types/vault.ts'
import { VaultApiError, type UploadInput, type VaultApi } from './VaultApi.ts'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { Accept: 'application/json', ...init?.headers },
  })

  if (!response.ok) {
    throw new VaultApiError(
      await readError(response),
      response.status,
    )
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string }
    if (body.message) return body.message
  } catch {
    // Respuesta sin JSON: nos quedamos con el texto genérico.
  }
  return `El backend respondió ${response.status}`
}

/** Sonda para saber si el backend está levantado. */
export async function probeBackend(signal?: AbortSignal): Promise<boolean> {
  if (!API_BASE_URL) return false
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      headers: { Accept: 'application/json' },
      signal,
    })
    return response.ok
  } catch {
    return false
  }
}

export const httpVault: VaultApi = {
  mode: 'http',

  listProviders() {
    return request<Provider[]>('/providers')
  },

  listReferences() {
    return request<Reference[]>('/references')
  },

  getReference(id) {
    return request<Reference>(`/references/${id}`)
  },

  /** Multipart con XHR porque `fetch` no reporta progreso de subida. */
  upload({ file, choice, sourceUrl, onProgress }: UploadInput) {
    return new Promise<Reference>((resolve, reject) => {
      const body = new FormData()
      body.append('image', file)
      body.append('provider_id', choice.providerId)
      if (choice.model) body.append('model', choice.model)
      if (sourceUrl) body.append('source_url', sourceUrl)

      const xhr = new XMLHttpRequest()
      xhr.open('POST', `${API_BASE_URL}/references`)
      xhr.setRequestHeader('Accept', 'application/json')

      xhr.upload.addEventListener('progress', (event) => {
        if (!event.lengthComputable) return
        onProgress?.(Math.round((event.loaded / event.total) * 100))
      })

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText) as Reference)
          return
        }
        let message = `El backend respondió ${xhr.status}`
        try {
          const parsed = JSON.parse(xhr.responseText) as { message?: string }
          if (parsed.message) message = parsed.message
        } catch {
          // Sin cuerpo JSON: mensaje genérico.
        }
        reject(new VaultApiError(message, xhr.status))
      })

      xhr.addEventListener('error', () => {
        reject(new VaultApiError('No se pudo conectar con el backend', 0))
      })

      xhr.send(body)
    })
  },

  reclassify(id: string, choice: ProcessingChoice) {
    return request<Reference>(`/references/${id}/reclassify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider_id: choice.providerId, model: choice.model }),
    })
  },

  remove(id: string) {
    return request<void>(`/references/${id}`, { method: 'DELETE' })
  },
}
