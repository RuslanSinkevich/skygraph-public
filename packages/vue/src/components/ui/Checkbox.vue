<script setup lang="ts">
import { computed, onMounted, ref, useSlots, watch } from 'vue'

export interface CheckboxProps {
  /** v-model binding (Vue idiom). */
  modelValue?: boolean
  /** Compat alias — controls the checked state. */
  checked?: boolean
  /** Initial checked state when uncontrolled. */
  defaultChecked?: boolean
  /** Renders the native checkbox in indeterminate state. */
  indeterminate?: boolean
  /** Disables interaction. */
  disabled?: boolean
  /** Shows a loading spinner and disables interaction. */
  loading?: boolean
  /** Strips built-in styling. */
  unstyled?: boolean
}

// All controlled boolean inputs default to `undefined` so the
// `props.modelValue ?? props.checked ?? props.defaultChecked` chain in
// `internal` / `current` can correctly distinguish "consumer did not bind
// this prop" from "consumer explicitly passed `false`". Without explicit
// `undefined` defaults Vue normalises optional boolean props to `false`
// at runtime and `??` collapses every variant to that fallback.
const props = withDefaults(defineProps<CheckboxProps>(), {
  modelValue: undefined,
  checked: undefined,
  defaultChecked: undefined,
  indeterminate: undefined,
  disabled: false,
  loading: false,
  unstyled: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', checked: boolean): void
  (e: 'change', checked: boolean): void
}>()

defineSlots<{
  default(props: Record<string, never>): unknown
}>()

const internal = ref<boolean>(props.modelValue ?? props.checked ?? props.defaultChecked ?? false)

watch(
  () => props.modelValue ?? props.checked,
  (v) => {
    if (v !== undefined) internal.value = v
  },
)

const current = computed(() => props.modelValue ?? props.checked ?? internal.value)

const inputRef = ref<HTMLInputElement | null>(null)

// Vue 3 compiles `:checked="current"` into an attribute mutation rather than a
// DOM property assignment, so `<input type="checkbox" checked="false">` paints
// as *checked* (any value of the attribute is truthy in HTML). Mirror the
// React reference behaviour by pushing the boolean through the DOM property
// instead. The first sync runs in `onMounted` (the ref is null during setup),
// subsequent updates piggyback on a normal watcher.
function syncCheckbox() {
  const el = inputRef.value
  if (!el) return
  const next = !!current.value
  if (el.checked !== next) el.checked = next
  el.indeterminate = props.indeterminate ?? false
}

onMounted(syncCheckbox)
watch([() => current.value, () => props.indeterminate], () => syncCheckbox(), {
  flush: 'post',
})

function onChange(e: Event) {
  const v = (e.target as HTMLInputElement).checked
  internal.value = v
  emit('update:modelValue', v)
  emit('change', v)
}

const wrapperClass = computed(() =>
  props.unstyled
    ? ''
    : [
        'sg-checkbox',
        props.disabled || props.loading ? 'sg-checkbox-disabled' : '',
        props.loading ? 'sg-checkbox-loading' : '',
      ]
        .filter(Boolean)
        .join(' '),
)

const slots = useSlots()
const hasDefaultSlot = computed(() => slots.default !== undefined)
</script>

<template>
  <label :class="wrapperClass">
    <input
      ref="inputRef"
      type="checkbox"
      :class="unstyled ? '' : 'sg-checkbox-input'"
      :aria-checked="current"
      :checked="current"
      :disabled="disabled || loading"
      @change="onChange"
    />
    <span v-if="hasDefaultSlot" :class="unstyled ? '' : 'sg-checkbox-label'">
      <slot />
    </span>
    <span v-if="loading && !unstyled" class="sg-spin sg-spin-small" aria-hidden="true" />
  </label>
</template>
