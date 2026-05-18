/**
 * DataGrid — column/cell types parallel to React's DataGrid contract.
 *
 * Vue port intentionally trims the editor/copy-paste surface (Excel-like
 * features) compared to React. The shape stays compatible so that consumers
 * can switch frameworks without rewriting column definitions.
 */
export type CellValue = string | number | boolean | null | undefined

export interface DataGridColumn<R = Record<string, unknown>> {
  /** Field key on each row object. */
  key: string
  /** Header cell text. */
  title?: string
  /** Initial column width in pixels. */
  width?: number
  /** Minimum width when resizing. */
  minWidth?: number
  /** Maximum width when resizing. */
  maxWidth?: number
  /** Pins the column to the left or right of the scroll body. */
  frozen?: 'left' | 'right'
  /** Enables click-to-sort when `onSort` is provided. */
  sortable?: boolean
  /** Enables in-cell editing, or per-row gate via function. */
  editable?: boolean | ((row: R, rowIndex: number) => boolean)
  /** Cell text alignment. */
  align?: 'left' | 'center' | 'right'
  /** Computed display value when omitted from row data. */
  formula?: (row: R) => CellValue
  /** Class name on body cells. */
  className?: string
  /** Class name on the header cell. */
  headerClassName?: string
}

export interface CellPosition {
  row: number
  col: number
}

export interface DataGridSummaryRow<R = Record<string, unknown>> {
  render: (columnKey: string, data: R[]) => string | number | null
  className?: string
}

export interface DataGridProps<R = Record<string, unknown>> {
  columns: DataGridColumn<R>[]
  data: R[]
  rowKey: string | ((row: R, index: number) => string | number)
  rowHeight?: number
  headerHeight?: number
  width?: number | string
  height?: number | string
  className?: string
  selectedRows?: Set<string | number>
  rowSelection?: boolean
  showRowNumber?: boolean
  striped?: boolean
  highlightOnHover?: boolean
  sortColumn?: string
  sortDirection?: 'asc' | 'desc'
  overscan?: number
  loading?: boolean
  summaryRows?: DataGridSummaryRow<R>[]
  emptyText?: string
}

export interface DataGridEmits<R = Record<string, unknown>> {
  (e: 'cell-edit', payload: { rowIndex: number; columnKey: string; value: CellValue }): void
  (e: 'sort', payload: { column: string; direction: 'asc' | 'desc' }): void
  (e: 'row-click', payload: { row: R; rowIndex: number }): void
  (e: 'row-double-click', payload: { row: R; rowIndex: number }): void
  (e: 'selected-rows-change', payload: Set<string | number>): void
}

export interface DataGridExpose {
  scrollToRow: (index: number) => void
  getActiveCell: () => CellPosition | null
  setActiveCell: (pos: CellPosition | null) => void
}
