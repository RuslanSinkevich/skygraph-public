import type { Core } from '../../types'
import type {
  AdvancedFilter,
  ColumnAggregate,
  ColumnFilter,
  ExportOptions,
  FilterFn,
  RowId,
  SortConfig,
  SortDirection,
  TableEngine,
  TableGroup,
  TableOptions,
  TableState,
} from './types'

import { TABLE_PREFIX } from '../namespaces'
import { computeAggregate, matchesColumnFilter } from './filter'

function statePath(tableId: string, key: string): string {
  return `${TABLE_PREFIX}${tableId}.state.${key}`
}

let tableCounter = 0

/**
 * `createTable` строит TableEngine поверх Core. Пользовательские данные строк
 * хранятся в private замыкании (`dataById`/`keysById`), а в Core попадают
 * только пути `$table.<id>.state.*` (агрегированные счётчики, ширины колонок,
 * пин-конфиг). Это держит `addRows(100k)` на масштабе O(N) Map.set вместо
 * O(N × cols) `core.set` (исторический паттерн `byId.<rid>.<col>` создавал
 * сотни тысяч узлов в Store и аллокаций Set/Map в `Core.set` на каждую
 * cell-запись — см. `docs/_streams/findings/T-Table-Perf.md` H1).
 *
 * Семантика публичных методов `getRow`/`getCell`/`getVisibleRows` сохранена.
 * Внешние подписки на `$table.<id>.state.*` пути продолжают работать;
 * подписок на `byId.*` в монорепе нет (они никогда не были задокументированы).
 */
export function createTable(core: Core, options?: TableOptions): TableEngine {
  const tableId = `t${tableCounter++}`
  let currentPageSize = options?.pageSize ?? 50

  let order: RowId[] = []
  let filteredOrder: RowId[] = []
  let sorts: SortConfig[] = []
  let filters: ColumnFilter[] = []
  let customFilterFn: FilterFn | null = null
  let page = 1
  let pinnedLeft: string[] = []
  let pinnedRight: string[] = []
  let columnWidths: Record<string, number> = {}

  // Группировка
  let groupByField: string | null = null
  let columnAggregates: ColumnAggregate[] = []
  let groups: TableGroup[] = []

  // Private storage: данные строк живут в замыкании, не в Core store.
  // Это устраняет 800k `core.set` per-cell на 100k×7 датасете и убирает
  // основной источник аллокаций (Store-узлы + Set/Map в `Core.set`).
  const dataById = new Map<RowId, Record<string, unknown>>()
  const keysById = new Map<RowId, string[]>()

  function getRowData(id: RowId): Record<string, unknown> | undefined {
    const stored = dataById.get(id)
    if (!stored) return undefined

    // Если пользователь передал явный whitelist колонок через
    // `TableOptions.columns`, отдаём отфильтрованную копию (исторический
    // контракт). В типичном кейсе (опция не задана) — возвращаем хранимую
    // ссылку без копии: hot path `compareBySort`/`recomputeFiltered`/render
    // не должны платить за per-row allocation.
    if (options?.columns) {
      const filtered: Record<string, unknown> = {}
      for (const col of options.columns) {
        filtered[col] = stored[col]
      }
      return filtered
    }
    return stored
  }

  function matchesFilters(rowData: Record<string, unknown>): boolean {
    if (customFilterFn && !customFilterFn(rowData)) return false

    for (const f of filters) {
      if (!matchesColumnFilter(rowData, f)) return false
    }
    return true
  }

  function compareBySort(a: RowId, b: RowId): number {
    const aData = getRowData(a)
    const bData = getRowData(b)

    for (const s of sorts) {
      const aVal = aData?.[s.column]
      const bVal = bData?.[s.column]

      if (aVal === bVal) continue
      if (aVal === undefined || aVal === null) return 1
      if (bVal === undefined || bVal === null) return -1

      const cmp = aVal < bVal ? -1 : 1
      return s.direction === 'asc' ? cmp : -cmp
    }
    return 0
  }

  function recomputeFiltered(): void {
    if (filters.length === 0 && !customFilterFn) {
      filteredOrder = [...order]
    } else {
      filteredOrder = order.filter((id) => {
        const data = getRowData(id)
        return data ? matchesFilters(data) : false
      })
    }

    if (sorts.length > 0) {
      filteredOrder.sort(compareBySort)
    }

    const totalPages = Math.max(1, Math.ceil(filteredOrder.length / currentPageSize))
    if (page > totalPages) page = totalPages

    recomputeGroups()
    publishState()
  }

  function recomputeGroups(): void {
    if (!groupByField) {
      groups = []
      return
    }

    const map = new Map<string, { value: unknown; rows: RowId[] }>()
    const orderKeys: string[] = []

    for (const id of filteredOrder) {
      const data = getRowData(id)
      if (!data) continue
      const raw = data[groupByField]
      const key = raw == null ? '__null__' : String(raw)
      if (!map.has(key)) {
        map.set(key, { value: raw, rows: [] })
        orderKeys.push(key)
      }
      map.get(key)!.rows.push(id)
    }

    groups = orderKeys.map((key) => {
      const { value, rows } = map.get(key)!
      const aggregates: Record<string, unknown> = {}
      for (const agg of columnAggregates) {
        const values = rows.map((id) => dataById.get(id)?.[agg.column])
        aggregates[agg.column] = computeAggregate(values, agg.type)
      }
      return { key, value, rows, aggregates }
    })
  }

  function publishState(): void {
    const totalPages = Math.max(1, Math.ceil(filteredOrder.length / currentPageSize))
    core.set(statePath(tableId, 'totalRows'), order.length)
    core.set(statePath(tableId, 'filteredRows'), filteredOrder.length)
    core.set(statePath(tableId, 'page'), page)
    core.set(statePath(tableId, 'pageSize'), currentPageSize)
    core.set(statePath(tableId, 'totalPages'), totalPages)
    core.set(statePath(tableId, 'groupBy'), groupByField)
    core.set(statePath(tableId, 'groupCount'), groups.length)
  }

  function getColumnKeys(): string[] {
    if (options?.columns) return options.columns
    if (order.length === 0) return []
    const firstId = order[0]
    return keysById.get(firstId) ?? []
  }

  /** Привести `AdvancedFilter | ColumnFilter` к единому `ColumnFilter`. */
  function toColumnFilter(column: string, filter: AdvancedFilter | ColumnFilter): ColumnFilter {
    const adv = filter as AdvancedFilter
    if (adv.op != null) {
      return { column, operator: adv.op, value: adv.value }
    }
    const cf = filter as ColumnFilter
    return { column, operator: cf.operator, value: cf.value }
  }

  const table: TableEngine = {
    addRow(id: RowId, data: Record<string, unknown>): void {
      dataById.set(id, data)
      keysById.set(id, Object.keys(data))
      order.push(id)
      recomputeFiltered()
    },

    addRows(rows: Array<{ id: RowId; data: Record<string, unknown> }>): void {
      // Single Map.set per row instead of (cols + 1) `core.set` per row —
      // на 100k×7 это разница 800k vs 100k операций и убирает
      // основной источник аллокаций. См. `findings/T-Table-Perf.md` H1.
      for (const row of rows) {
        dataById.set(row.id, row.data)
        keysById.set(row.id, Object.keys(row.data))
        order.push(row.id)
      }
      recomputeFiltered()
    },

    removeRow(id: RowId): void {
      const idx = order.indexOf(id)
      if (idx === -1) return
      order.splice(idx, 1)
      dataById.delete(id)
      keysById.delete(id)
      recomputeFiltered()
    },

    updateCell(id: RowId, column: string, value: unknown): void {
      const row = dataById.get(id)
      if (!row) return
      // Мутация хранимого объекта. `getRow` отдаёт эту же ссылку (см. контракт
      // в JSDoc к `createTable`), `recomputeFiltered` снизу пересоберёт сорт/
      // группы как раньше.
      row[column] = value
      const keys = keysById.get(id)
      if (keys && !keys.includes(column)) {
        keys.push(column)
      }
      recomputeFiltered()
    },

    getRow(id: RowId): Record<string, unknown> | undefined {
      return getRowData(id)
    },

    getCell(id: RowId, column: string): unknown {
      return dataById.get(id)?.[column]
    },

    getVisibleRows(): Array<{ id: RowId; data: Record<string, unknown> }> {
      const start = (page - 1) * currentPageSize
      const end = start + currentPageSize
      const slice = filteredOrder.slice(start, end)
      const out = new Array(slice.length) as Array<{
        id: RowId
        data: Record<string, unknown>
      }>
      for (let i = 0; i < slice.length; i++) {
        const id = slice[i]
        out[i] = { id, data: getRowData(id) ?? {} }
      }
      return out
    },

    getAllRowIds(): RowId[] {
      return [...order]
    },

    getAllRows(): Array<{ id: RowId; data: Record<string, unknown> }> {
      const out = new Array(filteredOrder.length) as Array<{
        id: RowId
        data: Record<string, unknown>
      }>
      for (let i = 0; i < filteredOrder.length; i++) {
        const id = filteredOrder[i]
        out[i] = { id, data: getRowData(id) ?? {} }
      }
      return out
    },

    setSort(column: string, direction: SortDirection, append?: boolean): void {
      if (append) {
        sorts = sorts.filter((s) => s.column !== column)
        sorts.push({ column, direction })
      } else {
        sorts = [{ column, direction }]
      }
      recomputeFiltered()
    },

    setSorts(newSorts: SortConfig[]): void {
      sorts = [...newSorts]
      recomputeFiltered()
    },

    clearSort(): void {
      sorts = []
      recomputeFiltered()
    },

    addFilter(filter: ColumnFilter): void {
      filters = filters.filter((f) => f.column !== filter.column)
      filters.push(filter)
      page = 1
      recomputeFiltered()
    },

    removeFilter(column: string): void {
      filters = filters.filter((f) => f.column !== column)
      recomputeFiltered()
    },

    clearFilters(): void {
      filters = []
      customFilterFn = null
      recomputeFiltered()
    },

    setFilterFn(fn: FilterFn | null): void {
      customFilterFn = fn
      recomputeFiltered()
    },

    setColumnFilter(column, filter): void {
      filters = filters.filter((f) => f.column !== column)
      if (filter !== null) {
        filters.push(toColumnFilter(column, filter))
      }
      page = 1
      recomputeFiltered()
    },

    setPage(p: number): void {
      const totalPages = Math.max(1, Math.ceil(filteredOrder.length / currentPageSize))
      page = Math.max(1, Math.min(p, totalPages))
      publishState()
    },

    setPageSize(size: number): void {
      currentPageSize = size
      page = 1
      recomputeFiltered()
    },

    nextPage(): void {
      table.setPage(page + 1)
    },

    prevPage(): void {
      table.setPage(page - 1)
    },

    moveRow(fromIndex: number, toIndex: number): void {
      if (fromIndex < 0 || fromIndex >= order.length) return
      if (toIndex < 0 || toIndex >= order.length) return
      if (fromIndex === toIndex) return

      const [item] = order.splice(fromIndex, 1)
      order.splice(toIndex, 0, item)
      recomputeFiltered()
    },

    pinColumn(column: string, side: 'left' | 'right' | null): void {
      pinnedLeft = pinnedLeft.filter((c) => c !== column)
      pinnedRight = pinnedRight.filter((c) => c !== column)
      if (side === 'left') pinnedLeft.push(column)
      else if (side === 'right') pinnedRight.push(column)
      core.set(statePath(tableId, 'pinnedLeft'), [...pinnedLeft])
      core.set(statePath(tableId, 'pinnedRight'), [...pinnedRight])
    },

    getPinnedColumns(): { left: string[]; right: string[] } {
      return { left: [...pinnedLeft], right: [...pinnedRight] }
    },

    clearPinned(): void {
      pinnedLeft = []
      pinnedRight = []
      core.set(statePath(tableId, 'pinnedLeft'), [])
      core.set(statePath(tableId, 'pinnedRight'), [])
    },

    setColumnWidth(column: string, width: number): void {
      columnWidths = { ...columnWidths, [column]: width }
      core.set(statePath(tableId, 'columnWidths'), { ...columnWidths })
    },

    getColumnWidth(column: string): number | undefined {
      return columnWidths[column]
    },

    getColumnWidths(): Record<string, number> {
      return { ...columnWidths }
    },

    clearColumnWidths(): void {
      columnWidths = {}
      core.set(statePath(tableId, 'columnWidths'), {})
    },

    moveRows(ids: RowId[], toIndex: number): void {
      const items = ids
        .map((id) => {
          const idx = order.indexOf(id)
          return { id, idx }
        })
        .filter((x) => x.idx !== -1)

      if (items.length === 0) return

      const idsSet = new Set(ids)
      const remaining = order.filter((id) => !idsSet.has(id))
      const clamped = Math.max(0, Math.min(toIndex, remaining.length))
      remaining.splice(clamped, 0, ...items.map((x) => x.id))
      order = remaining
      recomputeFiltered()
    },

    getExportData(exportOptions?: ExportOptions): string[][] {
      const cols = exportOptions?.columns ?? getColumnKeys()
      const result: string[][] = []

      if (exportOptions?.headers !== false) {
        result.push(cols)
      }

      const sourceIds = exportOptions?.allRows
        ? filteredOrder
        : filteredOrder.slice(
            (page - 1) * currentPageSize,
            (page - 1) * currentPageSize + currentPageSize,
          )

      for (const id of sourceIds) {
        const data = getRowData(id)
        if (!data) continue
        result.push(
          cols.map((col) => {
            const v = data[col]
            return v == null ? '' : String(v)
          }),
        )
      }

      return result
    },

    getTableState(): TableState {
      const totalPages = Math.max(1, Math.ceil(filteredOrder.length / currentPageSize))
      return {
        totalRows: order.length,
        filteredRows: filteredOrder.length,
        page,
        pageSize: currentPageSize,
        totalPages,
        sorts: [...sorts],
        sort: sorts.length > 0 ? sorts[0] : null,
        filters: [...filters],
        groupBy: groupByField,
        groupCount: groups.length,
      }
    },

    groupBy(field, aggregates): void {
      groupByField = field ?? null
      columnAggregates = aggregates ? [...aggregates] : []
      recomputeGroups()
      publishState()
    },

    clearGroupBy(): void {
      groupByField = null
      columnAggregates = []
      groups = []
      publishState()
    },

    getGroupBy(): string | null {
      return groupByField
    },

    getGroups(): TableGroup[] {
      return groups.map((g) => ({
        key: g.key,
        value: g.value,
        rows: [...g.rows],
        aggregates: { ...g.aggregates },
      }))
    },

    getEstimatedRowHeight(id: RowId): number | null {
      const fn = options?.estimateRowHeight
      if (!fn) return null
      const data = getRowData(id)
      if (!data) return null
      const v = fn(data, id)
      return Number.isFinite(v) ? v : null
    },

    reset(): void {
      order = []
      filteredOrder = []
      sorts = []
      filters = []
      customFilterFn = null
      page = 1
      pinnedLeft = []
      pinnedRight = []
      columnWidths = {}
      groupByField = null
      columnAggregates = []
      groups = []
      dataById.clear()
      keysById.clear()
      core.set(statePath(tableId, 'columnWidths'), {})
      publishState()
    },
  }

  // Initial publish — emit empty `columnWidths` so subscribers can read a
  // stable shape from the store without needing to handle `undefined`.
  core.set(statePath(tableId, 'columnWidths'), {})
  publishState()
  return table
}
