<script setup lang="ts">
import { computed, onBeforeUnmount, ref, type CSSProperties } from 'vue'
import { pointsToPath } from '@skygraph/core'
import { useConfig } from '../../ui/ConfigProvider.vue'
import type { GanttProps, GanttRange, GanttScale, GanttTask } from './types'

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

const cfg = useConfig()
const ganttLabel = computed(() => cfg.value.locale?.gantt?.ariaLabel ?? 'Gantt chart')
const resizeTaskLabel = computed(() => cfg.value.locale?.gantt?.resizeTask ?? 'Resize task')

const DAY = 86_400_000
const STEP_MS: Record<GanttScale, number> = {
  day: DAY,
  week: 7 * DAY,
  month: 30 * DAY,
  quarter: 90 * DAY,
}

const toMs = (v: Date | number): number => (v instanceof Date ? v.getTime() : v)
const alignDown = (t: number, step: number): number => Math.floor(t / step) * step
const alignUp = (t: number, step: number): number => Math.ceil(t / step) * step
const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v))

function formatTick(timeMs: number, scale: GanttScale, columnWidth: number): string {
  const d = new Date(timeMs)
  switch (scale) {
    case 'day': {
      const dd = String(d.getUTCDate()).padStart(2, '0')
      if (columnWidth < 32) {
        if (d.getUTCDate() === 1) {
          const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
          return `${dd}.${mm}`
        }
        return dd
      }
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
      return `${dd}.${mm}`
    }
    case 'week': {
      const dd = String(d.getUTCDate()).padStart(2, '0')
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
      return `W ${dd}.${mm}`
    }
    case 'month': {
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
      return `${mm}.${d.getUTCFullYear()}`
    }
    case 'quarter': {
      const q = Math.floor(d.getUTCMonth() / 3) + 1
      return `Q${q} ${d.getUTCFullYear()}`
    }
  }
}

function deriveRange(tasks: readonly GanttTask[], step: number): GanttRange {
  if (tasks.length === 0) {
    const now = Date.now()
    return { from: new Date(alignDown(now, step)), to: new Date(alignUp(now + step, step)) }
  }
  let lo = Infinity
  let hi = -Infinity
  for (const t of tasks) {
    const s = toMs(t.start)
    const e = toMs(t.end)
    if (s < lo) lo = s
    if (e > hi) hi = e
  }
  return {
    from: new Date(alignDown(lo - step, step)),
    to: new Date(alignUp(hi + step, step)),
  }
}

const resolved = computed(() => {
  const step = STEP_MS[props.scale]
  const r = props.range ?? deriveRange(props.tasks, step)
  const rangeStart = r.from.getTime()
  const rangeEnd = r.to.getTime()
  const pxPerMs = props.columnWidth / step
  const totalWidth = (rangeEnd - rangeStart) * pxPerMs

  let rowsList: Array<{ key: string; label: string }>
  let rowOf: (task: GanttTask) => number
  if (props.resources && props.resources.length > 0) {
    const list = props.resources
    rowsList = list.map((res) => ({ key: res.id, label: res.name }))
    const idx = new Map(list.map((res, i) => [res.id, i]))
    rowOf = (t) => (t.resourceId ? (idx.get(t.resourceId) ?? 0) : 0)
  } else {
    rowsList = props.tasks.map((t) => ({ key: t.id, label: t.name }))
    const idx = new Map(props.tasks.map((t, i) => [t.id, i]))
    rowOf = (t) => idx.get(t.id) ?? 0
  }

  return { rangeStart, rangeEnd, step, totalWidth, pxPerMs, rows: rowsList, rowOf }
})

const ticks = computed(() => {
  const out: Array<{ x: number; label: string; time: number }> = []
  const { rangeStart, rangeEnd, step, pxPerMs } = resolved.value
  for (let t = rangeStart; t < rangeEnd; t += step) {
    out.push({
      x: (t - rangeStart) * pxPerMs,
      label: formatTick(t, props.scale, props.columnWidth),
      time: t,
    })
  }
  return out
})

interface TaskRect {
  task: GanttTask
  x: number
  y: number
  w: number
  h: number
  row: number
}

const taskRects = computed<TaskRect[]>(() => {
  const { rangeStart, pxPerMs, rowOf } = resolved.value
  const rowHeight = props.rowHeight
  return props.tasks.map((task) => {
    const startMs = toMs(task.start)
    const endMs = toMs(task.end)
    const x = (startMs - rangeStart) * pxPerMs
    const w = Math.max(2, (endMs - startMs) * pxPerMs)
    const row = rowOf(task)
    const y = row * rowHeight
    return { task, x, y, w, h: rowHeight, row }
  })
})

const taskRectById = computed(() => {
  const m = new Map<string, TaskRect>()
  for (const r of taskRects.value) m.set(r.task.id, r)
  return m
})

// Gantt-specific dependency routing — always source-right → target-left
// regardless of geometry (standard Gantt convention).
//   • Forward dep: 3-bend Z (right stub from source, vertical to target
//     row, horizontal into target's left edge).
//   • Backward / overlapping dep: 5-bend U detour along the row boundary
//     just below the source, with a generous final approach segment.
const dependencyPaths = computed(() => {
  const out: Array<{ id: string; d: string }> = []
  const STUB = 8
  const APPROACH = 18
  for (const r of taskRects.value) {
    const deps = r.task.dependencies
    if (!deps || deps.length === 0) continue
    for (const depId of deps) {
      const src = taskRectById.value.get(depId)
      if (!src) continue
      const sx = src.x + src.w
      const sy = src.y + src.h / 2
      const tx = r.x
      const ey = r.y + r.h / 2

      let points: ReadonlyArray<readonly [number, number]>
      if (tx >= sx + STUB + APPROACH) {
        const bendX = sx + STUB
        points = [
          [sx, sy],
          [bendX, sy],
          [bendX, ey],
          [tx, ey],
        ]
      } else {
        const detourY = src.y + src.h
        points = [
          [sx, sy],
          [sx + STUB, sy],
          [sx + STUB, detourY],
          [tx - APPROACH, detourY],
          [tx - APPROACH, ey],
          [tx, ey],
        ]
      }
      out.push({ id: `${depId}->${r.task.id}`, d: pointsToPath(points) })
    }
  }
  return out
})

const headerHeight = computed(() => props.rowHeight)
const gridHeight = computed(() => resolved.value.rows.length * props.rowHeight)
// Reserve vertical space for the horizontal scrollbar that lives inside
// `.sg-gantt-main` (overflow-x: auto). Without this padding the
// scrollbar's ~14px eats into the last row's bars.
const SCROLLBAR_RESERVE = 14
const totalHeight = computed(() => gridHeight.value + headerHeight.value + SCROLLBAR_RESERVE)

// `minmax(0, 1fr)` lets the main track shrink below the intrinsic width
// of its child (`width: totalWidth`, often thousands of px) — without it
// the whole grid swells past the parent and the chart bleeds outside its
// container. Horizontal scrolling lives on `.sg-gantt-main` so the
// sidebar stays pinned while bars scroll.
const wrapperStyle = computed<CSSProperties>(() => ({
  display: 'grid',
  gridTemplateColumns: `${props.sidebarWidth}px minmax(0, 1fr)`,
  width: '100%',
  overflow: 'hidden',
  height: `${totalHeight.value}px`,
  ...(props.style ?? {}),
}))

const wrapperClass = computed(() =>
  props.unstyled ? props.className : ['sg-gantt', props.className].filter(Boolean).join(' '),
)

interface DragSession {
  kind: 'move' | 'resize'
  taskId: string
  startClientX: number
  origStart: number
  origEnd: number
  lastStart: number
  lastEnd: number
  pointerId: number
  captureTarget: Element | null
}

const dragSession = ref<DragSession | null>(null)

function startInteraction(e: PointerEvent, task: GanttTask, kind: 'move' | 'resize') {
  // `e.button === undefined` happens in synthetic events fired by test
  // runners (jsdom doesn't populate `button` for `Event('pointerdown')`)
  // — treat that as the primary button to keep drag tests reliable.
  if (e.button !== undefined && e.button !== 0) return
  if (kind === 'move' && !props.draggable) return
  if (kind === 'resize' && !props.resizable) return
  e.preventDefault()
  e.stopPropagation()

  const target = e.currentTarget as Element | null
  target?.setPointerCapture?.(e.pointerId)

  dragSession.value = {
    kind,
    taskId: task.id,
    startClientX: e.clientX,
    origStart: toMs(task.start),
    origEnd: toMs(task.end),
    lastStart: toMs(task.start),
    lastEnd: toMs(task.end),
    pointerId: e.pointerId,
    captureTarget: target,
  }
}

function onWrapperPointerMove(e: PointerEvent) {
  const d = dragSession.value
  if (!d) return
  const task = props.tasks.find((t) => t.id === d.taskId)
  if (!task) return
  const { step, pxPerMs } = resolved.value
  const dxPx = e.clientX - d.startClientX
  const dxMs = dxPx / pxPerMs
  const snappedDx = Math.round(dxMs / step) * step
  let nextStart = d.origStart
  let nextEnd = d.origEnd
  if (d.kind === 'move') {
    nextStart = d.origStart + snappedDx
    nextEnd = d.origEnd + snappedDx
  } else {
    nextEnd = Math.max(d.origStart + step, d.origEnd + snappedDx)
  }
  if (nextStart === d.lastStart && nextEnd === d.lastEnd) return
  d.lastStart = nextStart
  d.lastEnd = nextEnd
  emit('task-change', { ...task, start: nextStart, end: nextEnd })
}

function onWrapperPointerUp() {
  const d = dragSession.value
  if (d) {
    d.captureTarget?.releasePointerCapture?.(d.pointerId)
  }
  dragSession.value = null
}

onBeforeUnmount(() => {
  dragSession.value = null
})

const containerRef = ref<HTMLDivElement | null>(null)
defineExpose({ containerRef })
</script>

<template>
  <div
    ref="containerRef"
    :class="wrapperClass"
    :style="wrapperStyle"
    role="region"
    :aria-label="ganttLabel"
    :data-scale="props.scale"
    @pointermove="onWrapperPointerMove"
    @pointerup="onWrapperPointerUp"
    @pointercancel="onWrapperPointerUp"
  >
    <!-- Sidebar (task / resource list) -->
    <div
      :class="props.unstyled ? undefined : 'sg-gantt-sidebar'"
      :style="{ width: `${props.sidebarWidth}px` }"
    >
      <div
        :class="props.unstyled ? undefined : 'sg-gantt-sidebar-header'"
        :style="{ height: `${headerHeight}px` }"
      />
      <div
        v-for="(row, i) in resolved.rows"
        :key="row.key"
        :class="props.unstyled ? undefined : 'sg-gantt-sidebar-row'"
        :style="{ height: `${props.rowHeight}px` }"
        :data-row-index="i"
        :data-row-key="row.key"
      >
        {{ row.label }}
      </div>
    </div>

    <!-- Main: header + grid + bars (horizontal scroll lives here so the
       sidebar stays pinned while bars scroll). -->
    <div
      :class="props.unstyled ? undefined : 'sg-gantt-main'"
      :style="{ position: 'relative', overflowX: 'auto', overflowY: 'hidden', minWidth: 0 }"
    >
      <div
        :style="{
          position: 'relative',
          width: `${resolved.totalWidth}px`,
          minWidth: '100%',
        }"
      >
        <div
          :class="props.unstyled ? undefined : 'sg-gantt-header'"
          :style="{
            position: 'relative',
            height: `${headerHeight}px`,
            width: `${resolved.totalWidth}px`,
          }"
        >
          <div
            v-for="t in ticks"
            :key="t.time"
            :class="props.unstyled ? undefined : 'sg-gantt-tick'"
            :style="{
              position: 'absolute',
              left: `${t.x}px`,
              top: 0,
              width: `${props.columnWidth}px`,
              height: `${headerHeight}px`,
            }"
            :data-tick-time="t.time"
          >
            {{ t.label }}
          </div>
        </div>

        <div
          :class="props.unstyled ? undefined : 'sg-gantt-grid'"
          :style="{
            position: 'relative',
            width: `${resolved.totalWidth}px`,
            height: `${gridHeight}px`,
          }"
        >
          <!-- Row backgrounds -->
          <div
            v-for="(row, i) in resolved.rows"
            :key="row.key"
            :class="props.unstyled ? undefined : 'sg-gantt-row'"
            :style="{
              position: 'absolute',
              left: 0,
              top: `${i * props.rowHeight}px`,
              width: `${resolved.totalWidth}px`,
              height: `${props.rowHeight}px`,
            }"
            :data-row-index="i"
          />

          <!-- Bars -->
          <div
            v-for="rect in taskRects"
            :key="rect.task.id"
            :class="
              props.unstyled
                ? undefined
                : [
                    'sg-gantt-bar',
                    props.draggable ? 'sg-gantt-bar-draggable' : '',
                    props.resizable ? 'sg-gantt-bar-resizable' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')
            "
            :style="{
              position: 'absolute',
              left: `${rect.x}px`,
              top: `${rect.y + 4}px`,
              width: `${rect.w}px`,
              height: `${rect.h - 8}px`,
              background: rect.task.color,
              cursor: props.draggable ? 'grab' : undefined,
              userSelect: props.draggable || props.resizable ? 'none' : undefined,
            }"
            role="button"
            tabindex="0"
            :aria-label="rect.task.name"
            :data-task-id="rect.task.id"
            :data-row-index="rect.row"
            @pointerdown="startInteraction($event, rect.task, 'move')"
          >
            <div
              v-if="(rect.task.progress ?? 0) > 0"
              :class="props.unstyled ? undefined : 'sg-gantt-bar-progress'"
              :style="{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: `${clamp(rect.task.progress ?? 0, 0, 1) * 100}%`,
              }"
              :data-progress="clamp(rect.task.progress ?? 0, 0, 1)"
            />
            <span
              :class="props.unstyled ? undefined : 'sg-gantt-bar-label'"
              :style="{ position: 'relative', zIndex: 1 }"
            >
              {{ rect.task.name }}
            </span>
            <div
              v-if="props.resizable"
              :class="props.unstyled ? undefined : 'sg-gantt-bar-resize'"
              role="button"
              :aria-label="resizeTaskLabel"
              tabindex="-1"
              data-role="resize-handle"
              :style="{
                position: 'absolute',
                right: 0,
                top: 0,
                bottom: 0,
                width: '6px',
                cursor: 'ew-resize',
              }"
              @pointerdown="startInteraction($event, rect.task, 'resize')"
            />
          </div>

          <!-- Dependency arrows — rendered AFTER bars so the arrowhead is
             never covered by the target bar. `pointer-events: none` lets
             pointer events fall through to the bars beneath. -->
          <svg
            v-if="dependencyPaths.length > 0"
            :class="props.unstyled ? undefined : 'sg-gantt-deps'"
            :width="resolved.totalWidth"
            :height="gridHeight"
            :style="{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              overflow: 'visible',
            }"
            aria-hidden="true"
          >
            <defs>
              <marker
                id="sg-gantt-arrow"
                viewBox="0 0 10 10"
                refX="10"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
              </marker>
            </defs>
            <path
              v-for="p in dependencyPaths"
              :key="p.id"
              :d="p.d"
              :class="props.unstyled ? undefined : 'sg-gantt-dep'"
              fill="none"
              stroke="currentColor"
              :stroke-width="1.5"
              marker-end="url(#sg-gantt-arrow)"
              :data-dep-id="p.id"
            />
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>
