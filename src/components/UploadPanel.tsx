import { useEffect, useRef, useState } from 'react'
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
  /**
   * Se llama cuando llega una imagen pegada con el modal cerrado, para
   * abrirlo y que se vea el progreso de la subida.
   */
  onPasteWhileClosed?: () => void
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

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent)
const PASTE_KEYS = IS_MAC ? '⌘V' : 'Ctrl+V'

/**
 * Las capturas pegadas llegan casi siempre como «image.png», así que se les
 * da un nombre con la hora para distinguirlas en la cola y en la bóveda.
 */
function namePasted(blob: Blob, index: number): File {
  const extension = blob.type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'png'
  // Hora local, no UTC: si no, a partir de las 18:00 el nombre ya dice mañana.
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  const stamp =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-` +
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  const suffix = index > 0 ? `-${index + 1}` : ''

  return new File([blob], `pegada-${stamp}${suffix}.${extension}`, { type: blob.type })
}

function imagesFrom(data: DataTransfer | null): File[] {
  if (!data) return []

  return Array.from(data.items)
    .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
    .map((item) => item.getAsFile())
    .filter((file): file is File => file !== null)
    .map(namePasted)
}

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false

  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

export function UploadPanel({
  providers,
  providersLoading,
  choice,
  onChoiceChange,
  onUpload,
  onPasteWhileClosed,
}: UploadPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const [dragging, setDragging] = useState(false)
  const [sourceUrl, setSourceUrl] = useState('')
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [pasteError, setPasteError] = useState<string | null>(null)

  const provider = providers.find((item) => item.id === choice?.providerId) ?? null
  const canUpload = Boolean(choice && provider?.available)
  const busy = queue.some((item) => item.state === 'uploading')

  function patch(key: string, changes: Partial<QueueItem>): void {
    setQueue((current) => current.map((item) => (item.key === key ? { ...item, ...changes } : item)))
  }

  async function handleFiles(files: FileList | File[] | null): Promise<void> {
    if (!files || !choice || !canUpload) return
    setPasteError(null)

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

  // handleFiles cambia en cada render; el listener la lee de estas refs para
  // no tener que volver a registrarse. Se actualizan tras cada render.
  const handleFilesRef = useRef(handleFiles)
  const onPasteWhileClosedRef = useRef(onPasteWhileClosed)

  useEffect(() => {
    handleFilesRef.current = handleFiles
    onPasteWhileClosedRef.current = onPasteWhileClosed
  })

  /**
   * ⌘V en cualquier parte de la app. El modal de subida mantiene este panel
   * montado aunque esté cerrado, así que el listener vive siempre: si llega
   * una imagen con el modal cerrado, se abre para que se vea el progreso.
   */
  useEffect(() => {
    function onPaste(event: ClipboardEvent): void {
      const text = event.clipboardData?.getData('text/plain') ?? ''

      // Pegar texto en el buscador o en el campo de fuente debe seguir
      // funcionando como siempre.
      if (isEditable(event.target) && text !== '') return

      const images = imagesFrom(event.clipboardData)
      if (images.length === 0) return

      event.preventDefault()

      const open = sectionRef.current?.closest('dialog')?.open ?? true
      if (!open) onPasteWhileClosedRef.current?.()

      void handleFilesRef.current(images)
    }

    document.addEventListener('paste', onPaste)

    return () => document.removeEventListener('paste', onPaste)
  }, [])

  /** Botón explícito: útil si no recuerdas el atajo o vienes del ratón. */
  async function pasteFromClipboard(): Promise<void> {
    setPasteError(null)

    if (!navigator.clipboard?.read) {
      setPasteError(`Tu navegador no deja leer el portapapeles desde un botón. Usa ${PASTE_KEYS}.`)
      return
    }

    try {
      const items = await navigator.clipboard.read()
      const blobs: Blob[] = []

      for (const item of items) {
        const type = item.types.find((candidate) => candidate.startsWith('image/'))
        if (type) blobs.push(await item.getType(type))
      }

      if (blobs.length === 0) {
        setPasteError('No hay ninguna imagen en el portapapeles.')
        return
      }

      await handleFiles(blobs.map(namePasted))
    } catch {
      setPasteError(`No se pudo leer el portapapeles. Prueba con ${PASTE_KEYS}.`)
    }
  }

  const dropClass = [
    'upload__drop',
    dragging ? 'upload__drop--over' : '',
    canUpload ? '' : 'upload__drop--busy',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section className="upload" ref={sectionRef}>
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
            ? `haz clic para elegirlas o pega una con ${PASTE_KEYS} · PNG, JPG, WebP, AVIF`
            : 'Elige un proveedor disponible para poder subir'}
        </span>
      </div>

      <button
        type="button"
        className="btn upload__paste"
        onClick={() => void pasteFromClipboard()}
        disabled={!canUpload}
      >
        <Icon name="copy" size={15} />
        Pegar imagen copiada
        <kbd>{PASTE_KEYS}</kbd>
      </button>

      {pasteError && <p className="upload__item-error" role="alert">{pasteError}</p>}

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
