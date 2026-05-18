import React from 'react'
import type { BaseComponentProps, SizableProps } from '../../types'

/** Props for the Badge component (count, dot, or status ribbon). */
export interface BadgeProps extends BaseComponentProps, SizableProps {
  /** Numeric value shown in the badge; hidden when zero unless `showZero`. */
  count?: number
  /** Renders a small dot indicator instead of a numeric count. */
  dot?: boolean
  /** Maximum count before showing `{overflowCount}+`. @default 99 */
  overflowCount?: number
  /** When true, shows the badge even when `count` is zero. */
  showZero?: boolean
  /** Custom background color for the dot or count (CSS color). */
  color?: string
  /** Preset status style for standalone status badges. */
  status?: 'success' | 'error' | 'warning' | 'processing' | 'default'
  /** Text shown next to the status dot when `status` is set. */
  text?: React.ReactNode
  /** Pixel offset `[right, top]` for the dot or count position. */
  offset?: [number, number]
  /** Wrapped trigger element (e.g. icon or avatar). */
  children?: React.ReactNode
}

/**
 * Displays a notification count, dot, or status label on a child element.
 */
export function Badge({
  count,
  dot,
  overflowCount = 99,
  showZero,
  color,
  status,
  text,
  offset,
  children,
  className,
  style,
  unstyled,
}: BadgeProps) {
  const hasCount = count !== undefined && (count > 0 || showZero)
  const displayCount = hasCount ? (count! > overflowCount ? `${overflowCount}+` : `${count}`) : null

  if (unstyled) {
    return (
      <span
        className={className}
        style={{ position: 'relative', display: 'inline-block', ...style }}
      >
        {children}
        {(dot || hasCount) && <sup>{displayCount}</sup>}
        {status && <span>{text}</span>}
      </span>
    )
  }

  if (status && !children) {
    return (
      <span className={['sg-badge-status', className].filter(Boolean).join(' ')}>
        <span
          className={`sg-badge-status-dot sg-badge-status-${status}`}
          style={color ? { background: color } : undefined}
        />
        {text && <span className="sg-badge-status-text">{text}</span>}
      </span>
    )
  }

  const isStandalone = !children && (hasCount || dot)
  const offsetStyle: React.CSSProperties | undefined =
    offset && !isStandalone ? { right: -offset[0], marginTop: offset[1] } : undefined

  return (
    <span
      className={['sg-badge', isStandalone && 'sg-badge-standalone', className]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
      {dot && !hasCount && (
        <sup
          className="sg-badge-dot"
          style={{ ...offsetStyle, ...(color ? { background: color } : {}) }}
        />
      )}
      {hasCount && (
        <sup
          className="sg-badge-count"
          style={{ ...offsetStyle, ...(color ? { background: color } : {}) }}
          aria-label={displayCount ?? undefined}
        >
          {displayCount}
        </sup>
      )}
    </span>
  )
}
