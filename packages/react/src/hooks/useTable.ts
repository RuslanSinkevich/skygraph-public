import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { createCore, createTable } from '@skygraph/core'
import type {
  Core,
  TableEngine,
  TableState,
  TableOptions,
  RowId,
  SortDirection,
  SortConfig,
  ColumnFilter,
} from '@skygraph/core'

export interface UseTableOptions extends TableOptions {
  data?: Array<{ id: RowId; data: Record<string, unknown> }>
}

export type FilterFn = (row: Record<string, unknown>) => boolean

export interface UseTableReturn {
  core: Core
  table: TableEngine
  visibleRows: Array<{ id: RowId; data: Record<string, unknown> }>
  tableState: TableState
  /** Snapshot of pinned columns; refreshes after `pinColumn` / `clearPinned`. */
  pinnedColumns: { left: string[]; right: string[] }
  /** Snapshot of persisted column widths; refreshes after `setColumnWidth` /
   *  `clearColumnWidths`. */
  columnWidths: Record<string, number>
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

export function useTable(options?: UseTableOptions): UseTableReturn {
  const [{ core, table }] = useState(() => {
    const c = createCore()
    const t = createTable(c, options)
    if (options?.data) {
      t.addRows(options.data)
    }
    return { core: c, table: t }
  })

  const [visibleRows, setVisibleRows] = useState(() => table.getVisibleRows())
  const [tableState, setTableState] = useState(() => table.getTableState())
  const [pinnedColumns, setPinnedColumns] = useState(() => table.getPinnedColumns())
  const [columnWidths, setColumnWidthsState] = useState<Record<string, number>>(
    () => table.getColumnWidths(),
  )

  const prevDataRef = useRef(options?.data)
  useEffect(() => {
    const newData = options?.data
    if (newData === prevDataRef.current) return
    prevDataRef.current = newData

    table.reset()
    if (newData) {
      table.addRows(newData)
    }
    setVisibleRows(table.getVisibleRows())
    setTableState(table.getTableState())
  }, [options?.data, table])

  const refresh = useCallback(() => {
    setVisibleRows(table.getVisibleRows())
    setTableState(table.getTableState())
    setPinnedColumns(table.getPinnedColumns())
    setColumnWidthsState(table.getColumnWidths())
  }, [table])

  const pinColumn = useCallback(
    (column: string, side: 'left' | 'right' | null) => {
      table.pinColumn(column, side)
      setPinnedColumns(table.getPinnedColumns())
    },
    [table],
  )

  const clearPinned = useCallback(() => {
    table.clearPinned()
    setPinnedColumns(table.getPinnedColumns())
  }, [table])

  const setColumnWidth = useCallback(
    (column: string, width: number) => {
      table.setColumnWidth(column, width)
      setColumnWidthsState(table.getColumnWidths())
    },
    [table],
  )

  const clearColumnWidths = useCallback(() => {
    table.clearColumnWidths()
    setColumnWidthsState(table.getColumnWidths())
  }, [table])

  const setSort = useCallback(
    (column: string, direction: SortDirection) => {
      table.setSort(column, direction)
      refresh()
    },
    [table, refresh]
  )

  const setSorts = useCallback(
    (sorts: SortConfig[]) => {
      table.setSorts(sorts)
      refresh()
    },
    [table, refresh]
  )

  const clearSort = useCallback(() => {
    table.clearSort()
    refresh()
  }, [table, refresh])

  const addFilter = useCallback(
    (filter: ColumnFilter) => {
      table.addFilter(filter)
      refresh()
    },
    [table, refresh]
  )

  const removeFilter = useCallback(
    (column: string) => {
      table.removeFilter(column)
      refresh()
    },
    [table, refresh]
  )

  const clearFilters = useCallback(() => {
    table.clearFilters()
    refresh()
  }, [table, refresh])

  const setFilterFn = useCallback(
    (fn: FilterFn | null) => {
      table.setFilterFn(fn)
      refresh()
    },
    [table, refresh]
  )

  const setPage = useCallback(
    (page: number) => {
      table.setPage(page)
      refresh()
    },
    [table, refresh]
  )

  const nextPage = useCallback(() => {
    table.nextPage()
    refresh()
  }, [table, refresh])

  const prevPage = useCallback(() => {
    table.prevPage()
    refresh()
  }, [table, refresh])

  return useMemo(
    () => ({
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
    }),
    [
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
    ]
  )
}
