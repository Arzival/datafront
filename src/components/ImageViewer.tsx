import { useCallback, useEffect, useRef, useState } from 'react'
import { Icon } from './Icon.tsx'
import './ImageViewer.css'

interface ImageViewerProps {
  src: string
  alt: string
}

interface View {
  scale: number
  x: number
  y: number
}

const MAX_SCALE = 12
/** Sensibilidad de la rueda: sirve igual para ratón y para el pellizco del trackpad. */
const WHEEL_STEP = 0.0016

/**
 * Visor de la captura a pantalla grande, junto al panel de detalle.
 *
 * Rueda para hacer zoom hacia el cursor, arrastrar para moverse, doble clic
 * para alternar entre ajustar y 100 %. Atajos: 0 ajusta, 1 tamaño real, + y −.
 */
export function ImageViewer({ src, alt }: ImageViewerProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null)
  const [view, setView] = useState<View>({ scale: 1, x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  /** Mientras está «ajustada», un cambio de tamaño de ventana la reajusta. */
  const [fitted, setFitted] = useState(true)
  const drag = useRef<{ startX: number; startY: number; x: number; y: number } | null>(null)

  /** La vista que hace caber la imagen entera, centrada, sin pasar del 100 %. */
  const fitView = useCallback((): View | null => {
    const frame = frameRef.current
    if (!frame || !natural) return null

    const padding = 32
    const width = frame.clientWidth - padding * 2
    const height = frame.clientHeight - padding * 2
    const scale = Math.min(width / natural.width, height / natural.height, 1)

    return {
      scale,
      x: (frame.clientWidth - natural.width * scale) / 2,
      y: (frame.clientHeight - natural.height * scale) / 2,
    }
  }, [natural])

  const fit = useCallback(() => {
    const next = fitView()
    if (!next) return
    setView(next)
    setFitted(true)
  }, [fitView])

  /** Zoom manteniendo fijo el punto (px, py) del marco: el que está bajo el cursor. */
  const zoomAt = useCallback(
    (factor: number, px: number, py: number) => {
      const minimum = (fitView()?.scale ?? 1) * 0.5

      setView((current) => {
        const scale = Math.min(MAX_SCALE, Math.max(minimum, current.scale * factor))
        const ratio = scale / current.scale

        return {
          scale,
          x: px - (px - current.x) * ratio,
          y: py - (py - current.y) * ratio,
        }
      })
      setFitted(false)
    },
    [fitView],
  )

  const zoomAtCenter = useCallback(
    (factor: number) => {
      const frame = frameRef.current
      if (frame) zoomAt(factor, frame.clientWidth / 2, frame.clientHeight / 2)
    },
    [zoomAt],
  )

  /** Tamaño real (100 %) centrado en el punto dado. */
  const actualSize = useCallback(
    (px?: number, py?: number) => {
      const frame = frameRef.current
      if (!frame) return
      const cx = px ?? frame.clientWidth / 2
      const cy = py ?? frame.clientHeight / 2

      setView((current) => ({
        scale: 1,
        x: cx - (cx - current.x) / current.scale,
        y: cy - (cy - current.y) / current.scale,
      }))
      setFitted(false)
    },
    [],
  )

  // Ajustar en cuanto se conoce el tamaño de la imagen.
  useEffect(() => {
    // fit lee el tamaño del marco del DOM, que no existe hasta después del render.
    // oxlint-disable-next-line react/set-state-in-effect
    if (natural) fit()
  }, [natural, fit])

  // Si la ventana cambia de tamaño y no has tocado el zoom, se reajusta.
  useEffect(() => {
    const frame = frameRef.current
    if (!frame || !fitted) return

    const observer = new ResizeObserver(() => fit())
    observer.observe(frame)

    return () => observer.disconnect()
  }, [fitted, fit])

  // La rueda va con un listener nativo: el onWheel de React es pasivo y no
  // deja impedir el scroll de la página.
  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return

    function onWheel(event: WheelEvent): void {
      event.preventDefault()
      const rect = frame!.getBoundingClientRect()
      // El pellizco del trackpad llega como rueda con ctrlKey y deltas pequeños:
      // se amplifica para que se sienta igual de ágil que la rueda del ratón.
      const delta = event.ctrlKey ? event.deltaY * 4 : event.deltaY
      zoomAt(Math.exp(-delta * WHEEL_STEP), event.clientX - rect.left, event.clientY - rect.top)
    }

    frame.addEventListener('wheel', onWheel, { passive: false })

    return () => frame.removeEventListener('wheel', onWheel)
  }, [zoomAt])

  // Atajos de teclado mientras el visor está en pantalla.
  useEffect(() => {
    function onKey(event: KeyboardEvent): void {
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return

      if (event.key === '0') fit()
      else if (event.key === '1') actualSize()
      else if (event.key === '+' || event.key === '=') zoomAtCenter(1.25)
      else if (event.key === '-') zoomAtCenter(0.8)
      else return

      event.preventDefault()
    }

    window.addEventListener('keydown', onKey)

    return () => window.removeEventListener('keydown', onKey)
  }, [fit, actualSize, zoomAtCenter])

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>): void {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { startX: event.clientX, startY: event.clientY, x: view.x, y: view.y }
    setDragging(true)
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>): void {
    const start = drag.current
    if (!start) return

    setView((current) => ({
      ...current,
      x: start.x + event.clientX - start.startX,
      y: start.y + event.clientY - start.startY,
    }))
    setFitted(false)
  }

  function onPointerUp(): void {
    drag.current = null
    setDragging(false)
  }

  function onDoubleClick(event: React.MouseEvent<HTMLDivElement>): void {
    const rect = event.currentTarget.getBoundingClientRect()
    const fitScale = fitView()?.scale ?? 1

    // Si está ajustada (o casi), salta al 100 % en el punto del clic; si no, vuelve a ajustar.
    if (view.scale <= fitScale * 1.05) actualSize(event.clientX - rect.left, event.clientY - rect.top)
    else fit()
  }

  const percent = Math.round(view.scale * 100)

  return (
    <div className="viewer" aria-label="Visor de la captura">
      <div
        ref={frameRef}
        className={`viewer__frame${dragging ? ' viewer__frame--dragging' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
      >
        <img
          className={`viewer__image${view.scale >= 3 ? ' viewer__image--pixels' : ''}`}
          src={src}
          alt={alt}
          draggable={false}
          onLoad={(event) =>
            setNatural({
              width: event.currentTarget.naturalWidth,
              height: event.currentTarget.naturalHeight,
            })
          }
          style={{
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
            visibility: natural ? 'visible' : 'hidden',
          }}
        />
      </div>

      <div className="viewer__toolbar" role="toolbar" aria-label="Zoom">
        <button type="button" onClick={() => zoomAtCenter(0.8)} aria-label="Alejar" title="Alejar (−)">
          −
        </button>
        <span className="viewer__percent" aria-live="polite">{percent}%</span>
        <button type="button" onClick={() => zoomAtCenter(1.25)} aria-label="Acercar" title="Acercar (+)">
          +
        </button>
        <span className="viewer__divider" />
        <button type="button" onClick={fit} className={fitted ? 'is-active' : ''} title="Ajustar a la pantalla (0)">
          Ajustar
        </button>
        <button type="button" onClick={() => actualSize()} className={percent === 100 ? 'is-active' : ''} title="Tamaño real (1)">
          100%
        </button>
        <span className="viewer__divider" />
        <a href={src} target="_blank" rel="noreferrer noopener" title="Abrir el original en otra pestaña">
          <Icon name="arrow" size={14} />
        </a>
      </div>

      <p className="viewer__hint">Rueda para zoom · arrastra para moverte · doble clic alterna 100 %</p>
    </div>
  )
}
