<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useConfig } from './ConfigProvider.vue'

export interface CalendarEvent {
  id?: string
  key?: string
  date: Date
  title: string
  type?: string
  color?: string
}

export interface CalendarLocale {
  /** 12 entries from January to December. */
  monthNames?: string[]
  /** 7 entries — Sunday first; reordered internally by `weekStartDay`. */
  dayNames?: string[]
  /** Label for the "Today" footer button. */
  today?: string
  /** Header for the optional ISO week column. */
  week?: string
}

export interface CalendarHeaderSlotProps {
  value: Date
  type: 'month' | 'year'
  onChange: (date: Date) => void
  onTypeChange: (type: 'month' | 'year') => void
}

export interface CalendarCellSlotProps {
  date: Date
  type: 'date' | 'month'
}

export interface CalendarProps {
  /** v-model binding (Vue idiom) — the currently selected date. */
  modelValue?: Date
  /** Compat alias. */
  value?: Date
  /** Initial date when uncontrolled. */
  defaultValue?: Date
  /** View mode: month grid or year overview. */
  mode?: 'month' | 'year'
  /** Calendar events to highlight in cells. */
  events?: CalendarEvent[]
  /** Maximum number of event-dots shown per cell. */
  maxEvents?: number
  /** First day of the week (0 = Sunday). */
  weekStartDay?: number
  /** Show ISO week numbers in month view. */
  showWeekNumber?: boolean
  /**
   * Legacy alias of `showWeekNumber` — kept for backward compatibility,
   * prefer `showWeekNumber`.
   */
  showWeekNumbers?: boolean
  /** Fullscreen layout (with footer and select-header). */
  fullscreen?: boolean
  /** Disabled-day predicate. */
  disabledDate?: (d: Date) => boolean
  /** Locale strings — overrides defaults. */
  locale?: CalendarLocale
  /** Enable range selection mode. */
  rangeSelection?: boolean
  /** Controlled range value `[start, end]`. */
  rangeValue?: [Date | null, Date | null]
  /** Default range when uncontrolled. */
  defaultRangeValue?: [Date | null, Date | null]
  /** Enable multiple-date selection. */
  multipleSelection?: boolean
  /** Controlled array of multi-selected dates. */
  multipleValue?: Date[]
  /** Default multi-selected dates when uncontrolled. */
  defaultMultipleValue?: Date[]
  /** Strips built-in styling. */
  unstyled?: boolean
}

const props = withDefaults(defineProps<CalendarProps>(), {
  mode: 'month',
  weekStartDay: 0,
  showWeekNumber: false,
  showWeekNumbers: false,
  fullscreen: true,
  maxEvents: 3,
  rangeSelection: false,
  multipleSelection: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: Date): void
  (e: 'select', value: Date): void
  (e: 'panelChange', value: Date, mode: 'month' | 'year'): void
  (e: 'modeChange', mode: 'month' | 'year'): void
  (e: 'change', value: Date): void
  (e: 'rangeChange', range: [Date | null, Date | null]): void
  (e: 'multipleChange', dates: Date[]): void
}>()

defineSlots<{
  /** Custom header renderer; receives panel value + mode + handlers. */
  header(props: CalendarHeaderSlotProps): unknown
  /** Extra content inside a day or month cell. */
  cell(props: CalendarCellSlotProps): unknown
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

const cfg = useConfig()
const monthNames = computed(
  () => props.locale?.monthNames ?? cfg.value.locale?.calendar?.monthNames ?? DEFAULT_MONTH_NAMES,
)
const dayNamesBase = computed(
  () => props.locale?.dayNames ?? cfg.value.locale?.calendar?.dayNames ?? DEFAULT_DAY_NAMES,
)
const todayLabel = computed(
  () => props.locale?.today ?? cfg.value.locale?.calendar?.today ?? 'Today',
)
const weekLabel = computed(() => props.locale?.week ?? cfg.value.locale?.calendar?.week ?? 'W')
const prevYearLabel = computed(() => cfg.value.locale?.calendar?.prevYear ?? 'Previous year')
const nextYearLabel = computed(() => cfg.value.locale?.calendar?.nextYear ?? 'Next year')
const prevMonthLabel = computed(() => cfg.value.locale?.calendar?.prevMonth ?? 'Previous month')
const nextMonthLabel = computed(() => cfg.value.locale?.calendar?.nextMonth ?? 'Next month')
const monthSelectLabel = computed(() => cfg.value.locale?.calendar?.month ?? 'Month')
const yearSelectLabel = computed(() => cfg.value.locale?.calendar?.year ?? 'Year')

const internal = ref<Date>(props.modelValue ?? props.value ?? props.defaultValue ?? new Date())
watch(
  () => props.modelValue ?? props.value,
  (v) => {
    if (v) internal.value = v
  },
)
const current = computed(() => props.modelValue ?? props.value ?? internal.value)

const internalRange = ref<[Date | null, Date | null]>(
  (props.rangeValue ?? props.defaultRangeValue ?? [null, null]) as [Date | null, Date | null],
)
watch(
  () => props.rangeValue,
  (v) => {
    if (v !== undefined) internalRange.value = [...v] as [Date | null, Date | null]
  },
)
const rangeState = computed<[Date | null, Date | null]>(
  () => (props.rangeValue ?? internalRange.value) as [Date | null, Date | null],
)

const internalMulti = ref<Date[]>([...(props.multipleValue ?? props.defaultMultipleValue ?? [])])
watch(
  () => props.multipleValue,
  (v) => {
    if (v !== undefined) internalMulti.value = [...v]
  },
)
const multiState = computed<Date[]>(() => props.multipleValue ?? internalMulti.value)

const internalMode = ref<'month' | 'year'>(props.mode)
watch(
  () => props.mode,
  (m) => {
    internalMode.value = m
  },
)
const currentMode = computed(() => internalMode.value)

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}
function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}
function isToday(d: Date) {
  return isSameDay(d, new Date())
}
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}
function isBetween(date: Date, start: Date, end: Date): boolean {
  const t = date.getTime()
  const s = Math.min(start.getTime(), end.getTime())
  const e = Math.max(start.getTime(), end.getTime())
  return t >= s && t <= e
}
function isRangeStart(date: Date, start: Date | null, end: Date | null): boolean {
  if (!start) return false
  if (!end) return isSameDay(date, start)
  const s = start.getTime() <= end.getTime() ? start : end
  return isSameDay(date, s)
}
function isRangeEnd(date: Date, start: Date | null, end: Date | null): boolean {
  if (!start || !end) return false
  const e = start.getTime() <= end.getTime() ? end : start
  return isSameDay(date, e)
}

const showWeek = computed(() => props.showWeekNumber || props.showWeekNumbers)

const panelDate = ref<Date>(current.value)
watch(current, (v) => {
  panelDate.value = v
})

const panelYear = computed(() => panelDate.value.getFullYear())
const panelMonth = computed(() => panelDate.value.getMonth())

interface DayCell {
  date: Date
  day: number
  inMonth: boolean
}

const monthGrid = computed<DayCell[][]>(() => {
  const y = panelYear.value
  const m = panelMonth.value
  const daysInMonth = getDaysInMonth(y, m)
  const firstDayRaw = new Date(y, m, 1).getDay()
  const firstDay = (firstDayRaw - props.weekStartDay + 7) % 7
  const prevMonthDays = getDaysInMonth(y, m - 1)
  const cells: DayCell[] = []
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({
      date: new Date(y, m - 1, prevMonthDays - i),
      day: prevMonthDays - i,
      inMonth: false,
    })
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ date: new Date(y, m, day), day, inMonth: true })
  }
  const remaining = 42 - cells.length
  for (let day = 1; day <= remaining; day++) {
    cells.push({ date: new Date(y, m + 1, day), day, inMonth: false })
  }
  const weeks: DayCell[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
})

const yearOptions = computed(() => {
  const arr: number[] = []
  for (let y = panelYear.value - 10; y <= panelYear.value + 10; y++) arr.push(y)
  return arr
})

function eventsForDate(d: Date): CalendarEvent[] {
  return (props.events ?? []).filter((ev) => isSameDay(ev.date, d))
}

function commitSingle(d: Date) {
  internal.value = d
  panelDate.value = d
  emit('update:modelValue', d)
  emit('select', d)
  emit('change', d)
}

function commitRange(next: [Date | null, Date | null]) {
  internalRange.value = next
  emit('rangeChange', next)
}

function commitMultiple(next: Date[]) {
  internalMulti.value = next
  emit('multipleChange', next)
}

function selectDate(d: Date) {
  if (props.disabledDate?.(d)) return

  if (props.rangeSelection) {
    const [start, end] = rangeState.value
    if (!start || (start && end)) {
      commitRange([d, null])
    } else {
      commitRange([start, d])
    }
    return
  }

  if (props.multipleSelection) {
    const exists = multiState.value.some((dd) => isSameDay(dd, d))
    const next = exists
      ? multiState.value.filter((dd) => !isSameDay(dd, d))
      : [...multiState.value, d]
    commitMultiple(next)
    return
  }

  commitSingle(d)
}

function selectMonth(monthIdx: number) {
  const d = new Date(panelYear.value, monthIdx, 1)
  panelDate.value = d
  internal.value = d
  emit('update:modelValue', d)
  emit('select', d)
  emit('change', d)
  internalMode.value = 'month'
  emit('modeChange', 'month')
  emit('panelChange', d, 'month')
}

function shiftMonth(delta: number) {
  const d = new Date(panelYear.value, panelMonth.value + delta, 1)
  panelDate.value = d
  emit('panelChange', d, currentMode.value)
}

function shiftYear(delta: number) {
  const d = new Date(panelYear.value + delta, panelMonth.value, 1)
  panelDate.value = d
  emit('panelChange', d, currentMode.value)
}

function setMode(m: 'month' | 'year') {
  internalMode.value = m
  emit('modeChange', m)
  emit('panelChange', panelDate.value, m)
}

function handleToday() {
  const today = new Date()
  selectDate(today)
}

function handleMonthSelectChange(e: Event) {
  const v = Number((e.target as HTMLSelectElement).value)
  const d = new Date(panelYear.value, v, 1)
  panelDate.value = d
  emit('panelChange', d, currentMode.value)
}

function handleYearSelectChange(e: Event) {
  const v = Number((e.target as HTMLSelectElement).value)
  const d = new Date(v, panelMonth.value, 1)
  panelDate.value = d
  emit('panelChange', d, currentMode.value)
}

const dayNames = computed(() => {
  const base = dayNamesBase.value
  const arr: string[] = []
  for (let i = 0; i < 7; i++) arr.push(base[(props.weekStartDay + i) % 7])
  return arr
})

const wrapperCls = computed(() =>
  props.unstyled
    ? ''
    : [
        'sg-calendar',
        props.fullscreen ? 'sg-calendar-fullscreen' : 'sg-calendar-mini',
        `sg-calendar-${currentMode.value}`,
      ]
        .filter(Boolean)
        .join(' '),
)

function cellClasses(cell: DayCell) {
  const [rStart, rEnd] = rangeState.value
  const isRangeMode = props.rangeSelection
  const inRange = isRangeMode && rStart && rEnd ? isBetween(cell.date, rStart, rEnd) : false
  const rangeStart = isRangeMode ? isRangeStart(cell.date, rStart, rEnd) : false
  const rangeEnd = isRangeMode ? isRangeEnd(cell.date, rStart, rEnd) : false

  const isMulti = props.multipleSelection
    ? multiState.value.some((d) => isSameDay(d, cell.date))
    : false

  const isSelected =
    !isRangeMode && !props.multipleSelection
      ? isSameDay(cell.date, current.value)
      : rangeStart || rangeEnd || isMulti

  return [
    'sg-calendar-cell',
    cell.inMonth ? '' : 'sg-calendar-cell-outside',
    isToday(cell.date) ? 'sg-calendar-cell-today' : '',
    isSelected ? 'sg-calendar-cell-selected' : '',
    inRange ? 'sg-calendar-cell-in-range' : '',
    rangeStart ? 'sg-calendar-cell-range-start' : '',
    rangeEnd ? 'sg-calendar-cell-range-end' : '',
    props.disabledDate?.(cell.date) ? 'sg-calendar-cell-disabled' : '',
  ]
    .filter(Boolean)
    .join(' ')
}

function monthCellClasses(monthIdx: number) {
  const d = new Date(panelYear.value, monthIdx, 1)
  return [
    'sg-calendar-month-cell',
    isSameMonth(d, current.value) ? 'sg-calendar-month-cell-selected' : '',
    isSameMonth(d, new Date()) ? 'sg-calendar-month-cell-current' : '',
  ]
    .filter(Boolean)
    .join(' ')
}

function onHeaderChange(d: Date) {
  panelDate.value = d
  emit('panelChange', d, currentMode.value)
}
</script>

<template>
  <div :class="wrapperCls">
    <slot
      name="header"
      :value="panelDate"
      :type="currentMode"
      :on-change="onHeaderChange"
      :on-type-change="setMode"
    >
      <div class="sg-calendar-header">
        <div class="sg-calendar-header-left">
          <button
            type="button"
            class="sg-calendar-nav-btn"
            :title="prevYearLabel"
            :aria-label="prevYearLabel"
            @click="shiftYear(-1)"
          >
            &laquo;
          </button>
          <button
            v-if="currentMode === 'month'"
            type="button"
            class="sg-calendar-nav-btn"
            :title="prevMonthLabel"
            :aria-label="prevMonthLabel"
            @click="shiftMonth(-1)"
          >
            &lsaquo;
          </button>
        </div>

        <div class="sg-calendar-header-center">
          <select
            class="sg-calendar-month-select"
            :aria-label="monthSelectLabel"
            :value="panelMonth"
            @change="handleMonthSelectChange"
          >
            <option v-for="(name, i) in monthNames" :key="i" :value="i">{{ name }}</option>
          </select>
          <select
            class="sg-calendar-year-select"
            :aria-label="yearSelectLabel"
            :value="panelYear"
            @change="handleYearSelectChange"
          >
            <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
          </select>
          <div class="sg-calendar-mode-switch">
            <button
              type="button"
              :class="[
                'sg-calendar-mode-btn',
                currentMode === 'month' ? 'sg-calendar-mode-btn-active' : '',
              ]"
              @click="setMode('month')"
            >
              {{ monthSelectLabel }}
            </button>
            <button
              type="button"
              :class="[
                'sg-calendar-mode-btn',
                currentMode === 'year' ? 'sg-calendar-mode-btn-active' : '',
              ]"
              @click="setMode('year')"
            >
              {{ yearSelectLabel }}
            </button>
          </div>
        </div>

        <div class="sg-calendar-header-right">
          <button
            v-if="currentMode === 'month'"
            type="button"
            class="sg-calendar-nav-btn"
            :title="nextMonthLabel"
            :aria-label="nextMonthLabel"
            @click="shiftMonth(1)"
          >
            &rsaquo;
          </button>
          <button
            type="button"
            class="sg-calendar-nav-btn"
            :title="nextYearLabel"
            :aria-label="nextYearLabel"
            @click="shiftYear(1)"
          >
            &raquo;
          </button>
        </div>
      </div>
    </slot>

    <div class="sg-calendar-body">
      <table v-if="currentMode === 'month'" class="sg-calendar-table">
        <thead>
          <tr>
            <th v-if="showWeek" class="sg-calendar-week-header">{{ weekLabel }}</th>
            <th v-for="d in dayNames" :key="d" class="sg-calendar-day-header">{{ d }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(week, wi) in monthGrid" :key="wi" class="sg-calendar-week-row">
            <td v-if="showWeek" class="sg-calendar-week-number">
              {{ getISOWeekNumber(week[0].date) }}
            </td>
            <td
              v-for="cell in week"
              :key="cell.date.toISOString()"
              :class="cellClasses(cell)"
              @click="selectDate(cell.date)"
            >
              <div class="sg-calendar-cell-inner">
                <span class="sg-calendar-cell-date">{{ cell.day }}</span>
                <slot name="cell" :date="cell.date" type="date" />
                <div v-if="eventsForDate(cell.date).length > 0" class="sg-calendar-cell-events">
                  <span
                    v-for="(ev, i) in eventsForDate(cell.date).slice(0, maxEvents)"
                    :key="ev.key ?? ev.id ?? i"
                    class="sg-calendar-event-dot"
                    :style="{ backgroundColor: ev.color ?? 'var(--sg-color-primary, #1677ff)' }"
                    :title="ev.title"
                  />
                  <span
                    v-if="eventsForDate(cell.date).length > maxEvents"
                    class="sg-calendar-event-more"
                    >+{{ eventsForDate(cell.date).length - maxEvents }}</span
                  >
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-else class="sg-calendar-month-grid">
        <div
          v-for="(name, i) in monthNames"
          :key="i"
          :class="monthCellClasses(i)"
          @click="selectMonth(i)"
        >
          <div class="sg-calendar-month-cell-inner">
            <span class="sg-calendar-month-cell-name">{{ name }}</span>
            <slot name="cell" :date="new Date(panelYear, i, 1)" type="month" />
          </div>
        </div>
      </div>
    </div>

    <div v-if="fullscreen" class="sg-calendar-footer">
      <button type="button" class="sg-calendar-today-btn" @click="handleToday">
        {{ todayLabel }}
      </button>
    </div>
  </div>
</template>
