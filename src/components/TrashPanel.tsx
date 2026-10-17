import { useState } from 'react'
import { formatRelative } from '../lib/format.ts'
import type { Reference } from '../types/vault.ts'
import { Icon } from './Icon.tsx'
import './TrashPanel.css'

interface TrashPanelProps {
  trash: Reference[]
  loading: boolean
  error: string | null
  onRestore: (reference: Reference) => Promise<void>
  onPurge: (reference: Reference) => Promise<void>
}

/**
 * Lo borrado del catálogo. Restaurar lo devuelve con sus etiquetas; borrar
 * para siempre elimina también el archivo y pide confirmación aparte.
 */
export function TrashPanel({ trash, loading, error, onRestore, onPurge }: TrashPanelProps) {
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')

  async function run(reference: Reference, action: (reference: Reference) => Promise<void>): Promise<void> {
    setBusyId(reference.id)
    setActionError('')
    try {
      await action(reference)
      setConfirmingId(null)
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'No se pudo completar la acción.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="trash" aria-label="Papelera">
      <div className="trash__heading">
        <h1>Papelera <span>{trash.length}</span></h1>
      </div>
      <p className="trash__intro">
        Lo que borras del catálogo queda aquí con su imagen y sus etiquetas. Restaurar lo devuelve tal cual estaba.
      </p>

      {(error || actionError) && <p className="app__error" role="alert">{actionError || error}</p>}

      {!loading && trash.length === 0 && (
        <div className="empty">
          <Icon name="trash" size={36} />
          <h3>La papelera está vacía</h3>
        </div>
      )}

      {trash.length > 0 && (
        <div className="trash__grid">
          {trash.map((reference) => {
            const busy = busyId === reference.id
            const confirming = confirmingId === reference.id

            return (
              <article key={reference.id} className={`trash-card${busy ? ' trash-card--busy' : ''}`}>
                <a className="trash-card__thumb" href={reference.imageUrl} target="_blank" rel="noreferrer noopener" title="Abrir la imagen">
                  <img src={reference.thumbUrl} alt={reference.title ?? reference.filename} loading="lazy" />
                </a>
                <div className="trash-card__body">
                  <span className="trash-card__title">{reference.title ?? reference.filename}</span>
                  <span className="trash-card__meta">
                    {reference.deletedAt ? `Borrada ${formatRelative(reference.deletedAt)}` : 'Borrada'}
                    {' · '}
                    {reference.tags.length} etiquetas
                  </span>

                  {confirming ? (
                    <div className="trash-card__confirm" role="group" aria-label="Confirmar borrado definitivo">
                      <p>Se borra también el archivo. No se puede deshacer.</p>
                      <div className="trash-card__actions">
                        <button type="button" className="btn btn--danger-solid" onClick={() => void run(reference, onPurge)} disabled={busy}>
                          {busy ? 'Borrando…' : 'Borrar para siempre'}
                        </button>
                        {/* oxlint-disable-next-line jsx-a11y/no-autofocus */}
                        <button type="button" className="btn" onClick={() => setConfirmingId(null)} disabled={busy} autoFocus>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="trash-card__actions">
                      <button type="button" className="btn btn--primary" onClick={() => void run(reference, onRestore)} disabled={busy}>
                        <Icon name="undo" size={16} />
                        {busy ? 'Restaurando…' : 'Restaurar'}
                      </button>
                      <button type="button" className="btn btn--ghost btn--danger" onClick={() => setConfirmingId(reference.id)} disabled={busy}>
                        Borrar para siempre
                      </button>
                    </div>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
