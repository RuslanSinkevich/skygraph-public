import React from 'react'
import { useConfig } from '../ConfigProvider'
import type { BaseComponentProps } from '../../types'

/** Props for the Skeleton loading placeholder layout. */
export interface SkeletonProps extends BaseComponentProps {
  /** Enables a shimmering animation on placeholders. @default false */
  active?: boolean
  /** Shows an avatar block; pass an object for `size` and `shape`. */
  avatar?: boolean | { size?: number; shape?: 'circle' | 'square' }
  /** Shows a title bar; pass an object for custom `width`. @default true */
  title?: boolean | { width?: number | string }
  /** Shows paragraph lines; pass an object for `rows` and per-line `width`. @default true */
  paragraph?: boolean | { rows?: number; width?: Array<number | string> }
  /** When false, renders `children` instead of the skeleton. @default true */
  loading?: boolean
  /** Real content shown when `loading` is false. */
  children?: React.ReactNode
}

/**
 * Placeholder UI while content loads; supports avatar, title, and paragraph blocks.
 */
export function Skeleton({
  active = false,
  avatar,
  title = true,
  paragraph = true,
  loading = true,
  children,
  className,
  style,
  unstyled,
}: SkeletonProps) {
  const loadingLabel = useConfig().locale?.skeleton?.loading ?? 'Loading'
  if (!loading) return <>{children}</>

  const avatarSize = typeof avatar === 'object' ? (avatar.size ?? 40) : 40
  const avatarShape = typeof avatar === 'object' ? (avatar.shape ?? 'circle') : 'circle'
  const titleWidth = typeof title === 'object' ? (title.width ?? '38%') : '38%'
  const rows = typeof paragraph === 'object' ? (paragraph.rows ?? 3) : 3
  const rowWidths = typeof paragraph === 'object' ? paragraph.width : undefined

  const getRowWidth = (index: number, total: number): string | number => {
    if (rowWidths && rowWidths[index] !== undefined) return rowWidths[index]
    if (index === total - 1) return '61%'
    return '100%'
  }

  if (unstyled) {
    return (
      <div className={className} style={style} aria-busy="true" aria-label={loadingLabel}>
        {avatar && <div style={{ width: avatarSize, height: avatarSize }} />}
        <div>
          {title && <div style={{ width: titleWidth, height: 16 }} />}
          {paragraph &&
            Array.from({ length: rows }, (_, i) => (
              <div key={i} style={{ width: getRowWidth(i, rows), height: 16 }} />
            ))}
        </div>
      </div>
    )
  }

  return (
    <div
      className={[
        'sg-skeleton',
        active ? 'sg-skeleton-active' : '',
        avatar ? 'sg-skeleton-with-avatar' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
      aria-busy="true"
      aria-label={loadingLabel}
    >
      {avatar && (
        <div className="sg-skeleton-header">
          <span
            className={['sg-skeleton-avatar', `sg-skeleton-avatar-${avatarShape}`].join(' ')}
            style={{ width: avatarSize, height: avatarSize }}
          />
        </div>
      )}
      <div className="sg-skeleton-content">
        {title && (
          <div
            className="sg-skeleton-title"
            style={{ width: typeof titleWidth === 'number' ? `${titleWidth}px` : titleWidth }}
          />
        )}
        {paragraph && (
          <ul className="sg-skeleton-paragraph">
            {Array.from({ length: rows }, (_, i) => {
              const w = getRowWidth(i, rows)
              return <li key={i} style={{ width: typeof w === 'number' ? `${w}px` : w }} />
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
