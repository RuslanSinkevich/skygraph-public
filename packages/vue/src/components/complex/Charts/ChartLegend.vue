<script setup lang="ts">
import { computed } from 'vue'
import { colorForSeries, type ChartSeries } from './types'

interface Props {
  series: readonly ChartSeries[]
  unstyled?: boolean
  className?: string
}

const props = withDefaults(defineProps<Props>(), { unstyled: false })

const items = computed(() =>
  props.series.map((s, i) => ({ id: s.id, label: s.label, color: colorForSeries(s, i) })),
)
</script>

<template>
  <div
    :class="[!props.unstyled && 'sg-chart-legend', props.className]"
    role="list"
    aria-label="Chart legend"
  >
    <span
      v-for="item in items"
      :key="item.id"
      class="sg-chart-legend-item"
      role="listitem"
      :data-series-id="item.id"
    >
      <span class="sg-chart-legend-swatch" :style="{ background: item.color }" />
      <span class="sg-chart-legend-label">{{ item.label }}</span>
    </span>
  </div>
</template>
