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

export function normalizePadding(
  p: BaseChartProps['padding'],
): [number, number, number, number] {
  if (p === undefined) return [16, 16, 24, 32]
  if (typeof p === 'number') return [p, p, p, p]
  return [...p]
}

export function chartBounds(
  values: readonly (readonly ChartValue[])[],
): { min: number; max: number } {
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
