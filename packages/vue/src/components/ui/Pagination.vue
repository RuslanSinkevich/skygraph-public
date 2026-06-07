<script setup lang="ts">
import { computed, ref, useSlots, type PropType, type VNode } from 'vue'
import { useConfigWithDefaults, useConfig } from './ConfigProvider.vue'

/**
 * Renderer for the "total" label. Receives the total count and the current
 * visible range `[start, end]`. Return either a plain string or an array of
 * `VNode`s (e.g. `h('span', ...)`). Mirrors the React `showTotal` function
 * signature.
 */
export type PaginationTotalRenderer = (
  total: number,
  range: [number, number],
) => string | number | VNode | VNode[]

export interface PaginationProps {
  /** Current page number (1-based). */
  current: number
  /** Total number of records. */
  total: number
  /** Items per page. @default 10 */
  pageSize?: number
  /**
   * Whether the total count is displayed. When a function is passed it
   * receives `(total, [start, end])` and returns the rendered content
   * (parity with the React `showTotal` callback).
   */
  showTotal?: boolean | PaginationTotalRenderer
  /** Disables all controls. */
  disabled?: boolean
  /** Renders prev/next with current/total only. */
  simple?: boolean
  /** Shows a select to change pageSize. */
  showSizeChanger?: boolean
  /** Options for the page size select. @default [10, 20, 50, 100] */
  pageSizeOptions?: number[]
  /** Shows a quick jump input. */
  showQuickJumper?: boolean
  /** Strips built-in styles when true. */
  unstyled?: boolean
}

const props = defineProps({
  current: { type: Number, required: true },
  total: { type: Number, required: true },
  pageSize: { type: Number, default: 10 },
  showTotal: {
    type: [Boolean, Function] as PropType<boolean | PaginationTotalRenderer>,
    default: false,
  },
  disabled: { type: Boolean, default: undefined },
  simple: { type: Boolean, default: false },
  showSizeChanger: { type: Boolean, default: false },
  pageSizeOptions: {
    type: Array as PropType<number[]>,
    default: () => [10, 20, 50, 100],
  },
  showQuickJumper: { type: Boolean, default: false },
  unstyled: { type: Boolean, default: false },
})

defineSlots<{
  /**
   * Custom renderer for the total label. Receives the total count and the
   * current visible range `[start, end]` — equivalent to the
   * `showTotal` function prop.
   */
  total(slot: { total: number; range: [number, number] }): unknown
}>()

const emit = defineEmits<{
  (e: 'change', page: number): void
  (e: 'pageSizeChange', size: number): void
}>()

const { resolvedDisabled } = useConfigWithDefaults({ disabled: undefined }, {})
const disabled = computed(() => props.disabled ?? resolvedDisabled.value)
const cfg = useConfig()
const totalPrefix = computed(() => cfg.value.locale?.pagination?.totalPrefix ?? 'Total')
const itemsPerPageLabel = computed(() => cfg.value.locale?.pagination?.itemsPerPage ?? '/ page')
const jumpLabel = computed(() => cfg.value.locale?.pagination?.jump ?? 'Go to')
const navAriaLabel = computed(() => cfg.value.locale?.pagination?.ariaLabel ?? 'Pagination')

const jumpValue = ref('')

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
const safeCurrent = computed(() => Math.min(Math.max(1, props.current), totalPages.value))
const rangeStart = computed(() => (safeCurrent.value - 1) * props.pageSize + 1)
const rangeEnd = computed(() => Math.min(safeCurrent.value * props.pageSize, props.total))

const slots = useSlots()
const hasTotalSlot = computed(() => Boolean(slots.total))
const showTotalEnabled = computed(
  () => hasTotalSlot.value || props.showTotal === true || typeof props.showTotal === 'function',
)
const totalIsFunction = computed(() => typeof props.showTotal === 'function')
// Functional component bridge — renders whatever the consumer-provided
// `showTotal` callback returns (string / number / VNode / VNode[]).
const CustomTotalRenderer = {
  render() {
    if (typeof props.showTotal !== 'function') return null
    return props.showTotal(props.total, [rangeStart.value, rangeEnd.value])
  },
}

function go(page: number) {
  if (disabled.value || page < 1 || page > totalPages.value || page === safeCurrent.value) {
    return
  }
  emit('change', page)
}

function handleJump() {
  const num = parseInt(jumpValue.value, 10)
  if (!Number.isNaN(num)) {
    go(num)
  }
  jumpValue.value = ''
}

// Keyboard paging: ← / → step one page, Home / End jump to the edges.
// Skipped while focus sits in the size-changer <select> or quick-jumper
// <input> so arrow keys keep their native behaviour there.
function handleKeydown(e: KeyboardEvent) {
  if (disabled.value) return
  const tag = (e.target as HTMLElement | null)?.tagName
  if (tag === 'INPUT' || tag === 'SELECT') return
  switch (e.key) {
    case 'ArrowLeft':
      e.preventDefault()
      go(safeCurrent.value - 1)
      break
    case 'ArrowRight':
      e.preventDefault()
      go(safeCurrent.value + 1)
      break
    case 'Home':
      e.preventDefault()
      go(1)
      break
    case 'End':
      e.preventDefault()
      go(totalPages.value)
      break
  }
}

/**
 * Build a 7-slot page strip so the control width stays stable when the
 * user jumps between pages. Layouts:
 *   • near start:  [1] [2] [3] [4] [5] [...] [N]
 *   • middle:      [1] [...] [c-1] [c] [c+1] [...] [N]
 *   • near end:    [1] [...] [N-4] [N-3] [N-2] [N-1] [N]
 * Totals < 8 are rendered as a contiguous range — the strip is already
 * narrow enough that prev/next jumps cannot shift the surrounding layout.
 */
function buildPages(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) {
    return [1, 2, 3, 4, 5, '...', total]
  }
  if (current >= total - 3) {
    return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  }
  return [1, '...', current - 1, current, current + 1, '...', total]
}

const pages = computed(() => buildPages(safeCurrent.value, totalPages.value))

const rootClasses = computed(() =>
  ['sg-pagination', disabled.value ? 'sg-pagination-disabled' : ''].filter(Boolean).join(' '),
)

const simpleClasses = computed(() =>
  ['sg-pagination', 'sg-pagination-simple', disabled.value ? 'sg-pagination-disabled' : '']
    .filter(Boolean)
    .join(' '),
)
</script>

<template>
  <nav v-if="unstyled" :aria-label="navAriaLabel" @keydown="handleKeydown">
    <button type="button" :disabled="safeCurrent <= 1" @click="go(safeCurrent - 1)">‹</button>
    <template v-for="(p, i) in pages" :key="`p${i}-${p}`">
      <span v-if="p === '...'">…</span>
      <button
        v-else
        type="button"
        :aria-current="p === safeCurrent ? 'page' : undefined"
        @click="go(p as number)"
      >
        {{ p }}
      </button>
    </template>
    <button type="button" :disabled="safeCurrent >= totalPages" @click="go(safeCurrent + 1)">
      ›
    </button>
  </nav>
  <nav
    v-else-if="simple"
    :class="simpleClasses"
    :aria-label="navAriaLabel"
    @keydown="handleKeydown"
  >
    <button
      type="button"
      class="sg-pagination-item sg-pagination-prev"
      :disabled="safeCurrent <= 1"
      @click="go(safeCurrent - 1)"
    >
      ‹
    </button>
    <span class="sg-pagination-simple-pager">{{ safeCurrent }} / {{ totalPages }}</span>
    <button
      type="button"
      class="sg-pagination-item sg-pagination-next"
      :disabled="safeCurrent >= totalPages"
      @click="go(safeCurrent + 1)"
    >
      ›
    </button>
  </nav>
  <nav v-else :class="rootClasses" :aria-label="navAriaLabel" @keydown="handleKeydown">
    <span v-if="showTotalEnabled" class="sg-pagination-total">
      <slot name="total" :total="total" :range="[rangeStart, rangeEnd] as [number, number]">
        <component v-if="totalIsFunction" :is="CustomTotalRenderer" />
        <template v-else>{{ totalPrefix }} {{ total }}</template>
      </slot>
    </span>
    <button
      type="button"
      class="sg-pagination-item sg-pagination-prev"
      :disabled="safeCurrent <= 1"
      @click="go(safeCurrent - 1)"
    >
      ‹
    </button>
    <template v-for="(p, i) in pages" :key="`p${i}-${p}`">
      <span v-if="p === '...'" class="sg-pagination-ellipsis">…</span>
      <button
        v-else
        type="button"
        :class="`sg-pagination-item${p === safeCurrent ? ' sg-pagination-item-active' : ''}`"
        :aria-current="p === safeCurrent ? 'page' : undefined"
        @click="go(p as number)"
      >
        {{ p }}
      </button>
    </template>
    <button
      type="button"
      class="sg-pagination-item sg-pagination-next"
      :disabled="safeCurrent >= totalPages"
      @click="go(safeCurrent + 1)"
    >
      ›
    </button>
    <select
      v-if="showSizeChanger"
      class="sg-pagination-size-changer"
      :value="pageSize"
      :disabled="disabled"
      @change="emit('pageSizeChange', Number(($event.target as HTMLSelectElement).value))"
    >
      <option v-for="opt in pageSizeOptions" :key="opt" :value="opt">
        {{ opt }} {{ itemsPerPageLabel }}
      </option>
    </select>
    <span v-if="showQuickJumper" class="sg-pagination-quick-jumper">
      {{ jumpLabel }}
      <input
        type="text"
        class="sg-pagination-jumper-input"
        :value="jumpValue"
        :disabled="disabled"
        @input="jumpValue = ($event.target as HTMLInputElement).value"
        @keydown.enter="handleJump"
        @blur="handleJump"
      />
    </span>
  </nav>
</template>
