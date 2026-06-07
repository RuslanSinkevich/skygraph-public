// Composables
export { useForm } from './composables/useForm'
export type { UseFormOptions, UseFormReturn } from './composables/useForm'

export { useField } from './composables/useField'
export type { UseFieldReturn, FieldStatus } from './composables/useField'

export { useFieldArray } from './composables/useFieldArray'
export type { UseFieldArrayReturn } from './composables/useFieldArray'

export { useWatch } from './composables/useWatch'

export { useComputed } from './composables/useComputed'

export { useTable } from './composables/useTable'
export type { UseTableOptions, UseTableReturn, FilterFn } from './composables/useTable'

export { useTree } from './composables/useTree'
export type { UseTreeOptions, UseTreeReturn } from './composables/useTree'

export { useGraph } from './composables/useGraph'
export type { UseGraphOptions, UseGraphReturn } from './composables/useGraph'

export { useFocusTrap } from './composables/useFocusTrap'

export { useRovingTabIndex } from './composables/useRovingTabIndex'
export type {
  RovingTabIndexOptions,
  RovingItemProps,
  UseRovingTabIndexReturn,
} from './composables/useRovingTabIndex'

export { useListNavigation } from './composables/useListNavigation'
export type {
  ListNavigationOptions,
  UseListNavigationReturn,
} from './composables/useListNavigation'

export { useVirtualScroll } from './composables/useVirtualScroll'
export type {
  UseVirtualScrollOptions,
  UseVirtualScrollReturn,
} from './composables/useVirtualScroll'

export { useHistory } from './composables/useHistory'
export type { UseHistoryReturn } from './composables/useHistory'

// Complex data-display components (Tables / Trees / Lists / Virtual)
export { SgTable, DEFAULT_TABLE_LOCALE } from './components/complex/Table'
export type {
  TableProps,
  TableColumn,
  TableSlot,
  TableClassNames,
  TableStyles,
  TableLocale,
  RowSelectionConfig,
  FilterOperator,
  ExpandableConfig as TableExpandableConfig,
  TreeConfig as TableTreeConfig,
  SummaryCell as TableSummaryCell,
  VirtualConfig as TableVirtualConfig,
  CellSpan as TableCellSpan,
  AggregateType as TableAggregateType,
  FilterDropdownSlotProps as TableFilterDropdownSlotProps,
} from './components/complex/Table'

export {
  SgTree,
  SgTreeNodeRow,
  DEFAULT_TREE_LOCALE,
  DEFAULT_INDENT,
  NODE_HEIGHT,
} from './components/complex/Tree'
export type {
  TreeProps,
  TreeFieldNames,
  TreeLocale,
  CheckInfo,
  SelectInfo,
  ExpandInfo,
  DragInfo,
  DropInfo,
  EditInfo as TreeEditInfo,
  TreeNodeStatus,
  TreeNodeAction,
} from './components/complex/Tree'

export { SgList } from './components/complex/List'
export type {
  ListProps,
  ListSlot,
  ListClassNames,
  ListStyles,
  ListPaginationConfig,
  ListGridConfig,
  ListVirtualConfig,
  ListLocale,
} from './components/complex/List'

export { SgVirtualList } from './components/complex/VirtualList'
export type { VirtualListProps } from './components/complex/VirtualList'

export { SgDataGrid } from './components/complex/DataGrid'
export type {
  DataGridColumn,
  DataGridProps,
  DataGridSummaryRow,
  CellPosition,
  CellValue,
  DataGridExpose,
} from './components/complex/DataGrid'

// Visualization composables
export { useChartSize } from './composables/useChartSize'
export type { ChartSize } from './composables/useChartSize'

// Visualization complex components (Charts / Diagram / Dashboard / Gantt /
// Timeline / ResourceCalendar)
export {
  SgLineChart,
  SgBarChart,
  SgAreaChart,
  SgPieChart,
  SgChartLegend,
  SgChartAxes,
  chartBounds,
  colorForSeries,
  normalizePadding,
  resolveChartAnimation,
  DEFAULT_CHART_ANIMATION_MS,
  DEFAULT_PALETTE,
} from './components/complex/Charts'
export type {
  ChartCategory,
  ChartValue,
  ChartSeries,
  ChartAnimation,
  XAxisOptions,
  YAxisOptions,
  BaseChartProps,
  ChartExpose,
} from './components/complex/Charts'

// T-Vue-Charts: Crosshair / Brush / HoverToolbar + download / contextMenu
// utilities (parity with @skygraph/react Charts surface).
export {
  SgChartCrosshair,
  SgChartBrush,
  SgChartHoverToolbar,
  resolveBrushConfig,
  defaultChartActions,
  resolveChartActions,
  downloadSvg,
  downloadSvgAsPng,
  serializeSvg,
  measureSvg,
  triggerDownload,
  makeChartContextMenuHandler,
  makeSeriesContextMenuHandler,
} from './components/complex/Charts'
export type {
  ChartCrosshairProps,
  ChartCrosshairPoint,
  ChartBrushProps,
  ChartBrushConfig,
  ChartBrushRange,
  ChartHoverToolbarProps,
  ChartAction,
  ChartActionContext,
  ChartActionsProp,
  DownloadPngOptions,
  PngSize,
  ChartContextMenuPayload,
  ChartContextMenuHandler,
  ChartSeriesContextMenuPayload,
  ChartSeriesContextMenuHandler,
} from './components/complex/Charts'

export { SgDiagram } from './components/complex/Diagram'
export type {
  DiagramProps,
  DiagramSelectionMode,
  DiagramExpose,
  DiagramNodeRenderProps,
  DiagramNodeAction,
  DiagramEdgeAction,
  DiagramCanvasContextPoint,
  DiagramDropPoint,
} from './components/complex/Diagram'

export { SgDashboard, SgDashboardEditor } from './components/complex/Dashboard'
export type {
  DashboardWidget,
  DashboardProps,
  DashboardEditorProps,
  DashboardExpose,
} from './components/complex/Dashboard'

export { SgGantt } from './components/complex/Gantt'
export type {
  GanttTask,
  GanttResource,
  GanttScale,
  GanttRange,
  GanttProps,
} from './components/complex/Gantt'

export { SgEventTimeline } from './components/complex/Timeline'
export type {
  TimelineEvent,
  TimelineOrientation,
  TimelineGroupBy,
  EventTimelineProps,
} from './components/complex/Timeline'

export { SgResourceCalendar } from './components/complex/ResourceCalendar'
export type {
  Resource as ResourceCalendarResource,
  Assignment as ResourceCalendarAssignment,
  CalendarScale as ResourceCalendarScale,
  ResourceCalendarProps,
} from './components/complex/ResourceCalendar'

// Print utility
export { printElement, buildPrintHtml, buildPageRule } from './utils/print'
export type { PrintOptions, PrintableProp } from './utils/print'

// Complex Form components
export {
  SgForm,
  SgField,
  SgFormList,
  SgFormProvider,
  formContextKey,
  formProviderContextKey,
} from './components/complex/Form'
export type {
  FormProps,
  FieldProps,
  FormListProps,
  FormListField,
  FormProviderProps,
  FormContextValue,
  FormProviderContextValue,
} from './components/complex/Form'

// SchemaForm
export { SgSchemaForm, SgAutoField, SgSubmitButton } from './components/complex/SchemaForm'
export type {
  SchemaFormProps,
  AutoFieldProps,
  AutoFieldOption,
  FieldType,
  SubmitButtonProps,
} from './components/complex/SchemaForm'

// SchemaFormEditor
export {
  SgSchemaFormEditor,
  SgSchemaFormEditorPalette,
  SgSchemaFormEditorCanvas,
  SgSchemaFormEditorInspector,
  SgSchemaFormEditorSchemaView,
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
  EditorSchema,
  EditorField,
  EditorAction,
  EditorState,
  PaletteItem,
} from './components/complex/SchemaFormEditor'

// JSON Schema adapter for SchemaForm
export {
  jsonSchemaToFields,
  jsonSchemaToRules,
  jsonSchemaToDefaults,
} from './adapters/jsonSchemaAdapter'
export type { JSONSchema, JSONSchemaProperty, AutoFieldConfig } from './adapters/jsonSchemaAdapter'

// Zod adapter (parity with @skygraph/react/src/adapters/zodAdapter) — T-Vue-Misc
export { zodRule, zodRules, zodDefaults, zodToJsonSchema } from './adapters/zodAdapter'
export type { ZodLikeSchema, ZodObjectLikeSchema, ZodAdapterOptions } from './adapters/zodAdapter'

// Devtools (parity with @skygraph/react devtools entry) — T-Vue-Misc
export { default as SgHistoryPanel } from './components/devtools/HistoryPanel.vue'
export type { HistoryPanelProps } from './components/devtools/HistoryPanel.vue'

// UI form controls
export { default as SgInput } from './components/ui/Input.vue'
export type { InputProps } from './components/ui/Input.vue'

export { default as SgInputPassword } from './components/ui/InputPassword.vue'
export type { InputPasswordProps, PasswordStrength } from './components/ui/InputPassword.vue'

export { default as SgSearchInput } from './components/ui/SearchInput.vue'
export type { SearchInputProps } from './components/ui/SearchInput.vue'

export { default as SgTagInput } from './components/ui/TagInput.vue'
export type { TagInputProps } from './components/ui/TagInput.vue'

export { default as SgPinInput } from './components/ui/PinInput.vue'
export type { PinInputProps } from './components/ui/PinInput.vue'

export { default as SgInlineEdit } from './components/ui/InlineEdit.vue'
export type { InlineEditProps } from './components/ui/InlineEdit.vue'

export { default as SgInputGroup } from './components/ui/InputGroup.vue'
export type { InputGroupProps } from './components/ui/InputGroup.vue'

export { default as SgInputNumber } from './components/ui/InputNumber.vue'
export type { InputNumberProps } from './components/ui/InputNumber.vue'

export { default as SgTextarea } from './components/ui/Textarea.vue'
export type { TextareaProps } from './components/ui/Textarea.vue'

export { default as SgSelect } from './components/ui/Select.vue'
export type { SelectProps, SelectOption } from './components/ui/Select.vue'

export { default as SgCheckbox } from './components/ui/Checkbox.vue'
export type { CheckboxProps } from './components/ui/Checkbox.vue'

export { default as SgRadio } from './components/ui/Radio.vue'
export type { RadioGroupProps, RadioOption } from './components/ui/Radio.vue'

export { default as SgSwitch } from './components/ui/Switch.vue'
export type { SwitchProps } from './components/ui/Switch.vue'

export { default as SgSlider } from './components/ui/Slider.vue'
export type { SliderProps } from './components/ui/Slider.vue'

export { default as SgRate } from './components/ui/Rate.vue'
export type { RateProps } from './components/ui/Rate.vue'

export { default as SgAutoComplete } from './components/ui/AutoComplete.vue'
export type { AutoCompleteProps, AutoCompleteOption } from './components/ui/AutoComplete.vue'

export { default as SgColorPicker } from './components/ui/ColorPicker.vue'
export type { ColorPickerProps } from './components/ui/ColorPicker.vue'

export { default as SgDatePicker } from './components/ui/DatePicker.vue'
export type {
  DatePickerProps,
  DatePreset,
  ShowTimeConfig,
  DatePickerMode,
} from './components/ui/DatePicker.vue'

export { default as SgRangePicker } from './components/ui/RangePicker.vue'
export type { RangePickerProps } from './components/ui/RangePicker.vue'

export { default as SgTimePicker } from './components/ui/TimePicker.vue'
export type { TimePickerProps } from './components/ui/TimePicker.vue'
export { default as SgTimeRangePicker } from './components/ui/TimeRangePicker.vue'
export type { TimeRangePickerProps } from './components/ui/TimeRangePicker.vue'

export { default as SgCalendar } from './components/ui/Calendar.vue'
export type {
  CalendarProps,
  CalendarEvent,
  CalendarLocale,
  CalendarHeaderSlotProps,
  CalendarCellSlotProps,
} from './components/ui/Calendar.vue'

export { default as SgUpload } from './components/ui/Upload.vue'
export type { UploadProps, UploadFile } from './components/ui/Upload.vue'

export { default as SgCascader } from './components/ui/Cascader.vue'
export type {
  CascaderProps,
  CascaderOption,
  CascaderSearchFilter,
} from './components/ui/Cascader.vue'

export { default as SgTreeSelect } from './components/ui/TreeSelect.vue'
export type { TreeSelectProps, TreeSelectNode } from './components/ui/TreeSelect.vue'

export { default as SgTransfer } from './components/ui/Transfer.vue'
export type { TransferProps, TransferItem } from './components/ui/Transfer.vue'

export { default as SgMentions } from './components/ui/Mentions.vue'
export type { MentionsProps, MentionOption } from './components/ui/Mentions.vue'

// UI primitives (Feedback / Navigation / Display / Misc)
export {
  SgConfigProvider,
  SgTransition,
  SgSpin,
  SgModal,
  SgDrawer,
  SgNotificationContainer,
  SgPopconfirm,
  SgTooltip,
  SgProgress,
  SgResult,
  SgEmpty,
  SgSkeleton,
  SgTabs,
  SgMenu,
  SgBreadcrumb,
  SgDropdown,
  SgPagination,
  SgSteps,
  SgSegmented,
  SgBadge,
  SgTag,
  SgAvatar,
  SgCarousel,
  SgTimeline,
  SgDescriptions,
  SgCollapse,
  SgButton,
  notification,
  useNotification,
  useConfig,
  useConfigWithDefaults,
  buildThemeVars,
  sgConfigKey,
} from './components/ui'

export type {
  ConfigProviderProps,
  SgConfig,
  ThemeConfig,
  SgThemeToken,
  CSPConfig,
  RenderEmptyHandler,
  Direction,
  TransitionProps,
  SpinProps,
  ModalProps,
  DrawerProps,
  NotificationConfig,
  NotificationContainerProps,
  NotificationType,
  PopconfirmProps,
  TooltipProps,
  ProgressProps,
  ResultProps,
  EmptyProps,
  SkeletonProps,
  TabsProps,
  TabItem,
  MenuItem,
  BreadcrumbProps,
  BreadcrumbItem,
  DropdownProps,
  DropdownItem,
  PaginationProps,
  StepsProps,
  StepItem,
  SegmentedProps,
  SegmentedOption,
  BadgeProps,
  TagProps,
  AvatarProps,
  CarouselProps,
  TimelineProps,
  TimelineItem,
  DescriptionsProps,
  DescriptionsItem,
  CollapseProps,
  CollapseItem,
  ButtonProps,
} from './components/ui'

// Shared types
export type {
  SizeType,
  BaseComponentProps,
  SgLocale,
  InputPasswordLocale,
  SearchInputLocale,
  TagInputLocale,
  PinInputLocale,
  InlineEditLocale,
  CalendarLocale as SgCalendarLocale,
  DatePickerLocale,
} from './types'

// Locale presets (ConfigProvider)
export { en_US, ru_RU, zh_CN, de_DE, fr_FR, es_ES } from './locales'

// Re-export key types from core (mirrors what @skygraph/react does)
export type {
  Core,
  FormEngine,
  FormState,
  FormOptions,
  FieldMeta,
  Rule,
  RuleObject,
  RuleFn,
  ValidationResult,
  ValidationMode,
  TableEngine,
  TableState,
  TableOptions,
  RowId,
  SortConfig,
  SortDirection,
  ColumnFilter,
  TreeEngine,
  TreeState,
  TreeNodeData,
  TreeKey,
  GraphEngine,
  GraphState,
  GraphEngineOptions,
} from '@skygraph/core'
