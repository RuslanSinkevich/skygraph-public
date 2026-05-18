import { Fragment } from 'react'
import type { ChartCategory } from './types'

/** One labelled value to display in the crosshair tooltip column. */
export interface ChartCrosshairPoint {
  /** Series label (matches `ChartSeries.label`). */
  label: string
  /** Numeric value at the hovered category. */
  value: number
  /** Resolved series colour (CSS value). */
  color: string
  /** Y coordinate (in plot user-space) for the dot marker. */
  y: number
}

export interface ChartCrosshairProps {
  /** X coordinate of the vertical line (plot user-space). */
  x: number
  /** Top-left X of the plot area (used for tooltip horizontal clamping). */
  plotX: number
  /** Top-left Y of the plot area (top of the vertical line). */
  plotY: number
  /** Plot height (length of the vertical line). */
  plotH: number
  /** Plot width (used for tooltip clamping). */
  plotW: number
  /** Hovered category — shown as the tooltip header. */
  category: ChartCategory
  /** Per-series snapshot of value + dot position at the hovered X. */
  points: readonly ChartCrosshairPoint[]
  /** Drop the default `sg-chart-crosshair-*` class names. */
  unstyled?: boolean
  /** Optional formatter for numeric values shown in the tooltip. */
  valueFormatter?: (value: number) => string
}

const TIP_WIDTH = 140
const TIP_LINE_HEIGHT = 14
const TIP_PADDING = 6
const TIP_GAP = 10

function defaultValueFormatter(value: number): string {
  if (Number.isInteger(value)) return String(value)
  if (Math.abs(value) >= 100) return value.toFixed(0)
  return value.toFixed(2).replace(/\.?0+$/, '')
}

/**
 * Shared SVG overlay for chart crosshair / hover tooltip.
 *
 * Renders a vertical guide line at `x`, a small dot for each non-null series
 * value at the hovered category, and a tooltip card listing the values. The
 * tooltip flips to the left of the line when there is not enough space on the
 * right inside `[plotX, plotX + plotW]`.
 *
 * Pure presentational: no state, no listeners — the parent chart owns the
 * mouse logic and decides when to render this component.
 */
export function ChartCrosshair({
  x,
  plotX,
  plotY,
  plotH,
  plotW,
  category,
  points,
  unstyled,
  valueFormatter = defaultValueFormatter,
}: ChartCrosshairProps) {
  const cls = (suffix: string) => (unstyled ? undefined : `sg-chart-crosshair-${suffix}`)

  const headerHeight = TIP_LINE_HEIGHT + 2
  const tipHeight = TIP_PADDING * 2 + headerHeight + points.length * TIP_LINE_HEIGHT

  const wantRight = x + TIP_GAP + TIP_WIDTH <= plotX + plotW
  const tipX = wantRight ? x + TIP_GAP : x - TIP_GAP - TIP_WIDTH
  const tipY = Math.max(plotY, Math.min(plotY + plotH - tipHeight, plotY + 4))

  return (
    <g
      className={unstyled ? undefined : 'sg-chart-crosshair'}
      data-sg-chart-crosshair=""
      pointerEvents="none"
    >
      <line
        className={cls('line')}
        data-sg-chart-crosshair-line=""
        x1={x}
        x2={x}
        y1={plotY}
        y2={plotY + plotH}
        stroke="var(--sg-color-text-secondary)"
        strokeWidth={1}
        strokeDasharray="3 3"
        opacity={0.7}
      />

      {points.map((p, i) => (
        <circle
          key={`dot-${i}`}
          className={cls('dot')}
          data-sg-chart-crosshair-dot=""
          cx={x}
          cy={p.y}
          r={3.5}
          fill={p.color}
          stroke="var(--sg-color-bg, #fff)"
          strokeWidth={1.5}
        />
      ))}

      <g className={cls('tooltip')} data-sg-chart-crosshair-tooltip="">
        <rect
          className={cls('tooltip-bg')}
          x={tipX}
          y={tipY}
          width={TIP_WIDTH}
          height={tipHeight}
          rx={4}
          ry={4}
          fill="var(--sg-color-bg, #fff)"
          stroke="var(--sg-color-border)"
          strokeWidth={1}
        />
        <text
          className={cls('tooltip-title')}
          x={tipX + TIP_PADDING}
          y={tipY + TIP_PADDING + TIP_LINE_HEIGHT - 3}
          fontSize={11}
          fontWeight={600}
          fill="var(--sg-color-text)"
        >
          {String(category)}
        </text>
        {points.map((p, i) => {
          const rowY = tipY + TIP_PADDING + headerHeight + i * TIP_LINE_HEIGHT
          return (
            <Fragment key={`row-${i}`}>
              <rect
                x={tipX + TIP_PADDING}
                y={rowY + 2}
                width={8}
                height={8}
                rx={1}
                fill={p.color}
              />
              <text
                className={cls('tooltip-label')}
                x={tipX + TIP_PADDING + 12}
                y={rowY + TIP_LINE_HEIGHT - 3}
                fontSize={11}
                fill="var(--sg-color-text-secondary)"
              >
                {p.label}
              </text>
              <text
                className={cls('tooltip-value')}
                x={tipX + TIP_WIDTH - TIP_PADDING}
                y={rowY + TIP_LINE_HEIGHT - 3}
                fontSize={11}
                fontWeight={500}
                fill="var(--sg-color-text)"
                textAnchor="end"
              >
                {valueFormatter(p.value)}
              </text>
            </Fragment>
          )
        })}
      </g>
    </g>
  )
}
