import type React from 'react'
import { FilterIcon, SearchIcon } from './defaultIcons'
import type { UseTableOptions } from '../../../hooks/useTable'
import type {
  AdvancedFilter,
  ColumnFilter,
  ColumnAggregate,
  FilterOperator,
  RowId,
  SortConfig,
  SortDirection,
  TableGroup,
} from '@skygraph/core'
import type {
  BaseComponentProps,
  InteractiveProps,
  SizableProps,
  SlotClassNames,
  SlotStyles,
} from '../../../types'
import type { TableLocale } from '../../../types/locale'
import type { ContextMenuItem } from './ContextMenu'
import type { PrintableProp } from '../../../utils/print'

/**
 * Re-exports the canonical TableLocale from `types/locale.ts`. The two
 * declarations were unified during the post-stream cleanup; keep using
 * `from '../../../types/locale'` for new code.
 */
export type { TableLocale }

/**
 * Имена слотов `Table` для пропов `classNames` / `styles`.
 * Полный список и описания — `docs/styling-contract.md` §4.1.
 */
export type TableSlot =
  | 'root'
  | 'toolbar'
  | 'scroll'
  | 'grid'
  | 'headerRow'
  | 'headerCell'
  | 'headerCellContent'
  | 'row'
  | 'bodyCell'
  | 'empty'
  | 'pagination'
  | 'footer'

/** Мапа `слот → className` для `Table`. */
export type TableClassNames = SlotClassNames<TableSlot>

/** Мапа `слот → inline-style` для `Table`. */
export type TableStyles = SlotStyles<TableSlot>

/** Re-exports core row and sort types used by the table. */
export type {
  RowId,
  SortDirection,
  SortConfig,
  AdvancedFilter,
  ColumnFilter,
  ColumnAggregate,
  FilterOperator,
  TableGroup,
}

/** Cell merge span metadata from `onCell`. */
export interface CellSpan {
  /** Vertical span count; `0` hides the cell. */
  rowSpan?: number
  /** Horizontal span count; `0` hides the cell. */
  colSpan?: number
}

/** Props passed to a custom column filter dropdown. */
export interface FilterDropdownProps {
  /** Filter values currently selected in the dropdown. */
  selectedKeys: unknown[]
  /** Updates selected filter values before confirm. */
  setSelectedKeys: (keys: unknown[]) => void
  /** Applies the current selection and closes the dropdown. */
  confirm: () => void
  /** Clears active filters for the column. */
  clearFilters: () => void
  /** Closes the dropdown without applying. */
  close: () => void
}

/** Built-in footer aggregate operation identifiers. */
export type AggregateType = 'sum' | 'avg' | 'count' | 'min' | 'max'

/** Column definition for `Table` (leaf or group parent). */
export interface TableColumn {
  /** Unique column key matching row data fields. */
  key: string
  /** Header label or node. */
  title: React.ReactNode
  /** Default column width in pixels. */
  width?: number
  /** Minimum width when resizing. */
  minWidth?: number
  /** Enables click-to-sort on this column. */
  sortable?: boolean
  /** Shows a drag handle to resize the column. */
  resizable?: boolean
  /** Allows in-cell editing when `onCellEdit` is set on the table. */
  editable?: boolean
  /** Sticky column position. */
  fixed?: 'left' | 'right'
  /** Truncates overflowing cell text with ellipsis. */
  ellipsis?: boolean
  /** Cell text alignment. */
  align?: 'left' | 'center' | 'right'
  /** Hides the column when true. */
  hidden?: boolean
  /** Preset filter options for the column filter menu. */
  filters?: Array<{ text: string; value: unknown }>
  /** Predicate to test if a row matches a filter value. */
  onFilter?: (value: unknown, row: Record<string, unknown>) => boolean
  /** Custom filter dropdown UI or render function. */
  filterDropdown?: React.ReactNode | ((props: FilterDropdownProps) => React.ReactNode)
  /** Custom filter icon in the header. */
  filterIcon?: React.ReactNode | ((filtered: boolean) => React.ReactNode)
  /** When false, filter mode is single-select radio. */
  filterMultiple?: boolean
  /** Enables or customizes filter option search in the menu. */
  filterSearch?: boolean | ((input: string, record: { text: string; value: unknown }) => boolean)
  /**
   * Filter UI mode:
   *  - `'menu'` — preset list with checkboxes (default).
   *  - `'search'` — single search input.
   *  - `'advanced'` — operator picker + value input (`AdvancedFilter`).
   */
  filterMode?: 'menu' | 'search' | 'advanced'
  /**
   * Список доступных операторов в `advanced`-моде. По умолчанию выводится
   * полный набор кроме строгих строковых операторов (для нестроковых полей).
   * Передайте свой массив, чтобы ограничить пользователя.
   */
  advancedFilterOperators?: FilterOperator[]
  /**
   * Тип значения колонки — подсказка для `advanced`-режима, чтобы выбрать
   * корректный input (`number` / `text`) и стартовый набор операторов.
   * @default 'text'
   */
  advancedFilterType?: 'text' | 'number'
  /** Controlled active filter values for the column. */
  filteredValue?: unknown[]
  /** Initial filter values for uncontrolled usage. */
  defaultFilteredValue?: unknown[]
  /** Custom cell content renderer. */
  render?: (value: unknown, row: Record<string, unknown>, id: RowId) => React.ReactNode
  /** Returns rowspan/colspan for the cell at this row index. */
  onCell?: (row: Record<string, unknown>, rowIndex: number) => CellSpan
  /** Child columns for grouped headers. */
  children?: TableColumn[]
  /** Small info icon with this content in the header. */
  tooltip?: string | React.ReactNode
  /** Extra class for body cells. */
  cellClassName?: string | ((value: unknown, row: Record<string, unknown>, id: RowId) => string)
  /** Extra class for header cell of this column. */
  headerClassName?: string
  /** Shows a copy-to-clipboard control on the cell. */
  copyable?: boolean
  /** Footer aggregate for this column (built-in name or custom reducer). */
  aggregate?: AggregateType | ((values: unknown[]) => React.ReactNode)
}

/** Controlled row selection configuration. */
export interface RowSelectionConfig {
  /** Keys of currently selected rows. */
  selectedKeys: RowId[]
  /** Called when selection changes. */
  onChange: (keys: RowId[], rows: Array<Record<string, unknown>>) => void
  /** Selection control type. */
  type?: 'checkbox' | 'radio'
}

/** Expandable row configuration. */
export interface ExpandableConfig {
  /** Renders content below the row when expanded. */
  expandedRowRender: (row: Record<string, unknown>, id: RowId) => React.ReactNode
  /** Controlled expanded row keys. */
  expandedKeys?: RowId[]
  /** Keys expanded on first mount when `expandedKeys` is not controlled. */
  defaultExpandedRowKeys?: RowId[]
  /** Fires when a row expand state toggles. */
  onExpand?: (expanded: boolean, id: RowId) => void
  /** Limits which rows show an expand control. */
  rowExpandable?: (row: Record<string, unknown>) => boolean
}

/** Tree-shaped row data options for the table. */
export interface TreeConfig {
  /** Row field holding nested rows (default `children`). */
  childrenColumnName?: string
  /** Pixels per tree depth level. */
  indentSize?: number
  /** Starts with all tree nodes expanded. */
  defaultExpandAllRows?: boolean
}

/** One cell in a custom summary row from `summary`. */
export interface SummaryCell {
  /** Cell body. */
  content: React.ReactNode
  /** Horizontal span in the summary grid. */
  colSpan?: number
  /** Text alignment. */
  align?: 'left' | 'center' | 'right'
}

/** Configuration for the optional row number column. */
export interface RowNumberConfig {
  /** Header title for the row number column. */
  title?: React.ReactNode
  /** Column width in pixels. */
  width?: number
  /** Pins the row number column. */
  fixed?: 'left'
}

/** Row ids pinned to the top or bottom of the scroll area. */
export interface PinnedRowsConfig {
  /** Row ids rendered in a block above the main body. */
  top?: RowId[]
  /** Row ids rendered in a block below the main body. */
  bottom?: RowId[]
}

/** Internal metadata for a grouped header row in the body. */
export interface GroupRow {
  /** Marks this synthetic row as a group header. */
  __isGroup: true
  /** Stable key for the group (stringified value). */
  groupKey: string
  /** Raw grouping value. */
  groupValue: unknown
  /** Number of rows in the group. */
  count: number
  /** Whether child rows are visible. */
  expanded: boolean
  /** Per-column aggregate display for the group header. */
  aggregates: Record<string, React.ReactNode>
}

export const DEFAULT_LOCALE: Required<TableLocale> = {
  emptyText: 'No data',
  filterReset: 'Reset',
  filterConfirm: 'OK',
  filterSearchPlaceholder: 'Search filters...',
  filterEmptyText: 'No filters',
  searchPlaceholder: 'Search...',
  sortAsc: '▲',
  sortDesc: '▼',
  expandIcon: '›',
  filterIcon: FilterIcon,
  searchIcon: SearchIcon,
  totalRows: (count) => `${count} rows`,
  selectedRows: (count) => `${count} selected`,
  exportCSV: 'Export CSV',
  exportJSON: 'Export JSON',
  copyTable: 'Copy',
  pinLeft: 'Pin Left',
  pinRight: 'Pin Right',
  unpin: 'Unpin',
  showColumns: 'Show Columns',
  print: 'Print',
  fullscreen: 'Fullscreen',
  exitFullscreen: 'Exit Fullscreen',
  density: 'Density',
  densitySmall: 'Compact',
  densityMiddle: 'Default',
  densityLarge: 'Comfortable',
  groupCollapse: 'Collapse All',
  groupExpand: 'Expand All',
  sum: 'Sum',
  avg: 'Avg',
  count: 'Count',
  min: 'Min',
  max: 'Max',
  copiedToClipboard: 'Copied!',
  rowNumber: '#',
  groupByLabel: 'Group by',
  groupByNone: 'No grouping',
  filterAdvancedValuePlaceholder: 'Value',
  filterAdvancedInPlaceholder: 'value1, value2, ...',
  filterAdvancedBetweenMaxPlaceholder: 'Max',
  filterOpEq: '=',
  filterOpNeq: '!=',
  filterOpLt: '<',
  filterOpLte: '<=',
  filterOpGt: '>',
  filterOpGte: '>=',
  filterOpBetween: 'between',
  filterOpIn: 'in',
  filterOpNotIn: 'not in',
  filterOpContains: 'contains',
  filterOpStartsWith: 'starts with',
  filterOpEndsWith: 'ends with',
  filterOpIsEmpty: 'is empty',
  filterOpIsNotEmpty: 'is not empty',
  filterOperatorAriaLabel: 'Filter operator',
}

export const DEFAULT_COL_WIDTH = 150
export const MIN_COL_WIDTH = 50
export const SELECTION_COL_WIDTH = '40px'

/** Action button in the selection summary bar. */
export interface SelectionSummaryAction {
  /** Stable action key. */
  key: string
  /** Button label. */
  label: React.ReactNode
  /** Invoked with current selection when the action is clicked. */
  onClick: (selectedKeys: RowId[], selectedRows: Array<Record<string, unknown>>) => void
  /** Destructive styling hint. */
  danger?: boolean
}

/**
 * Props for the `Table` component: column model, selection, scrolling, and toolbar features.
 * Styling and interaction props from `BaseComponentProps`, `InteractiveProps`, and `SizableProps` are inherited without per-prop docs here.
 */
export interface TableProps
  extends Omit<UseTableOptions, 'columns'>, BaseComponentProps, InteractiveProps, SizableProps {
  /** Column definitions (leaf and/or grouped). */
  columns: TableColumn[]
  /** Dataset rows bound to the table engine (from `useTable` options). */
  data?: Array<{ id: RowId; data: Record<string, unknown> }>
  /** Page size for built-in pagination (from table engine options). */
  pageSize?: number
  /** Row selection state and callbacks. */
  rowSelection?: RowSelectionConfig
  /** Optional expandable row renderer. */
  expandable?: ExpandableConfig
  /** Renders hierarchical rows from nested data. */
  tree?: TreeConfig
  /** Sticky header while scrolling vertically. */
  sticky?: boolean
  /** Enables column reorder by drag-and-drop in the header. */
  draggable?: boolean
  /** Shows toolbar search across visible columns. */
  searchable?: boolean
  /** @default true */
  showPagination?: boolean
  /** Outlined table borders. */
  bordered?: boolean

  /** Horizontal and/or vertical scroll constraints. */
  scroll?: { x?: number | string; y?: number | string }
  /** Custom summary rows below the body. */
  summary?: (data: Array<{ id: RowId; data: Record<string, unknown> }>) => SummaryCell[][]
  /** Row click handler. */
  onRowClick?: (id: RowId, data: Record<string, unknown>) => void
  /** Commits inline cell edit values. */
  onCellEdit?: (id: RowId, column: string, value: unknown) => void
  /** Called after header columns are reordered by drag-and-drop. */
  onColumnOrderChange?: (order: string[]) => void
  /** Extra class for each body row. */
  rowClassName?: string | ((row: Record<string, unknown>, id: RowId) => string)
  /** Overrides default locale strings. */
  locale?: TableLocale

  /** Enables shift-click multi-column sort. */
  multiSort?: boolean
  /** Controlled multi-sort model. */
  sorts?: SortConfig[]
  /** Fires when multi-sort state changes. */
  onSortsChange?: (sorts: SortConfig[]) => void

  /** Enables dragging body rows to reorder. */
  rowDraggable?: boolean
  /** Called after row reorder via drag-and-drop. */
  onRowOrderChange?: (fromIndex: number, toIndex: number) => void

  /** Builds context menu items for a header cell. */
  headerContextMenu?: (column: TableColumn) => ContextMenuItem[]
  /** Builds context menu items for a body cell. */
  cellContextMenu?: (id: RowId, column: string, data: Record<string, unknown>) => ContextMenuItem[]

  /** Shows column visibility controls in the toolbar. */
  columnVisibility?: boolean
  /** Controlled hidden column keys. */
  hiddenColumns?: string[]
  /** Fires when visible columns change. */
  onHiddenColumnsChange?: (keys: string[]) => void

  /** Enables pin/unpin via header context menu. */
  columnPinning?: boolean
  /** Fires when a column pin side changes. */
  onColumnPinChange?: (key: string, fixed: 'left' | 'right' | undefined) => void

  /**
   * Виртуализирует тело таблицы для больших датасетов.
   *
   *  - `true` — фиксированная высота 40px.
   *  - `{ rowHeight: 60 }` — фиксированная высота 60px.
   *  - `{ rowHeight: (row, id) => h }` — динамическая высота, переданная
   *    функция используется как эстимейт до того, как `ResizeObserver`
   *    отчитается о реальной высоте каждой строки.
   *  - `{ rowHeight: 40, estimateRowHeight: (row) => h }` — то же самое,
   *    но с явным разделением "первое значение / эстимейт-callback".
   */
  virtual?:
    | boolean
    | {
        /**
         * Стартовое значение высоты строки. Число — фиксированный фоллбэк
         * (быстрый путь). Функция — включает динамическое измерение через
         * ResizeObserver, вызываясь как эстимейт до первого реального
         * измерения.
         */
        rowHeight?: number | ((row: Record<string, unknown>, id: RowId) => number)
        /**
         * Дополнительный эстимейт высоты, разрешает динамическое измерение
         * даже при числовом `rowHeight`. Имеет приоритет над `rowHeight`-
         * фоллбэком при выборе размера до измерения.
         */
        estimateRowHeight?: (row: Record<string, unknown>, id: RowId) => number
        overscan?: number
        height?: number | string
      }

  /** Shows CSV export and copy actions in the toolbar. */
  exportable?: boolean
  /** Custom export handler; default downloads CSV. */
  onExport?: (data: string[][]) => void

  /** Shows a bar when rows are selected. */
  selectionSummary?: boolean
  /** Buttons rendered in the selection summary bar. */
  selectionActions?: SelectionSummaryAction[]

  /** Zebra striping on body rows. */
  striped?: boolean

  /** Page size selector on the pagination control. */
  showSizeChanger?: boolean
  /** Options for page size selector. */
  pageSizeOptions?: number[]
  /** Quick jump to page input on pagination. */
  showQuickJumper?: boolean
  /** Total / range label on pagination. */
  showTotal?: boolean | ((total: number, range: [number, number]) => React.ReactNode)
  /** Fires when page size changes. */
  onPageSizeChange?: (size: number) => void

  /** Prepends a row index column. */
  showRowNumber?: boolean | RowNumberConfig

  /** Shows aggregate values in a footer row. */
  footer?: boolean

  /** Fullscreen toggle in the toolbar. */
  fullscreenable?: boolean

  /** Density (row height) selector in the toolbar. */
  densityToggle?: boolean

  /** Field key to group rows by. */
  groupBy?: string
  /** Starts with all groups expanded. */
  defaultGroupExpanded?: boolean
  /** Fires when a group expand state changes. */
  onGroupExpandChange?: (groupKey: string, expanded: boolean) => void
  /**
   * Optional list of fields the user can pick to group by from the toolbar
   * dropdown. When omitted, the dropdown is hidden and only the controlled
   * `groupBy` value is used.
   */
  groupByOptions?: Array<{ key: string; label: React.ReactNode }>
  /** Called when the user picks a different `groupBy` field from the toolbar. */
  onGroupByChange?: (field: string | null) => void

  /** Arrow-key focus navigation between cells. */
  keyboardNavigation?: boolean

  /** Pins specific row ids to top or bottom. */
  pinnedRows?: PinnedRowsConfig

  /** Replaces default empty state content. */
  emptyContent?: React.ReactNode

  /**
   * Print action in the toolbar и/или включение `ref.print()`.
   *
   * `true` — стандартная кнопка в тулбаре.
   * `{ fileName?: string }` — кнопка + имя popup-окна (используется браузером
   *   как заголовок и дефолтное имя файла в "Save as PDF").
   * `false` / `undefined` — кнопки нет; `ref.print()` всё равно работает.
   */
  printable?: PrintableProp

  /** JSON export action in the toolbar. */
  exportJSON?: boolean

  /** Row hover highlight; set false to disable. */
  highlightOnHover?: boolean

  /** Double-click resize handle fits column to content. */
  columnAutoResize?: boolean

  /**
   * Дополнительные классы по слотам. Публичный API — см. `docs/styling-contract.md` §4.1.
   * Имена слотов стабильны, классы-значения применяются поверх встроенных `.sg-table-*`.
   */
  classNames?: TableClassNames
  /** Инлайн-стили по слотам. Публичный API — см. `docs/styling-contract.md` §4.1. */
  styles?: TableStyles
}

/** One cell in a multi-row header grid. */
export interface HeaderCell {
  /** Column at this header position. */
  col: TableColumn
  /** Horizontal span in header grid units. */
  colSpan: number
  /** Vertical span in header grid units. */
  rowSpan: number
}

/** Flattened row model passed to body renderers. */
export interface FlatRow {
  /** Row id. */
  id: RowId
  /** Row field values. */
  data: Record<string, unknown>
  /** Tree depth when tree mode is enabled. */
  depth: number
  /** Whether the row has nested children in tree mode. */
  hasChildren: boolean
  /** Present when this row is a group header. */
  __groupRow?: GroupRow
}
