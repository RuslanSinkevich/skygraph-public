import type { CSSProperties } from 'react'
import type {
  CalendarAvailabilityRule as AvailabilityRule,
  CalendarScale,
  CalendarConflict as Conflict,
} from '@skygraph/core'

/**
 * Public domain types for `<ResourceCalendar>` — re-shaped from the
 * `@skygraph/core/calendar` types so the public surface accepts both
 * `Date` and epoch-`number` for `start` / `end` (mirroring
 * `<Gantt>`).
 */

export interface Resource {
  id: string
  name: string
  /** Accent colour rendered alongside the resource label. */
  color?: string
  /** Maximum simultaneous assignments tolerated within one slot. */
  capacityPerSlot?: number
  /** Free-form metadata. The component ignores this. */
  meta?: unknown
}

export interface Assignment {
  id: string
  resourceId: string
  start: Date | number
  end: Date | number
  title: string
  status?: 'tentative' | 'confirmed' | 'conflict'
  meta?: unknown
}

export type { AvailabilityRule, CalendarScale, Conflict }

export interface ResourceCalendarProps {
  /** Resources rendered as horizontal lanes. */
  resources: readonly Resource[]
  /** Assignments rendered as positioned blocks. */
  assignments: readonly Assignment[]
  /** Optional availability rules — fed to the engine. */
  rules?: readonly AvailabilityRule[]
  /**
   * Time-axis granularity. Drives header ticks AND drag/resize snap.
   * @default 'week'
   */
  scale?: CalendarScale
  /**
   * Visible time window. If omitted, derived from `min(start)` /
   * `max(end)` of all assignments with one `scale`-step of padding.
   */
  range?: { from: Date; to: Date }
  /** Pixel width of one `scale` step. @default 120 */
  columnWidth?: number
  /** Lane / row height in pixels. @default 56 */
  rowHeight?: number
  /** Width of the left rail (resource list). @default 200 */
  sidebarWidth?: number
  /** Enables drag-to-move on assignment blocks. @default false */
  draggable?: boolean
  /** Enables drag on left/right edges of an assignment to resize. @default false */
  resizable?: boolean
  /**
   * Fires after an assignment was moved or resized. The original
   * object is left untouched — consumers patch their state from the
   * returned assignment.
   */
  onAssignmentChange?: (next: Assignment) => void
  /**
   * Fires after every internal recompute with the freshly detected
   * `Conflict[]`. Useful for surfacing badge counts / lists outside
   * the calendar.
   */
  onConflict?: (conflicts: Conflict[]) => void
  /** Drop default `sg-rcal-*` classes. @default false */
  unstyled?: boolean
  /** Root wrapper className. */
  className?: string
  /** Root wrapper inline style. */
  style?: CSSProperties
}
