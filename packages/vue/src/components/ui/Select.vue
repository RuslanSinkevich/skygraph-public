<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount, onMounted } from 'vue'

let selectUid = 0
function genId() {
  return `sg-select-${++selectUid}`
}

export interface SelectOption {
  label: string
  value: string | number
  disabled?: boolean
  loading?: boolean
}

export interface SelectProps {
  /** v-model binding (single-mode value or array for multiple). */
  modelValue?: string | number | (string | number)[]
  /** Compat alias for `modelValue`. */
  value?: string | number | (string | number)[]
  /** Initial value when uncontrolled. */
  defaultValue?: string | number | (string | number)[]
  /** Options shown in the dropdown or native select. */
  options: SelectOption[]
  /** Text shown when nothing is selected. */
  placeholder?: string
  /** Multi-select mode. */
  multiple?: boolean
  /** Disables editing. */
  disabled?: boolean
  /** Shows a loading spinner and disables interaction. */
  loading?: boolean
  /** Size token. */
  size?: 'small' | 'middle' | 'large'
  /** Strips built-in styling (renders native <select>). */
  unstyled?: boolean
  /**
   * Accessible name for the styled trigger. Required for the styled
   * (non-`unstyled`) variant when there is no surrounding `<label htmlFor=...>`
   * — the trigger is a `<div role="combobox">` and a parent `<label>` cannot
   * associate. WCAG 4.1.2 expects a name for every interactive control.
   */
  ariaLabel?: string
  /** Id(s) of the element(s) that label this control. */
  ariaLabelledby?: string
}

const props = withDefaults(defineProps<SelectProps>(), {
  placeholder: 'Select...',
  multiple: false,
  disabled: false,
  loading: false,
  size: 'middle',
})
const listboxId = genId()
const focusedIndex = ref(-1)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number | (string | number)[]): void
  (e: 'change', value: string | number | (string | number)[]): void
  (e: 'blur'): void
}>()

const open = ref(false)
const wrapperRef = ref<HTMLDivElement | null>(null)

function getInitial(): string | number | (string | number)[] {
  if (props.modelValue !== undefined) return props.modelValue
  if (props.value !== undefined) return props.value
  if (props.defaultValue !== undefined) return props.defaultValue
  return props.multiple ? [] : ''
}

const internal = ref<string | number | (string | number)[]>(getInitial())

watch(
  () => props.modelValue ?? props.value,
  (v) => {
    if (v !== undefined) internal.value = v as typeof internal.value
  },
)

const current = computed<string | number | (string | number)[]>(
  () => props.modelValue ?? props.value ?? internal.value,
)

const currentSingle = computed(() =>
  props.multiple ? undefined : (current.value as string | number | undefined),
)
const currentMultiple = computed<(string | number)[]>(() =>
  props.multiple ? ((current.value as (string | number)[]) ?? []) : [],
)

const selectedOption = computed(() =>
  props.multiple ? undefined : props.options.find((o) => o.value === currentSingle.value),
)
const selectedOptions = computed(() =>
  props.multiple ? props.options.filter((o) => currentMultiple.value.includes(o.value)) : [],
)

function emitValue(v: typeof internal.value) {
  internal.value = v
  emit('update:modelValue', v)
  emit('change', v)
}

function handleSelect(opt: SelectOption) {
  if (opt.disabled || opt.loading) return
  if (props.multiple) {
    const exists = currentMultiple.value.includes(opt.value)
    const next = exists
      ? currentMultiple.value.filter((v) => v !== opt.value)
      : [...currentMultiple.value, opt.value]
    emitValue(next)
  } else {
    emitValue(opt.value)
    open.value = false
  }
}

function handleRemoveTag(val: string | number, e: Event) {
  e.stopPropagation()
  if (props.disabled || props.loading) return
  emitValue(currentMultiple.value.filter((v) => v !== val))
}

const isDisabled = computed(() => props.disabled || props.loading)

function isOptionSelected(opt: SelectOption) {
  return props.multiple
    ? currentMultiple.value.includes(opt.value)
    : opt.value === currentSingle.value
}

function handleOutside(e: MouseEvent) {
  if (wrapperRef.value && !wrapperRef.value.contains(e.target as Node)) {
    open.value = false
  }
}

onMounted(() => document.addEventListener('mousedown', handleOutside))
onBeforeUnmount(() => document.removeEventListener('mousedown', handleOutside))

watch(open, (next) => {
  if (!next) focusedIndex.value = -1
})

function handleKeydown(e: KeyboardEvent) {
  if (isDisabled.value) return
  switch (e.key) {
    case 'Enter':
    case ' ':
      e.preventDefault()
      if (open.value && focusedIndex.value >= 0) {
        handleSelect(props.options[focusedIndex.value])
      } else {
        open.value = !open.value
      }
      break
    case 'Escape':
      e.preventDefault()
      open.value = false
      break
    case 'ArrowDown':
      e.preventDefault()
      if (!open.value) {
        open.value = true
      } else if (props.options.length > 0) {
        focusedIndex.value = (focusedIndex.value + 1) % props.options.length
      }
      break
    case 'ArrowUp':
      e.preventDefault()
      if (!open.value) {
        open.value = true
      } else if (props.options.length > 0) {
        focusedIndex.value = (focusedIndex.value - 1 + props.options.length) % props.options.length
      }
      break
    case 'Backspace':
      if (props.multiple && currentMultiple.value.length > 0) {
        emitValue(currentMultiple.value.slice(0, -1))
      }
      break
  }
}

const wrapperClass = computed(() =>
  [
    'sg-select',
    `sg-select-${props.size}`,
    props.multiple ? 'sg-select-multiple' : '',
    open.value ? 'sg-select-open' : '',
    isDisabled.value ? 'sg-select-disabled' : '',
    props.loading ? 'sg-select-loading' : '',
  ]
    .filter(Boolean)
    .join(' '),
)

function onNativeChange(e: Event) {
  const target = e.target as HTMLSelectElement
  if (props.multiple) {
    const picked = Array.from(target.selectedOptions).map((o) => {
      const v = o.value
      const num = Number(v)
      return props.options.some((opt) => opt.value === num) ? num : v
    })
    emitValue(picked)
  } else {
    const v = target.value
    const num = Number(v)
    const final = props.options.some((o) => o.value === num) ? num : v
    emitValue(final)
  }
}
</script>

<template>
  <select
    v-if="unstyled"
    :multiple="multiple"
    :value="multiple ? (currentMultiple as unknown as string) : (currentSingle as string)"
    :disabled="isDisabled"
    :aria-label="ariaLabel"
    :aria-labelledby="ariaLabelledby"
    @change="onNativeChange"
    @blur="emit('blur')"
  >
    <option v-if="!multiple && !selectedOption" value="">{{ placeholder }}</option>
    <option v-for="opt in options" :key="opt.value" :value="opt.value" :disabled="opt.disabled">
      {{ opt.label }}
    </option>
  </select>
  <div v-else ref="wrapperRef" :class="wrapperClass" @blur="emit('blur')">
    <div
      class="sg-select-selector"
      role="combobox"
      :aria-expanded="open"
      aria-haspopup="listbox"
      :aria-controls="listboxId"
      :aria-multiselectable="multiple || undefined"
      :aria-disabled="isDisabled || undefined"
      :aria-label="ariaLabel"
      :aria-labelledby="ariaLabelledby"
      :tabindex="isDisabled ? -1 : 0"
      @click="!isDisabled && (open = !open)"
      @keydown="handleKeydown"
    >
      <template v-if="multiple">
        <span v-if="selectedOptions.length === 0" class="sg-select-placeholder">{{
          placeholder
        }}</span>
        <span v-else class="sg-select-tags">
          <span v-for="opt in selectedOptions" :key="opt.value" class="sg-select-tag">
            <span class="sg-select-tag-label">{{ opt.label }}</span>
            <button
              type="button"
              class="sg-select-tag-remove"
              :aria-label="`Remove ${opt.label}`"
              tabindex="-1"
              @click="(e) => handleRemoveTag(opt.value, e)"
            >
              ×
            </button>
          </span>
        </span>
      </template>
      <template v-else>
        <span :class="selectedOption ? 'sg-select-selection-item' : 'sg-select-placeholder'">
          {{ selectedOption?.label ?? placeholder }}
        </span>
      </template>
      <span v-if="loading && !unstyled" class="sg-spin sg-spin-small" aria-hidden="true" />
      <span v-else class="sg-select-arrow">{{ open ? '▲' : '▼' }}</span>
    </div>
    <div
      v-if="open"
      :id="listboxId"
      class="sg-select-dropdown"
      role="listbox"
      :aria-multiselectable="multiple || undefined"
    >
      <div
        v-for="(opt, idx) in options"
        :key="opt.value"
        role="option"
        :aria-selected="isOptionSelected(opt)"
        :class="[
          'sg-select-option',
          isOptionSelected(opt) ? 'sg-select-option-selected' : '',
          idx === focusedIndex ? 'sg-select-option-focused' : '',
          opt.disabled || opt.loading ? 'sg-select-option-disabled' : '',
          opt.loading ? 'sg-select-option-loading' : '',
        ]"
        @click="handleSelect(opt)"
      >
        <span>{{ opt.label }}</span>
        <span v-if="opt.loading && !unstyled" class="sg-spin sg-spin-small" aria-hidden="true" />
      </div>
    </div>
  </div>
</template>
