import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import type {
  DashboardCommonProps,
  DashboardWidget,
  DashboardWidgetContextMenuHandler,
  WidgetAction,
} from './types'
import { useConfig } from '../../ConfigProvider'

export type {
  DashboardCommonProps,
  DashboardContextMenuHandler,
  DashboardWidget,
  DashboardWidgetContextMenuHandler,
  WidgetAction,
} from './types'

export interface DashboardProps extends DashboardCommonProps {
  /** Widgets pinned to grid cells. */
  widgets: readonly DashboardWidget[]
  /** Total grid columns. @default 12 */
  columns?: number
  /** Row height in pixels (uniform). @default 80 */
  rowHeight?: number
  /** Gap between cells in pixels. @default 16 */
  gap?: number
  /** Drop default `sg-dashboard-*` classes. */
  unstyled?: boolean
  /** Root wrapper className. */
  className?: string
  /** Root wrapper inline style. */
  style?: CSSProperties
}

/**
 * Minimal static-layout dashboard.
 *   - CSS Grid with `columns` columns and a uniform `rowHeight`.
 *   - Each widget pins to its `(x, y, w, h)` cell range.
 *   - Optional per-widget `actions` menu (`⋯` button on hover).
 *   - Optional `onWidgetContextMenu` / `onDashboardContextMenu` callbacks
 *     follow the same convention as `Diagram`: `preventDefault()` is
 *     only called when the consumer passed a handler.
 *
 * Drag / resize / auto-pack live in `DashboardEditor`, not here.
 */
export function Dashboard({
  widgets,
  columns = 12,
  rowHeight = 80,
  gap = 16,
  unstyled = false,
  className,
  style,
  onWidgetContextMenu,
  onDashboardContextMenu,
}: DashboardProps) {
  const dashboardLocale = useConfig().locale?.dashboard
  const [maximizedId, setMaximizedId] = useState<string | null>(null)

  const wrapperClass = unstyled ? className : ['sg-dashboard', className].filter(Boolean).join(' ')

  const gridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gridAutoRows: `${rowHeight}px`,
    gap,
    ...style,
  }

  const handleRootContextMenu = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!onDashboardContextMenu) return
    if (e.target !== e.currentTarget) return
    e.preventDefault()
    onDashboardContextMenu(e)
  }

  return (
    <div
      className={wrapperClass}
      style={gridStyle}
      role="region"
      aria-label={dashboardLocale?.ariaLabel ?? 'Dashboard'}
      onContextMenu={onDashboardContextMenu ? handleRootContextMenu : undefined}
    >
      {widgets.map((w) => (
        <DashboardWidgetView
          key={w.id}
          widget={w}
          unstyled={unstyled}
          isMaximized={maximizedId === w.id}
          totalColumns={columns}
          onWidgetContextMenu={onWidgetContextMenu}
          onToggleMaximize={() => setMaximizedId((cur) => (cur === w.id ? null : w.id))}
        />
      ))}
    </div>
  )
}

// ─── Internal widget view (also reused by DashboardEditor) ──────────────────

/**
 * Editor-only hooks plumbed into the shared widget view. Kept opaque
 * outside the package — `DashboardEditor` constructs this object;
 * `Dashboard` never does.
 */
export interface DashboardWidgetEditorBindings {
  editable: boolean
  showResizeHandle: boolean
  onPointerDownDragHandle?: (e: ReactPointerEvent<HTMLElement>, widget: DashboardWidget) => void
  onPointerDownResizeHandle?: (e: ReactPointerEvent<HTMLElement>, widget: DashboardWidget) => void
}

export interface DashboardWidgetViewProps {
  widget: DashboardWidget
  unstyled: boolean
  isMaximized: boolean
  totalColumns: number
  onWidgetContextMenu?: DashboardWidgetContextMenuHandler
  onToggleMaximize: () => void
  /** When set, render drag/resize hooks (used by `DashboardEditor`). */
  editor?: DashboardWidgetEditorBindings
  /**
   * Default actions injected by the parent when the widget itself
   * doesn't declare any. Currently only used by `DashboardEditor`.
   */
  defaultActions?: readonly WidgetAction[]
}

/**
 * Internal: renders a single widget cell. Owns the per-widget hover /
 * action-menu state so a hover on widget A doesn't re-render widget B.
 *
 * `Dashboard` and `DashboardEditor` both consume this view — the editor
 * passes `editor` bindings to enable drag and resize.
 */
export function DashboardWidgetView({
  widget,
  unstyled,
  isMaximized,
  totalColumns,
  onWidgetContextMenu,
  onToggleMaximize,
  editor,
  defaultActions,
}: DashboardWidgetViewProps) {
  const dashboardLocale = useConfig().locale?.dashboard
  const [hovered, setHovered] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const widgetClass = unstyled
    ? widget.className
    : ['sg-dashboard-widget', widget.className].filter(Boolean).join(' ')

  const widgetStyle: CSSProperties = isMaximized
    ? {
        gridColumn: `1 / span ${totalColumns}`,
        gridRow: `1 / span 6`,
        position: 'relative',
        zIndex: 5,
        ...widget.style,
      }
    : {
        gridColumn: `${widget.x} / span ${widget.w ?? 1}`,
        gridRow: `${widget.y} / span ${widget.h ?? 1}`,
        position: editor ? 'relative' : (widget.style?.position ?? 'relative'),
        ...widget.style,
      }

  const content = widget.children ?? widget.render?.() ?? null

  // Pick the actions list: per-widget overrides win; otherwise use the
  // parent-supplied defaults (editor mode); otherwise no menu. The
  // built-in `__maximize__` action flips its label to `Restore` while
  // the widget is in maximized state — easier than asking consumers to
  // track that flag themselves.
  const actions = useMemo<readonly WidgetAction[]>(() => {
    const raw = widget.actions ?? defaultActions ?? []
    return raw
      .filter((a) => !a.hidden?.(widget))
      .map((a) => (a.id === '__maximize__' && isMaximized ? { ...a, label: 'Restore' } : a))
  }, [widget, defaultActions, isMaximized])

  const hasActions = actions.length > 0

  const handleContextMenu = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!onWidgetContextMenu) return
    e.preventDefault()
    e.stopPropagation()
    onWidgetContextMenu(e, widget)
  }

  // The actions visibility flag is what tests assert against. We expose
  // it as `data-sg-actions` so consumers can also style on it without
  // recreating the hover-tracking themselves.
  const actionsVisible = hasActions && (hovered || menuOpen || isMaximized)

  return (
    <div
      className={widgetClass}
      style={widgetStyle}
      data-widget-id={widget.id}
      data-sg-maximized={isMaximized ? 'true' : undefined}
      data-sg-actions={hasActions ? (actionsVisible ? 'visible' : 'hidden') : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onContextMenu={onWidgetContextMenu ? handleContextMenu : undefined}
    >
      {(widget.title !== undefined || hasActions || editor) && (
        <div
          className={unstyled ? undefined : 'sg-dashboard-widget-header'}
          data-role={editor ? 'drag-handle' : undefined}
          onPointerDown={
            editor?.editable && editor.onPointerDownDragHandle
              ? (e) => editor.onPointerDownDragHandle?.(e, widget)
              : undefined
          }
          style={
            editor?.editable
              ? { touchAction: 'none', cursor: 'grab', userSelect: 'none' }
              : undefined
          }
        >
          <span className={unstyled ? undefined : 'sg-dashboard-widget-title'}>
            {widget.title ?? null}
          </span>
          {hasActions && (
            <WidgetActionsMenu
              widget={widget}
              actions={actions}
              unstyled={unstyled}
              open={menuOpen}
              onOpenChange={setMenuOpen}
              onActivateMaximize={onToggleMaximize}
            />
          )}
        </div>
      )}
      <div className={unstyled ? undefined : 'sg-dashboard-widget-body'}>{content}</div>
      {editor?.showResizeHandle && (
        <div
          className={unstyled ? undefined : 'sg-dashboard-editor-resize-handle'}
          data-role="resize-handle"
          role="button"
          aria-label={dashboardLocale?.resizeWidget ?? 'Resize widget'}
          tabIndex={-1}
          onPointerDown={
            editor.onPointerDownResizeHandle
              ? (e) => editor.onPointerDownResizeHandle?.(e, widget)
              : undefined
          }
          style={{ touchAction: 'none' }}
        >
          {!unstyled && (
            <span className="sg-dashboard-editor-resize-handle-grip" aria-hidden="true" />
          )}
        </div>
      )}
    </div>
  )
}

// ─── Internal action-menu popover ───────────────────────────────────────────

interface WidgetActionsMenuProps {
  widget: DashboardWidget
  actions: readonly WidgetAction[]
  unstyled: boolean
  open: boolean
  onOpenChange: (next: boolean) => void
  onActivateMaximize: () => void
}

/**
 * Anchored more-actions popover for a single widget. Opens on click,
 * closes on outside-click, Escape, or after an action runs. Keeps its
 * own DOM ref for outside-click detection.
 */
function WidgetActionsMenu({
  widget,
  actions,
  unstyled,
  open,
  onOpenChange,
  onActivateMaximize,
}: WidgetActionsMenuProps) {
  const dashboardLocale = useConfig().locale?.dashboard
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onDocClick = (ev: MouseEvent) => {
      if (!wrapperRef.current) return
      if (!wrapperRef.current.contains(ev.target as Node)) onOpenChange(false)
    }
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onOpenChange])

  const runAction = useCallback(
    (action: WidgetAction) => {
      onOpenChange(false)
      // The built-in `Maximize` action is wired through the parent so
      // that toggling state survives outside the menu's lifecycle.
      if (action.id === '__maximize__') {
        onActivateMaximize()
        return
      }
      action.onClick(widget)
    },
    [widget, onOpenChange, onActivateMaximize],
  )

  const triggerCls = unstyled ? undefined : 'sg-dashboard-widget-more'
  const menuCls = unstyled ? undefined : 'sg-dashboard-widget-actions-menu'

  return (
    <div
      ref={wrapperRef}
      className={unstyled ? undefined : 'sg-dashboard-widget-actions'}
      data-role="widget-actions"
      // Stop pointerdown on the trigger from starting an editor drag.
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className={triggerCls}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={dashboardLocale?.widgetActions ?? 'Widget actions'}
        data-role="widget-more-button"
        onClick={(e) => {
          e.stopPropagation()
          onOpenChange(!open)
        }}
      >
        <MoreIcon />
      </button>
      {open && (
        <div className={menuCls} role="menu" data-role="widget-actions-menu">
          {actions.map((a) => {
            const itemCls = unstyled
              ? undefined
              : [
                  'sg-dashboard-widget-actions-item',
                  a.variant === 'danger' ? 'sg-dashboard-widget-actions-item-danger' : '',
                ]
                  .filter(Boolean)
                  .join(' ')
            return (
              <button
                key={a.id}
                type="button"
                role="menuitem"
                className={itemCls}
                data-action-id={a.id}
                onClick={(ev) => {
                  ev.stopPropagation()
                  runAction(a)
                }}
              >
                {a.icon !== undefined && (
                  <span className={unstyled ? undefined : 'sg-dashboard-widget-actions-icon'}>
                    {a.icon}
                  </span>
                )}
                <span>{a.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function MoreIcon(): ReactNode {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="3" cy="8" r="1.4" />
      <circle cx="8" cy="8" r="1.4" />
      <circle cx="13" cy="8" r="1.4" />
    </svg>
  )
}
