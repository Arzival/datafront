import { useRef, useState } from 'react'
import { formatBytes } from '../lib/format.ts'
import type { ProcessingChoice, Provider, Reference } from '../types/vault.ts'
import { ProviderPicker } from './ProviderPicker.tsx'
import './UploadPanel.css'
import { Icon } from './Icon.tsx'

interface UploadPanelProps {
  providers: Provider[]
  providersLoading: boolean
  choice: ProcessingChoice | null
  onChoiceChange: (choice: ProcessingChoice) => void
  onUpload: (
    file: File,
    choice: ProcessingChoice,
    sourceUrl: string | null,
    onProgress: (percent: number) => void,
  ) => Promise<Reference>
}

interface QueueItem {
  key: string
  name: string
  bytes: number
  percent: number
  state: 'uploading' | 'done' | 'error'
  error: string | null
}

const ACCEPTED = 'image/png,image/jpeg,image/webp,image/avif,image/gif'

export function UploadPanel({
  providers,
  providersLoading,
  choice,
  onChoiceChange,
  onUpload,
}: UploadPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [sourceUrl, setSourceUrl] = useState('')
  const [queue, setQueue] = useState<QueueItem[]>([])

  const provider = providers.find((item) => item.id === choice?.providerId) ?? null
  const canUpload = Boolean(choice && provider?.available)
  const busy = queue.some((item) => item.state === 'uploading')

  function patch(key: string, changes: Partial<QueueItem>): void {
    setQueue((current) => current.map((item) => (item.key === key ? { ...item, ...changes } : item)))
  }

  async function handleFiles(files: FileList | null): Promise<void> {
    if (!files || !choice || !canUpload) return

    const images = Array.from(files).filter((file) => file.type.startsWith('image/'))
    const rejected = files.length - images.length

    if (rejected > 0) {
      setQueue((current) => [
        ...current,
        {
          key: `rejected-${Date.now()}`,
          name: `${rejected} archivo${rejected === 1 ? '' : 's'} descartado${rejected === 1 ? '' : 's'}`,
          bytes: 0,
          percent: 0,
          state: 'error',
          error: 'Solo se aceptan imágenes',
        },
      ])
    }

    const entries: QueueItem[] = images.map((file, index) => ({
      key: `${Date.now()}-${index}-${file.name}`,
      name: file.name,
      bytes: file.size,
      percent: 0,
      state: 'uploading',
      error: null,
    }))
    setQueue((current) => [...current, ...entries])

    // Secuencial a propósito: la clasificación es lo caro y no queremos
    // saturar al proveedor con varias imágenes a la vez.
    for (const [index, file] of images.entries()) {
      const entry = entries[index]
      if (!entry) continue
      try {
        await onUpload(file, choice, sourceUrl.trim() || null, (percent) =>
          patch(entry.key, { percent }),
        )
        patch(entry.key, { state: 'done', percent: 100 })
      } catch (cause: unknown) {
        patch(entry.key, {
          state: 'error',
          error: cause instanceof Error ? cause.message : 'Falló la subida',
        })
      }
    }

    setSourceUrl('')
    if (inputRef.current) inputRef.current.value = ''
  }

  const dropClass = [
    'upload__drop',
    dragging ? 'upload__drop--over' : '',
    canUpload ? '' : 'upload__drop--busy',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section className="upload">
      <header className="upload__head">
        <h2 className="upload__title">Subir referencias</h2>
        {queue.length > 0 && (
          <button type="button" className="btn btn--ghost" onClick={() => setQueue([])} disabled={busy}>
            Limpiar lista
          </button>
        )}
      </header>

      <ProviderPicker
        providers={providers}
        value={choice}
        onChange={onChoiceChange}
        loading={providersLoading}
      />

      <label className="field">
        <span className="field__label">Fuente (opcional)</span>
        <input
          className="input"
          value={sourceUrl}
          placeholder="https://… de dónde sacaste la captura"
          onChange={(event) => setSourceUrl(event.target.value)}
        />
      </label>

      <div
        className={dropClass}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          void handleFiles(event.dataTransfer.files)
        }}
        role="button"
        aria-disabled={!canUpload}
        tabIndex={canUpload ? 0 : -1}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            inputRef.current?.click()
          }
        }}
      >
        <span className="upload__drop-icon"><Icon name="upload" size={26} /></span>
        <span className="upload__drop-title">Arrastra capturas aquí</span>
        <span className="hint">
          {canUpload
            ? 'o haz clic para elegirlas · PNG, JPG, WebP, AVIF'
            : 'Elige un proveedor disponible para poder subir'}
        </span>
      </div>

      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept={ACCEPTED}
        multiple
        disabled={!canUpload}
        tabIndex={-1}
        aria-label="Elegir capturas"
        onChange={(event) => void handleFiles(event.target.files)}
      />

      {queue.length > 0 && (
        <ul className="upload__queue">
          {queue.map((item) => (
            <li key={item.key} className="upload__item">
              <span className="upload__item-name">{item.name}</span>
              <span className="upload__item-meta">
                {item.state === 'uploading' && `${item.percent}%`}
                {item.state === 'done' && 'en cola de clasificación'}
                {item.state === 'error' && 'error'}
                {item.bytes > 0 && ` · ${formatBytes(item.bytes)}`}
              </span>
              {item.state === 'uploading' && (
                <div className="upload__bar">
                  <div className="upload__bar-fill" style={{ width: `${item.percent}%` }} />
                </div>
              )}
              {item.error && <span className="upload__item-error">{item.error}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
