export { createCore } from './Core'
export type { Core, WriteEvent, WriteSource, NextFn, Middleware } from './types'

export {
  loggerMiddleware,
  freezeMiddleware,
  persistenceMiddleware,
  validationMiddleware,
} from './middleware/index'

export type { Validator, ValidationMiddlewareOptions } from './middleware/index'

export { createHistory } from './plugins/history'
export type { HistoryPlugin, HistoryEntry, HistoryOptions } from './plugins/history'

export { createVirtual, createMeasureCache } from './engines/virtual/index'
export type {
  VirtualEngine,
  VirtualEngineOptions,
  VirtualRange,
  VirtualItem,
  VirtualEngineEvent,
  VirtualEngineListener,
  MeasureCache,
  MeasureCacheEvent,
  MeasureCacheListener,
  MeasureCacheOptions,
} from './engines/virtual/index'

export { createTypedCore } from './typed'
export type { TypedCore, Path, PathValue } from './typed'

export { createForm } from './engines/form/index'
export type {
  FormEngine,
  FieldMeta,
  FieldMetaExtensions,
  FormState,
  GetFieldValue,
  Rule,
  RuleFn,
  RuleObject,
  ValidationResult,
  FieldOptions,
  FormOptions,
  ValidationMode,
  FormListOperation,
} from './engines/form/index'

export {
  reservePrefix,
  listReservedPrefixes,
  FORM_META_PREFIX,
  TABLE_PREFIX,
  TREE_PREFIX,
  GRAPH_PREFIX,
  CALENDAR_PREFIX,
} from './engines/namespaces'

export {
  createGraph,
  routeOrthogonal,
  pointsToPath,
  pointsToRoundedPath,
  getBezierPath,
  nearestSide,
  inferSide,
  floatingAnchor,
  getNodeIntersection,
  getEdgePosition,
  resolveEdgeEndpoint,
  aabbFromOBB,
  obbCorners,
  obbContainsPoint,
} from './engines/graph/index'
export type {
  AABB,
  Anchor,
  AnchorId,
  AnchorPolicy,
  EdgeEndpoint,
  EdgeId,
  EdgeInit,
  GraphEdge,
  GraphEngine,
  GraphEngineOptions,
  GraphNode,
  GraphState,
  NodeId,
  NodeInit,
  NodeTransform,
  NodeUpdate,
  OBB,
  Outline,
  Point,
  ResolvedEndpoint,
  RouteOrthogonalOptions,
  BezierPathOptions,
  Side,
} from './engines/graph/index'

export {
  createTable,
  matchesOperator,
  matchesColumnFilter,
  resolveOperator,
  computeAggregate,
} from './engines/table/index'
export type {
  TableEngine,
  TableState,
  TableOptions,
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
} from './engines/table/index'

export { createTree } from './engines/tree/index'
export type {
  TreeEngine,
  TreeState,
  TreeEngineOptions,
  TreeKey,
  TreeNodeData,
  TreeFieldNames,
} from './engines/tree/index'

export { createCalendar, detectConflicts, isAvailable } from './engines/calendar/index'
export type {
  Assignment as CalendarAssignment,
  AssignmentStatus as CalendarAssignmentStatus,
  AvailabilityRule as CalendarAvailabilityRule,
  CalendarEngine,
  CalendarEngineOptions,
  CalendarScale,
  CalendarState,
  Conflict as CalendarConflict,
  ConflictReason as CalendarConflictReason,
  DayOfWeek as CalendarDayOfWeek,
  DetectConflictsOptions as CalendarDetectConflictsOptions,
  Resource as CalendarResource,
} from './engines/calendar/index'
