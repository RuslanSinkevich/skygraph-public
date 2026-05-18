import type { MouseEvent as ReactMouseEvent } from 'react'

/**
 * Payload для контекстного меню по серии / отдельной точке. Отдаётся в
 * `onSeriesContextMenu` ровно тогда, когда пользователь правой кнопкой
 * кликнул по визуальному элементу серии (line-segment, marker, bar, slice,
 * area-path).
 */
export interface ChartSeriesContextMenuPayload {
  /** `id` исходного `ChartSeries` или `PieChartSlice`. */
  seriesId: string
  /** Индекс серии в массиве `series` (0-based). Для Pie — индекс slice-а. */
  seriesIndex: number
  /** Индекс категории по X (0-based). Не определён для chart-уровня pie. */
  valueIndex?: number
  /** Числовое значение в этой точке (если применимо). */
  value?: number
}

/**
 * Payload для контекстного меню по чарту в целом (клик правой кнопкой по
 * пустому месту плот-области, осям, сетке).
 */
export interface ChartContextMenuPayload {
  /** X в CSS-пикселях относительно SVG. */
  x: number
  /** Y в CSS-пикселях относительно SVG. */
  y: number
  /** X в координатах SVG user-space (то же, что и x для не-stretch SVG). */
  plotX: number
  /** Y в координатах SVG user-space. */
  plotY: number
}

/** Сигнатура коллбэка `onSeriesContextMenu`. */
export type ChartSeriesContextMenuHandler = (
  event: ReactMouseEvent,
  payload: ChartSeriesContextMenuPayload,
) => void

/** Сигнатура коллбэка `onChartContextMenu`. */
export type ChartContextMenuHandler = (
  event: ReactMouseEvent,
  payload: ChartContextMenuPayload,
) => void

/**
 * Создаёт `onContextMenu`-обработчик для visual-элемента серии (line-
 * segment / marker / bar / area-path / pie-slice).
 *
 * - Если `handler` не задан — возвращает `undefined` (нативный browser
 *   menu остаётся валидным).
 * - Иначе вызывает `event.preventDefault()` + `event.stopPropagation()`,
 *   чтобы chart-уровневый handler не сработал и не открылось браузерное
 *   меню.
 */
export function makeSeriesContextMenuHandler(
  handler: ChartSeriesContextMenuHandler | undefined,
  payload: ChartSeriesContextMenuPayload,
): ((e: ReactMouseEvent) => void) | undefined {
  if (!handler) return undefined
  return (e) => {
    e.preventDefault()
    e.stopPropagation()
    handler(e, payload)
  }
}

/**
 * Создаёт `onContextMenu`-обработчик для SVG-корня (chart-уровень). Если
 * не задан — возвращает `undefined`, чтобы НЕ блокировать дефолтное
 * браузерное меню.
 */
export function makeChartContextMenuHandler(
  handler: ChartContextMenuHandler | undefined,
): ((e: ReactMouseEvent<SVGSVGElement>) => void) | undefined {
  if (!handler) return undefined
  return (e) => {
    e.preventDefault()
    const svg = e.currentTarget
    const rect = svg.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    // Mapping CSS-pixel → SVG user-space через viewBox. Для не-stretch
    // SVG (наш случай — viewBox = реальные размеры) coords совпадают.
    let plotX = x
    let plotY = y
    const vb = svg.viewBox?.baseVal
    if (vb && vb.width > 0 && vb.height > 0 && rect.width > 0 && rect.height > 0) {
      plotX = (x / rect.width) * vb.width
      plotY = (y / rect.height) * vb.height
    }
    handler(e, { x, y, plotX, plotY })
  }
}
