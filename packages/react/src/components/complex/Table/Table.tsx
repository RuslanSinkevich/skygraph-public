import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react'
import { Input } from '../../ui/Input'
import { Pagination } from '../../ui/Pagination'
import { Spin } from '../../ui/Spin'
import { Checkbox } from '../../ui/Checkbox'
import { TableHeader } from './TableHeader'
import { TableBody } from './TableBody'
import { VirtualTableBody } from './VirtualTableBody'
import { ContextMenu } from './ContextMenu'
import { useTableState } from './useTableState'
import { useConfig } from '../../ConfigProvider'
import {
  toCSVString,
  downloadCSV,
  toTSVString,
  toJSONString,
  downloadJSON,
  copyToClipboard,
} from './export'
import { printElement } from '../../../utils/print'
import type { PrintOptions } from '../../../utils/print'
import { slotClass, slotStyle } from '../../../types'
import type { TableProps, TableClassNames, TableStyles } from './types'

/**
 * Императивный API таблицы для ref.print() и других ref-методов.
 */
export interface TableRef {
  /**
   * Открыть popup и вызвать window.print() для текущей DOM-области таблицы.
   * Опции мерджатся с теми, что заданы через prop `printable`
   * (на уровне prop приоритетен `fileName`).
   */
  print: (opts?: PrintOptions) => void
}

const DRAG_HANDLE_WIDTH = '32px'
const ROW_NUMBER_WIDTH = '48px'

/**
 * Data table with sorting, filtering, selection, grouping, virtualization, and export tools.
 * Layout and behavior are driven by `TableProps` and internal `useTableState`.
 */
function TableInner(props: TableProps, forwardedRef: React.ForwardedRef<TableRef>) {
  const {
    rowSelection,
    expandable,
    sticky,
    draggable,
    searchable,
    showPagination = true,
    bordered: borderedProp,
    size: sizeProp,
    scroll,
    summary,
    onRowClick,
    onCellEdit,
    loading: loadingProp,
    rowClassName,
    className,
    style,
    unstyled,
    rowDraggable,
    onRowOrderChange,
    headerContextMenu,
    cellContextMenu,
    columnVisibility,
    virtual: virtualProp,
    exportable,
    onExport,
    selectionSummary,
    selectionActions,
    striped,
    showSizeChanger,
    pageSizeOptions,
    showQuickJumper,
    showTotal,
    onPageSizeChange,
    showRowNumber,
    footer,
    fullscreenable,
    densityToggle,
    groupBy,
    groupByOptions,
    onGroupByChange,
    keyboardNavigation,
    emptyContent,
    printable,
    exportJSON,
    highlightOnHover,
    columnAutoResize,
    columnPinning,
    classNames: slotCls,
    styles: slotSty,
  } = props

  const sCls: TableClassNames = slotCls ?? {}
  const sSty: TableStyles = slotSty ?? {}

  const config = useConfig()
  const sizeFromProp = sizeProp ?? config.size ?? 'middle'
  const bordered = borderedProp ?? config.bordered ?? false
  const loading = loadingProp ?? false

  const state = useTableState(props)
  const tableRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const effectiveSize = densityToggle ? state.density : sizeFromProp

  // Memoised so the empty `{}` literal stays referentially stable across
  // renders — otherwise `useMemo(gridTemplate, [rowNumConfig, ...])` below
  // would invalidate every render whenever `showRowNumber === true`.
  const rowNumConfig = useMemo(
    () => (showRowNumber ? (typeof showRowNumber === 'object' ? showRowNumber : {}) : null),
    [showRowNumber],
  )

  const getExportData = useCallback(() => {
    const cols = state.columns.map((c) => c.key)
    const headers = state.columns.map((c) => (typeof c.title === 'string' ? c.title : c.key))
    const rows = state.flatRows
      .filter((r) => !r.__groupRow)
      .map((row) =>
        cols.map((k) => {
          const v = row.data[k]
          return v == null ? '' : String(v)
        }),
      )
    return { cols, headers, rows }
  }, [state.columns, state.flatRows])

  const handleExportCSV = useCallback(() => {
    const { headers, rows } = getExportData()
    const data = [headers, ...rows]
    if (onExport) {
      onExport(data)
    } else {
      downloadCSV(toCSVString(data))
    }
  }, [getExportData, onExport])

  const handleExportJSON = useCallback(() => {
    const { headers, rows } = getExportData()
    downloadJSON(toJSONString(headers, rows))
  }, [getExportData])

  const handleCopy = useCallback(async () => {
    const { headers, rows } = getExportData()
    await copyToClipboard(toTSVString([headers, ...rows]))
  }, [getExportData])

  const printOptionsFromProp: PrintOptions = useMemo(() => {
    if (typeof printable === 'object' && printable !== null) {
      return { fileName: printable.fileName }
    }
    return {}
  }, [printable])

  const doPrint = useCallback(
    (opts?: PrintOptions) => {
      printElement(tableRef.current, { ...printOptionsFromProp, ...(opts ?? {}) })
    },
    [printOptionsFromProp],
  )

  const handlePrint = useCallback(() => {
    doPrint()
  }, [doPrint])

  useImperativeHandle(forwardedRef, () => ({ print: doPrint }), [doPrint])

  // Grid template
  const gridTemplate = useMemo(() => {
    const parts: string[] = []
    if (rowDraggable) parts.push(DRAG_HANDLE_WIDTH)
    if (rowNumConfig) parts.push(rowNumConfig.width ? `${rowNumConfig.width}px` : ROW_NUMBER_WIDTH)
    parts.push(state.gridTemplate)
    return parts.join(' ')
  }, [rowDraggable, rowNumConfig, state.gridTemplate])

  const totalCols = state.totalCols + (rowDraggable ? 1 : 0) + (rowNumConfig ? 1 : 0)

  const virtualConfig = virtualProp
    ? {
        rowHeight: typeof virtualProp === 'object' ? (virtualProp.rowHeight ?? 40) : 40,
        estimateRowHeight:
          typeof virtualProp === 'object' ? virtualProp.estimateRowHeight : undefined,
        overscan: typeof virtualProp === 'object' ? (virtualProp.overscan ?? 5) : 5,
        height: typeof virtualProp === 'object' ? virtualProp.height : undefined,
      }
    : null

  // Fixed-height fast path: number `rowHeight` + no measurement estimate.
  // We pin every visible cell to that height via CSS so the rendered DOM's
  // `scrollHeight` matches the engine's `totalHeight` exactly — without
  // this, natural cell padding makes the two drift apart by a few pixels
  // per row and the scrollbar thumb lags behind the cursor while dragged.
  const virtualFixedRowHeight =
    virtualConfig &&
    typeof virtualConfig.rowHeight === 'number' &&
    virtualConfig.estimateRowHeight == null
      ? virtualConfig.rowHeight
      : null

  // Unstyled
  if (unstyled) {
    return (
      <div className={className} style={style} role="table">
        <div role="rowgroup">
          <div role="row">
            {state.columns.map((col) => (
              <span
                key={col.key}
                role="columnheader"
                onClick={(e) => state.handleSort(col, e.shiftKey)}
              >
                {col.title}
              </span>
            ))}
          </div>
        </div>
        <div role="rowgroup">
          {state.flatRows.map((row) => (
            <div key={row.id} role="row">
              {state.columns.map((col) => (
                <span key={col.key} role="cell">
                  {col.render
                    ? col.render(row.data[col.key], row.data, row.id)
                    : String(row.data[col.key] ?? '')}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const hasToolbar =
    searchable ||
    columnVisibility ||
    exportable ||
    exportJSON ||
    fullscreenable ||
    densityToggle ||
    printable ||
    groupBy ||
    (groupByOptions && groupByOptions.length > 0)

  const wrapperCls = [
    'sg-table-wrapper',
    `sg-table-${effectiveSize}`,
    bordered ? 'sg-table-bordered' : '',
    sticky || virtualConfig ? 'sg-table-sticky' : '',
    loading ? 'sg-table-loading' : '',
    striped ? 'sg-table-striped' : '',
    state.isFullscreen ? 'sg-table-fullscreen' : '',
    highlightOnHover === false ? '' : 'sg-table-hoverable',
    sCls.root,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const scrollStyle: React.CSSProperties = {}
  if (scroll?.x) scrollStyle.overflowX = 'auto'
  if (virtualConfig) {
    // Virtualization needs an owned vertical scroll so it can observe the
    // viewport. `virtual.height` wins over `scroll.y` for the body window.
    scrollStyle.overflowY = 'auto'
    scrollStyle.height = virtualConfig.height ?? scroll?.y ?? 400
  } else if (scroll?.y) {
    scrollStyle.overflowY = 'auto'
    scrollStyle.maxHeight = scroll.y
  }

  const selectedCount = rowSelection?.selectedKeys.length ?? 0

  return (
    <div
      className={wrapperCls}
      style={slotStyle(sSty.root, style)}
      ref={(el) => {
        ;(tableRef as React.MutableRefObject<HTMLDivElement | null>).current = el
        ;(state.wrapperRef as React.MutableRefObject<HTMLDivElement | null>).current = el
      }}
      onKeyDown={keyboardNavigation ? state.handleKeyNav : undefined}
      tabIndex={keyboardNavigation ? 0 : undefined}
    >
      {/* Toolbar */}
      {hasToolbar && (
        <div className={slotClass('sg-table-toolbar', sCls.toolbar)} style={sSty.toolbar}>
          {searchable && (
            <Input
              placeholder={state.t.searchPlaceholder}
              size="small"
              value={state.searchText}
              onChange={state.setSearchText}
              style={{ maxWidth: 240 }}
            />
          )}
          <div className="sg-table-toolbar-right">
            {groupByOptions && groupByOptions.length > 0 && (
              <GroupByDropdown
                value={groupBy ?? null}
                options={groupByOptions}
                onChange={onGroupByChange ?? (() => {})}
                t={state.t}
              />
            )}
            {groupBy && (
              <div className="sg-table-toolbar-group">
                <button className="sg-table-toolbar-btn" onClick={state.expandAllGroups}>
                  {state.t.groupExpand}
                </button>
                <button className="sg-table-toolbar-btn" onClick={state.collapseAllGroups}>
                  {state.t.groupCollapse}
                </button>
              </div>
            )}
            {densityToggle && (
              <DensityDropdown value={state.density} onChange={state.setDensity} t={state.t} />
            )}
            {columnVisibility && (
              <ColumnVisibilityDropdown
                leafColumns={state.leafColumns}
                hiddenSet={state.hiddenSet}
                onToggle={state.toggleColumnVisibility}
                label={state.t.showColumns}
              />
            )}
            {exportable && (
              <>
                <button className="sg-table-toolbar-btn" onClick={handleExportCSV}>
                  {state.t.exportCSV}
                </button>
                <button className="sg-table-toolbar-btn" onClick={handleCopy}>
                  {state.t.copyTable}
                </button>
              </>
            )}
            {exportJSON && (
              <button className="sg-table-toolbar-btn" onClick={handleExportJSON}>
                {state.t.exportJSON}
              </button>
            )}
            {printable && (
              <button className="sg-table-toolbar-btn" onClick={handlePrint}>
                {state.t.print}
              </button>
            )}
            {fullscreenable && (
              <button className="sg-table-toolbar-btn" onClick={state.toggleFullscreen}>
                {state.isFullscreen ? state.t.exitFullscreen : state.t.fullscreen}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Selection Summary Bar */}
      {selectionSummary && selectedCount > 0 && (
        <div className="sg-table-selection-bar">
          <span className="sg-table-selection-count">{state.t.selectedRows(selectedCount)}</span>
          {selectionActions?.map((action) => (
            <button
              key={action.key}
              className={`sg-table-selection-action${action.danger ? ' sg-table-selection-action-danger' : ''}`}
              onClick={() =>
                action.onClick(
                  rowSelection!.selectedKeys,
                  state.visibleRows
                    .filter((r) => rowSelection!.selectedKeys.includes(r.id))
                    .map((r) => r.data),
                )
              }
            >
              {action.label}
            </button>
          ))}
          <button
            className="sg-table-selection-clear"
            onClick={() => rowSelection?.onChange([], [])}
          >
            ✕
          </button>
        </div>
      )}

      <div
        ref={scrollRef}
        className={slotClass('sg-table-scroll', scroll?.x ? 'sg-table-scroll-x' : '', sCls.scroll)}
        style={slotStyle(
          Object.keys(scrollStyle).length > 0 ? scrollStyle : undefined,
          sSty.scroll,
        )}
      >
        {/* Pinned top rows */}
        {state.pinnedTop.length > 0 && (
          <div
            className="sg-table-pinned-top"
            style={{ gridTemplateColumns: gridTemplate, minWidth: scroll?.x }}
          >
            <TableBody
              columns={state.columns}
              flatRows={state.pinnedTop}
              rowSelection={rowSelection}
              expandable={expandable}
              isTreeMode={state.isTreeMode}
              indentSize={state.indentSize}
              treeExpanded={state.treeExpanded}
              expandedKeys={state.expandedKeys}
              totalCols={totalCols}
              spanMap={state.spanMap}
              hiddenCells={state.hiddenCells}
              t={state.t}
              rowClassName={rowClassName}
              fixedStyle={state.fixedStyle}
              onRowClick={onRowClick}
              onCellEdit={onCellEdit}
              onSelectRow={state.handleSelectRow}
              onToggleExpand={state.handleToggleExpand}
              onToggleTreeExpand={state.handleToggleTreeExpand}
              onContextMenu={state.setContextMenu}
              striped={false}
              isPinnedSection
              slotClassNames={sCls}
              slotStyles={sSty}
            />
          </div>
        )}

        <div
          className={slotClass(
            'sg-table-grid',
            virtualFixedRowHeight != null ? 'sg-table-grid-virtual-fixed' : '',
            sCls.grid,
          )}
          style={slotStyle(
            {
              gridTemplateColumns: gridTemplate,
              minWidth: scroll?.x,
              ...(virtualFixedRowHeight != null
                ? ({
                    ['--sg-virtual-row-height' as string]: `${virtualFixedRowHeight}px`,
                  } as React.CSSProperties)
                : null),
            },
            sSty.grid,
          )}
          role="table"
        >
          <TableHeader
            columns={state.columns}
            headerRows={state.headerRows}
            hasColumnGroups={state.hasColumnGroups}
            rowSelection={rowSelection}
            expandable={expandable}
            draggable={draggable}
            allSelected={state.allSelected}
            someSelected={state.someSelected}
            dragOver={state.dragOver}
            t={state.t}
            fixedStyle={state.fixedStyle}
            onSort={state.handleSort}
            onSelectAll={state.handleSelectAll}
            onDragStart={state.handleDragStart}
            onDragOver={state.handleDragOver}
            onDragLeave={state.setDragOver}
            onDrop={state.handleDrop}
            onDragEnd={state.handleDragEnd}
            onResizeStart={state.handleResizeStart}
            filterState={state.filterState}
            filterActions={state.filterActions}
            filterRef={state.filterRef}
            sorts={state.sorts}
            getSortIndex={state.getSortIndex}
            getSortDirection={state.getSortDirection}
            headerContextMenu={headerContextMenu}
            onContextMenu={state.setContextMenu}
            showRowNumber={!!rowNumConfig}
            rowDraggable={rowDraggable}
            columnPinning={columnPinning}
            onPinColumn={state.handlePinColumn}
            onAutoResize={columnAutoResize ? state.handleAutoResize : undefined}
            slotClassNames={sCls}
            slotStyles={sSty}
          />

          {virtualConfig ? (
            <VirtualTableBody
              columns={state.columns}
              flatRows={state.flatRows}
              rowHeight={virtualConfig.rowHeight}
              estimateRowHeight={virtualConfig.estimateRowHeight}
              overscan={virtualConfig.overscan}
              scrollContainerRef={scrollRef}
              rowSelection={rowSelection}
              expandable={expandable}
              isTreeMode={state.isTreeMode}
              indentSize={state.indentSize}
              treeExpanded={state.treeExpanded}
              expandedKeys={state.expandedKeys}
              totalCols={totalCols}
              spanMap={state.spanMap}
              hiddenCells={state.hiddenCells}
              t={state.t}
              rowClassName={rowClassName}
              fixedStyle={state.fixedStyle}
              onRowClick={onRowClick}
              onCellEdit={onCellEdit}
              onSelectRow={state.handleSelectRow}
              onToggleExpand={state.handleToggleExpand}
              onToggleTreeExpand={state.handleToggleTreeExpand}
              rowDraggable={rowDraggable}
              showRowNumber={!!rowNumConfig}
              cellContextMenu={cellContextMenu}
              onContextMenu={state.setContextMenu}
              striped={striped}
              groupBy={groupBy}
              onToggleGroup={state.toggleGroupExpand}
              focusedCell={state.focusedCell}
              onFocusCell={state.setFocusedCell}
              keyboardNavigation={keyboardNavigation}
              emptyContent={emptyContent}
              slotClassNames={sCls}
              slotStyles={sSty}
            />
          ) : (
            <TableBody
              columns={state.columns}
              flatRows={state.flatRows}
              rowSelection={rowSelection}
              expandable={expandable}
              isTreeMode={state.isTreeMode}
              indentSize={state.indentSize}
              treeExpanded={state.treeExpanded}
              expandedKeys={state.expandedKeys}
              totalCols={totalCols}
              spanMap={state.spanMap}
              hiddenCells={state.hiddenCells}
              t={state.t}
              rowClassName={rowClassName}
              fixedStyle={state.fixedStyle}
              onRowClick={onRowClick}
              onCellEdit={onCellEdit}
              onSelectRow={state.handleSelectRow}
              onToggleExpand={state.handleToggleExpand}
              onToggleTreeExpand={state.handleToggleTreeExpand}
              rowDraggable={rowDraggable}
              onRowOrderChange={onRowOrderChange}
              cellContextMenu={cellContextMenu}
              onContextMenu={state.setContextMenu}
              striped={striped}
              showRowNumber={!!rowNumConfig}
              groupBy={groupBy}
              onToggleGroup={state.toggleGroupExpand}
              focusedCell={state.focusedCell}
              onFocusCell={state.setFocusedCell}
              keyboardNavigation={keyboardNavigation}
              emptyContent={emptyContent}
              slotClassNames={sCls}
              slotStyles={sSty}
            />
          )}

          {/* Aggregation footer */}
          {footer && state.aggregates && (
            <div
              className={['sg-table-footer-row', sCls.footer].filter(Boolean).join(' ')}
              role="row"
              style={{ display: 'contents', ...sSty.footer }}
            >
              {rowDraggable && <div className="sg-table-td sg-table-footer-cell" role="cell" />}
              {rowNumConfig && <div className="sg-table-td sg-table-footer-cell" role="cell" />}
              {rowSelection && <div className="sg-table-td sg-table-footer-cell" role="cell" />}
              {expandable && <div className="sg-table-td sg-table-footer-cell" role="cell" />}
              {state.columns.map((col) => (
                <div
                  key={col.key}
                  className="sg-table-td sg-table-footer-cell"
                  role="cell"
                  style={state.fixedStyle(col)}
                >
                  {state.aggregates![col.key] != null ? (
                    <span className="sg-table-aggregate-value">
                      <span className="sg-table-aggregate-label">
                        {typeof col.aggregate === 'string' ? state.t[col.aggregate] : ''}
                      </span>{' '}
                      {String(state.aggregates![col.key])}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          )}

          {/* Summary rows (custom) */}
          {summary &&
            state.visibleRows &&
            summary(state.visibleRows).map((cells, ri) => (
              <div
                key={`sum-${ri}`}
                className="sg-table-summary-row"
                role="row"
                style={{ display: 'contents' }}
              >
                {cells.map((cell, ci) => (
                  <div
                    key={ci}
                    className="sg-table-td sg-table-summary-cell"
                    role="cell"
                    style={{
                      gridColumn: cell.colSpan ? `span ${cell.colSpan}` : undefined,
                      textAlign: cell.align,
                    }}
                  >
                    {cell.content}
                  </div>
                ))}
              </div>
            ))}
        </div>

        {/* Pinned bottom rows */}
        {state.pinnedBottom.length > 0 && (
          <div
            className="sg-table-pinned-bottom"
            style={{ gridTemplateColumns: gridTemplate, minWidth: scroll?.x }}
          >
            <TableBody
              columns={state.columns}
              flatRows={state.pinnedBottom}
              rowSelection={rowSelection}
              expandable={expandable}
              isTreeMode={state.isTreeMode}
              indentSize={state.indentSize}
              treeExpanded={state.treeExpanded}
              expandedKeys={state.expandedKeys}
              totalCols={totalCols}
              spanMap={state.spanMap}
              hiddenCells={state.hiddenCells}
              t={state.t}
              rowClassName={rowClassName}
              fixedStyle={state.fixedStyle}
              onRowClick={onRowClick}
              onCellEdit={onCellEdit}
              onSelectRow={state.handleSelectRow}
              onToggleExpand={state.handleToggleExpand}
              onToggleTreeExpand={state.handleToggleTreeExpand}
              onContextMenu={state.setContextMenu}
              striped={false}
              isPinnedSection
              slotClassNames={sCls}
              slotStyles={sSty}
            />
          </div>
        )}
      </div>

      {/* Context Menu */}
      <ContextMenu state={state.contextMenu} onClose={() => state.setContextMenu(null)} />

      {loading && (
        <div className="sg-table-loading-mask">
          <Spin size="large" />
        </div>
      )}

      {showPagination && state.tableState.totalPages > 1 && (
        <div className={slotClass('sg-table-pagination', sCls.pagination)} style={sSty.pagination}>
          <span className="sg-table-pagination-total">
            {state.t.totalRows(state.tableState.filteredRows)}
          </span>
          <Pagination
            current={state.tableState.page}
            total={state.tableState.filteredRows}
            pageSize={state.tableState.pageSize}
            onChange={state.setPage}
            showSizeChanger={showSizeChanger}
            pageSizeOptions={pageSizeOptions}
            showQuickJumper={showQuickJumper}
            showTotal={showTotal}
            onPageSizeChange={onPageSizeChange}
          />
        </div>
      )}
    </div>
  )
}

/**
 * Data table — основная экспортная функция (forwardRef-обёртка над `TableInner`).
 * Ref-методы — см. `TableRef`.
 */
export const Table = forwardRef<TableRef, TableProps>(TableInner)
Table.displayName = 'Table'

function ColumnVisibilityDropdown({
  leafColumns,
  hiddenSet,
  onToggle,
  label,
}: {
  leafColumns: { key: string; title: React.ReactNode }[]
  hiddenSet: Set<string>
  onToggle: (key: string) => void
  label: string
}) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="sg-table-toolbar-btn" onClick={() => setOpen(!open)}>
        {label}
      </button>
      {open && (
        <div className="sg-table-col-visibility-dropdown">
          {leafColumns.map((col) => (
            <label key={col.key} className="sg-table-col-visibility-item">
              <Checkbox checked={!hiddenSet.has(col.key)} onChange={() => onToggle(col.key)} />
              <span>{typeof col.title === 'string' ? col.title : col.key}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

function GroupByDropdown({
  value,
  options,
  onChange,
  t,
}: {
  value: string | null
  options: Array<{ key: string; label: React.ReactNode }>
  onChange: (field: string | null) => void
  t: { groupByLabel: string; groupByNone: string }
}) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const current = value ? options.find((o) => o.key === value) : null

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="sg-table-toolbar-btn" onClick={() => setOpen(!open)}>
        {t.groupByLabel}
        {current ? `: ${typeof current.label === 'string' ? current.label : current.key}` : ''}
      </button>
      {open && (
        <div className="sg-table-group-by-dropdown" role="menu">
          <button
            type="button"
            className={`sg-table-group-by-option${value === null ? ' sg-table-group-by-active' : ''}`}
            onClick={() => {
              onChange(null)
              setOpen(false)
            }}
          >
            {t.groupByNone}
          </button>
          {options.map((opt) => (
            <button
              key={opt.key}
              type="button"
              className={`sg-table-group-by-option${value === opt.key ? ' sg-table-group-by-active' : ''}`}
              onClick={() => {
                onChange(opt.key)
                setOpen(false)
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function DensityDropdown({
  value,
  onChange,
  t,
}: {
  value: 'small' | 'middle' | 'large'
  onChange: (v: 'small' | 'middle' | 'large') => void
  t: { density: string; densitySmall: string; densityMiddle: string; densityLarge: string }
}) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const options: Array<{ key: 'small' | 'middle' | 'large'; label: string }> = [
    { key: 'small', label: t.densitySmall },
    { key: 'middle', label: t.densityMiddle },
    { key: 'large', label: t.densityLarge },
  ]

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="sg-table-toolbar-btn" onClick={() => setOpen(!open)}>
        {t.density}
      </button>
      {open && (
        <div className="sg-table-density-dropdown">
          {options.map((opt) => (
            <button
              key={opt.key}
              className={`sg-table-density-option${value === opt.key ? ' sg-table-density-active' : ''}`}
              onClick={() => {
                onChange(opt.key)
                setOpen(false)
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
