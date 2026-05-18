import type {
  AdvancedFilter,
  AggregateFn,
  AggregateType,
  ColumnFilter,
  FilterOperator,
} from './types'

/**
 * Возвращает финальный оператор фильтра. Соблюдаем backward-compat:
 * если оператор не задан, и `value` — массив, считаем фильтр `in`,
 * иначе — `eq`.
 */
export function resolveOperator(
  filter: AdvancedFilter | ColumnFilter,
): FilterOperator {
  const adv = filter as AdvancedFilter
  if (adv.op != null) return adv.op
  const col = filter as ColumnFilter
  if (col.operator != null) return col.operator
  return Array.isArray(filter.value) ? 'in' : 'eq'
}

/** Проверка пустоты для `isEmpty` / `isNotEmpty`. */
function isEmptyValue(val: unknown): boolean {
  return val == null || val === ''
}

/** Числовое сравнение с защитой от NaN. */
function asNumberPair(a: unknown, b: unknown): [number, number] | null {
  const na = typeof a === 'number' ? a : Number(a)
  const nb = typeof b === 'number' ? b : Number(b)
  if (Number.isNaN(na) || Number.isNaN(nb)) return null
  return [na, nb]
}

/**
 * Проверяет, проходит ли значение `val` фильтр (`op` + `filterValue`).
 * Используется как для `ColumnFilter`, так и для `AdvancedFilter`.
 */
export function matchesOperator(
  val: unknown,
  op: FilterOperator,
  filterValue: unknown,
): boolean {
  switch (op) {
    case 'eq':
      return val === filterValue
    case 'neq':
      return val !== filterValue

    case 'lt':
    case 'lte':
    case 'gt':
    case 'gte': {
      const pair = asNumberPair(val, filterValue)
      if (!pair) return false
      const [a, b] = pair
      if (op === 'lt') return a < b
      if (op === 'lte') return a <= b
      if (op === 'gt') return a > b
      return a >= b
    }

    case 'between': {
      if (!Array.isArray(filterValue) || filterValue.length !== 2) return false
      const minPair = asNumberPair(val, filterValue[0])
      const maxPair = asNumberPair(val, filterValue[1])
      if (!minPair || !maxPair) return false
      return minPair[0] >= minPair[1] && maxPair[0] <= maxPair[1]
    }

    case 'in':
      return Array.isArray(filterValue) && filterValue.includes(val)
    case 'notIn':
      return Array.isArray(filterValue) && !filterValue.includes(val)

    case 'contains':
      if (typeof val !== 'string') return false
      return val.toLowerCase().includes(String(filterValue ?? '').toLowerCase())
    case 'startsWith':
      if (typeof val !== 'string') return false
      return val.toLowerCase().startsWith(String(filterValue ?? '').toLowerCase())
    case 'endsWith':
      if (typeof val !== 'string') return false
      return val.toLowerCase().endsWith(String(filterValue ?? '').toLowerCase())

    case 'isEmpty':
      return isEmptyValue(val)
    case 'isNotEmpty':
      return !isEmptyValue(val)
  }
}

/**
 * Применяет `ColumnFilter` к строке (по `filter.column`).
 * Точка входа из движка таблицы.
 */
export function matchesColumnFilter(
  row: Record<string, unknown>,
  filter: ColumnFilter,
): boolean {
  const op = resolveOperator(filter)
  return matchesOperator(row[filter.column], op, filter.value)
}

/** Считает встроенную агрегацию для массива значений. */
export function computeAggregate(
  values: unknown[],
  type: AggregateType | AggregateFn,
): unknown {
  if (typeof type === 'function') return type(values)

  if (type === 'count') return values.length

  const nums: number[] = []
  for (const v of values) {
    if (v == null || v === '') continue
    const n = typeof v === 'number' ? v : Number(v)
    if (!Number.isNaN(n)) nums.push(n)
  }
  if (nums.length === 0) return null

  switch (type) {
    case 'sum':
      return nums.reduce((a, b) => a + b, 0)
    case 'avg':
      return nums.reduce((a, b) => a + b, 0) / nums.length
    case 'min':
      return Math.min(...nums)
    case 'max':
      return Math.max(...nums)
  }
}
