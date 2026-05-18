<script setup lang="ts" generic="T">
import { computed, ref, useSlots } from 'vue'
import type { ListProps, ListClassNames, ListStyles } from './types'

const props = withDefaults(defineProps<ListProps<T>>(), {
  loading: false,
  pagination: false,
  size: 'default',
  split: true,
  bordered: false,
  unstyled: false,
  selectable: false,
  multiSelect: false,
  draggable: false,
  hoverable: true,
  defaultSelectedKeys: () => [],
})

const emit = defineEmits<{
  /** Fires when selection changes. */
  (e: 'selectionChange', keys: number[], items: T[]): void
  /** Fires after items are reordered via drag. */
  (e: 'reorder', fromIndex: number, toIndex: number): void
  /** Fires on row click. */
  (e: 'itemClick', item: T, index: number): void
  /** Fires when pagination changes. */
  (e: 'pageChange', page: number, pageSize: number): void
}>()

defineSlots<{
  default(props: { item: T; index: number }): unknown
  header(props: Record<string, never>): unknown
  footer(props: Record<string, never>): unknown
  loadMore(props: Record<string, never>): unknown
}>()

const slots = useSlots()

const sCls = computed<ListClassNames>(() => props.classNames ?? {})
const sSty = computed<ListStyles>(() => props.styles ?? {})

const internalPage = ref(1)
const internalSelectedKeys = ref<number[]>(props.defaultSelectedKeys ?? [])
const dragIndex = ref<number | null>(null)
const dropIndex = ref<number | null>(null)
const scrollTop = ref(0)
const virtualEl = ref<HTMLDivElement | null>(null)

const selectedKeys = computed<number[]>(() => props.selectedKeys ?? internalSelectedKeys.value)

const pageSize = computed(() =>
  props.pagination ? (props.pagination.pageSize ?? 10) : props.dataSource.length,
)
const currentPage = computed(() =>
  props.pagination ? (props.pagination.current ?? internalPage.value) : 1,
)
const total = computed(() =>
  props.pagination ? (props.pagination.total ?? props.dataSource.length) : props.dataSource.length,
)

const paginatedData = computed(() => {
  if (!props.pagination) return props.dataSource
  const start = (currentPage.value - 1) * pageSize.value
  return props.dataSource.slice(start, start + pageSize.value)
})

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

function changePage(page: number) {
  if (page < 1 || page > pageCount.value) return
  internalPage.value = page
  if (props.pagination) {
    props.pagination.onChange?.(page, pageSize.value)
  }
  emit('pageChange', page, pageSize.value)
}

function handleItemClick(item: T, index: number, e: MouseEvent) {
  emit('itemClick', item, index)
  if (!props.selectable) return

  let next: number[]
  if (props.multiSelect && (e.ctrlKey || e.metaKey)) {
    next = selectedKeys.value.includes(index)
      ? selectedKeys.value.filter((k) => k !== index)
      : [...selectedKeys.value, index]
  } else {
    next = selectedKeys.value.includes(index) ? [] : [index]
  }

  internalSelectedKeys.value = next
  emit(
    'selectionChange',
    next,
    next.map((k) => props.dataSource[k]),
  )
}

function handleDragStart(e: DragEvent, index: number) {
  if (!props.draggable) return
  dragIndex.value = index
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}

function handleDragOver(e: DragEvent, index: number) {
  if (!props.draggable || dragIndex.value === null) return
  e.preventDefault()
  dropIndex.value = index
}

function handleDrop(e: DragEvent, index: number) {
  e.preventDefault()
  if (dragIndex.value === null || dragIndex.value === index) {
    dragIndex.value = null
    dropIndex.value = null
    return
  }
  emit('reorder', dragIndex.value, index)
  dragIndex.value = null
  dropIndex.value = null
}

function handleDragEnd() {
  dragIndex.value = null
  dropIndex.value = null
}

function handleVirtualScroll() {
  if (virtualEl.value) {
    scrollTop.value = virtualEl.value.scrollTop
  }
}

const emptyText = computed(() => props.locale?.emptyText ?? 'No Data')

const gridStyle = computed<Record<string, string | number> | undefined>(() => {
  if (!props.grid) return undefined
  const cols = props.grid.column ?? 1
  const style: Record<string, string | number> = {
    '--sg-list-grid-base-columns': `repeat(${cols}, 1fr)`,
  }
  if (props.grid.gutter !== undefined) style.gap = `${props.grid.gutter}px`
  return style
})

const gridResponsiveClass = computed(() => {
  const grid = props.grid
  if (!grid) return ''
  const parts: string[] = []
  if (grid.xs) parts.push(`sg-list-grid-xs-${grid.xs}`)
  if (grid.sm) parts.push(`sg-list-grid-sm-${grid.sm}`)
  if (grid.md) parts.push(`sg-list-grid-md-${grid.md}`)
  if (grid.lg) parts.push(`sg-list-grid-lg-${grid.lg}`)
  return parts.join(' ')
})

interface VirtualSlice {
  startIndex: number
  endIndex: number
  offsetTop: number
  totalHeight: number
}

const virtualSlice = computed<VirtualSlice | null>(() => {
  if (!props.virtual) return null
  const { itemHeight, height, overscan = 5 } = props.virtual
  const totalHeight = paginatedData.value.length * itemHeight
  const startIndex = Math.max(0, Math.floor(scrollTop.value / itemHeight) - overscan)
  const visibleCount = Math.ceil(height / itemHeight) + overscan * 2
  const endIndex = Math.min(paginatedData.value.length, startIndex + visibleCount)
  const offsetTop = startIndex * itemHeight
  return { startIndex, endIndex, offsetTop, totalHeight }
})

function rowCls(item: T, index: number): string {
  const isSelected = props.selectable && selectedKeys.value.includes(index)
  const isDragging = dragIndex.value === index
  const isDropTarget = dropIndex.value === index && dragIndex.value !== index
  const extra =
    typeof props.rowClassName === 'function'
      ? props.rowClassName(item, index)
      : (props.rowClassName ?? '')

  return [
    'sg-list-item',
    props.selectable ? 'sg-list-item-selectable' : '',
    isSelected ? 'sg-list-item-selected' : '',
    props.hoverable ? 'sg-list-item-hoverable' : '',
    isDragging ? 'sg-list-item-dragging' : '',
    isDropTarget ? 'sg-list-item-drop-target' : '',
    sCls.value.item ?? '',
    extra,
  ]
    .filter(Boolean)
    .join(' ')
}

const wrapperClass = computed(() => {
  if (props.unstyled) return ''
  return [
    'sg-list',
    `sg-list-${props.size}`,
    props.split ? 'sg-list-split' : '',
    props.bordered ? 'sg-list-bordered' : '',
    props.loading ? 'sg-list-loading' : '',
    props.grid ? 'sg-list-grid' : '',
    props.selectable ? 'sg-list-selectable' : '',
    props.draggable ? 'sg-list-draggable' : '',
    gridResponsiveClass.value,
    sCls.value.root ?? '',
  ]
    .filter(Boolean)
    .join(' ')
})

const itemsContainerClass = computed(() =>
  ['sg-list-items', sCls.value.items ?? ''].filter(Boolean).join(' '),
)

defineExpose({
  /** Currently selected item indices (uncontrolled mode). */
  selectedKeys: internalSelectedKeys,
  /** Programmatically change the page. */
  changePage,
})
</script>

<template>
  <div :class="wrapperClass" :style="sSty.root">
    <div
      v-if="slots.header || header"
      :class="['sg-list-header', sCls.header].filter(Boolean).join(' ') || undefined"
      :style="sSty.header"
    >
      <slot name="header">{{ header }}</slot>
    </div>

    <div v-if="loading" class="sg-list-loading-indicator" role="status" aria-live="polite">
      <span v-if="!unstyled" class="sg-spin sg-spin-default" aria-label="Loading" />
    </div>

    <div
      v-else-if="paginatedData.length === 0"
      :class="['sg-list-empty', sCls.empty].filter(Boolean).join(' ') || undefined"
      :style="sSty.empty"
    >
      {{ emptyText }}
    </div>

    <div
      v-else-if="virtual && virtualSlice"
      ref="virtualEl"
      class="sg-list-virtual-container"
      :style="{ height: `${virtual.height}px`, overflow: 'auto' }"
      @scroll="handleVirtualScroll"
    >
      <div :style="{ height: `${virtualSlice.totalHeight}px`, position: 'relative' }">
        <div
          :style="{ position: 'absolute', top: `${virtualSlice.offsetTop}px`, left: 0, right: 0 }"
        >
          <div
            v-for="(item, i) in paginatedData.slice(virtualSlice.startIndex, virtualSlice.endIndex)"
            :key="virtualSlice.startIndex + i"
            :class="rowCls(item, virtualSlice.startIndex + i) || undefined"
            :style="sSty.item"
            :draggable="draggable"
            @click="(e: MouseEvent) => handleItemClick(item, virtualSlice!.startIndex + i, e)"
            @dragstart="(e: DragEvent) => handleDragStart(e, virtualSlice!.startIndex + i)"
            @dragover="(e: DragEvent) => handleDragOver(e, virtualSlice!.startIndex + i)"
            @drop="(e: DragEvent) => handleDrop(e, virtualSlice!.startIndex + i)"
            @dragend="handleDragEnd"
            @dragleave="dropIndex = null"
          >
            <span v-if="draggable" class="sg-list-drag-handle">⠿</span>
            <slot :item="item" :index="virtualSlice.startIndex + i" />
          </div>
        </div>
      </div>
    </div>

    <div
      v-else
      :class="grid || sCls.items ? itemsContainerClass : undefined"
      :style="grid ? { ...gridStyle, ...sSty.items } : sSty.items"
    >
      <div
        v-for="(item, i) in paginatedData"
        :key="i"
        :class="rowCls(item, i) || undefined"
        :style="sSty.item"
        :draggable="draggable"
        @click="(e: MouseEvent) => handleItemClick(item, i, e)"
        @dragstart="(e: DragEvent) => handleDragStart(e, i)"
        @dragover="(e: DragEvent) => handleDragOver(e, i)"
        @drop="(e: DragEvent) => handleDrop(e, i)"
        @dragend="handleDragEnd"
        @dragleave="dropIndex = null"
      >
        <span v-if="draggable" class="sg-list-drag-handle">⠿</span>
        <slot :item="item" :index="i" />
      </div>
    </div>

    <div v-if="slots.loadMore" class="sg-list-load-more">
      <slot name="loadMore" />
    </div>

    <div
      v-if="pagination"
      :class="['sg-list-pagination', sCls.pagination].filter(Boolean).join(' ') || undefined"
      :style="sSty.pagination"
    >
      <button
        type="button"
        class="sg-list-pagination-prev"
        :disabled="currentPage <= 1"
        @click="changePage(currentPage - 1)"
      >
        ‹
      </button>
      <span class="sg-list-pagination-info">{{ currentPage }} / {{ pageCount }}</span>
      <button
        type="button"
        class="sg-list-pagination-next"
        :disabled="currentPage >= pageCount"
        @click="changePage(currentPage + 1)"
      >
        ›
      </button>
    </div>

    <div
      v-if="slots.footer || footer"
      :class="['sg-list-footer', sCls.footer].filter(Boolean).join(' ') || undefined"
      :style="sSty.footer"
    >
      <slot name="footer">{{ footer }}</slot>
    </div>
  </div>
</template>
