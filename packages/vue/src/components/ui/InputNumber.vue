<script setup lang="ts">
import { computed, ref, watch } from 'vue'

export interface InputNumberProps {
  /** v-model binding (Vue idiom). */
  modelValue?: number | null
  /** Compat alias for `modelValue`. */
  value?: number | null
  /** Initial value when uncontrolled. */
  defaultValue?: number
  /** Lower bound. */
  min?: number
  /** Upper bound. */
  max?: number
  /** Stepper increment. */
  step?: number
  /** Decimal precision. */
  precision?: number
  /** Placeholder text. */
  placeholder?: string
  /** Disables editing. */
  disabled?: boolean
  /** Shows a loading spinner. */
  loading?: boolean
  /** Size token. */
  size?: 'small' | 'middle' | 'large'
  /** Strips built-in styling. */
  unstyled?: boolean
}

const props = withDefaults(defineProps<InputNumberProps>(), {
  step: 1,
  size: 'middle',
  disabled: false,
  loading: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: number | null): void
  (e: 'change', value: number | null): void
  (e: 'blur'): void
}>()

const initial: number | null = props.modelValue ?? props.value ?? props.defaultValue ?? null
const internalValue = ref<number | null>(initial)

watch(
  () => props.modelValue ?? props.value,
  (v) => {
    if (v !== undefined) internalValue.value = v
  },
)

const currentValue = computed<number | null>(
  () => (props.modelValue ?? props.value ?? internalValue.value) as number | null,
)

const wrapperClass = computed(() =>
  props.unstyled
    ? ''
    : [
        'sg-input-number',
        `sg-input-number-${props.size}`,
        props.loading ? 'sg-input-number-loading' : '',
      ]
        .filter(Boolean)
        .join(' '),
)

function clamp(v: number): number {
  let result = v
  if (props.min !== undefined && result < props.min) result = props.min
  if (props.max !== undefined && result > props.max) result = props.max
  if (props.precision !== undefined) result = Number(result.toFixed(props.precision))
  return result
}

function update(v: number | null) {
  const next = v !== null ? clamp(v) : null
  internalValue.value = next
  emit('update:modelValue', next)
  emit('change', next)
}

function onInput(e: Event) {
  const raw = (e.target as HTMLInputElement).value
  if (raw === '' || raw === '-') {
    internalValue.value = null
    emit('update:modelValue', null)
    emit('change', null)
    return
  }
  const num = Number(raw)
  if (!isNaN(num)) update(num)
}

function increment() {
  if (props.disabled || props.loading) return
  update((currentValue.value ?? 0) + props.step)
}

function decrement() {
  if (props.disabled || props.loading) return
  update((currentValue.value ?? 0) - props.step)
}

const minDisabled = computed(
  () => props.min !== undefined && (currentValue.value ?? 0) <= props.min,
)
const maxDisabled = computed(
  () => props.max !== undefined && (currentValue.value ?? 0) >= props.max,
)
</script>

<template>
  <span :class="wrapperClass">
    <button
      :class="unstyled ? '' : 'sg-input-number-btn sg-input-number-minus'"
      :disabled="disabled || loading || minDisabled"
      tabindex="-1"
      @click="decrement"
    >
      −
    </button>
    <input
      type="text"
      inputmode="numeric"
      role="spinbutton"
      :aria-valuemin="min"
      :aria-valuemax="max"
      :aria-valuenow="currentValue ?? undefined"
      :class="unstyled ? '' : 'sg-input-number-input'"
      :value="currentValue ?? ''"
      :placeholder="placeholder"
      :disabled="disabled || loading"
      @input="onInput"
      @blur="emit('blur')"
    />
    <button
      :class="unstyled ? '' : 'sg-input-number-btn sg-input-number-plus'"
      :disabled="disabled || loading || maxDisabled"
      tabindex="-1"
      @click="increment"
    >
      +
    </button>
    <span v-if="loading && !unstyled" class="sg-spin sg-spin-small" aria-hidden="true" />
  </span>
</template>
