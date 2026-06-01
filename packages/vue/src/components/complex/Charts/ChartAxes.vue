<script setup lang="ts">
import { computed } from 'vue'
import type { ChartCategory, XAxisOptions, YAxisOptions } from './types'

interface Props {
  /** Plot-area top-left X in user space. */
  x: number
  /** Plot-area top-left Y in user space. */
  y: number
  /** Plot-area width. */
  plotW: number
  /** Plot-area height. */
  plotH: number
  categories: readonly ChartCategory[]
  /** Min/max for the Y axis. */
  yMin: number
  yMax: number
  xAxis?: XAxisOptions
  yAxis?: YAxisOptions
  unstyled?: boolean
}

const props = withDefaults(defineProps<Props>(), { unstyled: false })

function defaultYFormatter(value: number): string {
  if (Number.isInteger(value)) return String(value)
  if (Math.abs(value) >= 1000) return value.toFixed(0)
  if (Math.abs(value) >= 1) return value.toFixed(2).replace(/\.?0+$/, '')
  return value.toFixed(2)
}

const formatY = (v: number) =>
  props.yAxis?.tickFormatter ? props.yAxis.tickFormatter(v) : defaultYFormatter(v)

const formatX = (c: ChartCategory, i: number) =>
  props.xAxis?.tickFormatter ? props.xAxis.tickFormatter(c, i) : String(c)

const yTicks = computed(() => {
  const count = Math.max(2, props.yAxis?.tickCount ?? 5)
  const arr: { value: number; y: number }[] = []
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1)
    const value = props.yMin + (props.yMax - props.yMin) * (1 - t)
    arr.push({ value, y: props.y + props.plotH * t })
  }
  return arr
})

const xTicks = computed(() => {
  if (props.categories.length === 0) return []
  const tickCount = Math.min(
    props.categories.length,
    Math.max(2, props.xAxis?.tickCount ?? props.categories.length),
  )
  const arr: { label: string; x: number }[] = []
  for (let i = 0; i < tickCount; i++) {
    const idx =
      tickCount === 1 ? 0 : Math.round((i * (props.categories.length - 1)) / (tickCount - 1))
    const t = props.categories.length === 1 ? 0 : idx / (props.categories.length - 1)
    arr.push({
      label: formatX(props.categories[idx], idx),
      x: props.x + props.plotW * t,
    })
  }
  return arr
})
</script>

<template>
  <g :class="!props.unstyled && 'sg-chart-axes'">
    <g v-if="props.yAxis" class="sg-chart-axis sg-chart-axis-y">
      <line
        v-for="(t, i) in yTicks"
        :key="`yg-${i}`"
        v-show="props.yAxis?.gridLines"
        :x1="props.x"
        :y1="t.y"
        :x2="props.x + props.plotW"
        :y2="t.y"
        class="sg-chart-axis-grid"
        stroke="currentColor"
        stroke-opacity="0.1"
        vector-effect="non-scaling-stroke"
      />
      <text
        v-for="(t, i) in yTicks"
        :key="`yt-${i}`"
        :x="props.x - 6"
        :y="t.y + 4"
        text-anchor="end"
        class="sg-chart-axis-label"
        font-size="10"
        fill="currentColor"
      >
        {{ formatY(t.value) }}
      </text>
      <text
        v-if="props.yAxis?.label"
        :x="props.x - 28"
        :y="props.y + props.plotH / 2"
        :transform="`rotate(-90, ${props.x - 28}, ${props.y + props.plotH / 2})`"
        text-anchor="middle"
        class="sg-chart-axis-title"
        font-size="11"
        fill="currentColor"
      >
        {{ props.yAxis.label }}
      </text>
    </g>
    <g v-if="props.xAxis" class="sg-chart-axis sg-chart-axis-x">
      <text
        v-for="(t, i) in xTicks"
        :key="`xt-${i}`"
        :x="t.x"
        :y="props.y + props.plotH + 14"
        text-anchor="middle"
        class="sg-chart-axis-label"
        font-size="10"
        fill="currentColor"
      >
        {{ t.label }}
      </text>
      <text
        v-if="props.xAxis?.label"
        :x="props.x + props.plotW / 2"
        :y="props.y + props.plotH + 28"
        text-anchor="middle"
        class="sg-chart-axis-title"
        font-size="11"
        fill="currentColor"
      >
        {{ props.xAxis.label }}
      </text>
    </g>
  </g>
</template>
