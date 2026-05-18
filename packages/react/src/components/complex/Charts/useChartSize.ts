import { useEffect, useRef, useState } from 'react'

/** Измеренный размер контейнера / SVG-элемента в пикселях. */
export interface ChartSize {
  /** Целочисленная ширина контейнера в CSS-пикселях. */
  width: number
  /** Целочисленная высота контейнера в CSS-пикселях. */
  height: number
}

/**
 * Хук, отслеживающий реальный размер DOM-элемента через `ResizeObserver`.
 *
 * Возвращает `{ width, height }` в CSS-пикселях. До первого срабатывания
 * RO (или в окружениях без `ResizeObserver` — SSR / jsdom) отдаёт
 * `fallback`. Это безопасно для рендера до mount-а: чарты используют
 * fallback-размеры (как правило, дефолтные `600 × height`-prop), а после
 * mount-а — пересчитываются по реальному размеру контейнера.
 *
 * Округление результата исключает суб-пиксельные дёрганья при resize-loop
 * (один пиксель туда-сюда из-за zoom / scrollbar).
 *
 * Не реагирует на смену самого `ref` (наблюдает только текущий
 * `ref.current`); в SkyGraph-чартах ref стабилен на всю жизнь компонента,
 * поэтому это ok.
 */
export function useChartSize<T extends Element>(
  ref: React.RefObject<T | null>,
  fallback: ChartSize,
): ChartSize {
  const [size, setSize] = useState<ChartSize>(fallback)
  // Храним последнее измерение в ref, чтобы избежать setState с тем же
  // значением (и лишней перерисовки) на повторных RO-эвентах.
  const lastRef = useRef<ChartSize>(size)

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined

    const apply = (w: number, h: number) => {
      if (!Number.isFinite(w) || !Number.isFinite(h)) return
      if (w <= 0 || h <= 0) return
      const next: ChartSize = { width: Math.round(w), height: Math.round(h) }
      const prev = lastRef.current
      if (prev.width === next.width && prev.height === next.height) return
      lastRef.current = next
      setSize(next)
    }

    if (typeof ResizeObserver === 'undefined') {
      const r = el.getBoundingClientRect()
      apply(r.width, r.height)
      return undefined
    }

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      // `contentRect` доступен везде; `borderBoxSize` (Chrome) даёт более
      // точные данные, но `contentRect` достаточно для CSS-пикселей плот-
      // области.
      const cr = entry.contentRect
      apply(cr.width, cr.height)
    })

    // Сразу подхватываем текущий размер до первого RO-callback (RO
    // диспатчит первый event асинхронно).
    const r = el.getBoundingClientRect()
    apply(r.width, r.height)

    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])

  return size
}
