/**
 * EventTimeline types — port of React's Timeline.
 */
import type { CSSProperties } from 'vue'

export interface TimelineEvent {
  id: string
  date: Date | number
  title: string
  description?: string
  color?: string
}

export type TimelineOrientation = 'horizontal' | 'vertical'
export type TimelineGroupBy = 'day' | 'month' | 'year'

export interface EventTimelineProps {
  events: readonly TimelineEvent[]
  orientation?: TimelineOrientation
  groupBy?: TimelineGroupBy
  unstyled?: boolean
  className?: string
  style?: CSSProperties
}
