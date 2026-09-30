import type { Reference } from '../types/vault.ts'
import { StatusBadge } from './StatusBadge.tsx'
import { TagChip } from './TagChip.tsx'
import { Icon } from './Icon.tsx'
import { formatRelative } from '../lib/format.ts'
import './ReferenceGrid.css'

const TAGS_PER_CARD = 2

interface ReferenceGridProps {
  compact: boolean
  references: Reference[]
  selectedId: string | null
  /** Ids marcados para el mix, en el orden en que se marcaron. */
  pickedIds: string[]
  onSelect: (reference: Reference) => void
  onTogglePick: (reference: Reference) => void
}

export function ReferenceGrid({
  references,
  compact,
  selectedId,
  pickedIds,
  onSelect,
  onTogglePick,
}: ReferenceGridProps) {
  return (
    <div className={`grid${compact ? ' grid--compact' : ''}`}>
      {references.map((reference) => {
        const visible = reference.tags.filter((tag) => tag.category === 'screen_type' || tag.category === 'style').slice(0, TAGS_PER_CARD)
        const hidden = reference.tags.length - visible.length
        const pickedAt = pickedIds.indexOf(reference.id)
        const picked = pickedAt !== -1

        const className = [
          'card',
          selectedId === reference.id ? 'card--active' : '',
          picked ? 'card--picked' : '',
        ]
          .filter(Boolean)
          .join(' ')

        return (
          <article key={reference.id} className={className}>
            <button type="button" className="card__open" onClick={() => onSelect(reference)}>
              <div className="card__thumb">
                <img
                  src={reference.thumbUrl}
                  alt={reference.title ?? reference.filename}
                  loading="lazy"
                />
                <span className="card__preview-label">Ver referencia <Icon name="arrow" size={14} /></span>
                <span className="card__status">
                  <StatusBadge status={reference.status} detail={reference.error} />
                </span>
              </div>

              <div className="card__body">
                <span className="card__eyebrow">{reference.tags.find((tag) => tag.category === 'industry')?.value ?? 'Referencia de UI'}<span className="card__palette">{reference.tags.filter((tag) => tag.category === 'palette').slice(0, 4).map((tag) => <i key={tag.value} style={{ backgroundColor: tag.value }} />)}</span></span>
                <span className={`card__title${reference.title ? '' : ' card__title--untitled'}`}>
                  {reference.title ?? reference.filename}
                </span>

                {reference.status === 'failed' && reference.error && (
                  <span className="card__error">{reference.error}</span>
                )}

                {visible.length > 0 && (
                  <div className="card__tags">
                    {visible.map((tag) => (
                      <TagChip key={`${tag.category}:${tag.value}`} tag={tag} />
                    ))}
                    {hidden > 0 && <span className="card__more">+{hidden}</span>}
                  </div>
                )}
                <span className="card__meta"><span>{reference.width > 0 ? `${reference.width} × ${reference.height}` : 'Imagen subida'}</span><span>{formatRelative(reference.createdAt)}</span></span>
              </div>
            </button>

            <label className={`card__check${picked ? ' card__check--on' : ''}`}>
              <input
                type="checkbox"
                checked={picked}
                onChange={() => onTogglePick(reference)}
              />
              <span className="sr-only">
                Añadir «{reference.title ?? reference.filename}» al mix
              </span>
            </label>

            {picked && <span className="card__index">{pickedAt + 1} en tu mix</span>}
          </article>
        )
      })}
    </div>
  )
}
