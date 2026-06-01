<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

export interface RadioOption {
  label: string
  value: string | number
  disabled?: boolean
}

export interface RadioGroupProps {
  /** v-model binding (Vue idiom). */
  modelValue?: string | number
  /** Compat alias for `modelValue`. */
  value?: string | number
  /** Initial value when uncontrolled. */
  defaultValue?: string | number
  /** Options rendered as radio controls. */
  options: RadioOption[]
  /** Stack direction. */
  direction?: 'horizontal' | 'vertical'
  /** Disables all options. */
  disabled?: boolean
  /** Shows a loading spinner next to the selected option and disables interaction. */
  loading?: boolean
  /** Strips built-in styling. */
  unstyled?: boolean
}

const props = withDefaults(defineProps<RadioGroupProps>(), {
  modelValue: undefined,
  value: undefined,
  defaultValue: undefined,
  direction: 'horizontal',
  disabled: false,
  loading: false,
  unstyled: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number): void
  (e: 'change', value: string | number): void
}>()

const internal = ref<string | number | undefined>(
  props.modelValue ?? props.value ?? props.defaultValue,
)

watch(
  () => props.modelValue ?? props.value,
  (v) => {
    if (v !== undefined) internal.value = v
  },
)

const current = computed(() => props.modelValue ?? props.value ?? internal.value)

function select(opt: RadioOption) {
  if (opt.disabled || props.disabled || props.loading) return
  internal.value = opt.value
  emit('update:modelValue', opt.value)
  emit('change', opt.value)
}

const groupClass = computed(() =>
  props.unstyled
    ? ''
    : [
        'sg-radio-group',
        `sg-radio-group-${props.direction}`,
        props.loading ? 'sg-radio-group-loading' : '',
      ]
        .filter(Boolean)
        .join(' '),
)

// Inputs are addressed via the wrapper to keep templates clean (one ref per
// option). Vue 3's `:checked` binding lands as a DOM attribute, not a property,
// which leaves the radio dot unpainted on the very first mount. Push the
// state through the property by hand after the patch settles.
const wrapperRef = ref<HTMLDivElement | null>(null)

function syncInputs() {
  const el = wrapperRef.value
  if (!el) return
  const inputs = el.querySelectorAll<HTMLInputElement>('input[type="radio"]')
  inputs.forEach((input, idx) => {
    const opt = props.options[idx]
    if (!opt) return
    const desired = current.value === opt.value
    if (input.checked !== desired) input.checked = desired
  })
}

watch([() => current.value, () => props.options], () => syncInputs(), { flush: 'post' })
onMounted(syncInputs)
</script>

<template>
  <div ref="wrapperRef" :class="groupClass" role="radiogroup">
    <label
      v-for="opt in options"
      :key="opt.value"
      :class="
        unstyled
          ? ''
          : [
              'sg-radio',
              current === opt.value ? 'sg-radio-checked' : '',
              opt.disabled || disabled || loading ? 'sg-radio-disabled' : '',
            ]
              .filter(Boolean)
              .join(' ')
      "
    >
      <input
        type="radio"
        role="radio"
        :class="unstyled ? '' : 'sg-radio-input'"
        :aria-checked="current === opt.value"
        :checked="current === opt.value"
        :disabled="opt.disabled || disabled || loading"
        @change="select(opt)"
      />
      <span v-if="!unstyled" class="sg-radio-box" aria-hidden="true" />
      <span :class="unstyled ? '' : 'sg-radio-label'">{{ opt.label }}</span>
      <span
        v-if="loading && current === opt.value && !unstyled"
        class="sg-spin sg-spin-small"
        aria-hidden="true"
      />
    </label>
  </div>
</template>
