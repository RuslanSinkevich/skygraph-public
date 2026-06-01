<script setup lang="ts">
import { computed, ref } from 'vue'
import { printElement } from '../../../utils/print'
import { useConfig } from '../../ui/ConfigProvider.vue'
import type { DashboardProps, DashboardStyle, DashboardWidget } from './types'

const props = withDefaults(defineProps<DashboardProps>(), {
  columns: 12,
  rowHeight: 80,
  gap: 8,
  unstyled: false,
})

defineSlots<{
  widget(props: { widget: DashboardWidget }): unknown
}>()

const rootRef = ref<HTMLDivElement | null>(null)
const cfg = useConfig()
const dashboardLabel = computed(() => cfg.value.locale?.dashboard?.ariaLabel ?? 'Dashboard')

const gridStyle = computed<DashboardStyle>(() => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${props.columns}, 1fr)`,
  gridAutoRows: `${props.rowHeight}px`,
  gap: `${props.gap}px`,
  ...(props.style ?? {}),
}))

const widgetStyle = (w: DashboardWidget): DashboardStyle => ({
  gridColumnStart: w.x,
  gridColumnEnd: `span ${w.w ?? 1}`,
  gridRowStart: w.y,
  gridRowEnd: `span ${w.h ?? 1}`,
  ...(w.style ?? {}),
})

defineExpose({
  print: (opts: { fileName?: string } = {}) => {
    if (!rootRef.value) return
    printElement(rootRef.value, { fileName: opts.fileName ?? 'dashboard' })
  },
})
</script>

<template>
  <div
    ref="rootRef"
    :class="[!props.unstyled && 'sg-dashboard', props.className]"
    :style="gridStyle"
    role="region"
    :aria-label="dashboardLabel"
  >
    <div
      v-for="widget in props.widgets"
      :key="widget.id"
      :data-widget-id="widget.id"
      :class="[!props.unstyled && 'sg-dashboard-widget', widget.className]"
      :style="widgetStyle(widget)"
    >
      <div v-if="widget.title" :class="!props.unstyled ? 'sg-dashboard-widget-header' : undefined">
        {{ widget.title }}
      </div>
      <div :class="!props.unstyled ? 'sg-dashboard-widget-body' : undefined">
        <slot name="widget" :widget="widget" />
      </div>
    </div>
  </div>
</template>
