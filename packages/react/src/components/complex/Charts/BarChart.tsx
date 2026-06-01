import { forwardRef, useMemo, useRef, useState, type CSSProperties, type ForwardedRef } from 'react'
import {
  chartBounds,
  chartDataKey,
  colorForSeries,
  resolveChartPadding,
  resolveChartAnimation,
} from './types'
import { ChartLegend } from './ChartLegend'
import { ChartAxes } from './ChartAxes'
import {
  ChartBrush,
  resolveBrushConfig,
  type ChartBrushConfig,
  type ChartBrushRange,
} from './ChartBrush'
import type { BaseChartProps } from './types'
import { useChartPrint, type ChartRef } from './chartRef'
import { useChartSize } from './useChartSize'
import { ChartHoverToolbar, resolveChartActions } from './ChartHoverToolbar'
import { makeChartContextMenuHandler, makeSeriesContextMenuHandler } from './chartContextMenu'
import { useConfig } from '../../ConfigProvider'

export interface BarChartProps extends BaseChartProps {
  /** Gap between groups in [0..1] of category step. @default 0.2 */
  groupGap?: number
  /** Gap between bars within a group in [0..1] of bar slot. @default 0.1 */
  barGap?: number
  /**
   * Brush для drag-выбора диапазона по X. `true` — uncontrolled с пустым
   * стартовым значением; объект — `ChartBrushConfig`. См. `ChartBrush`.
   */
  brush?: boolean | ChartBrushConfig
}

/**
 * Minimal SVG bar chart. v0 — grouped bars per category (one bar per series),
 * no axes, no tooltip. Theming via `--sg-color-*` tokens.
 *
 * Responsive: viewBox = реальные пиксели контейнера (через
 * `useChartSize`), без `preserveAspectRatio` — bars не растягиваются.
 */
function BarChartInner(
  {
    categories,
    series,
    width = '100%',
    height = 200,
    className,
    style,
    unstyled = false,
    padding,
    groupGap = 0.2,
    barGap = 0.1,
    legend = false,
    xAxis,
    yAxis,
    animate,
    brush,
    printable,
    actions,
    fileName,
    onSeriesContextMenu,
    onChartContextMenu,
  }: BarChartProps,
  forwardedRef: ForwardedRef<ChartRef>,
) {
  const chartsLocale = useConfig().locale?.charts
  const { rootRef } = useChartPrint<Element>(forwardedRef, printable)
  const svgRef = useRef<SVGSVGElement | null>(null)

  const { min, max } = useMemo(() => chartBounds(series.map((s) => s.values)), [series])

  // Always include zero in the range so positive bars rest on the baseline.
  const baseline = Math.min(0, min)
  const top = Math.max(0, max)
  const span = top - baseline || 1

  const [pt, pr, pb, pl] = useMemo(
    () => resolveChartPadding(padding, yAxis, baseline, top),
    [padding, yAxis, baseline, top],
  )

  const fallbackW = typeof width === 'number' && Number.isFinite(width) ? width : 600
  const fallbackH = typeof height === 'number' && Number.isFinite(height) ? height : 200
  const measured = useChartSize<SVGSVGElement>(svgRef, { width: fallbackW, height: fallbackH })
  const viewW = measured.width
  const viewH = measured.height
  const plotW = Math.max(0, viewW - pl - pr)
  const plotH = Math.max(0, viewH - pt - pb)
  const yZero = pt + (top / span) * plotH

  const groupCount = categories.length
  const groupWidth = groupCount > 0 ? plotW / groupCount : 0
  const groupInner = groupWidth * (1 - groupGap)
  const seriesCount = series.length
  const barSlot = seriesCount > 0 ? groupInner / seriesCount : 0
  const barWidth = barSlot * (1 - barGap)

  const wrapperClass = unstyled
    ? className
    : ['sg-chart', 'sg-chart-bar', className].filter(Boolean).join(' ')

  const anim = resolveChartAnimation(animate)
  const animKey = useMemo(
    () => chartDataKey([categories, series.map((s) => s.values)]),
    [categories, series],
  )
  const animClass = anim.enabled && !unstyled ? 'sg-chart-bar-animate' : undefined

  const brushConfig = resolveBrushConfig(brush)
  const isBrushControlled = brushConfig != null && 'range' in brushConfig
  const [internalBrushRange, setInternalBrushRange] = useState<ChartBrushRange | null>(
    brushConfig?.defaultRange ?? null,
  )
  const effectiveBrushRange = isBrushControlled ? (brushConfig!.range ?? null) : internalBrushRange
  const handleBrushChange = (next: ChartBrushRange | null) => {
    if (!isBrushControlled) setInternalBrushRange(next)
    brushConfig?.onRangeChange?.(next)
  }

  const brushReset = brushConfig
    ? () => {
        if (!isBrushControlled) setInternalBrushRange(null)
        brushConfig.onRangeChange?.(null)
      }
    : undefined
  const resolvedActions = resolveChartActions(actions, { fileName, brushReset })
  const [toolbarVisible, setToolbarVisible] = useState(false)
  const handleSvgContextMenu = makeChartContextMenuHandler(onChartContextMenu)

  const setSvgRef = (el: SVGSVGElement | null) => {
    svgRef.current = el
    if (!legend) (rootRef as React.MutableRefObject<Element | null>).current = el
  }

  const svg = (
    <svg
      ref={setSvgRef}
      className={wrapperClass}
      style={legend || resolvedActions ? undefined : style}
      width={width}
      height={height}
      viewBox={`0 0 ${viewW} ${viewH}`}
      role="img"
      aria-label={chartsLocale?.barChart ?? 'Bar chart'}
      onContextMenu={handleSvgContextMenu}
    >
      <ChartAxes
        plotX={pl}
        plotY={pt}
        plotW={plotW}
        plotH={plotH}
        min={baseline}
        max={top}
        categories={categories}
        xPositions={categories.map((_, gi) => pl + gi * groupWidth + groupWidth / 2)}
        xAxis={xAxis}
        yAxis={yAxis}
        unstyled={unstyled}
      />
      {/* baseline */}
      <line
        x1={pl}
        x2={pl + plotW}
        y1={yZero}
        y2={yZero}
        stroke="var(--sg-color-border)"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
      {categories.map((_, gi) => {
        const groupStart = pl + gi * groupWidth + (groupWidth - groupInner) / 2
        return series.map((s, si) => {
          const v = s.values[gi]
          if (v === null || v === undefined) return null
          const x = groupStart + si * barSlot + (barSlot - barWidth) / 2
          const yTop = pt + ((top - Math.max(v, 0)) / span) * plotH
          const yBottom = pt + ((top - Math.min(v, 0)) / span) * plotH
          const h = Math.max(0, yBottom - yTop)
          // Origin: zero baseline so positive bars grow upwards and negative
          // bars grow downwards. `transform-box: fill-box` (set in CSS) makes
          // pixel-space transform-origin work on SVG <rect>.
          const originY = v >= 0 ? yBottom : yTop
          const animStyle: CSSProperties | undefined = anim.enabled
            ? {
                transformOrigin: `${x + barWidth / 2}px ${originY}px`,
                animationDuration: `${anim.duration}ms`,
                animationDelay: `${(gi / Math.max(1, categories.length)) * (anim.duration * 0.3)}ms`,
              }
            : undefined
          return (
            <rect
              key={`${s.id}-${gi}-${animKey}`}
              className={animClass}
              x={x}
              y={yTop}
              width={Math.max(1, barWidth)}
              height={h}
              fill={colorForSeries(s, si)}
              rx={2}
              style={animStyle}
              onContextMenu={makeSeriesContextMenuHandler(onSeriesContextMenu, {
                seriesId: s.id,
                seriesIndex: si,
                valueIndex: gi,
                value: v,
              })}
            >
              <title>{`${s.label} · ${categories[gi]}: ${v}`}</title>
            </rect>
          )
        })
      })}
      {brushConfig && (
        <ChartBrush
          plotX={pl}
          plotY={pt}
          plotW={plotW}
          plotH={plotH}
          categoryCount={categories.length}
          range={effectiveBrushRange}
          onRangeChange={handleBrushChange}
          unstyled={unstyled}
          fill={brushConfig.fill}
          disabled={brushConfig.disabled}
        />
      )}
    </svg>
  )

  const needsWrapper = legend || !!resolvedActions
  if (!needsWrapper) return svg

  return (
    <div
      ref={legend ? (rootRef as React.RefObject<HTMLDivElement>) : undefined}
      className={unstyled ? undefined : 'sg-chart-wrapper'}
      style={style}
      onMouseEnter={resolvedActions ? () => setToolbarVisible(true) : undefined}
      onMouseLeave={resolvedActions ? () => setToolbarVisible(false) : undefined}
      onFocus={resolvedActions ? () => setToolbarVisible(true) : undefined}
      onBlur={resolvedActions ? () => setToolbarVisible(false) : undefined}
    >
      {resolvedActions && (
        <ChartHoverToolbar
          visible={toolbarVisible}
          actions={resolvedActions}
          fileName={fileName}
          getSvg={() => svgRef.current}
          brushReset={brushReset}
          unstyled={unstyled}
        />
      )}
      {svg}
      {legend && <ChartLegend series={series} />}
    </div>
  )
}

export const BarChart = forwardRef<ChartRef, BarChartProps>(BarChartInner)
BarChart.displayName = 'BarChart'
