import type { Reference } from '../types/vault.ts'
import './SelectionBar.css'

const THUMBS_SHOWN = 10

interface SelectionBarProps {
  picked: Reference[]
  onRemove: (reference: Reference) => void
  onClear: () => void
  onCopyMix: () => void
  copied: boolean
}

/**
 * Barra de selección para el mix. Aparece en cuanto hay una referencia
 * marcada y acompaña al scroll del catálogo.
 */
export function SelectionBar({ picked, onRemove, onClear, onCopyMix, copied }: SelectionBarProps) {
  if (picked.length === 0) return null

  const withoutPath = picked.filter((item) => item.filePath === null).length
  const unclassified = picked.filter((item) => item.status !== 'ready').length
  const shown = picked.slice(0, THUMBS_SHOWN)
  const overflow = picked.length - shown.length

  return (
    <div className="selbar">
      <span className="selbar__count">
        <strong>{picked.length}</strong> {picked.length === 1 ? 'referencia' : 'referencias'} en el mix
      </span>

      <div className="selbar__thumbs">
        {shown.map((reference) => (
          <button
            key={reference.id}
            type="button"
            className="selbar__thumb"
            onClick={() => onRemove(reference)}
            title={`Quitar «${reference.title ?? reference.filename}» del mix`}
          >
            <img src={reference.thumbUrl} alt="" />
          </button>
        ))}
        {overflow > 0 && <span className="selbar__overflow">+{overflow}</span>}
      </div>

      {unclassified > 0 && (
        <span className="selbar__warn" title="Sin tags, el mix solo llevará su ruta">
          {unclassified} sin clasificar
        </span>
      )}

      {withoutPath > 0 && (
        <span className="selbar__warn" title="El backend aún no reportó su ruta en disco">
          {withoutPath} sin ruta
        </span>
      )}

      <button type="button" className="btn btn--ghost" onClick={onClear}>
        Limpiar
      </button>
      <button type="button" className="btn btn--primary" onClick={onCopyMix}>
        {copied ? 'Mix copiado' : 'Copiar mix'}
      </button>
    </div>
  )
}
