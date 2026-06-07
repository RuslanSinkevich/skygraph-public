import React, {
  forwardRef,
  useImperativeHandle,
  useCallback,
  useRef,
  useMemo,
  useState,
} from 'react'
import { useVirtualScroll } from '../../../hooks/useVirtualScroll'
import { Spin } from '../../ui/Spin'
import { Checkbox } from '../../ui/Checkbox'
import { useDataGridState } from './useDataGridState'
import type {
  DataGridProps,
  DataGridRef,
  CellPosition,
  CellValue,
  DataGridColumn,
  CellEditorProps,
  DataGridContextMenuItem,
} from './types'

const cls = {
  root: 'sg-datagrid',
  header: 'sg-datagrid-header',
  headerCell: 'sg-datagrid-header-cell',
  body: 'sg-datagrid-body',
  row: 'sg-datagrid-row',
  rowEven: 'sg-datagrid-row--even',
  rowOdd: 'sg-datagrid-row--odd',
  rowHoverable: 'sg-datagrid-row--hoverable',
  rowSelected: 'sg-datagrid-row--selected',
  cell: 'sg-datagrid-cell',
  cellActive: 'sg-datagrid-cell--active',
  cellEditing: 'sg-datagrid-cell--editing',
  cellSelected: 'sg-datagrid-cell--selected',
  frozen: 'sg-datagrid-cell--frozen',
  sortable: 'sg-datagrid-header-cell--sortable',
  sortAsc: 'sg-datagrid-header-cell--asc',
  sortDesc: 'sg-datagrid-header-cell--desc',
  resizer: 'sg-datagrid-resizer',
  empty: 'sg-datagrid-empty',
  summary: 'sg-datagrid-summary',
  summaryRow: 'sg-datagrid-summary-row',
  summaryCell: 'sg-datagrid-summary-cell',
  contextMenu: 'sg-datagrid-context-menu',
  contextMenuItem: 'sg-datagrid-context-menu-item',
  contextMenuDanger: 'sg-datagrid-context-menu-item--danger',
  contextMenuDisabled: 'sg-datagrid-context-menu-item--disabled',
  contextMenuDivider: 'sg-datagrid-context-menu-divider',
  loading: 'sg-datagrid-loading',
  selectionCell: 'sg-datagrid-selection-cell',
  rowNumberCell: 'sg-datagrid-row-number-cell',
  headerDragOver: 'sg-datagrid-header-cell--drag-over',
}

const SELECTION_COL_WIDTH = 40
const ROW_NUMBER_COL_WIDTH = 48

function DefaultEditor({ value, onChange, onCommit, onCancel }: CellEditorProps) {
  return (
    <input
      autoFocus
      defaultValue={value == null ? '' : String(value)}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onCommit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onCommit()
        if (e.key === 'Escape') onCancel()
      }}
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        outline: 'none',
        padding: '0 8px',
        background: 'transparent',
        font: 'inherit',
      }}
    />
  )
}

function isCellInRange(
  row: number,
  col: number,
  range: { start: CellPosition; end: CellPosition } | null,
): boolean {
  if (!range) return false
  const minRow = Math.min(range.start.row, range.end.row)
  const maxRow = Math.max(range.start.row, range.end.row)
  const minCol = Math.min(range.start.col, range.end.col)
  const maxCol = Math.max(range.start.col, range.end.col)
  return row >= minRow && row <= maxRow && col >= minCol && col <= maxCol
}

function ContextMenuPopup({
  items,
  position,
  onClose,
}: {
  items: DataGridContextMenuItem[]
  position: { x: number; y: number }
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  // Only the coordinates are runtime-computed; visuals (z-index, padding,
  // colours, hover, danger/disabled state) live in
  // `packages/styles/components/context-menu.css` under
  // `.sg-datagrid-context-menu*`.
  return (
    <div
      ref={ref}
      className={cls.contextMenu}
      style={{ position: 'fixed', top: position.y, left: position.x }}
    >
      {items.map((item) =>
        item.divider ? (
          <div key={item.key} className={cls.contextMenuDivider} />
        ) : (
          <div
            key={item.key}
            className={[
              cls.contextMenuItem,
              item.danger ? cls.contextMenuDanger : '',
              item.disabled ? cls.contextMenuDisabled : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => {
              if (!item.disabled) {
                item.onClick()
                onClose()
              }
            }}
          >
            {item.label}
          </div>
        ),
      )}
    </div>
  )
}

function DataGridInner<R extends Record<string, unknown>>(
  props: DataGridProps<R>,
  ref: React.ForwardedRef<DataGridRef>,
) {
  const {
    columns,
    data,
    rowKey,
    rowHeight = 36,
    headerHeight = 40,
    width = '100%',
    height = 400,
    className,
    style,
    onCellEdit,
    sortColumn,
    sortDirection,
    onSort,
    onCopy,
    onPaste,
    overscan = 5,
    locale,
    rowSelection,
    selectedRows,
    onSelectedRowsChange,
    striped,
    highlightOnHover = true,
    showRowNumber,
    summaryRows,
    cellClassName,
    cellStyle: cellStyleFn,
    columnReorder,
    onColumnOrderChange,
    onContextMenu,
    onRowClick,
    onRowDoubleClick,
    rowClassName,
    loading,
    emptyContent,
  } = props

  const containerRef = useRef<HTMLDivElement>(null)

  const state = useDataGridState(columns, data)
  const {
    activeCell,
    setActiveCell,
    editingCell,
    startEditing,
    stopEditing,
    editValueRef,
    selection,
    navigate,
    resizeColumn,
    getColumnWidth,
    columnOrder,
    reorderColumns,
    dragColumnRef,
  } = state

  const [ctxMenu, setCtxMenu] = useState<{
    items: DataGridContextMenuItem[]
    position: { x: number; y: number }
  } | null>(null)

  const [dragOverCol, setDragOverCol] = useState<string | null>(null)

  const {
    range,
    containerRef: scrollRef,
    scrollToIndex,
  } = useVirtualScroll({
    itemCount: data.length,
    itemHeight: rowHeight,
    overscan,
  })

  const getRowKey = useCallback(
    (row: R, index: number): React.Key => {
      if (typeof rowKey === 'function') return rowKey(row, index)
      return row[rowKey] as React.Key
    },
    [rowKey],
  )

  const frozenLeft = useMemo(() => columns.filter((c) => c.frozen === 'left'), [columns])
  const frozenRight = useMemo(() => columns.filter((c) => c.frozen === 'right'), [columns])
  const scrollable = useMemo(() => columns.filter((c) => !c.frozen), [columns])

  const orderedColumns = useMemo(() => {
    const base = [...frozenLeft, ...scrollable, ...frozenRight]
    if (!columnOrder) return base
    const map = new Map(base.map((c) => [c.key, c]))
    const ordered: DataGridColumn<R>[] = []
    for (const key of columnOrder) {
      const col = map.get(key)
      if (col) ordered.push(col)
    }
    for (const col of base) {
      if (!columnOrder.includes(col.key)) ordered.push(col)
    }
    return ordered
  }, [frozenLeft, scrollable, frozenRight, columnOrder])

  const extraColsWidth =
    (rowSelection ? SELECTION_COL_WIDTH : 0) + (showRowNumber ? ROW_NUMBER_COL_WIDTH : 0)

  const totalWidth = useMemo(
    () => orderedColumns.reduce((sum, col) => sum + getColumnWidth(col.key), 0) + extraColsWidth,
    [orderedColumns, getColumnWidth, extraColsWidth],
  )

  const allSelected = useMemo(() => {
    if (!selectedRows || data.length === 0) return false
    return data.every((row, i) => selectedRows.has(getRowKey(row, i)))
  }, [selectedRows, data, getRowKey])

  const someSelected = useMemo(() => {
    if (!selectedRows || data.length === 0) return false
    const count = data.filter((row, i) => selectedRows.has(getRowKey(row, i))).length
    return count > 0 && count < data.length
  }, [selectedRows, data, getRowKey])

  const handleSelectAll = useCallback(() => {
    if (!onSelectedRowsChange) return
    if (allSelected) {
      onSelectedRowsChange(new Set())
    } else {
      const all = new Set<React.Key>(data.map((row, i) => getRowKey(row, i)))
      onSelectedRowsChange(all)
    }
  }, [allSelected, data, getRowKey, onSelectedRowsChange])

  const handleSelectRow = useCallback(
    (row: R, index: number) => {
      if (!onSelectedRowsChange || !selectedRows) return
      const key = getRowKey(row, index)
      const next = new Set(selectedRows)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      onSelectedRowsChange(next)
    },
    [getRowKey, onSelectedRowsChange, selectedRows],
  )

  const handleCellClick = useCallback(
    (rowIndex: number, colIndex: number) => {
      if (editingCell) {
        if (onCellEdit && editValueRef.current !== undefined) {
          onCellEdit(editingCell.row, orderedColumns[editingCell.col].key, editValueRef.current)
        }
        stopEditing()
      }
      setActiveCell({ row: rowIndex, col: colIndex })
    },
    [editingCell, onCellEdit, editValueRef, orderedColumns, stopEditing, setActiveCell],
  )

  const handleCellDoubleClick = useCallback(
    (rowIndex: number, colIndex: number) => {
      startEditing({ row: rowIndex, col: colIndex })
    },
    [startEditing],
  )

  const handleCommitEdit = useCallback(() => {
    if (editingCell && onCellEdit && editValueRef.current !== undefined) {
      onCellEdit(editingCell.row, orderedColumns[editingCell.col].key, editValueRef.current)
    }
    stopEditing()
  }, [editingCell, onCellEdit, editValueRef, orderedColumns, stopEditing])

  const handleCancelEdit = useCallback(() => {
    stopEditing()
  }, [stopEditing])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!activeCell) return

      if (editingCell) return

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          navigate(activeCell, 'up', e.shiftKey)
          break
        case 'ArrowDown':
          e.preventDefault()
          navigate(activeCell, 'down', e.shiftKey)
          break
        case 'ArrowLeft':
          e.preventDefault()
          navigate(activeCell, 'left', e.shiftKey)
          break
        case 'ArrowRight':
          e.preventDefault()
          navigate(activeCell, 'right', e.shiftKey)
          break
        case 'Enter':
          e.preventDefault()
          startEditing(activeCell)
          break
        case 'Tab':
          e.preventDefault()
          navigate(activeCell, e.shiftKey ? 'left' : 'right')
          break
        case 'Escape':
          setActiveCell(null)
          break
        case ' ':
          if (rowSelection && selectedRows) {
            e.preventDefault()
            const row = data[activeCell.row]
            if (row) handleSelectRow(row, activeCell.row)
          }
          break
        case 'a':
          if ((e.ctrlKey || e.metaKey) && rowSelection) {
            e.preventDefault()
            handleSelectAll()
          }
          break
        case 'c':
          if ((e.ctrlKey || e.metaKey) && onCopy) {
            e.preventDefault()
            const col = orderedColumns[activeCell.col]
            const val = data[activeCell.row]?.[col.key]
            onCopy(val == null ? '' : String(val))
          }
          break
        case 'v':
          if ((e.ctrlKey || e.metaKey) && onPaste) {
            e.preventDefault()
            navigator.clipboard?.readText().then((text) => {
              onPaste(text, activeCell)
            })
          }
          break
      }
    },
    [
      activeCell,
      editingCell,
      navigate,
      startEditing,
      setActiveCell,
      onCopy,
      onPaste,
      orderedColumns,
      data,
      rowSelection,
      selectedRows,
      handleSelectRow,
      handleSelectAll,
    ],
  )

  const handleSort = useCallback(
    (col: DataGridColumn<R>) => {
      if (!col.sortable || !onSort) return
      const dir = sortColumn === col.key && sortDirection === 'asc' ? 'desc' : 'asc'
      onSort(col.key, dir)
    },
    [sortColumn, sortDirection, onSort],
  )

  const handleCellContextMenu = useCallback(
    (e: React.MouseEvent, rowIndex: number, col: DataGridColumn<R>) => {
      if (!onContextMenu) return
      e.preventDefault()
      const row = data[rowIndex]
      if (!row) return
      const items = onContextMenu(rowIndex, col.key, row)
      if (items.length === 0) return
      setCtxMenu({ items, position: { x: e.clientX, y: e.clientY } })
    },
    [onContextMenu, data],
  )

  const handleHeaderDragStart = useCallback(
    (e: React.DragEvent, colKey: string) => {
      if (!columnReorder) return
      dragColumnRef.current = colKey
      e.dataTransfer.effectAllowed = 'move'
    },
    [columnReorder, dragColumnRef],
  )

  const handleHeaderDragOver = useCallback(
    (e: React.DragEvent, colKey: string) => {
      if (!columnReorder || !dragColumnRef.current) return
      e.preventDefault()
      setDragOverCol(colKey)
    },
    [columnReorder, dragColumnRef],
  )

  const handleHeaderDrop = useCallback(
    (e: React.DragEvent, colKey: string) => {
      e.preventDefault()
      if (!columnReorder || !dragColumnRef.current) return
      const newOrder = reorderColumns(dragColumnRef.current, colKey)
      dragColumnRef.current = null
      setDragOverCol(null)
      onColumnOrderChange?.(newOrder)
    },
    [columnReorder, dragColumnRef, reorderColumns, onColumnOrderChange],
  )

  const handleHeaderDragEnd = useCallback(() => {
    dragColumnRef.current = null
    setDragOverCol(null)
  }, [dragColumnRef])

  useImperativeHandle(
    ref,
    () => ({
      scrollToRow: scrollToIndex,
      scrollToColumn: () => {},
      getActiveCell: () => activeCell,
      setActiveCell,
    }),
    [scrollToIndex, activeCell, setActiveCell],
  )

  const handleResizeStart = useCallback(
    (colKey: string, startX: number) => {
      const startWidth = getColumnWidth(colKey)

      const onMouseMove = (e: MouseEvent) => {
        const delta = e.clientX - startX
        resizeColumn(colKey, startWidth + delta)
      }
      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
      }
      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    },
    [getColumnWidth, resizeColumn],
  )

  const renderCell = useCallback(
    (row: R, rowIndex: number, col: DataGridColumn<R>, colIndex: number) => {
      const isActive = activeCell?.row === rowIndex && activeCell?.col === colIndex
      const isEditing = editingCell?.row === rowIndex && editingCell?.col === colIndex
      const isSelected = isCellInRange(rowIndex, colIndex, selection)

      const rawValue = col.formula ? col.formula(row) : (row[col.key] as CellValue)

      const extraClass = cellClassName?.(rawValue, row, rowIndex, col) ?? ''
      const extraStyle = cellStyleFn?.(rawValue, row, rowIndex, col)

      const cellClassNames = [
        cls.cell,
        isActive ? cls.cellActive : '',
        isEditing ? cls.cellEditing : '',
        isSelected ? cls.cellSelected : '',
        col.frozen ? cls.frozen : '',
        col.className ?? '',
        extraClass,
      ]
        .filter(Boolean)
        .join(' ')

      const baseCellStyle: React.CSSProperties = {
        width: getColumnWidth(col.key),
        minWidth: getColumnWidth(col.key),
        textAlign: col.align ?? 'left',
        ...extraStyle,
      }

      return (
        <div
          key={col.key}
          className={cellClassNames}
          style={baseCellStyle}
          onClick={() => handleCellClick(rowIndex, colIndex)}
          onDoubleClick={() => handleCellDoubleClick(rowIndex, colIndex)}
          onContextMenu={(e) => handleCellContextMenu(e, rowIndex, col)}
          role="gridcell"
          aria-colindex={colIndex + 1 + (rowSelection ? 1 : 0) + (showRowNumber ? 1 : 0)}
          aria-selected={isActive || isSelected}
        >
          {isEditing ? (
            (col.editor ?? (DefaultEditor as (props: CellEditorProps<R>) => React.ReactNode))({
              value: rawValue,
              row,
              rowIndex,
              column: col,
              onChange: (v) => {
                editValueRef.current = v
              },
              onCommit: handleCommitEdit,
              onCancel: handleCancelEdit,
            })
          ) : col.render ? (
            col.render(rawValue, row, rowIndex)
          ) : (
            <span>{rawValue == null ? '' : String(rawValue)}</span>
          )}
        </div>
      )
    },
    [
      activeCell,
      editingCell,
      selection,
      getColumnWidth,
      handleCellClick,
      handleCellDoubleClick,
      handleCommitEdit,
      handleCancelEdit,
      editValueRef,
      cellClassName,
      cellStyleFn,
      handleCellContextMenu,
      rowSelection,
      showRowNumber,
    ],
  )

  const heightValue = typeof height === 'number' ? height : undefined
  const bodyHeight = heightValue ? heightValue - headerHeight : undefined

  const rootCls = [
    cls.root,
    striped ? 'sg-datagrid--striped' : '',
    loading ? 'sg-datagrid--loading' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      ref={containerRef}
      className={rootCls}
      style={{
        width,
        height,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        ...style,
      }}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="grid"
      aria-rowcount={data.length}
      aria-colcount={orderedColumns.length}
    >
      {/* Header */}
      <div
        className={cls.header}
        style={{
          display: 'flex',
          height: headerHeight,
          minHeight: headerHeight,
          minWidth: totalWidth,
        }}
        role="row"
      >
        {rowSelection && (
          <div
            className={`${cls.headerCell} ${cls.selectionCell}`}
            style={{
              width: SELECTION_COL_WIDTH,
              minWidth: SELECTION_COL_WIDTH,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            role="columnheader"
          >
            <Checkbox
              checked={allSelected}
              indeterminate={someSelected}
              onChange={handleSelectAll}
            />
          </div>
        )}
        {showRowNumber && (
          <div
            className={`${cls.headerCell} ${cls.rowNumberCell}`}
            style={{
              width: ROW_NUMBER_COL_WIDTH,
              minWidth: ROW_NUMBER_COL_WIDTH,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              userSelect: 'none',
            }}
            role="columnheader"
          >
            #
          </div>
        )}
        {orderedColumns.map((col) => {
          const isSorted = sortColumn === col.key
          const headerCls = [
            cls.headerCell,
            col.sortable ? cls.sortable : '',
            isSorted && sortDirection === 'asc' ? cls.sortAsc : '',
            isSorted && sortDirection === 'desc' ? cls.sortDesc : '',
            col.headerClassName ?? '',
            dragOverCol === col.key ? cls.headerDragOver : '',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <div
              key={col.key}
              className={headerCls}
              style={{
                width: getColumnWidth(col.key),
                minWidth: getColumnWidth(col.key),
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                padding: '0 8px',
                cursor: col.sortable ? 'pointer' : 'default',
                userSelect: 'none',
              }}
              onClick={() => handleSort(col)}
              draggable={!!columnReorder}
              onDragStart={(e) => handleHeaderDragStart(e, col.key)}
              onDragOver={(e) => handleHeaderDragOver(e, col.key)}
              onDrop={(e) => handleHeaderDrop(e, col.key)}
              onDragEnd={handleHeaderDragEnd}
              onDragLeave={() => setDragOverCol(null)}
              role="columnheader"
            >
              {col.title}
              {isSorted && (
                <span style={{ marginLeft: 4, fontSize: 10 }}>
                  {sortDirection === 'asc' ? '▲' : '▼'}
                </span>
              )}
              {col.resizable !== false && (
                <div
                  className={cls.resizer}
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: 4,
                    cursor: 'col-resize',
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation()
                    handleResizeStart(col.key, e.clientX)
                  }}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Body */}
      <div
        ref={scrollRef as React.RefObject<HTMLDivElement>}
        className={cls.body}
        style={{
          flex: 1,
          overflow: 'auto',
          position: 'relative',
          height: bodyHeight,
        }}
      >
        {data.length === 0 ? (
          <div className={cls.empty} style={{ padding: 24, textAlign: 'center' }}>
            {emptyContent ?? locale?.noData ?? 'No data'}
          </div>
        ) : (
          <div style={{ height: range.totalHeight, position: 'relative', minWidth: totalWidth }}>
            {range.visibleItems.map((vi) => {
              const row = data[vi.index]
              if (!row) return null
              const rKey = getRowKey(row, vi.index)
              const isRowSelected = selectedRows?.has(rKey) ?? false
              const rowExtraClass =
                typeof rowClassName === 'function'
                  ? rowClassName(row, vi.index)
                  : (rowClassName ?? '')

              const rowCls = [
                cls.row,
                striped ? (vi.index % 2 === 0 ? cls.rowEven : cls.rowOdd) : '',
                highlightOnHover ? cls.rowHoverable : '',
                isRowSelected ? cls.rowSelected : '',
                rowExtraClass,
              ]
                .filter(Boolean)
                .join(' ')

              return (
                <div
                  key={rKey}
                  className={rowCls}
                  style={{
                    display: 'flex',
                    position: 'absolute',
                    top: vi.offsetTop,
                    height: vi.height,
                    width: '100%',
                  }}
                  role="row"
                  aria-rowindex={vi.index + 1}
                  aria-selected={isRowSelected}
                  onClick={() => onRowClick?.(row, vi.index)}
                  onDoubleClick={() => onRowDoubleClick?.(row, vi.index)}
                >
                  {rowSelection && (
                    <div
                      className={`${cls.cell} ${cls.selectionCell}`}
                      style={{
                        width: SELECTION_COL_WIDTH,
                        minWidth: SELECTION_COL_WIDTH,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={isRowSelected}
                        onChange={() => handleSelectRow(row, vi.index)}
                      />
                    </div>
                  )}
                  {showRowNumber && (
                    <div
                      className={`${cls.cell} ${cls.rowNumberCell}`}
                      style={{
                        width: ROW_NUMBER_COL_WIDTH,
                        minWidth: ROW_NUMBER_COL_WIDTH,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--sg-color-text-tertiary, #999)',
                      }}
                    >
                      {vi.index + 1}
                    </div>
                  )}
                  {orderedColumns.map((col, ci) => renderCell(row, vi.index, col, ci))}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Summary Footer */}
      {summaryRows && summaryRows.length > 0 && data.length > 0 && (
        <div className={cls.summary} style={{ minWidth: totalWidth }}>
          {summaryRows.map((sr, sri) => (
            <div
              key={sri}
              className={`${cls.summaryRow} ${sr.className ?? ''}`}
              style={{ display: 'flex', height: rowHeight }}
            >
              {rowSelection && (
                <div
                  className={`${cls.summaryCell}`}
                  style={{ width: SELECTION_COL_WIDTH, minWidth: SELECTION_COL_WIDTH }}
                />
              )}
              {showRowNumber && (
                <div
                  className={`${cls.summaryCell}`}
                  style={{ width: ROW_NUMBER_COL_WIDTH, minWidth: ROW_NUMBER_COL_WIDTH }}
                />
              )}
              {orderedColumns.map((col) => (
                <div
                  key={col.key}
                  className={cls.summaryCell}
                  style={{
                    width: getColumnWidth(col.key),
                    minWidth: getColumnWidth(col.key),
                    textAlign: col.align ?? 'left',
                  }}
                >
                  {sr.render(col.key, data)}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Context Menu */}
      {ctxMenu && (
        <ContextMenuPopup
          items={ctxMenu.items}
          position={ctxMenu.position}
          onClose={() => setCtxMenu(null)}
        />
      )}

      {/* Loading */}
      {loading && (
        <div
          className={cls.loading}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.6)',
            zIndex: 10,
          }}
        >
          <Spin size="large" />
        </div>
      )}
    </div>
  )
}

/**
 * Virtualized table grid with sortable headers, resizable columns, inline editing,
 * row selection, striped rows, summary footer, context menu, column reorder, and clipboard hooks.
 */
export const DataGrid = forwardRef(DataGridInner) as <R extends Record<string, unknown>>(
  props: DataGridProps<R> & { ref?: React.Ref<DataGridRef> },
) => React.ReactElement
