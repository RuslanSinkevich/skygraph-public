<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, useSlots } from 'vue'
import { createVirtual, type VirtualEngine } from '@skygraph/core'
import { useTable } from '../../../composables/useTable'
import SgInput from '../../ui/Input.vue'
import SgCheckbox from '../../ui/Checkbox.vue'
import SgSelect from '../../ui/Select.vue'
import SgPagination from '../../ui/Pagination.vue'
import SgSpin from '../../ui/Spin.vue'
import { useConfig } from '../../ui/ConfigProvider.vue'
import {
  DEFAULT_TABLE_LOCALE,
  type TableProps,
  type TableColumn,
  type RowId,
  type SortDirection,
  type FilterDropdownSlotProps,
  type SummaryCell,
} from './types'

const props = withDefaults(defineProps<TableProps>(), {
  bordered: false,
  size: 'middle',
  sticky: false,
  searchable: false,
  showPagination: true,
  unstyled: false,
  loading: false,
  highlightOnHover: true,
})

const emit = defineEmits<{
  (e: 'rowClick', id: RowId, data: Record<string, unknown>): void
  (e: 'pageChange', page: number): void
  (e: 'sortChange', column: string, direction: SortDirection | null): void
  (e: 'cellEdit', id: RowId, column: string, value: unknown): void
  (e: 'expand', expanded: boolean, id: RowId): void
  (e: 'columnOrderChange', order: string[]): void
}>()

defineSlots<{
  toolbar(props: Record<string, never>): unknown
  empty(props: Record<string, never>): unknown
  cell(props: {
    column: TableColumn
    row: Record<string, unknown>
    id: RowId
    value: unknown
  }): unknown
  expandedRow(props: { row: Record<string, unknown>; id: RowId }): unknown
  filterDropdown(props: FilterDropdownSlotProps & { column: TableColumn }): unknown
}>()

const slots = useSlots()
const cfg = useConfig()
const selectAllLabel = computed(() => cfg.value.locale?.table?.selectAll ?? 'Select all')

const localeFull = computed(() => ({ ...DEFAULT_TABLE_LOCALE, ...props.locale }))
const sCls = computed(() => props.classNames ?? {})
const sSty = computed(() => props.styles ?? {})

/* -------------------------------------------------------------------------- */
/* Column flattening + header grid                                            */
/* -------------------------------------------------------------------------- */

interface HeaderCellShape {
  col: TableColumn
  colSpan: number
  rowSpan: number
}

function colDepth(c: TableColumn): number {
  if (!c.children || c.children.length === 0) return 1
  return 1 + Math.max(...c.children.map(colDepth))
}

function colLeafCount(c: TableColumn): number {
  if (!c.children || c.children.length === 0) return c.hidden ? 0 : 1
  return c.children.reduce((sum, ch) => sum + colLeafCount(ch), 0)
}

const hasColumnGroups = computed(() =>
  props.columns.some((c) => c.children && c.children.length > 0),
)

const headerDepth = computed(() =>
  props.columns.length === 0 ? 1 : Math.max(...props.columns.map(colDepth)),
)

/* ── Column reorder (drag-and-drop) ──────────────────────────────────────── */
// Mirrors React `useTableState` colOrder: an internal ordering of leaf keys
// applied on top of `props.columns`. Reorder is only available for flat
// (non-grouped) tables, matching React.
const colOrder = ref<string[]>([])
const dragCol = ref<string | null>(null)
const dragOver = ref<string | null>(null)

const rawLeafColumns = computed<TableColumn[]>(() => {
  const out: TableColumn[] = []
  const visit = (c: TableColumn) => {
    if (c.hidden) return
    if (!c.children || c.children.length === 0) out.push(c)
    else c.children.forEach(visit)
  }
  props.columns.forEach(visit)
  return out
})

// Keep colOrder in sync with the column set: preserve the existing order,
// append newly-added keys, drop removed ones.
watch(
  rawLeafColumns,
  (cols) => {
    const keys = cols.map((c) => c.key)
    const prevSet = new Set(colOrder.value)
    const added = keys.filter((k) => !prevSet.has(k))
    const valid = colOrder.value.filter((k) => keys.includes(k))
    colOrder.value = [...valid, ...added]
  },
  { immediate: true },
)

const leafColumns = computed<TableColumn[]>(() => {
  const cols = rawLeafColumns.value
  if (hasColumnGroups.value || !props.draggable) return cols
  const map = new Map(cols.map((c) => [c.key, c]))
  return colOrder.value.filter((k) => map.has(k)).map((k) => map.get(k)!)
})

const headerRows = computed<HeaderCellShape[][]>(() => {
  const depth = headerDepth.value
  const rows: HeaderCellShape[][] = Array.from({ length: depth }, () => [])
  // Flat reorderable header: emit leaf columns in colOrder so drag changes
  // the rendered order without rebuilding the grouped grid.
  if (!hasColumnGroups.value && props.draggable && depth === 1) {
    for (const col of leafColumns.value) {
      rows[0].push({ col, colSpan: 1, rowSpan: 1 })
    }
    return rows
  }
  const visit = (c: TableColumn, level: number) => {
    if (c.hidden) return
    const hasChildren = !!(c.children && c.children.length > 0)
    if (hasChildren) {
      const span = colLeafCount(c)
      if (span > 0) {
        rows[level].push({ col: c, colSpan: span, rowSpan: 1 })
        c.children!.forEach((ch) => visit(ch, level + 1))
      }
    } else {
      rows[level].push({ col: c, colSpan: 1, rowSpan: depth - level })
    }
  }
  props.columns.forEach((c) => visit(c, 0))
  return rows
})

const columns = computed(() => leafColumns.value)

function handleColDragStart(ev: DragEvent, key: string) {
  dragCol.value = key
  if (ev.dataTransfer) {
    ev.dataTransfer.effectAllowed = 'move'
    ev.dataTransfer.setData('text/plain', key)
  }
}

function handleColDragOver(ev: DragEvent, key: string) {
  ev.preventDefault()
  if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'move'
  dragOver.value = key
}

function handleColDragLeave() {
  dragOver.value = null
}

function handleColDrop(ev: DragEvent, targetKey: string) {
  ev.preventDefault()
  const from = dragCol.value
  if (!from || from === targetKey) {
    dragCol.value = null
    dragOver.value = null
    return
  }
  const next = colOrder.value.filter((k) => k !== from)
  const idx = next.indexOf(targetKey)
  next.splice(idx < 0 ? next.length : idx, 0, from)
  colOrder.value = next
  props.onColumnOrderChange?.(next)
  emit('columnOrderChange', next)
  dragCol.value = null
  dragOver.value = null
}

function handleColDragEnd() {
  dragCol.value = null
  dragOver.value = null
}

// A column is draggable only on flat tables, when the feature is enabled,
// and the column is not pinned (fixed) — matching React's `draggable && !col.fixed`.
function isColDraggable(col: TableColumn): boolean {
  return (
    !!props.draggable &&
    !hasColumnGroups.value &&
    !col.fixed &&
    !(col.children && col.children.length > 0)
  )
}

/* -------------------------------------------------------------------------- */
/* Engine wiring                                                              */
/* -------------------------------------------------------------------------- */

const {
  table,
  visibleRows,
  tableState,
  setSort,
  clearSort,
  addFilter,
  clearFilters,
  setPage,
  setFilterFn,
  refresh,
  columnWidths,
  setColumnWidth,
} = useTable({
  pageSize: props.pageSize,
  data: props.data,
})

watch(
  () => props.pageSize,
  (next) => {
    if (next !== undefined) {
      table.setPageSize(next)
      refresh()
    }
  },
)

watch(
  () => props.data,
  (next) => {
    table.reset()
    if (next) table.addRows(next)
    // In virtual mode the engine renders the full dataset — pagination
    // must be bypassed even if the consumer forgot to lift `pageSize`.
    if (props.virtual && props.pageSize === undefined && next) {
      table.setPageSize(next.length || 1)
    }
    refresh()
  },
)

// Mirror the data-watch on initial mount so virtual demos that don't set
// pageSize still see the whole dataset (otherwise visibleRows defaults
// to the engine's 50-row page and the virtual scroller measures off
// 50 instead of N rows).
watch(
  () => [props.virtual, props.data?.length],
  () => {
    if (props.virtual && props.pageSize === undefined && props.data) {
      table.setPageSize(props.data.length || 1)
      refresh()
    }
  },
  { immediate: true },
)

/* -------------------------------------------------------------------------- */
/* Global search                                                              */
/* -------------------------------------------------------------------------- */

const internalSearch = ref('')

const searchQuery = computed<string>({
  get: () => (props.searchValue !== undefined ? props.searchValue : internalSearch.value),
  set: (v) => {
    if (props.searchValue === undefined) internalSearch.value = v
  },
})

/* -------------------------------------------------------------------------- */
/* Sorting                                                                    */
/* -------------------------------------------------------------------------- */

const currentSort = computed(() => tableState.value.sorts[0] ?? null)

function handleSortClick(column: TableColumn) {
  if (!column.sortable) return
  const cur = currentSort.value
  let next: SortDirection | null = 'asc'
  if (cur && cur.column === column.key) {
    if (cur.direction === 'asc') next = 'desc'
    else if (cur.direction === 'desc') next = null
  }
  if (next === null) clearSort()
  else setSort(column.key, next)
  emit('sortChange', column.key, next)
}

/* -------------------------------------------------------------------------- */
/* Selection                                                                  */
/* -------------------------------------------------------------------------- */

const internalSelected = ref<RowId[]>([])
const selectedKeys = computed<RowId[]>(
  () => props.rowSelection?.selectedKeys ?? internalSelected.value,
)
const selectedSet = computed<Set<RowId>>(() => new Set(selectedKeys.value))

function toggleRowSelected(id: RowId) {
  if (!props.rowSelection) return
  let next: RowId[]
  if (props.rowSelection.type === 'radio') {
    next = selectedSet.value.has(id) ? [] : [id]
  } else {
    next = selectedSet.value.has(id)
      ? selectedKeys.value.filter((k) => k !== id)
      : [...selectedKeys.value, id]
  }
  internalSelected.value = next
  const rows = props.data.filter((r) => next.includes(r.id)).map((r) => r.data)
  props.rowSelection.onChange?.(next, rows)
}

const allCurrentPageSelected = computed(() => {
  if (visibleRows.value.length === 0) return false
  return visibleRows.value.every((r) => selectedSet.value.has(r.id))
})

const someCurrentPageSelected = computed(
  () => !allCurrentPageSelected.value && visibleRows.value.some((r) => selectedSet.value.has(r.id)),
)

function toggleSelectAll() {
  if (!props.rowSelection) return
  const ids = visibleRows.value.map((r) => r.id)
  let next: RowId[]
  if (allCurrentPageSelected.value) {
    next = selectedKeys.value.filter((k) => !ids.includes(k))
  } else {
    const set = new Set(selectedKeys.value)
    for (const id of ids) set.add(id)
    next = Array.from(set)
  }
  internalSelected.value = next
  const rows = props.data.filter((r) => next.includes(r.id)).map((r) => r.data)
  props.rowSelection.onChange?.(next, rows)
}

/* -------------------------------------------------------------------------- */
/* Tree mode                                                                  */
/* -------------------------------------------------------------------------- */

interface FlatRow {
  id: RowId
  data: Record<string, unknown>
  depth: number
  hasChildren: boolean
}

const treeChildField = computed(() => props.tree?.childrenColumnName ?? 'children')
const treeIndent = computed(() => props.tree?.indentSize ?? 16)

const treeExpanded = ref<Set<RowId>>(new Set())

function collectAllTreeIds(rows: Array<{ id: RowId; data: Record<string, unknown> }>) {
  const out = new Set<RowId>()
  const visit = (list: Array<{ id: RowId; data: Record<string, unknown> }>) => {
    for (const r of list) {
      const children = r.data[treeChildField.value] as
        | Array<{ id: RowId; data: Record<string, unknown> }>
        | undefined
      if (children && children.length > 0) {
        out.add(r.id)
        visit(children)
      }
    }
  }
  visit(rows)
  return out
}

function initTreeExpanded() {
  if (props.tree?.defaultExpandAllRows) {
    treeExpanded.value = collectAllTreeIds(props.data ?? [])
  } else {
    treeExpanded.value = new Set()
  }
}
onMounted(initTreeExpanded)
watch(() => props.tree?.defaultExpandAllRows, initTreeExpanded)
watch(
  () => props.data,
  () => initTreeExpanded(),
)

function toggleTreeRow(id: RowId) {
  const next = new Set(treeExpanded.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  treeExpanded.value = next
}

const flatRows = computed<FlatRow[]>(() => {
  if (!props.tree) {
    return visibleRows.value.map((r) => ({
      id: r.id,
      data: r.data,
      depth: 0,
      hasChildren: false,
    }))
  }
  const out: FlatRow[] = []
  const childField = treeChildField.value
  const visit = (rows: Array<{ id: RowId; data: Record<string, unknown> }>, depth: number) => {
    for (const r of rows) {
      const children = r.data[childField] as
        | Array<{ id: RowId; data: Record<string, unknown> }>
        | undefined
      const has = !!(children && children.length > 0)
      out.push({ id: r.id, data: r.data, depth, hasChildren: has })
      if (has && treeExpanded.value.has(r.id)) {
        visit(children!, depth + 1)
      }
    }
  }
  visit(visibleRows.value, 0)
  return out
})

/* -------------------------------------------------------------------------- */
/* Expandable rows                                                            */
/* -------------------------------------------------------------------------- */

const internalExpanded = ref<Set<RowId>>(new Set())

onMounted(() => {
  const exp = props.expandable
  if (exp?.defaultExpandedRowKeys) {
    internalExpanded.value = new Set(exp.defaultExpandedRowKeys)
  }
})

const expandedSet = computed<Set<RowId>>(() => {
  const exp = props.expandable
  if (exp?.expandedKeys) return new Set(exp.expandedKeys)
  return internalExpanded.value
})

function toggleExpand(id: RowId) {
  const exp = props.expandable
  if (!exp) return
  const wasExpanded = expandedSet.value.has(id)
  if (exp.expandedKeys === undefined) {
    const next = new Set(internalExpanded.value)
    if (wasExpanded) next.delete(id)
    else next.add(id)
    internalExpanded.value = next
  }
  exp.onExpand?.(!wasExpanded, id)
  emit('expand', !wasExpanded, id)
}

function isRowExpandable(row: Record<string, unknown>): boolean {
  const exp = props.expandable
  if (!exp) return false
  return exp.rowExpandable ? exp.rowExpandable(row) : true
}

/* -------------------------------------------------------------------------- */
/* Per-column filters                                                         */
/* -------------------------------------------------------------------------- */

const activeFilters = ref<Map<string, unknown[]>>(new Map())
const openFilterDropdown = ref<string | null>(null)

function rebuildFilters() {
  const colsWith = columns.value.filter((c) => c.onFilter && activeFilters.value.get(c.key)?.length)
  const hasSearch = props.searchable && searchQuery.value.length > 0
  if (colsWith.length === 0 && !hasSearch) {
    setFilterFn(null)
    return
  }
  const lower = hasSearch ? searchQuery.value.toLowerCase() : ''
  setFilterFn((row) => {
    for (const col of colsWith) {
      const vals = activeFilters.value.get(col.key)!
      const fn = col.onFilter!
      if (!vals.some((v) => fn(v, row))) return false
    }
    if (hasSearch) {
      const match = columns.value.some((c) => {
        const v = row[c.key]
        return v != null && String(v).toLowerCase().includes(lower)
      })
      if (!match) return false
    }
    return true
  })
}

watch(
  searchQuery,
  () => {
    rebuildFilters()
    refresh()
  },
  { immediate: true },
)

function applyColumnFilter(column: TableColumn, values: unknown[]) {
  if (!values || values.length === 0) {
    activeFilters.value.delete(column.key)
    if (!column.onFilter) table.removeFilter(column.key)
  } else {
    activeFilters.value.set(column.key, values)
    if (!column.onFilter) {
      addFilter({ column: column.key, value: values[0], operator: 'eq' })
    }
  }
  activeFilters.value = new Map(activeFilters.value)
  rebuildFilters()
  refresh()
}

function toggleFilterDropdown(key: string) {
  openFilterDropdown.value = openFilterDropdown.value === key ? null : key
}
function closeFilterDropdown() {
  openFilterDropdown.value = null
}

const filterDropdownRefs = ref<Map<string, HTMLElement>>(new Map())
function setFilterDropdownRef(key: string, el: Element | null) {
  if (el) filterDropdownRefs.value.set(key, el as HTMLElement)
  else filterDropdownRefs.value.delete(key)
}

function onDocClick(ev: MouseEvent) {
  if (!openFilterDropdown.value) return
  const el = filterDropdownRefs.value.get(openFilterDropdown.value)
  if (el && el.contains(ev.target as Node)) return
  closeFilterDropdown()
}
onMounted(() => document.addEventListener('mousedown', onDocClick))
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocClick))

/* -------------------------------------------------------------------------- */
/* Resizable columns                                                          */
/* -------------------------------------------------------------------------- */

const resizing = ref<{ key: string; startX: number; startW: number } | null>(null)

function onResizeStart(col: TableColumn, ev: MouseEvent) {
  ev.preventDefault()
  ev.stopPropagation()
  const startW = columnWidths.value[col.key] ?? col.width ?? 150
  resizing.value = { key: col.key, startX: ev.clientX, startW }
  document.addEventListener('mousemove', onResizeMove)
  document.addEventListener('mouseup', onResizeEnd)
}

function onResizeMove(ev: MouseEvent) {
  const r = resizing.value
  if (!r) return
  const min = props.columns.find((c) => c.key === r.key)?.minWidth ?? 50
  const next = Math.max(min, r.startW + (ev.clientX - r.startX))
  setColumnWidth(r.key, next)
}

function onResizeEnd() {
  resizing.value = null
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', onResizeEnd)
}

/* -------------------------------------------------------------------------- */
/* Editable cells                                                             */
/* -------------------------------------------------------------------------- */

const editingCell = ref<{ id: RowId; key: string } | null>(null)
const editingValue = ref<string>('')

function startEdit(id: RowId, key: string, value: unknown) {
  editingCell.value = { id, key }
  editingValue.value = value == null ? '' : String(value)
  void nextTick(() => {
    const input = document.querySelector<HTMLInputElement>('.sg-table-edit-input')
    input?.focus()
    input?.select()
  })
}

function commitEdit() {
  if (!editingCell.value) return
  const { id, key } = editingCell.value
  emit('cellEdit', id, key, editingValue.value)
  props.onCellEdit?.(id, key, editingValue.value)
  editingCell.value = null
}

function cancelEdit() {
  editingCell.value = null
}

/* -------------------------------------------------------------------------- */
/* Layout: grid template + fixed offsets                                      */
/* -------------------------------------------------------------------------- */

const DEFAULT_COL_WIDTH = 150
const MIN_COL_WIDTH = 50
const EXPAND_COL_WIDTH = 40
const SELECTION_COL_WIDTH = 48

function colWidthPx(col: TableColumn): number {
  return columnWidths.value[col.key] ?? col.width ?? DEFAULT_COL_WIDTH
}

const hasScrollX = computed(() => props.scroll?.x != null)

const hasAutoColumns = computed(() =>
  columns.value.some((c) => !c.fixed && columnWidths.value[c.key] == null && c.width == null),
)

const shouldFlexExplicitWidths = computed(() => !hasScrollX.value && !hasAutoColumns.value)

function colTrack(col: TableColumn): string {
  const resized = columnWidths.value[col.key] != null
  const w = columnWidths.value[col.key] ?? col.width ?? DEFAULT_COL_WIDTH
  if (hasScrollX.value) {
    return col.fixed || resized ? `${w}px` : `${w}px`
  }
  if (col.fixed || resized) return `${w}px`
  if (col.width == null) return `minmax(${MIN_COL_WIDTH}px, 1fr)`
  if (shouldFlexExplicitWidths.value) return `minmax(${MIN_COL_WIDTH}px, ${w}fr)`
  return `minmax(${MIN_COL_WIDTH}px, ${w}px)`
}

const totalLeadingCols = computed(() => (props.expandable ? 1 : 0) + (props.rowSelection ? 1 : 0))

const totalCols = computed(() => totalLeadingCols.value + columns.value.length)

const gridTemplate = computed(() => {
  const parts: string[] = []
  if (props.expandable) parts.push(`${EXPAND_COL_WIDTH}px`)
  if (props.rowSelection) parts.push(`${SELECTION_COL_WIDTH}px`)
  for (const col of columns.value) parts.push(colTrack(col))
  return parts.join(' ')
})

interface FixedOffsets {
  left: Record<string, number>
  right: Record<string, number>
}

const fixedOffsets = computed<FixedOffsets>(() => {
  const left: Record<string, number> = {}
  const right: Record<string, number> = {}
  let leftSum = 0
  if (props.expandable) leftSum += EXPAND_COL_WIDTH
  if (props.rowSelection) leftSum += SELECTION_COL_WIDTH
  for (const col of columns.value) {
    if (col.fixed === 'left') {
      left[col.key] = leftSum
      leftSum += colWidthPx(col)
    }
  }
  let rightSum = 0
  for (const col of [...columns.value].reverse()) {
    if (col.fixed === 'right') {
      right[col.key] = rightSum
      rightSum += colWidthPx(col)
    }
  }
  return { left, right }
})

function fixedStyle(col: TableColumn, isHeader = false): Record<string, string | number> {
  const out: Record<string, string | number> = {}
  if (col.align) out.textAlign = col.align
  if (col.fixed === 'left') {
    out.position = 'sticky'
    out.left = `${fixedOffsets.value.left[col.key] ?? 0}px`
    out.zIndex = isHeader ? 4 : 2
  }
  if (col.fixed === 'right') {
    out.position = 'sticky'
    out.right = `${fixedOffsets.value.right[col.key] ?? 0}px`
    out.zIndex = isHeader ? 4 : 2
  }
  return out
}

/* -------------------------------------------------------------------------- */
/* Pagination                                                                 */
/* -------------------------------------------------------------------------- */

const totalPages = computed(() => tableState.value.totalPages)

function gotoPage(page: number) {
  if (page < 1 || page > totalPages.value) return
  setPage(page)
  emit('pageChange', page)
}

/* -------------------------------------------------------------------------- */
/* Summary / footer aggregates                                                */
/* -------------------------------------------------------------------------- */

const summaryRows = computed<SummaryCell[][]>(() =>
  props.summary ? props.summary(visibleRows.value) : [],
)

function aggregateValue(col: TableColumn): unknown {
  if (!col.aggregate) return null
  const values = visibleRows.value.map((r) => r.data[col.key])
  if (typeof col.aggregate === 'function') return col.aggregate(values)
  const nums = values.map(Number).filter((n) => !Number.isNaN(n))
  if (nums.length === 0) return col.aggregate === 'count' ? values.length : '-'
  switch (col.aggregate) {
    case 'sum':
      return Math.round(nums.reduce((a, b) => a + b, 0) * 100) / 100
    case 'avg':
      return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100
    case 'count':
      return values.length
    case 'min':
      return Math.min(...nums)
    case 'max':
      return Math.max(...nums)
  }
  return null
}

/* -------------------------------------------------------------------------- */
/* Virtual scroll (engine-driven, same grid as non-virtual)                   */
/* -------------------------------------------------------------------------- */

type VirtualRowHeightFn = (row: Record<string, unknown>, id: RowId) => number

const virtualConfig = computed(() => {
  if (!props.virtual) return null
  const v = props.virtual
  const isObj = typeof v === 'object'
  return {
    rowHeight: (isObj ? (v.rowHeight ?? 40) : 40) as number | VirtualRowHeightFn,
    estimateRowHeight: isObj ? v.estimateRowHeight : undefined,
    overscan: isObj ? (v.overscan ?? 5) : 5,
    height: isObj ? v.height : undefined,
  }
})

const virtualEngine = ref<VirtualEngine | null>(null)
const scrollEl = ref<HTMLElement | null>(null)
const scrollTop = ref(0)
const viewportHeight = ref(0)
const virtualVersion = ref(0)

function buildEstimate(
  rh: number | VirtualRowHeightFn,
  est: VirtualRowHeightFn | undefined,
  rows: FlatRow[],
): number | ((index: number) => number) {
  if (typeof rh === 'number' && est == null) return rh
  const fallback = typeof rh === 'number' ? rh : 40
  const fn: VirtualRowHeightFn | undefined = est ?? (typeof rh === 'function' ? rh : undefined)
  if (!fn) return fallback
  return (index: number) => {
    const r = rows[index]
    if (!r) return fallback
    const v = fn(r.data, r.id)
    return Number.isFinite(v) && v >= 0 ? v : fallback
  }
}

function ensureVirtualEngine() {
  if (!virtualConfig.value) {
    virtualEngine.value = null
    return
  }
  if (!virtualEngine.value) {
    const eng = createVirtual({
      itemCount: flatRows.value.length,
      itemHeight: buildEstimate(
        virtualConfig.value.rowHeight,
        virtualConfig.value.estimateRowHeight,
        flatRows.value,
      ),
      overscan: virtualConfig.value.overscan,
    })
    eng.subscribe(() => {
      virtualVersion.value++
    })
    virtualEngine.value = eng
  }
}

watch(virtualConfig, ensureVirtualEngine, { immediate: true })

watch(
  [flatRows, virtualConfig],
  () => {
    const eng = virtualEngine.value
    const cfg = virtualConfig.value
    if (!eng || !cfg) return
    eng.setItemCount(flatRows.value.length)
    eng.setItemHeight(buildEstimate(cfg.rowHeight, cfg.estimateRowHeight, flatRows.value))
    // Declarative mode: pre-prime engine with all row heights so totalHeight is accurate.
    if (typeof cfg.rowHeight === 'function') {
      const fn = cfg.rowHeight
      for (let i = 0; i < flatRows.value.length; i++) {
        const r = flatRows.value[i]
        if (!r) continue
        const h = fn(r.data, r.id)
        if (Number.isFinite(h) && h >= 0) eng.setMeasuredHeight(i, Math.round(h))
      }
    }
  },
  { deep: false },
)

// Synchronous scroll handler — when the user drags the scrollbar
// thumb, the browser moves it in sync with the pointer. Deferring to
// rAF causes the DOM content (topPad/bottomPad) to update a frame
// late, which makes the browser recalculate scroll position and the
// thumb drifts away from the cursor.
function onVirtualScroll() {
  const el = scrollEl.value
  if (el) scrollTop.value = el.scrollTop
}

function syncViewport() {
  const el = scrollEl.value
  if (!el) return
  viewportHeight.value = el.clientHeight
  scrollTop.value = el.scrollTop
}

onMounted(() => {
  if (!virtualConfig.value) return
  syncViewport()
  const el = scrollEl.value
  if (!el) return
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(syncViewport) : null
  ro?.observe(el)
  onBeforeUnmount(() => ro?.disconnect())
})

interface VirtualRange {
  startIndex: number
  endIndex: number
  visibleRows: FlatRow[]
  topPad: number
  bottomPad: number
}

const virtualRange = computed<VirtualRange | null>(() => {
  // touch virtualVersion to re-run when engine notifies measurements
  void virtualVersion.value
  const eng = virtualEngine.value
  if (!eng || !virtualConfig.value) return null
  const range = eng.getRange(scrollTop.value, viewportHeight.value || 400)
  const visible = flatRows.value.slice(range.startIndex, range.endIndex + 1)
  let visibleSize = 0
  for (let i = 0; i < visible.length; i++) {
    visibleSize += eng.getItemSize(range.startIndex + i)
  }
  const bottom = Math.max(0, range.totalHeight - range.offsetTop - visibleSize)
  return {
    startIndex: range.startIndex,
    endIndex: range.endIndex,
    visibleRows: visible,
    topPad: range.offsetTop,
    bottomPad: bottom,
  }
})

const bodyRows = computed<FlatRow[]>(() =>
  virtualRange.value ? virtualRange.value.visibleRows : flatRows.value,
)

const rowIndexOffset = computed(() => (virtualRange.value ? virtualRange.value.startIndex : 0))

// Inline-locking высот ячеек к engine.getItemSize(idx). React делает
// то же самое в `VirtualTableBody` через useLayoutEffect — без этого
// DOM.scrollHeight рассинхронизируется с engine.totalHeight (натуральная
// высота ячеек может отличаться от заявленной в `rowHeight(row)` —
// например, рендер контента влияет на интервалы), и при drag-е ползунка
// браузер мапит cursorY → scrollTop по «вранному» scrollHeight, ползунок
// уезжает от курсора.
//
// `flush: 'post'` гарантирует, что эффект отрабатывает ПОСЛЕ обновления
// DOM, когда новые видимые строки уже есть в дереве. Лочим высоту на
// inline-style каждой ячейки в строке.
watch(
  [() => virtualRange.value, () => virtualVersion.value, () => bodyRows.value],
  () => {
    const eng = virtualEngine.value
    const cfg = virtualConfig.value
    if (!eng || !cfg) return
    const grid = scrollEl.value?.querySelector('.sg-table-grid')
    if (!grid) return
    const rowEls = grid.querySelectorAll<HTMLElement>('[data-sg-virtual-row-index]')
    rowEls.forEach((rowEl) => {
      const idx = Number(rowEl.getAttribute('data-sg-virtual-row-index'))
      if (!Number.isFinite(idx)) return
      const h = eng.getItemSize(idx)
      if (!Number.isFinite(h) || h <= 0) return
      const px = `${h}px`
      const children = rowEl.children
      for (let c = 0; c < children.length; c++) {
        const cell = children[c] as HTMLElement
        if (cell.style.height !== px) cell.style.height = px
        if (cell.style.minHeight !== '0px') cell.style.minHeight = '0px'
        if (cell.style.overflow !== 'hidden') cell.style.overflow = 'hidden'
      }
    })
  },
  { flush: 'post' },
)

/* -------------------------------------------------------------------------- */
/* Layout classes                                                             */
/* -------------------------------------------------------------------------- */

function rowClassFor(row: FlatRow, absIndex: number): string {
  const extra =
    typeof props.rowClassName === 'function'
      ? props.rowClassName(row.data, row.id)
      : (props.rowClassName ?? '')
  const selected = selectedSet.value.has(row.id) ? 'sg-table-row-selected' : ''
  const striped = props.striped && absIndex % 2 === 1 ? 'sg-table-row-striped' : ''
  return ['sg-table-row', 'sg-table-row-clickable', selected, striped, extra, sCls.value.row ?? '']
    .filter(Boolean)
    .join(' ')
}

function handleRowClick(row: FlatRow) {
  emit('rowClick', row.id, row.data)
}

const wrapperClass = computed(() => {
  if (props.unstyled) return ''
  return [
    'sg-table-wrapper',
    `sg-table-${props.size}`,
    props.bordered ? 'sg-table-bordered' : '',
    props.sticky || virtualConfig.value ? 'sg-table-sticky' : '',
    props.loading ? 'sg-table-loading' : '',
    props.striped ? 'sg-table-striped' : '',
    props.highlightOnHover === false ? '' : 'sg-table-hoverable',
    sCls.value.root ?? '',
  ]
    .filter(Boolean)
    .join(' ')
})

const scrollClass = computed(() =>
  ['sg-table-scroll', props.scroll?.x ? 'sg-table-scroll-x' : '', sCls.value.scroll]
    .filter(Boolean)
    .join(' '),
)

const scrollStyle = computed<Record<string, string | number>>(() => {
  const out: Record<string, string | number> = { ...(sSty.value.scroll ?? {}) }
  if (props.scroll?.x) out.overflowX = 'auto'
  if (virtualConfig.value) {
    out.overflowY = 'auto'
    const h = virtualConfig.value.height ?? props.scroll?.y ?? 400
    out.height = typeof h === 'number' ? `${h}px` : h
  } else if (props.scroll?.y) {
    out.overflowY = 'auto'
    out.maxHeight = typeof props.scroll.y === 'number' ? `${props.scroll.y}px` : props.scroll.y
  }
  return out
})

const virtualFixedRowHeight = computed(() => {
  const cfg = virtualConfig.value
  if (!cfg) return null
  if (typeof cfg.rowHeight === 'number' && cfg.estimateRowHeight == null) return cfg.rowHeight
  return null
})

const gridClass = computed(
  () =>
    [
      'sg-table-grid',
      virtualFixedRowHeight.value != null ? 'sg-table-grid-virtual-fixed' : '',
      sCls.value.grid,
    ]
      .filter(Boolean)
      .join(' ') || undefined,
)

const gridStyle = computed<Record<string, string | number>>(() => {
  const out: Record<string, string | number> = {
    gridTemplateColumns: gridTemplate.value,
    ...(sSty.value.grid ?? {}),
  }
  if (props.scroll?.x) {
    out.minWidth = typeof props.scroll.x === 'number' ? `${props.scroll.x}px` : props.scroll.x
  }
  if (virtualFixedRowHeight.value != null) {
    out['--sg-virtual-row-height'] = `${virtualFixedRowHeight.value}px`
  }
  return out
})

const hasToolbar = computed(() => props.searchable || !!slots.toolbar)

const spacerColumn = computed(() => `1 / ${totalCols.value + 1}`)

defineExpose({
  table,
  refresh,
  clearAll: () => {
    clearSort()
    clearFilters()
    activeFilters.value.clear()
    internalSearch.value = ''
  },
})
</script>

<template>
  <div :class="wrapperClass || undefined" :style="sSty.root">
    <!-- Toolbar -->
    <div
      v-if="hasToolbar"
      :class="['sg-table-toolbar', sCls.toolbar].filter(Boolean).join(' ') || undefined"
      :style="sSty.toolbar"
    >
      <SgInput
        v-if="searchable"
        v-model="searchQuery"
        size="small"
        class="sg-table-search-input"
        :placeholder="localeFull.searchPlaceholder"
        :aria-label="localeFull.searchPlaceholder"
        allow-clear
        :style="{ maxWidth: '240px' }"
      />
      <div class="sg-table-toolbar-right">
        <slot name="toolbar" />
      </div>
    </div>

    <!-- Scroll viewport (owns vertical scroll for virtual / scroll.y) -->
    <div
      ref="scrollEl"
      :class="scrollClass || undefined"
      :style="scrollStyle"
      :aria-busy="loading || undefined"
      @scroll="onVirtualScroll"
    >
      <div :class="gridClass" :style="gridStyle" role="table">
        <!-- Header rows -->
        <template v-for="(headerRow, rowIdx) in headerRows" :key="`hdr-${rowIdx}`">
          <div
            :class="['sg-table-header-row', sCls.headerRow].filter(Boolean).join(' ') || undefined"
            role="row"
            :style="{ display: 'contents', ...(sSty.headerRow ?? {}) }"
          >
            <!-- Expand placeholder header (first header row) -->
            <div
              v-if="rowIdx === 0 && expandable"
              class="sg-table-th sg-table-cell-expand"
              role="columnheader"
              :style="hasColumnGroups ? { gridRow: `span ${headerDepth}` } : {}"
            />
            <!-- Selection placeholder header (first header row) -->
            <div
              v-if="rowIdx === 0 && rowSelection"
              class="sg-table-th sg-table-cell-selection"
              role="columnheader"
              :style="hasColumnGroups ? { gridRow: `span ${headerDepth}` } : {}"
            >
              <SgCheckbox
                v-if="rowSelection.type !== 'radio'"
                :checked="allCurrentPageSelected"
                :indeterminate="someCurrentPageSelected"
                :aria-label="selectAllLabel"
                @change="toggleSelectAll"
              />
            </div>
            <template v-for="cell in headerRow" :key="`${rowIdx}-${cell.col.key}`">
              <div
                :class="
                  [
                    'sg-table-th',
                    cell.col.children && cell.col.children.length > 0
                      ? 'sg-table-th-group'
                      : cell.col.sortable
                        ? 'sg-table-th-sortable'
                        : '',
                    cell.col.fixed ? 'sg-table-cell-fixed' : '',
                    cell.col.fixed ? `sg-table-cell-fixed-${cell.col.fixed}` : '',
                    isColDraggable(cell.col) && dragOver === cell.col.key
                      ? 'sg-table-th-drag-over'
                      : '',
                    sCls.headerCell,
                    cell.col.headerClassName,
                  ]
                    .filter(Boolean)
                    .join(' ') || undefined
                "
                :draggable="isColDraggable(cell.col) || undefined"
                @dragstart="isColDraggable(cell.col) && handleColDragStart($event, cell.col.key)"
                @dragover="isColDraggable(cell.col) && handleColDragOver($event, cell.col.key)"
                @dragleave="isColDraggable(cell.col) && handleColDragLeave()"
                @drop="isColDraggable(cell.col) && handleColDrop($event, cell.col.key)"
                @dragend="isColDraggable(cell.col) && handleColDragEnd()"
                :style="{
                  ...(!(cell.col.children && cell.col.children.length > 0)
                    ? fixedStyle(cell.col, true)
                    : {}),
                  ...(cell.colSpan > 1 ? { gridColumn: `span ${cell.colSpan}` } : {}),
                  ...(cell.rowSpan > 1 ? { gridRow: `span ${cell.rowSpan}` } : {}),
                  ...(sSty.headerCell ?? {}),
                }"
                role="columnheader"
                :aria-sort="
                  currentSort && currentSort.column === cell.col.key
                    ? currentSort.direction === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : cell.col.sortable
                      ? 'none'
                      : undefined
                "
                @click="
                  !(cell.col.children && cell.col.children.length > 0) && handleSortClick(cell.col)
                "
              >
                <span class="sg-table-th-content">
                  <span class="sg-table-th-title">{{ cell.col.title }}</span>
                  <span
                    v-if="cell.col.sortable && !(cell.col.children && cell.col.children.length > 0)"
                    class="sg-table-sort-arrows"
                  >
                    <span
                      class="sg-table-sort-asc"
                      :class="{
                        'sg-table-sort-current':
                          currentSort &&
                          currentSort.column === cell.col.key &&
                          currentSort.direction === 'asc',
                      }"
                      >{{ localeFull.sortAsc }}</span
                    >
                    <span
                      class="sg-table-sort-desc"
                      :class="{
                        'sg-table-sort-current':
                          currentSort &&
                          currentSort.column === cell.col.key &&
                          currentSort.direction === 'desc',
                      }"
                      >{{ localeFull.sortDesc }}</span
                    >
                  </span>
                </span>

                <!-- preset filters: icon trigger + popup with SgSelect (single-value) -->
                <span
                  v-if="
                    cell.col.filters &&
                    cell.col.filters.length > 0 &&
                    !slots.filterDropdown &&
                    !(cell.col.children && cell.col.children.length > 0)
                  "
                  class="sg-table-filter-trigger"
                  :class="{
                    'sg-table-filter-active':
                      activeFilters.get(cell.col.key) &&
                      activeFilters.get(cell.col.key)!.length > 0,
                  }"
                  role="button"
                  :aria-label="`Filter ${cell.col.title}`"
                  @click.stop="toggleFilterDropdown(cell.col.key)"
                  >▾</span
                >
                <div
                  v-if="
                    cell.col.filters &&
                    cell.col.filters.length > 0 &&
                    !slots.filterDropdown &&
                    !(cell.col.children && cell.col.children.length > 0)
                  "
                  v-show="openFilterDropdown === cell.col.key"
                  :ref="(el) => setFilterDropdownRef(cell.col.key, el as Element | null)"
                  class="sg-table-filter-dropdown"
                  @click.stop
                >
                  <SgSelect
                    size="small"
                    class="sg-table-filter-select"
                    :placeholder="localeFull.filterAll"
                    :options="[
                      { label: localeFull.filterAll, value: '' },
                      ...cell.col.filters.map((f) => ({
                        label: String(f.text),
                        value: String(f.value),
                      })),
                    ]"
                    :aria-label="`Filter ${cell.col.title}`"
                    @change="
                      (v) => {
                        applyColumnFilter(cell.col, v ? [v] : [])
                        closeFilterDropdown()
                      }
                    "
                  />
                </div>

                <!-- custom filter via slot -->
                <span
                  v-if="
                    slots.filterDropdown && !(cell.col.children && cell.col.children.length > 0)
                  "
                  class="sg-table-filter-trigger"
                  :class="{
                    'sg-table-filter-active':
                      activeFilters.get(cell.col.key) &&
                      activeFilters.get(cell.col.key)!.length > 0,
                  }"
                  @click.stop="toggleFilterDropdown(cell.col.key)"
                  >▾</span
                >
                <div
                  v-if="slots.filterDropdown && openFilterDropdown === cell.col.key"
                  :ref="(el) => setFilterDropdownRef(cell.col.key, el as Element | null)"
                  class="sg-table-filter-dropdown"
                  @click.stop
                >
                  <slot
                    name="filterDropdown"
                    :column="cell.col"
                    :selected-keys="activeFilters.get(cell.col.key) ?? []"
                    :set-selected-keys="(keys: unknown[]) => activeFilters.set(cell.col.key, keys)"
                    :confirm="
                      () => {
                        applyColumnFilter(cell.col, activeFilters.get(cell.col.key) ?? [])
                        closeFilterDropdown()
                      }
                    "
                    :clear-filters="
                      () => {
                        applyColumnFilter(cell.col, [])
                        closeFilterDropdown()
                      }
                    "
                    :close="closeFilterDropdown"
                  />
                </div>

                <div
                  v-if="cell.col.resizable && !(cell.col.children && cell.col.children.length > 0)"
                  class="sg-table-resize-handle"
                  @click.stop
                  @mousedown="(ev) => onResizeStart(cell.col, ev)"
                />
              </div>
            </template>
          </div>
        </template>

        <!-- Empty state -->
        <div
          v-if="flatRows.length === 0"
          class="sg-table-row sg-table-row-empty"
          role="row"
          style="display: contents"
        >
          <div
            :class="
              ['sg-table-td', 'sg-table-empty', sCls.empty].filter(Boolean).join(' ') || undefined
            "
            :style="{ gridColumn: spacerColumn, ...(sSty.empty ?? {}) }"
            role="cell"
          >
            <slot name="empty">{{ localeFull.emptyText }}</slot>
          </div>
        </div>

        <!-- Virtual top spacer -->
        <div
          v-if="virtualRange && virtualRange.topPad > 0"
          :style="{ gridColumn: spacerColumn, height: `${virtualRange.topPad}px` }"
          role="presentation"
          aria-hidden="true"
        />

        <!-- Body rows -->
        <template v-for="(row, localIdx) in bodyRows" :key="String(row.id)">
          <div
            :class="rowClassFor(row, rowIndexOffset + localIdx) || undefined"
            role="row"
            :data-sg-virtual-row-index="virtualRange ? rowIndexOffset + localIdx : undefined"
            style="display: contents"
            @click="handleRowClick(row)"
          >
            <!-- Expand cell -->
            <div v-if="expandable" class="sg-table-td sg-table-cell-expand" role="cell" @click.stop>
              <button
                v-if="isRowExpandable(row.data)"
                type="button"
                class="sg-table-expand-btn"
                :class="{ 'sg-table-expand-open': expandedSet.has(row.id) }"
                :aria-expanded="expandedSet.has(row.id)"
                :aria-label="expandedSet.has(row.id) ? 'Collapse row' : 'Expand row'"
                @click="toggleExpand(row.id)"
              >
                {{ localeFull.expandIcon }}
              </button>
            </div>

            <!-- Selection cell -->
            <div
              v-if="rowSelection"
              class="sg-table-td sg-table-cell-selection"
              role="cell"
              @click.stop
            >
              <SgCheckbox
                v-if="rowSelection.type !== 'radio'"
                :checked="selectedSet.has(row.id)"
                :aria-label="`Select row ${String(row.id)}`"
                @change="() => toggleRowSelected(row.id)"
              />
              <input
                v-else
                type="radio"
                class="sg-table-row-radio"
                :checked="selectedSet.has(row.id)"
                name="sg-table-row-radio"
                :aria-label="`Select row ${String(row.id)}`"
                @change="() => toggleRowSelected(row.id)"
              />
            </div>

            <!-- Data cells -->
            <div
              v-for="(col, cIdx) in columns"
              :key="col.key"
              :class="
                [
                  'sg-table-td',
                  col.fixed ? 'sg-table-cell-fixed' : '',
                  col.fixed ? `sg-table-cell-fixed-${col.fixed}` : '',
                  col.editable ? 'sg-table-td-editable' : '',
                  sCls.bodyCell,
                ]
                  .filter(Boolean)
                  .join(' ') || undefined
              "
              :style="{
                ...fixedStyle(col),
                ...(cIdx === 0 && tree && row.depth > 0
                  ? { paddingLeft: `${row.depth * treeIndent + 8}px` }
                  : {}),
                ...(sSty.bodyCell ?? {}),
              }"
              role="cell"
              @dblclick="
                col.editable && onCellEdit ? startEdit(row.id, col.key, row.data[col.key]) : null
              "
            >
              <!-- Tree expand toggle (first data column only) -->
              <button
                v-if="cIdx === 0 && tree && row.hasChildren"
                type="button"
                class="sg-table-expand-btn"
                :class="{ 'sg-table-expand-open': treeExpanded.has(row.id) }"
                :aria-label="treeExpanded.has(row.id) ? 'Collapse' : 'Expand'"
                @click.stop="toggleTreeRow(row.id)"
              >
                {{ localeFull.expandIcon }}
              </button>

              <span
                v-if="editingCell && editingCell.id === row.id && editingCell.key === col.key"
                class="sg-table-cell-content"
                @click.stop
              >
                <input
                  v-model="editingValue"
                  class="sg-table-edit-input"
                  @keydown.enter="commitEdit"
                  @keydown.esc="cancelEdit"
                  @blur="commitEdit"
                />
              </span>
              <span v-else class="sg-table-cell-content">
                <slot
                  name="cell"
                  :column="col"
                  :row="row.data"
                  :id="row.id"
                  :value="row.data[col.key]"
                >
                  {{ row.data[col.key] }}
                </slot>
              </span>
            </div>
          </div>

          <!-- Expanded row body -->
          <div
            v-if="expandable && expandedSet.has(row.id)"
            class="sg-table-row sg-table-row-expanded-wrapper"
            role="row"
            style="display: contents"
          >
            <div
              class="sg-table-td sg-table-expanded-row"
              :style="{ gridColumn: spacerColumn }"
              role="cell"
            >
              <slot name="expandedRow" :row="row.data" :id="row.id">
                <component :is="expandable.expandedRowRender(row.data, row.id) as any" />
              </slot>
            </div>
          </div>
        </template>

        <!-- Virtual bottom spacer -->
        <div
          v-if="virtualRange && virtualRange.bottomPad > 0"
          :style="{ gridColumn: spacerColumn, height: `${virtualRange.bottomPad}px` }"
          role="presentation"
          aria-hidden="true"
        />

        <!-- Footer (column aggregates) -->
        <div
          v-if="footer && visibleRows.length > 0"
          :class="['sg-table-footer-row', sCls.footer].filter(Boolean).join(' ') || undefined"
          role="row"
          :style="{ display: 'contents', ...(sSty.footer ?? {}) }"
        >
          <div v-if="expandable" class="sg-table-td sg-table-footer-cell" role="cell" />
          <div v-if="rowSelection" class="sg-table-td sg-table-footer-cell" role="cell" />
          <div
            v-for="col in columns"
            :key="`f-${col.key}`"
            class="sg-table-td sg-table-footer-cell"
            role="cell"
            :style="fixedStyle(col)"
          >
            <span v-if="col.aggregate" class="sg-table-aggregate-value">{{
              aggregateValue(col)
            }}</span>
          </div>
        </div>

        <!-- Summary rows (custom) -->
        <template v-for="(srow, srIdx) in summaryRows" :key="`sum-${srIdx}`">
          <div class="sg-table-summary-row" role="row" style="display: contents">
            <div v-if="expandable" class="sg-table-td sg-table-summary-cell" role="cell" />
            <div v-if="rowSelection" class="sg-table-td sg-table-summary-cell" role="cell" />
            <div
              v-for="(scell, sIdx) in srow"
              :key="`sc-${srIdx}-${sIdx}`"
              class="sg-table-td sg-table-summary-cell"
              role="cell"
              :style="{
                ...(scell.colSpan && scell.colSpan > 1
                  ? { gridColumn: `span ${scell.colSpan}` }
                  : {}),
                ...(scell.align ? { textAlign: scell.align } : {}),
              }"
            >
              <component
                :is="scell.content as any"
                v-if="scell.content && typeof scell.content === 'object'"
              />
              <template v-else>{{ scell.content }}</template>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Loading overlay -->
    <div v-if="loading && !unstyled" class="sg-table-loading-mask" role="status" aria-live="polite">
      <SgSpin size="large" :aria-label="localeFull.loadingText" />
    </div>

    <!-- Pagination -->
    <div
      v-if="showPagination && totalPages > 1 && !virtualConfig"
      :class="['sg-table-pagination', sCls.pagination].filter(Boolean).join(' ') || undefined"
      :style="sSty.pagination"
    >
      <span class="sg-table-pagination-total">
        {{ localeFull.totalRows(tableState.totalRows) }}
      </span>
      <SgPagination
        class="sg-table-pagination-controls"
        :current="tableState.page"
        :total="tableState.totalRows"
        :page-size="pageSize ?? tableState.totalRows"
        @change="gotoPage"
      />
    </div>
  </div>
</template>
