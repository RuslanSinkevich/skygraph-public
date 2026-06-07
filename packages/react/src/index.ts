// Common types
export type { SizeType, BaseComponentProps, InteractiveProps, SizableProps } from './types'
export type {
  SgLocale,
  PaginationLocale,
  ModalLocale,
  PopconfirmLocale,
  EmptyLocale,
  FormLocale,
  UploadLocale,
  TransferLocale,
  InputLocale,
  InputPasswordLocale,
  SearchInputLocale,
  InlineEditLocale,
  TagInputLocale,
  DrawerLocale,
  NotificationLocale,
  TagLocale,
  SpinLocale,
  SkeletonLocale,
  BreadcrumbLocale,
  CarouselLocale,
  RateLocale,
  ChartsLocale,
  DatePickerLocale,
  CascaderLocale,
  TreeSelectLocale,
  DashboardLocale,
  GanttLocale,
  ResourceCalendarLocale,
  TimelineLocale,
  SchemaFormEditorLocale,
} from './types'

// ConfigProvider
export {
  ConfigProvider,
  useConfig,
  useConfigWithDefaults,
  buildThemeVars,
} from './components/ConfigProvider'
export type {
  SgConfig,
  ConfigProviderProps,
  ThemeConfig,
  SgThemeToken,
  CSPConfig,
  RenderEmptyHandler,
  Direction,
} from './components/ConfigProvider'

// Locale presets
export { en_US, ru_RU, zh_CN, de_DE, fr_FR, es_ES } from './locales'

// Hooks
export { useField } from './hooks/useField'
export type { UseFieldReturn } from './hooks/useField'
export { useForm } from './hooks/useForm'
export type { UseFormOptions, UseFormReturn } from './hooks/useForm'
export { useComputed } from './hooks/useComputed'

// Complex components (use core)
export { Form } from './components/complex/Form'
export type { FormProps } from './components/complex/Form'
export { Field } from './components/complex/Field'
export type { FieldProps } from './components/complex/Field'
export { SubmitButton } from './components/complex/SubmitButton'
export type { SubmitButtonProps } from './components/complex/SubmitButton'
export { FormContext, useFormContext } from './components/complex/FormContext'
export { FormList } from './components/complex/FormList'
export type { FormListProps } from './components/complex/FormList'
export { useWatch } from './hooks/useWatch'
export { Table } from './components/complex/Table'
export type {
  TableProps,
  TableColumn,
  TableRef,
  RowSelectionConfig,
  ExpandableConfig,
  TreeConfig,
  SummaryCell,
  CellSpan,
  TableLocale,
  FilterDropdownProps,
  AggregateType,
  RowNumberConfig,
  PinnedRowsConfig,
  GroupRow,
  SelectionSummaryAction,
  HeaderCell,
  FlatRow,
} from './components/complex/Table'
export type { RowId, SortConfig, SortDirection, ColumnFilter, FilterFn } from '@skygraph/core'
export { useTable } from './hooks/useTable'
export type { UseTableOptions, UseTableReturn } from './hooks/useTable'

export { Tree } from './components/complex/Tree'
export type {
  TreeProps,
  TreeKey,
  TreeNodeData,
  TreeFieldNames,
  TreeLocale,
  TreeNodeStatus,
  TreeNodeAction,
  CheckInfo,
  SelectInfo,
  ExpandInfo,
  DragInfo,
  DropInfo,
  EditInfo,
} from './components/complex/Tree'
export { useTree } from './hooks/useTree'
export type { UseTreeOptions, UseTreeReturn } from './hooks/useTree'

// TreeSelect — single export from the complex (core-backed) implementation.
// The legacy ui-only `TreeSelect` (and its `TreeSelectNode` type alias) was
// removed in tab C round 9; consumers must use `TreeNodeData` from
// `@skygraph/core` (re-exported above from `./components/complex/Tree`).
export { TreeSelect } from './components/complex/TreeSelect'
export type { TreeSelectProps } from './components/complex/TreeSelect'
export { Cascader } from './components/complex/Cascader'
export type { CascaderProps, CascaderOption } from './components/complex/Cascader'
// Calendar lives in components/complex/ (uses core indirectly via state hooks).
// The previous ui/Calendar.tsx was a re-export shim that violated the
// "ui/ has no core" boundary; we now export directly from complex.
export { Calendar } from './components/complex/Calendar'
export type {
  CalendarProps,
  CalendarLocale,
  CalendarHeaderInfo,
  CalendarCellInfo,
  CalendarEvent,
} from './components/complex/Calendar'

// UI components (pure React, no core)
export { Spin } from './components/ui/Spin'
export type { SpinProps } from './components/ui/Spin'
export { Button } from './components/ui/Button'
export type { ButtonProps } from './components/ui/Button'
export { Input } from './components/ui/Input'
export type { InputProps } from './components/ui/Input'
export { Modal } from './components/ui/Modal'
export type { ModalProps } from './components/ui/Modal'
export { Checkbox } from './components/ui/Checkbox'
export type { CheckboxProps } from './components/ui/Checkbox'
export { RadioGroup } from './components/ui/Radio'
export type { RadioGroupProps, RadioOption } from './components/ui/Radio'
export { Switch } from './components/ui/Switch'
export type { SwitchProps } from './components/ui/Switch'
export { Select } from './components/ui/Select'
export type { SelectProps, SelectOption } from './components/ui/Select'
export { Tabs } from './components/ui/Tabs'
export type { TabsProps, TabItem } from './components/ui/Tabs'
export { Tooltip } from './components/ui/Tooltip'
export type { TooltipProps } from './components/ui/Tooltip'
export { Textarea } from './components/ui/Textarea'
export type { TextareaProps } from './components/ui/Textarea'
export { InputNumber } from './components/ui/InputNumber'
export type { InputNumberProps } from './components/ui/InputNumber'
export { DatePicker, RangePicker } from './components/ui/DatePicker'
export type {
  DatePickerProps,
  RangePickerProps,
  PickerMode,
  DatePreset,
  ShowTimeConfig,
} from './components/ui/DatePicker'
export { TimePicker, TimeRangePicker } from './components/ui/TimePicker'
export type { TimePickerProps, TimeRangePickerProps } from './components/ui/TimePicker'
export { AutoComplete } from './components/ui/AutoComplete'
export type { AutoCompleteProps, AutoCompleteOption } from './components/ui/AutoComplete'
export { Slider } from './components/ui/Slider'
export type { SliderProps } from './components/ui/Slider'
export { Rate } from './components/ui/Rate'
export type { RateProps } from './components/ui/Rate'
export { Upload } from './components/ui/Upload'
export type { UploadProps, UploadFile } from './components/ui/Upload'
export { notification, NotificationContainer } from './components/ui/Notification'
export type { NotificationConfig, NotificationContainerProps } from './components/ui/Notification'
export { Drawer } from './components/ui/Drawer'
export type { DrawerProps } from './components/ui/Drawer'
export { Popconfirm } from './components/ui/Popconfirm'
export type { PopconfirmProps } from './components/ui/Popconfirm'
export { Badge } from './components/ui/Badge'
export type { BadgeProps } from './components/ui/Badge'
export { Tag } from './components/ui/Tag'
export type { TagProps } from './components/ui/Tag'
export { Avatar } from './components/ui/Avatar'
export type { AvatarProps } from './components/ui/Avatar'
export { Breadcrumb } from './components/ui/Breadcrumb'
export type { BreadcrumbProps, BreadcrumbItem } from './components/ui/Breadcrumb'
export { Pagination } from './components/ui/Pagination'
export type { PaginationProps } from './components/ui/Pagination'
export { Dropdown } from './components/ui/Dropdown'
export type { DropdownProps, DropdownItem } from './components/ui/Dropdown'
export { Progress } from './components/ui/Progress'
export type { ProgressProps } from './components/ui/Progress'
export { Menu } from './components/ui/Menu'
export type { MenuProps, MenuItem } from './components/ui/Menu'
export { Collapse } from './components/ui/Collapse'
export type { CollapseProps, CollapseItem } from './components/ui/Collapse'
export { ColorPicker } from './components/ui/ColorPicker'
export type { ColorPickerProps } from './components/ui/ColorPicker'
export { Empty } from './components/ui/Empty'
export type { EmptyProps } from './components/ui/Empty'
export { Result } from './components/ui/Result'
export type { ResultProps } from './components/ui/Result'
export { Skeleton } from './components/ui/Skeleton'
export type { SkeletonProps } from './components/ui/Skeleton'
export { Segmented } from './components/ui/Segmented'
export type { SegmentedProps } from './components/ui/Segmented'
export { Steps } from './components/ui/Steps'
export type { StepsProps, StepItem } from './components/ui/Steps'
export { Timeline } from './components/ui/Timeline'
export type { TimelineProps, TimelineItem } from './components/ui/Timeline'
export { Carousel } from './components/ui/Carousel'
export type { CarouselProps } from './components/ui/Carousel'
export { Descriptions } from './components/ui/Descriptions'
export type { DescriptionsProps, DescriptionsItem } from './components/ui/Descriptions'

// Schema Forms
export { useFieldArray } from './hooks/useFieldArray'
export type { UseFieldArrayReturn } from './hooks/useFieldArray'
export { AutoField } from './components/complex/AutoField'
export type { AutoFieldProps, FieldType, AutoFieldOption } from './components/complex/AutoField'
export { zodRule, zodRules, zodDefaults, zodToJsonSchema } from './adapters/zodAdapter'
export type { ZodLikeSchema, ZodObjectLikeSchema, ZodAdapterOptions } from './adapters/zodAdapter'
export {
  jsonSchemaToFields,
  jsonSchemaToRules,
  jsonSchemaToDefaults,
} from './adapters/jsonSchemaAdapter'
export type { JSONSchema, JSONSchemaProperty, AutoFieldConfig } from './adapters/jsonSchemaAdapter'
export { FormProvider, useFormProvider } from './components/complex/FormProvider'
export type { FormProviderProps } from './components/complex/FormProvider'
export { SchemaForm } from './components/complex/SchemaForm'
export type { SchemaFormProps } from './components/complex/SchemaForm'

// SchemaFormEditor — visual builder over SchemaForm.
export {
  SchemaFormEditor,
  SchemaFormEditorPalette,
  SchemaFormEditorCanvas,
  SchemaFormEditorInspector,
  SchemaFormEditorSchemaView,
  useSchemaEditor,
  jsonSchemaToEditorSchema,
  editorSchemaToJsonSchema,
  createEmptyEditorSchema,
  createFieldFromPaletteType,
  DEFAULT_PALETTE_ITEMS,
  PALETTE_DATA_TYPE,
} from './components/complex/SchemaFormEditor'
export type {
  SchemaFormEditorProps,
  SchemaFormEditorPaletteProps,
  SchemaFormEditorCanvasProps,
  SchemaFormEditorInspectorProps,
  SchemaFormEditorSchemaViewProps,
  SchemaEditorStore,
  UseSchemaEditorOptions,
  PaletteItem,
  EditorSchema,
  EditorField,
  EditorAction,
  EditorState,
} from './components/complex/SchemaFormEditor'

// Virtual Scroll
export { useVirtualScroll } from './hooks/useVirtualScroll'
export type { UseVirtualScrollOptions, UseVirtualScrollReturn } from './hooks/useVirtualScroll'
export { VirtualList } from './components/complex/VirtualList/VirtualList'
export type { VirtualListProps, VirtualListRef } from './components/complex/VirtualList/VirtualList'
export type {
  VirtualEngine,
  VirtualEngineOptions,
  VirtualEngineEvent,
  VirtualEngineListener,
  VirtualRange,
  VirtualItem,
  MeasureCache,
  MeasureCacheEvent,
  MeasureCacheListener,
} from '@skygraph/core'
export { createVirtual, createMeasureCache } from '@skygraph/core'

// History / DevTools
export { useHistory } from './hooks/useHistory'
export type { UseHistoryReturn } from './hooks/useHistory'
export { HistoryPanel } from './components/devtools/HistoryPanel'
export type { HistoryPanelProps } from './components/devtools/HistoryPanel'

// Diagram (GraphEngine view)
export { useGraph } from './hooks/useGraph'
export type { UseGraphOptions, UseGraphReturn } from './hooks/useGraph'
export { Diagram } from './components/complex/Diagram'
export type {
  DiagramProps,
  DiagramNodeRenderer,
  DiagramRef,
  DiagramSelectionMode,
  DiagramCanvasContextPoint,
  NodeAction as DiagramNodeAction,
  EdgeAction as DiagramEdgeAction,
} from './components/complex/Diagram'

// Print (Tab L1 — @media print + popup-window helper, no runtime deps)
export { printElement, buildPrintHtml, buildPageRule } from './utils/print'
export type { PrintOptions, PrintableProp } from './utils/print'

// Dashboard (static-layout grid for widgets)
export { Dashboard, DashboardEditor } from './components/complex/Dashboard'
export type {
  DashboardProps,
  DashboardWidget,
  WidgetAction,
  DashboardEditorProps,
  DashboardLayoutChange,
  DashboardLayoutPatch,
  DashboardContextMenuHandler,
  DashboardWidgetContextMenuHandler,
} from './components/complex/Dashboard'

// Gantt (task bars over a discrete time axis)
export { Gantt } from './components/complex/Gantt'
export type {
  GanttProps,
  GanttTask,
  GanttResource,
  GanttScale,
  GanttRange,
} from './components/complex/Gantt'

// ResourceCalendar (shifts / bookings per resource lane with conflict detection)
export { ResourceCalendar } from './components/complex/ResourceCalendar'
export type {
  ResourceCalendarProps,
  Resource,
  Assignment,
  AvailabilityRule,
  CalendarScale,
  Conflict,
} from './components/complex/ResourceCalendar'

// EventTimeline (chronological event stream — distinct from the simpler
// step-based `Timeline` in `components/ui/Timeline.tsx`).
export { EventTimeline } from './components/complex/Timeline'
export type {
  EventTimelineProps,
  TimelineEvent,
  TimelineOrientation,
  TimelineGroupBy,
} from './components/complex/Timeline'

// Charts (SVG primitives + animations + crosshair + brushing + hover toolbar)
export {
  LineChart,
  BarChart,
  AreaChart,
  PieChart,
  ChartLegend,
  ChartCrosshair,
  ChartBrush,
  ChartHoverToolbar,
  defaultChartActions,
  resolveChartActions,
  resolveBrushConfig,
  useChartSize,
  downloadSvg,
  downloadSvgAsPng,
  serializeSvg,
  measureSvg,
  triggerDownload,
  makeChartContextMenuHandler,
  makeSeriesContextMenuHandler,
  DEFAULT_PALETTE,
  DEFAULT_CHART_ANIMATION_MS,
  colorForSeries,
  resolveChartAnimation,
  chartDataKey,
} from './components/complex/Charts'
export type {
  LineChartProps,
  LineChartCrosshair,
  BarChartProps,
  AreaChartProps,
  PieChartProps,
  PieChartSlice,
  ChartLegendProps,
  ChartCrosshairProps,
  ChartCrosshairPoint,
  ChartBrushProps,
  ChartBrushConfig,
  ChartBrushRange,
  ChartHoverToolbarProps,
  ChartAction,
  ChartActionContext,
  ChartActionsProp,
  ChartSize,
  DownloadPngOptions,
  PngSize,
  ChartContextMenuHandler,
  ChartContextMenuPayload,
  ChartSeriesContextMenuHandler,
  ChartSeriesContextMenuPayload,
  ChartAnimation,
  BaseChartProps,
  ChartCategory,
  ChartSeries,
  ChartValue,
  ChartRef,
} from './components/complex/Charts'

// DataGrid
export { DataGrid } from './components/complex/DataGrid'
export type {
  DataGridProps,
  DataGridRef,
  DataGridColumn,
  DataGridLocale,
  CellEditorProps,
  CellPosition,
  CellRange,
  CellValue,
  DataGridSummaryRow,
  DataGridContextMenuItem,
} from './components/complex/DataGrid'

// Complex components (additional)
export { List } from './components/complex/List'
export type { ListProps, ListItemProps, ListItemMetaProps } from './components/complex/List'
// Transfer — single export from the complex (pagination, sortable, locale,
// footer, operations) implementation. The simpler ui-only Transfer was
// removed in tab C round 9.
// `TransferLocale` is already exported above (from `./types`) — avoid a
// duplicate identifier in the rolled-up `.d.ts`.
export { Transfer, TransferList } from './components/complex/Transfer'
export type { TransferProps, TransferItem, TransferListProps } from './components/complex/Transfer'
export { Mentions } from './components/ui/Mentions'
export type { MentionsProps, MentionOption } from './components/ui/Mentions'
export { Transition } from './components/ui/Transition'
export type { TransitionProps } from './components/ui/Transition'

// Form-oriented UI components
export { InputPassword } from './components/ui/InputPassword'
export type { InputPasswordProps, PasswordStrength } from './components/ui/InputPassword'
export { SearchInput } from './components/ui/SearchInput'
export type { SearchInputProps } from './components/ui/SearchInput'
export { TagInput } from './components/ui/TagInput'
export type { TagInputProps } from './components/ui/TagInput'
export { PinInput } from './components/ui/PinInput'
export type { PinInputProps } from './components/ui/PinInput'
export { InlineEdit } from './components/ui/InlineEdit'
export type { InlineEditProps } from './components/ui/InlineEdit'
export { InputGroup } from './components/ui/InputGroup'
export type { InputGroupProps } from './components/ui/InputGroup'
