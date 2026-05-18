<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useConfig } from './ConfigProvider.vue'

export type DatePickerMode = 'date' | 'month' | 'year'

export interface ShowTimeConfig {
  /** Time portion format string. */
  format?: string
  /** Step between selectable hours. */
  hourStep?: number
  /** Step between selectable minutes. */
  minuteStep?: number
  /** Step between selectable seconds. */
  secondStep?: number
  /** Initial time when opening without a selected date. */
  defaultValue?: Date
}

export interface DatePreset {
  /** Label shown in the sidebar. */
  label: string
  /** Date applied when picked (or a `[start, end]` tuple for range presets). */
  value: Date | [Date, Date]
}

export interface DatePickerProps {
  /** v-model binding (Vue idiom). */
  modelValue?: Date | null
  /** Compat alias for `modelValue`. */
  value?: Date | null
  /** Initial value when uncontrolled. */
  defaultValue?: Date
  /** Placeholder text. */
  placeholder?: string
  /** Display format (YYYY/MM/DD/HH/mm/ss). */
  format?: string
  /** Picker level. */
  picker?: DatePickerMode
  /** Show time-of-day picker columns. When object, passes ShowTimeConfig. */
  showTime?: boolean | ShowTimeConfig
  /** Show "Today" footer button. */
  showToday?: boolean
  /** Show "Now" footer button (with showTime). */
  showNow?: boolean
  /** Show clear button when value exists. */
  allowClear?: boolean
  /** Disabled day predicate. */
  disabledDate?: (d: Date) => boolean
  /** Preset shortcuts in the sidebar. */
  presets?: DatePreset[]
  /** Corner alignment of the dropdown relative to the input. */
  placement?: 'bottomLeft' | 'bottomRight' | 'topLeft' | 'topRight'
  /** Controlled visibility of the dropdown. */
  open?: boolean
  /** When true, the trigger renders read-only text instead of an input. */
  inputReadOnly?: boolean
  /** Disables interaction. */
  disabled?: boolean
  /** Shows a loading spinner and disables interaction. */
  loading?: boolean
  /** Size token. */
  size?: 'small' | 'middle' | 'large'
  /** Strips built-in styling. */
  unstyled?: boolean
}

const props = withDefaults(defineProps<DatePickerProps>(), {
  placeholder: 'Select date',
  picker: 'date',
  showTime: false,
  showToday: true,
  showNow: false,
  allowClear: true,
  placement: 'bottomLeft',
  inputReadOnly: false,
  size: 'middle',
  disabled: false,
  loading: false,
  open: undefined,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: Date | null): void
  (e: 'change', value: Date | null, dateString: string): void
  (e: 'openChange', open: boolean): void
  (e: 'blur'): void
  (e: 'calendarChange', value: Date | null): void
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
const todayBtnLabel = computed(() => config.value.locale?.calendar?.today ?? 'Today')
const nowBtnLabel = computed(() => config.value.locale?.calendar?.now ?? 'Now')
const okBtnLabel = computed(() => config.value.locale?.modal?.okText ?? 'OK')
const prevYearLabel = computed(() => config.value.locale?.datePicker?.prevYear ?? 'Previous year')
const nextYearLabel = computed(() => config.value.locale?.datePicker?.nextYear ?? 'Next year')
const prevMonthLabel = computed(
  () => config.value.locale?.datePicker?.prevMonth ?? 'Previous month',
)
const nextMonthLabel = computed(() => config.value.locale?.datePicker?.nextMonth ?? 'Next month')

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
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
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
function parseDate(str: string, fmt: string): Date | null {
  if (!str) return null
  const yi = fmt.indexOf('YYYY')
  const mi = fmt.indexOf('MM')
  const di = fmt.indexOf('DD')
  const hi = fmt.indexOf('HH')
  const mni = fmt.indexOf('mm')
  const si = fmt.indexOf('ss')
  const year = yi >= 0 ? parseInt(str.substring(yi, yi + 4), 10) : new Date().getFullYear()
  const month = mi >= 0 ? parseInt(str.substring(mi, mi + 2), 10) - 1 : 0
  const day = di >= 0 ? parseInt(str.substring(di, di + 2), 10) : 1
  const hour = hi >= 0 ? parseInt(str.substring(hi, hi + 2), 10) : 0
  const min = mni >= 0 ? parseInt(str.substring(mni, mni + 2), 10) : 0
  const sec = si >= 0 ? parseInt(str.substring(si, si + 2), 10) : 0
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null
  return new Date(year, month, day, hour, min, sec)
}

const hasTime = computed(() => !!props.showTime)
const timeConfig = computed<ShowTimeConfig>(() =>
  typeof props.showTime === 'object' && props.showTime !== null ? props.showTime : {},
)

const fmt = computed(
  () =>
    props.format ??
    (hasTime.value
      ? 'YYYY-MM-DD HH:mm:ss'
      : props.picker === 'month'
        ? 'YYYY-MM'
        : props.picker === 'year'
          ? 'YYYY'
          : 'YYYY-MM-DD'),
)

const normalizedDefault = toValidDate(props.defaultValue)
const initial =
  props.modelValue !== undefined
    ? toValidDate(props.modelValue)
    : props.value !== undefined
      ? toValidDate(props.value)
      : normalizedDefault

const internal = ref<Date | null>(initial)
watch(
  () => props.modelValue ?? props.value,
  (v) => {
    if (v !== undefined) {
      const normalized = toValidDate(v)
      internal.value = normalized
      if (normalized) {
        viewYear.value = normalized.getFullYear()
        viewMonth.value = normalized.getMonth()
        tempTime.value = normalized
      }
    }
  },
)

const current = computed<Date | null>(() => {
  const ext = props.modelValue !== undefined ? props.modelValue : props.value
  if (ext !== undefined) return toValidDate(ext)
  return internal.value
})

const internalOpen = ref(false)
const isOpen = computed(() => props.open ?? internalOpen.value)

const viewYear = ref((current.value ?? new Date()).getFullYear())
const viewMonth = ref((current.value ?? new Date()).getMonth())
const pickerLevel = ref<DatePickerMode>(
  props.picker === 'year' ? 'year' : props.picker === 'month' ? 'month' : 'date',
)
const tempTime = ref<Date>(current.value ?? timeConfig.value.defaultValue ?? new Date())
const inputText = ref('')
const isInputting = ref(false)

const wrapperRef = ref<HTMLDivElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)

function setOpen(v: boolean) {
  internalOpen.value = v
  emit('openChange', v)
  if (!v) {
    isInputting.value = false
    emit('blur')
  }
}

function commit(d: Date | null) {
  internal.value = d
  emit('update:modelValue', d)
  emit('change', d, d ? formatDate(d, fmt.value) : '')
}

function openDropdown() {
  if (props.disabled || props.loading) return
  setOpen(true)
  pickerLevel.value = props.picker === 'year' ? 'year' : props.picker === 'month' ? 'month' : 'date'
  if (current.value) {
    viewYear.value = current.value.getFullYear()
    viewMonth.value = current.value.getMonth()
    tempTime.value = current.value
  }
}

function handleDateSelect(d: Date) {
  emit('calendarChange', d)
  if (hasTime.value) {
    const merged = cloneDate(d)
    merged.setHours(
      tempTime.value.getHours(),
      tempTime.value.getMinutes(),
      tempTime.value.getSeconds(),
    )
    tempTime.value = merged
    internal.value = merged
    return
  }
  commit(d)
  setOpen(false)
}

function handleMonthSelect(month: number) {
  if (props.picker === 'month') {
    const d = new Date(viewYear.value, month, 1)
    commit(d)
    setOpen(false)
    return
  }
  viewMonth.value = month
  pickerLevel.value = 'date'
}

function handleYearSelect(year: number) {
  if (props.picker === 'year') {
    const d = new Date(year, 0, 1)
    commit(d)
    setOpen(false)
    return
  }
  viewYear.value = year
  pickerLevel.value = props.picker === 'month' ? 'month' : 'date'
}

function handleTimeChange(d: Date) {
  tempTime.value = d
  if (current.value) {
    const merged = cloneDate(current.value)
    merged.setHours(d.getHours(), d.getMinutes(), d.getSeconds())
    internal.value = merged
  }
}

function handleTimeOk() {
  const final = current.value ?? tempTime.value
  commit(final)
  setOpen(false)
}

function handleToday() {
  const today = new Date()
  if (hasTime.value) {
    viewYear.value = today.getFullYear()
    viewMonth.value = today.getMonth()
    internal.value = today
    tempTime.value = today
  } else {
    commit(today)
    setOpen(false)
  }
}

function handleNow() {
  const now = new Date()
  commit(now)
  setOpen(false)
}

function handleClear(e: MouseEvent) {
  e.stopPropagation()
  commit(null)
}

function handlePresetSelect(p: DatePreset) {
  const single = Array.isArray(p.value) ? p.value[0] : p.value
  commit(single)
  setOpen(false)
}

function handleInputChange(e: Event) {
  inputText.value = (e.target as HTMLInputElement).value
  isInputting.value = true
}

function handleInputKeyDown(e: KeyboardEvent) {
  if (e.key === 'Enter' && isInputting.value) {
    const parsed = parseDate(inputText.value, fmt.value)
    if (parsed && !isNaN(parsed.getTime())) {
      commit(parsed)
      setOpen(false)
    }
  }
  if (e.key === 'Escape') setOpen(false)
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

interface DayCell {
  date: Date
  day: number
  inMonth: boolean
}

const weeks = computed<DayCell[][]>(() => {
  const y = viewYear.value
  const m = viewMonth.value
  const daysInMonth = getDaysInMonth(y, m)
  const firstDay = new Date(y, m, 1).getDay()
  const prevDays = getDaysInMonth(y, m - 1)
  const cells: DayCell[] = []
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ date: new Date(y, m - 1, prevDays - i), day: prevDays - i, inMonth: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(y, m, d), day: d, inMonth: true })
  }
  const remaining = 42 - cells.length
  for (let d = 1; d <= remaining; d++) {
    cells.push({ date: new Date(y, m + 1, d), day: d, inMonth: false })
  }
  const out: DayCell[][] = []
  for (let i = 0; i < cells.length; i += 7) out.push(cells.slice(i, i + 7))
  return out
})

const monthLabel = computed(() => `${monthNames.value[viewMonth.value]} ${viewYear.value}`)
const displayText = computed(() => {
  if (isInputting.value) return inputText.value
  return current.value ? formatDate(current.value, fmt.value) : ''
})

const yearDecadeStart = computed(() => Math.floor(viewYear.value / 10) * 10)
const yearOptions = computed(() => {
  const arr: number[] = []
  for (let y = yearDecadeStart.value - 1; y <= yearDecadeStart.value + 10; y++) arr.push(y)
  return arr
})

function shiftMonth(delta: number) {
  const m = viewMonth.value + delta
  if (m < 0) {
    viewMonth.value = 11
    viewYear.value--
  } else if (m > 11) {
    viewMonth.value = 0
    viewYear.value++
  } else {
    viewMonth.value = m
  }
}

function shiftYear(delta: number) {
  viewYear.value += delta
}

function cellClass(cell: DayCell) {
  const selected = current.value ? isSameDay(cell.date, current.value) : false
  const today = isToday(cell.date)
  const disabled = props.disabledDate?.(cell.date) ?? false
  return [
    'sg-dp-cell',
    !cell.inMonth ? 'sg-dp-cell-outside' : '',
    selected ? 'sg-dp-cell-selected' : '',
    today ? 'sg-dp-cell-today' : '',
    disabled ? 'sg-dp-cell-disabled' : '',
  ]
    .filter(Boolean)
    .join(' ')
}

const wrapperCls = computed(() =>
  props.unstyled
    ? ''
    : [
        'sg-datepicker',
        `sg-datepicker-${props.size}`,
        isOpen.value ? 'sg-datepicker-open' : '',
        props.disabled || props.loading ? 'sg-datepicker-disabled' : '',
        props.loading ? 'sg-datepicker-loading' : '',
      ]
        .filter(Boolean)
        .join(' '),
)

const dropdownCls = computed(() => `sg-dp-dropdown sg-dp-dropdown-${props.placement}`)

const hourStep = computed(() => timeConfig.value.hourStep ?? 1)
const minuteStep = computed(() => timeConfig.value.minuteStep ?? 1)
const secondStep = computed(() => timeConfig.value.secondStep ?? 1)
const showSeconds = computed(() => (timeConfig.value.format ?? 'HH:mm:ss').includes('ss'))

const hourItems = computed(() => {
  const arr: number[] = []
  for (let i = 0; i < 24; i += hourStep.value) arr.push(i)
  return arr
})
const minuteItems = computed(() => {
  const arr: number[] = []
  for (let i = 0; i < 60; i += minuteStep.value) arr.push(i)
  return arr
})
const secondItems = computed(() => {
  const arr: number[] = []
  for (let i = 0; i < 60; i += secondStep.value) arr.push(i)
  return arr
})

function setTimeH(h: number) {
  const d = cloneDate(tempTime.value)
  d.setHours(h)
  handleTimeChange(d)
}
function setTimeM(m: number) {
  const d = cloneDate(tempTime.value)
  d.setMinutes(m)
  handleTimeChange(d)
}
function setTimeS(s: number) {
  const d = cloneDate(tempTime.value)
  d.setSeconds(s)
  handleTimeChange(d)
}

const hourColRef = ref<HTMLDivElement | null>(null)
const minuteColRef = ref<HTMLDivElement | null>(null)
const secondColRef = ref<HTMLDivElement | null>(null)

function scrollActive(col: HTMLElement | null) {
  if (!col) return
  const active = col.querySelector('[data-active="true"]') as HTMLElement | null
  active?.scrollIntoView?.({ block: 'nearest' })
}

watch([isOpen, () => tempTime.value], async () => {
  if (!isOpen.value || !hasTime.value) return
  await nextTick()
  scrollActive(hourColRef.value)
  scrollActive(minuteColRef.value)
  scrollActive(secondColRef.value)
})
</script>

<template>
  <div ref="wrapperRef" :class="wrapperCls">
    <div
      class="sg-datepicker-input"
      role="combobox"
      aria-haspopup="dialog"
      :aria-expanded="isOpen"
      :aria-disabled="disabled"
      @click="openDropdown"
    >
      <span
        v-if="inputReadOnly"
        :class="
          ['sg-datepicker-input-text', displayText ? '' : 'sg-datepicker-placeholder']
            .filter(Boolean)
            .join(' ')
        "
      >
        {{ displayText || placeholder }}
      </span>
      <input
        v-else
        ref="inputRef"
        class="sg-datepicker-input-text"
        :value="displayText"
        :placeholder="placeholder"
        :readonly="disabled"
        @input="handleInputChange"
        @keydown="handleInputKeyDown"
        @focus="openDropdown"
      />
      <span class="sg-datepicker-suffix">
        <span v-if="loading && !unstyled" class="sg-spin sg-spin-small" aria-hidden="true" />
        <template v-else>
          <span
            v-if="allowClear && current"
            class="sg-datepicker-clear"
            role="button"
            aria-label="Clear"
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
          <div v-if="pickerLevel === 'date'" class="sg-dp-panel">
            <div class="sg-dp-panel-header">
              <button
                type="button"
                class="sg-dp-nav-btn"
                :title="prevYearLabel"
                :aria-label="prevYearLabel"
                @click="shiftYear(-1)"
              >
                &laquo;
              </button>
              <button
                type="button"
                class="sg-dp-nav-btn"
                :title="prevMonthLabel"
                :aria-label="prevMonthLabel"
                @click="shiftMonth(-1)"
              >
                &lsaquo;
              </button>
              <button
                v-if="picker === 'date'"
                type="button"
                class="sg-dp-panel-title sg-dp-panel-title-btn"
                @click="pickerLevel = 'month'"
              >
                {{ monthLabel }}
              </button>
              <span v-else class="sg-dp-panel-title">{{ monthLabel }}</span>
              <button
                type="button"
                class="sg-dp-nav-btn"
                :title="nextMonthLabel"
                :aria-label="nextMonthLabel"
                @click="shiftMonth(1)"
              >
                &rsaquo;
              </button>
              <button
                type="button"
                class="sg-dp-nav-btn"
                :title="nextYearLabel"
                :aria-label="nextYearLabel"
                @click="shiftYear(1)"
              >
                &raquo;
              </button>
            </div>
            <table class="sg-dp-table">
              <thead>
                <tr>
                  <th v-for="d in dayNames" :key="d" class="sg-dp-th">{{ d }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(week, wi) in weeks" :key="wi">
                  <td
                    v-for="cell in week"
                    :key="cell.date.toISOString()"
                    :class="cellClass(cell)"
                    @click="!props.disabledDate?.(cell.date) && handleDateSelect(cell.date)"
                  >
                    <span class="sg-dp-cell-inner">{{ cell.day }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-if="pickerLevel === 'month'" class="sg-dp-panel">
            <div class="sg-dp-panel-header">
              <button
                type="button"
                class="sg-dp-nav-btn"
                :title="prevYearLabel"
                :aria-label="prevYearLabel"
                @click="shiftYear(-1)"
              >
                &laquo;
              </button>
              <span class="sg-dp-panel-title">{{ viewYear }}</span>
              <button
                type="button"
                class="sg-dp-nav-btn"
                :title="nextYearLabel"
                :aria-label="nextYearLabel"
                @click="shiftYear(1)"
              >
                &raquo;
              </button>
            </div>
            <div class="sg-dp-month-grid">
              <div
                v-for="(name, i) in monthNames"
                :key="i"
                :class="
                  [
                    'sg-dp-month-cell',
                    current && current.getFullYear() === viewYear && current.getMonth() === i
                      ? 'sg-dp-month-cell-selected'
                      : '',
                    new Date().getFullYear() === viewYear && new Date().getMonth() === i
                      ? 'sg-dp-month-cell-current'
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')
                "
                @click="handleMonthSelect(i)"
              >
                {{ name.substring(0, 3) }}
              </div>
            </div>
          </div>

          <div v-if="pickerLevel === 'year'" class="sg-dp-panel">
            <div class="sg-dp-panel-header">
              <button
                type="button"
                class="sg-dp-nav-btn"
                :title="prevYearLabel"
                :aria-label="prevYearLabel"
                @click="shiftYear(-10)"
              >
                &laquo;
              </button>
              <span class="sg-dp-panel-title"
                >{{ yearDecadeStart }} - {{ yearDecadeStart + 9 }}</span
              >
              <button
                type="button"
                class="sg-dp-nav-btn"
                :title="nextYearLabel"
                :aria-label="nextYearLabel"
                @click="shiftYear(10)"
              >
                &raquo;
              </button>
            </div>
            <div class="sg-dp-year-grid">
              <div
                v-for="y in yearOptions"
                :key="y"
                :class="
                  [
                    'sg-dp-year-cell',
                    current && current.getFullYear() === y ? 'sg-dp-year-cell-selected' : '',
                    new Date().getFullYear() === y ? 'sg-dp-year-cell-current' : '',
                    y < yearDecadeStart || y > yearDecadeStart + 9 ? 'sg-dp-year-cell-outside' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')
                "
                @click="handleYearSelect(y)"
              >
                {{ y }}
              </div>
            </div>
          </div>

          <div v-if="hasTime && pickerLevel === 'date'" class="sg-dp-time-panel">
            <div ref="hourColRef" class="sg-dp-time-col">
              <div
                v-for="n in hourItems"
                :key="n"
                :data-active="n === tempTime.getHours()"
                :class="[
                  'sg-dp-time-cell',
                  n === tempTime.getHours() ? 'sg-dp-time-cell-active' : '',
                ]"
                @click="setTimeH(n)"
              >
                {{ pad(n) }}
              </div>
            </div>
            <div ref="minuteColRef" class="sg-dp-time-col">
              <div
                v-for="n in minuteItems"
                :key="n"
                :data-active="n === tempTime.getMinutes()"
                :class="[
                  'sg-dp-time-cell',
                  n === tempTime.getMinutes() ? 'sg-dp-time-cell-active' : '',
                ]"
                @click="setTimeM(n)"
              >
                {{ pad(n) }}
              </div>
            </div>
            <div v-if="showSeconds" ref="secondColRef" class="sg-dp-time-col">
              <div
                v-for="n in secondItems"
                :key="n"
                :data-active="n === tempTime.getSeconds()"
                :class="[
                  'sg-dp-time-cell',
                  n === tempTime.getSeconds() ? 'sg-dp-time-cell-active' : '',
                ]"
                @click="setTimeS(n)"
              >
                {{ pad(n) }}
              </div>
            </div>
          </div>

          <div class="sg-dp-footer">
            <div class="sg-dp-footer-start">
              <button
                v-if="showToday && !hasTime && pickerLevel === 'date'"
                type="button"
                class="sg-dp-footer-btn sg-dp-today-btn"
                @click="handleToday"
              >
                {{ todayBtnLabel }}
              </button>
              <button
                v-if="showNow && hasTime"
                type="button"
                class="sg-dp-footer-btn sg-dp-now-btn"
                @click="handleNow"
              >
                {{ nowBtnLabel }}
              </button>
            </div>
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
