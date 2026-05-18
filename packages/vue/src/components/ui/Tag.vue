<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'

export interface TagProps {
  /** Preset semantic color or any CSS color string. @default 'default' */
  color?: 'default' | 'success' | 'error' | 'warning' | 'processing' | string
  /** Shows a close control when true. */
  closable?: boolean
  /** Whether to draw a border. @default true */
  bordered?: boolean
  /** Strips built-in styles when true. */
  unstyled?: boolean
}

const props = withDefaults(defineProps<TagProps>(), {
  color: 'default',
  bordered: true,
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

defineSlots<{
  default(props: Record<string, never>): unknown
}>()

const PRESET = new Set(['default', 'success', 'error', 'warning', 'processing'])

const isPreset = computed(() => PRESET.has(props.color))

const classes = computed(() =>
  [
    'sg-tag',
    isPreset.value ? `sg-tag-${props.color}` : '',
    props.bordered ? '' : 'sg-tag-borderless',
  ]
    .filter(Boolean)
    .join(' '),
)

const customStyle = computed<CSSProperties | undefined>(() =>
  isPreset.value
    ? undefined
    : { background: props.color, borderColor: props.color, color: '#fff' },
)

function handleClose(e: Event) {
  e.stopPropagation()
  emit('close')
}
</script>

<template>
  <span v-if="unstyled">
    <slot />
    <span v-if="closable" role="button" @click="handleClose">×</span>
  </span>
  <span v-else :class="classes" :style="customStyle">
    <slot />
    <span
      v-if="closable"
      class="sg-tag-close"
      role="button"
      aria-label="Close"
      @click="handleClose"
    >
      ×
    </span>
  </span>
</template>
