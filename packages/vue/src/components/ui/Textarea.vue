<script setup lang="ts">
import { computed, ref, watch } from 'vue'

export interface TextareaProps {
  /** v-model binding (Vue idiom). */
  modelValue?: string
  /** Compat alias for `modelValue`. */
  value?: string
  /** Initial value when uncontrolled. */
  defaultValue?: string
  /** Placeholder shown when empty. */
  placeholder?: string
  /** Visible row count. */
  rows?: number
  /** Hard cap on input length. */
  maxLength?: number
  /** Shows current length below the field. */
  showCount?: boolean
  /** DOM id. */
  id?: string
  /** Disables editing. */
  disabled?: boolean
  /** Shows a loading spinner. */
  loading?: boolean
  /** Size token. */
  size?: 'small' | 'middle' | 'large'
  /** Strips built-in styling. */
  unstyled?: boolean
}

const props = withDefaults(defineProps<TextareaProps>(), {
  rows: 4,
  size: 'middle',
  disabled: false,
  loading: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
  (e: 'blur'): void
  (e: 'focus'): void
}>()

const internalValue = ref(props.modelValue ?? props.value ?? props.defaultValue ?? '')

watch(
  () => props.modelValue ?? props.value,
  (v) => {
    if (v !== undefined) internalValue.value = v
  },
)

const currentValue = computed(() => props.modelValue ?? props.value ?? internalValue.value)

const wrapperClass = computed(() =>
  props.unstyled
    ? ''
    : [
        'sg-textarea-wrapper',
        `sg-textarea-${props.size}`,
        props.loading ? 'sg-textarea-wrapper-loading' : '',
      ]
        .filter(Boolean)
        .join(' '),
)

function onInput(e: Event) {
  const target = e.target as HTMLTextAreaElement
  let v = target.value
  if (props.maxLength && v.length > props.maxLength) {
    v = v.slice(0, props.maxLength)
  }
  internalValue.value = v
  emit('update:modelValue', v)
  emit('change', v)
}
</script>

<template>
  <div :class="wrapperClass">
    <textarea
      :id="id"
      :class="unstyled ? '' : 'sg-input sg-textarea'"
      :value="currentValue"
      :placeholder="placeholder"
      :rows="rows"
      :disabled="disabled || loading"
      :aria-disabled="disabled || loading"
      @input="onInput"
      @blur="emit('blur')"
      @focus="emit('focus')"
    />
    <span v-if="loading && !unstyled" class="sg-spin sg-spin-small" aria-hidden="true" />
    <span v-if="showCount && !unstyled" class="sg-textarea-count">
      {{ currentValue.length }}{{ maxLength ? ` / ${maxLength}` : '' }}
    </span>
  </div>
</template>
