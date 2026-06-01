import type { ColumnFilter, RowId, SortConfig, SortDirection, FilterOperator } from '@skygraph/core'

export type { RowId, SortDirection, SortConfig, ColumnFilter, FilterOperator }

export type TableSlot =
  | 'root'
  | 'toolbar'
  | 'scroll'
  | 'grid'
  | 'headerRow'
  | 'headerCell'
  | 'row'
  | 'bodyCell'
  | 'empty'
  | 'pagination'
  | 'footer'

export type TableClassNames = Partial<Record<TableSlot, string>>
export type TableStyles = Partial<Record<TableSlot, Record<string, string | number>>>

export interface TableLocale {
  emptyText?: string
  filterReset?: string
  filterConfirm?: string
  filterAll?: string
  searchPlaceholder?: string
  sortAsc?: string
  sortDesc?: string
  filterIcon?: string
  loadingText?: string
  totalRows?: (count: number) => string
  selectedRows?: (count: number) => string
  expandIcon?: string
}

export const DEFAULT_TABLE_LOCALE: Required<TableLocale> = {
  emptyText: 'No data',
  filterReset: 'Reset',
  filterConfirm: 'OK',
  filterAll: 'All',
  searchPlaceholder: 'Search...',
  sortAsc: '▲',
  sortDesc: '▼',
  filterIcon: '▾',
  loadingText: 'Loading…',
  totalRows: (count) => `${count} rows`,
  selectedRows: (count) => `${count} selected`,
  expandIcon: '›',
}

/** Cell merge span metadata from `onCell`. */
export interface CellSpan {
  rowSpan?: number
  colSpan?: number
}

/** Built-in footer aggregate operation identifiers. */
export type AggregateType = 'sum' | 'avg' | 'count' | 'min' | 'max'

/** Props passed to a custom column filter dropdown slot. */
export interface FilterDropdownSlotProps {
  /** Active filter value(s) for this column. */
  selectedKeys: unknown[]
  /** Updates the selected keys before commit. */
  setSelectedKeys: (keys: unknown[]) => void
  /** Applies the current selection and closes the dropdown. */
  confirm: () => void
  /** Clears the active filter. */
  clearFilters: () => void
  /** Closes the dropdown without applying. */
  close: () => void
}

export interface TableColumn {
  /** Unique column key matching row data fields. */
  key: string
  /** Header label. */
  title: string
  /** Default column width in pixels. */
  width?: number
  /** Minimum width when resizing. */
  minWidth?: number
  /** Enables click-to-sort on this column. */
  sortable?: boolean
  /** Enables column resizing via drag handle on the header. */
  resizable?: boolean
  /** Allows in-cell editing when `onCellEdit` is set on the table. */
  editable?: boolean
  /** Sticky column position. */
  fixed?: 'left' | 'right'
  /** Cell text alignment. */
  align?: 'left' | 'center' | 'right'
  /** Hides the column when true. */
  hidden?: boolean
  /** Preset filter options. */
  filters?: Array<{ text: string; value: unknown }>
  /** Predicate to test if a row matches a filter value. */
  onFilter?: (value: unknown, row: Record<string, unknown>) => boolean
  /** When false, filter mode is single-select radio. @default true */
  filterMultiple?: boolean
  /** Returns rowspan/colspan for the cell at this row index. */
  onCell?: (row: Record<string, unknown>, rowIndex: number) => CellSpan
  /** Child columns for grouped headers. */
  children?: TableColumn[]
  /** Extra class for header cell of this column. */
  headerClassName?: string
  /** Footer aggregate for this column. */
  aggregate?: AggregateType | ((values: unknown[]) => unknown)
}

/** Selection config — mirrors React. */
export interface RowSelectionConfig {
  selectedKeys: RowId[]
  onChange?: (keys: RowId[], rows: Array<Record<string, unknown>>) => void
  type?: 'checkbox' | 'radio'
}

/** Expandable row configuration. */
export interface ExpandableConfig {
  /** Renders content below the row when expanded. */
  expandedRowRender: (row: Record<string, unknown>, id: RowId) => unknown
  /** Controlled expanded row keys. */
  expandedKeys?: RowId[]
  /** Keys expanded on first mount when `expandedKeys` is not controlled. */
  defaultExpandedRowKeys?: RowId[]
  /** Fires when a row expand state toggles. */
  onExpand?: (expanded: boolean, id: RowId) => void
  /** Limits which rows show an expand control. */
  rowExpandable?: (row: Record<string, unknown>) => boolean
}

/** Tree-shaped row data options. */
export interface TreeConfig {
  /** Row field holding nested rows (default `children`). */
  childrenColumnName?: string
  /** Pixels per tree depth level. */
  indentSize?: number
  /** Starts with all tree nodes expanded. */
  defaultExpandAllRows?: boolean
}

/** One cell in a custom summary row. */
export interface SummaryCell {
  content: unknown
  colSpan?: number
  align?: 'left' | 'center' | 'right'
}

/** Virtual scroll configuration. */
export interface VirtualConfig {
  /**
   * Row height. Number — fixed; function — dynamic estimate. Defaults to 40.
   */
  rowHeight?: number | ((row: Record<string, unknown>, id: RowId) => number)
  /** Estimate callback used for unknown row heights. */
  estimateRowHeight?: (row: Record<string, unknown>, id: RowId) => number
  /** Number of rows to render outside the visible window. @default 6 */
  overscan?: number
  /** Viewport height; defaults to scroll container height. */
  height?: number | string
}

export interface TableProps {
  /** Column definitions (leaf and/or grouped). */
  columns: TableColumn[]
  /** Dataset rows. */
  data: Array<{ id: RowId; data: Record<string, unknown> }>
  /** Page size for built-in pagination; omit to render all rows on a single page. */
  pageSize?: number
  /** Row selection state. */
  rowSelection?: RowSelectionConfig
  /** Expandable row config (per-row inline content + expand button). */
  expandable?: ExpandableConfig
  /** Tree-shaped data config (renders `data.children` as nested rows). */
  tree?: TreeConfig
  /** Outlined table borders. @default false */
  bordered?: boolean
  /** Density preset. @default 'middle' */
  size?: 'small' | 'middle' | 'large'
  /** Sticky header while scrolling vertically. */
  sticky?: boolean
  /** Enables column reorder by drag-and-drop in the header. */
  draggable?: boolean
  /** Called after header columns are reordered by drag-and-drop. */
  onColumnOrderChange?: (order: string[]) => void
  /** Locale strings. */
  locale?: TableLocale
  /** Row class name. */
  rowClassName?: string | ((row: Record<string, unknown>, id: RowId) => string)
  /** Toolbar search across visible columns. */
  searchable?: boolean
  /** Controlled global search query. */
  searchValue?: string
  /** When false, disables pagination block even if `pageSize` is set. @default true */
  showPagination?: boolean
  /** Render without Skygraph styles. */
  unstyled?: boolean
  /** Public class names per slot. */
  classNames?: TableClassNames
  /** Public inline styles per slot. */
  styles?: TableStyles
  /** Loading overlay. @default false */
  loading?: boolean
  /** Horizontal and/or vertical scroll constraints. */
  scroll?: { x?: number | string; y?: number | string }
  /** Custom summary rows below the body. */
  summary?: (data: Array<{ id: RowId; data: Record<string, unknown> }>) => SummaryCell[][]
  /** Commits inline cell edit values. */
  onCellEdit?: (id: RowId, column: string, value: unknown) => void
  /**
   * Virtualises the body for big datasets.
   *  - `true` — fixed 40px row height.
   *  - object — see `VirtualConfig`.
   */
  virtual?: boolean | VirtualConfig
  /** Shows aggregate footer row. */
  footer?: boolean
  /** Zebra striping on body rows. */
  striped?: boolean
  /** Row hover highlight; set false to disable. @default true */
  highlightOnHover?: boolean
}
