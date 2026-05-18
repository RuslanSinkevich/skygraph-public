<script setup lang="ts">
import { computed, ref, watch } from 'vue'

export interface SwitchProps {
  /** v-model binding (Vue idiom). */
  modelValue?: boolean
  /** Compat alias for the on state. */
  checked?: boolean
  /** Initial on state when uncontrolled. */
  defaultChecked?: boolean
  /** Disables interaction. */
  disabled?: boolean
  /** Shows a loading spinner and disables interaction. */
  loading?: boolean
  /** Size token. */
  size?: 'small' | 'middle' | 'large'
  /** Strips built-in styling. */
  unstyled?: boolean
}

const props = withDefaults(defineProps<SwitchProps>(), {
  disabled: false,
  loading: false,
  size: 'middle',
})

const emit = defineEmits<{
  (e: 'update:modelValue', checked: boolean): void
  (e: 'change', checked: boolean): void
}>()

defineSlots<{
  checkedChildren(props: Record<string, never>): unknown
  unCheckedChildren(props: Record<string, never>): unknown
}>()

const internal = ref<boolean>(props.modelValue ?? props.checked ?? props.defaultChecked ?? false)

watch(
  () => props.modelValue ?? props.checked,
  (v) => {
    if (v !== undefined) internal.value = v
  },
)

const isChecked = computed(() => props.modelValue ?? props.checked ?? internal.value)

function handleClick() {
  if (props.disabled || props.loading) return
  const next = !isChecked.value
  internal.value = next
  emit('update:modelValue', next)
  emit('change', next)
}

const switchSizeClass = computed(() => (props.size === 'small' ? 'small' : 'default'))
const classes = computed(() =>
  [
    'sg-switch',
    `sg-switch-${switchSizeClass.value}`,
    isChecked.value ? 'sg-switch-checked' : '',
    props.disabled || props.loading ? 'sg-switch-disabled' : '',
    props.loading ? 'sg-switch-loading' : '',
  ]
    .filter(Boolean)
    .join(' '),
)
</script>

<template>
  <button
    role="switch"
    :aria-checked="isChecked"
    :disabled="disabled || loading"
    :class="unstyled ? '' : classes"
    type="button"
    @click="handleClick"
  >
    <template v-if="unstyled">
      <span v-if="loading" class="sg-spin sg-spin-small" aria-hidden="true" />
      <template v-else>
        <slot v-if="isChecked" name="checkedChildren" />
        <slot v-else name="unCheckedChildren" />
      </template>
    </template>
    <template v-else>
      <span class="sg-switch-inner">
        <span v-if="loading && !unstyled" class="sg-spin sg-spin-small" aria-hidden="true" />
        <template v-else>
          <slot v-if="isChecked" name="checkedChildren" />
          <slot v-else name="unCheckedChildren" />
        </template>
      </span>
      <span class="sg-switch-handle" />
    </template>
  </button>
</template>
