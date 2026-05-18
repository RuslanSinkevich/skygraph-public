import { useMemo, useRef, useState, type CSSProperties } from 'react'

/** Диапазон выделения, выраженный в индексах категорий (включительно). */
export interface ChartBrushRange {
  /** Стартовый индекс. Всегда `<= to`. */
  from: number
  /** Конечный индекс. Всегда `>= from`. */
  to: number
}

/**
 * Конфиг brushing-prop, который чарты пробрасывают в общий `<ChartBrush>`.
 * Принимает либо `boolean` (включить uncontrolled), либо объект.
 */
export interface ChartBrushConfig {
  /** Контролируемый диапазон. `null` — диапазон не выбран. */
  range?: ChartBrushRange | null
  /** Стартовый диапазон в uncontrolled-режиме. */
  defaultRange?: ChartBrushRange | null
  /**
   * Срабатывает на `pointerup` после drag и на `dblclick` (reset → `null`).
   * `from`/`to` — индексы категорий (целочисленные, `from <= to`).
   */
  onRangeChange?: (range: ChartBrushRange | null) => void
  /** Цвет заливки выделения. Дефолт — `var(--sg-color-primary)` с прозрачностью. */
  fill?: string
  /** Заблокировать создание / изменение brush — но контролируемый диапазон всё равно отрисуется. */
  disabled?: boolean
}

/** Резолвит `brush` prop в `ChartBrushConfig | null`. */
export function resolveBrushConfig(
  brush: boolean | ChartBrushConfig | undefined,
): ChartBrushConfig | null {
  if (brush == null || brush === false) return null
  if (brush === true) return {}
  return brush
}

export interface ChartBrushProps {
  /** Левая граница plot-области в SVG user-space. */
  plotX: number
  /** Верхняя граница plot-области в SVG user-space. */
  plotY: number
  /** Ширина plot-области. */
  plotW: number
  /** Высота plot-области. */
  plotH: number
  /** Количество категорий по X. Используется для маппинга x → index. */
  categoryCount: number
  /** Текущий диапазон выделения (контролируемый). `null` — не выделено. */
  range: ChartBrushRange | null
  /** Срабатывает при каждом завершении выделения / reset. */
  onRangeChange: (range: ChartBrushRange | null) => void
  /** Сбрасывает default-классы `.sg-chart-brush-*`. */
  unstyled?: boolean
  /** Цвет заливки. */
  fill?: string
  /** Полностью выключает интерактив, оставляя только визуал. */
  disabled?: boolean
}

const DEFAULT_FILL = 'var(--sg-color-primary)'

/** Конвертирует X в SVG user-space → индекс категории. */
function xToCategoryIndex(localX: number, plotX: number, plotW: number, count: number): number {
  if (count <= 0) return 0
  if (count === 1) return 0
  if (!Number.isFinite(localX) || !Number.isFinite(plotW) || plotW <= 0) return 0
  const step = plotW / (count - 1)
  if (step <= 0 || !Number.isFinite(step)) return 0
  const raw = Math.round((localX - plotX) / step)
  if (!Number.isFinite(raw)) return 0
  return Math.max(0, Math.min(count - 1, raw))
}

/** Возвращает X в SVG user-space по индексу категории. */
function categoryIndexToX(idx: number, plotX: number, plotW: number, count: number): number {
  if (count <= 1) return plotX
  const step = plotW / (count - 1)
  return plotX + idx * step
}

/**
 * Brushing overlay: drag по plot-области → диапазон в `[from, to]` индексах
 * категорий. Двойной клик сбрасывает диапазон в `null`.
 *
 * Презентационный компонент: владеет временным dragging-state, но финальный
 * диапазон публикует через `onRangeChange`. Контролируемый `range` приходит
 * сверху и определяет, что отрисовать.
 */
export function ChartBrush({
  plotX,
  plotY,
  plotW,
  plotH,
  categoryCount,
  range,
  onRangeChange,
  unstyled,
  fill,
  disabled,
}: ChartBrushProps) {
  const overlayRef = useRef<SVGRectElement | null>(null)
  const [drag, setDrag] = useState<{ startIdx: number; endIdx: number } | null>(null)

  // ---- helpers ----------------------------------------------------------

  const cls = (suffix: string) =>
    unstyled ? undefined : `sg-chart-brush-${suffix}`

  const clientToCategoryIndex = (clientX: number): number | null => {
    const overlay = overlayRef.current
    const svg = overlay?.ownerSVGElement
    if (!svg) return null
    const r = svg.getBoundingClientRect()
    if (!r.width || !Number.isFinite(r.width)) return null
    // jsdom не имплементит `svg.viewBox.baseVal` корректно, поэтому читаем
    // viewBox вручную из атрибута и фоллбэчимся на 600 (стандартный для
    // наших SVG-чартов).
    let viewW = 600
    try {
      const vb = svg.viewBox?.baseVal
      if (vb && vb.width > 0) viewW = vb.width
      else {
        const attr = svg.getAttribute('viewBox')
        if (attr) {
          const parts = attr.trim().split(/\s+/)
          const w = Number.parseFloat(parts[2] ?? '')
          if (Number.isFinite(w) && w > 0) viewW = w
        }
      }
    } catch {
      // Игнорим — используем 600.
    }
    const localX = ((clientX - r.left) / r.width) * viewW
    return xToCategoryIndex(localX, plotX, plotW, categoryCount)
  }

  // ---- handlers ---------------------------------------------------------
  //
  // Все события — на самом overlay <rect>. setPointerCapture гарантирует,
  // что pointermove/pointerup приходят даже если курсор покинул overlay.
  // В jsdom setPointerCapture может быть no-op — оборачиваем в try/catch.

  const safeSetCapture = (el: SVGRectElement, id: number) => {
    try {
      el.setPointerCapture?.(id)
    } catch {
      // jsdom / старые браузеры — игнорируем.
    }
  }

  const safeReleaseCapture = (el: SVGRectElement, id: number) => {
    try {
      el.releasePointerCapture?.(id)
    } catch {
      // как выше
    }
  }

  const handlePointerDown = (e: React.PointerEvent<SVGRectElement>) => {
    if (disabled || categoryCount === 0) return
    const idx = clientToCategoryIndex(e.clientX)
    if (idx === null) return
    e.preventDefault()
    safeSetCapture(e.currentTarget, e.pointerId)
    setDrag({ startIdx: idx, endIdx: idx })
  }

  const handlePointerMove = (e: React.PointerEvent<SVGRectElement>) => {
    if (!drag) return
    const idx = clientToCategoryIndex(e.clientX)
    if (idx === null) return
    setDrag((prev) => (prev ? { ...prev, endIdx: idx } : prev))
  }

  const handlePointerUp = (e: React.PointerEvent<SVGRectElement>) => {
    if (!drag) return
    safeReleaseCapture(e.currentTarget, e.pointerId)
    const idx = clientToCategoryIndex(e.clientX)
    const finalEnd = idx ?? drag.endIdx
    const from = Math.min(drag.startIdx, finalEnd)
    const to = Math.max(drag.startIdx, finalEnd)
    onRangeChange({ from, to })
    setDrag(null)
  }

  const handlePointerCancel = (e: React.PointerEvent<SVGRectElement>) => {
    if (!drag) return
    safeReleaseCapture(e.currentTarget, e.pointerId)
    setDrag(null)
  }

  const handleDoubleClick = (e: React.MouseEvent<SVGRectElement>) => {
    if (disabled) return
    e.preventDefault()
    onRangeChange(null)
  }

  // ---- visual selection -------------------------------------------------

  const liveSelection = useMemo<ChartBrushRange | null>(() => {
    if (drag) {
      const from = Math.min(drag.startIdx, drag.endIdx)
      const to = Math.max(drag.startIdx, drag.endIdx)
      return { from, to }
    }
    if (range) {
      const from = Math.min(range.from, range.to)
      const to = Math.max(range.from, range.to)
      return {
        from: Math.max(0, Math.min(categoryCount - 1, from)),
        to: Math.max(0, Math.min(categoryCount - 1, to)),
      }
    }
    return null
  }, [drag, range, categoryCount])

  const selectionRect = liveSelection
    ? (() => {
        const x1 = categoryIndexToX(liveSelection.from, plotX, plotW, categoryCount)
        const x2 = categoryIndexToX(liveSelection.to, plotX, plotW, categoryCount)
        const left = Math.min(x1, x2)
        const right = Math.max(x1, x2)
        // Минимальная ширина 2px — чтобы выделение из одной точки было видимым.
        const w = Math.max(2, right - left)
        return { left, w }
      })()
    : null

  const fillColor = fill ?? DEFAULT_FILL
  const overlayStyle: CSSProperties | undefined = disabled
    ? { cursor: 'not-allowed' }
    : { cursor: 'crosshair' }

  return (
    <g
      className={unstyled ? undefined : 'sg-chart-brush'}
      data-sg-chart-brush=""
    >
      <rect
        ref={overlayRef}
        className={cls('overlay')}
        data-sg-chart-brush-overlay=""
        x={plotX}
        y={plotY}
        width={Math.max(0, plotW)}
        height={Math.max(0, plotH)}
        fill="transparent"
        style={overlayStyle}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onDoubleClick={handleDoubleClick}
      />
      {selectionRect && (
        <rect
          className={cls('selection')}
          data-sg-chart-brush-selection=""
          x={selectionRect.left}
          y={plotY}
          width={selectionRect.w}
          height={Math.max(0, plotH)}
          fill={fillColor}
          fillOpacity={0.15}
          stroke={fillColor}
          strokeOpacity={0.5}
          strokeWidth={1}
          pointerEvents="none"
        />
      )}
    </g>
  )
}
