import { forwardRef, useMemo, useRef, useState, type CSSProperties, type ForwardedRef } from 'react'
import { chartDataKey, colorForSeries, resolveChartAnimation, type ChartAnimation } from './types'
import type { ChartSeries } from './types'
import type { PrintableProp } from '../../../utils/print'
import { useChartPrint, type ChartRef } from './chartRef'
import { useChartSize } from './useChartSize'
import { ChartHoverToolbar, resolveChartActions, type ChartActionsProp } from './ChartHoverToolbar'
import {
  makeChartContextMenuHandler,
  makeSeriesContextMenuHandler,
  type ChartContextMenuHandler,
  type ChartSeriesContextMenuHandler,
} from './chartContextMenu'
import { useConfig } from '../../ConfigProvider'

export interface PieChartSlice {
  /** Stable id for keying / legend. */
  id: string
  /** Display label (legend / accessible description). */
  label: string
  /** Numeric value. Negative values are clamped to 0. */
  value: number
  /** Optional explicit fill colour. Falls back to default palette by index. */
  color?: string
}

export interface PieChartProps {
  data: readonly PieChartSlice[]
  /** SVG width. */
  width?: number | string
  /** SVG height. */
  height?: number | string
  /** Inner radius (donut). 0 → solid pie. @default 0 */
  innerRadius?: number
  /** Outer radius. @default 80 */
  outerRadius?: number
  /** Drop default sg-chart classes. */
  unstyled?: boolean
  className?: string
  style?: CSSProperties
  /**
   * Mount / data-change animation toggle. When enabled, slices fade-in and
   * rotate from `-90deg` to `0deg` around the pie centre.
   * @default true
   */
  animate?: ChartAnimation
  /**
   * Включает поддержку `ref.print()`. `{ fileName }` — имя popup-окна.
   * @default false
   */
  printable?: PrintableProp
  /**
   * Hover-toolbar в правом верхнем углу — print + SVG + PNG.
   */
  actions?: ChartActionsProp
  /** Базовое имя файла для экспортов. @default 'chart' */
  fileName?: string
  /**
   * Контекстное меню по slice-у (правая кнопка). Payload содержит
   * `seriesId` (равен `slice.id`), `seriesIndex` и `value`.
   */
  onSeriesContextMenu?: ChartSeriesContextMenuHandler
  /** Контекстное меню по фону pie chart (вне slice-ов). */
  onChartContextMenu?: ChartContextMenuHandler
}

/**
 * Minimal SVG pie / donut chart. Clockwise from 12 o'clock. Responsive
 * viewBox через `useChartSize`: при `width|height='100%'` радиусы пересчи-
 * тываются от реальных пикселей контейнера, чтобы pie не растягивался.
 */
function PieChartInner(
  {
    data,
    width = 200,
    height = 200,
    innerRadius = 0,
    outerRadius = 80,
    unstyled = false,
    className,
    style,
    animate,
    printable,
    actions,
    fileName,
    onSeriesContextMenu,
    onChartContextMenu,
  }: PieChartProps,
  forwardedRef: ForwardedRef<ChartRef>,
) {
  const chartsLocale = useConfig().locale?.charts
  const { rootRef } = useChartPrint<Element>(forwardedRef, printable)
  const svgRef = useRef<SVGSVGElement | null>(null)

  // Pie использует width / height и для viewBox, и для центрирования.
  // ResizeObserver — на случай width|height = '100%' или CSS-зависимого
  // размера; в остальных случаях возвращает сразу пиксельные значения.
  const fallbackW = typeof width === 'number' && Number.isFinite(width) ? width : 200
  const fallbackH = typeof height === 'number' && Number.isFinite(height) ? height : 200
  const measured = useChartSize<SVGSVGElement>(svgRef, { width: fallbackW, height: fallbackH })
  const viewW = measured.width
  const viewH = measured.height

  const total = useMemo(() => data.reduce((sum, d) => sum + Math.max(0, d.value), 0), [data])

  const cx = viewW / 2
  const cy = viewH / 2

  const wrapperClass = unstyled
    ? className
    : ['sg-chart', 'sg-chart-pie', className].filter(Boolean).join(' ')

  const anim = resolveChartAnimation(animate)
  const animKey = useMemo(() => chartDataKey([data]), [data])
  const animClass = anim.enabled && !unstyled ? 'sg-chart-pie-animate' : undefined
  const animStyle: CSSProperties | undefined = anim.enabled
    ? {
        transformOrigin: `${cx}px ${cy}px`,
        animationDuration: `${anim.duration}ms`,
      }
    : undefined

  const resolvedActions = resolveChartActions(actions, { fileName })
  const [toolbarVisible, setToolbarVisible] = useState(false)
  const handleSvgContextMenu = makeChartContextMenuHandler(onChartContextMenu)

  const setSvgRef = (el: SVGSVGElement | null) => {
    svgRef.current = el
    if (!resolvedActions) (rootRef as React.MutableRefObject<Element | null>).current = el
  }

  const isEmpty = total === 0 || data.length === 0
  let cursor = -Math.PI / 2 // start at 12 o'clock

  const svg = isEmpty ? (
    <svg
      ref={setSvgRef}
      className={wrapperClass}
      style={resolvedActions ? undefined : style}
      width={width}
      height={height}
      viewBox={`0 0 ${viewW} ${viewH}`}
      role="img"
      aria-label={`${chartsLocale?.pieChart ?? 'Pie chart'} (empty)`}
      onContextMenu={handleSvgContextMenu}
    />
  ) : (
    <svg
      ref={setSvgRef}
      className={wrapperClass}
      style={resolvedActions ? undefined : style}
      width={width}
      height={height}
      viewBox={`0 0 ${viewW} ${viewH}`}
      role="img"
      aria-label={chartsLocale?.pieChart ?? 'Pie chart'}
      onContextMenu={handleSvgContextMenu}
    >
      {data.map((slice, i) => {
        const value = Math.max(0, slice.value)
        if (value === 0) return null
        const angle = (value / total) * 2 * Math.PI
        const startAngle = cursor
        const endAngle = cursor + angle
        cursor = endAngle

        const x0 = cx + outerRadius * Math.cos(startAngle)
        const y0 = cy + outerRadius * Math.sin(startAngle)
        const x1 = cx + outerRadius * Math.cos(endAngle)
        const y1 = cy + outerRadius * Math.sin(endAngle)
        const largeArc = angle > Math.PI ? 1 : 0

        const inner = innerRadius > 0
        const ix0 = cx + innerRadius * Math.cos(startAngle)
        const iy0 = cy + innerRadius * Math.sin(startAngle)
        const ix1 = cx + innerRadius * Math.cos(endAngle)
        const iy1 = cy + innerRadius * Math.sin(endAngle)

        const d = inner
          ? [
              `M ${x0} ${y0}`,
              `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x1} ${y1}`,
              `L ${ix1} ${iy1}`,
              `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix0} ${iy0}`,
              'Z',
            ].join(' ')
          : [
              `M ${cx} ${cy}`,
              `L ${x0} ${y0}`,
              `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x1} ${y1}`,
              'Z',
            ].join(' ')

        const fakeSeries: ChartSeries = {
          id: slice.id,
          label: slice.label,
          values: [],
          color: slice.color,
        }
        const sliceStyle: CSSProperties | undefined = anim.enabled
          ? {
              ...animStyle,
              animationDelay: `${(i / Math.max(1, data.length)) * (anim.duration * 0.4)}ms`,
            }
          : undefined
        return (
          <path
            key={`${slice.id}-${animKey}`}
            className={animClass}
            d={d}
            fill={colorForSeries(fakeSeries, i)}
            data-slice-id={slice.id}
            style={sliceStyle}
            onContextMenu={makeSeriesContextMenuHandler(onSeriesContextMenu, {
              seriesId: slice.id,
              seriesIndex: i,
              value: slice.value,
            })}
          >
            <title>{`${slice.label}: ${slice.value}`}</title>
          </path>
        )
      })}
    </svg>
  )

  if (!resolvedActions) return svg

  return (
    <div
      ref={rootRef as React.RefObject<HTMLDivElement>}
      className={unstyled ? undefined : 'sg-chart-wrapper'}
      style={style}
      onMouseEnter={() => setToolbarVisible(true)}
      onMouseLeave={() => setToolbarVisible(false)}
      onFocus={() => setToolbarVisible(true)}
      onBlur={() => setToolbarVisible(false)}
    >
      <ChartHoverToolbar
        visible={toolbarVisible}
        actions={resolvedActions}
        fileName={fileName}
        getSvg={() => svgRef.current}
        unstyled={unstyled}
      />
      {svg}
    </div>
  )
}

export const PieChart = forwardRef<ChartRef, PieChartProps>(PieChartInner)
PieChart.displayName = 'PieChart'
