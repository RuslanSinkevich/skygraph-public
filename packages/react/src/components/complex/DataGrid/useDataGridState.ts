import { useState, useCallback, useRef } from 'react'
import type { CellPosition, CellRange, CellValue, DataGridColumn } from './types'

/**
 * Holds active cell, edit session, range selection, column width, and column order state for `DataGrid`.
 */
export function useDataGridState<R>(columns: DataGridColumn<R>[], data: R[]) {
  const [activeCell, setActiveCell] = useState<CellPosition | null>(null)
  const [editingCell, setEditingCell] = useState<CellPosition | null>(null)
  const [selection, setSelection] = useState<CellRange | null>(null)
  const [columnWidths, setColumnWidths] = useState<Map<string, number>>(() => {
    const map = new Map<string, number>()
    for (const col of columns) {
      if (col.width) map.set(col.key, col.width)
    }
    return map
  })
  const [columnOrder, setColumnOrder] = useState<string[] | null>(null)

  const editValueRef = useRef<CellValue>(undefined)
  const dragColumnRef = useRef<string | null>(null)

  const startEditing = useCallback(
    (pos: CellPosition) => {
      const col = columns[pos.col]
      if (!col) return

      const isEditable =
        typeof col.editable === 'function'
          ? col.editable(data[pos.row], pos.row)
          : col.editable !== false

      if (!isEditable) return

      editValueRef.current = (data[pos.row] as Record<string, unknown>)[col.key] as CellValue
      setEditingCell(pos)
    },
    [columns, data],
  )

  const stopEditing = useCallback(() => {
    setEditingCell(null)
    editValueRef.current = undefined
  }, [])

  const navigate = useCallback(
    (
      from: CellPosition,
      direction: 'up' | 'down' | 'left' | 'right',
      shiftKey = false,
    ): CellPosition => {
      let { row, col } = from
      switch (direction) {
        case 'up':
          row = Math.max(0, row - 1)
          break
        case 'down':
          row = Math.min(data.length - 1, row + 1)
          break
        case 'left':
          col = Math.max(0, col - 1)
          break
        case 'right':
          col = Math.min(columns.length - 1, col + 1)
          break
      }
      const next = { row, col }

      if (shiftKey) {
        setSelection((prev) => ({
          start: prev?.start ?? from,
          end: next,
        }))
      } else {
        setSelection(null)
      }

      setActiveCell(next)
      return next
    },
    [data.length, columns.length],
  )

  const resizeColumn = useCallback(
    (key: string, width: number) => {
      const col = columns.find((c) => c.key === key)
      const minW = col?.minWidth ?? 50
      const maxW = col?.maxWidth ?? Infinity
      const clamped = Math.max(minW, Math.min(maxW, width))
      setColumnWidths((prev) => new Map(prev).set(key, clamped))
    },
    [columns],
  )

  const getColumnWidth = useCallback(
    (key: string): number => {
      return columnWidths.get(key) ?? columns.find((c) => c.key === key)?.width ?? 120
    },
    [columnWidths, columns],
  )

  const reorderColumns = useCallback(
    (fromKey: string, toKey: string) => {
      const order = columnOrder ?? columns.map((c) => c.key)
      const fromIdx = order.indexOf(fromKey)
      const toIdx = order.indexOf(toKey)
      if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return order
      const next = [...order]
      const [moved] = next.splice(fromIdx, 1)
      next.splice(toIdx, 0, moved)
      setColumnOrder(next)
      return next
    },
    [columnOrder, columns],
  )

  return {
    activeCell,
    setActiveCell,
    editingCell,
    startEditing,
    stopEditing,
    editValueRef,
    selection,
    setSelection,
    navigate,
    resizeColumn,
    getColumnWidth,
    columnOrder,
    setColumnOrder,
    reorderColumns,
    dragColumnRef,
  }
}
