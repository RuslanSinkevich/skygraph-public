/**
 * Diagram types — Vue port of React's Diagram component.
 *
 * Kept in 1:1 parity with React (`packages/react/src/components/complex/
 * Diagram/Diagram.tsx`). New props introduced for parity with React
 * (routing, lasso, hover-actions, DnD, panable / zoomable, snap-to-grid,
 * routeAroundNodes, *ContextMenu) live alongside the legacy Vue-only
 * props (`draggableNodes`, `panZoom`, `selectedNodeIds`, `fileName`),
 * which remain as deprecated aliases.
 */
import type { CSSProperties } from 'vue'
import type { GraphEdge, GraphEngine, GraphNode, GraphState, NodeId } from '@skygraph/core'
import type { PrintOptions } from '../../../utils/print'

/** Selection management mode for the diagram. Mirrors React. */
export type DiagramSelectionMode = 'single' | 'multi' | 'lasso'

/**
 * Mini-toolbar entry rendered above a hovered node. The `onClick` receives
 * the original engine `GraphNode` plus the underlying MouseEvent.
 */
export interface DiagramNodeAction {
  id: string
  icon?: string
  label?: string
  onClick: (node: GraphNode, event: MouseEvent) => void
  hidden?: (node: GraphNode) => boolean
}

/** Same shape as {@link DiagramNodeAction} but for edges. */
export interface DiagramEdgeAction {
  id: string
  icon?: string
  label?: string
  onClick: (edge: GraphEdge, event: MouseEvent) => void
  hidden?: (edge: GraphEdge) => boolean
}

/** World+screen coordinates passed to `onCanvasContextMenu` / `canvas-context-menu`. */
export interface DiagramCanvasContextPoint {
  x: number
  y: number
  screenX: number
  screenY: number
}

/** World+screen coordinates passed to `onDropNode` / `drop-node`. */
export interface DiagramDropPoint {
  x: number
  y: number
  screenX: number
  screenY: number
  dataTransfer: DataTransfer | null
}

export interface DiagramProps {
  graph: GraphEngine
  state: GraphState
  width?: number | string
  height?: number | string
  unstyled?: boolean
  className?: string
  style?: CSSProperties

  /**
   * Enable click-and-drag to move nodes. `true`, `false`, or a custom
   * mover function. Parity with React's `draggable` prop. @default false
   */
  draggable?: boolean | ((id: NodeId, x: number, y: number) => void)

  /**
   * Enable mouse-wheel zoom (`Ctrl + wheel`). @default false
   */
  zoomable?: boolean

  /**
   * Enable panning (plain wheel scrolls, middle-button drags).
   * @default false
   */
  panable?: boolean

  /**
   * Snap node coordinates to a grid of this size (world units). Pass
   * `0` / `undefined` to disable.
   */
  snapToGrid?: number

  /**
   * When `true`, orthogonal edges receive the AABBs of every other node
   * as obstacles for the A* router. Off by default.
   */
  routeAroundNodes?: boolean

  /**
   * Tuning knobs forwarded to the edge router. `gridSize` / `inflate` /
   * `maxNodes` apply to `routing: 'orthogonal'`; `cornerRadius` controls
   * rounded orthogonal corners (default `8`, set `0` for sharp);
   * `curvature` controls `routing: 'bezier'` (default `0.25`).
   */
  routingOptions?: {
    gridSize?: number
    inflate?: number
    maxNodes?: number
    cornerRadius?: number
    curvature?: number
    /**
     * Where the central bend of an orthogonal edge sits between the
     * two perpendicular stubs (0 = at source, 0.5 = midpoint, 1 = at
     * target). Defaults to `0.5` (React Flow's smoothstep behaviour).
     */
    stepPosition?: number
    /**
     * Length of the perpendicular stub extending from each endpoint
     * before the connector turns. Defaults to `max(20, gridSize)`.
     */
    stubLength?: number
  }

  /**
   * Draw arrow markers on every edge's target end. Defaults to `true`
   * — matches the visual norm of mainstream diagram libraries. Pass
   * `false` for plain undirected lines.
   *
   * @default true
   */
  edgeArrows?: boolean

  /**
   * Selection management mode (parity with React).
   *  - `'single'` (default) — no multi-select, no lasso.
   *  - `'multi'` — `Ctrl+click` toggles selection.
   *  - `'lasso'` — same as `multi` plus rubber-band selection on empty
   *    canvas.
   */
  selectionMode?: DiagramSelectionMode

  /**
   * Controlled selection. Mirrors React's `selection` prop. Set this to
   * keep an external source of truth; otherwise the component manages
   * selection internally and emits `selectionChange` on every commit.
   *
   * `selectedNodeIds` is the legacy alias kept for backward compatibility
   * with existing Vue demos — when both are set, `selection` wins.
   */
  selection?: readonly NodeId[]
  /** @deprecated use `selection` (parity with React). */
  selectedNodeIds?: readonly NodeId[]
  /** Initial selection for the uncontrolled mode. */
  defaultSelection?: readonly NodeId[]

  /** Hover mini-toolbar above each node. */
  nodeActions?: readonly DiagramNodeAction[]
  /** Hover mini-toolbar next to each edge. */
  edgeActions?: readonly DiagramEdgeAction[]

  /**
   * Comma-separated list of MIME types accepted by the drop target.
   * Defaults to `['application/x-sg-node']`. Pass `'*'` (string) or
   * `null` to accept everything.
   */
  dropTypes?: readonly string[] | '*' | null

  /**
   * File name (without extension) used by `ref.print()`. @default 'diagram'
   */
  fileName?: string

  // ── Deprecated legacy aliases ─────────────────────────────────────────────
  /** @deprecated use `draggable` (parity with React). */
  draggableNodes?: boolean
  /** @deprecated use `panable` + `zoomable` (parity with React). */
  panZoom?: boolean
}

/**
 * Imperative ref API — mirrors React's `DiagramRef` exactly.
 */
export interface DiagramExpose {
  print: (opts?: PrintOptions) => void
}

export type DiagramNodeRenderProps = { node: GraphNode }
