import type React from 'react'

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
  /** Accessible name for the surrounding `<nav>` element. */
  ariaLabel?: string
}

/**
 * Localizable strings for the `Table` component. This is the *single*
 * canonical declaration; `complex/Table/types.ts` re-exports the same type
 * to keep imports stable inside the Table subtree.
 */
export interface TableLocale {
  /** Empty state body text. */
  emptyText?: React.ReactNode
  /** Filter reset button label. */
  filterReset?: string
  /** Filter confirm button label. */
  filterConfirm?: string
  /** Placeholder for filter list search. */
  filterSearchPlaceholder?: string
  /** Message when filter search has no matches. */
  filterEmptyText?: string
  /** Toolbar global search placeholder. */
  searchPlaceholder?: string
  /** Ascending sort affordance in header. */
  sortAsc?: React.ReactNode
  /** Descending sort affordance in header. */
  sortDesc?: React.ReactNode
  /** Row/tree expander icon. */
  expandIcon?: React.ReactNode
  /** Default column filter icon. */
  filterIcon?: React.ReactNode
  /** Column search-mode filter icon. */
  searchIcon?: React.ReactNode
  /** Formats total row count label. */
  totalRows?: (count: number) => string
  /** Formats selection count in the summary bar. */
  selectedRows?: (count: number) => string
  /** CSV export toolbar label. */
  exportCSV?: string
  /** JSON export toolbar label. */
  exportJSON?: string
  /** Copy table toolbar label. */
  copyTable?: string
  /** Pin column to left context label. */
  pinLeft?: string
  /** Pin column to right context label. */
  pinRight?: string
  /** Unpin column context label. */
  unpin?: string
  /** Column visibility menu trigger label. */
  showColumns?: string
  /** Print toolbar label. */
  print?: string
  /** Enter fullscreen label. */
  fullscreen?: string
  /** Exit fullscreen label. */
  exitFullscreen?: string
  /** Density menu trigger label. */
  density?: string
  /** Compact density option. */
  densitySmall?: string
  /** Default density option. */
  densityMiddle?: string
  /** Comfortable density option. */
  densityLarge?: string
  /** Collapse all groups toolbar label. */
  groupCollapse?: string
  /** Expand all groups toolbar label. */
  groupExpand?: string
  /** Aggregate label for sum. */
  sum?: string
  /** Aggregate label for average. */
  avg?: string
  /** Aggregate label for count. */
  count?: string
  /** Aggregate label for minimum. */
  min?: string
  /** Aggregate label for maximum. */
  max?: string
  /** Copy success toast (reserved). */
  copiedToClipboard?: string
  /** Row number column header. */
  rowNumber?: string
  /** Toolbar dropdown trigger label for picking a `groupBy` field. */
  groupByLabel?: string
  /** "No grouping" option label inside the group-by dropdown. */
  groupByNone?: string
  /** Placeholder for advanced filter scalar value input. */
  filterAdvancedValuePlaceholder?: string
  /** Placeholder for advanced filter `in` / `notIn` comma-separated input. */
  filterAdvancedInPlaceholder?: string
  /** Placeholder for the upper bound of `between` operator. */
  filterAdvancedBetweenMaxPlaceholder?: string
  /** Operator label: equal. */
  filterOpEq?: string
  /** Operator label: not equal. */
  filterOpNeq?: string
  /** Operator label: less than. */
  filterOpLt?: string
  /** Operator label: less than or equal. */
  filterOpLte?: string
  /** Operator label: greater than. */
  filterOpGt?: string
  /** Operator label: greater than or equal. */
  filterOpGte?: string
  /** Operator label: between (inclusive). */
  filterOpBetween?: string
  /** Operator label: in list. */
  filterOpIn?: string
  /** Operator label: not in list. */
  filterOpNotIn?: string
  /** Operator label: contains substring. */
  filterOpContains?: string
  /** Operator label: starts with. */
  filterOpStartsWith?: string
  /** Operator label: ends with. */
  filterOpEndsWith?: string
  /** Operator label: is empty / null. */
  filterOpIsEmpty?: string
  /** Operator label: is not empty. */
  filterOpIsNotEmpty?: string
}

/** Locale strings for the DataGrid component. */
export interface DataGridLocale {
  /** Text shown when the grid has no data. */
  noData?: string
  /** Label for the "Select all" action. */
  selectAll?: string
}

/** Locale strings for the Modal component. */
export interface ModalLocale {
  /** Label for the OK / confirm button. */
  okText?: string
  /** Label for the Cancel button. */
  cancelText?: string
  /** Accessible name for the close (×) button. */
  closeAriaLabel?: string
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

/** Locale strings for form-related components. */
export interface FormLocale {
  /** Marker text for required fields. */
  required?: string
  /** Marker text for optional fields. */
  optional?: string
  /** Label for the submit button. */
  submitText?: string
  /** Label for the reset button. */
  resetText?: string
}

/** Locale strings for the Upload component. */
export interface UploadLocale {
  /** Label for the upload trigger. */
  uploadText?: string
  /** Label for the remove-file action. */
  removeFile?: string
  /** Text shown when an upload fails. */
  uploadError?: string
  /** Label for the preview-file action. */
  previewFile?: string
  /** Accessible name for the upload-file `<input type="file">`. */
  uploadAriaLabel?: string
}

/** Locale strings for the Transfer component. */
export interface TransferLocale {
  /** Titles for the left and right lists. */
  titles?: [string, string]
  /** Placeholder for the search input inside lists. */
  searchPlaceholder?: string
  /** Singular unit label for items (e.g. "item"). */
  itemUnit?: string
  /** Plural unit label for items (e.g. "items"). */
  itemsUnit?: string
  /** Content shown when no items match the search. */
  notFoundContent?: string
  /** Label for the "Select all" checkbox. */
  selectAll?: string
  /** Label for the "Deselect all" checkbox. */
  deselectAll?: string
}

/** Locale strings for the Calendar component. */
export interface CalendarLocale {
  /** Localized month names (12 entries). */
  monthNames?: string[]
  /** Localized day-of-week names (7 entries, starting from Sunday or Monday depending on locale). */
  dayNames?: string[]
  /** Label for the "Today" button. */
  today?: string
  /** Label for the "Now" shortcut when picking date + time. */
  now?: string
  /** Column header for the ISO week number when `showWeekNumber` is enabled. */
  week?: string
  /** Tooltip on the "previous year" navigation button. */
  prevYear?: string
  /** Tooltip on the "next year" navigation button. */
  nextYear?: string
  /** Tooltip on the "previous month" navigation button. */
  prevMonth?: string
  /** Tooltip on the "next month" navigation button. */
  nextMonth?: string
}

/** Locale strings for the InputPassword component. */
export interface InputPasswordLocale {
  /** Accessible label for the visibility toggle when password is hidden. */
  showPassword?: string
  /** Accessible label for the visibility toggle when password is visible. */
  hidePassword?: string
}

/** Locale strings for the SearchInput component. */
export interface SearchInputLocale {
  /** Accessible label for the clear (×) button. */
  clear?: string
}

/** Locale strings for the InlineEdit component. */
export interface InlineEditLocale {
  /** Accessible label for the save (✓) button. */
  save?: string
  /** Accessible label for the cancel (✕) button. */
  cancel?: string
}

/** Locale strings for the TagInput component. */
export interface TagInputLocale {
  /**
   * Formats the per-tag remove (×) button accessible label.
   * Default: `(tag) => `Remove ${tag}``.
   */
  removeTag?: (tag: string) => string
}

/** Locale strings for the Drawer component. */
export interface DrawerLocale {
  /** Accessible label for the close button. */
  closeAriaLabel?: string
}

/** Locale strings for the Notification component. */
export interface NotificationLocale {
  /** Accessible label for the close button on each toast. */
  closeAriaLabel?: string
}

/** Locale strings for the Tag component. */
export interface TagLocale {
  /** Accessible label for the close (×) button on closable tags. */
  closeAriaLabel?: string
}

/** Locale strings for the Spin component. */
export interface SpinLocale {
  /** Accessible label for the spinner role. */
  loading?: string
}

/** Locale strings for the Skeleton component. */
export interface SkeletonLocale {
  /** Accessible label announced while content is loading. */
  loading?: string
}

/** Locale strings for the Breadcrumb component. */
export interface BreadcrumbLocale {
  /** Accessible name for the surrounding `<nav>` element. */
  ariaLabel?: string
}

/** Locale strings for the Carousel component. */
export interface CarouselLocale {
  /** Formats the per-slide indicator accessible label. Default `(i) => `Slide ${i}``. */
  slide?: (index: number) => string
}

/** Locale strings for the Rate component. */
export interface RateLocale {
  /** Accessible label for the radio-group root. */
  ariaLabel?: string
  /** Formats the per-star accessible label (default `(n) => `${n} star${n > 1 ? 's' : ''}``). */
  star?: (count: number) => string
}

/** Locale strings for the Charts components. */
export interface ChartsLocale {
  /** Accessible label for `<LineChart>`. */
  lineChart?: string
  /** Accessible label for `<BarChart>`. */
  barChart?: string
  /** Accessible label for `<AreaChart>`. */
  areaChart?: string
  /** Accessible label for `<PieChart>`. */
  pieChart?: string
  /** Accessible label for `<ChartLegend>`. */
  legend?: string
  /** Accessible label for the hover-toolbar `<div role="toolbar">`. */
  actions?: string
}

/** Locale strings for the DatePicker / RangePicker components. */
export interface DatePickerLocale {
  /** Tooltip on the "previous year" navigation button. */
  prevYear?: string
  /** Tooltip on the "next year" navigation button. */
  nextYear?: string
  /** Tooltip on the "previous month" navigation button. */
  prevMonth?: string
  /** Tooltip on the "next month" navigation button. */
  nextMonth?: string
}

/** Locale strings for the Cascader component. */
export interface CascaderLocale {
  /** Placeholder for the search input inside the dropdown. */
  searchPlaceholder?: string
  /** Empty-state text shown when search has no matches. */
  noMatches?: string
}

/** Locale strings for the TreeSelect component. */
export interface TreeSelectLocale {
  /** Placeholder for the search input inside the dropdown. */
  searchPlaceholder?: string
  /** Empty-state text shown when search has no matches. */
  noMatches?: string
}

/** Locale strings for the Dashboard / DashboardEditor components. */
export interface DashboardLocale {
  /** Accessible label for the dashboard root. */
  ariaLabel?: string
  /** Accessible label for the editor root (DashboardEditor). */
  editorAriaLabel?: string
  /** Accessible label for the per-widget resize handle. */
  resizeWidget?: string
  /** Accessible label for the widget actions (≡ menu) trigger. */
  widgetActions?: string
}

/** Locale strings for the Gantt component. */
export interface GanttLocale {
  /** Accessible label for the gantt root. */
  ariaLabel?: string
  /** Accessible label for the per-task resize handle. */
  resizeTask?: string
}

/** Locale strings for the ResourceCalendar component. */
export interface ResourceCalendarLocale {
  /** Accessible label for the calendar root. */
  ariaLabel?: string
  /** Accessible label for the resource lane. Default `(name) => `Resource ${name}``. */
  resource?: (name: string) => string
  /** Accessible label for capacity. Default `(n) => `capacity ${n} per slot``. */
  capacity?: (capacityPerSlot: number) => string
  /** Accessible label for the start-side resize handle. */
  resizeStart?: string
  /** Accessible label for the end-side resize handle. */
  resizeEnd?: string
  /** Suffix appended to the assignment aria-label when status is conflict. Default ` (conflict)`. */
  conflictSuffix?: string
}

/** Locale strings for the Timeline component (both the simple and event variants). */
export interface TimelineLocale {
  /** Accessible label for the timeline root. */
  ariaLabel?: string
}

/** Locale strings for the SchemaFormEditor component. */
export interface SchemaFormEditorLocale {
  /** Tooltip / aria-label for the undo button. */
  undo?: string
  /** Tooltip / aria-label for the redo button. */
  redo?: string
  /** Accessible label for the per-option remove (×) button in the inspector. */
  removeOption?: string
  /** Accessible label for the read-only generated JSON `<pre>`. */
  schemaView?: string
  /** Inspector "Label" placeholder. */
  optionLabelPlaceholder?: string
  /** Inspector "Value" placeholder. */
  optionValuePlaceholder?: string
  /** Per-field action: move up. */
  moveFieldUp?: string
  /** Per-field action: move down. */
  moveFieldDown?: string
  /** Per-field action: duplicate. */
  duplicateField?: string
  /** Per-field action: delete. */
  deleteField?: string
}

/** Root locale object that aggregates all component-level locales. */
export interface SgLocale {
  /** Table locale overrides. */
  table?: TableLocale
  /** Pagination locale overrides. */
  pagination?: PaginationLocale
  /** DataGrid locale overrides. */
  dataGrid?: DataGridLocale
  /** Modal locale overrides. */
  modal?: ModalLocale
  /** Popconfirm locale overrides. */
  popconfirm?: PopconfirmLocale
  /** Empty locale overrides. */
  empty?: EmptyLocale
  /** Form locale overrides. */
  form?: FormLocale
  /** Upload locale overrides. */
  upload?: UploadLocale
  /** Transfer locale overrides. */
  transfer?: TransferLocale
  /** Calendar locale overrides. */
  calendar?: CalendarLocale
  /** InputPassword locale overrides. */
  inputPassword?: InputPasswordLocale
  /** SearchInput locale overrides. */
  searchInput?: SearchInputLocale
  /** InlineEdit locale overrides. */
  inlineEdit?: InlineEditLocale
  /** TagInput locale overrides. */
  tagInput?: TagInputLocale
  /** Drawer locale overrides. */
  drawer?: DrawerLocale
  /** Notification locale overrides. */
  notification?: NotificationLocale
  /** Tag locale overrides. */
  tag?: TagLocale
  /** Spin locale overrides. */
  spin?: SpinLocale
  /** Skeleton locale overrides. */
  skeleton?: SkeletonLocale
  /** Breadcrumb locale overrides. */
  breadcrumb?: BreadcrumbLocale
  /** Carousel locale overrides. */
  carousel?: CarouselLocale
  /** Rate locale overrides. */
  rate?: RateLocale
  /** Charts locale overrides. */
  charts?: ChartsLocale
  /** DatePicker / RangePicker locale overrides. */
  datePicker?: DatePickerLocale
  /** Cascader locale overrides. */
  cascader?: CascaderLocale
  /** TreeSelect locale overrides. */
  treeSelect?: TreeSelectLocale
  /** Dashboard / DashboardEditor locale overrides. */
  dashboard?: DashboardLocale
  /** Gantt locale overrides. */
  gantt?: GanttLocale
  /** ResourceCalendar locale overrides. */
  resourceCalendar?: ResourceCalendarLocale
  /** Timeline (event timeline + step timeline) locale overrides. */
  timeline?: TimelineLocale
  /** SchemaFormEditor locale overrides. */
  schemaFormEditor?: SchemaFormEditorLocale
}
