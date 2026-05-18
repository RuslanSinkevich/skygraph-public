<script setup lang="ts">
import { computed, ref } from 'vue'
import type { GanttProps, GanttResource, GanttScale, GanttTask } from './types'

const props = withDefaults(defineProps<GanttProps>(), {
  scale: 'day',
  rowHeight: 32,
  columnWidth: 40,
  sidebarWidth: 200,
  draggable: false,
  resizable: false,
  unstyled: false,
})

const emit = defineEmits<{
  (e: 'task-change', task: GanttTask): void
}>()

const MS_PER_DAY = 24 * 60 * 60 * 1000

const stepMs = (scale: GanttScale): number => {
  switch (scale) {
    case 'day':
      return MS_PER_DAY
    case 'week':
      return MS_PER_DAY * 7
    case 'month':
      return MS_PER_DAY * 30
    case 'quarter':
      return MS_PER_DAY * 90
  }
}

const toMs = (d: Date | number): number => (d instanceof Date ? d.getTime() : d)

const computedRange = computed(() => {
  if (props.range) return { from: props.range.from.getTime(), to: props.range.to.getTime() }
  if (props.tasks.length === 0) {
    const now = Date.now()
    return { from: now, to: now + MS_PER_DAY * 7 }
  }
  let min = Infinity
  let max = -Infinity
  for (const t of props.tasks) {
    const s = toMs(t.start)
    const e = toMs(t.end)
    if (s < min) min = s
    if (e > max) max = e
  }
  const step = stepMs(props.scale)
  return { from: min - step, to: max + step }
})

const totalMs = computed(() => computedRange.value.to - computedRange.value.from)

const rows = computed<{ key: string; label: string; tasks: GanttTask[] }[]>(() => {
  if (!props.resources || props.resources.length === 0) {
    return props.tasks.map((t) => ({ key: t.id, label: t.name, tasks: [t] }))
  }
  return props.resources.map((res: GanttResource) => ({
    key: res.id,
    label: res.name,
    tasks: props.tasks.filter((t) => t.resourceId === res.id),
  }))
})

const totalSteps = computed(() => Math.max(1, Math.ceil(totalMs.value / stepMs(props.scale))))
const ganttWidth = computed(() => totalSteps.value * props.columnWidth)

const headerTicks = computed(() => {
  const arr: { x: number; label: string }[] = []
  const step = stepMs(props.scale)
  for (let i = 0; i <= totalSteps.value; i++) {
    const t = computedRange.value.from + i * step
    const d = new Date(t)
    let label = ''
    switch (props.scale) {
      case 'day':
        label = `${d.getUTCDate()}`
        break
      case 'week':
        label = `W${Math.ceil((d.getUTCDate() + 6) / 7)}`
        break
      case 'month':
        label = `${String(d.getUTCMonth() + 1).padStart(2, '0')}`
        break
      case 'quarter':
        label = `Q${Math.ceil((d.getUTCMonth() + 1) / 3)}`
        break
    }
    arr.push({ x: i * props.columnWidth, label })
  }
  return arr
})

const taskBarStyle = (task: GanttTask) => {
  const start = toMs(task.start)
  const end = toMs(task.end)
  const x = ((start - computedRange.value.from) / totalMs.value) * ganttWidth.value
  const width = Math.max(8, ((end - start) / totalMs.value) * ganttWidth.value)
  return {
    left: `${x}px`,
    width: `${width}px`,
    background: task.color ?? 'var(--sg-color-primary, #1677ff)',
  }
}

interface DragSession {
  type: 'move' | 'resize'
  taskId: string
  startX: number
  origin: { start: number; end: number }
}

let dragSession: DragSession | null = null

const onBarPointerDown = (e: PointerEvent, task: GanttTask) => {
  if (!props.draggable) return
  ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  dragSession = {
    type: 'move',
    taskId: task.id,
    startX: e.clientX,
    origin: { start: toMs(task.start), end: toMs(task.end) },
  }
}

const onResizePointerDown = (e: PointerEvent, task: GanttTask) => {
  if (!props.resizable) return
  e.stopPropagation()
  ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  dragSession = {
    type: 'resize',
    taskId: task.id,
    startX: e.clientX,
    origin: { start: toMs(task.start), end: toMs(task.end) },
  }
}

const onPointerMove = (e: PointerEvent) => {
  const ds = dragSession
  if (!ds) return
  const dxPx = e.clientX - ds.startX
  const dxMs = (dxPx / ganttWidth.value) * totalMs.value
  const step = stepMs(props.scale)
  const snappedDx = Math.round(dxMs / step) * step
  const task = props.tasks.find((t) => t.id === ds.taskId)
  if (!task) return
  const next: GanttTask =
    ds.type === 'move'
      ? { ...task, start: ds.origin.start + snappedDx, end: ds.origin.end + snappedDx }
      : { ...task, end: Math.max(ds.origin.start + step, ds.origin.end + snappedDx) }
  emit('task-change', next)
}

const onPointerUp = () => {
  dragSession = null
}

const containerRef = ref<HTMLDivElement | null>(null)

defineExpose({ containerRef })
</script>

<template>
  <div
    ref="containerRef"
    :class="[!props.unstyled && 'sg-gantt', props.className]"
    :style="{ display: 'flex', overflow: 'auto', ...(props.style ?? {}) }"
    role="grid"
    aria-label="Gantt chart"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
  >
    <div class="sg-gantt-sidebar" :style="{ width: `${props.sidebarWidth}px`, flexShrink: 0 }">
      <div
        :class="!props.unstyled ? 'sg-gantt-sidebar-header' : undefined"
        :style="{ height: `${props.rowHeight}px` }"
      />
      <div
        v-for="row in rows"
        :key="row.key"
        :class="!props.unstyled ? 'sg-gantt-sidebar-row' : undefined"
        :style="{ height: `${props.rowHeight}px` }"
      >
        {{ row.label }}
      </div>
    </div>
    <div class="sg-gantt-body" :style="{ position: 'relative', flex: 1 }">
      <div
        :class="!props.unstyled ? 'sg-gantt-header' : undefined"
        :style="{
          height: `${props.rowHeight}px`,
          width: `${ganttWidth}px`,
          position: 'relative',
          borderBottom: '1px solid #e0e0e0',
        }"
      >
        <div
          v-for="(t, i) in headerTicks"
          :key="i"
          :style="{
            position: 'absolute',
            left: `${t.x}px`,
            top: 0,
            bottom: 0,
            width: `${props.columnWidth}px`,
            borderLeft: '1px solid #e0e0e0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            color: '#888',
          }"
        >
          {{ t.label }}
        </div>
      </div>
      <div
        v-for="row in rows"
        :key="row.key"
        :data-row-key="row.key"
        :class="!props.unstyled ? 'sg-gantt-row' : undefined"
        :style="{
          position: 'relative',
          height: `${props.rowHeight}px`,
          width: `${ganttWidth}px`,
          borderBottom: '1px solid #f0f0f0',
        }"
      >
        <div
          v-for="task in row.tasks"
          :key="task.id"
          :data-task-id="task.id"
          :class="!props.unstyled ? 'sg-gantt-bar' : undefined"
          :style="{
            position: 'absolute',
            top: '4px',
            height: `${props.rowHeight - 8}px`,
            borderRadius: '4px',
            color: '#fff',
            padding: '0 6px',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            cursor: props.draggable ? 'move' : 'default',
            ...taskBarStyle(task),
          }"
          @pointerdown="(e) => onBarPointerDown(e, task)"
        >
          <span class="sg-gantt-bar-label">{{ task.name }}</span>
          <div
            v-if="props.resizable"
            class="sg-gantt-bar-resize"
            :style="{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: '6px',
              cursor: 'ew-resize',
            }"
            @pointerdown="(e) => onResizePointerDown(e, task)"
          />
          <div
            v-if="task.progress !== undefined"
            class="sg-gantt-bar-progress"
            :style="{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: `${(task.progress ?? 0) * 100}%`,
              background: 'rgba(255,255,255,0.3)',
              pointerEvents: 'none',
            }"
          />
        </div>
      </div>
    </div>
  </div>
</template>
