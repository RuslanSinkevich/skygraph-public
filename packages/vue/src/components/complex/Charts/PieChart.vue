<script setup lang="ts">
import { ref, computed } from 'vue'
import { useChartSize } from '../../../composables/useChartSize'
import { printElement } from '../../../utils/print'
import { useConfig } from '../../ui/ConfigProvider.vue'
import {
  DEFAULT_PALETTE,
  colorForSeries,
  resolveChartAnimation,
  type BaseChartProps,
  type ChartSeries,
} from './types'
import ChartLegend from './ChartLegend.vue'

interface PieChartProps extends Omit<BaseChartProps, 'xAxis' | 'yAxis' | 'padding'> {
  /** Inner radius for donut effect, 0..1 fraction of outer radius. @default 0 */
  innerRadius?: number
  /** Render slice labels inside slices. @default false */
  labels?: boolean
}

const props = withDefaults(defineProps<PieChartProps>(), {
  width: '100%',
  height: 240,
  unstyled: false,
  legend: false,
  innerRadius: 0,
  labels: false,
  fileName: 'chart',
})

const rootRef = ref<HTMLDivElement | null>(null)
const svgRef = ref<SVGSVGElement | null>(null)
const cfg = useConfig()
const chartLabel = computed(() => cfg.value.locale?.charts?.pieChart ?? 'Pie chart')
const fallbackW = computed(() =>
  typeof props.width === 'number' && Number.isFinite(props.width) ? props.width : 320,
)
const fallbackH = computed(() =>
  typeof props.height === 'number' && Number.isFinite(props.height) ? props.height : 240,
)
const { size } = useChartSize(svgRef, { width: fallbackW.value, height: fallbackH.value })

const viewW = computed(() => size.value.width)
const viewH = computed(() => size.value.height)
const cx = computed(() => viewW.value / 2)
const cy = computed(() => viewH.value / 2)
const radius = computed(() => Math.max(0, Math.min(viewW.value, viewH.value) / 2 - 8))
const innerR = computed(() => Math.max(0, Math.min(0.95, props.innerRadius)) * radius.value)

const animation = computed(() => resolveChartAnimation(props.animate))

interface SliceDatum {
  id: string
  label: string
  color: string
  value: number
}

interface Slice extends SliceDatum {
  start: number
  end: number
  midAngle: number
  path: string
}

// Two supported shapes, auto-detected:
//   1) categories + ONE series with values aligned to categories
//      (each category becomes a slice, palette colors per category)
//   2) N series each contributing a single value
//      (each series becomes a slice, series.color or palette by index)
const sliceData = computed<SliceDatum[]>(() => {
  const cats = props.categories
  const series = props.series
  if (!series.length) return []
  const first = series[0]
  const useCategories =
    cats.length > 0 && series.length === 1 && first != null && first.values.length === cats.length
  if (useCategories && first) {
    return cats.map((cat, i) => ({
      id: `${first.id}-${i}`,
      label: String(cat),
      color: DEFAULT_PALETTE[i % DEFAULT_PALETTE.length]!,
      value: Math.max(0, Number(first.values[i] ?? 0)),
    }))
  }
  return series.map((s, i) => ({
    id: s.id,
    label: s.label,
    color: colorForSeries(s, i),
    value: Math.max(0, Number(s.values[0] ?? 0)),
  }))
})

const total = computed(() => {
  let sum = 0
  for (const d of sliceData.value) if (d.value > 0) sum += d.value
  return sum
})

const legendSeries = computed<ChartSeries[]>(() =>
  sliceData.value.map((d) => ({ id: d.id, label: d.label, color: d.color, values: [d.value] })),
)

function describeSlice(start: number, end: number): string {
  const r = radius.value
  const ir = innerR.value
  // Full-circle case: SVG arc with identical start/end points is invisible,
  // so split into two semicircles (or a donut ring) instead.
  const isFullCircle = end - start >= Math.PI * 2 - 1e-6
  if (isFullCircle) {
    if (ir <= 0) {
      return [
        `M${cx.value - r},${cy.value}`,
        `A${r},${r} 0 1 1 ${cx.value + r},${cy.value}`,
        `A${r},${r} 0 1 1 ${cx.value - r},${cy.value}`,
        'Z',
      ].join(' ')
    }
    return [
      `M${cx.value - r},${cy.value}`,
      `A${r},${r} 0 1 1 ${cx.value + r},${cy.value}`,
      `A${r},${r} 0 1 1 ${cx.value - r},${cy.value}`,
      `M${cx.value - ir},${cy.value}`,
      `A${ir},${ir} 0 1 0 ${cx.value + ir},${cy.value}`,
      `A${ir},${ir} 0 1 0 ${cx.value - ir},${cy.value}`,
      'Z',
    ].join(' ')
  }
  const x1 = cx.value + Math.cos(start) * r
  const y1 = cy.value + Math.sin(start) * r
  const x2 = cx.value + Math.cos(end) * r
  const y2 = cy.value + Math.sin(end) * r
  const largeArc = end - start > Math.PI ? 1 : 0
  if (ir <= 0) {
    return `M${cx.value},${cy.value} L${x1},${y1} A${r},${r} 0 ${largeArc} 1 ${x2},${y2} Z`
  }
  const ix1 = cx.value + Math.cos(end) * ir
  const iy1 = cy.value + Math.sin(end) * ir
  const ix2 = cx.value + Math.cos(start) * ir
  const iy2 = cy.value + Math.sin(start) * ir
  return [
    `M${x1},${y1}`,
    `A${r},${r} 0 ${largeArc} 1 ${x2},${y2}`,
    `L${ix1},${iy1}`,
    `A${ir},${ir} 0 ${largeArc} 0 ${ix2},${iy2}`,
    'Z',
  ].join(' ')
}

const slices = computed<Slice[]>(() => {
  const t = total.value
  if (t === 0) return []
  let acc = -Math.PI / 2
  const result: Slice[] = []
  for (const d of sliceData.value) {
    if (d.value <= 0) continue
    const span = (d.value / t) * Math.PI * 2
    const start = acc
    const end = acc + span
    result.push({
      ...d,
      start,
      end,
      midAngle: start + span / 2,
      path: describeSlice(start, end),
    })
    acc = end
  }
  return result
})

function sliceAnimStyle(index: number, count: number) {
  if (!animation.value.enabled) return undefined
  const d = animation.value.duration
  return {
    transformOrigin: `${cx.value}px ${cy.value}px`,
    animationDuration: `${d}ms`,
    animationDelay: `${(index / Math.max(1, count)) * (d * 0.4)}ms`,
  }
}

defineExpose({
  print: (opts: { fileName?: string } = {}) => {
    const el = rootRef.value
    if (!el) return
    printElement(el, { fileName: opts.fileName ?? props.fileName ?? 'chart' })
  },
  exportSvg: () => {
    const svg = svgRef.value
    if (!svg) return null
    return new XMLSerializer().serializeToString(svg)
  },
})
</script>

<template>
  <div
    ref="rootRef"
    :class="[!props.unstyled && 'sg-chart sg-chart-pie', props.className]"
    :style="{ width: typeof props.width === 'number' ? `${props.width}px` : props.width }"
    :data-animate="animation.enabled ? 'on' : 'off'"
  >
    <svg
      ref="svgRef"
      :viewBox="`0 0 ${viewW} ${viewH}`"
      :width="typeof props.width === 'number' ? props.width : '100%'"
      :height="props.height"
      role="img"
      :aria-label="chartLabel"
    >
      <g class="sg-chart-pie-slices">
        <path
          v-for="(s, i) in slices"
          :key="s.id"
          :class="[animation.enabled && !props.unstyled && 'sg-chart-pie-animate']"
          :d="s.path"
          :fill="s.color"
          :data-series-id="s.id"
          :style="sliceAnimStyle(i, slices.length)"
        >
          <title>{{ s.label }}: {{ s.value }}</title>
        </path>
      </g>
      <g v-if="props.labels" class="sg-chart-pie-labels">
        <text
          v-for="s in slices"
          :key="`${s.id}-label`"
          :x="cx + Math.cos(s.midAngle) * (radius * 0.7)"
          :y="cy + Math.sin(s.midAngle) * (radius * 0.7)"
          text-anchor="middle"
          dominant-baseline="middle"
          font-size="11"
          fill="#fff"
        >
          {{ Math.round((s.value / total) * 100) }}%
        </text>
      </g>
    </svg>
    <ChartLegend v-if="props.legend" :series="legendSeries" :unstyled="props.unstyled" />
  </div>
</template>
