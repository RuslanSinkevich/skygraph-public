<script setup lang="ts">
import { computed, ref } from 'vue'
import { useConfigWithDefaults } from './ConfigProvider.vue'
import type { SizeType } from '../../types'

export interface TabItem {
  /** Unique key used for selection and ARIA. */
  key: string
  /** Tab label in the tab list. */
  label: string
  /** Panel body shown when this tab is active. */
  content?: string
  /** When true, the tab cannot be activated. */
  disabled?: boolean
  /** When true, shows a spinner and blocks activation until cleared. */
  loading?: boolean
}

export interface TabsProps {
  /** Visual chrome. @default 'card' */
  type?: 'line' | 'card'
  /** Tab definitions. */
  items: TabItem[]
  /** Controlled active tab key. */
  activeKey?: string
  /** Initial active tab when uncontrolled. */
  defaultActiveKey?: string
  /** Component size variant. */
  size?: SizeType
  /** Strips built-in styles when true. */
  unstyled?: boolean
}

const props = withDefaults(defineProps<TabsProps>(), {
  type: 'card',
})

const emit = defineEmits<{
  (e: 'change', key: string): void
}>()

defineSlots<{
  default(props: { activeKey: string }): unknown
  tab(props: { item: TabItem }): unknown
  panel(props: { item: TabItem }): unknown
}>()

const { resolvedSize } = useConfigWithDefaults({ size: undefined }, {})
const realSize = computed<SizeType>(() => props.size ?? resolvedSize.value)

const internal = ref(props.activeKey ?? props.defaultActiveKey ?? props.items[0]?.key ?? '')
const currentKey = computed(() => props.activeKey ?? internal.value)
const activeItem = computed(() => props.items.find((i) => i.key === currentKey.value))

function setKey(key: string, disabled?: boolean, loading?: boolean) {
  if (disabled || loading) return
  internal.value = key
  emit('change', key)
}

function onKeyDown(e: KeyboardEvent, item: TabItem) {
  const enabled = props.items.filter((i) => !i.disabled && !i.loading)
  if (enabled.length === 0) return
  const cur = enabled.findIndex((i) => i.key === item.key)
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    e.preventDefault()
    const next = enabled[(cur + 1) % enabled.length]
    if (next) setKey(next.key)
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    e.preventDefault()
    const prev = enabled[(cur - 1 + enabled.length) % enabled.length]
    if (prev) setKey(prev.key)
  } else if (e.key === 'Home') {
    e.preventDefault()
    setKey(enabled[0].key)
  } else if (e.key === 'End') {
    e.preventDefault()
    setKey(enabled[enabled.length - 1].key)
  }
}

const rootClasses = computed(() =>
  [
    'sg-tabs',
    `sg-tabs-${realSize.value}`,
    props.type === 'line' ? 'sg-tabs-line' : 'sg-tabs-card',
  ].join(' '),
)
</script>

<template>
  <div v-if="unstyled">
    <div role="tablist">
      <button
        v-for="item in items"
        :key="item.key"
        type="button"
        role="tab"
        :aria-selected="item.key === currentKey"
        :disabled="item.disabled || item.loading"
        @click="setKey(item.key, item.disabled, item.loading)"
      >
        <slot name="tab" :item="item">{{ item.label }}</slot>
        <span v-if="item.loading" class="sg-spin sg-spin-small" aria-hidden="true" />
      </button>
    </div>
    <div role="tabpanel">
      <slot v-if="activeItem" name="panel" :item="activeItem">
        {{ activeItem.content }}
      </slot>
      <slot :activeKey="currentKey" />
    </div>
  </div>
  <div v-else :class="rootClasses">
    <div class="sg-tabs-nav" role="tablist">
      <div
        v-for="item in items"
        :key="item.key"
        role="tab"
        :aria-selected="item.key === currentKey"
        :class="[
          'sg-tabs-tab',
          item.key === currentKey ? 'sg-tabs-tab-active' : '',
          item.disabled ? 'sg-tabs-tab-disabled' : '',
          item.loading ? 'sg-tabs-tab-loading' : '',
        ]"
        :tabindex="item.key === currentKey ? 0 : -1"
        @click="setKey(item.key, item.disabled, item.loading)"
        @keydown="onKeyDown($event, item)"
      >
        <slot name="tab" :item="item">{{ item.label }}</slot>
        <span v-if="item.loading && !unstyled" class="sg-spin sg-spin-small" aria-hidden="true" />
      </div>
    </div>
    <div class="sg-tabs-content" role="tabpanel">
      <slot v-if="activeItem" name="panel" :item="activeItem">
        {{ activeItem.content }}
      </slot>
      <slot :activeKey="currentKey" />
    </div>
  </div>
</template>
