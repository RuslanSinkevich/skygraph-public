<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

export interface TimePickerProps {
  /** v-model binding (Vue idiom). */
  modelValue?: string
  /** Compat alias for `modelValue`. */
  value?: string
  /** Initial value when uncontrolled. */
  defaultValue?: string
  /** Placeholder text. */
  placeholder?: string
  /** Display format. */
  format?: string
  /** Use 12-hour clock with AM/PM column. */
  use12Hours?: boolean
  /** Step between hour values. */
  hourStep?: number
  /** Step between minute values. */
  minuteStep?: number
  /** Step between second values. */
  secondStep?: number
  /** Show seconds column. */
  showSecond?: boolean
  /** Show "Now" button. */
  showNow?: boolean
  /** Show clear control. */
  allowClear?: boolean
  /** Controlled visibility of the dropdown. */
  open?: boolean
  /** Disables interaction. */
  disabled?: boolean
  /** Shows a loading spinner and disables interaction. */
  loading?: boolean
  /** Size token. */
  size?: 'small' | 'middle' | 'large'
  /** Strips built-in styling. */
  unstyled?: boolean
  /** Hour values to disable in the hour column. */
  disabledHours?: () => number[]
  /** Minute values to disable for the currently picked hour. */
  disabledMinutes?: (hour: number) => number[]
  /** Second values to disable for the currently picked hour + minute. */
  disabledSeconds?: (hour: number, minute: number) => number[]
}

const props = withDefaults(defineProps<TimePickerProps>(), {
  placeholder: 'Select time',
  use12Hours: false,
  hourStep: 1,
  minuteStep: 1,
  secondStep: 1,
  showSecond: true,
  showNow: true,
  allowClear: true,
  size: 'middle',
  disabled: false,
  loading: false,
  open: undefined,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
  (e: 'openChange', open: boolean): void
}>()

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function formatTime(h: number, m: number, s: number, fmt: string, use12: boolean): string {
  if (use12) {
    const period = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return fmt
      .replace('hh', pad(h12))
      .replace('mm', pad(m))
      .replace('ss', pad(s))
      .replace('A', period)
  }
  return fmt.replace('HH', pad(h)).replace('mm', pad(m)).replace('ss', pad(s))
}

function parseTime(str: string): { h: number; m: number; s: number } | null {
  if (!str) return null
  const upper = str.toUpperCase()
  const isPM = upper.includes('PM')
  const cleaned = upper.replace(/(AM|PM)/g, '').trim()
  const parts = cleaned.split(':').map(Number)
  if (parts.some(isNaN)) return null
  let h = parts[0] ?? 0
  const m = parts[1] ?? 0
  const s = parts[2] ?? 0
  if (isPM && h < 12) h += 12
  if (!isPM && upper.includes('AM') && h === 12) h = 0
  return { h, m, s }
}

const fmt = computed(
  () => props.format ?? (props.use12Hours ? 'hh:mm:ss A' : props.showSecond ? 'HH:mm:ss' : 'HH:mm'),
)
const internal = ref<string>(props.modelValue ?? props.value ?? props.defaultValue ?? '')
watch(
  () => props.modelValue ?? props.value,
  (v) => {
    if (v !== undefined) internal.value = v
  },
)
const current = computed(() => props.modelValue ?? props.value ?? internal.value)

const internalOpen = ref(false)
const isOpen = computed(() => props.open ?? internalOpen.value)

const parsed = computed(() => parseTime(current.value))
const hour = ref(parsed.value?.h ?? 0)
const minute = ref(parsed.value?.m ?? 0)
const second = ref(parsed.value?.s ?? 0)

watch(current, (v) => {
  const p = parseTime(v)
  if (p) {
    hour.value = p.h
    minute.value = p.m
    second.value = p.s
  }
})

const wrapperRef = ref<HTMLDivElement | null>(null)
const hourColRef = ref<HTMLDivElement | null>(null)
const minuteColRef = ref<HTMLDivElement | null>(null)
const secondColRef = ref<HTMLDivElement | null>(null)

const hours = computed(() => {
  const arr: number[] = []
  if (props.use12Hours) {
    for (let i = 1; i <= 12; i += props.hourStep) arr.push(i)
  } else {
    for (let i = 0; i < 24; i += props.hourStep) arr.push(i)
  }
  return arr
})
const minutes = computed(() => {
  const arr: number[] = []
  for (let i = 0; i < 60; i += props.minuteStep) arr.push(i)
  return arr
})
const seconds = computed(() => {
  const arr: number[] = []
  for (let i = 0; i < 60; i += props.secondStep) arr.push(i)
  return arr
})

const disabledHourSet = computed(() => new Set(props.disabledHours?.() ?? []))
const disabledMinuteSet = computed(() => new Set(props.disabledMinutes?.(hour.value) ?? []))
const disabledSecondSet = computed(
  () => new Set(props.disabledSeconds?.(hour.value, minute.value) ?? []),
)

const displayHour = computed(() => (props.use12Hours ? hour.value % 12 || 12 : hour.value))

function setOpen(v: boolean) {
  internalOpen.value = v
  emit('openChange', v)
}

function commit(h: number, m: number, s: number) {
  const str = formatTime(h, m, s, fmt.value, props.use12Hours)
  internal.value = str
  emit('update:modelValue', str)
  emit('change', str)
}

function setH(h: number) {
  if (disabledHourSet.value.has(props.use12Hours ? h : h)) return
  const real = props.use12Hours
    ? h === 12
      ? hour.value >= 12
        ? 12
        : 0
      : hour.value >= 12
        ? h + 12
        : h
    : h
  hour.value = real
  commit(real, minute.value, second.value)
}
function setM(m: number) {
  if (disabledMinuteSet.value.has(m)) return
  minute.value = m
  commit(hour.value, m, second.value)
}
function setS(s: number) {
  if (disabledSecondSet.value.has(s)) return
  second.value = s
  commit(hour.value, minute.value, s)
}

function handleNow() {
  const now = new Date()
  hour.value = now.getHours()
  minute.value = now.getMinutes()
  second.value = now.getSeconds()
  commit(hour.value, minute.value, second.value)
  setOpen(false)
}

function handleClear(e: MouseEvent) {
  e.stopPropagation()
  internal.value = ''
  emit('update:modelValue', '')
  emit('change', '')
}

function openDropdown() {
  if (props.disabled || props.loading) return
  setOpen(true)
}

function handleOutside(e: MouseEvent) {
  if (!isOpen.value) return
  if (wrapperRef.value && !wrapperRef.value.contains(e.target as Node)) {
    setOpen(false)
  }
}

function handleEscape(e: KeyboardEvent) {
  if (!isOpen.value) return
  if (e.key === 'Escape') setOpen(false)
}

onMounted(() => {
  document.addEventListener('mousedown', handleOutside)
  document.addEventListener('keydown', handleEscape)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleOutside)
  document.removeEventListener('keydown', handleEscape)
})

function scrollActive(col: HTMLElement | null) {
  if (!col) return
  const active = col.querySelector('[data-active="true"]') as HTMLElement | null
  active?.scrollIntoView?.({ block: 'nearest' })
}

watch([isOpen, hour, minute, second], async () => {
  if (!isOpen.value) return
  await nextTick()
  scrollActive(hourColRef.value)
  scrollActive(minuteColRef.value)
  scrollActive(secondColRef.value)
})

const wrapperCls = computed(() =>
  props.unstyled
    ? ''
    : [
        'sg-timepicker',
        `sg-timepicker-${props.size}`,
        isOpen.value ? 'sg-timepicker-open' : '',
        props.disabled || props.loading ? 'sg-timepicker-disabled' : '',
        props.loading ? 'sg-timepicker-loading' : '',
      ]
        .filter(Boolean)
        .join(' '),
)

function setAm() {
  if (hour.value >= 12) {
    const h = hour.value - 12
    hour.value = h
    commit(h, minute.value, second.value)
  }
}
function setPm() {
  if (hour.value < 12) {
    const h = hour.value + 12
    hour.value = h
    commit(h, minute.value, second.value)
  }
}
</script>

<template>
  <div ref="wrapperRef" :class="wrapperCls">
    <div
      class="sg-timepicker-input"
      role="combobox"
      aria-haspopup="dialog"
      :aria-expanded="isOpen"
      :aria-disabled="disabled"
      @click="openDropdown"
    >
      <span :class="current ? '' : 'sg-timepicker-placeholder'">{{ current || placeholder }}</span>
      <span class="sg-timepicker-suffix">
        <span v-if="loading && !unstyled" class="sg-spin sg-spin-small" aria-hidden="true" />
        <template v-else>
          <span
            v-if="allowClear && current"
            class="sg-timepicker-clear"
            role="button"
            aria-label="Clear"
            @click="handleClear"
            >×</span
          >
          <svg
            class="sg-timepicker-icon"
            viewBox="0 0 16 16"
            width="14"
            height="14"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm0 14.5A6.5 6.5 0 1 1 8 1.5a6.5 6.5 0 0 1 0 13zM8.5 4H7v5l4.25 2.5.75-1.23L8.5 8.25V4z"
            />
          </svg>
        </template>
      </span>
    </div>
    <div v-if="isOpen" class="sg-tp-dropdown">
      <div class="sg-tp-columns">
        <div ref="hourColRef" class="sg-tp-col">
          <div
            v-for="n in hours"
            :key="n"
            :data-active="n === displayHour"
            :data-disabled="disabledHourSet.has(n)"
            :class="[
              'sg-tp-cell',
              n === displayHour ? 'sg-tp-cell-active' : '',
              disabledHourSet.has(n) ? 'sg-tp-cell-disabled' : '',
            ]"
            :aria-disabled="disabledHourSet.has(n)"
            @click="setH(n)"
          >
            {{ pad(n) }}
          </div>
        </div>
        <div ref="minuteColRef" class="sg-tp-col">
          <div
            v-for="n in minutes"
            :key="n"
            :data-active="n === minute"
            :data-disabled="disabledMinuteSet.has(n)"
            :class="[
              'sg-tp-cell',
              n === minute ? 'sg-tp-cell-active' : '',
              disabledMinuteSet.has(n) ? 'sg-tp-cell-disabled' : '',
            ]"
            :aria-disabled="disabledMinuteSet.has(n)"
            @click="setM(n)"
          >
            {{ pad(n) }}
          </div>
        </div>
        <div v-if="showSecond" ref="secondColRef" class="sg-tp-col">
          <div
            v-for="n in seconds"
            :key="n"
            :data-active="n === second"
            :data-disabled="disabledSecondSet.has(n)"
            :class="[
              'sg-tp-cell',
              n === second ? 'sg-tp-cell-active' : '',
              disabledSecondSet.has(n) ? 'sg-tp-cell-disabled' : '',
            ]"
            :aria-disabled="disabledSecondSet.has(n)"
            @click="setS(n)"
          >
            {{ pad(n) }}
          </div>
        </div>
        <div v-if="use12Hours" class="sg-tp-col sg-tp-col-ampm">
          <div :class="['sg-tp-cell', hour < 12 ? 'sg-tp-cell-active' : '']" @click="setAm">AM</div>
          <div :class="['sg-tp-cell', hour >= 12 ? 'sg-tp-cell-active' : '']" @click="setPm">
            PM
          </div>
        </div>
      </div>
      <div v-if="showNow" class="sg-tp-footer">
        <button type="button" class="sg-tp-now-btn" @click="handleNow">Now</button>
      </div>
    </div>
  </div>
</template>
