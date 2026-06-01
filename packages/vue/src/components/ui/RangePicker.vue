<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useConfig } from './ConfigProvider.vue'
import type { DatePreset, ShowTimeConfig } from './DatePicker.vue'

export type { DatePreset, ShowTimeConfig } from './DatePicker.vue'

export interface RangePickerProps {
  /** v-model binding — [start, end] tuple (Vue idiom). */
  modelValue?: [Date | null, Date | null]
  /** Compat alias for `modelValue`. */
  value?: [Date | null, Date | null]
  /** Initial range when uncontrolled. */
  defaultValue?: [Date, Date]
  /** Placeholders for the start and end inputs. */
  placeholder?: [string, string]
  /** Display format (YYYY/MM/DD/HH/mm/ss) for both ends. */
  format?: string
  /** Show time-of-day picker columns. When object, passes ShowTimeConfig. */
  showTime?: boolean | ShowTimeConfig
  /** Show clear button when a value exists. */
  allowClear?: boolean
  /** Disabled day predicate. */
  disabledDate?: (d: Date) => boolean
  /** Sidebar shortcuts (`Date | [Date, Date]`). */
  presets?: DatePreset[]
  /** Separator node between the start and end values. */
  separator?: string
  /** Corner alignment of the dropdown relative to the input. */
  placement?: 'bottomLeft' | 'bottomRight' | 'topLeft' | 'topRight'
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
}

const props = withDefaults(defineProps<RangePickerProps>(), {
  placeholder: () => ['Start date', 'End date'],
  showTime: false,
  allowClear: true,
  separator: '→',
  placement: 'bottomLeft',
  size: 'middle',
  disabled: false,
  loading: false,
  open: undefined,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: [Date | null, Date | null]): void
  (e: 'change', value: [Date | null, Date | null], dateStrings: [string, string]): void
  (e: 'openChange', open: boolean): void
}>()

const DEFAULT_MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]
const DEFAULT_DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

const config = useConfig()
const monthNames = computed(() => config.value.locale?.calendar?.monthNames ?? DEFAULT_MONTH_NAMES)
const dayNames = computed(() => config.value.locale?.calendar?.dayNames ?? DEFAULT_DAY_NAMES)
const okBtnLabel = computed(() => config.value.locale?.modal?.okText ?? 'OK')
const prevYearLabel = computed(() => config.value.locale?.datePicker?.prevYear ?? 'Previous year')
const nextYearLabel = computed(() => config.value.locale?.datePicker?.nextYear ?? 'Next year')
const prevMonthLabel = computed(
  () => config.value.locale?.datePicker?.prevMonth ?? 'Previous month',
)
const nextMonthLabel = computed(() => config.value.locale?.datePicker?.nextMonth ?? 'Next month')
const clearLabel = computed(() => config.value.locale?.input?.clear ?? 'Clear')

function pad(n: number) {
  return String(n).padStart(2, '0')
}
function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}
function isToday(d: Date) {
  return isSameDay(d, new Date())
}
function getDaysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate()
}
function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}
function cloneDate(d: Date) {
  return new Date(d.getTime())
}
function toValidDate(input: unknown): Date | null {
  if (input == null || input === '') return null
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input
  if (typeof input === 'string' || typeof input === 'number') {
    const d = new Date(input)
    return isNaN(d.getTime()) ? null : d
  }
  return null
}
function formatDate(d: Date | null, fmt: string): string {
  if (!d) return ''
  return fmt
    .replace('YYYY', String(d.getFullYear()))
    .replace('MM', pad(d.getMonth() + 1))
    .replace('DD', pad(d.getDate()))
    .replace('HH', pad(d.getHours()))
    .replace('mm', pad(d.getMinutes()))
    .replace('ss', pad(d.getSeconds()))
}

function normalizeRange(raw: [unknown, unknown] | null | undefined): [Date | null, Date | null] {
  return [toValidDate(raw?.[0]), toValidDate(raw?.[1])]
}

const hasTime = computed(() => !!props.showTime)
const timeConfig = computed<ShowTimeConfig>(() =>
  typeof props.showTime === 'object' && props.showTime !== null ? props.showTime : {},
)
const fmt = computed(() => props.format ?? (hasTime.value ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD'))

const externalValue = computed<[Date | null, Date | null] | undefined>(() => {
  const v = props.modelValue !== undefined ? props.modelValue : props.value
  return v ? normalizeRange(v) : undefined
})

const internal = ref<[Date | null, Date | null]>(
  externalValue.value ?? (props.defaultValue ? normalizeRange(props.defaultValue) : [null, null]),
)
watch(externalValue, (v) => {
  if (v) internal.value = v
})
const current = computed<[Date | null, Date | null]>(() => externalValue.value ?? internal.value)

const internalOpen = ref(false)
const isOpen = computed(() => props.open ?? internalOpen.value)
const activeIndex = ref<0 | 1>(0)
const hoverDate = ref<Date | null>(null)

const baseRef = computed(() => current.value[0] ?? new Date())
const leftYear = ref(baseRef.value.getFullYear())
const leftMonth = ref(baseRef.value.getMonth())
const rightYear = computed(() => (leftMonth.value === 11 ? leftYear.value + 1 : leftYear.value))
const rightMonth = computed(() => (leftMonth.value === 11 ? 0 : leftMonth.value + 1))

const tempTimes = ref<[Date, Date]>([
  current.value[0] ?? new Date(),
  current.value[1] ?? new Date(),
])

const wrapperRef = ref<HTMLDivElement | null>(null)

function setOpen(v: boolean) {
  internalOpen.value = v
  emit('openChange', v)
}

function commitRange(dates: [Date | null, Date | null]) {
  internal.value = dates
  emit('update:modelValue', dates)
  emit('change', dates, [
    dates[0] ? formatDate(dates[0], fmt.value) : '',
    dates[1] ? formatDate(dates[1], fmt.value) : '',
  ])
}

function openDropdown() {
  if (props.disabled || props.loading) return
  setOpen(true)
}

function handleDateSelect(date: Date) {
  if (activeIndex.value === 0) {
    internal.value = [date, null]
    activeIndex.value = 1
    return
  }

  let start = current.value[0]
  let end = date
  if (start && end.getTime() < start.getTime()) {
    ;[start, end] = [end, start]
  }
  if (hasTime.value) {
    const s = start ? cloneDate(start) : cloneDate(date)
    s.setHours(
      tempTimes.value[0].getHours(),
      tempTimes.value[0].getMinutes(),
      tempTimes.value[0].getSeconds(),
    )
    const e = cloneDate(end)
    e.setHours(
      tempTimes.value[1].getHours(),
      tempTimes.value[1].getMinutes(),
      tempTimes.value[1].getSeconds(),
    )
    internal.value = [s, e]
  } else {
    commitRange([start, end])
    setOpen(false)
    activeIndex.value = 0
  }
}

function handleTimeOk() {
  commitRange(current.value)
  setOpen(false)
  activeIndex.value = 0
}

function handleClear(e: MouseEvent) {
  e.stopPropagation()
  commitRange([null, null])
  activeIndex.value = 0
}

function handlePresetSelect(p: DatePreset) {
  if (Array.isArray(p.value)) {
    commitRange([p.value[0], p.value[1]])
  } else {
    commitRange([p.value, p.value])
  }
  setOpen(false)
}

function moveLeftMonth(delta: number) {
  const m = leftMonth.value + delta
  if (m < 0) {
    leftMonth.value = 11
    leftYear.value--
  } else if (m > 11) {
    leftMonth.value = 0
    leftYear.value++
  } else {
    leftMonth.value = m
  }
}

interface DayCell {
  date: Date
  day: number
  inMonth: boolean
}

function getMonthGrid(year: number, month: number): DayCell[][] {
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = new Date(year, month, 1).getDay()
  const prevDays = getDaysInMonth(year, month - 1)
  const cells: DayCell[] = []
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, prevDays - i), day: prevDays - i, inMonth: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), day: d, inMonth: true })
  }
  const remaining = 42 - cells.length
  for (let d = 1; d <= remaining; d++) {
    cells.push({ date: new Date(year, month + 1, d), day: d, inMonth: false })
  }
  const weeks: DayCell[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

const leftWeeks = computed(() => getMonthGrid(leftYear.value, leftMonth.value))
const rightWeeks = computed(() => getMonthGrid(rightYear.value, rightMonth.value))

function isInRange(d: Date): boolean {
  const start = current.value[0]
  if (!start) return false
  const end = current.value[1] ?? hoverDate.value
  if (!end) return false
  const s = startOfDay(start).getTime()
  const e = startOfDay(end).getTime()
  const t = startOfDay(d).getTime()
  return t > Math.min(s, e) && t < Math.max(s, e)
}

function isRangeEdge(d: Date): 'start' | 'end' | null {
  const start = current.value[0]
  if (!start) return null
  if (isSameDay(d, start)) return 'start'
  const end = current.value[1] ?? hoverDate.value
  if (end && isSameDay(d, end)) return 'end'
  return null
}

function cellClass(cell: DayCell) {
  const disabled = props.disabledDate?.(cell.date) ?? false
  const today = isToday(cell.date)
  const inRange = isInRange(cell.date)
  const edge = isRangeEdge(cell.date)
  return [
    'sg-dp-cell',
    !cell.inMonth ? 'sg-dp-cell-outside' : '',
    today ? 'sg-dp-cell-today' : '',
    disabled ? 'sg-dp-cell-disabled' : '',
    inRange ? 'sg-dp-cell-in-range' : '',
    edge === 'start' ? 'sg-dp-cell-range-start' : '',
    edge === 'end' ? 'sg-dp-cell-range-end' : '',
  ]
    .filter(Boolean)
    .join(' ')
}

const displayLeft = computed(() =>
  current.value[0] ? formatDate(current.value[0], fmt.value) : props.placeholder[0],
)
const displayRight = computed(() =>
  current.value[1] ? formatDate(current.value[1], fmt.value) : props.placeholder[1],
)

const wrapperCls = computed(() =>
  props.unstyled
    ? ''
    : [
        'sg-datepicker',
        'sg-datepicker-range',
        `sg-datepicker-${props.size}`,
        isOpen.value ? 'sg-datepicker-open' : '',
        props.disabled || props.loading ? 'sg-datepicker-disabled' : '',
        props.loading ? 'sg-datepicker-loading' : '',
      ]
        .filter(Boolean)
        .join(' '),
)
const dropdownCls = computed(
  () => `sg-dp-dropdown sg-dp-dropdown-range sg-dp-dropdown-${props.placement}`,
)

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

const hourStep = computed(() => timeConfig.value.hourStep ?? 1)
const minuteStep = computed(() => timeConfig.value.minuteStep ?? 1)
const secondStep = computed(() => timeConfig.value.secondStep ?? 1)
const showSeconds = computed(() => (timeConfig.value.format ?? 'HH:mm:ss').includes('ss'))

function timeItems(step: number, max: number) {
  const arr: number[] = []
  for (let i = 0; i < max; i += step) arr.push(i)
  return arr
}

const hourItems = computed(() => timeItems(hourStep.value, 24))
const minuteItems = computed(() => timeItems(minuteStep.value, 60))
const secondItems = computed(() => timeItems(secondStep.value, 60))

function setTime(idx: 0 | 1, fn: (d: Date) => void) {
  const next: [Date, Date] = [cloneDate(tempTimes.value[0]), cloneDate(tempTimes.value[1])]
  fn(next[idx])
  tempTimes.value = next
  if (current.value[0] && current.value[1]) {
    const merged: [Date, Date] = [cloneDate(current.value[0]), cloneDate(current.value[1])]
    merged[idx].setHours(next[idx].getHours(), next[idx].getMinutes(), next[idx].getSeconds())
    internal.value = merged
  }
}

const monthLabelLeft = computed(() => `${monthNames.value[leftMonth.value]} ${leftYear.value}`)
const monthLabelRight = computed(() => `${monthNames.value[rightMonth.value]} ${rightYear.value}`)
</script>

<template>
  <div ref="wrapperRef" :class="wrapperCls">
    <div
      class="sg-datepicker-input sg-datepicker-range-input"
      role="combobox"
      aria-haspopup="dialog"
      :aria-expanded="isOpen"
      :aria-disabled="disabled"
      @click="openDropdown"
    >
      <span
        :class="
          [
            'sg-datepicker-range-part',
            activeIndex === 0 ? 'sg-datepicker-range-active' : '',
            current[0] ? '' : 'sg-datepicker-placeholder',
          ]
            .filter(Boolean)
            .join(' ')
        "
        @click.stop="
          () => {
            activeIndex = 0
            openDropdown()
          }
        "
      >
        {{ displayLeft }}
      </span>
      <span class="sg-datepicker-separator">{{ separator }}</span>
      <span
        :class="
          [
            'sg-datepicker-range-part',
            activeIndex === 1 ? 'sg-datepicker-range-active' : '',
            current[1] ? '' : 'sg-datepicker-placeholder',
          ]
            .filter(Boolean)
            .join(' ')
        "
        @click.stop="
          () => {
            activeIndex = 1
            openDropdown()
          }
        "
      >
        {{ displayRight }}
      </span>
      <span class="sg-datepicker-suffix">
        <span v-if="loading && !unstyled" class="sg-spin sg-spin-small" aria-hidden="true" />
        <template v-else>
          <span
            v-if="allowClear && (current[0] || current[1])"
            class="sg-datepicker-clear"
            role="button"
            :aria-label="clearLabel"
            @click="handleClear"
            >×</span
          >
          <svg
            class="sg-datepicker-icon"
            viewBox="0 0 16 16"
            width="14"
            height="14"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              d="M11 1V0h1v1h2.5A1.5 1.5 0 0116 2.5v12a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 010 14.5v-12A1.5 1.5 0 011.5 1H4V0h1v1h6zM1.5 2a.5.5 0 00-.5.5V4h14V2.5a.5.5 0 00-.5-.5h-13zM15 5H1v9.5a.5.5 0 00.5.5h13a.5.5 0 00.5-.5V5z"
            />
          </svg>
        </template>
      </span>
    </div>
    <div v-if="isOpen" :class="dropdownCls">
      <div class="sg-dp-dropdown-inner">
        <div v-if="presets && presets.length > 0" class="sg-dp-presets">
          <div
            v-for="p in presets"
            :key="p.label"
            class="sg-dp-preset-item"
            @click="handlePresetSelect(p)"
          >
            {{ p.label }}
          </div>
        </div>
        <div class="sg-dp-content">
          <div class="sg-dp-range-panels">
            <div class="sg-dp-panel">
              <div class="sg-dp-panel-header">
                <button
                  type="button"
                  class="sg-dp-nav-btn"
                  :title="prevYearLabel"
                  :aria-label="prevYearLabel"
                  @click="leftYear--"
                >
                  &laquo;
                </button>
                <button
                  type="button"
                  class="sg-dp-nav-btn"
                  :title="prevMonthLabel"
                  :aria-label="prevMonthLabel"
                  @click="moveLeftMonth(-1)"
                >
                  &lsaquo;
                </button>
                <span class="sg-dp-panel-title">{{ monthLabelLeft }}</span>
                <span style="flex: 1" />
              </div>
              <table class="sg-dp-table">
                <thead>
                  <tr>
                    <th v-for="d in dayNames" :key="d" class="sg-dp-th">{{ d }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(week, wi) in leftWeeks" :key="wi">
                    <td
                      v-for="cell in week"
                      :key="cell.date.toISOString()"
                      :class="cellClass(cell)"
                      @click="!props.disabledDate?.(cell.date) && handleDateSelect(cell.date)"
                      @mouseenter="hoverDate = cell.date"
                      @mouseleave="hoverDate = null"
                    >
                      <span class="sg-dp-cell-inner">{{ cell.day }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="sg-dp-panel">
              <div class="sg-dp-panel-header">
                <span style="flex: 1" />
                <span class="sg-dp-panel-title">{{ monthLabelRight }}</span>
                <button
                  type="button"
                  class="sg-dp-nav-btn"
                  :title="nextMonthLabel"
                  :aria-label="nextMonthLabel"
                  @click="moveLeftMonth(1)"
                >
                  &rsaquo;
                </button>
                <button
                  type="button"
                  class="sg-dp-nav-btn"
                  :title="nextYearLabel"
                  :aria-label="nextYearLabel"
                  @click="leftYear++"
                >
                  &raquo;
                </button>
              </div>
              <table class="sg-dp-table">
                <thead>
                  <tr>
                    <th v-for="d in dayNames" :key="d + '-r'" class="sg-dp-th">{{ d }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(week, wi) in rightWeeks" :key="wi">
                    <td
                      v-for="cell in week"
                      :key="cell.date.toISOString()"
                      :class="cellClass(cell)"
                      @click="!props.disabledDate?.(cell.date) && handleDateSelect(cell.date)"
                      @mouseenter="hoverDate = cell.date"
                      @mouseleave="hoverDate = null"
                    >
                      <span class="sg-dp-cell-inner">{{ cell.day }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div v-if="hasTime && current[0] && current[1]" class="sg-dp-range-time">
            <div class="sg-dp-time-panel">
              <div class="sg-dp-time-col">
                <div
                  v-for="n in hourItems"
                  :key="n + '-h0'"
                  :data-active="n === tempTimes[0].getHours()"
                  :class="[
                    'sg-dp-time-cell',
                    n === tempTimes[0].getHours() ? 'sg-dp-time-cell-active' : '',
                  ]"
                  @click="setTime(0, (d) => d.setHours(n))"
                >
                  {{ pad(n) }}
                </div>
              </div>
              <div class="sg-dp-time-col">
                <div
                  v-for="n in minuteItems"
                  :key="n + '-m0'"
                  :data-active="n === tempTimes[0].getMinutes()"
                  :class="[
                    'sg-dp-time-cell',
                    n === tempTimes[0].getMinutes() ? 'sg-dp-time-cell-active' : '',
                  ]"
                  @click="setTime(0, (d) => d.setMinutes(n))"
                >
                  {{ pad(n) }}
                </div>
              </div>
              <div v-if="showSeconds" class="sg-dp-time-col">
                <div
                  v-for="n in secondItems"
                  :key="n + '-s0'"
                  :data-active="n === tempTimes[0].getSeconds()"
                  :class="[
                    'sg-dp-time-cell',
                    n === tempTimes[0].getSeconds() ? 'sg-dp-time-cell-active' : '',
                  ]"
                  @click="setTime(0, (d) => d.setSeconds(n))"
                >
                  {{ pad(n) }}
                </div>
              </div>
            </div>
            <div class="sg-dp-time-panel">
              <div class="sg-dp-time-col">
                <div
                  v-for="n in hourItems"
                  :key="n + '-h1'"
                  :data-active="n === tempTimes[1].getHours()"
                  :class="[
                    'sg-dp-time-cell',
                    n === tempTimes[1].getHours() ? 'sg-dp-time-cell-active' : '',
                  ]"
                  @click="setTime(1, (d) => d.setHours(n))"
                >
                  {{ pad(n) }}
                </div>
              </div>
              <div class="sg-dp-time-col">
                <div
                  v-for="n in minuteItems"
                  :key="n + '-m1'"
                  :data-active="n === tempTimes[1].getMinutes()"
                  :class="[
                    'sg-dp-time-cell',
                    n === tempTimes[1].getMinutes() ? 'sg-dp-time-cell-active' : '',
                  ]"
                  @click="setTime(1, (d) => d.setMinutes(n))"
                >
                  {{ pad(n) }}
                </div>
              </div>
              <div v-if="showSeconds" class="sg-dp-time-col">
                <div
                  v-for="n in secondItems"
                  :key="n + '-s1'"
                  :data-active="n === tempTimes[1].getSeconds()"
                  :class="[
                    'sg-dp-time-cell',
                    n === tempTimes[1].getSeconds() ? 'sg-dp-time-cell-active' : '',
                  ]"
                  @click="setTime(1, (d) => d.setSeconds(n))"
                >
                  {{ pad(n) }}
                </div>
              </div>
            </div>
          </div>

          <div class="sg-dp-footer">
            <div class="sg-dp-footer-end">
              <button
                v-if="hasTime"
                type="button"
                class="sg-dp-footer-btn sg-dp-ok-btn"
                @click="handleTimeOk"
              >
                {{ okBtnLabel }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
