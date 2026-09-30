import { TAG_CATEGORY_LABELS } from '../types/vault.ts'
import type { Facet } from '../lib/facets.ts'
import { TagChip } from './TagChip.tsx'
import { Icon } from './Icon.tsx'
import './FilterPanel.css'

interface FilterPanelProps {
  facets: Facet[]
  activeTagKeys: string[]
  onToggleTag: (key: string) => void
  onClear: () => void
}

export function FilterPanel({ facets, activeTagKeys, onToggleTag, onClear }: FilterPanelProps) {
  return <div className="filters">
    <div className="filters__head"><span className="sidebar__label">EXPLORAR POR</span>{activeTagKeys.length > 0 && <button onClick={onClear}>Limpiar ({activeTagKeys.length})</button>}</div>
    {facets.length === 0 && <p className="hint">Tus filtros aparecerán al clasificar la primera referencia.</p>}
    {facets.map((facet) => <details key={facet.category} className={`facet facet--${facet.category}`} open={['screen_type', 'style'].includes(facet.category)}>
      <summary><span>{TAG_CATEGORY_LABELS[facet.category]}</span>{activeTagKeys.some((key) => key.startsWith(`${facet.category}:`)) && <span className="facet__active-dot" />}<Icon name="chevron" size={12} /></summary>
      <div className="facet__values">{facet.values.map((item) => <TagChip key={item.key} tag={{ category: facet.category, value: item.value }} count={item.count} active={activeTagKeys.includes(item.key)} onClick={() => onToggleTag(item.key)} />)}</div>
    </details>)}
  </div>
}
