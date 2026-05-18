import type { CSSProperties, MouseEvent as ReactMouseEvent, ReactNode } from 'react'
import type { GraphEdge, GraphNode } from '@skygraph/core'

/**
 * Mini-toolbar entry rendered above a hovered `GraphNode` (from
 * `@skygraph/core`). The `onClick` receives the original node so handlers
 * can run engine mutations (e.g. `graph.removeNode(node.id)`) without
 * re-resolving by id.
 */
export interface NodeAction {
  /** Stable key — also the value reflected in `data-action-id`. */
  id: string
  /** Custom React content (icon / SVG); falls back to `label`. */
  icon?: ReactNode
  /** Label rendered next to / instead of the icon, also used as `aria-label`. */
  label?: string
  /** Click handler. */
  onClick: (node: GraphNode, event: ReactMouseEvent<HTMLButtonElement>) => void
  /**
   * Optional predicate hiding the action for some nodes. Re-evaluated on
   * every render so it can react to per-node `data` changes.
   */
  hidden?: (node: GraphNode) => boolean
}

/** Same shape as `NodeAction`, but rendered above a hovered edge. */
export interface EdgeAction {
  id: string
  icon?: ReactNode
  label?: string
  onClick: (edge: GraphEdge, event: ReactMouseEvent<HTMLButtonElement>) => void
  hidden?: (edge: GraphEdge) => boolean
}

interface NodeHoverActionsProps {
  node: GraphNode
  actions: readonly NodeAction[]
  /** Top-left of the hover anchor in *wrapper* (screen) coords, in px. */
  screenX: number
  screenY: number
  /** Width of the hovered node bbox in screen px (used to centre / clamp). */
  width: number
  unstyled?: boolean
  onPointerEnter?: () => void
  onPointerLeave?: () => void
}

/**
 * Floating mini-panel rendered above a hovered node. Lives in the wrapper
 * coordinate space (NOT inside the zoomed canvas) so its size stays
 * constant regardless of the diagram's zoom level.
 */
export function NodeHoverActions({
  node,
  actions,
  screenX,
  screenY,
  width,
  unstyled,
  onPointerEnter,
  onPointerLeave,
}: NodeHoverActionsProps) {
  const visible = actions.filter((a) => !a.hidden?.(node))
  if (visible.length === 0) return null

  const style: CSSProperties = {
    position: 'absolute',
    left: screenX + width / 2,
    top: screenY,
    transform: 'translate(-50%, calc(-100% - 8px))',
    pointerEvents: 'auto',
    zIndex: 5,
  }

  return (
    <div
      className={unstyled ? undefined : 'sg-diagram-hover-actions'}
      data-node-id={String(node.id)}
      style={style}
      onMouseEnter={onPointerEnter}
      onMouseLeave={onPointerLeave}
    >
      {visible.map((action) => (
        <button
          key={action.id}
          type="button"
          data-action-id={action.id}
          className={unstyled ? undefined : 'sg-diagram-hover-action'}
          aria-label={action.label ?? action.id}
          title={action.label}
          onMouseDown={(ev) => ev.stopPropagation()}
          onClick={(ev) => {
            ev.stopPropagation()
            action.onClick(node, ev)
          }}
        >
          {action.icon ?? action.label ?? action.id}
        </button>
      ))}
    </div>
  )
}

interface EdgeHoverActionsProps {
  edge: GraphEdge
  actions: readonly EdgeAction[]
  /** Mid-point of the edge in screen coords. */
  screenX: number
  screenY: number
  unstyled?: boolean
  onPointerEnter?: () => void
  onPointerLeave?: () => void
}

/** Floating mini-panel rendered next to a hovered edge mid-point. */
export function EdgeHoverActions({
  edge,
  actions,
  screenX,
  screenY,
  unstyled,
  onPointerEnter,
  onPointerLeave,
}: EdgeHoverActionsProps) {
  const visible = actions.filter((a) => !a.hidden?.(edge))
  if (visible.length === 0) return null

  const style: CSSProperties = {
    position: 'absolute',
    left: screenX,
    top: screenY,
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'auto',
    zIndex: 5,
  }

  return (
    <div
      className={unstyled ? undefined : 'sg-diagram-hover-actions'}
      data-edge-id={String(edge.id)}
      style={style}
      onMouseEnter={onPointerEnter}
      onMouseLeave={onPointerLeave}
    >
      {visible.map((action) => (
        <button
          key={action.id}
          type="button"
          data-action-id={action.id}
          className={unstyled ? undefined : 'sg-diagram-hover-action'}
          aria-label={action.label ?? action.id}
          title={action.label}
          onMouseDown={(ev) => ev.stopPropagation()}
          onClick={(ev) => {
            ev.stopPropagation()
            action.onClick(edge, ev)
          }}
        >
          {action.icon ?? action.label ?? action.id}
        </button>
      ))}
    </div>
  )
}
