import type { CSSProperties } from 'vue'

export interface GanttTask {
  id: string
  name: string
  start: Date | number
  end: Date | number
  progress?: number
  parentId?: string
  dependencies?: readonly string[]
  resourceId?: string
  color?: string
}

export interface GanttResource {
  id: string
  name: string
}

export type GanttScale = 'day' | 'week' | 'month' | 'quarter'

export interface GanttRange {
  from: Date
  to: Date
}

export interface GanttProps {
  tasks: readonly GanttTask[]
  resources?: readonly GanttResource[]
  scale?: GanttScale
  range?: GanttRange
  rowHeight?: number
  columnWidth?: number
  sidebarWidth?: number
  draggable?: boolean
  resizable?: boolean
  unstyled?: boolean
  className?: string
  style?: CSSProperties
}
