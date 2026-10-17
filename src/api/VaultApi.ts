import type {
  InboxStatus,
  ProcessingChoice,
  Provider,
  Reference,
} from '../types/vault.ts'

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
  /** Manda a la papelera: no borra archivos ni etiquetas. */
  remove(id: string): Promise<void>

  /** Papelera: lo borrado, más reciente primero. */
  listTrash(): Promise<Reference[]>
  restore(id: string): Promise<Reference>
  /** Borrado definitivo. Solo funciona con lo que ya está en la papelera. */
  purge(id: string): Promise<void>

  /** Bandeja de entrada del homelab. */
  inbox(): Promise<InboxStatus>
  importFromInbox(
    filename: string,
    choice: ProcessingChoice,
    sourceUrl?: string | null,
  ): Promise<Reference>
  rejectFromInbox(filename: string, reason: string): Promise<void>
}

export class VaultApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'VaultApiError'
    this.status = status
  }
}
