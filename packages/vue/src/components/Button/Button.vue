<script setup lang="ts">
import { computed } from 'vue'

export interface ButtonProps {
  /** Visual style variant. */
  type?: 'default' | 'primary' | 'dashed' | 'text' | 'link'
  /** Size token. */
  size?: 'small' | 'middle' | 'large'
  /** Native HTML button type attribute. */
  htmlType?: 'button' | 'submit' | 'reset'
  /** Visually flags a destructive action. */
  danger?: boolean
  /** Stretches the button to fill its parent container. */
  block?: boolean
  /** Disables the button. */
  disabled?: boolean
  /** Shows a loading spinner and disables interaction. */
  loading?: boolean
  /** Strips built-in styles when true. */
  unstyled?: boolean
}

const props = withDefaults(defineProps<ButtonProps>(), {
  type: 'default',
  size: 'middle',
  htmlType: 'button',
  danger: false,
  block: false,
  disabled: false,
  loading: false,
  unstyled: false,
})

const emit = defineEmits<{
  (e: 'click', evt: MouseEvent): void
}>()

defineSlots<{
  default(props: Record<string, never>): unknown
  icon(props: Record<string, never>): unknown
}>()

const classes = computed(() => {
  if (props.unstyled) return ''
  return [
    'sg-button',
    `sg-button-${props.type}`,
    `sg-button-${props.size}`,
    props.danger ? 'sg-button-danger' : '',
    props.block ? 'sg-button-block' : '',
    props.loading ? 'sg-button-loading' : '',
  ]
    .filter(Boolean)
    .join(' ')
})

const isDisabled = computed(() => props.disabled || props.loading)

function handleClick(evt: MouseEvent) {
  if (isDisabled.value) {
    evt.preventDefault()
    evt.stopPropagation()
    return
  }
  emit('click', evt)
}
</script>

<template>
  <button
    :type="htmlType"
    :class="classes"
    :disabled="isDisabled"
    :aria-disabled="isDisabled"
    :aria-busy="loading || undefined"
    @click="handleClick"
  >
    <span v-if="loading && !unstyled" class="sg-spin sg-spin-small" aria-hidden="true" />
    <slot name="icon" />
    <slot />
  </button>
</template>
