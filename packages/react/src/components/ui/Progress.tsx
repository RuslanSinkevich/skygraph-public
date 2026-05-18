// react is used for JSX
import { useConfig } from '../ConfigProvider'
import type { BaseComponentProps, SizableProps } from '../../types'

/** Props for the Progress bar or circular progress indicator. */
export interface ProgressProps extends BaseComponentProps, SizableProps {
  /** Completion value from 0 to 100 (clamped). */
  percent: number
  /** Renders a horizontal bar or circular SVG progress. @default 'line' */
  type?: 'line' | 'circle'
  /** Visual state; `normal` becomes success at 100%. @default 'normal' */
  status?: 'normal' | 'success' | 'error' | 'active'
  /** Shows percentage text next to or inside the indicator. @default true */
  showInfo?: boolean
  /** Bar or circle stroke thickness in pixels. */
  strokeWidth?: number
  /** Custom color for the filled portion of the progress. */
  strokeColor?: string
  /** SVG width/height for circle type. @default 120 */
  width?: number
}

/**
 * Displays task completion as a line or circle, with optional percentage label.
 */
export function Progress({
  percent,
  type = 'line',
  status = 'normal',
  showInfo = true,
  strokeWidth,
  strokeColor,
  size: sizeProp,
  width = 120,
  className,
  style,
  unstyled,
}: ProgressProps) {
  const config = useConfig()
  const size = sizeProp ?? config.size ?? 'middle'
  const progressSize = size === 'small' ? 'small' : 'default'

  const clampedPercent = Math.min(100, Math.max(0, percent))
  const resolvedStatus = clampedPercent >= 100 && status === 'normal' ? 'success' : status

  if (unstyled) {
    return (
      <div className={className} style={style} role="progressbar" aria-valuenow={clampedPercent}>
        {type === 'line' ? (
          <div style={{ width: '100%', height: strokeWidth ?? 8, background: '#eee' }}>
            <div style={{ width: `${clampedPercent}%`, height: '100%', background: strokeColor ?? '#1677ff' }} />
          </div>
        ) : (
          <span>{clampedPercent}%</span>
        )}
      </div>
    )
  }

  if (type === 'circle') {
    const sw = strokeWidth ?? 6
    const radius = (width - sw) / 2
    const circumference = 2 * Math.PI * radius
    const offset = circumference - (clampedPercent / 100) * circumference

    return (
      <div
        className={[
          'sg-progress sg-progress-circle',
          `sg-progress-${resolvedStatus}`,
          className,
        ].filter(Boolean).join(' ')}
        style={style}
        role="progressbar"
        aria-valuenow={clampedPercent}
      >
        <svg width={width} height={width} viewBox={`0 0 ${width} ${width}`}>
          <circle
            className="sg-progress-circle-trail"
            cx={width / 2}
            cy={width / 2}
            r={radius}
            strokeWidth={sw}
            fill="none"
          />
          <circle
            className="sg-progress-circle-path"
            cx={width / 2}
            cy={width / 2}
            r={radius}
            strokeWidth={sw}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={strokeColor ? { stroke: strokeColor } : undefined}
            transform={`rotate(-90 ${width / 2} ${width / 2})`}
          />
        </svg>
        {showInfo && (
          <span className="sg-progress-circle-text">{clampedPercent}%</span>
        )}
      </div>
    )
  }

  const barHeight = strokeWidth ?? (progressSize === 'small' ? 6 : 8)

  return (
    <div
      className={[
        'sg-progress sg-progress-line',
        `sg-progress-${resolvedStatus}`,
        `sg-progress-${progressSize}`,
        className,
      ].filter(Boolean).join(' ')}
      style={style}
      role="progressbar"
      aria-valuenow={clampedPercent}
    >
      <div className="sg-progress-outer">
        <div className="sg-progress-inner" style={{ height: barHeight }}>
          <div
            className="sg-progress-bg"
            style={{
              width: `${clampedPercent}%`,
              ...(strokeColor ? { background: strokeColor } : {}),
            }}
          />
        </div>
      </div>
      {showInfo && (
        <span className="sg-progress-text">{clampedPercent}%</span>
      )}
    </div>
  )
}
