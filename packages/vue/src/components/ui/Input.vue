<script setup lang="ts">
import { computed, useSlots } from 'vue'
import { useConfig } from './ConfigProvider.vue'

export interface InputProps {
  /** v-model value (Vue idiom) — alias for `value`. */
  modelValue?: string
  /** Compat alias for `modelValue` — emits `change` like React's onChange. */
  value?: string
  /** Placeholder text when the field is empty. */
  placeholder?: string
  /** Native input type. */
  type?: 'text' | 'email' | 'password' | 'number'
  /** Size token. */
  size?: 'small' | 'middle' | 'large'
  /** Disables editing. */
  disabled?: boolean
  /** Marks the field as read-only. */
  readOnly?: boolean
  /** Optional input id forwarded to the underlying `<input>`. */
  id?: string
  /** Whether to render a clear button. */
  allowClear?: boolean
  /** Validation status badge. */
  status?: 'error' | 'warning'
  /** Strips built-in styling. */
  unstyled?: boolean
  /** Shows a loading spinner. */
  loading?: boolean
}

const props = withDefaults(defineProps<InputProps>(), {
  modelValue: '',
  type: 'text',
  size: 'middle',
  disabled: false,
  readOnly: false,
  allowClear: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
  (e: 'focus', evt: FocusEvent): void
  (e: 'blur', evt: FocusEvent): void
  (e: 'clear'): void
}>()

defineSlots<{
  prefix(props: Record<string, never>): unknown
  suffix(props: Record<string, never>): unknown
}>()

const currentValue = computed(() => props.value ?? props.modelValue ?? '')

const wrapperClasses = computed(() =>
  props.unstyled
    ? ''
    : [
        'sg-input-wrapper',
        `sg-input-wrapper-${props.size}`,
        props.loading ? 'sg-input-wrapper-loading' : '',
        props.readOnly ? 'sg-input-wrapper-readonly' : '',
        props.status ? `sg-input-wrapper-status-${props.status}` : '',
      ]
        .filter(Boolean)
        .join(' '),
)

const inputClasses = computed(() =>
  props.unstyled
    ? ''
    : [
        'sg-input',
        `sg-input-${props.size}`,
        props.readOnly ? 'sg-input-readonly' : '',
        props.status ? `sg-input-status-${props.status}` : '',
      ]
        .filter(Boolean)
        .join(' '),
)

function onInput(e: Event) {
  const target = e.target as HTMLInputElement
  emit('update:modelValue', target.value)
  emit('change', target.value)
}

function onFocus(e: FocusEvent) {
  emit('focus', e)
}

function onBlur(e: FocusEvent) {
  emit('blur', e)
}

function clear() {
  emit('update:modelValue', '')
  emit('change', '')
  emit('clear')
}

const showClear = computed(
  () => props.allowClear && !props.disabled && !props.readOnly && !!currentValue.value,
)

const slots = useSlots()
const hasPrefix = computed(() => Boolean(slots.prefix))
const hasSuffix = computed(() => Boolean(slots.suffix))

const cfg = useConfig()
const clearLabel = computed(() => cfg.value.locale?.input?.clear ?? 'Clear')
</script>

<template>
  <span :class="wrapperClasses">
    <span v-if="hasPrefix" class="sg-input-prefix">
      <slot name="prefix" />
    </span>
    <input
      :id="id"
      :type="type"
      :class="inputClasses"
      :value="currentValue"
      :placeholder="placeholder"
      :disabled="disabled || loading"
      :readonly="readOnly"
      :aria-readonly="readOnly || undefined"
      :aria-invalid="status === 'error' || undefined"
      @input="onInput"
      @focus="onFocus"
      @blur="onBlur"
    />
    <button
      v-if="showClear"
      type="button"
      class="sg-input-clear"
      :aria-label="clearLabel"
      @click="clear"
    >
      ×
    </button>
    <span v-if="loading && !unstyled" class="sg-spin sg-spin-small" aria-hidden="true" />
    <span v-if="hasSuffix" class="sg-input-suffix">
      <slot name="suffix" />
    </span>
  </span>
</template>
