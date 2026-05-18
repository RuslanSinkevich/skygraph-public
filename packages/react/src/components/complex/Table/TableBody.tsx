import React, { useRef, useState, useEffect, useCallback } from 'react'
import { Checkbox } from '../../ui/Checkbox'
import { copyToClipboard } from './export'
import { TableGroupRow } from './TableGroupRow'
import type {
  TableColumn,
  RowSelectionConfig,
  ExpandableConfig,
  FlatRow,
  CellSpan,
  RowId,
  TableLocale,
  TableClassNames,
  TableStyles,
} from './types'
import type { ContextMenuItem, ContextMenuState } from './ContextMenu'

/** Internal props for the non-virtual table body grid. */
export interface BodyProps {
  /** Visible columns in render order. */
  columns: TableColumn[]
  /** Flattened rows including group headers. */
  flatRows: FlatRow[]
  /** Row selection config when selection column is shown. */
  rowSelection?: RowSelectionConfig
  /** Expandable row config when expand column is shown. */
  expandable?: ExpandableConfig
  /** Renders first column with tree indent and toggles. */
  isTreeMode: boolean
  /** Pixels per tree nesting level. */
  indentSize: number
  /** Keys of expanded tree nodes. */
  treeExpanded: Set<RowId>
  /** Keys of expanded detail rows. */
  expandedKeys: Set<RowId>
  /** Total grid columns including leading utility cells. */
  totalCols: number
  /** Map of cell key to rowspan/colspan. */
  spanMap: Map<string, CellSpan>
  /** Keys of cells covered by spans and not rendered. */
  hiddenCells: Set<string>
  /** Resolved locale strings. */
  t: Required<TableLocale>
  /** Optional row class or resolver. */
  rowClassName?: string | ((row: Record<string, unknown>, id: RowId) => string)
  /** Sticky/fixed/ellipsis styles per column. */
  fixedStyle: (col: TableColumn) => React.CSSProperties
  /** Row click handler. */
  onRowClick?: (id: RowId, data: Record<string, unknown>) => void
  /** Inline edit commit handler. */
  onCellEdit?: (id: RowId, column: string, value: unknown) => void
  /** Toggles a row in the selection model. */
  onSelectRow: (id: RowId, row: Record<string, unknown>) => void
  /** Toggles expanded row content. */
  onToggleExpand: (id: RowId) => void
  /** Toggles tree node expansion. */
  onToggleTreeExpand: (id: RowId) => void
  /** Enables row drag reorder handle column. */
  rowDraggable?: boolean
  /** Called after a row drag reorder. */
  onRowOrderChange?: (fromIndex: number, toIndex: number) => void
  /** Builds cell context menu items. */
  cellContextMenu?: (
    id: RowId,
    column: string,
    data: Record<string, unknown>,
  ) => ContextMenuItem[]
  /** Opens or closes the shared context menu. */
  onContextMenu: (state: ContextMenuState | null) => void
  /** Zebra striping for data rows. */
  striped?: boolean
  /** Renders leading row number cells. */
  showRowNumber?: boolean
  /** Group-by field name for header label. */
  groupBy?: string
  /** Toggles a grouped section expanded state. */
  onToggleGroup?: (groupKey: string) => void
  /** Current keyboard-focused cell coordinates. */
  focusedCell?: { row: number; col: number } | null
  /** Updates keyboard-focused cell. */
  onFocusCell?: (cell: { row: number; col: number } | null) => void
  /** Enables focus outlines and cell focus moves. */
  keyboardNavigation?: boolean
  /** Custom empty state when no rows. */
  emptyContent?: React.ReactNode
  /** Renders pinned top/bottom sections without zebra. */
  isPinnedSection?: boolean
  /** Публичные классы по слотам Table. */
  slotClassNames?: TableClassNames
  /** Публичные стили по слотам Table. */
  slotStyles?: TableStyles
  /**
   * Сдвиг локальных индексов до абсолютных. Передаётся `VirtualTableBody`
   * для виртуализации с динамическими высотами — при наличии оффсета
   * каждая строка получает атрибут `data-sg-virtual-row-index`, который
   * читает `ResizeObserver` для отчёта обратно в движок.
   */
  rowIndexOffset?: number
}

/** Renders the main or pinned table body rows, cells, and expand regions. */
export function TableBody(props: BodyProps) {
  const {
    columns,
    flatRows,
    rowSelection,
    expandable,
    isTreeMode,
    indentSize,
    treeExpanded,
    expandedKeys,
    totalCols,
    spanMap,
    hiddenCells,
    t,
    rowClassName,
    fixedStyle,
    onRowClick,
    onCellEdit,
    onSelectRow,
    onToggleExpand,
    onToggleTreeExpand,
    rowDraggable,
    onRowOrderChange,
    cellContextMenu,
    onContextMenu,
    striped,
    showRowNumber,
    groupBy,
    onToggleGroup,
    focusedCell,
    onFocusCell,
    keyboardNavigation,
    emptyContent,
    slotClassNames,
    slotStyles,
    isPinnedSection,
    rowIndexOffset,
  } = props

  const sCls = slotClassNames ?? {}
  const sSty = slotStyles ?? {}

  const [editingCell, setEditingCell] = useState<{
    rowId: RowId
    col: string
  } | null>(null)
  const [editValue, setEditValue] = useState('')
  const editRef = useRef<HTMLInputElement>(null)

  const [dragRowIdx, setDragRowIdx] = useState<number | null>(null)
  const [dragOverRowIdx, setDragOverRowIdx] = useState<number | null>(null)

  const [copiedCell, setCopiedCell] = useState<string | null>(null)

  useEffect(() => {
    if (editingCell && editRef.current) editRef.current.focus()
  }, [editingCell])

  const handleEditStart = (rowId: RowId, col: string, val: unknown) => {
    setEditingCell({ rowId, col })
    setEditValue(String(val ?? ''))
  }

  const handleEditSave = () => {
    if (editingCell && onCellEdit) {
      onCellEdit(editingCell.rowId, editingCell.col, editValue)
    }
    setEditingCell(null)
  }

  const handleEditCancel = () => setEditingCell(null)

  const handleRowDragStart = (e: React.DragEvent, idx: number) => {
    setDragRowIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(idx))
  }

  const handleRowDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverRowIdx(idx)
  }

  const handleRowDrop = (_e: React.DragEvent, toIdx: number) => {
    if (dragRowIdx !== null && dragRowIdx !== toIdx) {
      onRowOrderChange?.(dragRowIdx, toIdx)
    }
    setDragRowIdx(null)
    setDragOverRowIdx(null)
  }

  const handleRowDragEnd = () => {
    setDragRowIdx(null)
    setDragOverRowIdx(null)
  }

  const handleCellContext = (
    e: React.MouseEvent,
    id: RowId,
    colKey: string,
    data: Record<string, unknown>,
  ) => {
    if (!cellContextMenu) return
    e.preventDefault()
    const items = cellContextMenu(id, colKey, data)
    if (items.length > 0) {
      onContextMenu({ x: e.clientX, y: e.clientY, items })
    }
  }

  const handleCellCopy = useCallback(
    async (rowId: RowId, colKey: string, value: unknown) => {
      await copyToClipboard(String(value ?? ''))
      setCopiedCell(`${rowId}:${colKey}`)
      setTimeout(() => setCopiedCell(null), 1500)
    },
    [],
  )

  if (flatRows.length === 0) {
    return (
      <div
        className={['sg-table-empty', sCls.empty].filter(Boolean).join(' ')}
        style={{ gridColumn: `1 / ${totalCols + 1}`, ...sSty.empty }}
        role="row"
      >
        <span role="cell">{emptyContent ?? t.emptyText}</span>
      </div>
    )
  }

  let dataRowIndex = 0

  return (
    <>
      {flatRows.map((row, rowIdx) => {
        // Group row rendering
        if (row.__groupRow) {
          return (
            <TableGroupRow
              key={row.id}
              group={row.__groupRow}
              groupBy={groupBy}
              totalCols={totalCols}
              t={t}
              onToggle={onToggleGroup ?? (() => {})}
            />
          )
        }

        const currentDataIdx = dataRowIndex++
        const isExpanded = expandedKeys.has(row.id)
        const isSelected = rowSelection?.selectedKeys.includes(row.id)
        const canExpand = expandable?.rowExpandable
          ? expandable.rowExpandable(row.data)
          : !!expandable

        const rowCls =
          typeof rowClassName === 'function'
            ? rowClassName(row.data, row.id)
            : (rowClassName ?? '')

        const isZebra = striped && currentDataIdx % 2 === 1
        const isDragOver = dragOverRowIdx === rowIdx && dragRowIdx !== rowIdx
        const isPinned = isPinnedSection

        const virtualIndexAttr =
          rowIndexOffset !== undefined ? rowIndexOffset + rowIdx : undefined

        return (
          <React.Fragment key={row.id}>
            <div
              className={[
                'sg-table-row',
                isSelected ? 'sg-table-row-selected' : '',
                onRowClick ? 'sg-table-row-clickable' : '',
                isZebra ? 'sg-table-row-striped' : '',
                isDragOver ? 'sg-table-row-drag-over' : '',
                isPinned ? 'sg-table-row-pinned' : '',
                sCls.row,
                rowCls,
              ]
                .filter(Boolean)
                .join(' ')}
              role="row"
              style={{ display: 'contents', ...sSty.row }}
              data-sg-virtual-row-index={virtualIndexAttr}
              draggable={rowDraggable}
              onDragStart={
                rowDraggable ? (e) => handleRowDragStart(e, rowIdx) : undefined
              }
              onDragOver={
                rowDraggable ? (e) => handleRowDragOver(e, rowIdx) : undefined
              }
              onDrop={rowDraggable ? (e) => handleRowDrop(e, rowIdx) : undefined}
              onDragEnd={rowDraggable ? handleRowDragEnd : undefined}
            >
              {rowDraggable && (
                <div
                  className="sg-table-td sg-table-cell-drag-handle"
                  role="cell"
                  style={{ cursor: 'grab', userSelect: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  ⠿
                </div>
              )}

              {showRowNumber && (
                <div className="sg-table-td sg-table-cell-row-number" role="cell">
                  {currentDataIdx + 1}
                </div>
              )}

              {rowSelection && (
                <div
                  className="sg-table-td sg-table-cell-selection"
                  role="cell"
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectRow(row.id, row.data)
                  }}
                >
                  {rowSelection.type === 'radio' ? (
                    <input type="radio" checked={!!isSelected} readOnly />
                  ) : (
                    <Checkbox checked={!!isSelected} onChange={() => {}} />
                  )}
                </div>
              )}

              {expandable && (
                <div className="sg-table-td sg-table-cell-expand" role="cell">
                  {canExpand && (
                    <button
                      className={`sg-table-expand-btn${isExpanded ? ' sg-table-expand-open' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        onToggleExpand(row.id)
                      }}
                    >
                      {t.expandIcon}
                    </button>
                  )}
                </div>
              )}

              {columns.map((col, colIndex) => {
                const cellKey = `${row.id}:${col.key}`
                if (hiddenCells.has(cellKey)) return null

                const span = spanMap.get(cellKey)
                const val = row.data[col.key]
                const isEditing =
                  editingCell?.rowId === row.id && editingCell?.col === col.key
                const isFocused =
                  keyboardNavigation &&
                  focusedCell?.row === rowIdx &&
                  focusedCell?.col === colIndex
                const isCopied = copiedCell === cellKey

                const cellStyle: React.CSSProperties = { ...fixedStyle(col) }
                if (span?.colSpan && span.colSpan > 1)
                  cellStyle.gridColumn = `span ${span.colSpan}`
                if (span?.rowSpan && span.rowSpan > 1)
                  cellStyle.gridRow = `span ${span.rowSpan}`

                const isFirstCol = colIndex === 0
                const treeIndent =
                  isTreeMode && isFirstCol ? row.depth * indentSize : 0

                const cellClsExtra =
                  typeof col.cellClassName === 'function'
                    ? col.cellClassName(val, row.data, row.id)
                    : col.cellClassName ?? ''

                return (
                  <div
                    key={col.key}
                    className={[
                      'sg-table-td',
                      col.fixed ? 'sg-table-cell-fixed' : '',
                      col.fixed ? `sg-table-cell-fixed-${col.fixed}` : '',
                      col.editable ? 'sg-table-td-editable' : '',
                      isFocused ? 'sg-table-cell-focused' : '',
                      isCopied ? 'sg-table-cell-copied' : '',
                      col.copyable ? 'sg-table-cell-copyable' : '',
                      sCls.bodyCell,
                      cellClsExtra,
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    style={{ ...cellStyle, ...sSty.bodyCell }}
                    role="cell"
                    tabIndex={keyboardNavigation ? -1 : undefined}
                    onClick={() => {
                      onRowClick?.(row.id, row.data)
                      if (keyboardNavigation) {
                        onFocusCell?.({ row: rowIdx, col: colIndex })
                      }
                    }}
                    onContextMenu={(e) =>
                      handleCellContext(e, row.id, col.key, row.data)
                    }
                    onDoubleClick={
                      col.editable && onCellEdit
                        ? (e) => {
                            e.stopPropagation()
                            handleEditStart(row.id, col.key, val)
                          }
                        : undefined
                    }
                  >
                    {isTreeMode && isFirstCol && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          minWidth: treeIndent + 20,
                          flexShrink: 0,
                        }}
                      >
                        <span style={{ width: treeIndent }} />
                        {row.hasChildren ? (
                          <button
                            className={`sg-table-expand-btn${treeExpanded.has(row.id) ? ' sg-table-expand-open' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              onToggleTreeExpand(row.id)
                            }}
                          >
                            {t.expandIcon}
                          </button>
                        ) : (
                          <span style={{ width: 20 }} />
                        )}
                      </span>
                    )}
                    <span className="sg-table-cell-content">
                      {isEditing ? (
                        <input
                          ref={editRef}
                          className="sg-table-edit-input"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={handleEditSave}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEditSave()
                            if (e.key === 'Escape') handleEditCancel()
                          }}
                        />
                      ) : col.render ? (
                        col.render(val, row.data, row.id)
                      ) : (
                        String(val ?? '')
                      )}
                    </span>
                    {col.copyable && !isEditing && (
                      <button
                        className="sg-table-copy-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCellCopy(row.id, col.key, val)
                        }}
                        title="Copy"
                      >
                        {isCopied ? '✓' : '⎘'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {expandable && isExpanded && (
              <div
                className="sg-table-expanded-row"
                style={{ gridColumn: `1 / ${totalCols + 1}` }}
                role="row"
              >
                <div role="cell">
                  {expandable.expandedRowRender(row.data, row.id)}
                </div>
              </div>
            )}
          </React.Fragment>
        )
      })}
    </>
  )
}
