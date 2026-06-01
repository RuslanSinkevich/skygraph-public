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
  /** Formats the per-star accessible label. */
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
  /** Accessible label for the chart legend. */
  legend?: string
  /** Accessible label for the hover-toolbar `<div role="toolbar">`. */
  actions?: string
}

/** Locale strings for the Cascader component. */
export interface CascaderLocale {
  /** Placeholder for the search input inside the dropdown. */
  searchPlaceholder?: string
  /** Empty-state text shown when search has no matches. */
  noMatches?: string
  /** Accessible label for the clear (×) button. */
  clear?: string
  /** Accessible label for the per-tag remove (×) button. */
  removeTag?: string
}

/** Locale strings for the TreeSelect component. */
export interface TreeSelectLocale {
  /** Placeholder for the search input inside the dropdown. */
  searchPlaceholder?: string
  /** Empty-state text shown when search has no matches. */
  noMatches?: string
}

/** Locale strings for the Tree component. */
export interface TreeLocale {
  /** Accessible label for the clear-search (×) button. */
  clearSearch?: string
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
  /** Accessible label for the resource lane. */
  resource?: (name: string) => string
  /** Accessible label for capacity. */
  capacity?: (capacityPerSlot: number) => string
  /** Accessible label for the start-side resize handle. */
  resizeStart?: string
  /** Accessible label for the end-side resize handle. */
  resizeEnd?: string
  /** Suffix appended to the assignment aria-label when status is conflict. */
  conflictSuffix?: string
}

/** Locale strings for the Timeline component. */
export interface TimelineLocale {
  /** Accessible label for the timeline root. */
  ariaLabel?: string
}

/** Locale strings for the Diagram component. */
export interface DiagramLocale {
  /** Accessible label for the diagram root. */
  ariaLabel?: string
}

/** Locale strings for the DataGrid component. */
export interface DataGridLocale {
  /** Accessible label for the "select all rows" header checkbox. */
  selectAllRows?: string
  /** Accessible label for the per-row selection checkbox. */
  selectRow?: string
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

/** Locale strings for the List component. */
export interface ListLocale {
  /** Accessible label for the loading state spinner. */
  loading?: string
}

/** Locale strings for the Table component (subset, Vue parity). */
export interface TableLocale {
  /** Accessible label for the "select all" header checkbox. */
  selectAll?: string
}

/** Locale strings shared by Input-family `clear` (×) buttons. */
export interface InputLocale {
  /** Accessible label for the clear (×) button. */
  clear?: string
}

/** Locale strings for the Calendar header navigation. */
export interface CalendarHeaderLocale {
  /** Accessible label for the month selector. */
  month?: string
  /** Accessible label for the year selector. */
  year?: string
}

/** Locale strings for the ColorPicker component. */
export interface ColorPickerLocale {
  /** Accessible label for the color picker trigger. */
  pickColor?: string
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
  /** Aria label for the inline month selector. */
  month?: string
  /** Aria label for the inline year selector. */
  year?: string
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
  form?: FormLocale
  upload?: UploadLocale
  transfer?: TransferLocale
  drawer?: DrawerLocale
  notification?: NotificationLocale
  tag?: TagLocale
  spin?: SpinLocale
  skeleton?: SkeletonLocale
  breadcrumb?: BreadcrumbLocale
  carousel?: CarouselLocale
  rate?: RateLocale
  charts?: ChartsLocale
  cascader?: CascaderLocale
  treeSelect?: TreeSelectLocale
  tree?: TreeLocale
  dashboard?: DashboardLocale
  gantt?: GanttLocale
  resourceCalendar?: ResourceCalendarLocale
  timeline?: TimelineLocale
  diagram?: DiagramLocale
  dataGrid?: DataGridLocale
  schemaFormEditor?: SchemaFormEditorLocale
  list?: ListLocale
  table?: TableLocale
  input?: InputLocale
  colorPicker?: ColorPickerLocale
}
