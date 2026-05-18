<script setup lang="ts">
import { computed, ref } from 'vue'
import { printElement } from '../../../utils/print'
import type { DashboardEditorProps, DashboardStyle, DashboardWidget } from './types'

const props = withDefaults(defineProps<DashboardEditorProps>(), {
  columns: 12,
  rowHeight: 80,
  gap: 8,
  unstyled: false,
  draggable: true,
  resizable: true,
  minW: 1,
  minH: 1,
})

const emit = defineEmits<{
  (e: 'layout-change', widgets: DashboardWidget[]): void
}>()

defineSlots<{
  widget(props: { widget: DashboardWidget }): unknown
}>()

const rootRef = ref<HTMLDivElement | null>(null)
const internal = ref<DashboardWidget[]>(props.widgets.map((w) => ({ ...w })))

const widgets = computed(() => internal.value)

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

interface DragSession {
  type: 'move' | 'resize'
  id: string
  startX: number
  startY: number
  origin: DashboardWidget
}

let dragSession: DragSession | null = null

const cellSize = () => {
  const root = rootRef.value
  if (!root) return { cw: 0, ch: props.rowHeight + props.gap }
  const w = root.clientWidth - props.gap * (props.columns - 1)
  const cw = w / props.columns + props.gap
  return { cw, ch: props.rowHeight + props.gap }
}

const onHeaderPointerDown = (e: PointerEvent, w: DashboardWidget) => {
  if (!props.draggable) return
  ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  dragSession = {
    type: 'move',
    id: w.id,
    startX: e.clientX,
    startY: e.clientY,
    origin: { ...w },
  }
}

const onResizePointerDown = (e: PointerEvent, w: DashboardWidget) => {
  if (!props.resizable) return
  e.stopPropagation()
  ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  dragSession = {
    type: 'resize',
    id: w.id,
    startX: e.clientX,
    startY: e.clientY,
    origin: { ...w },
  }
}

const onPointerMove = (e: PointerEvent) => {
  const ds = dragSession
  if (!ds) return
  const { cw, ch } = cellSize()
  if (cw === 0) return
  const dx = Math.round((e.clientX - ds.startX) / cw)
  const dy = Math.round((e.clientY - ds.startY) / ch)

  internal.value = internal.value.map((w) => {
    if (w.id !== ds.id) return w
    if (ds.type === 'move') {
      const nextX = Math.max(1, ds.origin.x + dx)
      const nextY = Math.max(1, ds.origin.y + dy)
      return { ...w, x: Math.min(props.columns - (w.w ?? 1) + 1, nextX), y: nextY }
    }
    return {
      ...w,
      w: Math.max(props.minW, (ds.origin.w ?? 1) + dx),
      h: Math.max(props.minH, (ds.origin.h ?? 1) + dy),
    }
  })
}

const onPointerUp = () => {
  if (dragSession) {
    emit('layout-change', internal.value.map((w) => ({ ...w })))
  }
  dragSession = null
}

defineExpose({
  print: (opts: { fileName?: string } = {}) => {
    if (!rootRef.value) return
    printElement(rootRef.value, { fileName: opts.fileName ?? 'dashboard' })
  },
  getLayout: () => internal.value.map((w) => ({ ...w })),
})
</script>

<template>
  <div
    ref="rootRef"
    :class="[!props.unstyled && 'sg-dashboard sg-dashboard-editor', props.className]"
    :style="gridStyle"
    role="region"
    aria-label="Dashboard editor"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
  >
    <div
      v-for="widget in widgets"
      :key="widget.id"
      :data-widget-id="widget.id"
      :class="[!props.unstyled && 'sg-dashboard-widget', widget.className]"
      :style="widgetStyle(widget)"
    >
      <div
        :class="!props.unstyled ? 'sg-dashboard-widget-header' : undefined"
        :style="{ cursor: props.draggable ? 'move' : 'default' }"
        @pointerdown="(e) => onHeaderPointerDown(e, widget)"
      >
        {{ widget.title ?? widget.id }}
      </div>
      <div :class="!props.unstyled ? 'sg-dashboard-widget-body' : undefined">
        <slot name="widget" :widget="widget" />
      </div>
      <div
        v-if="props.resizable"
        class="sg-dashboard-resize-handle"
        :style="{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: '12px',
          height: '12px',
          cursor: 'se-resize',
        }"
        @pointerdown="(e) => onResizePointerDown(e, widget)"
      />
    </div>
  </div>
</template>
