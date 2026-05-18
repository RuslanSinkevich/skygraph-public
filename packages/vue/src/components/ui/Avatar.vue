<script setup lang="ts">
import { computed, useSlots, type CSSProperties } from 'vue'
import { useConfig } from './ConfigProvider.vue'
import type { SizeType } from '../../types'

export interface AvatarProps {
  /** Image URL when displaying a photo avatar. */
  src?: string
  /** Alt text. */
  alt?: string
  /** Accessible name. */
  ariaLabel?: string
  /** Width/height in px or preset size token. */
  size?: SizeType | number
  /** Outer shape. @default 'circle' */
  shape?: 'circle' | 'square'
  /** Strips built-in styles when true. */
  unstyled?: boolean
}

const props = withDefaults(defineProps<AvatarProps>(), {
  shape: 'circle',
})

defineSlots<{
  default(props: Record<string, never>): unknown
  icon(props: Record<string, never>): unknown
}>()

const cfg = useConfig()
const sizeMap: Record<string, number> = { small: 24, default: 32, large: 40 }

const resolvedSize = computed<SizeType | number>(() =>
  props.size ?? cfg.value.size ?? 'middle',
)

const avatarSize = computed(() => {
  const s = resolvedSize.value
  if (typeof s === 'number') return s
  return s === 'middle' ? 'default' : s
})

const px = computed(() => {
  const s = resolvedSize.value
  return typeof s === 'number' ? s : sizeMap[avatarSize.value as string]
})

const fontSize = computed(() => Math.round(px.value * 0.45))

const slots = useSlots()
const hasIcon = computed(() => Boolean(slots.icon))

const classes = computed(() =>
  [
    'sg-avatar',
    `sg-avatar-${props.shape}`,
    typeof resolvedSize.value === 'string' ? `sg-avatar-${avatarSize.value}` : '',
  ]
    .filter(Boolean)
    .join(' '),
)

const sizeStyle = computed<CSSProperties>(() => ({
  width: `${px.value}px`,
  height: `${px.value}px`,
  lineHeight: `${px.value}px`,
  fontSize: props.src ? undefined : `${fontSize.value}px`,
}))
</script>

<template>
  <span
    v-if="unstyled"
    role="img"
    :aria-label="ariaLabel"
  >
    <img v-if="src" :src="src" :alt="alt" />
    <slot v-else-if="hasIcon" name="icon" />
    <slot v-else />
  </span>
  <span
    v-else
    :class="classes"
    :style="sizeStyle"
    role="img"
    :aria-label="ariaLabel"
  >
    <img v-if="src" class="sg-avatar-image" :src="src" :alt="alt" />
    <span v-else-if="hasIcon" class="sg-avatar-icon"><slot name="icon" /></span>
    <span v-else class="sg-avatar-text"><slot /></span>
  </span>
</template>
