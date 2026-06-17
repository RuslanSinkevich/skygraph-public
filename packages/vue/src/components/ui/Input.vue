<script setup lang="ts">
import { computed, inject, useSlots } from 'vue'
import { useConfig, useConfigWithDefaults } from './ConfigProvider.vue'
import { formContextKey } from '../complex/Form/context'

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
  /**
   * Exposes invalid state to assistive technologies. Accepts a string token
   * (`'true'` / `'false'` / `'grammar'` / `'spelling'`); the prop is
   * intentionally string-only so Vue's Boolean prop coercion does not
   * default it to `false` when the consumer omits it. Pass strings — e.g.
   * `aria-invalid="true"`.
   */
  ariaInvalid?: 'false' | 'true' | 'grammar' | 'spelling'
  /** Marks the field as required for assistive technologies. */
  ariaRequired?: 'false' | 'true'
  /** Connects the input to description / error nodes for assistive technologies. */
  ariaDescribedby?: string
}

const props = withDefaults(defineProps<InputProps>(), {
  modelValue: '',
  type: 'text',
  // `size` defaults to `undefined` so we can distinguish "consumer set a
  // size" from "inherit from the surrounding Form / ConfigProvider".
  size: undefined,
  disabled: undefined,
  readOnly: false,
  allowClear: false,
})

// Resolve the effective size: an explicit prop wins, otherwise inherit
// from the enclosing Form context (mirrors React, where `<Field>` forwards
// the form `size` to its control), falling back to `middle`.
const formCtx = inject(formContextKey, null)
const resolvedSize = computed(() => props.size ?? formCtx?.size ?? 'middle')

const { resolvedDisabled } = useConfigWithDefaults({ disabled: props.disabled }, {})

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
        `sg-input-wrapper-${resolvedSize.value}`,
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
        `sg-input-${resolvedSize.value}`,
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
  () => props.allowClear && !resolvedDisabled.value && !props.readOnly && !!currentValue.value,
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
      :disabled="resolvedDisabled || loading"
      :readonly="readOnly"
      :aria-readonly="readOnly || undefined"
      :aria-invalid="ariaInvalid ?? (status === 'error' || undefined)"
      :aria-required="ariaRequired"
      :aria-describedby="ariaDescribedby"
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
