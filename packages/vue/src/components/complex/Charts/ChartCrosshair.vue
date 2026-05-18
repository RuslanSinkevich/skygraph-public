<script setup lang="ts">
/**
 * Shared SVG overlay for chart crosshair / hover tooltip — Vue port of
 * React's `ChartCrosshair`.
 *
 * Pure presentational: no state, no listeners. The parent chart owns the
 * mouse logic and decides when this component renders.
 *
 * DOM and `sg-chart-crosshair-*` class set match the React adapter
 * one-to-one. See CHARTER §9 (API parity).
 */
import { computed } from 'vue'
import type { ChartCategory } from './types'

/** One labelled value displayed in the crosshair tooltip column. */
export interface ChartCrosshairPoint {
  /** Series label (matches `ChartSeries.label`). */
  label: string
  /** Numeric value at the hovered category. */
  value: number
  /** Resolved series colour (CSS value). */
  color: string
  /** Y coordinate (plot user-space) for the dot marker. */
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

const props = defineProps<ChartCrosshairProps>()

const TIP_WIDTH = 140
const TIP_LINE_HEIGHT = 14
const TIP_PADDING = 6
const TIP_GAP = 10

function defaultValueFormatter(value: number): string {
  if (Number.isInteger(value)) return String(value)
  if (Math.abs(value) >= 100) return value.toFixed(0)
  return value.toFixed(2).replace(/\.?0+$/, '')
}

const fmt = computed(() => props.valueFormatter ?? defaultValueFormatter)

const cls = (suffix: string) => (props.unstyled ? undefined : `sg-chart-crosshair-${suffix}`)

const tipMetrics = computed(() => {
  const headerHeight = TIP_LINE_HEIGHT + 2
  const tipHeight = TIP_PADDING * 2 + headerHeight + props.points.length * TIP_LINE_HEIGHT
  const wantRight = props.x + TIP_GAP + TIP_WIDTH <= props.plotX + props.plotW
  const tipX = wantRight ? props.x + TIP_GAP : props.x - TIP_GAP - TIP_WIDTH
  const tipY = Math.max(
    props.plotY,
    Math.min(props.plotY + props.plotH - tipHeight, props.plotY + 4),
  )
  return { tipX, tipY, tipHeight, headerHeight }
})

function rowY(i: number): number {
  return tipMetrics.value.tipY + TIP_PADDING + tipMetrics.value.headerHeight + i * TIP_LINE_HEIGHT
}
</script>

<template>
  <g
    :class="props.unstyled ? undefined : 'sg-chart-crosshair'"
    data-sg-chart-crosshair=""
    pointer-events="none"
  >
    <line
      :class="cls('line')"
      data-sg-chart-crosshair-line=""
      :x1="props.x"
      :x2="props.x"
      :y1="props.plotY"
      :y2="props.plotY + props.plotH"
      stroke="var(--sg-color-text-secondary)"
      :stroke-width="1"
      stroke-dasharray="3 3"
      :opacity="0.7"
    />

    <circle
      v-for="(p, i) in props.points"
      :key="`dot-${i}`"
      :class="cls('dot')"
      data-sg-chart-crosshair-dot=""
      :cx="props.x"
      :cy="p.y"
      :r="3.5"
      :fill="p.color"
      stroke="var(--sg-color-bg, #fff)"
      :stroke-width="1.5"
    />

    <g :class="cls('tooltip')" data-sg-chart-crosshair-tooltip="">
      <rect
        :class="cls('tooltip-bg')"
        :x="tipMetrics.tipX"
        :y="tipMetrics.tipY"
        :width="TIP_WIDTH"
        :height="tipMetrics.tipHeight"
        :rx="4"
        :ry="4"
        fill="var(--sg-color-bg, #fff)"
        stroke="var(--sg-color-border)"
        :stroke-width="1"
      />
      <text
        :class="cls('tooltip-title')"
        :x="tipMetrics.tipX + TIP_PADDING"
        :y="tipMetrics.tipY + TIP_PADDING + TIP_LINE_HEIGHT - 3"
        :font-size="11"
        :font-weight="600"
        fill="var(--sg-color-text)"
      >
        {{ String(props.category) }}
      </text>
      <template v-for="(p, i) in props.points" :key="`row-${i}`">
        <rect
          :x="tipMetrics.tipX + TIP_PADDING"
          :y="rowY(i) + 2"
          :width="8"
          :height="8"
          :rx="1"
          :fill="p.color"
        />
        <text
          :class="cls('tooltip-label')"
          :x="tipMetrics.tipX + TIP_PADDING + 12"
          :y="rowY(i) + TIP_LINE_HEIGHT - 3"
          :font-size="11"
          fill="var(--sg-color-text-secondary)"
        >
          {{ p.label }}
        </text>
        <text
          :class="cls('tooltip-value')"
          :x="tipMetrics.tipX + TIP_WIDTH - TIP_PADDING"
          :y="rowY(i) + TIP_LINE_HEIGHT - 3"
          :font-size="11"
          :font-weight="500"
          fill="var(--sg-color-text)"
          text-anchor="end"
        >
          {{ fmt(p.value) }}
        </text>
      </template>
    </g>
  </g>
</template>
