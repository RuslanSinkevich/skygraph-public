import type React from 'react'
import type { CalendarLocale } from '../../../types/locale'

export type { CalendarLocale }

/** Values passed to `headerRender` for custom calendar chrome. */
export interface CalendarHeaderInfo {
  /** Date currently shown in the panel (year/month context). */
  value: Date
  /** Whether the panel shows the month grid or year/month picker. */
  type: 'month' | 'year'
  /** Updates the panel date (e.g. month/year selects). */
  onChange: (date: Date) => void
  /** Switches between month and year panel modes. */
  onTypeChange: (type: 'month' | 'year') => void
}

/** Context for `cellRender` describing which cell kind is being rendered. */
export interface CalendarCellInfo {
  /** `date` for day cells, `month` for month tiles in year view. */
  type: 'date' | 'month'
}

/** Calendar event marker for a specific date. */
export interface CalendarEvent {
  /** Date of the event. */
  date: Date
  /** Short label shown in the cell. */
  title: string
  /** Color dot or badge color. */
  color?: string
  /** Unique key. */
  key?: string
}

/** Props for the month/year calendar with optional custom header and cells. */
export interface CalendarProps {
  /** Controlled selected date. */
  value?: Date
  /** Initial selected date when uncontrolled. */
  defaultValue?: Date
  /** Fired when the selected date changes. */
  onChange?: (date: Date) => void
  /** Fired when the visible panel date or view mode changes. */
  onPanelChange?: (date: Date, mode: 'month' | 'year') => void
  /** Fired when a date is chosen (including month pick in year view). */
  onSelect?: (date: Date) => void
  /** Controlled panel mode: month grid or year/month list. */
  mode?: 'month' | 'year'
  /**
   * Uses full layout including footer "today" when `true`.
   * @default true
   */
  fullscreen?: boolean
  /** Custom header UI; receives navigation state and handlers. */
  headerRender?: (info: CalendarHeaderInfo) => React.ReactNode
  /** Extra content inside day or month cells. */
  cellRender?: (date: Date, info: CalendarCellInfo) => React.ReactNode
  /** Marks dates non-interactive when it returns `true`. */
  disabledDate?: (date: Date) => boolean
  /** Overrides default English month/day names and today label. */
  locale?: CalendarLocale
  /** Root element class name. */
  className?: string
  /** Root element inline styles. */
  style?: React.CSSProperties
  /** Renders semantic structure without Skygraph calendar CSS. */
  unstyled?: boolean

  /** Shows ISO week numbers on the left of each row. */
  showWeekNumber?: boolean
  /** First day of week: 0=Sunday, 1=Monday, etc. @default 0 */
  weekStartDay?: 0 | 1 | 2 | 3 | 4 | 5 | 6

  /** Enables range selection mode. */
  rangeSelection?: boolean
  /** Controlled range value [start, end]. */
  rangeValue?: [Date | null, Date | null]
  /** Default range when uncontrolled. */
  defaultRangeValue?: [Date | null, Date | null]
  /** Fired when range changes. */
  onRangeChange?: (range: [Date | null, Date | null]) => void

  /** Enables multiple date selection mode. */
  multipleSelection?: boolean
  /** Controlled array of selected dates. */
  multipleValue?: Date[]
  /** Default multiple selected dates. */
  defaultMultipleValue?: Date[]
  /** Fired when multiple selection changes. */
  onMultipleChange?: (dates: Date[]) => void

  /** Event markers per date. */
  events?: CalendarEvent[]
  /** Max events to show per cell before "+N more". @default 3 */
  maxEvents?: number

  /** Enables keyboard navigation. @default true */
  keyboard?: boolean
}

export const DEFAULT_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export const DEFAULT_DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
