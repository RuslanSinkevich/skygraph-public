import React from 'react'
import { Checkbox } from '../../ui/Checkbox'
import { FilterTrigger, FilterDropdownContent } from './FilterDropdown'
import type {
  AdvancedFilter,
  TableColumn,
  HeaderCell,
  RowSelectionConfig,
  ExpandableConfig,
  TableLocale,
  SortDirection,
  SortConfig,
  FilterDropdownProps,
  TableClassNames,
  TableStyles,
} from './types'
import type { ContextMenuItem, ContextMenuState } from './ContextMenu'

/** Internal props for the table header row(s). */
interface HeaderProps {
  /** Visible leaf columns in flat header mode. */
  columns: TableColumn[]
  /** Multi-row header grid when columns are grouped. */
  headerRows: HeaderCell[][] | null
  /** Whether grouped header rows are used. */
  hasColumnGroups: boolean
  /** Selection column state when enabled. */
  rowSelection?: RowSelectionConfig
  /** Expand column spacer when enabled. */
  expandable?: ExpandableConfig
  /** Enables column drag reorder. */
  draggable?: boolean
  /** All visible rows are selected. */
  allSelected: boolean
  /** Some but not all visible rows are selected. */
  someSelected: boolean
  /** Column key currently highlighted as drag target. */
  dragOver: string | null
  /** Resolved locale strings. */
  t: Required<TableLocale>
  /** Sticky/fixed styles for header cells. */
  fixedStyle: (col: TableColumn, isHeader?: boolean) => React.CSSProperties
  /** Sort click handler (supports multi-sort via shift). */
  onSort: (col: TableColumn, shiftKey?: boolean) => void
  /** Select-all checkbox toggle. */
  onSelectAll: () => void
  /** Column drag start. */
  onDragStart: (e: React.DragEvent, key: string) => void
  /** Column drag over. */
  onDragOver: (e: React.DragEvent, key: string) => void
  /** Clears drag-over highlight. */
  onDragLeave: () => void
  /** Column drop to reorder. */
  onDrop: (e: React.DragEvent, key: string) => void
  /** Column drag end cleanup. */
  onDragEnd: () => void
  /** Begins column resize drag. */
  onResizeStart: (e: React.MouseEvent, colKey: string) => void
  /** Filter dropdown UI state. */
  filterState: {
    /** Active filter values per column key. */
    activeFilters: Record<string, unknown[]>
    /** Per-column filter search box text. */
    filterSearchText: Record<string, string>
    /** Column key with open filter dropdown, if any. */
    openFilterDropdown: string | null
    /** Active advanced filters keyed by column. */
    advancedFilters: Record<string, AdvancedFilter>
    /** Anchor элемент для портального позиционирования popover'а. */
    filterAnchor: HTMLElement | null
  }
  /** Filter dropdown callbacks and helpers. */
  filterActions: {
    /** Opens or closes a column filter popover. */
    setOpenFilterDropdown: (key: string | null) => void
    /** Сохраняет DOM-якорь для позиционирования portal'нутого popover'а. */
    setFilterAnchor: (el: HTMLElement | null) => void
    /** Toggles a value in multi-select filters. */
    handleFilterToggle: (colKey: string, value: unknown, multiple: boolean) => void
    /** Applies filters and closes the dropdown. */
    handleFilterConfirm: (colKey: string) => void
    /** Clears filters for a column. */
    handleFilterReset: (colKey: string) => void
    /** Closes the dropdown for a column. */
    handleFilterClose: (colKey: string) => void
    /** Updates search-mode filter text. */
    handleSearchFilterChange: (colKey: string, text: string) => void
    /** Updates filter list search text state. */
    setFilterSearchText: React.Dispatch<React.SetStateAction<Record<string, string>>>
    /** Builds props for custom `filterDropdown` renderers. */
    getFilterDropdownProps: (col: TableColumn) => FilterDropdownProps
    /** Sets / clears the advanced filter for a column. */
    setAdvancedFilter: (colKey: string, filter: AdvancedFilter | null) => void
  }
  /** Ref attached to the open filter panel for outside click. */
  filterRef: React.RefObject<HTMLDivElement | null>
  /** Active multi-sort configuration. */
  sorts: SortConfig[]
  /** 0-based sort priority index for a column, or -1. */
  getSortIndex: (colKey: string) => number
  /** Current sort direction for a column, if any. */
  getSortDirection: (colKey: string) => SortDirection | null
  /** Extra context menu items for a header cell. */
  headerContextMenu?: (column: TableColumn) => ContextMenuItem[]
  /** Opens the shared context menu. */
  onContextMenu: (state: ContextMenuState | null) => void
  /** Renders row number header cell. */
  showRowNumber?: boolean
  /** Spacer column for row drag handle. */
  rowDraggable?: boolean
  /** Enables pin/unpin items in the header menu. */
  columnPinning?: boolean
  /** Pins a column left, right, or unpins. */
  onPinColumn?: (key: string, fixed: 'left' | 'right' | undefined) => void
  /** Auto-fits column width to measured content. */
  onAutoResize?: (colKey: string) => void
  /** Публичные классы по слотам Table (передаются из Table.tsx). */
  slotClassNames?: TableClassNames
  /** Публичные стили по слотам Table. */
  slotStyles?: TableStyles
}

function SortIndicator({
  col,
  sorts,
  getSortIndex,
  getSortDirection,
  t,
}: {
  col: TableColumn
  sorts: SortConfig[]
  getSortIndex: (colKey: string) => number
  getSortDirection: (colKey: string) => SortDirection | null
  t: Required<TableLocale>
}) {
  if (!col.sortable) return null
  const dir = getSortDirection(col.key)
  const idx = getSortIndex(col.key)
  const isActive = dir !== null

  return (
    <span className={`sg-table-sort-arrows${isActive ? ' sg-table-sort-active' : ''}`}>
      <span className={`sg-table-sort-asc${dir === 'asc' ? ' sg-table-sort-current' : ''}`}>
        {t.sortAsc}
      </span>
      <span className={`sg-table-sort-desc${dir === 'desc' ? ' sg-table-sort-current' : ''}`}>
        {t.sortDesc}
      </span>
      {idx >= 0 && sorts.length > 1 && <span className="sg-table-sort-index">{idx + 1}</span>}
    </span>
  )
}

function ColumnTooltip({ content }: { content: string | React.ReactNode }) {
  if (!content) return null
  return (
    <span className="sg-table-th-tooltip" title={typeof content === 'string' ? content : undefined}>
      ⓘ
    </span>
  )
}

/** Renders flat or grouped header cells with sort, filter, resize, and drag handles. */
export function TableHeader(props: HeaderProps) {
  const {
    columns,
    headerRows,
    hasColumnGroups,
    rowSelection,
    expandable,
    draggable,
    allSelected,
    someSelected,
    dragOver,
    t,
    fixedStyle,
    onSort,
    onSelectAll,
    onDragStart,
    onDragOver,
    onDragLeave,
    onDrop,
    onDragEnd,
    onResizeStart,
    filterState,
    filterActions,
    filterRef,
    sorts,
    getSortIndex,
    getSortDirection,
    headerContextMenu,
    onContextMenu,
    showRowNumber,
    rowDraggable,
    columnPinning,
    onPinColumn,
    onAutoResize,
    slotClassNames,
    slotStyles,
  } = props

  const sCls = slotClassNames ?? {}
  const sSty = slotStyles ?? {}

  const filterProps = (col: TableColumn) => ({
    col,
    t,
    state: filterState,
    actions: filterActions,
    filterRef,
  })

  const sortProps = {
    sorts,
    getSortIndex,
    getSortDirection,
    t,
  }

  const buildContextMenu = (col: TableColumn, e: React.MouseEvent) => {
    e.preventDefault()
    const items: ContextMenuItem[] = []

    if (headerContextMenu) {
      items.push(...headerContextMenu(col))
    }

    if (columnPinning && onPinColumn) {
      if (items.length > 0) {
        items.push({ key: 'pin-divider', label: '', divider: true })
      }
      if (col.fixed !== 'left') {
        items.push({
          key: 'pin-left',
          label: t.pinLeft,
          onClick: () => onPinColumn(col.key, 'left'),
        })
      }
      if (col.fixed !== 'right') {
        items.push({
          key: 'pin-right',
          label: t.pinRight,
          onClick: () => onPinColumn(col.key, 'right'),
        })
      }
      if (col.fixed) {
        items.push({
          key: 'unpin',
          label: t.unpin,
          onClick: () => onPinColumn(col.key, undefined),
        })
      }
    }

    if (items.length > 0) {
      onContextMenu({ x: e.clientX, y: e.clientY, items })
    }
  }

  if (hasColumnGroups && headerRows) {
    return (
      <>
        {headerRows.map((row, ri) => (
          <div
            key={`hdr-${ri}`}
            className={['sg-table-header-row', sCls.headerRow].filter(Boolean).join(' ')}
            role="row"
            style={{ display: 'contents', ...sSty.headerRow }}
          >
            {ri === 0 && rowDraggable && (
              <div
                className="sg-table-th"
                role="columnheader"
                style={{ gridRow: `span ${headerRows.length}` }}
              />
            )}
            {ri === 0 && showRowNumber && (
              <div
                className="sg-table-th sg-table-cell-row-number"
                role="columnheader"
                style={{ gridRow: `span ${headerRows.length}` }}
              >
                {t.rowNumber}
              </div>
            )}
            {ri === 0 && rowSelection && (
              <div
                className="sg-table-th sg-table-cell-selection"
                role="columnheader"
                style={{ gridRow: `span ${headerRows.length}` }}
              >
                {rowSelection.type !== 'radio' && (
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={onSelectAll}
                  />
                )}
              </div>
            )}
            {ri === 0 && expandable && (
              <div
                className="sg-table-th sg-table-cell-expand"
                role="columnheader"
                style={{ gridRow: `span ${headerRows.length}` }}
              />
            )}
            {row.map((cell, ci) => {
              const isLeaf = !cell.col.children || cell.col.children.length === 0
              return (
                <div
                  key={cell.col.key ?? `g-${ri}-${ci}`}
                  className={[
                    'sg-table-th',
                    isLeaf && cell.col.sortable ? 'sg-table-th-sortable' : '',
                    cell.col.fixed ? 'sg-table-cell-fixed' : '',
                    cell.col.fixed ? `sg-table-cell-fixed-${cell.col.fixed}` : '',
                    cell.colSpan > 1 ? 'sg-table-th-group' : '',
                    sCls.headerCell,
                    cell.col.headerClassName,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{
                    ...(isLeaf ? fixedStyle(cell.col, true) : {}),
                    gridColumn: cell.colSpan > 1 ? `span ${cell.colSpan}` : undefined,
                    gridRow: cell.rowSpan > 1 ? `span ${cell.rowSpan}` : undefined,
                    justifyContent: cell.colSpan > 1 ? 'center' : undefined,
                    ...sSty.headerCell,
                  }}
                  role="columnheader"
                  onClick={isLeaf ? (e) => onSort(cell.col, e.shiftKey) : undefined}
                  onContextMenu={isLeaf ? (e) => buildContextMenu(cell.col, e) : undefined}
                >
                  <span
                    className={['sg-table-th-content', sCls.headerCellContent]
                      .filter(Boolean)
                      .join(' ')}
                    style={sSty.headerCellContent}
                  >
                    <span className="sg-table-th-title">{cell.col.title}</span>
                    {isLeaf && cell.col.tooltip && <ColumnTooltip content={cell.col.tooltip} />}
                    {isLeaf && <SortIndicator col={cell.col} {...sortProps} />}
                  </span>
                  {isLeaf && <FilterTrigger {...filterProps(cell.col)} />}
                  {isLeaf && <FilterDropdownContent {...filterProps(cell.col)} />}
                  {isLeaf && cell.col.resizable && (
                    <div
                      className="sg-table-resize-handle"
                      onMouseDown={(e) => onResizeStart(e, cell.col.key)}
                      onDoubleClick={
                        onAutoResize
                          ? (e) => {
                              e.stopPropagation()
                              onAutoResize(cell.col.key)
                            }
                          : undefined
                      }
                    />
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </>
    )
  }

  return (
    <div
      className={['sg-table-header-row', sCls.headerRow].filter(Boolean).join(' ')}
      role="row"
      style={{ display: 'contents', ...sSty.headerRow }}
    >
      {rowDraggable && <div className="sg-table-th" role="columnheader" />}
      {showRowNumber && (
        <div className="sg-table-th sg-table-cell-row-number" role="columnheader">
          {t.rowNumber}
        </div>
      )}
      {rowSelection && (
        <div className="sg-table-th sg-table-cell-selection" role="columnheader">
          {rowSelection.type !== 'radio' && (
            <Checkbox checked={allSelected} indeterminate={someSelected} onChange={onSelectAll} />
          )}
        </div>
      )}
      {expandable && <div className="sg-table-th sg-table-cell-expand" role="columnheader" />}
      {columns.map((col) => (
        <div
          key={col.key}
          className={[
            'sg-table-th',
            col.sortable ? 'sg-table-th-sortable' : '',
            dragOver === col.key ? 'sg-table-th-drag-over' : '',
            col.fixed ? 'sg-table-cell-fixed' : '',
            col.fixed ? `sg-table-cell-fixed-${col.fixed}` : '',
            sCls.headerCell,
            col.headerClassName,
          ]
            .filter(Boolean)
            .join(' ')}
          style={{ ...fixedStyle(col, true), ...sSty.headerCell }}
          role="columnheader"
          onClick={(e) => onSort(col, e.shiftKey)}
          onContextMenu={(e) => buildContextMenu(col, e)}
          draggable={draggable && !col.fixed}
          onDragStart={draggable ? (e) => onDragStart(e, col.key) : undefined}
          onDragOver={draggable ? (e) => onDragOver(e, col.key) : undefined}
          onDragLeave={draggable ? () => onDragLeave() : undefined}
          onDrop={draggable ? (e) => onDrop(e, col.key) : undefined}
          onDragEnd={draggable ? () => onDragEnd() : undefined}
        >
          <span
            className={['sg-table-th-content', sCls.headerCellContent].filter(Boolean).join(' ')}
            style={sSty.headerCellContent}
          >
            <span className="sg-table-th-title">{col.title}</span>
            {col.tooltip && <ColumnTooltip content={col.tooltip} />}
            <SortIndicator col={col} {...sortProps} />
          </span>
          <FilterTrigger {...filterProps(col)} />
          <FilterDropdownContent {...filterProps(col)} />
          {col.resizable && (
            <div
              className="sg-table-resize-handle"
              onMouseDown={(e) => onResizeStart(e, col.key)}
              onDoubleClick={
                onAutoResize
                  ? (e) => {
                      e.stopPropagation()
                      onAutoResize(col.key)
                    }
                  : undefined
              }
            />
          )}
        </div>
      ))}
    </div>
  )
}
