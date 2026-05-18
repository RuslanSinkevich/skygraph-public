<script setup lang="ts" generic="T">
import { computed } from 'vue'
import { useVirtualScroll } from '../../../composables/useVirtualScroll'
import type { VirtualItem } from '@skygraph/core'

export interface VirtualListProps<T> {
  /** Full dataset; only visible indices are rendered. */
  data: T[]
  /** Fixed row height or per-index height resolver in pixels. */
  itemHeight: number | ((index: number) => number)
  /** Extra rows rendered above and below the viewport. */
  overscan?: number
  /** Optional class on the scroll container. */
  className?: string
  /** Optional inline style on the scroll container. */
  containerStyle?: Record<string, string | number>
  /** Resolves a stable Vue key for each item; defaults to row index. */
  itemKey?: (item: T, index: number) => string | number
}

const props = withDefaults(defineProps<VirtualListProps<T>>(), {
  overscan: undefined,
  className: undefined,
  containerStyle: undefined,
  itemKey: undefined,
})

defineSlots<{
  /** Renders one item with absolute positioning styles applied by the list. */
  item(props: { item: T; index: number; style: Record<string, string | number> }): unknown
}>()

const itemCount = computed(() => props.data.length)
const itemHeight = computed(() => props.itemHeight)

const { range, containerRef, scrollToIndex } = useVirtualScroll({
  itemCount,
  itemHeight,
  overscan: computed(() => props.overscan ?? 5),
})

defineExpose({
  /** Scrolls the viewport so the item at `index` is visible. */
  scrollToIndex,
})

const visibleItems = computed(() => {
  const items = range.value.visibleItems
  return items.map((vi: VirtualItem) => {
    const item = props.data[vi.index]
    const key = props.itemKey ? props.itemKey(item, vi.index) : vi.index
    const style: Record<string, string | number> = {
      position: 'absolute',
      top: `${vi.offsetTop}px`,
      left: '0',
      right: '0',
      height: `${vi.height}px`,
    }
    return { vi, item, key, style }
  })
})
</script>

<template>
  <div
    ref="containerRef"
    :class="className"
    :style="{ overflow: 'auto', position: 'relative', ...containerStyle }"
  >
    <div :style="{ height: `${range.totalHeight}px`, position: 'relative' }">
      <template v-for="entry in visibleItems" :key="entry.key">
        <slot name="item" :item="entry.item" :index="entry.vi.index" :style="entry.style" />
      </template>
    </div>
  </div>
</template>
