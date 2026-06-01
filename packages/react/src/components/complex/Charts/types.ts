import type { CSSProperties } from 'react'
import type { PrintableProp } from '../../../utils/print'
import type { ChartActionsProp } from './ChartHoverToolbar'
import type { ChartContextMenuHandler, ChartSeriesContextMenuHandler } from './chartContextMenu'

/** A single category along the X axis. */
export type ChartCategory = string | number

/** Numeric value for a series at a specific category. */
export type ChartValue = number | null

/** One series — a logical line / bar / pie slice with a label and values. */
export interface ChartSeries {
  /** Unique identifier (used for keying React lists and color resolution). */
  id: string
  /** Human-readable label used in legend / tooltip. */
  label: string
  /** Optional explicit colour (CSS value). Defaults to a deterministic palette by index. */
  color?: string
  /**
   * Per-category values. Index N corresponds to `categories[N]`.
   * Use `null` to mark a gap (line will be split, bar will be hidden).
   */
  values: readonly ChartValue[]
}

/**
 * X axis configuration. Off by default — when `xAxis` is omitted no axis
 * elements are rendered (backward-compat with v0).
 */
export interface XAxisOptions {
  /**
   * Number of category ticks to render. If omitted or larger than the number
   * of categories, every category is labelled. Otherwise N evenly-spaced
   * categories are picked (always including the first and last).
   */
  tickCount?: number
  /** Format the visible category label. Default: `String(category)`. */
  tickFormatter?: (category: ChartCategory, index: number) => string
  /** Optional axis title rendered below the plot. */
  label?: string
}

/**
 * Y axis configuration. Off by default — when `yAxis` is omitted no axis
 * elements are rendered (backward-compat with v0).
 */
export interface YAxisOptions {
  /** Number of evenly-spaced ticks (including endpoints). @default 5 */
  tickCount?: number
  /** Format the visible numeric tick label. Default: short numeric. */
  tickFormatter?: (value: number) => string
  /** Optional axis title rendered to the left of the plot (rotated). */
  label?: string
  /** Render horizontal gridlines at each tick. @default false */
  gridLines?: boolean
}

/**
 * Animation configuration for chart mount / data transitions.
 *
 * - `true` / omitted — enable with default duration (600ms).
 * - `false` — disable entirely (no animation classes / styles applied).
 * - `{ duration: ms }` — explicit duration in milliseconds.
 *
 * Implementation is pure CSS (no `requestAnimationFrame` loops): we pass the
 * duration as a `--sg-chart-anim-duration` custom property on the animated
 * elements and let `@keyframes` in `charts.css` handle the timing.
 */
export type ChartAnimation = boolean | { duration?: number }

/** Default animation duration in milliseconds (when `animate` is not given a number). */
export const DEFAULT_CHART_ANIMATION_MS = 600

/** Resolves a `ChartAnimation` value into a normalized `{ enabled, duration }` shape. */
export function resolveChartAnimation(animate: ChartAnimation | undefined): {
  enabled: boolean
  duration: number
} {
  if (animate === false) return { enabled: false, duration: 0 }
  if (animate === undefined || animate === true) {
    return { enabled: true, duration: DEFAULT_CHART_ANIMATION_MS }
  }
  return {
    enabled: true,
    duration: animate.duration ?? DEFAULT_CHART_ANIMATION_MS,
  }
}

/**
 * Builds a stable string key from a list of values that re-mounts animated
 * subtrees only when the data really changes (categories / series). Used as
 * `key={...}` on animated `<g>` groups so CSS animations re-trigger on data
 * updates, not on every render.
 */
export function chartDataKey(parts: readonly unknown[]): string {
  let out = ''
  for (let i = 0; i < parts.length; i++) {
    if (i > 0) out += '|'
    try {
      out += JSON.stringify(parts[i])
    } catch {
      out += String(parts[i])
    }
  }
  return out
}

/** Common shape for chart props. */
export interface BaseChartProps {
  /** Categories along the X axis. */
  categories: readonly ChartCategory[]
  /** One or more data series. */
  series: readonly ChartSeries[]
  /** Width of the chart in CSS units. Defaults to `'100%'`. */
  width?: number | string
  /** Height of the chart in pixels. Defaults to `200`. */
  height?: number
  /** Optional class name on the root SVG. */
  className?: string
  /** Optional inline style on the root SVG. */
  style?: CSSProperties
  /** Drop default `sg-chart-*` classes (headless mode). */
  unstyled?: boolean
  /** Padding around the plot area in pixels (number or [top, right, bottom, left]). */
  padding?: number | readonly [number, number, number, number]
  /** Show a small horizontal legend below the SVG. @default false */
  legend?: boolean
  /**
   * Mount / data-change animation toggle. Pure CSS, no rAF loops.
   * @default true
   */
  animate?: ChartAnimation
  /**
   * Optional X axis configuration. When omitted, no x-axis is rendered
   * (v0 backward-compat). When provided, ticks / labels / optional title
   * are drawn inside the SVG via `<ChartAxes>`.
   */
  xAxis?: XAxisOptions
  /**
   * Optional Y axis configuration. When omitted, no y-axis is rendered.
   * Set `gridLines: true` to draw horizontal grid lines across the plot.
   */
  yAxis?: YAxisOptions
  /**
   * Включает поддержку `ref.print()`. Сама печать триггерится императивно
   * через ref. `{ fileName }` задаёт имя popup-окна.
   * @default false
   */
  printable?: PrintableProp
  /**
   * Hover-toolbar в правом верхнем углу чарта с действиями (print, export
   * SVG/PNG, сброс brush). `true` — дефолтный набор; `ChartAction[]` —
   * кастомный. По умолчанию выключено.
   */
  actions?: ChartActionsProp
  /**
   * Базовое имя файла без расширения для экспортов SVG / PNG / print.
   * @default 'chart'
   */
  fileName?: string
  /**
   * Контекстное меню (правая кнопка) по элементу серии: line-segment,
   * marker, bar, area-path. Если задано — браузерное меню блокируется
   * `event.preventDefault()`.
   */
  onSeriesContextMenu?: ChartSeriesContextMenuHandler
  /**
   * Контекстное меню (правая кнопка) по плот-области чарта (вне серий).
   * Если задано — браузерное меню блокируется `event.preventDefault()`.
   */
  onChartContextMenu?: ChartContextMenuHandler
}

/** Default colour palette — uses tokens so charts re-theme without code changes. */
export const DEFAULT_PALETTE = [
  'var(--sg-color-primary)',
  'var(--sg-color-success)',
  'var(--sg-color-warning)',
  'var(--sg-color-error)',
  'var(--sg-blue-4)',
  'var(--sg-orange-5)',
  'var(--sg-green-5)',
  'var(--sg-red-5)',
] as const

export function colorForSeries(series: ChartSeries, index: number): string {
  return series.color ?? DEFAULT_PALETTE[index % DEFAULT_PALETTE.length]!
}

export function normalizePadding(p: BaseChartProps['padding']): [number, number, number, number] {
  if (p === undefined) return [16, 16, 24, 32]
  if (typeof p === 'number') return [p, p, p, p]
  return [...p]
}

/**
 * Default formatter used by Y-axis tick labels when consumers don't supply
 * their own. Exposed so {@link estimateYAxisLabelWidth} can probe sizing
 * without coupling to the renderer.
 */
export function defaultYTickFormatter(value: number): string {
  if (Number.isInteger(value)) return String(value)
  if (Math.abs(value) >= 1000) return value.toFixed(0)
  if (Math.abs(value) >= 1) return value.toFixed(2).replace(/\.?0+$/, '')
  return value.toFixed(2)
}

/**
 * Estimate the rendered width (in user-space px) of the widest Y-axis tick
 * label produced for the [`min`, `max`] range. Heuristic — assumes a ~6.5 px
 * tabular digit metric at the 11 px font-size used in `ChartAxes`. Used by
 * the chart components to grow the left padding so multi-digit labels like
 * "2617" don't clip against the SVG edge.
 */
export function estimateYAxisLabelWidth(
  min: number,
  max: number,
  tickCount: number | undefined,
  formatter?: (value: number) => string,
): number {
  const fmt = formatter ?? defaultYTickFormatter
  const count = Math.max(2, tickCount ?? 5)
  let maxLen = 0
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1)
    const value = min + t * (max - min)
    const s = fmt(value)
    if (s.length > maxLen) maxLen = s.length
  }
  // ~7 px per glyph at font-size 11 (SVG text in ChartAxes). Conservative
  // upper bound — wide system fonts (e.g. Windows Segoe UI) can render digits
  // a touch wider than the geometric ideal.
  return maxLen * 7
}

/**
 * Resolve effective chart padding. When the user did not supply `padding`,
 * grow the left side so Y-axis tick labels fit. User-supplied padding is
 * honoured verbatim. Returns `[top, right, bottom, left]`.
 */
export function resolveChartPadding(
  userPadding: BaseChartProps['padding'],
  yAxis: YAxisOptions | undefined,
  yMin: number,
  yMax: number,
): [number, number, number, number] {
  const base = normalizePadding(userPadding)
  if (userPadding !== undefined || !yAxis) return base
  const labelW = estimateYAxisLabelWidth(yMin, yMax, yAxis.tickCount, yAxis.tickFormatter)
  // TICK_LEN(4) + TICK_LABEL_GAP(6) + safety(8)
  const need = Math.ceil(labelW + 18)
  if (need > base[3]) base[3] = need
  if (yAxis.label) base[3] += 16
  return base
}

export function chartBounds(values: readonly (readonly ChartValue[])[]): {
  min: number
  max: number
} {
  let min = Infinity
  let max = -Infinity
  for (const row of values) {
    for (const v of row) {
      if (v === null || v === undefined) continue
      if (v < min) min = v
      if (v > max) max = v
    }
  }
  if (!Number.isFinite(min)) min = 0
  if (!Number.isFinite(max)) max = 0
  if (min === max) {
    if (min === 0) max = 1
    else {
      min = Math.min(0, min)
    }
  }
  return { min, max }
}
