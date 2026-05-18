<script setup lang="ts">
import { ref, computed } from 'vue'
import { useChartSize } from '../../../composables/useChartSize'
import { printElement } from '../../../utils/print'
import {
  colorForSeries,
  resolveChartAnimation,
  type BaseChartProps,
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

interface Slice {
  id: string
  label: string
  color: string
  value: number
  start: number
  end: number
  midAngle: number
  path: string
}

const total = computed(() => {
  let sum = 0
  for (const s of props.series) {
    const first = s.values[0]
    if (first != null && first > 0) sum += first
  }
  return sum
})

function describeSlice(start: number, end: number): string {
  const r = radius.value
  const ir = innerR.value
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
  for (let i = 0; i < props.series.length; i++) {
    const s = props.series[i]
    const v = s.values[0] ?? 0
    if (!v || v <= 0) continue
    const span = (v / t) * Math.PI * 2
    const start = acc
    const end = acc + span
    result.push({
      id: s.id,
      label: s.label,
      value: v,
      color: colorForSeries(s, i),
      start,
      end,
      midAngle: start + span / 2,
      path: describeSlice(start, end),
    })
    acc = end
  }
  return result
})

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
      aria-label="Pie chart"
    >
      <g class="sg-chart-pie-slices">
        <path
          v-for="s in slices"
          :key="s.id"
          :d="s.path"
          :fill="s.color"
          :data-series-id="s.id"
        >
          <title>{{ s.label }}: {{ s.value }}</title>
        </path>
        <text
          v-for="s in slices"
          v-if="props.labels"
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
    <ChartLegend v-if="props.legend" :series="props.series" :unstyled="props.unstyled" />
  </div>
</template>
