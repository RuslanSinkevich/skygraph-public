import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { Spin } from './Spin'
import { useConfig } from '../ConfigProvider'
import type { BaseComponentProps, InteractiveProps, SizableProps } from '../../types'

// ── Date helpers ──

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function isToday(d: Date): boolean {
  return isSameDay(d, new Date())
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function cloneDate(d: Date): Date {
  return new Date(d.getTime())
}

/**
 * Coerce arbitrary input into a valid `Date` or `null`.
 *
 * Form bindings frequently pass non-Date values (empty strings from
 * `defaultValues: { birthDate: '' }`, ISO strings from a server, numbers from
 * timestamps, `Invalid Date` objects). Calling `.getFullYear()` on any of those
 * throws — so normalize at the boundary and treat garbage as "no value".
 */
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
  const pad = (n: number) => String(n).padStart(2, '0')
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
  const yi = fmt.indexOf('YYYY'),
    mi = fmt.indexOf('MM'),
    di = fmt.indexOf('DD')
  const hi = fmt.indexOf('HH'),
    mni = fmt.indexOf('mm'),
    si = fmt.indexOf('ss')

  const year = yi >= 0 ? parseInt(str.substring(yi, yi + 4), 10) : new Date().getFullYear()
  const month = mi >= 0 ? parseInt(str.substring(mi, mi + 2), 10) - 1 : 0
  const day = di >= 0 ? parseInt(str.substring(di, di + 2), 10) : 1
  const hour = hi >= 0 ? parseInt(str.substring(hi, hi + 2), 10) : 0
  const min = mni >= 0 ? parseInt(str.substring(mni, mni + 2), 10) : 0
  const sec = si >= 0 ? parseInt(str.substring(si, si + 2), 10) : 0

  if (isNaN(year) || isNaN(month) || isNaN(day)) return null
  return new Date(year, month, day, hour, min, sec)
}

// ── Month grid builder ──

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

const MONTH_NAMES = [
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
const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

// ── Picker modes ──

export type PickerMode = 'date' | 'month' | 'year' | 'week'

/** Named shortcut that sets the calendar to a single date or a range. */
export interface DatePreset {
  /** Preset label shown in the sidebar. */
  label: string
  /** Date applied for single picker, or [start, end] for range presets. */
  value: Date | [Date, Date]
}

/** Fine-grained options when time selection is enabled on the date picker. */
export interface ShowTimeConfig {
  /** Time portion format string (supports HH, mm, ss tokens). */
  format?: string
  /** Step between selectable hours in the time scroller. */
  hourStep?: number
  /** Step between selectable minutes in the time scroller. */
  minuteStep?: number
  /** Step between selectable seconds in the time scroller. */
  secondStep?: number
  /** Initial time used when opening the panel without a selected date. */
  defaultValue?: Date
}

// ── Props ──

/** Props for picking a single calendar date (and optional time) with presets and placement. */
export interface DatePickerProps extends BaseComponentProps, InteractiveProps, SizableProps {
  /** Controlled selected date or null when cleared. */
  value?: Date | null
  /** Initial date when uncontrolled. */
  defaultValue?: Date
  /** Called when the value is committed or cleared; second arg is formatted string. */
  onChange?: (date: Date | null, dateString: string) => void
  /** Called when a day is selected in the calendar (including while picking time). */
  onCalendarChange?: (date: Date | null) => void
  /** Placeholder shown when no date is selected. */
  placeholder?: string
  /** Display and parse format (YYYY, MM, DD, HH, mm, ss). */
  format?: string
  /** Granularity: full date, month only, year only, or week (week mode uses date UI). */
  picker?: PickerMode
  /** When true, show default time UI; when an object, pass ShowTimeConfig. */
  showTime?: boolean | ShowTimeConfig
  /** When true, show a Today action in the footer (date mode without time). */
  showToday?: boolean
  /** When true with showTime, show a Now action in the footer. */
  showNow?: boolean
  /** When true, show a clear control when a value exists. */
  allowClear?: boolean
  /** Return true to disable specific calendar days. */
  disabledDate?: (date: Date) => boolean
  /** Sidebar shortcuts for common dates or ranges. */
  presets?: DatePreset[]
  /** Corner alignment of the dropdown relative to the input. */
  placement?: 'bottomLeft' | 'bottomRight' | 'topLeft' | 'topRight'
  /** Controlled visibility of the dropdown. */
  open?: boolean
  /** Called when the dropdown opens or closes. */
  onOpenChange?: (open: boolean) => void
  /** Called when the panel closes after an outside click (blur semantics). */
  onBlur?: () => void
  /** When true, the field shows text only; otherwise the input is editable. */
  inputReadOnly?: boolean
}

/** Props for selecting a start and end date (optional time) in one control. */
export interface RangePickerProps extends BaseComponentProps, InteractiveProps, SizableProps {
  /** Controlled range; null entries mean that end is not set yet. */
  value?: [Date | null, Date | null]
  /** Initial range when uncontrolled. */
  defaultValue?: [Date, Date]
  /** Called when the range changes; includes formatted strings for both ends. */
  onChange?: (dates: [Date | null, Date | null], dateStrings: [string, string]) => void
  /** Placeholders for start and end inputs. */
  placeholder?: [string, string]
  /** Display format for both values. */
  format?: string
  /** Enable time columns for both ends; object passes ShowTimeConfig. */
  showTime?: boolean | ShowTimeConfig
  /** When true, show a clear control when either end has a value. */
  allowClear?: boolean
  /** Return true to disable specific calendar days. */
  disabledDate?: (date: Date) => boolean
  /** Sidebar shortcuts; tuple values apply as full range, single dates duplicate to range. */
  presets?: DatePreset[]
  /** Node between start and end display (default arrow). */
  separator?: React.ReactNode
  /** Corner alignment of the range dropdown. */
  placement?: 'bottomLeft' | 'bottomRight' | 'topLeft' | 'topRight'
  /** Controlled visibility of the dropdown. */
  open?: boolean
  /** Called when the dropdown opens or closes. */
  onOpenChange?: (open: boolean) => void
}

// ── TimeScrollColumn ──

function TimeScrollColumn({
  items,
  value,
  onChange,
  unstyled,
}: {
  items: number[]
  value: number
  onChange: (v: number) => void
  unstyled?: boolean
}) {
  const colRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = colRef.current
    if (!el) return
    const active = el.querySelector('[data-active="true"]') as HTMLElement | null
    if (active?.scrollIntoView) active.scrollIntoView({ block: 'nearest' })
  }, [value])

  return (
    <div ref={colRef} className={unstyled ? '' : 'sg-dp-time-col'}>
      {items.map((n) => (
        <div
          key={n}
          data-active={n === value}
          className={
            unstyled ? '' : `sg-dp-time-cell${n === value ? ' sg-dp-time-cell-active' : ''}`
          }
          onClick={() => onChange(n)}
        >
          {String(n).padStart(2, '0')}
        </div>
      ))}
    </div>
  )
}

// ── TimePanel ──

function TimePanel({
  value,
  onChange,
  config,
  unstyled,
}: {
  value: Date
  onChange: (d: Date) => void
  config: ShowTimeConfig
  unstyled?: boolean
}) {
  const hourStep = config.hourStep ?? 1
  const minuteStep = config.minuteStep ?? 1
  const secondStep = config.secondStep ?? 1
  const showSeconds = (config.format ?? 'HH:mm:ss').includes('ss')

  const hours = useMemo(() => {
    const arr: number[] = []
    for (let i = 0; i < 24; i += hourStep) arr.push(i)
    return arr
  }, [hourStep])
  const minutes = useMemo(() => {
    const arr: number[] = []
    for (let i = 0; i < 60; i += minuteStep) arr.push(i)
    return arr
  }, [minuteStep])
  const seconds = useMemo(() => {
    const arr: number[] = []
    for (let i = 0; i < 60; i += secondStep) arr.push(i)
    return arr
  }, [secondStep])

  const setH = (h: number) => {
    const d = cloneDate(value)
    d.setHours(h)
    onChange(d)
  }
  const setM = (m: number) => {
    const d = cloneDate(value)
    d.setMinutes(m)
    onChange(d)
  }
  const setS = (s: number) => {
    const d = cloneDate(value)
    d.setSeconds(s)
    onChange(d)
  }

  return (
    <div className={unstyled ? '' : 'sg-dp-time-panel'}>
      <TimeScrollColumn
        items={hours}
        value={value.getHours()}
        onChange={setH}
        unstyled={unstyled}
      />
      <TimeScrollColumn
        items={minutes}
        value={value.getMinutes()}
        onChange={setM}
        unstyled={unstyled}
      />
      {showSeconds && (
        <TimeScrollColumn
          items={seconds}
          value={value.getSeconds()}
          onChange={setS}
          unstyled={unstyled}
        />
      )}
    </div>
  )
}

// ── CalendarPanel (shared by DatePicker and RangePicker) ──

function CalendarPanel({
  viewYear,
  viewMonth,
  selectedDate,
  hoverDate,
  rangeStart,
  rangeEnd,
  disabledDate,
  onSelect,
  onHover,
  onMonthChange,
  onYearChange,
  onTitleClick,
  unstyled,
}: {
  viewYear: number
  viewMonth: number
  selectedDate: Date | null
  hoverDate?: Date | null
  rangeStart?: Date | null
  rangeEnd?: Date | null
  disabledDate?: (d: Date) => boolean
  onSelect: (d: Date) => void
  onHover?: (d: Date | null) => void
  onMonthChange: (delta: number) => void
  onYearChange: (delta: number) => void
  /** When set, the month/year label opens the month picker (single DatePicker). */
  onTitleClick?: () => void
  unstyled?: boolean
}) {
  const config = useConfig()
  const monthNames = config.locale?.calendar?.monthNames ?? MONTH_NAMES
  const dayNames = config.locale?.calendar?.dayNames ?? DAY_NAMES
  const weeks = useMemo(() => getMonthGrid(viewYear, viewMonth), [viewYear, viewMonth])
  const monthLabel = `${monthNames[viewMonth]} ${viewYear}`

  const isInRange = useCallback(
    (d: Date): boolean => {
      if (!rangeStart) return false
      const end = rangeEnd ?? hoverDate
      if (!end) return false
      const s = startOfDay(rangeStart).getTime()
      const e = startOfDay(end).getTime()
      const t = startOfDay(d).getTime()
      return t > Math.min(s, e) && t < Math.max(s, e)
    },
    [rangeStart, rangeEnd, hoverDate],
  )

  const isRangeEdge = useCallback(
    (d: Date): 'start' | 'end' | null => {
      if (!rangeStart) return null
      if (isSameDay(d, rangeStart)) return 'start'
      const end = rangeEnd ?? hoverDate
      if (end && isSameDay(d, end)) return 'end'
      return null
    },
    [rangeStart, rangeEnd, hoverDate],
  )

  const dpLocale = useConfig().locale?.datePicker
  const prevYearLabel = dpLocale?.prevYear ?? 'Previous year'
  const nextYearLabel = dpLocale?.nextYear ?? 'Next year'
  const prevMonthLabel = dpLocale?.prevMonth ?? 'Previous month'
  const nextMonthLabel = dpLocale?.nextMonth ?? 'Next month'

  return (
    <div className={unstyled ? '' : 'sg-dp-panel'}>
      <div className={unstyled ? '' : 'sg-dp-panel-header'}>
        <button
          className={unstyled ? '' : 'sg-dp-nav-btn'}
          onClick={() => onYearChange(-1)}
          title={prevYearLabel}
          aria-label={prevYearLabel}
        >
          &laquo;
        </button>
        <button
          className={unstyled ? '' : 'sg-dp-nav-btn'}
          onClick={() => onMonthChange(-1)}
          title={prevMonthLabel}
          aria-label={prevMonthLabel}
        >
          &lsaquo;
        </button>
        {onTitleClick ? (
          <button
            type="button"
            className={unstyled ? '' : 'sg-dp-panel-title sg-dp-panel-title-btn'}
            onClick={onTitleClick}
          >
            {monthLabel}
          </button>
        ) : (
          <span className={unstyled ? '' : 'sg-dp-panel-title'}>{monthLabel}</span>
        )}
        <button
          className={unstyled ? '' : 'sg-dp-nav-btn'}
          onClick={() => onMonthChange(1)}
          title={nextMonthLabel}
          aria-label={nextMonthLabel}
        >
          &rsaquo;
        </button>
        <button
          className={unstyled ? '' : 'sg-dp-nav-btn'}
          onClick={() => onYearChange(1)}
          title={nextYearLabel}
          aria-label={nextYearLabel}
        >
          &raquo;
        </button>
      </div>
      <table className={unstyled ? '' : 'sg-dp-table'}>
        <thead>
          <tr>
            {dayNames.map((d) => (
              <th key={d} className={unstyled ? '' : 'sg-dp-th'}>
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, wi) => (
            <tr key={wi}>
              {week.map((cell) => {
                const disabled = disabledDate?.(cell.date) ?? false
                const selected = selectedDate ? isSameDay(cell.date, selectedDate) : false
                const today = isToday(cell.date)
                const inRange = isInRange(cell.date)
                const edge = isRangeEdge(cell.date)

                const cls = unstyled
                  ? ''
                  : [
                      'sg-dp-cell',
                      !cell.inMonth ? 'sg-dp-cell-outside' : '',
                      selected ? 'sg-dp-cell-selected' : '',
                      today ? 'sg-dp-cell-today' : '',
                      disabled ? 'sg-dp-cell-disabled' : '',
                      inRange ? 'sg-dp-cell-in-range' : '',
                      edge === 'start' ? 'sg-dp-cell-range-start' : '',
                      edge === 'end' ? 'sg-dp-cell-range-end' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')

                return (
                  <td
                    key={cell.date.toISOString()}
                    className={cls}
                    onClick={() => !disabled && onSelect(cell.date)}
                    onMouseEnter={() => onHover?.(cell.date)}
                    onMouseLeave={() => onHover?.(null)}
                  >
                    <span className={unstyled ? '' : 'sg-dp-cell-inner'}>{cell.day}</span>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── MonthPanel ──

function MonthPanel({
  viewYear,
  selectedDate,
  onSelect,
  onYearChange,
  unstyled,
}: {
  viewYear: number
  selectedDate: Date | null
  onSelect: (month: number) => void
  onYearChange: (delta: number) => void
  unstyled?: boolean
}) {
  const config = useConfig()
  const monthNames = config.locale?.calendar?.monthNames ?? MONTH_NAMES
  return (
    <div className={unstyled ? '' : 'sg-dp-panel'}>
      <div className={unstyled ? '' : 'sg-dp-panel-header'}>
        <button className={unstyled ? '' : 'sg-dp-nav-btn'} onClick={() => onYearChange(-1)}>
          &laquo;
        </button>
        <span className={unstyled ? '' : 'sg-dp-panel-title'}>{viewYear}</span>
        <button className={unstyled ? '' : 'sg-dp-nav-btn'} onClick={() => onYearChange(1)}>
          &raquo;
        </button>
      </div>
      <div className={unstyled ? '' : 'sg-dp-month-grid'}>
        {monthNames.map((name, i) => {
          const isSelected =
            selectedDate && selectedDate.getFullYear() === viewYear && selectedDate.getMonth() === i
          const isCurrent = new Date().getFullYear() === viewYear && new Date().getMonth() === i
          const cls = unstyled
            ? ''
            : [
                'sg-dp-month-cell',
                isSelected ? 'sg-dp-month-cell-selected' : '',
                isCurrent ? 'sg-dp-month-cell-current' : '',
              ]
                .filter(Boolean)
                .join(' ')
          return (
            <div key={i} className={cls} onClick={() => onSelect(i)}>
              {name.substring(0, 3)}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── YearPanel ──

function YearPanel({
  viewYear,
  selectedDate,
  onSelect,
  onDecadeChange,
  unstyled,
}: {
  viewYear: number
  selectedDate: Date | null
  onSelect: (year: number) => void
  onDecadeChange: (delta: number) => void
  unstyled?: boolean
}) {
  const startYear = Math.floor(viewYear / 10) * 10
  const years = useMemo(() => {
    const arr: number[] = []
    for (let y = startYear - 1; y <= startYear + 10; y++) arr.push(y)
    return arr
  }, [startYear])

  return (
    <div className={unstyled ? '' : 'sg-dp-panel'}>
      <div className={unstyled ? '' : 'sg-dp-panel-header'}>
        <button className={unstyled ? '' : 'sg-dp-nav-btn'} onClick={() => onDecadeChange(-10)}>
          &laquo;
        </button>
        <span className={unstyled ? '' : 'sg-dp-panel-title'}>
          {startYear} - {startYear + 9}
        </span>
        <button className={unstyled ? '' : 'sg-dp-nav-btn'} onClick={() => onDecadeChange(10)}>
          &raquo;
        </button>
      </div>
      <div className={unstyled ? '' : 'sg-dp-year-grid'}>
        {years.map((y) => {
          const isSelected = selectedDate?.getFullYear() === y
          const isCurrent = new Date().getFullYear() === y
          const isOutside = y < startYear || y > startYear + 9
          const cls = unstyled
            ? ''
            : [
                'sg-dp-year-cell',
                isSelected ? 'sg-dp-year-cell-selected' : '',
                isCurrent ? 'sg-dp-year-cell-current' : '',
                isOutside ? 'sg-dp-year-cell-outside' : '',
              ]
                .filter(Boolean)
                .join(' ')
          return (
            <div key={y} className={cls} onClick={() => onSelect(y)}>
              {y}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Presets sidebar ──

function PresetsSidebar({
  presets,
  onSelect,
  unstyled,
}: {
  presets: DatePreset[]
  onSelect: (v: DatePreset['value']) => void
  unstyled?: boolean
}) {
  return (
    <div className={unstyled ? '' : 'sg-dp-presets'}>
      {presets.map((p) => (
        <div
          key={p.label}
          className={unstyled ? '' : 'sg-dp-preset-item'}
          onClick={() => onSelect(p.value)}
        >
          {p.label}
        </div>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// DatePicker
// ═══════════════════════════════════════════════════════

/**
 * Single-date (or month/year) picker with optional time, presets, and typed input.
 * Dropdown placement, open state, and today/now actions are configurable.
 *
 * @default placeholder - `'Select date'`
 * @default picker - `'date'`
 * @default showTime - `false`
 * @default showToday - `true`
 * @default showNow - `false`
 * @default allowClear - `true`
 * @default placement - `'bottomLeft'`
 * @default inputReadOnly - `false`
 */
export function DatePicker({
  value,
  defaultValue,
  onChange,
  onCalendarChange,
  placeholder = 'Select date',
  format: formatProp,
  picker = 'date',
  showTime = false,
  showToday = true,
  showNow = false,
  allowClear = true,
  disabledDate,
  presets,
  disabled: disabledProp,
  loading,
  size: sizeProp,
  placement = 'bottomLeft',
  open: openProp,
  onOpenChange,
  onBlur,
  inputReadOnly = false,
  className,
  style,
  unstyled,
}: DatePickerProps) {
  const config = useConfig()
  const size = sizeProp ?? config.size ?? 'middle'
  const disabled = disabledProp ?? config.disabled ?? false
  const cal = config.locale?.calendar
  const todayBtnLabel = cal?.today ?? 'Today'
  const nowBtnLabel = cal?.now ?? 'Now'
  const okBtnLabel = config.locale?.modal?.okText ?? 'OK'

  const timeConfig: ShowTimeConfig = typeof showTime === 'object' ? showTime : {}
  const hasTime = !!showTime
  const fmt =
    formatProp ??
    (hasTime
      ? 'YYYY-MM-DD HH:mm:ss'
      : picker === 'month'
        ? 'YYYY-MM'
        : picker === 'year'
          ? 'YYYY'
          : 'YYYY-MM-DD')

  const normalizedValue = toValidDate(value)
  const normalizedDefault = toValidDate(defaultValue)

  const [internalValue, setInternalValue] = useState<Date | null>(
    value !== undefined ? normalizedValue : normalizedDefault,
  )
  const [internalOpen, setInternalOpen] = useState(false)
  const [inputText, setInputText] = useState('')
  const [isInputting, setIsInputting] = useState(false)

  const currentValue = value !== undefined ? normalizedValue : internalValue
  const isOpen = openProp ?? internalOpen

  const [viewYear, setViewYear] = useState(() => (currentValue ?? new Date()).getFullYear())
  const [viewMonth, setViewMonth] = useState(() => (currentValue ?? new Date()).getMonth())
  const [pickerLevel, setPickerLevel] = useState<'date' | 'month' | 'year'>(
    picker === 'year' ? 'year' : picker === 'month' ? 'month' : 'date',
  )
  const [tempTime, setTempTime] = useState<Date>(
    () => currentValue ?? timeConfig.defaultValue ?? new Date(),
  )

  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const closeDropdown = useCallback(() => {
    setInternalOpen(false)
    onOpenChange?.(false)
    setIsInputting(false)
    onBlur?.()
  }, [onOpenChange, onBlur])

  const closeRef = useRef(closeDropdown)
  closeRef.current = closeDropdown

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        closeRef.current()
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  useEffect(() => {
    if (value !== undefined) {
      const normalized = toValidDate(value)
      setInternalValue(normalized)
      if (normalized) {
        setViewYear(normalized.getFullYear())
        setViewMonth(normalized.getMonth())
        setTempTime(normalized)
      }
    }
  }, [value])

  const openDropdown = () => {
    if (disabled || loading) return
    setInternalOpen(true)
    onOpenChange?.(true)
    setPickerLevel(picker === 'year' ? 'year' : picker === 'month' ? 'month' : 'date')
    if (currentValue) {
      setViewYear(currentValue.getFullYear())
      setViewMonth(currentValue.getMonth())
      setTempTime(currentValue)
    }
  }

  const commitValue = (d: Date | null) => {
    setInternalValue(d)
    onChange?.(d, d ? formatDate(d, fmt) : '')
  }

  const handleDateSelect = (date: Date) => {
    onCalendarChange?.(date)

    if (hasTime) {
      const merged = cloneDate(date)
      merged.setHours(tempTime.getHours(), tempTime.getMinutes(), tempTime.getSeconds())
      setTempTime(merged)
      setInternalValue(merged)
      return
    }

    commitValue(date)
    closeDropdown()
  }

  const handleMonthSelect = (month: number) => {
    if (picker === 'month') {
      const d = new Date(viewYear, month, 1)
      commitValue(d)
      closeDropdown()
      return
    }
    setViewMonth(month)
    setPickerLevel('date')
  }

  const handleYearSelect = (year: number) => {
    if (picker === 'year') {
      const d = new Date(year, 0, 1)
      commitValue(d)
      closeDropdown()
      return
    }
    setViewYear(year)
    setPickerLevel(picker === 'month' ? 'month' : 'date')
  }

  const handleTimeChange = (d: Date) => {
    setTempTime(d)
    if (currentValue) {
      const merged = cloneDate(currentValue)
      merged.setHours(d.getHours(), d.getMinutes(), d.getSeconds())
      setInternalValue(merged)
    }
  }

  const handleTimeOk = () => {
    const final = currentValue ?? tempTime
    commitValue(final)
    closeDropdown()
  }

  const handleToday = () => {
    const today = new Date()
    if (hasTime) {
      setViewYear(today.getFullYear())
      setViewMonth(today.getMonth())
      setInternalValue(today)
      setTempTime(today)
    } else {
      commitValue(today)
      closeDropdown()
    }
  }

  const handleNow = () => {
    const now = new Date()
    commitValue(now)
    closeDropdown()
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    commitValue(null)
  }

  const handlePresetSelect = (val: DatePreset['value']) => {
    const d = Array.isArray(val) ? val[0] : val
    commitValue(d)
    closeDropdown()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value)
    setIsInputting(true)
  }

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isInputting) {
      const parsed = parseDate(inputText, fmt)
      if (parsed && !isNaN(parsed.getTime())) {
        commitValue(parsed)
        closeDropdown()
      }
    }
    if (e.key === 'Escape') closeDropdown()
  }

  const displayText = isInputting ? inputText : currentValue ? formatDate(currentValue, fmt) : ''

  const wrapperCls = unstyled
    ? (className ?? '')
    : [
        'sg-datepicker',
        `sg-datepicker-${size}`,
        isOpen ? 'sg-datepicker-open' : '',
        disabled ? 'sg-datepicker-disabled' : '',
        loading ? 'sg-datepicker-loading' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')

  const placementCls = `sg-dp-dropdown-${placement}`

  return (
    <div className={wrapperCls} ref={ref} style={style}>
      <div
        className={unstyled ? '' : 'sg-datepicker-input'}
        onClick={openDropdown}
        role="combobox"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-disabled={disabled}
      >
        {inputReadOnly ? (
          <span
            className={
              unstyled
                ? ''
                : ['sg-datepicker-input-text', displayText ? '' : 'sg-datepicker-placeholder']
                    .filter(Boolean)
                    .join(' ')
            }
          >
            {displayText || placeholder}
          </span>
        ) : (
          <input
            ref={inputRef}
            className={unstyled ? '' : 'sg-datepicker-input-text'}
            value={displayText}
            placeholder={placeholder}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            onFocus={openDropdown}
            readOnly={disabled}
          />
        )}
        <span className={unstyled ? '' : 'sg-datepicker-suffix'}>
          {loading ? (
            <Spin size="small" unstyled={unstyled} />
          ) : (
            <>
              {allowClear && currentValue && (
                <span className={unstyled ? '' : 'sg-datepicker-clear'} onClick={handleClear}>
                  &times;
                </span>
              )}
              <svg
                className={unstyled ? '' : 'sg-datepicker-icon'}
                viewBox="0 0 16 16"
                width="14"
                height="14"
                fill="currentColor"
              >
                <path d="M11 1V0h1v1h2.5A1.5 1.5 0 0116 2.5v12a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 010 14.5v-12A1.5 1.5 0 011.5 1H4V0h1v1h6zM1.5 2a.5.5 0 00-.5.5V4h14V2.5a.5.5 0 00-.5-.5h-13zM15 5H1v9.5a.5.5 0 00.5.5h13a.5.5 0 00.5-.5V5z" />
              </svg>
            </>
          )}
        </span>
      </div>

      {isOpen && (
        <div className={unstyled ? '' : `sg-dp-dropdown ${placementCls}`}>
          <div className={unstyled ? '' : 'sg-dp-dropdown-inner'}>
            {presets && presets.length > 0 && (
              <PresetsSidebar presets={presets} onSelect={handlePresetSelect} unstyled={unstyled} />
            )}
            <div className={unstyled ? '' : 'sg-dp-content'}>
              {pickerLevel === 'date' && (
                <CalendarPanel
                  viewYear={viewYear}
                  viewMonth={viewMonth}
                  selectedDate={currentValue}
                  disabledDate={disabledDate}
                  onSelect={handleDateSelect}
                  onMonthChange={(d) => {
                    const m = viewMonth + d
                    if (m < 0) {
                      setViewMonth(11)
                      setViewYear(viewYear - 1)
                    } else if (m > 11) {
                      setViewMonth(0)
                      setViewYear(viewYear + 1)
                    } else setViewMonth(m)
                  }}
                  onYearChange={(d) => setViewYear(viewYear + d)}
                  onTitleClick={
                    picker === 'date' && pickerLevel === 'date'
                      ? () => setPickerLevel('month')
                      : undefined
                  }
                  unstyled={unstyled}
                />
              )}
              {pickerLevel === 'month' && (
                <MonthPanel
                  viewYear={viewYear}
                  selectedDate={currentValue}
                  onSelect={handleMonthSelect}
                  onYearChange={(d) => setViewYear(viewYear + d)}
                  unstyled={unstyled}
                />
              )}
              {pickerLevel === 'year' && (
                <YearPanel
                  viewYear={viewYear}
                  selectedDate={currentValue}
                  onSelect={handleYearSelect}
                  onDecadeChange={(d) => setViewYear(viewYear + d)}
                  unstyled={unstyled}
                />
              )}

              {hasTime && pickerLevel === 'date' && (
                <TimePanel
                  value={tempTime}
                  onChange={handleTimeChange}
                  config={timeConfig}
                  unstyled={unstyled}
                />
              )}

              <div className={unstyled ? '' : 'sg-dp-footer'}>
                <div className={unstyled ? '' : 'sg-dp-footer-start'}>
                  {showToday && !hasTime && pickerLevel === 'date' && (
                    <button
                      className={unstyled ? '' : 'sg-dp-footer-btn sg-dp-today-btn'}
                      onClick={handleToday}
                    >
                      {todayBtnLabel}
                    </button>
                  )}
                  {showNow && hasTime && (
                    <button
                      className={unstyled ? '' : 'sg-dp-footer-btn sg-dp-now-btn'}
                      onClick={handleNow}
                    >
                      {nowBtnLabel}
                    </button>
                  )}
                </div>
                <div className={unstyled ? '' : 'sg-dp-footer-end'}>
                  {hasTime && (
                    <button
                      className={unstyled ? '' : 'sg-dp-footer-btn sg-dp-ok-btn'}
                      onClick={handleTimeOk}
                    >
                      {okBtnLabel}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// RangePicker
// ═══════════════════════════════════════════════════════

/**
 * Two-month range selector with optional time columns and preset shortcuts.
 * Commits the range after the second date is chosen (or OK when time is enabled).
 *
 * @default placeholder - `['Start date', 'End date']`
 * @default showTime - `false`
 * @default allowClear - `true`
 * @default separator - `'→'`
 * @default placement - `'bottomLeft'`
 */
export function RangePicker({
  value,
  defaultValue,
  onChange,
  placeholder = ['Start date', 'End date'],
  format: formatProp,
  showTime = false,
  allowClear = true,
  disabledDate,
  presets,
  separator = '→',
  disabled: disabledProp,
  loading,
  size: sizeProp,
  placement = 'bottomLeft',
  open: openProp,
  onOpenChange,
  className,
  style,
  unstyled,
}: RangePickerProps) {
  const config = useConfig()
  const size = sizeProp ?? config.size ?? 'middle'
  const disabled = disabledProp ?? config.disabled ?? false
  const okBtnLabel = config.locale?.modal?.okText ?? 'OK'

  const hasTime = !!showTime
  const timeConfig: ShowTimeConfig = typeof showTime === 'object' ? showTime : {}
  const fmt = formatProp ?? (hasTime ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD')

  const normalizeRange = (
    raw: [unknown, unknown] | null | undefined,
  ): [Date | null, Date | null] => [toValidDate(raw?.[0]), toValidDate(raw?.[1])]

  const normalizedValue = value ? normalizeRange(value) : null
  const normalizedDefault = defaultValue ? normalizeRange(defaultValue) : null

  const [internalValue, setInternalValue] = useState<[Date | null, Date | null]>(
    normalizedValue ?? normalizedDefault ?? [null, null],
  )
  const [internalOpen, setInternalOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState<0 | 1>(0)
  const [hoverDate, setHoverDate] = useState<Date | null>(null)

  const currentValue = normalizedValue ?? internalValue
  const isOpen = openProp ?? internalOpen

  const now = new Date()
  const [leftYear, setLeftYear] = useState(() => (currentValue[0] ?? now).getFullYear())
  const [leftMonth, setLeftMonth] = useState(() => (currentValue[0] ?? now).getMonth())
  const rightYear = leftMonth === 11 ? leftYear + 1 : leftYear
  const rightMonth = leftMonth === 11 ? 0 : leftMonth + 1

  const [tempTimes, setTempTimes] = useState<[Date, Date]>([
    currentValue[0] ?? now,
    currentValue[1] ?? now,
  ])

  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setInternalOpen(false)
        onOpenChange?.(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [onOpenChange])

  useEffect(() => {
    if (value) setInternalValue(normalizeRange(value))
  }, [value])

  const openDropdown = () => {
    if (disabled || loading) return
    setInternalOpen(true)
    onOpenChange?.(true)
  }

  const commitRange = (dates: [Date | null, Date | null]) => {
    setInternalValue(dates)
    onChange?.(dates, [
      dates[0] ? formatDate(dates[0], fmt) : '',
      dates[1] ? formatDate(dates[1], fmt) : '',
    ])
  }

  const handleDateSelect = (date: Date) => {
    if (activeIndex === 0) {
      setInternalValue([date, null])
      setActiveIndex(1)
    } else {
      let start = currentValue[0]
      let end = date
      if (start && end.getTime() < start.getTime()) {
        ;[start, end] = [end, start]
      }

      if (hasTime) {
        const s = start ? cloneDate(start) : cloneDate(date)
        s.setHours(tempTimes[0].getHours(), tempTimes[0].getMinutes(), tempTimes[0].getSeconds())
        const e = cloneDate(end)
        e.setHours(tempTimes[1].getHours(), tempTimes[1].getMinutes(), tempTimes[1].getSeconds())
        setInternalValue([s, e])
      } else {
        commitRange([start, end])
        setInternalOpen(false)
        onOpenChange?.(false)
        setActiveIndex(0)
      }
    }
  }

  const handleTimeOk = () => {
    commitRange(currentValue)
    setInternalOpen(false)
    onOpenChange?.(false)
    setActiveIndex(0)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    commitRange([null, null])
    setActiveIndex(0)
  }

  const handlePresetSelect = (val: DatePreset['value']) => {
    if (Array.isArray(val)) {
      commitRange(val)
    } else {
      commitRange([val, val])
    }
    setInternalOpen(false)
    onOpenChange?.(false)
  }

  const moveLeftMonth = (d: number) => {
    const m = leftMonth + d
    if (m < 0) {
      setLeftMonth(11)
      setLeftYear(leftYear - 1)
    } else if (m > 11) {
      setLeftMonth(0)
      setLeftYear(leftYear + 1)
    } else setLeftMonth(m)
  }

  const wrapperCls = unstyled
    ? (className ?? '')
    : [
        'sg-datepicker',
        'sg-datepicker-range',
        `sg-datepicker-${size}`,
        isOpen ? 'sg-datepicker-open' : '',
        disabled ? 'sg-datepicker-disabled' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')

  return (
    <div className={wrapperCls} ref={ref} style={style}>
      <div
        className={unstyled ? '' : 'sg-datepicker-input sg-datepicker-range-input'}
        onClick={openDropdown}
      >
        <span
          className={
            unstyled
              ? ''
              : `sg-datepicker-range-part${activeIndex === 0 ? ' sg-datepicker-range-active' : ''}`
          }
          onClick={(e) => {
            e.stopPropagation()
            setActiveIndex(0)
            openDropdown()
          }}
        >
          {currentValue[0] ? formatDate(currentValue[0], fmt) : placeholder[0]}
        </span>
        <span className={unstyled ? '' : 'sg-datepicker-separator'}>{separator}</span>
        <span
          className={
            unstyled
              ? ''
              : `sg-datepicker-range-part${activeIndex === 1 ? ' sg-datepicker-range-active' : ''}`
          }
          onClick={(e) => {
            e.stopPropagation()
            setActiveIndex(1)
            openDropdown()
          }}
        >
          {currentValue[1] ? formatDate(currentValue[1], fmt) : placeholder[1]}
        </span>
        <span className={unstyled ? '' : 'sg-datepicker-suffix'}>
          {allowClear && (currentValue[0] || currentValue[1]) && (
            <span className={unstyled ? '' : 'sg-datepicker-clear'} onClick={handleClear}>
              &times;
            </span>
          )}
          <svg
            className={unstyled ? '' : 'sg-datepicker-icon'}
            viewBox="0 0 16 16"
            width="14"
            height="14"
            fill="currentColor"
          >
            <path d="M11 1V0h1v1h2.5A1.5 1.5 0 0116 2.5v12a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 010 14.5v-12A1.5 1.5 0 011.5 1H4V0h1v1h6zM1.5 2a.5.5 0 00-.5.5V4h14V2.5a.5.5 0 00-.5-.5h-13zM15 5H1v9.5a.5.5 0 00.5.5h13a.5.5 0 00.5-.5V5z" />
          </svg>
        </span>
      </div>

      {isOpen && (
        <div
          className={
            unstyled ? '' : `sg-dp-dropdown sg-dp-dropdown-range sg-dp-dropdown-${placement}`
          }
        >
          <div className={unstyled ? '' : 'sg-dp-dropdown-inner'}>
            {presets && presets.length > 0 && (
              <PresetsSidebar presets={presets} onSelect={handlePresetSelect} unstyled={unstyled} />
            )}
            <div className={unstyled ? '' : 'sg-dp-content'}>
              <div className={unstyled ? '' : 'sg-dp-range-panels'}>
                <CalendarPanel
                  viewYear={leftYear}
                  viewMonth={leftMonth}
                  selectedDate={null}
                  rangeStart={currentValue[0]}
                  rangeEnd={currentValue[1]}
                  hoverDate={hoverDate}
                  disabledDate={disabledDate}
                  onSelect={handleDateSelect}
                  onHover={setHoverDate}
                  onMonthChange={(d) => moveLeftMonth(d)}
                  onYearChange={(d) => setLeftYear(leftYear + d)}
                  unstyled={unstyled}
                />
                <CalendarPanel
                  viewYear={rightYear}
                  viewMonth={rightMonth}
                  selectedDate={null}
                  rangeStart={currentValue[0]}
                  rangeEnd={currentValue[1]}
                  hoverDate={hoverDate}
                  disabledDate={disabledDate}
                  onSelect={handleDateSelect}
                  onHover={setHoverDate}
                  onMonthChange={(d) => moveLeftMonth(d)}
                  onYearChange={(d) => setLeftYear(leftYear + d)}
                  unstyled={unstyled}
                />
              </div>

              {hasTime && currentValue[0] && currentValue[1] && (
                <div className={unstyled ? '' : 'sg-dp-range-time'}>
                  <TimePanel
                    value={tempTimes[0]}
                    onChange={(d) => setTempTimes([d, tempTimes[1]])}
                    config={timeConfig}
                    unstyled={unstyled}
                  />
                  <TimePanel
                    value={tempTimes[1]}
                    onChange={(d) => setTempTimes([tempTimes[0], d])}
                    config={timeConfig}
                    unstyled={unstyled}
                  />
                </div>
              )}

              <div className={unstyled ? '' : 'sg-dp-footer'}>
                {hasTime && (
                  <button
                    className={unstyled ? '' : 'sg-dp-footer-btn sg-dp-ok-btn'}
                    onClick={handleTimeOk}
                  >
                    {okBtnLabel}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Attach RangePicker to DatePicker for Ant-like API: DatePicker.RangePicker
;(DatePicker as unknown as { RangePicker: typeof RangePicker }).RangePicker = RangePicker
