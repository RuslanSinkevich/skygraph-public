<script setup lang="ts">
import { computed } from 'vue'
import { useConfigWithDefaults } from './ConfigProvider.vue'
import type { SizeType } from '../../types'

export interface ProgressProps {
  /** Completion value from 0 to 100 (clamped). */
  percent: number
  /** Renders a horizontal bar or circular SVG progress. @default 'line' */
  type?: 'line' | 'circle'
  /** Visual state; `normal` becomes success at 100%. @default 'normal' */
  status?: 'normal' | 'success' | 'error' | 'active'
  /** Shows percentage text next to or inside the indicator. @default true */
  showInfo?: boolean
  /** Bar or circle stroke thickness in pixels. */
  strokeWidth?: number
  /** Custom color for the filled portion. */
  strokeColor?: string
  /** Component size variant. */
  size?: SizeType
  /** SVG width/height for circle type. @default 120 */
  width?: number
  /** Strips built-in styles when true. */
  unstyled?: boolean
}

const props = withDefaults(defineProps<ProgressProps>(), {
  type: 'line',
  status: 'normal',
  showInfo: true,
  width: 120,
})

const { resolvedSize } = useConfigWithDefaults({ size: undefined }, {})
const realSize = computed<SizeType>(() => props.size ?? resolvedSize.value)
const progressSize = computed(() => (realSize.value === 'small' ? 'small' : 'default'))

const clampedPercent = computed(() => Math.min(100, Math.max(0, props.percent)))
const resolvedStatus = computed(() =>
  clampedPercent.value >= 100 && props.status === 'normal' ? 'success' : props.status,
)

const lineClasses = computed(() =>
  [
    'sg-progress',
    'sg-progress-line',
    `sg-progress-${resolvedStatus.value}`,
    `sg-progress-${progressSize.value}`,
  ].join(' '),
)

const circleClasses = computed(() =>
  ['sg-progress', 'sg-progress-circle', `sg-progress-${resolvedStatus.value}`].join(' '),
)

const barHeight = computed(() => props.strokeWidth ?? (progressSize.value === 'small' ? 6 : 8))

const circle = computed(() => {
  const sw = props.strokeWidth ?? 6
  const radius = (props.width - sw) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (clampedPercent.value / 100) * circumference
  return { sw, radius, circumference, offset }
})
</script>

<template>
  <div
    v-if="unstyled"
    role="progressbar"
    :aria-valuenow="clampedPercent"
  >
    <div v-if="type === 'line'" :style="{ width: '100%', height: `${strokeWidth ?? 8}px`, background: '#eee' }">
      <div :style="{ width: `${clampedPercent}%`, height: '100%', background: strokeColor ?? '#1677ff' }" />
    </div>
    <span v-else>{{ clampedPercent }}%</span>
  </div>
  <div
    v-else-if="type === 'circle'"
    :class="circleClasses"
    role="progressbar"
    :aria-valuenow="clampedPercent"
  >
    <svg :width="width" :height="width" :viewBox="`0 0 ${width} ${width}`">
      <circle
        class="sg-progress-circle-trail"
        :cx="width / 2"
        :cy="width / 2"
        :r="circle.radius"
        :stroke-width="circle.sw"
        fill="none"
      />
      <circle
        class="sg-progress-circle-path"
        :cx="width / 2"
        :cy="width / 2"
        :r="circle.radius"
        :stroke-width="circle.sw"
        fill="none"
        :stroke-dasharray="circle.circumference"
        :stroke-dashoffset="circle.offset"
        stroke-linecap="round"
        :style="strokeColor ? { stroke: strokeColor } : undefined"
        :transform="`rotate(-90 ${width / 2} ${width / 2})`"
      />
    </svg>
    <span v-if="showInfo" class="sg-progress-circle-text">{{ clampedPercent }}%</span>
  </div>
  <div
    v-else
    :class="lineClasses"
    role="progressbar"
    :aria-valuenow="clampedPercent"
  >
    <div class="sg-progress-outer">
      <div class="sg-progress-inner" :style="{ height: `${barHeight}px` }">
        <div
          class="sg-progress-bg"
          :style="{
            width: `${clampedPercent}%`,
            ...(strokeColor ? { background: strokeColor } : {}),
          }"
        />
      </div>
    </div>
    <span v-if="showInfo" class="sg-progress-text">{{ clampedPercent }}%</span>
  </div>
</template>
