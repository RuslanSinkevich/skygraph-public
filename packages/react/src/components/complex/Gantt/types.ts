import type { CSSProperties } from 'react'

/** A single bar on the chart. `start` / `end` accept Date or epoch ms. */
export interface GanttTask {
  /** Stable id (used as React key + `data-task-id`). */
  id: string
  /** Label rendered inside the bar and in the left task list. */
  name: string
  /** Inclusive start of the task. `Date` or epoch milliseconds. */
  start: Date | number
  /** Exclusive end of the task. `Date` or epoch milliseconds. */
  end: Date | number
  /** Completion `0..1`. Renders an inner progress strip when set. */
  progress?: number
  /** Parent task id (for grouping / hierarchy). Reserved for v1+. */
  parentId?: string
  /** Ids of upstream tasks; renders a dependency arrow into this task. */
  dependencies?: string[]
  /** Lane id (matches a `GanttResource.id`) — task pinned to that lane. */
  resourceId?: string
  /** Solid fill colour for this bar. Falls back to a token. */
  color?: string
}

/** A horizontal lane (row) used to group tasks vertically. */
export interface GanttResource {
  /** Stable id (matched against `GanttTask.resourceId`). */
  id: string
  /** Display label for the left rail. */
  name: string
}

/** Time-axis granularity. Drives the header ticks AND drag/resize snap step. */
export type GanttScale = 'day' | 'week' | 'month' | 'quarter'

/** Inclusive `from` / exclusive `to` time window. Both as `Date`. */
export interface GanttRange {
  from: Date
  to: Date
}

export interface GanttProps {
  /** Tasks rendered as bars. Required. */
  tasks: readonly GanttTask[]
  /**
   * Lanes used for vertical grouping. If omitted, every task is rendered in
   * its own row in the order they appear in `tasks`.
   */
  resources?: readonly GanttResource[]
  /**
   * Time-axis granularity. Drives header ticks and the drag/resize snap step.
   * @default 'day'
   */
  scale?: GanttScale
  /**
   * Visible time window. If omitted, derived from the `min(start)` /
   * `max(end)` of all tasks (with one `scale`-step of padding on each side).
   */
  range?: GanttRange
  /** Row height in pixels. @default 32 */
  rowHeight?: number
  /** Pixel width of one `scale` step (one day, one week, ...). @default 40 */
  columnWidth?: number
  /** Width of the left rail (task / resource list). @default 200 */
  sidebarWidth?: number
  /**
   * Fires when a task was moved (drag) or resized. The original task object
   * is left untouched — consumers should patch their state from the returned
   * task.
   */
  onTaskChange?: (task: GanttTask) => void
  /** Enables click-and-drag to move bars along the time axis. @default false */
  draggable?: boolean
  /** Enables drag on the right edge of each bar to extend its `end`. @default false */
  resizable?: boolean
  /** Drop default `sg-gantt-*` classes. @default false */
  unstyled?: boolean
  /** Root wrapper className. */
  className?: string
  /** Root wrapper inline style. */
  style?: CSSProperties
}
