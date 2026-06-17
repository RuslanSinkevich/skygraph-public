<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useConfigWithDefaults } from './ConfigProvider.vue'

export interface SliderProps {
  /** v-model binding (Vue idiom). */
  modelValue?: number
  /** Compat alias for `modelValue`. */
  value?: number
  /** Initial value when uncontrolled. */
  defaultValue?: number
  /** Minimum selectable value. */
  min?: number
  /** Maximum selectable value. */
  max?: number
  /** Increment between valid values. */
  step?: number
  /** Disables interaction. */
  disabled?: boolean
  /** Strips built-in styling. */
  unstyled?: boolean
}

const props = withDefaults(defineProps<SliderProps>(), {
  defaultValue: 0,
  min: 0,
  max: 100,
  step: 1,
  disabled: undefined,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void
  (e: 'change', value: number): void
}>()

const { resolvedDisabled } = useConfigWithDefaults({ disabled: props.disabled }, {})

const internal = ref<number>(props.modelValue ?? props.value ?? props.defaultValue ?? 0)

watch(
  () => props.modelValue ?? props.value,
  (v) => {
    if (v !== undefined) internal.value = v
  },
)

const current = computed(() => props.modelValue ?? props.value ?? internal.value)

const trackRef = ref<HTMLDivElement | null>(null)
const percent = computed(() => ((current.value - props.min) / (props.max - props.min)) * 100)

function emitValue(v: number) {
  internal.value = v
  emit('update:modelValue', v)
  emit('change', v)
}

function updateFromPosition(clientX: number) {
  if (!trackRef.value || resolvedDisabled.value) return
  const rect = trackRef.value.getBoundingClientRect()
  const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  const raw = props.min + ratio * (props.max - props.min)
  const stepped = Math.round(raw / props.step) * props.step
  emitValue(Math.max(props.min, Math.min(props.max, stepped)))
}

function onMouseDown(e: MouseEvent) {
  if (resolvedDisabled.value) return
  updateFromPosition(e.clientX)
  const move = (ev: MouseEvent) => updateFromPosition(ev.clientX)
  const up = () => {
    document.removeEventListener('mousemove', move)
    document.removeEventListener('mouseup', up)
  }
  document.addEventListener('mousemove', move)
  document.addEventListener('mouseup', up)
}

function onKeyDown(e: KeyboardEvent) {
  if (resolvedDisabled.value) return
  if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
    e.preventDefault()
    emitValue(Math.min(props.max, current.value + props.step))
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
    e.preventDefault()
    emitValue(Math.max(props.min, current.value - props.step))
  }
}

const wrapperClass = computed(() =>
  props.unstyled
    ? ''
    : ['sg-slider', resolvedDisabled.value ? 'sg-slider-disabled' : ''].filter(Boolean).join(' '),
)
</script>

<template>
  <div :class="wrapperClass">
    <div ref="trackRef" :class="unstyled ? '' : 'sg-slider-track'" @mousedown="onMouseDown">
      <div :class="unstyled ? '' : 'sg-slider-fill'" :style="{ width: `${percent}%` }" />
      <div
        :class="unstyled ? '' : 'sg-slider-handle'"
        :style="{ left: `${percent}%` }"
        role="slider"
        :aria-valuemin="min"
        :aria-valuemax="max"
        :aria-valuenow="current"
        :aria-disabled="resolvedDisabled"
        :tabindex="resolvedDisabled ? -1 : 0"
        @keydown="onKeyDown"
      />
    </div>
  </div>
</template>
