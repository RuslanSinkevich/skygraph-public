<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useSlots, watch } from 'vue'
import { useConfigWithDefaults } from './ConfigProvider.vue'
import type { SizeType } from '../../types'

export interface SpinProps {
  /** When `true`, shows the loading state (subject to `delay`). @default true */
  spinning?: boolean
  /** Component size variant. */
  size?: SizeType
  /** Milliseconds to wait before showing the spinner after `spinning` becomes true. */
  delay?: number
  /** Optional text below the indicator. */
  tip?: string
  /** When `true`, covers the viewport instead of inline or wrapping children. */
  fullscreen?: boolean
  /** Strips built-in styles when true. */
  unstyled?: boolean
}

const props = withDefaults(defineProps<SpinProps>(), {
  spinning: true,
  fullscreen: false,
})

defineSlots<{
  default(props: Record<string, never>): unknown
  indicator(props: Record<string, never>): unknown
}>()

const { resolvedSize } = useConfigWithDefaults({ size: undefined }, {})
const realSize = computed<SizeType>(() => props.size ?? resolvedSize.value)

const visible = ref(props.delay ? false : props.spinning)
let timer: ReturnType<typeof setTimeout> | undefined

watch(
  () => [props.spinning, props.delay] as const,
  ([s, d]) => {
    if (timer) clearTimeout(timer)
    if (!d) {
      visible.value = !!s
      return
    }
    if (s) {
      timer = setTimeout(() => {
        visible.value = true
      }, d)
    } else {
      visible.value = false
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
})

const spinSizeClass = computed(() => (realSize.value === 'middle' ? 'default' : realSize.value))
const spinClasses = computed(() =>
  props.unstyled ? '' : `sg-spin sg-spin-${spinSizeClass.value}`,
)

const slots = useSlots()
const hasChildren = computed(() => Boolean(slots.default))
const hasIndicator = computed(() => Boolean(slots.indicator))
</script>

<template>
  <template v-if="!visible && !hasChildren" />
  <template v-else-if="!visible && hasChildren">
    <slot />
  </template>
  <div v-else-if="fullscreen" :class="unstyled ? '' : 'sg-spin-fullscreen'">
    <div :class="unstyled ? '' : 'sg-spin-fullscreen-inner'">
      <slot v-if="hasIndicator" name="indicator" />
      <span
        v-else
        :class="spinClasses"
        role="status"
        aria-live="polite"
        aria-label="Loading"
      />
      <div v-if="tip" :class="unstyled ? '' : 'sg-spin-tip'">{{ tip }}</div>
    </div>
  </div>
  <span v-else-if="!hasChildren" :class="unstyled ? '' : 'sg-spin-standalone'">
    <slot v-if="hasIndicator" name="indicator" />
    <span
      v-else
      :class="spinClasses"
      role="status"
      aria-live="polite"
      aria-label="Loading"
    />
    <div v-if="tip" :class="unstyled ? '' : 'sg-spin-tip'">{{ tip }}</div>
  </span>
  <div v-else :class="unstyled ? '' : 'sg-spin-container'">
    <div :class="unstyled ? '' : 'sg-spin-overlay'">
      <slot v-if="hasIndicator" name="indicator" />
      <span
        v-else
        :class="spinClasses"
        role="status"
        aria-live="polite"
        aria-label="Loading"
      />
      <div v-if="tip" :class="unstyled ? '' : 'sg-spin-tip'">{{ tip }}</div>
    </div>
    <div :class="visible && !unstyled ? 'sg-spin-blur' : ''">
      <slot />
    </div>
  </div>
</template>
