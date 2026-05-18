import type { CSSProperties, MouseEvent as ReactMouseEvent, ReactNode } from 'react'

/**
 * One entry in the widget's hover-actions menu (`⋯` button at the
 * widget's top-right). Each widget may declare its own `actions`; if the
 * widget omits the field, `DashboardEditor` falls back to a default set
 * (see `DashboardEditorProps`'s `onWidgetRefresh` / `onWidgetSettings`
 * / `onWidgetRemove`).
 */
export interface WidgetAction {
  /** Stable id (used as React key + data-action-id). */
  id: string
  /** Visible label. */
  label: ReactNode
  /** Optional icon rendered before the label. */
  icon?: ReactNode
  /**
   * Click handler. Receives the widget the action is attached to. The
   * action menu closes automatically before the callback runs.
   */
  onClick: (widget: DashboardWidget) => void
  /** Visual variant. `danger` paints the row red. @default 'default' */
  variant?: 'default' | 'danger'
  /**
   * When the predicate returns `true`, the action is omitted from the
   * menu for this widget. Useful for context-sensitive actions
   * (e.g. hiding `Restore` when the widget isn't maximized).
   */
  hidden?: (widget: DashboardWidget) => boolean
}

/** A single widget pinned to a CSS-grid cell range. */
export interface DashboardWidget {
  /** Stable id (used as React key + data-widget-id). */
  id: string
  /** Display title (rendered in the widget header by default). */
  title?: ReactNode
  /** 1-based column index (`gridColumnStart`). */
  x: number
  /** 1-based row index (`gridRowStart`). */
  y: number
  /** Column span. @default 1 */
  w?: number
  /** Row span. @default 1 */
  h?: number
  /** Widget content. Either `children` or a `render` callback. */
  children?: ReactNode
  /** Optional renderer (alternative to `children`). */
  render?: () => ReactNode
  /** Optional className applied to the widget wrapper. */
  className?: string
  /** Optional inline style for the widget wrapper. */
  style?: CSSProperties
  /**
   * Optional per-widget hover actions. When omitted, `DashboardEditor`
   * synthesises a default set (`Refresh`, `Maximize`, `Settings`,
   * `Remove`) from the editor-level callbacks.
   *
   * Pass an empty array to opt out of the actions menu entirely while
   * still defining the field.
   */
  actions?: readonly WidgetAction[]
}

/** Callback fired when the user right-clicks a widget body. */
export type DashboardWidgetContextMenuHandler = (
  event: ReactMouseEvent<HTMLDivElement>,
  widget: DashboardWidget,
) => void

/** Callback fired when the user right-clicks the dashboard background. */
export type DashboardContextMenuHandler = (
  event: ReactMouseEvent<HTMLDivElement>,
) => void

/**
 * Common props shared by `Dashboard` and `DashboardEditor` for the
 * widget-actions / context-menu / maximize layer. Kept as a separate
 * type so the editor-only props (drag, resize, layout-change) don't
 * leak into the read-only `Dashboard`.
 */
export interface DashboardCommonProps {
  /**
   * Right-click handler for individual widgets. When provided, the
   * default browser menu is suppressed (`event.preventDefault()`) and
   * the callback receives the synthetic event + the widget data.
   *
   * Mirrors the convention used by `Diagram` for canvas/node menus.
   */
  onWidgetContextMenu?: DashboardWidgetContextMenuHandler
  /**
   * Right-click handler for the dashboard background (anywhere outside
   * a widget). When provided, the default browser menu is suppressed
   * and the callback receives the synthetic event.
   */
  onDashboardContextMenu?: DashboardContextMenuHandler
}
