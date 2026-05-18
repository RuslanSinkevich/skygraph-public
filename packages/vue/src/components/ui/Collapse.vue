<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useConfigWithDefaults } from './ConfigProvider.vue'
import type { SizeType } from '../../types'

export interface CollapseItem {
  /** Unique key. */
  key: string
  /** Header text. */
  label: string
  /** Body text revealed when expanded. */
  content: string
  /** Optional content next to header. */
  extra?: string
  /** When `false`, hides the expand/collapse arrow. */
  showArrow?: boolean
  /** When `true`, the panel cannot be toggled. */
  disabled?: boolean
}

export interface CollapseProps {
  items: CollapseItem[]
  /** Controlled open keys. */
  activeKey?: string | string[]
  /** Initial open keys. */
  defaultActiveKey?: string | string[]
  /** Only one panel open at a time. */
  accordion?: boolean
  /** Draw a border. @default true */
  bordered?: boolean
  /** Placement of expand icon. @default 'start' */
  expandIconPosition?: 'start' | 'end'
  /** Transparent style. */
  ghost?: boolean
  /** Component size variant. */
  size?: SizeType
  /** Strips built-in styles when true. */
  unstyled?: boolean
}

const props = withDefaults(defineProps<CollapseProps>(), {
  accordion: false,
  bordered: true,
  expandIconPosition: 'start',
  ghost: false,
})

const emit = defineEmits<{
  (e: 'change', activeKey: string[]): void
}>()

defineSlots<{
  panel(props: { item: CollapseItem }): unknown
}>()

const { resolvedSize } = useConfigWithDefaults({ size: undefined }, {})
const realSize = computed<SizeType>(() => props.size ?? resolvedSize.value)

function toArray(val?: string | string[]): string[] {
  if (val === undefined) return []
  return Array.isArray(val) ? val : [val]
}

const internalActive = ref<string[]>(toArray(props.activeKey ?? props.defaultActiveKey))
const currentActive = computed(() =>
  props.activeKey !== undefined ? toArray(props.activeKey) : internalActive.value,
)

function toggle(key: string) {
  let next: string[]
  if (props.accordion) {
    next = currentActive.value.includes(key) ? [] : [key]
  } else {
    next = currentActive.value.includes(key)
      ? currentActive.value.filter((k) => k !== key)
      : [...currentActive.value, key]
  }
  internalActive.value = next
  emit('change', next)
}

const rootClasses = computed(() =>
  [
    'sg-collapse',
    props.bordered ? 'sg-collapse-bordered' : '',
    props.ghost ? 'sg-collapse-ghost' : '',
    `sg-collapse-${realSize.value}`,
  ]
    .filter(Boolean)
    .join(' '),
)

function panelClasses(item: CollapseItem) {
  const isActive = currentActive.value.includes(item.key)
  return [
    'sg-collapse-panel',
    isActive ? 'sg-collapse-panel-active' : '',
    item.disabled ? 'sg-collapse-panel-disabled' : '',
  ]
    .filter(Boolean)
    .join(' ')
}

function arrowClasses(item: CollapseItem) {
  const isActive = currentActive.value.includes(item.key)
  return ['sg-collapse-arrow', isActive ? 'sg-collapse-arrow-open' : ''].filter(Boolean).join(' ')
}

function isOpen(key: string) {
  return currentActive.value.includes(key)
}

function onKeyDown(e: KeyboardEvent, item: CollapseItem) {
  if (item.disabled) return
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    toggle(item.key)
  }
}

/* --- Per-panel animated max-height bookkeeping --- */

const contentRefs = ref<Map<string, HTMLElement>>(new Map())
const measuredHeights = ref<Map<string, number | null>>(new Map())

function setContentRef(key: string, el: Element | null) {
  if (el) contentRefs.value.set(key, el as HTMLElement)
  else contentRefs.value.delete(key)
}

function contentStyle(item: CollapseItem) {
  const measured = measuredHeights.value.get(item.key)
  const open = isOpen(item.key)
  let value: string
  if (measured !== undefined && measured !== null) value = `${measured}px`
  else if (open) value = 'none'
  else value = '0px'
  return { '--sg-collapse-content-max-height': value } as Record<string, string>
}

function syncHeight(item: CollapseItem) {
  const el = contentRefs.value.get(item.key)
  if (!el) return
  if (isOpen(item.key)) {
    measuredHeights.value.set(item.key, el.scrollHeight)
  } else {
    measuredHeights.value.set(item.key, el.scrollHeight)
    requestAnimationFrame(() => {
      measuredHeights.value.set(item.key, 0)
      measuredHeights.value = new Map(measuredHeights.value)
    })
  }
  measuredHeights.value = new Map(measuredHeights.value)
}

function onTransitionEnd(item: CollapseItem) {
  if (isOpen(item.key)) {
    measuredHeights.value.set(item.key, null)
    measuredHeights.value = new Map(measuredHeights.value)
  }
}

onMounted(() => {
  // Prime measurements for any panels that start open so their CSS
  // max-height reflects the actual scrollHeight (Vue mounted the DOM
  // synchronously, so refs are populated by this tick).
  for (const item of props.items) {
    if (isOpen(item.key)) {
      const el = contentRefs.value.get(item.key)
      if (el) {
        measuredHeights.value.set(item.key, el.scrollHeight)
      }
    }
  }
  measuredHeights.value = new Map(measuredHeights.value)
})

watch(currentActive, (next, prev) => {
  const prevSet = new Set(prev ?? [])
  const nextSet = new Set(next ?? [])
  const changed: string[] = []
  for (const item of props.items) {
    const was = prevSet.has(item.key)
    const now = nextSet.has(item.key)
    if (was !== now) changed.push(item.key)
  }
  if (changed.length === 0) return
  void nextTick(() => {
    for (const key of changed) {
      const item = props.items.find((i) => i.key === key)
      if (item) syncHeight(item)
    }
  })
})
</script>

<template>
  <div v-if="unstyled">
    <div v-for="item in items" :key="item.key">
      <button
        type="button"
        :disabled="item.disabled"
        :aria-expanded="isOpen(item.key)"
        @click="!item.disabled && toggle(item.key)"
      >
        {{ item.label }}
        <span v-if="item.extra">{{ item.extra }}</span>
      </button>
      <div v-if="isOpen(item.key)">
        <slot name="panel" :item="item">{{ item.content }}</slot>
      </div>
    </div>
  </div>
  <div v-else :class="rootClasses">
    <div v-for="item in items" :key="item.key" :class="panelClasses(item)">
      <div
        class="sg-collapse-header"
        role="button"
        :tabindex="item.disabled ? -1 : 0"
        :aria-expanded="isOpen(item.key)"
        @click="!item.disabled && toggle(item.key)"
        @keydown="onKeyDown($event, item)"
      >
        <span
          v-if="expandIconPosition === 'start' && item.showArrow !== false"
          :class="arrowClasses(item)"
        />
        <span class="sg-collapse-header-text">{{ item.label }}</span>
        <span
          v-if="expandIconPosition === 'end' && item.showArrow !== false"
          :class="arrowClasses(item)"
        />
        <span v-if="item.extra" class="sg-collapse-extra">{{ item.extra }}</span>
      </div>
      <div
        :ref="(el) => setContentRef(item.key, el as Element | null)"
        class="sg-collapse-content"
        :style="contentStyle(item)"
        @transitionend="onTransitionEnd(item)"
      >
        <div class="sg-collapse-content-inner">
          <slot name="panel" :item="item">{{ item.content }}</slot>
        </div>
      </div>
    </div>
  </div>
</template>
