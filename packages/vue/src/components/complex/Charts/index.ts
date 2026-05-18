export { default as SgLineChart } from './LineChart.vue'
export type { LineChartCrosshair } from './LineChart.vue'
export { default as SgBarChart } from './BarChart.vue'
export { default as SgAreaChart } from './AreaChart.vue'
export { default as SgPieChart } from './PieChart.vue'
export { default as SgChartLegend } from './ChartLegend.vue'
export { default as SgChartAxes } from './ChartAxes.vue'
export {
  chartBounds,
  colorForSeries,
  normalizePadding,
  resolveChartAnimation,
  DEFAULT_CHART_ANIMATION_MS,
  DEFAULT_PALETTE,
} from './types'
export type {
  ChartCategory,
  ChartValue,
  ChartSeries,
  ChartAnimation,
  XAxisOptions,
  YAxisOptions,
  BaseChartProps,
  ChartExpose,
} from './types'

// ── T-Vue-Charts (parity with @skygraph/react/components/complex/Charts) ──

export { default as SgChartCrosshair } from './ChartCrosshair.vue'
export type { ChartCrosshairProps, ChartCrosshairPoint } from './ChartCrosshair.vue'

export { default as SgChartBrush, resolveBrushConfig } from './ChartBrush.vue'
export type { ChartBrushProps, ChartBrushConfig, ChartBrushRange } from './ChartBrush.vue'

export { default as SgChartHoverToolbar } from './ChartHoverToolbar.vue'
export type { ChartHoverToolbarProps } from './ChartHoverToolbar.vue'

export { defaultChartActions, resolveChartActions } from './chartActions'
export type { ChartAction, ChartActionContext, ChartActionsProp } from './chartActions'

export {
  downloadSvg,
  downloadSvgAsPng,
  serializeSvg,
  measureSvg,
  triggerDownload,
} from './download'
export type { DownloadPngOptions, PngSize } from './download'

export { makeChartContextMenuHandler, makeSeriesContextMenuHandler } from './contextMenu'
export type {
  ChartContextMenuPayload,
  ChartContextMenuHandler,
  ChartSeriesContextMenuPayload,
  ChartSeriesContextMenuHandler,
} from './contextMenu'
