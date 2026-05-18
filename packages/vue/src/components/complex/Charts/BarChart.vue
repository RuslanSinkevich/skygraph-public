<script setup lang="ts">
import { ref, computed } from 'vue'
import { useChartSize } from '../../../composables/useChartSize'
import { printElement } from '../../../utils/print'
import {
  chartBounds,
  colorForSeries,
  normalizePadding,
  resolveChartAnimation,
  type BaseChartProps,
} from './types'
import ChartLegend from './ChartLegend.vue'
import ChartAxes from './ChartAxes.vue'

interface BarChartProps extends BaseChartProps {
  /** Stack series instead of grouping them side-by-side. @default false */
  stacked?: boolean
  /** Bar corner radius. @default 0 */
  cornerRadius?: number
}

const props = withDefaults(defineProps<BarChartProps>(), {
  width: '100%',
  height: 200,
  unstyled: false,
  legend: false,
  stacked: false,
  cornerRadius: 0,
  fileName: 'chart',
})

const rootRef = ref<HTMLDivElement | null>(null)
const svgRef = ref<SVGSVGElement | null>(null)
const fallbackW = computed(() =>
  typeof props.width === 'number' && Number.isFinite(props.width) ? props.width : 600,
)
const fallbackH = computed(() =>
  typeof props.height === 'number' && Number.isFinite(props.height) ? props.height : 200,
)
const { size } = useChartSize(svgRef, { width: fallbackW.value, height: fallbackH.value })
const padding = computed(() => normalizePadding(props.padding))

const viewW = computed(() => size.value.width)
const viewH = computed(() => size.value.height)
const plotX = computed(() => padding.value[3])
const plotY = computed(() => padding.value[0])
const plotW = computed(() => Math.max(0, viewW.value - padding.value[3] - padding.value[1]))
const plotH = computed(() => Math.max(0, viewH.value - padding.value[0] - padding.value[2]))

const animation = computed(() => resolveChartAnimation(props.animate))

const seriesValues = computed(() => props.series.map((s) => s.values))

const stackedTotals = computed(() => {
  if (!props.stacked) return null
  const totals: number[] = props.categories.map((_, i) => {
    let sum = 0
    for (const sv of seriesValues.value) {
      const v = sv[i]
      if (v != null) sum += v
    }
    return sum
  })
  return totals
})

const bounds = computed(() => {
  if (props.stacked && stackedTotals.value) {
    const max = Math.max(0, ...stackedTotals.value)
    return { min: 0, max: max === 0 ? 1 : max }
  }
  const { min, max } = chartBounds(seriesValues.value)
  return { min: Math.min(0, min), max: Math.max(0, max) }
})

const yCoord = (v: number) => {
  const { min, max } = bounds.value
  if (max === min) return plotY.value + plotH.value / 2
  return plotY.value + plotH.value * (1 - (v - min) / (max - min))
}

const bars = computed(() => {
  const cats = props.categories.length
  if (cats === 0) return []
  const groupWidth = plotW.value / cats
  const innerPad = 0.1
  const groupBox = groupWidth * (1 - innerPad)
  const groupOffset = (groupWidth - groupBox) / 2

  const result: Array<{
    seriesId: string
    label: string
    color: string
    x: number
    y: number
    width: number
    height: number
    rx: number
    categoryIndex: number
  }> = []

  if (props.stacked) {
    for (let ci = 0; ci < cats; ci++) {
      let acc = 0
      for (let si = 0; si < props.series.length; si++) {
        const s = props.series[si]
        const v = s.values[ci]
        if (v == null) continue
        const baseY = yCoord(acc)
        const topY = yCoord(acc + v)
        const x = plotX.value + ci * groupWidth + groupOffset
        const w = groupBox
        const yTop = Math.min(baseY, topY)
        const h = Math.abs(baseY - topY)
        result.push({
          seriesId: s.id,
          label: s.label,
          color: colorForSeries(s, si),
          x,
          y: yTop,
          width: w,
          height: h,
          rx: props.cornerRadius,
          categoryIndex: ci,
        })
        acc += v
      }
    }
  } else {
    const seriesCount = Math.max(1, props.series.length)
    const barWidth = groupBox / seriesCount
    for (let ci = 0; ci < cats; ci++) {
      for (let si = 0; si < props.series.length; si++) {
        const s = props.series[si]
        const v = s.values[ci]
        if (v == null) continue
        const x = plotX.value + ci * groupWidth + groupOffset + si * barWidth
        const baseY = yCoord(0)
        const topY = yCoord(v)
        const yTop = Math.min(baseY, topY)
        const h = Math.abs(baseY - topY)
        result.push({
          seriesId: s.id,
          label: s.label,
          color: colorForSeries(s, si),
          x,
          y: yTop,
          width: barWidth * 0.95,
          height: h,
          rx: props.cornerRadius,
          categoryIndex: ci,
        })
      }
    }
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
    :class="[!props.unstyled && 'sg-chart sg-chart-bar', props.className]"
    :style="{ width: typeof props.width === 'number' ? `${props.width}px` : props.width }"
    :data-animate="animation.enabled ? 'on' : 'off'"
  >
    <svg
      ref="svgRef"
      :viewBox="`0 0 ${viewW} ${viewH}`"
      :width="typeof props.width === 'number' ? props.width : '100%'"
      :height="props.height"
      role="img"
      aria-label="Bar chart"
    >
      <ChartAxes
        :x="plotX"
        :y="plotY"
        :plotW="plotW"
        :plotH="plotH"
        :categories="props.categories"
        :yMin="bounds.min"
        :yMax="bounds.max"
        :xAxis="props.xAxis"
        :yAxis="props.yAxis"
        :unstyled="props.unstyled"
      />
      <g class="sg-chart-bars">
        <rect
          v-for="(b, i) in bars"
          :key="`${b.seriesId}-${b.categoryIndex}-${i}`"
          :x="b.x"
          :y="b.y"
          :width="b.width"
          :height="b.height"
          :rx="b.rx"
          :ry="b.rx"
          :fill="b.color"
          :data-series-id="b.seriesId"
        >
          <title>{{ b.label }}: {{ props.series[b.seriesId === b.seriesId ? 0 : 0]?.values[b.categoryIndex] }}</title>
        </rect>
      </g>
    </svg>
    <ChartLegend v-if="props.legend" :series="props.series" :unstyled="props.unstyled" />
  </div>
</template>
