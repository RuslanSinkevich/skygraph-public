import type { CSSProperties } from 'react'
import { colorForSeries } from './types'
import type { ChartSeries } from './types'
import { useConfig } from '../../ConfigProvider'

export interface ChartLegendProps {
  series: readonly ChartSeries[]
  className?: string
  style?: CSSProperties
}

/**
 * Minimal horizontal legend for charts. Renders below the SVG with one
 * `<span>` per series (colored swatch + label).
 */
export function ChartLegend({ series, className, style }: ChartLegendProps) {
  const chartsLocale = useConfig().locale?.charts
  return (
    <div
      className={['sg-chart-legend', className].filter(Boolean).join(' ')}
      role="list"
      aria-label={chartsLocale?.legend ?? 'Chart legend'}
      style={style}
    >
      {series.map((s, i) => (
        <span key={s.id} role="listitem" className="sg-chart-legend-item">
          <span
            aria-hidden="true"
            className="sg-chart-legend-swatch"
            style={{ background: colorForSeries(s, i) }}
          />
          {s.label}
        </span>
      ))}
    </div>
  )
}
