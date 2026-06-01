<script setup lang="ts">
import { computed, ref } from 'vue'
import { useConfig } from '../../ui/ConfigProvider.vue'
import type { Assignment, CalendarScale, ResourceCalendarProps } from './types'

const props = withDefaults(defineProps<ResourceCalendarProps>(), {
  scale: 'week',
  columnWidth: 120,
  rowHeight: 56,
  sidebarWidth: 200,
  draggable: false,
  resizable: false,
  unstyled: false,
})

const emit = defineEmits<{
  (e: 'assignment-change', next: Assignment): void
  (e: 'assignmentChange', next: Assignment): void
  (e: 'conflict', conflicts: Array<{ a: Assignment; b: Assignment }>): void
}>()

const cfg = useConfig()
const calendarLabel = computed(
  () => cfg.value.locale?.resourceCalendar?.ariaLabel ?? 'Resource calendar',
)
const resizeStartLabel = computed(
  () => cfg.value.locale?.resourceCalendar?.resizeStart ?? 'Resize start',
)
const resizeEndLabel = computed(() => cfg.value.locale?.resourceCalendar?.resizeEnd ?? 'Resize end')

const MS_PER_DAY = 24 * 60 * 60 * 1000

const stepMs = (scale: CalendarScale): number => {
  switch (scale) {
    case 'day':
      return MS_PER_DAY
    case 'week':
      return MS_PER_DAY * 7
    case 'month':
      return MS_PER_DAY * 30
  }
}

const toMs = (d: Date | number) => (d instanceof Date ? d.getTime() : d)

function alignDown(t: number, step: number): number {
  return Math.floor(t / step) * step
}
function alignUp(t: number, step: number): number {
  return Math.ceil(t / step) * step
}

const computedRange = computed(() => {
  const step = stepMs(props.scale)

  // Scan the live assignments so the timeline can grow past `props.range`
  // when the user drag-resizes a bar past the right-hand edge. Without this
  // the bar would render off-screen and leave the user without any visual
  // feedback for the resize.
  let assignmentMin = Infinity
  let assignmentMax = -Infinity
  for (const a of props.assignments) {
    const s = toMs(a.start)
    const e = toMs(a.end)
    if (s < assignmentMin) assignmentMin = s
    if (e > assignmentMax) assignmentMax = e
  }

  if (props.range) {
    const rangeFrom = props.range.from.getTime()
    const rangeTo = props.range.to.getTime()
    if (props.assignments.length === 0) {
      return { from: rangeFrom, to: rangeTo }
    }
    // `range` is treated as the *minimum* viewport — assignments may pull
    // the visible window further in either direction (aligned to step so
    // the column grid stays whole).
    return {
      from: alignDown(Math.min(rangeFrom, assignmentMin), step),
      to: alignUp(Math.max(rangeTo, assignmentMax), step),
    }
  }

  if (props.assignments.length === 0) {
    const now = Date.now()
    return { from: alignDown(now, step), to: alignUp(now + step * 4, step) }
  }
  return {
    from: alignDown(assignmentMin - step, step),
    to: alignUp(assignmentMax + step, step),
  }
})

const totalMs = computed(() => computedRange.value.to - computedRange.value.from)
const stepValue = computed(() => stepMs(props.scale))
const totalSteps = computed(() => Math.max(1, Math.ceil(totalMs.value / stepValue.value)))
const pxPerMs = computed(() => props.columnWidth / stepValue.value)
const totalWidth = computed(() => totalMs.value * pxPerMs.value)

const headerHeight = computed(() => Math.max(28, Math.round(props.rowHeight * 0.6)))
const gridHeight = computed(() => props.resources.length * props.rowHeight)
const totalHeight = computed(() => gridHeight.value + headerHeight.value)

function formatTick(timeMs: number, scale: CalendarScale): string {
  const d = new Date(timeMs)
  switch (scale) {
    case 'day': {
      const dd = String(d.getUTCDate()).padStart(2, '0')
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
  }
}

const ticks = computed(() => {
  const arr: Array<{ x: number; label: string; time: number }> = []
  const step = stepValue.value
  for (let i = 0; i < totalSteps.value; i++) {
    const t = computedRange.value.from + i * step
    arr.push({
      x: i * props.columnWidth,
      label: formatTick(t, props.scale),
      time: t,
    })
  }
  return arr
})

const rowIndexById = computed(() => {
  const m = new Map<string, number>()
  props.resources.forEach((r, i) => m.set(r.id, i))
  return m
})

const conflictingIds = computed(() => {
  const ids = new Set<string>()
  const byResource = new Map<string, Assignment[]>()
  for (const a of props.assignments) {
    const list = byResource.get(a.resourceId) ?? []
    list.push(a)
    byResource.set(a.resourceId, list)
  }
  for (const list of byResource.values()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const aS = toMs(list[i].start)
        const aE = toMs(list[i].end)
        const bS = toMs(list[j].start)
        const bE = toMs(list[j].end)
        if (aS < bE && bS < aE) {
          ids.add(list[i].id)
          ids.add(list[j].id)
        }
      }
    }
  }
  return ids
})

const assignmentRects = computed(() => {
  return props.assignments
    .map((a) => {
      const row = rowIndexById.value.get(a.resourceId)
      if (row === undefined) return null
      const startMs = toMs(a.start)
      const endMs = toMs(a.end)
      const x = (startMs - computedRange.value.from) * pxPerMs.value
      const w = Math.max(2, (endMs - startMs) * pxPerMs.value)
      const y = row * props.rowHeight
      return { assignment: a, x, y, w, h: props.rowHeight, row }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
})

function statusOf(a: Assignment): string {
  if (conflictingIds.value.has(a.id)) return 'conflict'
  return a.status ?? 'tentative'
}

function blockClass(a: Assignment): string {
  if (props.unstyled) return ''
  return [
    'sg-rcal-assignment',
    `sg-rcal-assignment-${statusOf(a)}`,
    props.draggable ? 'sg-rcal-assignment-draggable' : '',
    props.resizable ? 'sg-rcal-assignment-resizable' : '',
  ]
    .filter(Boolean)
    .join(' ')
}

function colorOverrideFor(a: Assignment): string | undefined {
  if (statusOf(a) === 'conflict') return undefined
  return props.resources.find((r) => r.id === a.resourceId)?.color
}

interface DragSession {
  kind: 'move' | 'resize-start' | 'resize-end'
  id: string
  startClientX: number
  origStart: number
  origEnd: number
}

const drag = ref<DragSession | null>(null)

function startInteraction(
  e: PointerEvent,
  a: Assignment,
  kind: 'move' | 'resize-start' | 'resize-end',
) {
  if (e.button !== 0) return
  if (kind === 'move' && !props.draggable) return
  if (kind !== 'move' && !props.resizable) return
  e.preventDefault()
  e.stopPropagation()
  ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  drag.value = {
    kind,
    id: a.id,
    startClientX: e.clientX,
    origStart: toMs(a.start),
    origEnd: toMs(a.end),
  }
}

function onPointerMove(e: PointerEvent) {
  const d = drag.value
  if (!d) return
  const a = props.assignments.find((x) => x.id === d.id)
  if (!a) return
  const dxPx = e.clientX - d.startClientX
  const dxMs = dxPx / pxPerMs.value
  const step = stepValue.value
  const snappedDx = Math.round(dxMs / step) * step
  let nextStart = d.origStart
  let nextEnd = d.origEnd
  if (d.kind === 'move') {
    nextStart = d.origStart + snappedDx
    nextEnd = d.origEnd + snappedDx
  } else if (d.kind === 'resize-end') {
    nextEnd = Math.max(d.origStart + step, d.origEnd + snappedDx)
  } else {
    nextStart = Math.min(d.origEnd - step, d.origStart + snappedDx)
  }
  const next: Assignment = { ...a, start: nextStart, end: nextEnd }
  emit('assignment-change', next)
  emit('assignmentChange', next)
}

function onPointerUp() {
  drag.value = null
}

function onAssignmentKeyDown(e: KeyboardEvent, a: Assignment) {
  if (!props.draggable && !props.resizable) return
  const step = stepValue.value
  const startMs = toMs(a.start)
  const endMs = toMs(a.end)
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    const dir = e.key === 'ArrowLeft' ? -1 : 1
    e.preventDefault()
    let next: Assignment
    if (e.shiftKey && props.resizable) {
      next = { ...a, start: startMs, end: Math.max(startMs + step, endMs + dir * step) }
    } else if (props.draggable) {
      next = { ...a, start: startMs + dir * step, end: endMs + dir * step }
    } else {
      return
    }
    emit('assignment-change', next)
    emit('assignmentChange', next)
  }
}

const wrapperClass = computed(() => {
  if (props.unstyled) return props.className ?? ''
  return ['sg-rcal', props.className].filter(Boolean).join(' ')
})

const wrapperStyle = computed(() => ({
  display: 'grid',
  gridTemplateColumns: `${props.sidebarWidth}px 1fr`,
  width: '100%',
  overflow: 'auto',
  height: `${totalHeight.value}px`,
  ...(props.style ?? {}),
}))
</script>

<template>
  <div
    :class="wrapperClass"
    :style="wrapperStyle"
    role="region"
    :aria-label="calendarLabel"
    :data-scale="scale"
    :data-conflict-count="conflictingIds.size"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
  >
    <!-- Sidebar -->
    <div :class="unstyled ? undefined : 'sg-rcal-sidebar'" :style="{ width: `${sidebarWidth}px` }">
      <div
        :class="unstyled ? undefined : 'sg-rcal-sidebar-header'"
        :style="{ height: `${headerHeight}px` }"
      />
      <div
        v-for="(r, i) in resources"
        :key="r.id"
        :class="unstyled ? undefined : 'sg-rcal-sidebar-row'"
        :style="{ height: `${rowHeight}px` }"
        role="row"
        :aria-label="`Resource ${r.name}`"
        :data-row-index="i"
        :data-resource-id="r.id"
      >
        <span
          :class="unstyled ? undefined : 'sg-rcal-sidebar-marker'"
          :style="r.color ? { background: r.color } : undefined"
          data-role="marker"
          aria-hidden="true"
        />
        <span :class="unstyled ? undefined : 'sg-rcal-sidebar-name'">{{ r.name }}</span>
        <span
          v-if="r.capacityPerSlot !== undefined"
          :class="unstyled ? undefined : 'sg-rcal-sidebar-capacity'"
          :aria-label="`capacity ${r.capacityPerSlot} per slot`"
          >×{{ r.capacityPerSlot }}</span
        >
      </div>
    </div>

    <!-- Main pane -->
    <div
      :class="unstyled ? undefined : 'sg-rcal-main'"
      :style="{ position: 'relative', width: `${totalWidth}px`, minWidth: '100%' }"
    >
      <div
        :class="unstyled ? undefined : 'sg-rcal-header'"
        :style="{ position: 'relative', height: `${headerHeight}px`, width: `${totalWidth}px` }"
      >
        <div
          v-for="t in ticks"
          :key="t.time"
          :class="unstyled ? undefined : 'sg-rcal-tick'"
          :style="{
            position: 'absolute',
            left: `${t.x}px`,
            top: 0,
            width: `${columnWidth}px`,
            height: `${headerHeight}px`,
          }"
          :data-tick-time="t.time"
        >
          {{ t.label }}
        </div>
      </div>

      <div
        :class="unstyled ? undefined : 'sg-rcal-grid'"
        :style="{
          position: 'relative',
          width: `${totalWidth}px`,
          height: `${gridHeight}px`,
        }"
        :data-conflict-count="conflictingIds.size"
      >
        <!-- Row backgrounds -->
        <div
          v-for="(r, i) in resources"
          :key="r.id"
          :class="unstyled ? undefined : 'sg-rcal-row'"
          :style="{
            position: 'absolute',
            left: 0,
            top: `${i * rowHeight}px`,
            width: `${totalWidth}px`,
            height: `${rowHeight}px`,
          }"
          :data-row-index="i"
          :data-resource-id="r.id"
        >
          <div
            v-for="t in ticks"
            :key="t.time"
            :class="unstyled ? undefined : 'sg-rcal-slot'"
            :style="{
              position: 'absolute',
              left: `${t.x}px`,
              top: 0,
              width: `${columnWidth}px`,
              height: `${rowHeight}px`,
            }"
            :data-slot-time="t.time"
          />
        </div>

        <!-- Assignment blocks -->
        <div
          v-for="rect in assignmentRects"
          :key="rect.assignment.id"
          :class="blockClass(rect.assignment)"
          :style="{
            position: 'absolute',
            left: `${rect.x}px`,
            top: `${rect.y + 4}px`,
            width: `${rect.w}px`,
            height: `${rect.h - 8}px`,
            background: colorOverrideFor(rect.assignment),
            cursor: draggable ? 'grab' : undefined,
            userSelect: draggable || resizable ? 'none' : undefined,
          }"
          role="button"
          tabindex="0"
          :aria-label="`${rect.assignment.title}${statusOf(rect.assignment) === 'conflict' ? ' (conflict)' : ''}`"
          :data-assignment-id="rect.assignment.id"
          :data-status="statusOf(rect.assignment)"
          :data-resource-id="rect.assignment.resourceId"
          @pointerdown="draggable ? startInteraction($event, rect.assignment, 'move') : undefined"
          @keydown="(e: KeyboardEvent) => onAssignmentKeyDown(e, rect.assignment)"
        >
          <div
            v-if="resizable"
            :class="unstyled ? undefined : 'sg-rcal-assignment-resize-start'"
            role="button"
            :aria-label="resizeStartLabel"
            tabindex="-1"
            data-role="resize-handle-start"
            :style="{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '6px',
              cursor: 'ew-resize',
            }"
            @pointerdown="(e: PointerEvent) => startInteraction(e, rect.assignment, 'resize-start')"
          />
          <span
            :class="unstyled ? undefined : 'sg-rcal-assignment-title'"
            :style="{ position: 'relative', zIndex: 1 }"
            >{{ rect.assignment.title }}</span
          >
          <div
            v-if="resizable"
            :class="unstyled ? undefined : 'sg-rcal-assignment-resize-end'"
            role="button"
            :aria-label="resizeEndLabel"
            tabindex="-1"
            data-role="resize-handle-end"
            :style="{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: '6px',
              cursor: 'ew-resize',
            }"
            @pointerdown="(e: PointerEvent) => startInteraction(e, rect.assignment, 'resize-end')"
          />
        </div>
      </div>
    </div>
  </div>
</template>
