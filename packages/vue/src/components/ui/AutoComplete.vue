<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

export interface AutoCompleteOption {
  /** Optional display text — falls back to `value`. */
  label?: string
  /** Stored value emitted on select. */
  value: string
}

export interface AutoCompleteProps {
  /** v-model binding (Vue idiom). */
  modelValue?: string
  /** Compat alias for `modelValue`. */
  value?: string
  /** Initial value when uncontrolled. */
  defaultValue?: string
  /** Suggestion list; filtered by label against current input. */
  options: AutoCompleteOption[]
  /** Input placeholder text. */
  placeholder?: string
  /** Disables editing. */
  disabled?: boolean
  /** Shows a loading spinner and disables interaction. */
  loading?: boolean
  /** Size token. */
  size?: 'small' | 'middle' | 'large'
  /** Strips built-in styling. */
  unstyled?: boolean
}

const props = withDefaults(defineProps<AutoCompleteProps>(), {
  disabled: false,
  loading: false,
  size: 'middle',
})

const isDisabled = computed(() => props.disabled || props.loading)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
  (e: 'search', value: string): void
  (e: 'select', value: string, option: AutoCompleteOption): void
  (e: 'blur'): void
}>()

const internal = ref<string>(props.modelValue ?? props.value ?? props.defaultValue ?? '')
watch(
  () => props.modelValue ?? props.value,
  (v) => {
    if (v !== undefined) internal.value = v
  },
)

const current = computed(() => props.modelValue ?? props.value ?? internal.value)
const open = ref(false)
const wrapperRef = ref<HTMLDivElement | null>(null)

const filtered = computed(() =>
  props.options.filter((o) =>
    (o.label ?? o.value).toLowerCase().includes((current.value ?? '').toLowerCase()),
  ),
)

function handleInput(e: Event) {
  const v = (e.target as HTMLInputElement).value
  internal.value = v
  emit('update:modelValue', v)
  emit('change', v)
  emit('search', v)
  open.value = true
}

function handleSelect(opt: AutoCompleteOption) {
  internal.value = opt.value
  emit('update:modelValue', opt.value)
  emit('change', opt.value)
  emit('select', opt.value, opt)
  open.value = false
}

function handleOutside(e: MouseEvent) {
  if (wrapperRef.value && !wrapperRef.value.contains(e.target as Node)) {
    open.value = false
  }
}

onMounted(() => document.addEventListener('mousedown', handleOutside))
onBeforeUnmount(() => document.removeEventListener('mousedown', handleOutside))

const wrapperClass = computed(() =>
  props.unstyled
    ? ''
    : [
        'sg-autocomplete',
        `sg-autocomplete-${props.size}`,
        props.loading ? 'sg-autocomplete-loading' : '',
      ]
        .filter(Boolean)
        .join(' '),
)
</script>

<template>
  <div ref="wrapperRef" :class="wrapperClass">
    <span :class="unstyled ? '' : 'sg-input-wrapper'">
      <input
        type="text"
        role="combobox"
        aria-autocomplete="list"
        :aria-expanded="open && filtered.length > 0"
        :class="unstyled ? '' : `sg-input sg-input-${size}`"
        :value="current"
        :placeholder="placeholder"
        :disabled="isDisabled"
        @input="handleInput"
        @focus="open = true"
        @blur="emit('blur')"
      />
      <span v-if="loading && !unstyled" class="sg-spin sg-spin-small" aria-hidden="true" />
    </span>
    <div v-if="open && filtered.length > 0" :class="unstyled ? '' : 'sg-autocomplete-dropdown'">
      <div
        v-for="opt in filtered"
        :key="opt.value"
        :class="unstyled ? '' : 'sg-autocomplete-option'"
        @mousedown="handleSelect(opt)"
      >
        {{ opt.label ?? opt.value }}
      </div>
    </div>
  </div>
</template>
