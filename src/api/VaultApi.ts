import type { ProcessingChoice, Provider, Reference } from '../types/vault.ts'

export interface UploadInput {
  file: File
  choice: ProcessingChoice
  sourceUrl?: string | null
  onProgress?: (percent: number) => void
}

/**
 * Operaciones de la bóveda. Hay dos implementaciones: `httpVault` contra
 * Laravel y `mockVault` con datos de ejemplo en memoria.
 */
export interface VaultApi {
  readonly mode: 'http' | 'mock'
  listProviders(): Promise<Provider[]>
  listReferences(): Promise<Reference[]>
  getReference(id: string): Promise<Reference>
  upload(input: UploadInput): Promise<Reference>
  reclassify(id: string, choice: ProcessingChoice): Promise<Reference>
  remove(id: string): Promise<void>
}

export class VaultApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'VaultApiError'
    this.status = status
  }
}
