import { useState } from 'react'
import { formatBytes, formatRelative } from '../lib/format.ts'
import type { InboxItem, InboxStatus, ProcessingChoice } from '../types/vault.ts'
import { Icon } from './Icon.tsx'
import './InboxPanel.css'

interface InboxPanelProps {
  inbox: InboxStatus
  loading: boolean
  error: string | null
  choice: ProcessingChoice | null
  canImport: boolean
  onRefresh: () => void
  onImport: (item: InboxItem) => Promise<void>
  onReject: (item: InboxItem, reason: string) => Promise<void>
}

/**
 * Bandeja de lo que manda el homelab. Nada entra solo: cada captura espera una
 * decisión, y esa decisión se escribe en el nombre del archivo, que es lo que
 * viaja de vuelta por Syncthing.
 */
export function InboxPanel({
  inbox,
  loading,
  error,
  choice,
  canImport,
  onRefresh,
  onImport,
  onReject,
}: InboxPanelProps) {
  const [busy, setBusy] = useState<string | null>(null)
  const [failures, setFailures] = useState<Record<string, string>>({})

  async function run(item: InboxItem, action: () => Promise<void>): Promise<void> {
    setBusy(item.filename)
    setFailures((current) => {
      const next = { ...current }
      delete next[item.filename]
      return next
    })

    try {
      await action()
    } catch (cause: unknown) {
      setFailures((current) => ({
        ...current,
        [item.filename]: cause instanceof Error ? cause.message : 'No se pudo completar',
      }))
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="inbox" aria-label="Bandeja del homelab">
      <div className="inbox__heading">
        <h1>
          Bandeja del homelab <span>{inbox.items.length}</span>
        </h1>
        {inbox.exists && (
          <span className="inbox__live" title="Se revisa la carpeta cada 4 segundos">
            <span className="inbox__live-dot" />
            en directo
          </span>
        )}
        <span className="inbox__spacer" />
        <button
          type="button"
          className="btn btn--ghost"
          onClick={onRefresh}
          aria-label="Actualizar bandeja"
        >
          <Icon name="refresh" size={16} />
        </button>
      </div>

      <p className={`inbox__path${inbox.exists ? '' : ' inbox__missing'}`}>
        <Icon name="layers" size={14} />
        {inbox.exists ? (
          <>
            Sincronizada en <code>{inbox.path}</code>
          </>
        ) : (
          <>
            La carpeta <code>{inbox.path || 'sin configurar'}</code> todavía no existe. Créala o
            ajusta <code>VAULT_INBOX_PATH</code> en el backend.
          </>
        )}
      </p>

      {error && <p className="app__error" role="alert">{error}</p>}

      {loading && <p className="hint">Leyendo la bandeja…</p>}

      {!loading && inbox.exists && inbox.items.length === 0 && (
        <div className="empty">
          <Icon name="check" size={36} />
          <h3>No hay nada pendiente</h3>
          <p className="hint">
            Cuando el homelab deje capturas nuevas, aparecerán aquí para que decidas.
          </p>
        </div>
      )}

      {inbox.items.length > 0 && (
        <div className="inbox__grid">
          {inbox.items.map((item) => (
            <article
              key={item.filename}
              className={`inbox-card${busy === item.filename ? ' inbox-card--busy' : ''}`}
            >
              <div className="inbox-card__thumb">
                <img src={item.previewUrl} alt={item.filename} loading="lazy" />
                {item.settling && (
                  <span className="inbox-card__flag inbox-card__flag--settling">
                    sincronizando
                  </span>
                )}
                {!item.settling && item.alreadyInVault && (
                  <span className="inbox-card__flag inbox-card__flag--dupe">ya en la bóveda</span>
                )}
              </div>

              <div className="inbox-card__body">
                {item.sourceTitle && <span className="inbox-card__title">{item.sourceTitle}</span>}

                {item.sourceUrl && (
                  <a
                    className="inbox-card__source"
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    title={item.sourceUrl}
                  >
                    {item.sourceUrl.replace(/^https?:\/\//, '')}
                  </a>
                )}

                <span className="inbox-card__name">{item.filename}</span>

                <span className="inbox-card__meta">
                  {item.capturedAt && <span>{formatRelative(item.capturedAt)}</span>}
                  {item.width > 0 && (
                    <span>
                      {item.width}×{item.height}
                    </span>
                  )}
                  <span>{formatBytes(item.bytes)}</span>
                </span>

                {failures[item.filename] && (
                  <span className="inbox-card__error">{failures[item.filename]}</span>
                )}

                <div className="inbox-card__actions">
                  <button
                    type="button"
                    className="btn btn--primary"
                    disabled={item.settling || !canImport || busy !== null}
                    title={
                      item.settling
                        ? 'Todavía se está sincronizando'
                        : canImport
                          ? `Importar y clasificar con ${choice?.providerId ?? 'el motor elegido'}`
                          : 'Elige un motor disponible primero'
                    }
                    onClick={() => void run(item, () => onImport(item))}
                  >
                    <Icon name="plus" size={14} />
                    Pasar a la bóveda
                  </button>

                  {inbox.rejectReasons.map((reason) => (
                    <button
                      key={reason.id}
                      type="button"
                      className="btn"
                      disabled={item.settling || busy !== null}
                      title={reason.label}
                      onClick={() => void run(item, () => onReject(item, reason.id))}
                    >
                      {reason.id === 'borrosa' ? 'Borrosa' : 'No sirve'}
                    </button>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
