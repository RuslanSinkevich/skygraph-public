<script setup lang="ts">
import { computed, type PropType } from 'vue'
import { useConfigWithDefaults } from './ConfigProvider.vue'
import type { SizeType } from '../../types'

export interface ButtonProps {
  /** Visual style variant. */
  type?: 'default' | 'primary' | 'dashed' | 'text' | 'link'
  /** Size token. */
  size?: SizeType
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

const props = defineProps({
  type: {
    type: String as PropType<'default' | 'primary' | 'dashed' | 'text' | 'link'>,
    default: 'default',
  },
  size: { type: String as PropType<SizeType>, default: undefined },
  htmlType: {
    type: String as PropType<'button' | 'submit' | 'reset'>,
    default: 'button',
  },
  danger: { type: Boolean, default: false },
  block: { type: Boolean, default: false },
  disabled: { type: Boolean, default: undefined },
  loading: { type: Boolean, default: false },
  unstyled: { type: Boolean, default: false },
})

const emit = defineEmits<{
  (e: 'click', evt: MouseEvent): void
}>()

defineSlots<{
  default(props: Record<string, never>): unknown
  icon(props: Record<string, never>): unknown
}>()

const { resolvedSize, resolvedDisabled } = useConfigWithDefaults(
  { size: undefined, disabled: undefined },
  {},
)

const realSize = computed<SizeType>(() => props.size ?? resolvedSize.value)
const realDisabled = computed<boolean>(() => props.disabled ?? resolvedDisabled.value)

const classes = computed(() => {
  if (props.unstyled) return ''
  return [
    'sg-button',
    `sg-button-${props.type}`,
    `sg-button-${realSize.value}`,
    props.danger ? 'sg-button-danger' : '',
    props.block ? 'sg-button-block' : '',
    props.loading ? 'sg-button-loading' : '',
  ]
    .filter(Boolean)
    .join(' ')
})

const isDisabled = computed(() => realDisabled.value || props.loading)

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
