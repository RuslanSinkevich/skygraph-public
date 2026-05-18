import React from 'react'
import type { BaseComponentProps } from '../../types'

/** One entry on the timeline axis (content, optional label, and marker styling). */
export interface TimelineItem {
  /** Main body content for this step. */
  children: React.ReactNode
  /** Border/text color for the default dot when no custom `dot` is set. */
  color?: string
  /** Custom marker node; replaces the default dot. */
  dot?: React.ReactNode
  /** Optional label rendered beside or above the marker. */
  label?: React.ReactNode
  /** Forces this item to the left or right side (overrides list `mode` for this index). */
  position?: 'left' | 'right'
}

/** Props for the vertical timeline list with optional pending tail. */
export interface TimelineProps extends BaseComponentProps {
  /** Ordered timeline steps. */
  items: TimelineItem[]
  /** Layout: fixed side, or alternating left/right per item. @default 'left' */
  mode?: 'left' | 'right' | 'alternate'
  /** When truthy, appends a pending item; if `true`, children of that item are empty. */
  pending?: React.ReactNode | boolean
  /** Marker for the synthetic pending item when `pending` is set. */
  pendingDot?: React.ReactNode
  /** When `true`, reverses the visual order of `items` (and pending). */
  reverse?: boolean
}

/**
 * Displays a chronological list with axis, dots, and optional pending state.
 */
export function Timeline({
  items: rawItems,
  mode = 'left',
  pending,
  pendingDot,
  reverse,
  className,
  style,
  unstyled,
}: TimelineProps) {
  let items = [...rawItems]

  if (pending) {
    items.push({
      children: typeof pending === 'boolean' ? null : pending,
      dot: pendingDot,
    })
  }

  if (reverse) items = items.reverse()

  const getPosition = (item: TimelineItem, index: number): 'left' | 'right' => {
    if (item.position) return item.position
    if (mode === 'alternate') return index % 2 === 0 ? 'left' : 'right'
    return mode
  }

  if (unstyled) {
    return (
      <ul className={className} style={style}>
        {items.map((item, i) => (
          <li key={i}>
            {item.label && <span>{item.label}</span>}
            <span>{item.dot ?? '●'}</span>
            <span>{item.children}</span>
          </li>
        ))}
      </ul>
    )
  }

  const isPending = !!pending

  return (
    <ul
      className={[
        'sg-timeline',
        `sg-timeline-${mode}`,
        className,
      ].filter(Boolean).join(' ')}
      style={style}
      role="list"
    >
      {items.map((item, i) => {
        const pos = getPosition(item, i)
        const isLast = i === items.length - 1
        const isPendingItem = isPending && isLast

        return (
          <li
            key={i}
            className={[
              'sg-timeline-item',
              `sg-timeline-item-${pos}`,
              isPendingItem ? 'sg-timeline-item-pending' : '',
            ].filter(Boolean).join(' ')}
            role="listitem"
          >
            {item.label !== undefined && (
              <div className="sg-timeline-item-label">{item.label}</div>
            )}
            <div className="sg-timeline-item-head-wrapper">
              <div
                className={[
                  'sg-timeline-item-head',
                  item.dot ? 'sg-timeline-item-head-custom' : '',
                ].filter(Boolean).join(' ')}
                style={item.color && !item.dot ? { borderColor: item.color, color: item.color } : undefined}
              >
                {item.dot}
              </div>
              {!isLast && <div className="sg-timeline-item-tail" />}
            </div>
            <div className="sg-timeline-item-content">{item.children}</div>
          </li>
        )
      })}
    </ul>
  )
}
