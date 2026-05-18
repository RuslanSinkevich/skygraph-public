<script setup lang="ts">
import { computed } from 'vue'

export interface TimelineItem {
  /**
   * Main body text content.
   * For rich content use the scoped `content` slot — when present, the slot
   * takes precedence over this string.
   */
  content: string
  /**
   * Optional label text.
   * For rich content use the scoped `label` slot.
   */
  label?: string
  /** Border / text colour for the default ring (ignored when a custom `dot` is provided). */
  color?: string
  /**
   * Custom marker text (replaces default dot).
   * For rich markers use the scoped `dot` slot.
   */
  dot?: string
  /** Forces this item to one side (overrides list `mode` for this index). */
  position?: 'left' | 'right'
}

export interface TimelineProps {
  /** Ordered timeline steps. */
  items: TimelineItem[]
  /** Layout. @default 'left' */
  mode?: 'left' | 'right' | 'alternate'
  /**
   * Pending tail content. Pass `true` for an empty synthetic item.
   * For rich pending content use the `pending-content` slot.
   */
  pending?: string | boolean
  /** Reverse visual order. */
  reverse?: boolean
  /** Strips built-in styles when true. */
  unstyled?: boolean
}

const props = withDefaults(defineProps<TimelineProps>(), {
  mode: 'left',
})

defineSlots<{
  /** Per-item content override. `isPending` is `true` for the synthetic pending tail. */
  content(slotProps: { item: TimelineItem; index: number; isPending: boolean }): unknown
  /** Per-item label override (shown beside the marker / above on `alternate`). */
  label(slotProps: { item: TimelineItem; index: number }): unknown
  /**
   * Per-item dot override. Replaces the default ring; `isPending` is `true`
   * for the synthetic pending tail (use it to render `pendingDot` analogue).
   */
  dot(slotProps: { item: TimelineItem; index: number; isPending: boolean }): unknown
}>()

interface InternalItem extends TimelineItem {
  __pending?: boolean
}

const computedItems = computed<InternalItem[]>(() => {
  let arr: InternalItem[] = props.items.map((it) => ({ ...it }))
  if (props.pending) {
    arr.push({
      content: typeof props.pending === 'boolean' ? '' : props.pending,
      __pending: true,
    })
  }
  if (props.reverse) arr = arr.reverse()
  return arr
})

const isPending = computed(() => !!props.pending)

function getPosition(item: InternalItem, index: number): 'left' | 'right' {
  if (item.position) return item.position
  if (props.mode === 'alternate') return index % 2 === 0 ? 'left' : 'right'
  return props.mode
}

function itemClasses(item: InternalItem, index: number, isLast: boolean) {
  const pos = getPosition(item, index)
  return [
    'sg-timeline-item',
    `sg-timeline-item-${pos}`,
    (item.__pending ?? (isPending.value && isLast)) ? 'sg-timeline-item-pending' : '',
  ]
    .filter(Boolean)
    .join(' ')
}

const rootClasses = computed(() => `sg-timeline sg-timeline-${props.mode}`)
</script>

<template>
  <ul v-if="unstyled">
    <li v-for="(item, i) in computedItems" :key="i">
      <span v-if="$slots.label || item.label !== undefined">
        <slot name="label" :item="item" :index="i">{{ item.label }}</slot>
      </span>
      <span>
        <slot name="dot" :item="item" :index="i" :is-pending="item.__pending ?? false">{{
          item.dot ?? '●'
        }}</slot>
      </span>
      <span>
        <slot name="content" :item="item" :index="i" :is-pending="item.__pending ?? false">{{
          item.content
        }}</slot>
      </span>
    </li>
  </ul>
  <ul v-else :class="rootClasses" role="list">
    <li
      v-for="(item, i) in computedItems"
      :key="i"
      :class="itemClasses(item, i, i === computedItems.length - 1)"
      role="listitem"
    >
      <div v-if="$slots.label || item.label !== undefined" class="sg-timeline-item-label">
        <slot name="label" :item="item" :index="i">{{ item.label }}</slot>
      </div>
      <div class="sg-timeline-item-head-wrapper">
        <div
          :class="[
            'sg-timeline-item-head',
            item.dot || $slots.dot ? 'sg-timeline-item-head-custom' : '',
          ]"
          :style="
            item.color && !item.dot && !$slots.dot
              ? { borderColor: item.color, color: item.color }
              : undefined
          "
        >
          <slot name="dot" :item="item" :index="i" :is-pending="item.__pending ?? false">{{
            item.dot ?? ''
          }}</slot>
        </div>
        <div v-if="i < computedItems.length - 1" class="sg-timeline-item-tail" />
      </div>
      <div class="sg-timeline-item-content">
        <slot name="content" :item="item" :index="i" :is-pending="item.__pending ?? false">{{
          item.content
        }}</slot>
      </div>
    </li>
  </ul>
</template>
