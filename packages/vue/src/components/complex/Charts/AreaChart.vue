<script setup lang="ts">
import { ref, computed } from 'vue'
import { useChartSize } from '../../../composables/useChartSize'
import { printElement } from '../../../utils/print'
import { useConfig } from '../../ui/ConfigProvider.vue'
import {
  chartBounds,
  colorForSeries,
  resolveChartPadding,
  resolveChartAnimation,
  type BaseChartProps,
} from './types'
import ChartLegend from './ChartLegend.vue'
import ChartAxes from './ChartAxes.vue'
import ChartBrush, {
  resolveBrushConfig,
  type ChartBrushConfig,
  type ChartBrushRange,
} from './ChartBrush.vue'

interface AreaChartProps extends BaseChartProps {
  /** Stack series cumulatively. @default false */
  stacked?: boolean
  /** Fill opacity 0..1. @default 0.3 */
  fillOpacity?: number
  /** Stroke width. @default 2 */
  strokeWidth?: number
  /**
   * Brush for drag-selecting an X range. `true` — uncontrolled with empty
   * starting value; object — `ChartBrushConfig`.
   */
  brush?: boolean | ChartBrushConfig
}

const props = withDefaults(defineProps<AreaChartProps>(), {
  width: '100%',
  height: 200,
  unstyled: false,
  legend: false,
  stacked: false,
  fillOpacity: 0.3,
  strokeWidth: 2,
  fileName: 'chart',
})

const rootRef = ref<HTMLDivElement | null>(null)
const svgRef = ref<SVGSVGElement | null>(null)
const cfg = useConfig()
const chartLabel = computed(() => cfg.value.locale?.charts?.areaChart ?? 'Area chart')
const fallbackW = computed(() =>
  typeof props.width === 'number' && Number.isFinite(props.width) ? props.width : 600,
)
const fallbackH = computed(() =>
  typeof props.height === 'number' && Number.isFinite(props.height) ? props.height : 200,
)
const { size } = useChartSize(svgRef, { width: fallbackW.value, height: fallbackH.value })

const animation = computed(() => resolveChartAnimation(props.animate))

const stackedValues = computed(() => {
  if (!props.stacked) return null
  const stacks: number[][] = props.series.map(() => props.categories.map(() => 0))
  for (let ci = 0; ci < props.categories.length; ci++) {
    let acc = 0
    for (let si = 0; si < props.series.length; si++) {
      const v = props.series[si].values[ci]
      if (v == null) {
        stacks[si][ci] = acc
      } else {
        acc += v
        stacks[si][ci] = acc
      }
    }
  }
  return stacks
})

const bounds = computed(() => {
  if (props.stacked && stackedValues.value) {
    const last = stackedValues.value[stackedValues.value.length - 1]
    const max = Math.max(0, ...last)
    return { min: 0, max: max === 0 ? 1 : max }
  }
  const { min, max } = chartBounds(props.series.map((s) => s.values))
  return { min: Math.min(0, min), max: Math.max(0, max) }
})

const padding = computed(() =>
  resolveChartPadding(props.padding, props.yAxis, bounds.value.min, bounds.value.max),
)
const viewW = computed(() => size.value.width)
const viewH = computed(() => size.value.height)
const plotX = computed(() => padding.value[3])
const plotY = computed(() => padding.value[0])
const plotW = computed(() => Math.max(0, viewW.value - padding.value[3] - padding.value[1]))
const plotH = computed(() => Math.max(0, viewH.value - padding.value[0] - padding.value[2]))

const xCoord = (i: number) => {
  const n = props.categories.length
  if (n <= 1) return plotX.value
  return plotX.value + (plotW.value * i) / (n - 1)
}

const yCoord = (v: number) => {
  const { min, max } = bounds.value
  if (max === min) return plotY.value + plotH.value / 2
  return plotY.value + plotH.value * (1 - (v - min) / (max - min))
}

const baselineY = computed(() => yCoord(0))

const areaPaths = computed(() =>
  props.series.map((s, si) => {
    const color = colorForSeries(s, si)
    const upper: { x: number; y: number }[] = []
    const lower: { x: number; y: number }[] = []

    for (let ci = 0; ci < props.categories.length; ci++) {
      let topV: number | null
      let bottomY = baselineY.value
      if (props.stacked && stackedValues.value) {
        const cur = stackedValues.value[si][ci]
        const prev = si > 0 ? stackedValues.value[si - 1][ci] : 0
        topV = cur
        bottomY = yCoord(prev)
      } else {
        topV = s.values[ci] ?? null
      }
      if (topV == null) continue
      upper.push({ x: xCoord(ci), y: yCoord(topV) })
      lower.push({ x: xCoord(ci), y: bottomY })
    }
    if (upper.length === 0) return { id: s.id, color, label: s.label, areaPath: '', linePath: '' }
    const linePath = upper.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
    const reversedLower = [...lower].reverse()
    const areaPath = `${linePath} ${reversedLower.map((p) => `L${p.x},${p.y}`).join(' ')} Z`
    return { id: s.id, color, label: s.label, areaPath, linePath }
  }),
)

const brushConfig = computed(() => resolveBrushConfig(props.brush))
const isBrushControlled = computed(() => brushConfig.value != null && 'range' in brushConfig.value)
const internalBrushRange = ref<ChartBrushRange | null>(brushConfig.value?.defaultRange ?? null)
const effectiveBrushRange = computed<ChartBrushRange | null>(() =>
  isBrushControlled.value ? (brushConfig.value!.range ?? null) : internalBrushRange.value,
)
function handleBrushChange(next: ChartBrushRange | null) {
  if (!isBrushControlled.value) internalBrushRange.value = next
  brushConfig.value?.onRangeChange?.(next)
}

const areaAnimStyle = computed(() =>
  animation.value.enabled
    ? { '--sg-chart-anim-duration': `${animation.value.duration}ms` }
    : undefined,
)

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
    :class="[!props.unstyled && 'sg-chart sg-chart-area', props.className]"
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
      <g class="sg-chart-area-paths">
        <path
          v-for="a in areaPaths"
          :key="`${a.id}-area`"
          :class="[animation.enabled && !props.unstyled && 'sg-chart-area-animate']"
          :d="a.areaPath"
          :fill="a.color"
          :fill-opacity="props.fillOpacity"
          :data-series-id="a.id"
          :style="areaAnimStyle"
        />
        <path
          v-for="a in areaPaths"
          :key="`${a.id}-line`"
          :class="[animation.enabled && !props.unstyled && 'sg-chart-area-animate']"
          :d="a.linePath"
          :stroke="a.color"
          :stroke-width="props.strokeWidth"
          fill="none"
          vector-effect="non-scaling-stroke"
          :style="areaAnimStyle"
        />
      </g>
      <ChartBrush
        v-if="brushConfig"
        :plot-x="plotX"
        :plot-y="plotY"
        :plot-w="plotW"
        :plot-h="plotH"
        :category-count="props.categories.length"
        :range="effectiveBrushRange"
        :unstyled="props.unstyled"
        :fill="brushConfig.fill"
        :disabled="brushConfig.disabled"
        @change="handleBrushChange"
      />
    </svg>
    <ChartLegend v-if="props.legend" :series="props.series" :unstyled="props.unstyled" />
  </div>
</template>
