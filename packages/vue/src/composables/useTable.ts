import { ref, isRef, onScopeDispose, watch, type Ref } from 'vue'
import { createCore, createTable } from '@skygraph/core'
import type {
  ColumnFilter,
  Core,
  RowId,
  SortConfig,
  SortDirection,
  TableEngine,
  TableOptions,
  TableState,
} from '@skygraph/core'

export type TableRow = { id: RowId; data: Record<string, unknown> }

export interface UseTableOptions extends TableOptions {
  /** Optional initial row data; when provided as a `Ref`, swapping the ref
   * resets the engine and reloads rows. */
  data?: TableRow[] | Ref<TableRow[]>
}

export type FilterFn = (row: Record<string, unknown>) => boolean

export interface UseTableReturn {
  core: Core
  table: TableEngine
  visibleRows: Ref<TableRow[]>
  tableState: Ref<TableState>
  pinnedColumns: Ref<{ left: string[]; right: string[] }>
  columnWidths: Ref<Record<string, number>>
  setSort: (column: string, direction: SortDirection) => void
  setSorts: (sorts: SortConfig[]) => void
  clearSort: () => void
  addFilter: (filter: ColumnFilter) => void
  removeFilter: (column: string) => void
  clearFilters: () => void
  setFilterFn: (fn: FilterFn | null) => void
  setPage: (page: number) => void
  nextPage: () => void
  prevPage: () => void
  pinColumn: (column: string, side: 'left' | 'right' | null) => void
  clearPinned: () => void
  setColumnWidth: (column: string, width: number) => void
  clearColumnWidths: () => void
  refresh: () => void
}

/**
 * Vue 3 composable parallel to React's `useTable`.
 */
export function useTable(options?: UseTableOptions): UseTableReturn {
  const core = createCore()
  const table = createTable(core, options)

  const initialData: TableRow[] | undefined = options?.data
    ? isRef(options.data)
      ? options.data.value
      : (options.data as TableRow[])
    : undefined

  if (initialData) {
    table.addRows(initialData)
  }

  const visibleRows = ref(table.getVisibleRows()) as Ref<TableRow[]>
  const tableState = ref(table.getTableState()) as Ref<TableState>
  const pinnedColumns = ref(table.getPinnedColumns()) as Ref<{
    left: string[]
    right: string[]
  }>
  const columnWidths = ref(table.getColumnWidths()) as Ref<Record<string, number>>

  const refresh = () => {
    visibleRows.value = table.getVisibleRows()
    tableState.value = table.getTableState()
    pinnedColumns.value = table.getPinnedColumns()
    columnWidths.value = table.getColumnWidths()
  }

  // If consumer passes a Ref<data[]>, watch for swaps and reload.
  if (options?.data && isRef(options.data)) {
    const dataRef = options.data
    const stop = watch(dataRef, (next) => {
      table.reset()
      if (next) table.addRows(next)
      refresh()
    })
    onScopeDispose(() => stop())
  }

  const setSort = (column: string, direction: SortDirection) => {
    table.setSort(column, direction)
    refresh()
  }
  const setSorts = (sorts: SortConfig[]) => {
    table.setSorts(sorts)
    refresh()
  }
  const clearSort = () => {
    table.clearSort()
    refresh()
  }
  const addFilter = (filter: ColumnFilter) => {
    table.addFilter(filter)
    refresh()
  }
  const removeFilter = (column: string) => {
    table.removeFilter(column)
    refresh()
  }
  const clearFilters = () => {
    table.clearFilters()
    refresh()
  }
  const setFilterFn = (fn: FilterFn | null) => {
    table.setFilterFn(fn)
    refresh()
  }
  const setPage = (page: number) => {
    table.setPage(page)
    refresh()
  }
  const nextPage = () => {
    table.nextPage()
    refresh()
  }
  const prevPage = () => {
    table.prevPage()
    refresh()
  }
  const pinColumn = (column: string, side: 'left' | 'right' | null) => {
    table.pinColumn(column, side)
    pinnedColumns.value = table.getPinnedColumns()
  }
  const clearPinned = () => {
    table.clearPinned()
    pinnedColumns.value = table.getPinnedColumns()
  }
  const setColumnWidth = (column: string, width: number) => {
    table.setColumnWidth(column, width)
    columnWidths.value = table.getColumnWidths()
  }
  const clearColumnWidths = () => {
    table.clearColumnWidths()
    columnWidths.value = table.getColumnWidths()
  }

  return {
    core,
    table,
    visibleRows,
    tableState,
    pinnedColumns,
    columnWidths,
    setSort,
    setSorts,
    clearSort,
    addFilter,
    removeFilter,
    clearFilters,
    setFilterFn,
    setPage,
    nextPage,
    prevPage,
    pinColumn,
    clearPinned,
    setColumnWidth,
    clearColumnWidths,
    refresh,
  }
}
