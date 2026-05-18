import type { CSSProperties, ReactNode } from 'react'

/** A single event placed on the timeline at a specific date. */
export interface TimelineEvent {
  /** Stable id (used as React key + `data-event-id`). */
  id: string
  /** Event date — `Date` or epoch ms. Drives positioning AND grouping. */
  date: Date | number
  /** Marker title (typically a short heading). */
  title: ReactNode
  /** Optional secondary description. Rendered below the title. */
  description?: ReactNode
  /** Optional dot fill colour. */
  color?: string
}

/** Visual orientation of the timeline track. */
export type TimelineOrientation = 'horizontal' | 'vertical'

/** Bucket boundary for the optional `groupBy` divider. */
export type TimelineGroupBy = 'day' | 'month' | 'year'

export interface EventTimelineProps {
  /** Events to render. */
  events: readonly TimelineEvent[]
  /**
   * Track orientation. Horizontal renders left-to-right with markers above
   * a baseline; vertical renders top-to-bottom (a la VCS commit list).
   * @default 'vertical'
   */
  orientation?: TimelineOrientation
  /**
   * Group consecutive events sharing the same `day` / `month` / `year`
   * bucket and render a divider between groups. Bucket boundary uses UTC.
   */
  groupBy?: TimelineGroupBy
  /**
   * Custom marker renderer. Receives the event and should return the dot
   * (or any shape) to render in place of the default circle.
   */
  renderMarker?: (event: TimelineEvent) => ReactNode
  /**
   * Custom event-content renderer. Receives the event and replaces the
   * default `title` + `description` block.
   */
  renderEvent?: (event: TimelineEvent) => ReactNode
  /** Drop default `sg-event-timeline-*` classes. @default false */
  unstyled?: boolean
  /** Root wrapper className. */
  className?: string
  /** Root wrapper inline style. */
  style?: CSSProperties
}
