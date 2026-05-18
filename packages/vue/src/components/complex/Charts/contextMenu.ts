/**
 * Chart context-menu factory utilities — Vue port of React's
 * `chartContextMenu.ts`. Same exports, same shapes, same suppression
 * contracts, but typed against the native DOM `MouseEvent` (Vue templates
 * receive the original DOM event, no React synthetic-event layer).
 */

/**
 * Payload for series-level context menus (right-click on a line segment,
 * marker, bar, slice, or area path).
 */
export interface ChartSeriesContextMenuPayload {
  /** The original `ChartSeries.id` (or pie slice id). */
  seriesId: string
  /** Index of the series in the `series` array (0-based). For pies — the slice index. */
  seriesIndex: number
  /** X-axis category index (0-based). Undefined for chart-level pie events. */
  valueIndex?: number
  /** Numeric value at this point (when applicable). */
  value?: number
}

/**
 * Payload for chart-level context menus (right-click on empty plot area,
 * axes, or grid).
 */
export interface ChartContextMenuPayload {
  /** X in CSS pixels relative to the SVG. */
  x: number
  /** Y in CSS pixels relative to the SVG. */
  y: number
  /** X in SVG user-space (same as x for non-stretched SVGs). */
  plotX: number
  /** Y in SVG user-space. */
  plotY: number
}

/** Series context-menu callback signature. */
export type ChartSeriesContextMenuHandler = (
  event: MouseEvent,
  payload: ChartSeriesContextMenuPayload,
) => void

/** Chart-level context-menu callback signature. */
export type ChartContextMenuHandler = (event: MouseEvent, payload: ChartContextMenuPayload) => void

/**
 * Build an `oncontextmenu` handler for a series visual (line segment /
 * marker / bar / area path / pie slice).
 *
 * - If `handler` is undefined, returns `undefined` (native browser menu
 *   stays open).
 * - Otherwise calls `event.preventDefault()` + `event.stopPropagation()`
 *   so the chart-level handler doesn't double-fire and the native menu
 *   is suppressed.
 */
export function makeSeriesContextMenuHandler(
  handler: ChartSeriesContextMenuHandler | undefined,
  payload: ChartSeriesContextMenuPayload,
): ((e: MouseEvent) => void) | undefined {
  if (!handler) return undefined
  return (e) => {
    e.preventDefault()
    e.stopPropagation()
    handler(e, payload)
  }
}

/**
 * Build an `oncontextmenu` handler for the SVG root (chart-level). If the
 * caller doesn't want a custom menu, returns `undefined` — the browser's
 * native menu stays untouched.
 */
export function makeChartContextMenuHandler(
  handler: ChartContextMenuHandler | undefined,
): ((e: MouseEvent) => void) | undefined {
  if (!handler) return undefined
  return (e) => {
    e.preventDefault()
    const svg = e.currentTarget as SVGSVGElement | null
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    // CSS-pixel → SVG user-space via the viewBox. For non-stretched SVGs
    // (our chart layout) the coordinates coincide.
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
