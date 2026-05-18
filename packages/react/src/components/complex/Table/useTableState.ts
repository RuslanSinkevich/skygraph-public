import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useTable } from '../../../hooks/useTable'
import {
  flattenLeafColumns,
  buildHeaderRows,
  flattenTreeRows,
  collectAllTreeIds,
  computeSpanMap,
  computeHiddenCells,
  getFixedStyle,
  groupByColumn,
  separatePinnedRows,
  computeColumnAggregates,
} from './helpers'
import type {
  AdvancedFilter,
  TableColumn,
  TableProps,
  FlatRow,
  HeaderCell,
  FilterDropdownProps,
  SortDirection,
  SortConfig,
  RowId,
} from './types'
import { DEFAULT_COL_WIDTH, MIN_COL_WIDTH, SELECTION_COL_WIDTH, DEFAULT_LOCALE } from './types'
import type { ContextMenuState } from './ContextMenu'

/**
 * Derives table UI state: columns, sorting, filters, selection, grouping, and layout helpers.
 * Bridges `useTable` engine data with header/body presentation props.
 */
export function useTableState(props: TableProps) {
  const {
    columns: columnsProp,
    rowSelection,
    expandable,
    tree,
    draggable: _draggable,
    searchable,
    locale,
    onColumnOrderChange,
    onCellEdit: _onCellEdit,
    multiSort,
    sorts: controlledSorts,
    onSortsChange,
    hiddenColumns: hiddenColumnsProp,
    onHiddenColumnsChange,
    onColumnPinChange,
    groupBy,
    defaultGroupExpanded,
    onGroupExpandChange,
    pinnedRows: pinnedRowsConfig,
    keyboardNavigation,
    scroll,
    footer: _footer,
    showRowNumber: _showRowNumber,
    fullscreenable: _fullscreenable,
    densityToggle: _densityToggle,
    emptyContent: _emptyContent,
    printable: _printable,
    exportJSON: _exportJSON,
    highlightOnHover: _highlightOnHover,
    columnAutoResize: _columnAutoResize,
    ...tableOptions
  } = props

  /** When `scroll.x` is set, the author opts into hard pixel columns with a
   * horizontal scrollbar. Otherwise the table flexes to fit its container. */
  const hasScrollX = scroll?.x != null

  const {
    table,
    visibleRows,
    tableState,
    columnWidths: persistedColWidths,
    setSort,
    setSorts,
    clearSort,
    setPage,
    setFilterFn,
    setColumnWidth: persistColumnWidth,
    refresh,
  } = useTable(tableOptions)

  const t = useMemo(() => ({ ...DEFAULT_LOCALE, ...locale }), [locale])

  const hasColumnGroups = columnsProp.some((c) => c.children && c.children.length > 0)
  const leafColumns = useMemo(() => flattenLeafColumns(columnsProp), [columnsProp])
  const headerRows = useMemo<HeaderCell[][] | null>(
    () => (hasColumnGroups ? buildHeaderRows(columnsProp) : null),
    [columnsProp, hasColumnGroups],
  )

  // Multi-sort state
  const [internalSorts, setInternalSorts] = useState<SortConfig[]>([])
  const sorts = controlledSorts ?? internalSorts

  // Initial widths come from three sources, in order of precedence:
  //   1. engine-persisted widths (`$table.<id>.state.columnWidths`)
  //   2. column defaults (`column.width`)
  //   3. global default (`DEFAULT_COL_WIDTH`)
  // A column with a persisted width is treated as user-resized so it
  // keeps its exact px under flex-layout (otherwise it would snap back
  // to the auto track).
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    const w: Record<string, number> = {}
    for (const c of leafColumns) {
      w[c.key] = persistedColWidths[c.key] ?? c.width ?? DEFAULT_COL_WIDTH
    }
    return w
  })
  /** Columns the user has drag/auto-resized. Pinned to exact px — wins over auto-layout. */
  const [userResizedCols, setUserResizedCols] = useState<Set<string>>(
    () => new Set(Object.keys(persistedColWidths)),
  )

  const [colOrder, setColOrder] = useState<string[]>(() => leafColumns.map((c) => c.key))
  const [dragCol, setDragCol] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)

  // Hidden columns
  const [internalHidden, setInternalHidden] = useState<Set<string>>(
    () => new Set(hiddenColumnsProp ?? []),
  )
  const hiddenSet = useMemo(
    () => (hiddenColumnsProp ? new Set(hiddenColumnsProp) : internalHidden),
    [hiddenColumnsProp, internalHidden],
  )

  const toggleColumnVisibility = useCallback(
    (key: string) => {
      if (onHiddenColumnsChange) {
        const current = hiddenColumnsProp ?? []
        const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key]
        onHiddenColumnsChange(next)
      } else {
        setInternalHidden((prev) => {
          const next = new Set(prev)
          if (next.has(key)) {
            next.delete(key)
          } else {
            next.add(key)
          }
          return next
        })
      }
    },
    [hiddenColumnsProp, onHiddenColumnsChange],
  )

  const [internalExpanded, setInternalExpanded] = useState<Set<RowId>>(() => {
    if (tree?.defaultExpandAllRows) {
      const childrenKey = tree.childrenColumnName ?? 'children'
      return new Set(collectAllTreeIds(props.data ?? [], childrenKey))
    }
    return new Set(expandable?.defaultExpandedRowKeys ?? [])
  })
  const expandedKeys = expandable?.expandedKeys
    ? new Set(expandable.expandedKeys)
    : internalExpanded

  const [treeExpanded, setTreeExpanded] = useState<Set<RowId>>(() => {
    if (tree?.defaultExpandAllRows) {
      const childrenKey = tree.childrenColumnName ?? 'children'
      return new Set(collectAllTreeIds(props.data ?? [], childrenKey))
    }
    return new Set()
  })

  const [searchText, setSearchText] = useState('')

  const [activeFilters, setActiveFilters] = useState<Record<string, unknown[]>>(() => {
    const init: Record<string, unknown[]> = {}
    for (const col of leafColumns) {
      if (col.filteredValue) {
        init[col.key] = [...col.filteredValue]
      } else if (col.defaultFilteredValue) {
        init[col.key] = [...col.defaultFilteredValue]
      }
    }
    return init
  })
  const [filterSearchText, setFilterSearchText] = useState<Record<string, string>>({})
  const [openFilterDropdown, setOpenFilterDropdown] = useState<string | null>(null)
  const [advancedFilters, setAdvancedFiltersState] = useState<Record<string, AdvancedFilter>>({})
  const filterRef = useRef<HTMLDivElement>(null)
  // Anchor элемент (FilterTrigger span). Используется FilterDropdownContent
  // для расчёта координат при рендере popover'а через React Portal в
  // document.body — иначе scroll-контейнер таблицы клипает popover и dropdown
  // вложенного <Select>.
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null)

  /**
   * Apply / clear an advanced column filter through the engine and mirror
   * it into local state so the trigger lights up. Engine path takes
   * precedence over the legacy `customFilterFn` path because the engine
   * runs filters before sort and pagination.
   */
  const setAdvancedFilter = useCallback(
    (colKey: string, filter: AdvancedFilter | null) => {
      setAdvancedFiltersState((prev) => {
        const next = { ...prev }
        if (filter == null) delete next[colKey]
        else next[colKey] = filter
        return next
      })
      table.setColumnFilter(colKey, filter)
      // Engine.setColumnFilter пересчитывает filteredOrder, но React-стейт
      // visibleRows живёт в useTable и обновляется только через refresh().
      // Без него таблица не перерисуется, пока пользователь не сделает любое
      // другое действие, которое случайно дернёт refresh.
      refresh()
    },
    [table, refresh],
  )

  const resizeRef = useRef<{ col: string; startX: number; startW: number } | null>(null)

  // Context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)

  const columns = useMemo(() => {
    const base = hasColumnGroups
      ? leafColumns
      : (() => {
          const map = new Map(leafColumns.map((c) => [c.key, c]))
          return colOrder.filter((k) => map.has(k)).map((k) => map.get(k)!)
        })()
    return base.filter((c) => !hiddenSet.has(c.key) && !c.hidden)
  }, [leafColumns, colOrder, hasColumnGroups, hiddenSet])

  useEffect(() => {
    const keys = leafColumns.map((c) => c.key)
    setColOrder((prev) => {
      const prevSet = new Set(prev)
      const added = keys.filter((k) => !prevSet.has(k))
      const valid = prev.filter((k) => keys.includes(k))
      return [...valid, ...added]
    })
  }, [leafColumns])

  useEffect(() => {
    for (const col of leafColumns) {
      if (col.filteredValue !== undefined) {
        setActiveFilters((prev) => {
          if (JSON.stringify(prev[col.key]) === JSON.stringify(col.filteredValue)) return prev
          return { ...prev, [col.key]: [...col.filteredValue!] }
        })
      }
    }
  }, [leafColumns])

  useEffect(() => {
    const colFilters = columns.filter((c) => c.onFilter && activeFilters[c.key]?.length)
    const hasSearch = searchable && searchText.length > 0

    if (colFilters.length === 0 && !hasSearch) {
      setFilterFn(null)
      return
    }

    const lower = hasSearch ? searchText.toLowerCase() : ''

    setFilterFn((row) => {
      for (const col of colFilters) {
        const vals = activeFilters[col.key]
        const fn = col.onFilter!
        if (!vals.some((v) => fn(v, row))) return false
      }
      if (hasSearch) {
        const match = Object.values(row).some(
          (v) => v != null && String(v).toLowerCase().includes(lower),
        )
        if (!match) return false
      }
      return true
    })
  }, [activeFilters, searchText, searchable, setFilterFn, columns])

  useEffect(() => {
    if (!openFilterDropdown) return
    const handle = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setOpenFilterDropdown(null)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [openFilterDropdown])

  // ---- Sort handler (multi-sort aware) ----

  const handleSort = useCallback(
    (col: TableColumn, shiftKey?: boolean) => {
      if (!col.sortable) return

      if (multiSort && shiftKey) {
        const existing = sorts.find((s) => s.column === col.key)
        let next: SortConfig[]
        if (!existing) {
          next = [...sorts, { column: col.key, direction: 'asc' as SortDirection }]
        } else if (existing.direction === 'asc') {
          next = sorts.map((s) =>
            s.column === col.key ? { ...s, direction: 'desc' as SortDirection } : s,
          )
        } else {
          next = sorts.filter((s) => s.column !== col.key)
        }

        if (onSortsChange) {
          onSortsChange(next)
        } else {
          setInternalSorts(next)
        }

        if (next.length === 0) {
          clearSort()
        } else {
          setSorts(next)
        }
      } else {
        const current = sorts.length === 1 ? sorts[0] : null
        let next: SortConfig[]

        if (!current || current.column !== col.key) {
          next = [{ column: col.key, direction: 'asc' }]
        } else if (current.direction === 'asc') {
          next = [{ column: col.key, direction: 'desc' }]
        } else {
          next = []
        }

        if (onSortsChange) {
          onSortsChange(next)
        } else {
          setInternalSorts(next)
        }

        if (next.length === 0) {
          clearSort()
        } else {
          setSort(next[0].column, next[0].direction)
        }
      }
    },
    [multiSort, sorts, onSortsChange, setSort, setSorts, clearSort],
  )

  const getSortIndex = useCallback(
    (colKey: string): number => {
      if (!multiSort || sorts.length <= 1) return -1
      return sorts.findIndex((s) => s.column === colKey)
    },
    [multiSort, sorts],
  )

  const getSortDirection = useCallback(
    (colKey: string): SortDirection | null => {
      const found = sorts.find((s) => s.column === colKey)
      return found?.direction ?? null
    },
    [sorts],
  )

  // ---- Other handlers ----

  const handleToggleExpand = (id: RowId) => {
    const open = expandedKeys.has(id)
    if (expandable?.onExpand) {
      expandable.onExpand(!open, id)
    } else {
      setInternalExpanded((prev) => {
        const next = new Set(prev)
        if (open) {
          next.delete(id)
        } else {
          next.add(id)
        }
        return next
      })
    }
  }

  const handleToggleTreeExpand = (id: RowId) => {
    setTreeExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleSelectRow = (id: RowId, row: Record<string, unknown>) => {
    if (!rowSelection) return
    const { selectedKeys, onChange, type = 'checkbox' } = rowSelection
    if (type === 'radio') {
      onChange([id], [row])
      return
    }
    const next = selectedKeys.includes(id)
      ? selectedKeys.filter((k) => k !== id)
      : [...selectedKeys, id]
    onChange(
      next,
      visibleRows.filter((r) => next.includes(r.id)).map((r) => r.data),
    )
  }

  const handleSelectAll = () => {
    if (!rowSelection) return
    const ids = visibleRows.map((r) => r.id)
    const all = ids.every((id) => rowSelection.selectedKeys.includes(id))
    rowSelection.onChange(all ? [] : ids, all ? [] : visibleRows.map((r) => r.data))
  }

  const handleFilterToggle = (colKey: string, value: unknown, multiple: boolean) => {
    setActiveFilters((prev) => {
      const current = prev[colKey] ?? []
      if (!multiple) return { ...prev, [colKey]: [value] }
      const idx = current.indexOf(value)
      const next = idx >= 0 ? current.filter((_, i) => i !== idx) : [...current, value]
      return { ...prev, [colKey]: next }
    })
  }

  const handleFilterConfirm = (colKey: string) => {
    setOpenFilterDropdown(null)
    setFilterSearchText((prev) => ({ ...prev, [colKey]: '' }))
  }

  const handleFilterReset = (colKey: string) => {
    setActiveFilters((prev) => ({ ...prev, [colKey]: [] }))
    setFilterSearchText((prev) => ({ ...prev, [colKey]: '' }))
  }

  const handleFilterClose = (colKey: string) => {
    setOpenFilterDropdown(null)
    setFilterSearchText((prev) => ({ ...prev, [colKey]: '' }))
  }

  const handleSearchFilterChange = (colKey: string, text: string) => {
    setActiveFilters((prev) => ({ ...prev, [colKey]: text ? [text] : [] }))
  }

  const getFilterDropdownProps = (col: TableColumn): FilterDropdownProps => ({
    selectedKeys: activeFilters[col.key] ?? [],
    setSelectedKeys: (keys) => setActiveFilters((prev) => ({ ...prev, [col.key]: keys })),
    confirm: () => handleFilterConfirm(col.key),
    clearFilters: () => handleFilterReset(col.key),
    close: () => handleFilterClose(col.key),
  })

  const handleResizeStart = (e: React.MouseEvent, colKey: string) => {
    e.preventDefault()
    e.stopPropagation()
    resizeRef.current = {
      col: colKey,
      startX: e.clientX,
      startW: colWidths[colKey] ?? DEFAULT_COL_WIDTH,
    }

    const onMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return
      const diff = ev.clientX - resizeRef.current.startX
      const min =
        leafColumns.find((c) => c.key === resizeRef.current!.col)?.minWidth ?? MIN_COL_WIDTH
      setColWidths((prev) => ({
        ...prev,
        [resizeRef.current!.col]: Math.max(min, resizeRef.current!.startW + diff),
      }))
      setUserResizedCols((prev) =>
        prev.has(resizeRef.current!.col) ? prev : new Set(prev).add(resizeRef.current!.col),
      )
    }
    const onUp = () => {
      const ref = resizeRef.current
      resizeRef.current = null
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      if (!ref) return
      // Mirror the final user-resized width into the engine so it survives
      // remounts when the host persists `$table.<id>.state.columnWidths`.
      // Functional updater is used to avoid stale closure on `colWidths`.
      setColWidths((prev) => {
        const w = prev[ref.col]
        if (typeof w === 'number') persistColumnWidth(ref.col, w)
        return prev
      })
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  const handleDragStart = (e: React.DragEvent, key: string) => {
    setDragCol(key)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', key)
  }

  const handleDragOver = (e: React.DragEvent, key: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(key)
  }

  const handleDrop = (e: React.DragEvent, targetKey: string) => {
    e.preventDefault()
    if (!dragCol || dragCol === targetKey) {
      setDragCol(null)
      setDragOver(null)
      return
    }
    setColOrder((prev) => {
      const next = prev.filter((k) => k !== dragCol)
      const idx = next.indexOf(targetKey)
      next.splice(idx, 0, dragCol)
      onColumnOrderChange?.(next)
      return next
    })
    setDragCol(null)
    setDragOver(null)
  }

  const handleDragEnd = () => {
    setDragCol(null)
    setDragOver(null)
  }

  // Column pin
  const handlePinColumn = useCallback(
    (key: string, fixed: 'left' | 'right' | undefined) => {
      onColumnPinChange?.(key, fixed)
    },
    [onColumnPinChange],
  )

  // ---- Fullscreen ----
  const [isFullscreen, setIsFullscreen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev)
  }, [])

  // ---- Density ----
  const [density, setDensity] = useState<'small' | 'middle' | 'large'>('middle')

  // ---- Group By ----
  // Engine-side grouping: keep core in sync so Core consumers (subscribers,
  // exports, snapshot) see the same `groupBy` field as the React UI.
  // Aggregates are passed through from `column.aggregate` when configured —
  // engine recomputes them after each filter / sort change.
  useEffect(() => {
    if (!groupBy) {
      table.clearGroupBy()
      return
    }
    const aggregates = leafColumns
      .filter((c) => c.aggregate)
      .map((c) => ({
        column: c.key,
        type:
          typeof c.aggregate === 'function'
            ? (c.aggregate as (vals: unknown[]) => unknown)
            : (c.aggregate as 'sum' | 'avg' | 'count' | 'min' | 'max'),
      }))
    table.groupBy(groupBy, aggregates)
  }, [groupBy, leafColumns, table])

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    return defaultGroupExpanded ? new Set(['__all__']) : new Set()
  })

  const toggleGroupExpand = useCallback(
    (groupKey: string) => {
      setExpandedGroups((prev) => {
        const next = new Set(prev)
        const wasExpanded = next.has(groupKey)
        if (wasExpanded) {
          next.delete(groupKey)
        } else {
          next.add(groupKey)
        }
        onGroupExpandChange?.(groupKey, !wasExpanded)
        return next
      })
    },
    [onGroupExpandChange],
  )

  const expandAllGroups = useCallback(() => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      next.add('__all__')
      return next
    })
  }, [])

  const collapseAllGroups = useCallback(() => {
    setExpandedGroups(new Set())
  }, [])

  // ---- Keyboard navigation ----
  const [focusedCell, setFocusedCell] = useState<{ row: number; col: number } | null>(null)

  const handleKeyNav = useCallback(
    (e: React.KeyboardEvent) => {
      if (!keyboardNavigation || !focusedCell) return
      const maxRow = visibleRows.length - 1
      const maxCol = columns.length - 1
      let { row, col } = focusedCell

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          row = Math.max(0, row - 1)
          break
        case 'ArrowDown':
          e.preventDefault()
          row = Math.min(maxRow, row + 1)
          break
        case 'ArrowLeft':
          e.preventDefault()
          col = Math.max(0, col - 1)
          break
        case 'ArrowRight':
          e.preventDefault()
          col = Math.min(maxCol, col + 1)
          break
        case 'Tab':
          e.preventDefault()
          if (e.shiftKey) {
            col -= 1
            if (col < 0) {
              col = maxCol
              row = Math.max(0, row - 1)
            }
          } else {
            col += 1
            if (col > maxCol) {
              col = 0
              row = Math.min(maxRow, row + 1)
            }
          }
          break
        case 'Home':
          e.preventDefault()
          col = 0
          if (e.ctrlKey) row = 0
          break
        case 'End':
          e.preventDefault()
          col = maxCol
          if (e.ctrlKey) row = maxRow
          break
        default:
          return
      }
      setFocusedCell({ row, col })
    },
    [keyboardNavigation, focusedCell, visibleRows.length, columns.length],
  )

  // Column auto-resize: measure content and set optimal width
  const handleAutoResize = useCallback(
    (colKey: string) => {
      const maxLen = visibleRows.reduce((max, row) => {
        const val = String(row.data[colKey] ?? '')
        return Math.max(max, val.length)
      }, 0)
      const headerCol = leafColumns.find((c) => c.key === colKey)
      const headerLen = typeof headerCol?.title === 'string' ? headerCol.title.length : 6
      const charWidth = 8
      const padding = 32
      const min = headerCol?.minWidth ?? MIN_COL_WIDTH
      const optimal = Math.max(min, Math.max(maxLen, headerLen) * charWidth + padding)
      setColWidths((prev) => ({ ...prev, [colKey]: optimal }))
      setUserResizedCols((prev) => (prev.has(colKey) ? prev : new Set(prev).add(colKey)))
    },
    [visibleRows, leafColumns],
  )

  // ---- Tree data ----

  const isTreeMode = !!tree
  const childrenKey = tree?.childrenColumnName ?? 'children'
  const indentSize = tree?.indentSize ?? 20

  const baseFlatRows: FlatRow[] = useMemo(() => {
    if (!isTreeMode) {
      return visibleRows.map((r) => ({
        id: r.id,
        data: r.data,
        depth: 0,
        hasChildren: false,
      }))
    }
    return flattenTreeRows(visibleRows, childrenKey, treeExpanded)
  }, [visibleRows, isTreeMode, childrenKey, treeExpanded])

  // Apply group-by if configured
  const groupedRows: FlatRow[] = useMemo(() => {
    if (!groupBy) return baseFlatRows
    const allExpanded = expandedGroups.has('__all__')
    const effectiveExpanded = allExpanded
      ? new Set([...expandedGroups, ...baseFlatRows.map((r) => String(r.data[groupBy] ?? 'Other'))])
      : expandedGroups
    return groupByColumn(baseFlatRows, groupBy, columns, effectiveExpanded)
  }, [baseFlatRows, groupBy, columns, expandedGroups])

  // Separate pinned rows
  const {
    top: pinnedTop,
    middle: middleRows,
    bottom: pinnedBottom,
  } = useMemo(
    () => separatePinnedRows(groupedRows, pinnedRowsConfig?.top, pinnedRowsConfig?.bottom),
    [groupedRows, pinnedRowsConfig],
  )

  const flatRows = groupedRows

  // Aggregation footer data
  const aggregates = useMemo(
    () => computeColumnAggregates(columns, baseFlatRows),
    [columns, baseFlatRows],
  )

  // ---- Grid ----

  const extraBefore: string[] = []
  if (rowSelection) extraBefore.push(SELECTION_COL_WIDTH)
  if (expandable) extraBefore.push(SELECTION_COL_WIDTH)

  // Grid-template rules:
  //
  // Mode A — `scroll.x` is SET (author wants a horizontal scrollbar):
  //   • Widths are hard pixels by default — columns never shrink. Sticky
  //     offsets for fixed columns stay stable, table punches out of the
  //     container and the scroll handles overflow.
  //   • If numeric `scroll.x` is wider than the declared tracks, regular
  //     columns flex to absorb the remainder instead of leaving blank space.
  //
  // Mode B — `scroll.x` is NOT set (fluid layout):
  //   • No `width` / not resized → `minmax(MIN, 1fr)` — flex column.
  //   • Mixed explicit/auto widths → explicit widths stay px while auto
  //     columns share the remaining space.
  //   • All regular columns have widths → those widths become fr weights,
  //     so the table fills the container without leaving a blank tail.
  //   • Fixed/resized columns keep their exact px (sticky offsets / user
  //     resize must not be disturbed by auto-layout).
  const hasAutoColumns = columns.some(
    (c) => !c.fixed && !userResizedCols.has(c.key) && c.width == null,
  )
  const shouldFlexExplicitWidths = !hasScrollX && !hasAutoColumns
  const scrollXMinWidth =
    typeof scroll?.x === 'number'
      ? scroll.x
      : typeof scroll?.x === 'string' && scroll.x.trim().endsWith('px')
        ? Number.parseFloat(scroll.x)
        : null
  const declaredGridWidth =
    extraBefore.reduce((sum, w) => sum + Number.parseFloat(w), 0) +
    columns.reduce((sum, c) => sum + (colWidths[c.key] ?? c.width ?? DEFAULT_COL_WIDTH), 0)
  const shouldFillScrollX =
    hasScrollX &&
    scrollXMinWidth !== null &&
    Number.isFinite(scrollXMinWidth) &&
    scrollXMinWidth > declaredGridWidth

  const colTemplates = columns.map((c) => {
    const resized = userResizedCols.has(c.key)
    const w = colWidths[c.key] ?? c.width ?? DEFAULT_COL_WIDTH

    if (hasScrollX) {
      if (c.fixed || resized) {
        return `${w}px`
      }
      return shouldFillScrollX ? `minmax(${w}px, ${w}fr)` : `${w}px`
    }

    if (c.fixed || resized) {
      return `${w}px`
    }
    if (c.width == null) {
      return `minmax(${MIN_COL_WIDTH}px, 1fr)`
    }
    if (shouldFlexExplicitWidths) {
      return `minmax(${MIN_COL_WIDTH}px, ${w}fr)`
    }
    return `minmax(${MIN_COL_WIDTH}px, ${w}px)`
  })
  const gridTemplate = [...extraBefore, ...colTemplates].join(' ')
  const totalCols = extraBefore.length + columns.length

  // ---- Fixed offsets ----

  const fixedLeftOffsets = useMemo(() => {
    const o: Record<string, number> = {}
    const selW = parseInt(SELECTION_COL_WIDTH)
    let left = (rowSelection ? selW : 0) + (expandable ? selW : 0)
    for (const col of columns) {
      if (col.fixed === 'left') {
        o[col.key] = left
        left += colWidths[col.key] ?? col.width ?? DEFAULT_COL_WIDTH
      }
    }
    return o
  }, [columns, colWidths, rowSelection, expandable])

  const fixedRightOffsets = useMemo(() => {
    const o: Record<string, number> = {}
    let right = 0
    for (let i = columns.length - 1; i >= 0; i--) {
      if (columns[i].fixed === 'right') {
        o[columns[i].key] = right
        right += colWidths[columns[i].key] ?? columns[i].width ?? DEFAULT_COL_WIDTH
      }
    }
    return o
  }, [columns, colWidths])

  const fixedStyle = (col: TableColumn, isHeader?: boolean): React.CSSProperties =>
    getFixedStyle(col, fixedLeftOffsets, fixedRightOffsets, isHeader)

  const allSelected = rowSelection
    ? visibleRows.length > 0 && visibleRows.every((r) => rowSelection.selectedKeys.includes(r.id))
    : false
  const someSelected = rowSelection
    ? visibleRows.some((r) => rowSelection.selectedKeys.includes(r.id)) && !allSelected
    : false

  const spanMap = useMemo(() => computeSpanMap(columns, flatRows), [columns, flatRows])
  const hiddenCells = useMemo(
    () => computeHiddenCells(columns, flatRows, spanMap),
    [columns, flatRows, spanMap],
  )

  return {
    visibleRows,
    tableState,
    columns,
    leafColumns,
    flatRows,
    headerRows,
    hasColumnGroups,
    t,
    // Multi-sort
    sorts,
    getSortIndex,
    getSortDirection,
    handleSort,
    // Selection
    allSelected,
    someSelected,
    handleSelectAll,
    handleSelectRow,
    // Expand
    expandedKeys,
    handleToggleExpand,
    // Tree
    isTreeMode,
    indentSize,
    treeExpanded,
    handleToggleTreeExpand,
    // Filters
    filterState: {
      activeFilters,
      filterSearchText,
      openFilterDropdown,
      advancedFilters,
      filterAnchor,
    },
    filterActions: {
      setOpenFilterDropdown,
      handleFilterToggle,
      handleFilterConfirm,
      handleFilterReset,
      handleFilterClose,
      handleSearchFilterChange,
      setFilterSearchText,
      getFilterDropdownProps,
      setAdvancedFilter,
      setFilterAnchor,
    },
    filterRef,
    // Drag columns
    dragOver,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDrop,
    setDragOver: () => setDragOver(null),
    // Resize
    colWidths,
    handleResizeStart,
    // Grid
    gridTemplate,
    totalCols,
    // Fixed
    fixedStyle,
    // Span
    spanMap,
    hiddenCells,
    // Search
    searchText,
    setSearchText,
    // Pagination
    setPage,
    // Column visibility
    hiddenSet,
    toggleColumnVisibility,
    // Column pin
    handlePinColumn,
    // Context menu
    contextMenu,
    setContextMenu,
    // Fullscreen
    isFullscreen,
    toggleFullscreen,
    wrapperRef,
    // Density
    density,
    setDensity,
    // Group by
    expandedGroups,
    toggleGroupExpand,
    expandAllGroups,
    collapseAllGroups,
    // Keyboard
    focusedCell,
    setFocusedCell,
    handleKeyNav,
    // Auto-resize
    handleAutoResize,
    // Aggregation
    aggregates,
    // Pinned
    pinnedTop,
    pinnedBottom,
    middleRows,
  }
}
