import React from 'react'

/** Scalar value stored in or edited for a grid cell. */
export type CellValue = string | number | boolean | null | undefined

/** Column definition: display, sizing, sorting, editing, and optional formula. */
export interface DataGridColumn<R = Record<string, unknown>> {
  /** Field key on each row object. */
  key: string
  /** Header cell content. */
  title: React.ReactNode
  /** Initial column width in pixels. */
  width?: number
  /** Minimum width when resizing. */
  minWidth?: number
  /** Maximum width when resizing. */
  maxWidth?: number
  /** Pins the column to the left or right of the scroll body. */
  frozen?: 'left' | 'right'
  /** When `false`, disables drag-to-resize on this column. */
  resizable?: boolean
  /** Enables click-to-sort when `onSort` is provided. */
  sortable?: boolean
  /** Enables in-cell editing, or per-row gate via function. */
  editable?: boolean | ((row: R, rowIndex: number) => boolean)
  /** Cell text alignment. */
  align?: 'left' | 'center' | 'right'
  /** Custom cell body; defaults to stringified `value`. */
  render?: (value: CellValue, row: R, rowIndex: number) => React.ReactNode
  /** Custom in-place editor component for this column. */
  editor?: (props: CellEditorProps<R>) => React.ReactNode
  /** Derives displayed value without mutating row data. */
  formula?: (row: R) => CellValue
  /** Class name on body cells. */
  className?: string
  /** Class name on the header cell. */
  headerClassName?: string
}

/** Props passed to a custom cell editor implementation. */
export interface CellEditorProps<R = Record<string, unknown>> {
  /** Value being edited. */
  value: CellValue
  /** Row record. */
  row: R
  /** Row index in `data`. */
  rowIndex: number
  /** Column definition for this cell. */
  column: DataGridColumn<R>
  /** Updates the draft value (commit via `onCommit`). */
  onChange: (value: CellValue) => void
  /** Accepts the draft and closes the editor. */
  onCommit: () => void
  /** Discards edits and closes the editor. */
  onCancel: () => void
}

/** Zero-based row and column indices of one cell. */
export interface CellPosition {
  /** Row index in `data`. */
  row: number
  /** Column index in the rendered column order. */
  col: number
}

/** Inclusive rectangular selection between two cells. */
export interface CellRange {
  /** Anchor corner of the range. */
  start: CellPosition
  /** Opposite corner of the range. */
  end: CellPosition
}

/** Summary row definition for the DataGrid footer. */
export interface DataGridSummaryRow<R = Record<string, unknown>> {
  /** Returns content for each column key. */
  render: (columnKey: string, data: R[]) => React.ReactNode
  /** Optional class for the summary row. */
  className?: string
}

/** Context menu item for cells. */
export interface DataGridContextMenuItem {
  key: string
  label: React.ReactNode
  onClick: () => void
  danger?: boolean
  disabled?: boolean
  divider?: boolean
}

/** Props for the virtualized keyboard-driven data grid. */
export interface DataGridProps<R = Record<string, unknown>> {
  /** Column definitions in base order (frozen columns are reordered internally). */
  columns: DataGridColumn<R>[]
  /** Row records to render. */
  data: R[]
  /** Row React `key` field name or resolver function. */
  rowKey: keyof R | ((row: R, index: number) => React.Key)
  /**
   * Body row height in pixels.
   * @default 36
   */
  rowHeight?: number
  /**
   * Header row height in pixels.
   * @default 40
   */
  headerHeight?: number
  /**
   * Grid width.
   * @default '100%'
   */
  width?: number | string
  /**
   * Total grid height including header.
   * @default 400
   */
  height?: number | string
  /** Root element class name. */
  className?: string
  /** Root element inline styles. */
  style?: React.CSSProperties
  /** Controlled set of selected row keys. */
  selectedRows?: Set<React.Key>
  /** Row selection change handler. */
  onSelectedRowsChange?: (keys: Set<React.Key>) => void
  /** Persists a cell value after inline edit commit. */
  onCellEdit?: (rowIndex: number, columnKey: string, value: CellValue) => void
  /** Current sort column `key` for header indicators. */
  sortColumn?: string
  /** Current sort direction for `sortColumn`. */
  sortDirection?: 'asc' | 'desc'
  /** Request sort by column key and direction. */
  onSort?: (column: string, direction: 'asc' | 'desc') => void
  /** Copy handler for Ctrl/Cmd+C from the active cell. */
  onCopy?: (data: string) => void
  /** Paste handler for Ctrl/Cmd+V into the active cell. */
  onPaste?: (data: string, target: CellPosition) => void
  /** Optional per-keydown hook (not wired in default grid body). */
  onCellKeyDown?: (e: React.KeyboardEvent, cell: CellPosition) => void
  /**
   * Extra rows rendered above/below the viewport for smooth scrolling.
   * @default 5
   */
  overscan?: number
  /** Localized strings for empty and selection UI. */
  locale?: DataGridLocale

  /** Shows a checkbox column for row selection. */
  rowSelection?: boolean
  /** Zebra-striped rows. */
  striped?: boolean
  /** Highlight row on hover. @default true */
  highlightOnHover?: boolean
  /** Prepend a row number column. */
  showRowNumber?: boolean
  /** Summary/footer rows at the bottom of the grid. */
  summaryRows?: DataGridSummaryRow<R>[]
  /** Conditional class name per cell for styling. */
  cellClassName?: (value: CellValue, row: R, rowIndex: number, column: DataGridColumn<R>) => string | undefined
  /** Conditional inline style per cell. */
  cellStyle?: (value: CellValue, row: R, rowIndex: number, column: DataGridColumn<R>) => React.CSSProperties | undefined
  /** Enables column drag reorder. */
  columnReorder?: boolean
  /** Fires after column order changes via drag. */
  onColumnOrderChange?: (columnKeys: string[]) => void
  /** Builds context menu items for right-click on a cell. */
  onContextMenu?: (rowIndex: number, columnKey: string, row: R) => DataGridContextMenuItem[]
  /** Called when a row is clicked. */
  onRowClick?: (row: R, rowIndex: number) => void
  /** Called when a row is double-clicked. */
  onRowDoubleClick?: (row: R, rowIndex: number) => void
  /** Row class name or function for conditional row styling. */
  rowClassName?: string | ((row: R, rowIndex: number) => string)
  /** Loading overlay. */
  loading?: boolean
  /** Custom empty state content. */
  emptyContent?: React.ReactNode
}

/** Strings for empty state and future selection UI. */
export interface DataGridLocale {
  /** Message when `data` is empty. */
  noData?: string
  /** Label for select-all control when implemented. */
  selectAll?: string
}

/** Imperative handles for scroll and focus APIs. */
export interface DataGridRef {
  /** Scrolls the virtual body so the row index is visible. */
  scrollToRow: (index: number, align?: 'start' | 'center' | 'end') => void
  /** Placeholder for horizontal scroll-to-column (not implemented). */
  scrollToColumn: (index: number) => void
  /** Returns the focused cell position, if any. */
  getActiveCell: () => CellPosition | null
  /** Sets the focused cell or clears focus. */
  setActiveCell: (pos: CellPosition | null) => void
}
