<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useConfig, useConfigWithDefaults } from './ConfigProvider.vue'
import SgTimePicker from './TimePicker.vue'

export interface TimeRangePickerProps {
  /** v-model binding (Vue idiom). */
  modelValue?: [string, string]
  /** Compat alias for `modelValue`. */
  value?: [string, string]
  /** Initial value when uncontrolled. */
  defaultValue?: [string, string]
  /** Placeholders for start and end inputs. */
  placeholder?: [string, string]
  /** Shared display format. */
  format?: string
  /** Both panels use a 12-hour clock when true. */
  use12Hours?: boolean
  /** Shared hour step. */
  hourStep?: number
  /** Shared minute step. */
  minuteStep?: number
  /** Shared second step. */
  secondStep?: number
  /** Show seconds in both panels. */
  showSecond?: boolean
  /** Show clear control when at least one value is set. */
  allowClear?: boolean
  /** Separator string between the two displayed values. */
  separator?: string
  /** Controlled visibility of the range dropdown. */
  open?: boolean
  /** Disables interaction. */
  disabled?: boolean
  /** Shows a loading spinner and disables interaction. */
  loading?: boolean
  /** Size token. */
  size?: 'small' | 'middle' | 'large'
  /** Strips built-in styling. */
  unstyled?: boolean
}

const props = withDefaults(defineProps<TimeRangePickerProps>(), {
  placeholder: () => ['Start', 'End'] as [string, string],
  use12Hours: false,
  hourStep: 1,
  minuteStep: 1,
  secondStep: 1,
  showSecond: true,
  allowClear: true,
  separator: '→',
  size: 'middle',
  disabled: undefined,
  loading: false,
  open: undefined,
})

const { resolvedDisabled } = useConfigWithDefaults({ disabled: props.disabled }, {})

const cfg = useConfig()
const clearLabel = computed(() => cfg.value.locale?.input?.clear ?? 'Clear')

const emit = defineEmits<{
  (e: 'update:modelValue', value: [string, string]): void
  (e: 'change', value: [string, string]): void
  (e: 'openChange', open: boolean): void
}>()

const fmt = computed(
  () => props.format ?? (props.use12Hours ? 'hh:mm:ss A' : props.showSecond ? 'HH:mm:ss' : 'HH:mm'),
)

const internal = ref<[string, string]>(
  (props.modelValue ?? props.value ?? props.defaultValue ?? ['', '']) as [string, string],
)
watch(
  () => props.modelValue ?? props.value,
  (v) => {
    if (v !== undefined) internal.value = [...v] as [string, string]
  },
)
const current = computed<[string, string]>(
  () => (props.modelValue ?? props.value ?? internal.value) as [string, string],
)

const internalOpen = ref(false)
const isOpen = computed(() => props.open ?? internalOpen.value)
const wrapperRef = ref<HTMLDivElement | null>(null)

function setOpen(v: boolean) {
  internalOpen.value = v
  emit('openChange', v)
}

function emitNext(next: [string, string]) {
  internal.value = next
  emit('update:modelValue', next)
  emit('change', next)
}

function handleStart(v: string) {
  emitNext([v, current.value[1]])
}
function handleEnd(v: string) {
  emitNext([current.value[0], v])
}
function handleClear(e: MouseEvent) {
  e.stopPropagation()
  emitNext(['', ''])
}

function openDropdown() {
  if (resolvedDisabled.value || props.loading) return
  setOpen(true)
}

function handleOutside(e: MouseEvent) {
  if (!isOpen.value) return
  if (wrapperRef.value && !wrapperRef.value.contains(e.target as Node)) setOpen(false)
}
function handleEscape(e: KeyboardEvent) {
  if (isOpen.value && e.key === 'Escape') setOpen(false)
}

onMounted(() => {
  document.addEventListener('mousedown', handleOutside)
  document.addEventListener('keydown', handleEscape)
})
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleOutside)
  document.removeEventListener('keydown', handleEscape)
})

const wrapperCls = computed(() =>
  props.unstyled
    ? ''
    : [
        'sg-timepicker',
        'sg-timepicker-range',
        `sg-timepicker-${props.size}`,
        isOpen.value ? 'sg-timepicker-open' : '',
        resolvedDisabled.value || props.loading ? 'sg-timepicker-disabled' : '',
        props.loading ? 'sg-timepicker-loading' : '',
      ]
        .filter(Boolean)
        .join(' '),
)
</script>

<template>
  <div ref="wrapperRef" :class="wrapperCls">
    <div
      :class="unstyled ? '' : 'sg-timepicker-input sg-timepicker-range-input'"
      role="combobox"
      aria-haspopup="dialog"
      :aria-expanded="isOpen"
      :aria-disabled="resolvedDisabled"
      @click="openDropdown"
    >
      <span :class="current[0] ? '' : 'sg-timepicker-placeholder'">
        {{ current[0] || placeholder[0] }}
      </span>
      <span :class="unstyled ? '' : 'sg-timepicker-separator'">{{ separator }}</span>
      <span :class="current[1] ? '' : 'sg-timepicker-placeholder'">
        {{ current[1] || placeholder[1] }}
      </span>
      <span :class="unstyled ? '' : 'sg-timepicker-suffix'">
        <span
          v-if="allowClear && (current[0] || current[1])"
          :class="unstyled ? '' : 'sg-timepicker-clear'"
          role="button"
          :aria-label="clearLabel"
          @click="handleClear"
          >×</span
        >
      </span>
    </div>
    <div v-if="isOpen" :class="unstyled ? '' : 'sg-tp-dropdown sg-tp-dropdown-range'">
      <div :class="unstyled ? '' : 'sg-tp-range-panels'">
        <SgTimePicker
          :value="current[0]"
          :format="fmt"
          :use12-hours="use12Hours"
          :hour-step="hourStep"
          :minute-step="minuteStep"
          :second-step="secondStep"
          :show-second="showSecond"
          :show-now="false"
          :open="true"
          :unstyled="unstyled"
          @change="handleStart"
        />
        <SgTimePicker
          :value="current[1]"
          :format="fmt"
          :use12-hours="use12Hours"
          :hour-step="hourStep"
          :minute-step="minuteStep"
          :second-step="secondStep"
          :show-second="showSecond"
          :show-now="false"
          :open="true"
          :unstyled="unstyled"
          @change="handleEnd"
        />
      </div>
    </div>
  </div>
</template>
