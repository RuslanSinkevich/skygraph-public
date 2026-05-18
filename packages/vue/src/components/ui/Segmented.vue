<script setup lang="ts">
import { computed, ref, useSlots, watch, type PropType } from 'vue'
import { useConfigWithDefaults } from './ConfigProvider.vue'
import type { SizeType } from '../../types'

export interface SegmentedOptionObject {
  label: string
  value: string
  /** Optional icon glyph (emoji / short text). Use the named `icon` slot for richer content. */
  icon?: string
  disabled?: boolean
}

export type SegmentedOption = string | SegmentedOptionObject

export interface SegmentedProps {
  options: SegmentedOption[]
  /** Controlled selected value. */
  value?: string
  /** v-model binding (Vue idiom) — alias for `value`. */
  modelValue?: string
  /** Initial value when uncontrolled. */
  defaultValue?: string
  /** Component size variant. */
  size?: SizeType
  /** Disables the control. */
  disabled?: boolean
  /** Stretches the control to full width. */
  block?: boolean
  /** Strips built-in styles when true. */
  unstyled?: boolean
}

const props = defineProps({
  options: {
    type: Array as PropType<SegmentedOption[]>,
    required: true,
  },
  value: { type: String, default: undefined },
  modelValue: { type: String, default: undefined },
  defaultValue: { type: String, default: undefined },
  size: { type: String as PropType<SizeType>, default: undefined },
  disabled: { type: Boolean, default: undefined },
  block: { type: Boolean, default: false },
  unstyled: { type: Boolean, default: false },
})

const emit = defineEmits<{
  (e: 'change', value: string): void
  (e: 'update:value', value: string): void
  (e: 'update:modelValue', value: string): void
}>()

defineSlots<{
  icon(props: { option: SegmentedOptionObject; index: number }): unknown
}>()

const slots = useSlots()
const hasIconSlot = computed(() => !!slots.icon)

const { resolvedSize, resolvedDisabled } = useConfigWithDefaults(
  { size: undefined, disabled: undefined },
  {},
)
const realSize = computed<SizeType>(() => props.size ?? resolvedSize.value)
const realDisabled = computed(() => props.disabled ?? resolvedDisabled.value)

function normalize(opt: SegmentedOption): SegmentedOptionObject {
  if (typeof opt === 'string') return { label: opt, value: opt }
  return opt
}

const normalized = computed(() => props.options.map(normalize))

const initial =
  props.value ?? props.modelValue ?? props.defaultValue ?? normalize(props.options[0])?.value ?? ''
const internal = ref<string>(initial)
watch(
  () => props.value ?? props.modelValue,
  (v) => {
    if (v !== undefined) internal.value = v
  },
)
const currentValue = computed(() => props.value ?? props.modelValue ?? internal.value)

function select(val: string, disabled?: boolean) {
  if (realDisabled.value || disabled) return
  internal.value = val
  emit('change', val)
  emit('update:value', val)
  emit('update:modelValue', val)
}

const rootClasses = computed(() =>
  [
    'sg-segmented',
    `sg-segmented-${realSize.value}`,
    props.block ? 'sg-segmented-block' : '',
    realDisabled.value ? 'sg-segmented-disabled' : '',
  ]
    .filter(Boolean)
    .join(' '),
)
</script>

<template>
  <div v-if="unstyled" role="radiogroup">
    <label v-for="(opt, i) in normalized" :key="opt.value">
      <input
        type="radio"
        name="sg-segmented"
        :value="opt.value"
        :checked="opt.value === currentValue"
        :disabled="realDisabled || opt.disabled"
        @change="select(opt.value, opt.disabled)"
      />
      <slot v-if="hasIconSlot || opt.icon" name="icon" :option="opt" :index="i">{{
        opt.icon
      }}</slot>
      {{ opt.label }}
    </label>
  </div>
  <div v-else :class="rootClasses" role="radiogroup">
    <div
      v-for="(opt, i) in normalized"
      :key="opt.value"
      role="radio"
      :aria-checked="opt.value === currentValue"
      :class="[
        'sg-segmented-item',
        opt.value === currentValue ? 'sg-segmented-item-selected' : '',
        opt.disabled ? 'sg-segmented-item-disabled' : '',
      ]"
      @click="select(opt.value, opt.disabled)"
    >
      <span v-if="hasIconSlot || opt.icon" class="sg-segmented-item-icon">
        <slot name="icon" :option="opt" :index="i">{{ opt.icon }}</slot>
      </span>
      <span class="sg-segmented-item-label">{{ opt.label }}</span>
    </div>
  </div>
</template>
