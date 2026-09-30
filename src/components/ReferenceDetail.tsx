import { useState } from 'react'
import { formatBytes, formatRelative } from '../lib/format.ts'
import { referenceToPrompt } from '../lib/prompt.ts'
import {
  TAG_CATEGORIES,
  TAG_CATEGORY_LABELS,
  type ProcessingChoice,
  type Provider,
  type Reference,
} from '../types/vault.ts'
import { StatusBadge } from './StatusBadge.tsx'
import { TagChip } from './TagChip.tsx'
import { ProviderPicker } from './ProviderPicker.tsx'
import './ReferenceDetail.css'

interface ReferenceDetailProps {
  reference: Reference
  providers: Provider[]
  choice: ProcessingChoice | null
  onChoiceChange: (choice: ProcessingChoice) => void
  onClose: () => void
  onReclassify: (reference: Reference) => Promise<void>
  onDelete: (reference: Reference) => Promise<void>
}

export function ReferenceDetail({
  reference,
  providers,
  choice,
  onChoiceChange,
  onClose,
  onReclassify,
  onDelete,
}: ReferenceDetailProps) {
  const [busy, setBusy] = useState<'reclassify' | 'delete' | null>(null)
  const [actionError, setActionError] = useState('')
  const [copied, setCopied] = useState<'prompt' | 'path' | null>(null)

  const processedBy = providers.find((item) => item.id === reference.providerId)
  const targetProvider = providers.find((item) => item.id === choice?.providerId)
  const canReclassify = Boolean(choice && targetProvider?.available)
  const filePath = reference.filePath ?? ''

  async function copy(text: string, kind: 'prompt' | 'path'): Promise<void> {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(kind)
      setTimeout(() => setCopied(null), 1800)
    } catch {
      setActionError('No se pudo copiar. Revisa el permiso del portapapeles.')
    }
  }

  async function run(action: 'reclassify' | 'delete'): Promise<void> {
    setBusy(action)
    setActionError('')
    try {
      if (action === 'reclassify') await onReclassify(reference)
      else await onDelete(reference)
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'No se pudo completar la acción.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <aside className="detail" aria-label="Detalle de la referencia">
      <header className="detail__head">
        <h2 className="detail__title">{reference.title ?? reference.filename}</h2>
        <StatusBadge status={reference.status} detail={reference.error} />
        <button type="button" className="btn btn--ghost" onClick={onClose} aria-label="Cerrar">
          ✕
        </button>
      </header>

      <div className="detail__body">
        <div className="detail__image">
          <img src={reference.imageUrl} alt={reference.title ?? reference.filename} />
        </div>

        <div className="detail__meta">
          <span>{reference.filename}</span>
          {reference.width > 0 && (
            <span>
              {reference.width}×{reference.height}
            </span>
          )}
          <span>{formatBytes(reference.bytes)}</span>
          <span>{formatRelative(reference.createdAt)}</span>
        </div>

        {reference.error && <p className="detail__error">{reference.error}</p>}

        {(processedBy || reference.model) && (
          <div className="detail__meta">
            <span>
              Clasificada por {processedBy?.label ?? reference.providerId}
              {reference.model ? ` · ${reference.model}` : ''}
            </span>
          </div>
        )}

        {reference.filePath && (
          <section className="detail__section">
            <h3 className="detail__section-label">Ruta en disco</h3>
            <button
              type="button"
              className="detail__path"
              onClick={() => void copy(filePath, 'path')}
              title="Copiar la ruta"
            >
              <code>{reference.filePath}</code>
              <span>{copied === 'path' ? 'copiada' : 'copiar'}</span>
            </button>
          </section>
        )}

        {reference.summary && (
          <section className="detail__section">
            <h3 className="detail__section-label">Descripción</h3>
            <p className="detail__text">{reference.summary}</p>
          </section>
        )}

        {reference.tags.length > 0 && (
          <section className="detail__section">
            <h3 className="detail__section-label">Clasificación</h3>
            {TAG_CATEGORIES.map((category) => {
              const values = reference.tags.filter((tag) => tag.category === category)
              if (values.length === 0) return null
              return (
                <div key={category} className="detail__tag-group">
                  <span className="detail__tag-group-label">
                    {TAG_CATEGORY_LABELS[category]}
                  </span>
                  <div className="detail__tag-values">
                    {values.map((tag) => (
                      <TagChip
                        key={`${tag.category}:${tag.value}`}
                        tag={tag}
                        title={
                          tag.confidence === null
                            ? tag.value
                            : `${tag.value} · confianza ${Math.round(tag.confidence * 100)}%`
                        }
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </section>
        )}

        {reference.notes && (
          <section className="detail__section">
            <h3 className="detail__section-label">Notas de implementación</h3>
            <p className="detail__text">{reference.notes}</p>
          </section>
        )}

        {reference.sourceUrl && (
          <section className="detail__section">
            <h3 className="detail__section-label">Fuente</h3>
            <a
              className="detail__text"
              href={reference.sourceUrl}
              target="_blank"
              rel="noreferrer noopener"
            >
              {reference.sourceUrl}
            </a>
          </section>
        )}
      </div>

      <div className="detail__processing"><ProviderPicker providers={providers} value={choice} onChange={onChoiceChange} loading={false} />{actionError && <p className="detail__error" role="alert">{actionError}</p>}</div>
      <footer className="detail__foot">
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => void copy(referenceToPrompt(reference), 'prompt')}
          disabled={reference.status !== 'ready'}
        >
          {copied === 'prompt' ? 'Copiado' : 'Copiar como prompt'}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => void run('reclassify')}
          disabled={!canReclassify || busy !== null}
          title={
            canReclassify
              ? `Volver a clasificar con ${targetProvider?.label}`
              : 'Elige un proveedor disponible arriba'
          }
        >
          {busy === 'reclassify' ? 'Reencolando…' : 'Reclasificar'}
        </button>
        <span className="detail__spacer" />
        <button
          type="button"
          className="btn btn--danger"
          onClick={() => void run('delete')}
          disabled={busy !== null}
        >
          {busy === 'delete' ? 'Borrando…' : 'Borrar'}
        </button>
      </footer>
    </aside>
  )
}
