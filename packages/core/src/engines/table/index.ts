export { createTable } from './TableEngine'
export {
  matchesOperator,
  matchesColumnFilter,
  resolveOperator,
  computeAggregate,
} from './filter'
export type {
  TableEngine,
  TableState,
  TableOptions,
  ExportOptions,
  RowId,
  SortConfig,
  SortDirection,
  ColumnFilter,
  FilterFn,
  FilterOperator,
  AdvancedFilter,
  AggregateType,
  AggregateFn,
  ColumnAggregate,
  TableGroup,
} from './types'
