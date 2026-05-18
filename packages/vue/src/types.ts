import type { CSSProperties } from 'vue'

/** Available component size variants. */
export type SizeType = 'small' | 'middle' | 'large'

/** Common props shared by all Skygraph Vue components. */
export interface BaseComponentProps {
  /** Additional CSS class name. */
  class?: string
  /** Inline CSS styles. */
  style?: CSSProperties
  /** When `true`, all built-in styles are stripped — the component renders bare semantic HTML. */
  unstyled?: boolean
}

/** Locale strings for the Modal component. */
export interface ModalLocale {
  /** Label for the OK / confirm button. */
  okText?: string
  /** Label for the Cancel button. */
  cancelText?: string
}

/** Locale strings for the Popconfirm component. */
export interface PopconfirmLocale {
  /** Label for the OK / confirm button. */
  okText?: string
  /** Label for the Cancel button. */
  cancelText?: string
}

/** Locale strings for the Empty component. */
export interface EmptyLocale {
  /** Default description shown when no data is available. */
  description?: string
}

/** Locale strings for the Pagination component. */
export interface PaginationLocale {
  /** Text shown before the total count (e.g. "Total"). */
  totalPrefix?: string
  /** Label for the page-size selector (e.g. "items / page"). */
  itemsPerPage?: string
  /** Label for the page-jump input (e.g. "Go to"). */
  jump?: string
  /** Unit label for a page (e.g. "page"). */
  page?: string
}

/** Locale strings for {@link SgInputPassword}. */
export interface InputPasswordLocale {
  showPassword?: string
  hidePassword?: string
  strengthWeak?: string
  strengthMedium?: string
  strengthStrong?: string
  strengthVeryStrong?: string
}

/** Locale strings for {@link SgSearchInput}. */
export interface SearchInputLocale {
  placeholder?: string
  clear?: string
  search?: string
}

/** Locale strings for {@link SgTagInput}. */
export interface TagInputLocale {
  placeholder?: string
  removeTag?: string
}

/** Locale strings for {@link SgPinInput}. */
export interface PinInputLocale {
  ariaLabel?: string
}

/** Locale strings for {@link SgInlineEdit}. */
export interface InlineEditLocale {
  placeholder?: string
  save?: string
  cancel?: string
}

/** Locale strings for {@link SgCalendar} and the DatePicker calendar grid. */
export interface CalendarLocale {
  /** Twelve month names, January first. */
  monthNames?: string[]
  /** Seven short day names, Sunday first. */
  dayNames?: string[]
  /** Label of the “Today” footer button. */
  today?: string
  /** Label of the “Now” footer button. */
  now?: string
  /** Short label for the optional week column. */
  week?: string
  /** Aria label / tooltip for the previous-year navigation button. */
  prevYear?: string
  /** Aria label / tooltip for the next-year navigation button. */
  nextYear?: string
  /** Aria label / tooltip for the previous-month navigation button. */
  prevMonth?: string
  /** Aria label / tooltip for the next-month navigation button. */
  nextMonth?: string
}

/** Locale strings shared by {@link SgDatePicker} / {@link SgRangePicker}. */
export interface DatePickerLocale {
  prevYear?: string
  nextYear?: string
  prevMonth?: string
  nextMonth?: string
}

/** Root locale object that aggregates all component-level locales. */
export interface SgLocale {
  modal?: ModalLocale
  popconfirm?: PopconfirmLocale
  empty?: EmptyLocale
  pagination?: PaginationLocale
  inputPassword?: InputPasswordLocale
  searchInput?: SearchInputLocale
  tagInput?: TagInputLocale
  pinInput?: PinInputLocale
  inlineEdit?: InlineEditLocale
  calendar?: CalendarLocale
  datePicker?: DatePickerLocale
}
