<script setup lang="ts">
import { computed, useSlots, type CSSProperties } from 'vue'

export interface BadgeProps {
  /** Numeric value shown in the badge. */
  count?: number
  /** Renders a small dot indicator. */
  dot?: boolean
  /** Maximum count before showing `{overflowCount}+`. @default 99 */
  overflowCount?: number
  /** Show even when count is 0. */
  showZero?: boolean
  /** Custom CSS color. */
  color?: string
  /** Preset status style. */
  status?: 'success' | 'error' | 'warning' | 'processing' | 'default'
  /** Status label text. */
  text?: string
  /** Pixel offset `[right, top]`. */
  offset?: [number, number]
  /** Strips built-in styles when true. */
  unstyled?: boolean
}

const props = withDefaults(defineProps<BadgeProps>(), {
  overflowCount: 99,
})

defineSlots<{
  default(props: Record<string, never>): unknown
}>()

const slots = useSlots()
const hasChildren = computed(() => Boolean(slots.default))

const hasCount = computed(() => props.count !== undefined && (props.count > 0 || props.showZero))

const displayCount = computed(() => {
  if (!hasCount.value) return null
  return props.count! > props.overflowCount ? `${props.overflowCount}+` : `${props.count}`
})

const isStandalone = computed(() => !hasChildren.value && (hasCount.value || Boolean(props.dot)))

const offsetStyle = computed<CSSProperties | undefined>(() =>
  props.offset && !isStandalone.value
    ? { right: `${-props.offset[0]}px`, marginTop: `${props.offset[1]}px` }
    : undefined,
)

const colorStyle = computed<CSSProperties | undefined>(() =>
  props.color ? { background: props.color } : undefined,
)
</script>

<template>
  <span v-if="unstyled" style="position: relative; display: inline-block">
    <slot />
    <sup v-if="dot || hasCount">{{ displayCount }}</sup>
    <span v-if="status">{{ text }}</span>
  </span>
  <span v-else-if="status && !hasChildren" class="sg-badge-status">
    <span :class="`sg-badge-status-dot sg-badge-status-${status}`" :style="colorStyle" />
    <span v-if="text" class="sg-badge-status-text">{{ text }}</span>
  </span>
  <span v-else :class="['sg-badge', isStandalone ? 'sg-badge-standalone' : null]">
    <slot />
    <sup
      v-if="dot && !hasCount"
      class="sg-badge-dot"
      :style="{ ...(offsetStyle ?? {}), ...(colorStyle ?? {}) }"
    />
    <sup
      v-if="hasCount"
      class="sg-badge-count"
      :style="{ ...(offsetStyle ?? {}), ...(colorStyle ?? {}) }"
      :aria-label="displayCount ?? undefined"
    >
      {{ displayCount }}
    </sup>
  </span>
</template>
