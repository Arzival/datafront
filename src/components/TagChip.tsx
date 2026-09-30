import type { Tag } from '../types/vault.ts'
import { isHexColor } from '../lib/format.ts'
import './TagChip.css'

interface TagChipProps {
  tag: Pick<Tag, 'category' | 'value'>
  active?: boolean
  count?: number
  onClick?: () => void
  title?: string
}

/**
 * Etiqueta de la taxonomía. Los valores de la categoría `palette` se pintan
 * con una muestra del color para poder leer la paleta de un vistazo.
 */
export function TagChip({ tag, active = false, count, onClick, title }: TagChipProps) {
  const swatch = tag.category === 'palette' && isHexColor(tag.value) ? tag.value : null

  const className = [
    'chip',
    onClick ? 'chip--button' : '',
    active ? 'chip--active' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const content = (
    <>
      {swatch && <span className="chip__swatch" style={{ background: swatch }} />}
      <span className="chip__value">{tag.value}</span>
      {count !== undefined && <span className="chip__count">{count}</span>}
    </>
  )

  if (!onClick) {
    return (
      <span className={className} title={title ?? tag.value}>
        {content}
      </span>
    )
  }

  return (
    <button type="button" className={className} onClick={onClick} title={title ?? tag.value} aria-pressed={active}>
      {content}
    </button>
  )
}
