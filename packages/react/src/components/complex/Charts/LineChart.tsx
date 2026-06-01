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
import { ChartCrosshair, type ChartCrosshairPoint } from './ChartCrosshair'
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

/**
 * Crosshair behaviour toggle for {@link LineChart}. When `true`, a vertical
 * guide line + per-series tooltip appears on hover.
 */
export type LineChartCrosshair =
  | boolean
  | {
      /** Custom formatter for tooltip numeric values. */
      valueFormatter?: (value: number) => string
    }

export interface LineChartProps extends BaseChartProps {
  /** Show small dot markers at each data point. @default true */
  markers?: boolean
  /** Stroke width in pixels. @default 2 */
  strokeWidth?: number
  /**
   * Hover crosshair with a vertical guide line and per-series value tooltip.
   * @default false
   */
  crosshair?: LineChartCrosshair
  /**
   * Brush для drag-выбора диапазона по X. `true` — uncontrolled с пустым
   * стартовым значением; объект — `ChartBrushConfig`. См. `ChartBrush`.
   */
  brush?: boolean | ChartBrushConfig
}

/**
 * SVG line chart with optional axes, legend, hover crosshair, and CSS
 * mount / data-change animation. Theming via `--sg-color-*` tokens; line
 * "draw-in" effect uses pure-CSS `stroke-dashoffset` per segment (no rAF).
 *
 * Responsive: SVG `viewBox` пересчитывается в реальные пиксели контейнера
 * через `useChartSize` (ResizeObserver). `preserveAspectRatio` не задан —
 * один CSS-пиксель = один user-space-unit, без растягивания. На stroke-
 * элементах включён `vector-effect="non-scaling-stroke"` — толщина линии
 * стабильна при печати / zoom.
 */
function LineChartInner(
  {
    categories,
    series,
    width = '100%',
    height = 200,
    className,
    style,
    unstyled = false,
    padding,
    markers = true,
    strokeWidth = 2,
    legend = false,
    xAxis,
    yAxis,
    animate,
    crosshair = false,
    brush,
    printable,
    actions,
    fileName,
    onSeriesContextMenu,
    onChartContextMenu,
  }: LineChartProps,
  forwardedRef: ForwardedRef<ChartRef>,
) {
  const chartsLocale = useConfig().locale?.charts
  const { rootRef } = useChartPrint<Element>(forwardedRef, printable)
  const svgRef = useRef<SVGSVGElement | null>(null)

  const { min, max } = useMemo(() => chartBounds(series.map((s) => s.values)), [series])
  const [pt, pr, pb, pl] = useMemo(
    () => resolveChartPadding(padding, yAxis, min, max),
    [padding, yAxis, min, max],
  )

  const fallbackW = typeof width === 'number' && Number.isFinite(width) ? width : 600
  const fallbackH = typeof height === 'number' && Number.isFinite(height) ? height : 200
  const measured = useChartSize<SVGSVGElement>(svgRef, { width: fallbackW, height: fallbackH })
  const viewW = measured.width
  const viewH = measured.height
  const plotW = Math.max(0, viewW - pl - pr)
  const plotH = Math.max(0, viewH - pt - pb)

  const range = max - min || 1
  const xStep = categories.length > 1 ? plotW / (categories.length - 1) : 0

  function xFor(i: number) {
    return pl + i * xStep
  }
  function yFor(v: number) {
    return pt + (1 - (v - min) / range) * plotH
  }

  const wrapperClass = unstyled
    ? className
    : ['sg-chart', 'sg-chart-line', className].filter(Boolean).join(' ')

  const anim = resolveChartAnimation(animate)
  const animKey = useMemo(
    () => chartDataKey([categories, series.map((s) => s.values)]),
    [categories, series],
  )
  const animStyle: CSSProperties | undefined = anim.enabled
    ? ({ ['--sg-chart-anim-duration' as string]: `${anim.duration}ms` } as CSSProperties)
    : undefined
  const animClass = anim.enabled && !unstyled ? 'sg-chart-line-animate' : undefined

  const crosshairEnabled = crosshair !== false && categories.length > 0
  const crosshairFmt =
    typeof crosshair === 'object' && crosshair !== null ? crosshair.valueFormatter : undefined
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

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

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!crosshairEnabled) return
    const svg = e.currentTarget
    const rect = svg.getBoundingClientRect()
    if (rect.width === 0) return
    const localX = ((e.clientX - rect.left) / rect.width) * viewW
    if (categories.length === 1) {
      setHoverIdx(localX >= pl - xStep / 2 && localX <= pl + xStep / 2 + plotW ? 0 : null)
      return
    }
    const rawIdx = Math.round((localX - pl) / xStep)
    if (rawIdx < 0 || rawIdx >= categories.length) {
      setHoverIdx(null)
      return
    }
    setHoverIdx(rawIdx)
  }

  const handleMouseLeave = () => {
    if (crosshairEnabled) setHoverIdx(null)
  }

  const crosshairPoints: ChartCrosshairPoint[] = useMemo(() => {
    if (hoverIdx === null) return []
    const out: ChartCrosshairPoint[] = []
    series.forEach((s, sIdx) => {
      const v = s.values[hoverIdx]
      if (v === null || v === undefined) return
      out.push({
        label: s.label,
        value: v,
        color: colorForSeries(s, sIdx),
        y: pt + (1 - (v - min) / range) * plotH,
      })
    })
    return out
  }, [hoverIdx, series, pt, plotH, min, range])

  // ─── toolbar / context menu wiring ──────────────────────────────────
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
      aria-label={chartsLocale?.lineChart ?? 'Line chart'}
      onMouseMove={crosshairEnabled ? handleMouseMove : undefined}
      onMouseLeave={crosshairEnabled ? handleMouseLeave : undefined}
      onContextMenu={handleSvgContextMenu}
    >
      <ChartAxes
        plotX={pl}
        plotY={pt}
        plotW={plotW}
        plotH={plotH}
        min={min}
        max={max}
        categories={categories}
        xAxis={xAxis}
        yAxis={yAxis}
        unstyled={unstyled}
      />
      {series.map((s, sIdx) => {
        const stroke = colorForSeries(s, sIdx)
        const segments: { from: [number, number]; to: [number, number]; valueIndex: number }[] = []
        let prev: { pt: [number, number]; idx: number } | null = null
        s.values.forEach((v, i) => {
          if (v === null || v === undefined) {
            prev = null
            return
          }
          const point: [number, number] = [xFor(i), yFor(v)]
          if (prev) segments.push({ from: prev.pt, to: point, valueIndex: i })
          prev = { pt: point, idx: i }
        })
        const segCount = segments.length
        return (
          <g key={`${s.id}-${animKey}`} className={animClass} style={animStyle}>
            {segments.map((seg, segIdx) => {
              const len = Math.hypot(seg.to[0] - seg.from[0], seg.to[1] - seg.from[1])
              const segStyle: CSSProperties | undefined = anim.enabled
                ? {
                    strokeDasharray: len,
                    strokeDashoffset: len,
                    animationDelay: `${(segIdx / Math.max(1, segCount)) * anim.duration}ms`,
                    animationDuration: `${anim.duration / Math.max(1, segCount)}ms`,
                  }
                : undefined
              return (
                <line
                  key={segIdx}
                  className={
                    anim.enabled && !unstyled ? 'sg-chart-line-segment-animate' : undefined
                  }
                  x1={seg.from[0]}
                  y1={seg.from[1]}
                  x2={seg.to[0]}
                  y2={seg.to[1]}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  vectorEffect="non-scaling-stroke"
                  style={segStyle}
                  onContextMenu={makeSeriesContextMenuHandler(onSeriesContextMenu, {
                    seriesId: s.id,
                    seriesIndex: sIdx,
                    valueIndex: seg.valueIndex,
                    value: s.values[seg.valueIndex] ?? undefined,
                  })}
                />
              )
            })}
            {markers &&
              s.values.map((v, i) => {
                if (v === null || v === undefined) return null
                return (
                  <circle
                    key={i}
                    cx={xFor(i)}
                    cy={yFor(v)}
                    r={Math.max(2, strokeWidth)}
                    fill={stroke}
                    onContextMenu={makeSeriesContextMenuHandler(onSeriesContextMenu, {
                      seriesId: s.id,
                      seriesIndex: sIdx,
                      valueIndex: i,
                      value: v,
                    })}
                  >
                    <title>{`${s.label} · ${categories[i]}: ${v}`}</title>
                  </circle>
                )
              })}
          </g>
        )
      })}
      {crosshairEnabled && hoverIdx !== null && crosshairPoints.length > 0 && (
        <ChartCrosshair
          x={xFor(hoverIdx)}
          plotX={pl}
          plotY={pt}
          plotH={plotH}
          plotW={plotW}
          category={categories[hoverIdx]!}
          points={crosshairPoints}
          unstyled={unstyled}
          valueFormatter={crosshairFmt}
        />
      )}
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

export const LineChart = forwardRef<ChartRef, LineChartProps>(LineChartInner)
LineChart.displayName = 'LineChart'
