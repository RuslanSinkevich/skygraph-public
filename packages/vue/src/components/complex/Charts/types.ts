/**
 * Vue Charts — type definitions parallel to React's chart contract.
 *
 * Trimmed compared to React: drops ChartActionsProp, context menu handlers,
 * crosshair / brush specific options. Common props (categories / series /
 * width / height / legend / animate / xAxis / yAxis / padding) match exactly.
 */
import type { CSSProperties } from 'vue'

export type ChartCategory = string | number
export type ChartValue = number | null

export interface ChartSeries {
  id: string
  label: string
  color?: string
  values: readonly ChartValue[]
}

export interface XAxisOptions {
  tickCount?: number
  tickFormatter?: (category: ChartCategory, index: number) => string
  label?: string
}

export interface YAxisOptions {
  tickCount?: number
  tickFormatter?: (value: number) => string
  label?: string
  gridLines?: boolean
}

export type ChartAnimation = boolean | { duration?: number }

export const DEFAULT_CHART_ANIMATION_MS = 600

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

export interface BaseChartProps {
  categories: readonly ChartCategory[]
  series: readonly ChartSeries[]
  width?: number | string
  height?: number
  className?: string
  style?: CSSProperties
  unstyled?: boolean
  padding?: number | readonly [number, number, number, number]
  legend?: boolean
  animate?: ChartAnimation
  xAxis?: XAxisOptions
  yAxis?: YAxisOptions
  /** Base file name (without extension) for print. */
  fileName?: string
}

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
  // Left padding bumped to 44 to leave enough room for 4–5 char Y-axis tick
  // labels at font-size 10 (default `▲▼ 1234.5` etc.) — the SVG's UA
  // `overflow: hidden` would otherwise clip the leftmost digit.
  if (p === undefined) return [16, 16, 24, 44]
  if (typeof p === 'number') return [p, p, p, p]
  return [...p]
}

/**
 * Default formatter used by Y-axis tick labels when consumers don't supply
 * their own. Kept here so {@link estimateYAxisLabelWidth} can probe label
 * sizes without depending on the renderer.
 */
export function defaultYTickFormatter(value: number): string {
  if (Number.isInteger(value)) return String(value)
  if (Math.abs(value) >= 1000) return value.toFixed(0)
  if (Math.abs(value) >= 1) return value.toFixed(2).replace(/\.?0+$/, '')
  return value.toFixed(2)
}

/**
 * Estimate the maximum rendered width (in user-space px) of Y-axis tick
 * labels for the given numeric range. Used by chart components to grow the
 * left padding when the user hasn't pinned a custom value, so multi-digit
 * labels (e.g. "2617") never clip against the SVG edge.
 *
 * The width is a heuristic: it assumes a tabular digit metric of ~6.5 px at
 * the 10-11 px font-size used by `ChartAxes`. Good enough for numeric ticks;
 * formatters that emit very wide glyphs (CJK, emoji) may still want an
 * explicit `padding` override.
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
  // ~7 px per glyph at font-size 10/11 (SVG text in ChartAxes). Conservative
  // upper bound — wide system fonts (e.g. Windows Segoe UI) can render digits
  // a touch wider than the geometric ideal.
  return maxLen * 7
}

/**
 * Resolve effective chart padding. When the user did not supply `padding`,
 * grow the left side so Y-axis tick labels fit; growth is skipped when no
 * Y axis is rendered. User-supplied padding is honoured verbatim.
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
  // 6 px gap between label and plot edge + 8 px safety buffer (subpixel
  // rounding, font-metric drift, italic side-bearings).
  const need = Math.ceil(labelW + 14)
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
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    min = 0
    max = 1
  }
  if (min === max) {
    min -= 1
    max += 1
  }
  return { min, max }
}

export interface ChartExpose {
  print: (opts?: { fileName?: string }) => void
  exportSvg: (fileName?: string) => void
}
