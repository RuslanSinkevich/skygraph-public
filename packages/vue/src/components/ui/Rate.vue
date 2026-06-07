<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useConfig } from './ConfigProvider.vue'

export interface RateProps {
  /** v-model binding (Vue idiom). */
  modelValue?: number
  /** Compat alias for `modelValue`. */
  value?: number
  /** Initial value when uncontrolled. */
  defaultValue?: number
  /** Number of rating symbols. */
  count?: number
  /** Allows half steps. */
  allowHalf?: boolean
  /** Custom character (defaults to ★). Prefer the `character` slot for nodes. */
  character?: string
  /** Disables interaction. */
  disabled?: boolean
  /** Strips built-in styling. */
  unstyled?: boolean
}

const props = withDefaults(defineProps<RateProps>(), {
  defaultValue: 0,
  count: 5,
  allowHalf: false,
  character: '★',
  disabled: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void
  (e: 'change', value: number): void
}>()

const cfg = useConfig()
const rateLocale = computed(() => cfg.value.locale?.rate)
const ariaLabel = computed(() => rateLocale.value?.ariaLabel ?? 'Rating')
const starLabel = (n: number) => {
  const fn = rateLocale.value?.star
  if (typeof fn === 'function') return fn(n)
  return `${n} star${n > 1 ? 's' : ''}`
}

const internal = ref<number>(props.modelValue ?? props.value ?? props.defaultValue)
const hoverValue = ref<number | null>(null)

watch(
  () => props.modelValue ?? props.value,
  (v) => {
    if (v !== undefined) internal.value = v
  },
)

const current = computed(() => props.modelValue ?? props.value ?? internal.value)
const display = computed(() => hoverValue.value ?? current.value)

function emitValue(v: number) {
  internal.value = v
  emit('update:modelValue', v)
  emit('change', v)
}

function clickStar(starIndex: number, e: MouseEvent) {
  if (props.disabled) return
  if (!props.allowHalf) {
    emitValue(current.value === starIndex ? 0 : starIndex)
    return
  }
  const target = e.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const isLeftHalf = e.clientX - rect.left < rect.width / 2
  const v = isLeftHalf ? starIndex - 0.5 : starIndex
  emitValue(current.value === v ? 0 : v)
}

function hoverStar(starIndex: number, e: MouseEvent) {
  if (props.disabled) return
  if (!props.allowHalf) {
    hoverValue.value = starIndex
    return
  }
  const target = e.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const isLeftHalf = e.clientX - rect.left < rect.width / 2
  hoverValue.value = isLeftHalf ? starIndex - 0.5 : starIndex
}

function onKey(_starIndex: number, e: KeyboardEvent) {
  if (props.disabled) return
  if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
    e.preventDefault()
    emitValue(Math.min(props.count, props.allowHalf ? current.value + 0.5 : current.value + 1))
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
    e.preventDefault()
    emitValue(Math.max(0, props.allowHalf ? current.value - 0.5 : current.value - 1))
  }
}

const wrapperClass = computed(() =>
  props.unstyled
    ? ''
    : ['sg-rate', props.disabled ? 'sg-rate-disabled' : ''].filter(Boolean).join(' '),
)

function classFor(starIndex: number) {
  const isFull = display.value >= starIndex
  const isHalf = props.allowHalf && display.value >= starIndex - 0.5 && display.value < starIndex
  return ['sg-rate-star', isFull ? 'sg-rate-star-full' : '', isHalf ? 'sg-rate-star-half' : '']
    .filter(Boolean)
    .join(' ')
}
</script>

<template>
  <div :class="wrapperClass" role="radiogroup" :aria-label="ariaLabel">
    <span
      v-for="i in count"
      :key="i"
      :class="unstyled ? '' : classFor(i)"
      role="radio"
      :aria-checked="display >= i"
      :aria-label="starLabel(i)"
      :tabindex="disabled ? -1 : 0"
      @click="(e) => clickStar(i, e)"
      @mousemove="(e) => hoverStar(i, e)"
      @mouseleave="!disabled && (hoverValue = null)"
      @keydown="(e) => onKey(i, e)"
    >
      <slot name="character" :index="i" :value="display"
        ><slot>{{ character }}</slot></slot
      >
    </span>
  </div>
</template>
