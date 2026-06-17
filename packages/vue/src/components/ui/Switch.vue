<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useConfigWithDefaults } from './ConfigProvider.vue'

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

// `modelValue` / `checked` / `defaultChecked` are tri-state: their absence
// must read as `undefined`, not `false`. Without explicit `undefined`
// defaults Vue's Boolean-prop casting coerces an absent boolean prop to
// `false`, which poisons the `modelValue ?? checked ?? internal` chain
// (`false ?? x === false`) and freezes uncontrolled switches in the off
// state. The explicit defaults disable that cast.
const props = withDefaults(defineProps<SwitchProps>(), {
  modelValue: undefined,
  checked: undefined,
  defaultChecked: undefined,
  disabled: undefined,
  loading: false,
  size: 'middle',
})

const emit = defineEmits<{
  (e: 'update:modelValue', checked: boolean): void
  (e: 'change', checked: boolean): void
}>()

const { resolvedDisabled } = useConfigWithDefaults(props, {})

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
  if (resolvedDisabled.value || props.loading) return
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
    resolvedDisabled.value || props.loading ? 'sg-switch-disabled' : '',
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
    :disabled="resolvedDisabled || loading"
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
