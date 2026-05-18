import { Fragment } from 'react'
import type { ChartCategory, XAxisOptions, YAxisOptions } from './types'

/**
 * Internal helper — renders X and / or Y axes on top of an existing chart
 * SVG. Stays a pure presentational component (no hooks, no state) so it can
 * be used inside Line / Bar / Area without affecting their existing layout.
 *
 * Both `xAxis` and `yAxis` are optional; if neither is provided the
 * component renders nothing (preserves the v0 "no chrome" look).
 *
 * Coordinates are in the parent SVG's user space:
 *   - `(plotX, plotY)` is the top-left corner of the plot area.
 *   - `plotW` / `plotH` are the plot dimensions in pixels.
 *   - `min` / `max` bound the numeric Y range that the plot maps to.
 *
 * `xPositions` is optional: when provided it overrides the default
 * "evenly-spaced" placement (used by Line / Area). BarChart passes its own
 * group centres so ticks align with the visual middle of each bar group.
 */
export interface ChartAxesProps {
  /** Top-left X of the plot area. */
  plotX: number
  /** Top-left Y of the plot area. */
  plotY: number
  /** Plot area width in pixels. */
  plotW: number
  /** Plot area height in pixels. */
  plotH: number
  /** Lower bound of the numeric Y range. */
  min: number
  /** Upper bound of the numeric Y range. */
  max: number
  /** X-axis categories. Used to label ticks. */
  categories: readonly ChartCategory[]
  /**
   * Optional explicit X position per category (in plot coordinates). When
   * omitted, ticks are placed evenly: `plotX + i * plotW / (n - 1)`.
   */
  xPositions?: readonly number[]
  /** X-axis configuration. Omit to skip the X axis entirely. */
  xAxis?: XAxisOptions
  /** Y-axis configuration. Omit to skip the Y axis entirely. */
  yAxis?: YAxisOptions
  /** Drop default `sg-chart-axis-*` class names. */
  unstyled?: boolean
}

const DEFAULT_Y_TICKS = 5
const TICK_LEN = 4
const TICK_LABEL_GAP = 6

function defaultYFormatter(value: number): string {
  if (Number.isInteger(value)) return String(value)
  if (Math.abs(value) >= 1000) return value.toFixed(0)
  if (Math.abs(value) >= 1) return value.toFixed(2).replace(/\.?0+$/, '')
  return value.toFixed(2)
}

function pickXIndices(total: number, tickCount: number | undefined): number[] {
  if (total <= 0) return []
  if (tickCount === undefined || tickCount >= total) {
    return Array.from({ length: total }, (_, i) => i)
  }
  const k = Math.max(2, tickCount)
  const step = total - 1
  const seen = new Set<number>()
  const out: number[] = []
  for (let i = 0; i < k; i++) {
    const idx = Math.round((i / (k - 1)) * step)
    if (!seen.has(idx)) {
      seen.add(idx)
      out.push(idx)
    }
  }
  return out
}

export function ChartAxes({
  plotX,
  plotY,
  plotW,
  plotH,
  min,
  max,
  categories,
  xPositions,
  xAxis,
  yAxis,
  unstyled = false,
}: ChartAxesProps) {
  if (!xAxis && !yAxis) return null

  const yTickCount = Math.max(2, yAxis?.tickCount ?? DEFAULT_Y_TICKS)
  const range = max - min || 1
  const yTicks: { value: number; y: number }[] = []
  if (yAxis) {
    for (let i = 0; i < yTickCount; i++) {
      const t = i / (yTickCount - 1)
      const value = min + t * range
      const y = plotY + plotH - t * plotH
      yTicks.push({ value, y })
    }
  }

  const categoryCount = categories.length
  const defaultXFor = (i: number) =>
    categoryCount > 1 ? plotX + (i / (categoryCount - 1)) * plotW : plotX + plotW / 2
  const xFor = (i: number) => xPositions?.[i] ?? defaultXFor(i)

  const xIndices = xAxis ? pickXIndices(categoryCount, xAxis.tickCount) : []

  const yFmt = yAxis?.tickFormatter ?? defaultYFormatter
  const xFmt = xAxis?.tickFormatter

  const cls = (suffix: string) => (unstyled ? undefined : `sg-chart-axis-${suffix}`)

  return (
    <g
      className={unstyled ? undefined : 'sg-chart-axis'}
      data-sg-chart-axes=""
      pointerEvents="none"
    >
      {yAxis?.gridLines &&
        yTicks.map((t, i) => (
          <line
            key={`yg-${i}`}
            className={cls('grid')}
            data-sg-axis-grid=""
            x1={plotX}
            x2={plotX + plotW}
            y1={t.y}
            y2={t.y}
            stroke="var(--sg-color-border-secondary, var(--sg-color-border))"
            strokeWidth={1}
            strokeDasharray="2 2"
          />
        ))}

      {yAxis && (
        <g className={cls('y')} data-sg-axis="y">
          <line
            x1={plotX}
            x2={plotX}
            y1={plotY}
            y2={plotY + plotH}
            stroke="var(--sg-color-border)"
            strokeWidth={1}
          />
          {yTicks.map((t, i) => (
            <Fragment key={`yt-${i}`}>
              <line
                className={cls('tick')}
                data-sg-axis-tick="y"
                x1={plotX - TICK_LEN}
                x2={plotX}
                y1={t.y}
                y2={t.y}
                stroke="var(--sg-color-border)"
                strokeWidth={1}
              />
              <text
                className={cls('tick-label')}
                data-sg-axis-tick-label="y"
                x={plotX - TICK_LEN - TICK_LABEL_GAP}
                y={t.y}
                fontSize={11}
                fill="var(--sg-color-text-secondary)"
                textAnchor="end"
                dominantBaseline="central"
              >
                {yFmt(t.value)}
              </text>
            </Fragment>
          ))}
          {yAxis.label && (
            <text
              className={cls('label')}
              data-sg-axis-label="y"
              fontSize={11}
              fontWeight={600}
              fill="var(--sg-color-text)"
              textAnchor="middle"
              dominantBaseline="hanging"
              transform={`translate(2, ${plotY + plotH / 2}) rotate(-90)`}
            >
              {yAxis.label}
            </text>
          )}
        </g>
      )}

      {xAxis && categoryCount > 0 && (
        <g className={cls('x')} data-sg-axis="x">
          <line
            x1={plotX}
            x2={plotX + plotW}
            y1={plotY + plotH}
            y2={plotY + plotH}
            stroke="var(--sg-color-border)"
            strokeWidth={1}
          />
          {xIndices.map((idx) => {
            const cx = xFor(idx)
            const cat = categories[idx]!
            const text = xFmt ? xFmt(cat, idx) : String(cat)
            return (
              <Fragment key={`xt-${idx}`}>
                <line
                  className={cls('tick')}
                  data-sg-axis-tick="x"
                  x1={cx}
                  x2={cx}
                  y1={plotY + plotH}
                  y2={plotY + plotH + TICK_LEN}
                  stroke="var(--sg-color-border)"
                  strokeWidth={1}
                />
                <text
                  className={cls('tick-label')}
                  data-sg-axis-tick-label="x"
                  x={cx}
                  y={plotY + plotH + TICK_LEN + TICK_LABEL_GAP}
                  fontSize={11}
                  fill="var(--sg-color-text-secondary)"
                  textAnchor="middle"
                  dominantBaseline="hanging"
                >
                  {text}
                </text>
              </Fragment>
            )
          })}
          {xAxis.label && (
            <text
              className={cls('label')}
              data-sg-axis-label="x"
              x={plotX + plotW / 2}
              y={plotY + plotH + TICK_LEN + TICK_LABEL_GAP + 14}
              fontSize={11}
              fontWeight={600}
              fill="var(--sg-color-text)"
              textAnchor="middle"
              dominantBaseline="hanging"
            >
              {xAxis.label}
            </text>
          )}
        </g>
      )}
    </g>
  )
}
