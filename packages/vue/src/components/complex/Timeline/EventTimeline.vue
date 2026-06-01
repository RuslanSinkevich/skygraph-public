<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'
import { useConfig } from '../../ui/ConfigProvider.vue'
import type { EventTimelineProps, TimelineEvent, TimelineGroupBy } from './types'

const props = withDefaults(defineProps<EventTimelineProps>(), {
  orientation: 'vertical',
  unstyled: false,
})

defineSlots<{
  marker(props: { event: TimelineEvent }): unknown
  event(props: { event: TimelineEvent }): unknown
}>()

function toMs(v: Date | number): number {
  return v instanceof Date ? v.getTime() : v
}

function bucketKey(timeMs: number, groupBy: TimelineGroupBy): string {
  const d = new Date(timeMs)
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth() + 1
  const day = d.getUTCDate()
  switch (groupBy) {
    case 'day':
      return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    case 'month':
      return `${y}-${String(m).padStart(2, '0')}`
    case 'year':
      return `${y}`
  }
}

function bucketLabel(timeMs: number, groupBy: TimelineGroupBy): string {
  const d = new Date(timeMs)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  switch (groupBy) {
    case 'day':
      return `${day}.${m}.${y}`
    case 'month':
      return `${m}.${y}`
    case 'year':
      return `${y}`
  }
}

const sorted = computed(() => [...props.events].sort((a, b) => toMs(a.date) - toMs(b.date)))

interface Group {
  key: string
  label: string
  events: TimelineEvent[]
}

const groups = computed<Group[]>(() => {
  if (!props.groupBy) return [{ key: 'all', label: '', events: sorted.value }]
  const out: Group[] = []
  let current: Group | null = null
  for (const ev of sorted.value) {
    const key = bucketKey(toMs(ev.date), props.groupBy)
    if (!current || current.key !== key) {
      current = { key, label: bucketLabel(toMs(ev.date), props.groupBy), events: [] }
      out.push(current)
    }
    current.events.push(ev)
  }
  return out
})

const wrapperClass = computed(() => {
  if (props.unstyled) return [props.className].filter(Boolean).join(' ')
  return ['sg-event-timeline', `sg-event-timeline-${props.orientation}`, props.className]
    .filter(Boolean)
    .join(' ')
})

const wrapperStyle = computed<CSSProperties>(() => ({
  display: 'flex',
  flexDirection: props.orientation === 'horizontal' ? 'row' : 'column',
  ...(props.style ?? {}),
}))

const cfg = useConfig()
const timelineLabel = computed(() => cfg.value.locale?.timeline?.ariaLabel ?? 'Timeline')
</script>

<template>
  <div
    :class="wrapperClass"
    :style="wrapperStyle"
    role="list"
    :aria-label="timelineLabel"
    :data-orientation="props.orientation"
    :data-group-by="props.groupBy ?? 'none'"
  >
    <template v-for="group in groups" :key="group.key">
      <div
        v-if="props.groupBy"
        :class="props.unstyled ? undefined : 'sg-event-timeline-group'"
        :data-group-key="group.key"
      >
        {{ group.label }}
      </div>
      <div
        v-for="ev in group.events"
        :key="ev.id"
        :class="props.unstyled ? undefined : 'sg-event-timeline-item'"
        role="listitem"
        :data-event-id="ev.id"
        :data-event-time="ev.date instanceof Date ? ev.date.getTime() : ev.date"
      >
        <div :class="props.unstyled ? undefined : 'sg-event-timeline-marker'">
          <slot name="marker" :event="ev">
            <span
              :class="props.unstyled ? undefined : 'sg-event-timeline-dot'"
              :style="ev.color ? { background: ev.color } : undefined"
              aria-hidden="true"
            />
          </slot>
        </div>
        <div :class="props.unstyled ? undefined : 'sg-event-timeline-content'">
          <slot name="event" :event="ev">
            <div :class="props.unstyled ? undefined : 'sg-event-timeline-title'">
              {{ ev.title }}
            </div>
            <div
              v-if="ev.description !== undefined"
              :class="props.unstyled ? undefined : 'sg-event-timeline-description'"
            >
              {{ ev.description }}
            </div>
          </slot>
        </div>
      </div>
    </template>
  </div>
</template>
