import type { CSSProperties } from 'vue'

/**
 * Local types for the Vue ResourceCalendar — intentionally simplified vs
 * the React source: drops availability-rule engine integration and conflict
 * detection. The calendar still detects naive overlap conflicts inline.
 */
export interface Resource {
  id: string
  name: string
  color?: string
  capacityPerSlot?: number
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

export type CalendarScale = 'day' | 'week' | 'month'

export interface ResourceCalendarProps {
  resources: readonly Resource[]
  assignments: readonly Assignment[]
  scale?: CalendarScale
  range?: { from: Date; to: Date }
  columnWidth?: number
  rowHeight?: number
  sidebarWidth?: number
  draggable?: boolean
  resizable?: boolean
  unstyled?: boolean
  className?: string
  style?: CSSProperties
}
