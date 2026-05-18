export type RowId = string

export type SortDirection = 'asc' | 'desc'

export interface SortConfig {
  column: string
  direction: SortDirection
}

export type FilterFn = (row: Record<string, unknown>) => boolean

/**
 * Расширенный набор операторов фильтрации.
 *  - `eq`/`neq` — строгое равенство.
 *  - `lt`/`lte`/`gt`/`gte` — числовое сравнение (string работает по `<`/`>`).
 *  - `between` — числовой диапазон, `value: [min, max]` (включительно).
 *  - `in`/`notIn` — `value: unknown[]`.
 *  - `contains`/`startsWith`/`endsWith` — строковые операторы (case-insensitive).
 *  - `isEmpty`/`isNotEmpty` — проверка `null` / `undefined` / `''`.
 */
export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'lt'
  | 'lte'
  | 'gt'
  | 'gte'
  | 'between'
  | 'in'
  | 'notIn'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'isEmpty'
  | 'isNotEmpty'

/**
 * Самодостаточный фильтр без привязки к колонке. Используется в новом
 * `TableEngine.setColumnFilter` рядом со старым `ColumnFilter`.
 */
export interface AdvancedFilter {
  /** Оператор сравнения. */
  op: FilterOperator
  /**
   * Значение для оператора. Семантика зависит от `op`:
   *  - `between` — кортеж `[min, max]`.
   *  - `in` / `notIn` — массив значений.
   *  - `isEmpty` / `isNotEmpty` — игнорируется.
   *  - остальные — скалярное значение.
   */
  value?: unknown
}

/**
 * Старая форма фильтра колонки. Сохраняем для backward-compat:
 *  - если `operator` не задан и `value` — массив, поведение `in`;
 *  - если `operator` не задан и `value` — скаляр, поведение `eq`.
 */
export interface ColumnFilter {
  column: string
  value?: unknown
  operator?: FilterOperator
}

/** Тип встроенной агрегации для группового заголовка / футера таблицы. */
export type AggregateType = 'sum' | 'avg' | 'min' | 'max' | 'count'

/** Кастомная функция агрегации — получает массив значений колонки в группе. */
export type AggregateFn = (values: unknown[]) => unknown

/** Описание агрегации одной колонки. */
export interface ColumnAggregate {
  column: string
  type: AggregateType | AggregateFn
}

/** Запись группы, которую возвращает `TableEngine.getGroups()`. */
export interface TableGroup {
  /** Стабильный строковый ключ (stringified `value`). */
  key: string
  /** Сырая величина группировочного поля. */
  value: unknown
  /** Идентификаторы строк внутри группы (после применения фильтров и сортировки). */
  rows: RowId[]
  /** Посчитанные агрегаты `columnKey → value`. Пусто, если агрегации не заданы. */
  aggregates: Record<string, unknown>
}

export interface ExportOptions {
  allRows?: boolean
  columns?: string[]
  headers?: boolean
}

export interface TableState {
  totalRows: number
  filteredRows: number
  page: number
  pageSize: number
  totalPages: number
  sorts: SortConfig[]
  filters: ColumnFilter[]
  /** @deprecated Use sorts[0] instead */
  sort: SortConfig | null
  /** Поле, по которому сейчас группируется таблица, либо `null`. */
  groupBy: string | null
  /** Количество групп после применения текущего `groupBy`. */
  groupCount: number
}

export interface TableOptions {
  pageSize?: number
  columns?: string[]
  /**
   * Эстимейт высоты строки в пикселях для virtual rendering.
   * Используется React-адаптером как стартовое значение до того, как
   * `ResizeObserver` сообщит реальную высоту. Принимает данные строки
   * (после фильтрации) и возвращает число.
   */
  estimateRowHeight?: (row: Record<string, unknown>, id: RowId) => number
}

export interface TableEngine {
  addRow(id: RowId, data: Record<string, unknown>): void
  addRows(rows: Array<{ id: RowId; data: Record<string, unknown> }>): void
  removeRow(id: RowId): void
  updateCell(id: RowId, column: string, value: unknown): void
  getRow(id: RowId): Record<string, unknown> | undefined
  getCell(id: RowId, column: string): unknown

  getVisibleRows(): Array<{ id: RowId; data: Record<string, unknown> }>
  getAllRowIds(): RowId[]
  getAllRows(): Array<{ id: RowId; data: Record<string, unknown> }>

  setSort(column: string, direction: SortDirection, append?: boolean): void
  setSorts(sorts: SortConfig[]): void
  clearSort(): void

  addFilter(filter: ColumnFilter): void
  removeFilter(column: string): void
  clearFilters(): void
  setFilterFn(fn: FilterFn | null): void

  /**
   * Устанавливает фильтр для колонки. Принимает как новый
   * `AdvancedFilter` (только `op` + `value`), так и старый `ColumnFilter`
   * (с уже заданным `column`). При передаче `null` — снимает фильтр.
   */
  setColumnFilter(column: string, filter: AdvancedFilter | ColumnFilter | null): void

  setPage(page: number): void
  setPageSize(size: number): void
  nextPage(): void
  prevPage(): void

  moveRow(fromIndex: number, toIndex: number): void
  moveRows(ids: RowId[], toIndex: number): void

  /** Pin a column to a side, or unpin (`side = null`). */
  pinColumn(column: string, side: 'left' | 'right' | null): void
  /** Snapshot of currently pinned columns. */
  getPinnedColumns(): { left: string[]; right: string[] }
  /** Drop all pin assignments. */
  clearPinned(): void

  /**
   * Persist a column's pixel width. Mirrored into the Core store under
   * `$table.<id>.state.columnWidths`, so React adapters can react via
   * `core.subscribe` and so widths survive re-mounts that recreate the
   * engine from a snapshot.
   */
  setColumnWidth(column: string, width: number): void
  /** Get the persisted width for a column, or `undefined` when unset. */
  getColumnWidth(column: string): number | undefined
  /** Snapshot of all persisted column widths (key → px). */
  getColumnWidths(): Record<string, number>
  /** Drop all persisted widths. */
  clearColumnWidths(): void

  getExportData(options?: ExportOptions): string[][]

  getTableState(): TableState

  /**
   * Группирует строки по полю. `null` отключает группировку.
   * Опциональный `aggregates` запоминается до следующего вызова и
   * пересчитывается при изменениях данных / фильтров.
   */
  groupBy(field: string | null, aggregates?: ColumnAggregate[]): void
  /** Снимает группировку (эквивалент `groupBy(null)`). */
  clearGroupBy(): void
  /** Текущее поле группировки или `null`. */
  getGroupBy(): string | null
  /** Снимок групп после применения фильтров / сортировки. */
  getGroups(): TableGroup[]

  /**
   * Эстимейт высоты строки, если в `TableOptions.estimateRowHeight` была
   * передана функция. Возвращает `null`, если функция не задана либо строка
   * не найдена. Используется React-адаптером для инициализации виртуального
   * движка с динамическими высотами.
   */
  getEstimatedRowHeight(id: RowId): number | null

  reset(): void
}
