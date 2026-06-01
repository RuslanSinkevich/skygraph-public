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

export interface AreaChartProps extends BaseChartProps {
  /** Stack series on top of each other (cumulative). @default false */
  stacked?: boolean
  /** Stroke width on the top edge. @default 2 */
  strokeWidth?: number
  /** Fill opacity (0..1). @default 0.25 */
  fillOpacity?: number
  /**
   * Brush для drag-выбора диапазона по X. `true` — uncontrolled с пустым
   * стартовым значением; объект — `ChartBrushConfig`. См. `ChartBrush`.
   */
  brush?: boolean | ChartBrushConfig
}

/**
 * Minimal SVG area chart. v0 — straight segments between points, optional
 * stacking. Responsive viewBox через `useChartSize`.
 */
function AreaChartInner(
  {
    categories,
    series,
    width = '100%',
    height = 200,
    className,
    style,
    unstyled = false,
    padding,
    stacked = false,
    strokeWidth = 2,
    fillOpacity = 0.25,
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
  }: AreaChartProps,
  forwardedRef: ForwardedRef<ChartRef>,
) {
  const chartsLocale = useConfig().locale?.charts
  const { rootRef } = useChartPrint<Element>(forwardedRef, printable)
  const svgRef = useRef<SVGSVGElement | null>(null)

  // Effective values per series — for stacked, each series adds to the
  // running total (treating null as 0 for the stack base).
  const stackedValues = useMemo(() => {
    if (!stacked) return series.map((s) => [...s.values])
    const totals = new Array(categories.length).fill(0)
    return series.map((s) => {
      const out: (number | null)[] = []
      s.values.forEach((v, i) => {
        if (v === null || v === undefined) {
          out.push(null)
          return
        }
        totals[i] += v
        out.push(totals[i])
      })
      return out
    })
  }, [series, stacked, categories.length])

  const { min, max } = useMemo(() => chartBounds(stackedValues), [stackedValues])

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

  const xStep = categories.length > 1 ? plotW / (categories.length - 1) : 0
  function xFor(i: number) {
    return pl + i * xStep
  }
  function yFor(v: number) {
    return pt + ((top - v) / span) * plotH
  }
  const yBase = yFor(0)

  const wrapperClass = unstyled
    ? className
    : ['sg-chart', 'sg-chart-area', className].filter(Boolean).join(' ')

  const anim = resolveChartAnimation(animate)
  const animKey = useMemo(
    () => chartDataKey([categories, series.map((s) => s.values), stacked]),
    [categories, series, stacked],
  )
  const animStyle: CSSProperties | undefined = anim.enabled
    ? ({ ['--sg-chart-anim-duration' as string]: `${anim.duration}ms` } as CSSProperties)
    : undefined
  const animClass = anim.enabled && !unstyled ? 'sg-chart-area-animate' : undefined

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
      aria-label={chartsLocale?.areaChart ?? 'Area chart'}
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
        xAxis={xAxis}
        yAxis={yAxis}
        unstyled={unstyled}
      />
      {series.map((s, sIdx) => {
        const color = colorForSeries(s, sIdx)
        const vals = stackedValues[sIdx]!
        // Build "area" polygon: top line forward, then close along baseline backward.
        const topPoints: [number, number][] = []
        vals.forEach((v, i) => {
          if (v === null || v === undefined) return
          topPoints.push([xFor(i), yFor(v)])
        })
        if (topPoints.length === 0) return null
        const first = topPoints[0]!
        const last = topPoints[topPoints.length - 1]!
        const areaPath = [
          `M ${first[0]} ${yBase}`,
          ...topPoints.map((p) => `L ${p[0]} ${p[1]}`),
          `L ${last[0]} ${yBase}`,
          'Z',
        ].join(' ')
        const linePath = topPoints
          .map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`))
          .join(' ')
        const onSeriesCtx = makeSeriesContextMenuHandler(onSeriesContextMenu, {
          seriesId: s.id,
          seriesIndex: sIdx,
        })
        return (
          <g key={`${s.id}-${animKey}`} className={animClass} style={animStyle}>
            <path
              d={areaPath}
              fill={color}
              fillOpacity={fillOpacity}
              stroke="none"
              onContextMenu={onSeriesCtx}
            />
            <path
              d={linePath}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              onContextMenu={onSeriesCtx}
            />
          </g>
        )
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

export const AreaChart = forwardRef<ChartRef, AreaChartProps>(AreaChartInner)
AreaChart.displayName = 'AreaChart'
