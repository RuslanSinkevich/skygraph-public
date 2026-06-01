import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import type {
  CSSProperties,
  DragEvent as ReactDragEvent,
  ForwardedRef,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
  WheelEvent as ReactWheelEvent,
} from 'react'
import {
  routeOrthogonal,
  pointsToPath,
  pointsToRoundedPath,
  getBezierPath,
  resolveEdgeEndpoint,
} from '@skygraph/core'
import type { ResolvedEndpoint } from '@skygraph/core'
import type {
  AABB,
  EdgeEndpoint,
  GraphEdge,
  GraphEngine,
  GraphNode,
  GraphState,
  NodeId,
  Point,
} from '@skygraph/core'
import { printElement } from '../../../utils/print'
import type { PrintOptions, PrintableProp } from '../../../utils/print'
import {
  EdgeHoverActions,
  NodeHoverActions,
  type EdgeAction,
  type NodeAction,
} from './HoverActions'
import {
  nodesInBox,
  rectFromCorners,
  screenRectToWorld,
  selectionsEqual,
  toggleSelection,
  type ScreenRect,
} from './selection'

/** Imperative API of {@link Diagram}. */
export interface DiagramRef {
  /**
   * Открыть popup и вызвать window.print() на DOM-области диаграммы. Объекты
   * `customStyles` / `pageSize` / `orientation` мерджатся с тем, что пришло
   * через prop `printable`.
   */
  print: (opts?: PrintOptions) => void
}

/**
 * Per-node renderer. Receives the engine node and returns the React content
 * placed inside the absolutely-positioned wrapper. If omitted, a default
 * label (`node.id`) is rendered.
 */
export type DiagramNodeRenderer = (node: GraphNode) => ReactNode

/** Selection management mode for the diagram. */
export type DiagramSelectionMode = 'single' | 'multi' | 'lasso'

/**
 * Argument passed to {@link DiagramProps.onCanvasContextMenu} — combines
 * world-space and screen-space coordinates so consumers can position a
 * floating menu without re-projecting.
 */
export interface DiagramCanvasContextPoint {
  /** World-space x (matches `node.transform.x`). */
  x: number
  /** World-space y. */
  y: number
  /** Browser-screen x (`event.clientX`). */
  screenX: number
  /** Browser-screen y (`event.clientY`). */
  screenY: number
}

/**
 * Argument passed to {@link DiagramProps.onDropNode} when a draggable
 * HTML5 element is dropped on the canvas. Combines world-space
 * coordinates (already adjusted for pan / zoom) with the underlying
 * `DragEvent` so consumers can pull whatever payload they encoded.
 */
export interface DiagramDropPoint {
  /** World-space x where the cursor was released. */
  x: number
  /** World-space y where the cursor was released. */
  y: number
  /** Browser-screen x (`event.clientX`). */
  screenX: number
  /** Browser-screen y (`event.clientY`). */
  screenY: number
  /** The original native `DataTransfer` so the consumer can decode the payload. */
  dataTransfer: DataTransfer | null
}

export interface DiagramProps {
  /** GraphEngine driving the diagram (e.g. from `useGraph()`). */
  graph: GraphEngine
  /**
   * Snapshot of the graph state (from `useGraph().state`). Required so that
   * the component re-renders on every commit.
   */
  state: GraphState
  /** Width of the canvas; defaults to a flexible 100%. */
  width?: number | string
  /** Height of the canvas; defaults to 400. */
  height?: number | string
  /** Optional content renderer per node. */
  renderNode?: DiagramNodeRenderer
  /** Root wrapper className. */
  className?: string
  /** Root wrapper inline style. */
  style?: CSSProperties
  /** Drop the default `sg-diagram-*` class names. */
  unstyled?: boolean
  /**
   * Enable click-and-drag to move nodes. The handler receives the new
   * position in the parent's coordinate space and is expected to call
   * `graph.moveNode(...)` (the default handler does exactly this).
   *
   * Set `true` for the default behaviour, `false` (default) to disable,
   * or pass a custom function for richer drag logic (e.g. snap-to-grid,
   * permission checks).
   *
   * @default false
   */
  draggable?: boolean | ((id: NodeId, x: number, y: number) => void)
  /**
   * Enable mouse-wheel zoom (`Ctrl + wheel`) and pinch-zoom-style scaling.
   * The internal canvas is wrapped in a `<g>` / `<div>` whose CSS
   * transform reflects the current zoom factor.
   *
   * @default false
   */
  zoomable?: boolean
  /**
   * Enable panning. Plain mouse-wheel scrolls the canvas; the middle
   * mouse button drags it. `Ctrl + wheel` is reserved for zoom (when
   * `zoomable` is also on), so the two flags compose cleanly.
   *
   * @default false
   */
  panable?: boolean
  /**
   * Snap node coordinates to a grid of this size (world units). When set,
   * `moveNode` is called with rounded `(x, y)` and the wrapper picks up
   * the `sg-diagram-grid` class so a CSS background pattern renders.
   *
   * Pass `0` or `undefined` to disable.
   */
  snapToGrid?: number
  /**
   * When `true`, orthogonal edges receive the AABBs of every other node
   * as obstacles so the A*-based router can avoid them. Off by default to
   * keep the cheap L-route path the norm; opt in only when the diagram
   * tends to have crossings worth avoiding.
   *
   * Independent of `routing` per edge — edges with `routing !== 'orthogonal'`
   * ignore this flag.
   */
  routeAroundNodes?: boolean
  /**
   * Tuning knobs forwarded to the edge router. `gridSize` / `inflate` /
   * `maxNodes` only apply to `routing: 'orthogonal'` when
   * `routeAroundNodes` is on (see `routeOrthogonal` in `@skygraph/core`).
   *
   *   • `cornerRadius` — radius of rounded corners on orthogonal
   *     edges. Defaults to `8` world units. Pass `0` for sharp
   *     right-angle corners.
   *   • `curvature` — control-handle intensity for `routing: 'bezier'`.
   *     Defaults to React Flow's `0.25`. Range: `0..1`.
   */
  routingOptions?: {
    gridSize?: number
    inflate?: number
    maxNodes?: number
    cornerRadius?: number
    curvature?: number
    /**
     * Where the central bend of an orthogonal edge sits between the
     * two perpendicular stubs:
     *   - `0`   → bend at the source
     *   - `0.5` → midpoint (default — matches React Flow's smoothstep)
     *   - `1`   → bend at the target
     */
    stepPosition?: number
    /**
     * Length of the perpendicular stub extending from each endpoint
     * before the connector turns. Defaults to `max(20, gridSize)`,
     * matching React Flow's `offset = 20`.
     */
    stubLength?: number
  }
  /**
   * When `true`, every rendered edge gets an arrow marker on its target
   * end (matches the visual norm of mainstream diagram libraries).
   * The marker reuses the edge stroke colour through `currentColor`
   * so hover / selected styles propagate automatically.
   *
   * @default true
   */
  edgeArrows?: boolean
  /**
   * Включает поддержку печати через `ref.print()`. Если `true` — без
   * визуальных изменений; объект `{ fileName }` задаёт имя popup-окна
   * (используется как title и дефолт для "Save as PDF").
   *
   * Сама печать триггерится императивно через `ref.print()`.
   * @default false
   */
  printable?: PrintableProp

  /**
   * Right-click on a node — fired with the original mouse event and the
   * engine node. If defined, the component calls `event.preventDefault()`
   * and the browser's native context menu is suppressed. If omitted, the
   * native menu shows as usual.
   */
  onNodeContextMenu?: (event: ReactMouseEvent<HTMLDivElement>, node: GraphNode) => void
  /**
   * Right-click on an edge path. Same suppression contract as
   * {@link DiagramProps.onNodeContextMenu}.
   */
  onEdgeContextMenu?: (event: ReactMouseEvent<SVGPathElement>, edge: GraphEdge) => void
  /**
   * Right-click on the empty canvas (i.e. neither a node nor an edge).
   * The point combines world and screen coordinates so a floating menu
   * can be positioned without re-projection.
   */
  onCanvasContextMenu?: (
    event: ReactMouseEvent<HTMLDivElement>,
    point: DiagramCanvasContextPoint,
  ) => void

  /**
   * Mini-toolbar entries shown above a hovered node. The overlay is
   * rendered in screen-space, so its size stays constant under
   * pan / zoom. Show / hide use a 200 ms enter delay and 150 ms leave
   * grace so the cursor can hop from the node to the overlay.
   */
  nodeActions?: readonly NodeAction[]
  /** Same as {@link DiagramProps.nodeActions} but rendered next to a hovered edge. */
  edgeActions?: readonly EdgeAction[]

  /**
   * Controlled selection: array of selected node ids. Pair with
   * {@link DiagramProps.onSelectionChange}. If left undefined, the
   * component manages selection internally (uncontrolled).
   */
  selection?: readonly NodeId[]
  /** Initial selection for the uncontrolled mode. */
  defaultSelection?: readonly NodeId[]
  /** Fired whenever the selection changes (both controlled and uncontrolled). */
  onSelectionChange?: (selection: NodeId[]) => void
  /**
   * - `'single'` (default) — legacy behaviour; no multi-select, no lasso.
   * - `'multi'` — `Ctrl+click` toggles selection; dragging a selected
   *   node moves all selected together.
   * - `'lasso'` — same as `'multi'` plus a left-button drag on empty
   *   canvas opens a rubber-band rectangle selecting nodes whose AABBs
   *   intersect it.
   *
   * Defaults to `'single'` for backwards compatibility — existing drag
   * code keeps working unchanged.
   */
  selectionMode?: DiagramSelectionMode

  /**
   * Fired when an HTML5 drag-and-drop ends on the canvas. The handler
   * receives world-space coordinates (already adjusted for pan / zoom)
   * plus the raw `DataTransfer` so the consumer can decode whatever
   * payload it set on `dragStart`.
   *
   * The wrapper automatically wires `onDragOver = preventDefault` so
   * drop targets work without extra config. Passing `undefined` leaves
   * the canvas inert.
   */
  onDropNode?: (point: DiagramDropPoint) => void
  /**
   * Comma-separated list of MIME types accepted by the canvas. When the
   * dragged payload doesn't include any of these types, the drop is
   * ignored (the cursor falls back to "no-drop"). Defaults to
   * `['application/x-sg-node']` — the convention used by Skygraph
   * palette items. Pass `'*'` (string) or `null` to accept everything.
   */
  dropTypes?: readonly string[] | '*' | null
}

interface ViewState {
  zoom: number
  panX: number
  panY: number
}

function defaultRenderNode(node: GraphNode): ReactNode {
  return <span className="sg-diagram-node-label">{node.id}</span>
}

/**
 * Default corner radius for rounded orthogonal corners. Matches the
 * value React Flow uses (`5px`) which gives a visible smoothing
 * without rounding the path into mush.
 */
const ORTHOGONAL_CORNER_RADIUS = 8

/**
 * Visual gap between the arrowhead tip and the node border. ~8 world
 * units matches the typical `border-radius` on shape nodes so arrows
 * never clip the rounded corner, and gives the marker enough breathing
 * room to read as a distinct glyph instead of merging into the node
 * border. Two endpoints in a row × 8 = 16 — well below the smallest
 * sensible node-to-node gap in any realistic layout.
 */
const ENDPOINT_PADDING = 8

/**
 * Pure-geometry endpoint resolution — port of React Flow's
 * `getNodeIntersection` (which itself derives from mxGraph's
 * `mxPerimeter.RectanglePerimeter`). The connection point is the
 * intersection between the centre-to-centre segment and the node's
 * bounding rectangle, with a small outward `padding` for the marker.
 *
 * **Anchors from `GraphEdge.from / to` are intentionally ignored at
 * the render layer.** They remain meaningful for the engine
 * (`graph.anchorsOf`, serialization) but the visual layer now follows
 * the floating-edges convention used by every mainstream diagram
 * library (xyflow / mxGraph / draw.io). Dragging a node around the
 * canvas no longer produces the "wrong-side-of-the-box" /
 * "edge cuts through node body" artifacts the anchor-honouring
 * resolver leaked.
 */
function resolveEdgeEndpoints(
  sourceBox: AABB,
  targetBox: AABB,
): { source: ResolvedEndpoint; target: ResolvedEndpoint } {
  const source = resolveEdgeEndpoint(sourceBox, targetBox, ENDPOINT_PADDING)
  const target = resolveEdgeEndpoint(targetBox, sourceBox, ENDPOINT_PADDING)
  return { source, target }
}

/**
 * Mid-point of an edge for hover toolbar placement — keep it close to
 * the rendered path geometry by averaging the two resolved endpoint
 * points (post-padding), so the toolbar tracks the visual centre of
 * the edge as nodes are dragged around.
 */
function edgeMidpoint(
  graph: GraphEngine,
  ep: { from: EdgeEndpoint; to: EdgeEndpoint },
): Point | null {
  const sb = graph.boundsOf(ep.from.node)
  const tb = graph.boundsOf(ep.to.node)
  if (sb.w === 0 || tb.w === 0) return null
  const { source, target } = resolveEdgeEndpoints(sb, tb)
  return [(source.point[0] + target.point[0]) / 2, (source.point[1] + target.point[1]) / 2]
}

function buildEdgePath(
  edge: GraphEdge,
  source: ResolvedEndpoint,
  target: ResolvedEndpoint,
  obstacles: readonly AABB[] | undefined,
  sourceBounds: AABB | undefined,
  targetBounds: AABB | undefined,
  routerOpts: DiagramProps['routingOptions'],
): string {
  const start = source.point
  const end = target.point
  switch (edge.routing) {
    case 'orthogonal': {
      const points = routeOrthogonal(start, end, {
        obstacles,
        gridSize: routerOpts?.gridSize,
        inflate: routerOpts?.inflate,
        maxNodes: routerOpts?.maxNodes,
        sourceBounds,
        targetBounds,
        stepPosition: routerOpts?.stepPosition,
        stubLength: routerOpts?.stubLength,
      })
      return pointsToRoundedPath(points, routerOpts?.cornerRadius ?? ORTHOGONAL_CORNER_RADIUS)
    }
    case 'bezier': {
      return getBezierPath({
        source: start,
        sourceSide: source.side,
        target: end,
        targetSide: target.side,
        curvature: routerOpts?.curvature,
      })
    }
    case 'manual': {
      const wp = edge.waypoints ?? []
      return pointsToPath([start, ...wp, end])
    }
    case 'straight':
    default:
      return `M ${start[0]} ${start[1]} L ${end[0]} ${end[1]}`
  }
}

function unionBounds(boxes: AABB[]): AABB {
  if (boxes.length === 0) return { x: 0, y: 0, w: 0, h: 0 }
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const b of boxes) {
    if (b.x < x0) x0 = b.x
    if (b.y < y0) y0 = b.y
    if (b.x + b.w > x1) x1 = b.x + b.w
    if (b.y + b.h > y1) y1 = b.y + b.h
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

const HOVER_SHOW_DELAY_MS = 200
const HOVER_HIDE_GRACE_MS = 150

/**
 * Reactive diagram view: DOM nodes for shapes + an SVG overlay for edges.
 *
 * Capabilities:
 *   - Straight / orthogonal / manual edge routing (with optional A*
 *     obstacle-aware routing via `routeAroundNodes`)
 *   - Drag-and-drop with optional snap-to-grid; multi-drag when the
 *     dragged node is part of the current selection
 *   - Mouse-wheel zoom (`Ctrl+wheel`) and pan (plain wheel /
 *     middle-button drag)
 *   - Selection management: single / multi (Ctrl+click) / lasso
 *     (rubber-band on empty canvas)
 *   - Hover mini-toolbars (`nodeActions` / `edgeActions`) and right-click
 *     callbacks (`onNodeContextMenu` / `onEdgeContextMenu` /
 *     `onCanvasContextMenu`) for custom context menus
 */
function DiagramInner(
  {
    graph,
    state,
    width = '100%',
    height = 400,
    renderNode = defaultRenderNode,
    className,
    style,
    unstyled = false,
    draggable = false,
    zoomable = false,
    panable = false,
    snapToGrid,
    routeAroundNodes = false,
    routingOptions,
    printable,
    onNodeContextMenu,
    onEdgeContextMenu,
    onCanvasContextMenu,
    nodeActions,
    edgeActions,
    selection,
    defaultSelection,
    onSelectionChange,
    selectionMode = 'single',
    onDropNode,
    dropTypes,
    edgeArrows = true,
  }: DiagramProps,
  forwardedRef: ForwardedRef<DiagramRef>,
) {
  const nodes = useMemo(() => Array.from(state.nodes.values()), [state])
  const edges = useMemo(() => Array.from(state.edges.values()), [state])

  const allBounds = useMemo(() => nodes.map((n) => graph.boundsOf(n.id)), [nodes, graph])
  const canvasBounds = useMemo(() => unionBounds(allBounds), [allBounds])

  // Pre-index node bounds by id so each edge's obstacle list (which excludes
  // its own endpoint nodes) can be assembled in O(N) rather than O(N²).
  const boundsById = useMemo(() => {
    const m = new Map<NodeId, AABB>()
    nodes.forEach((n, i) => m.set(n.id, allBounds[i]!))
    return m
  }, [nodes, allBounds])

  const [view, setView] = useState<ViewState>({ zoom: 1, panX: 0, panY: 0 })

  const wrapperRef = useRef<HTMLDivElement>(null)

  // ─── Selection (controlled / uncontrolled) ────────────────────────────────
  const isSelectionControlled = selection !== undefined
  const [internalSelection, setInternalSelection] = useState<readonly NodeId[]>(
    () => defaultSelection ?? [],
  )
  const currentSelection = isSelectionControlled
    ? (selection as readonly NodeId[])
    : internalSelection
  const selectionSet = useMemo(() => new Set(currentSelection), [currentSelection])

  const onSelectionChangeRef = useRef(onSelectionChange)
  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange
  }, [onSelectionChange])

  const commitSelection = useCallback(
    (next: readonly NodeId[]) => {
      if (selectionsEqual(currentSelection, next)) return
      const arr = Array.isArray(next) ? (next as NodeId[]) : Array.from(next)
      if (!isSelectionControlled) setInternalSelection(arr)
      onSelectionChangeRef.current?.(arr)
    },
    [currentSelection, isSelectionControlled],
  )

  // Drop dropped/removed ids from the internal selection so it never holds
  // stale references after `removeNode`.
  useEffect(() => {
    if (isSelectionControlled) return
    const filtered = internalSelection.filter((id) => state.nodes.has(id))
    if (filtered.length !== internalSelection.length) {
      setInternalSelection(filtered)
      onSelectionChangeRef.current?.(filtered as NodeId[])
    }
  }, [isSelectionControlled, internalSelection, state])

  // ─── Print plumbing ───────────────────────────────────────────────────────
  const printOptionsFromProp = useMemo(() => {
    if (typeof printable === 'object' && printable !== null) {
      return { fileName: printable.fileName }
    }
    return {}
  }, [printable])

  const doPrint = useCallback(
    (opts?: PrintOptions) => {
      printElement(wrapperRef.current, { ...printOptionsFromProp, ...(opts ?? {}) })
    },
    [printOptionsFromProp],
  )

  useImperativeHandle(forwardedRef, () => ({ print: doPrint }), [doPrint])

  const wrapperClass = unstyled
    ? className
    : ['sg-diagram', snapToGrid ? 'sg-diagram-grid' : '', className].filter(Boolean).join(' ')

  const wrapperStyle: CSSProperties = {
    position: 'relative',
    width,
    height,
    overflow: 'hidden',
    // CSS variables consumed by `.sg-diagram-grid` so the visual grid
    // matches the snap step and follows the current pan / zoom.
    ...(snapToGrid
      ? ({
          '--sg-grid-size': `${snapToGrid * view.zoom}px`,
          backgroundPosition: `${view.panX}px ${view.panY}px`,
        } as CSSProperties)
      : null),
    ...style,
  }

  const canvasStyle: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    transform: `translate(${view.panX}px, ${view.panY}px) scale(${view.zoom})`,
    transformOrigin: '0 0',
    width: '100%',
    height: '100%',
  }

  // ─── Drag state (single + multi) ──────────────────────────────────────────
  //
  // The drag pipeline is built on Pointer Events rather than the older
  // mousedown / window-mousemove dance. The rationale:
  //
  //   • Pointer Events unify mouse / touch / pen so the same path
  //     handles trackpads, touchscreens, drawing tablets and Mac
  //     "right-click via two-finger tap" — these all delivered the
  //     mouse fallback erratically, which is the "не у всех работает"
  //     symptom users were hitting on Macs and tablets.
  //   • `setPointerCapture` guarantees `pointermove` / `pointerup`
  //     keep firing on the original target even if the cursor leaves
  //     the wrapper or the user releases over another window.
  //   • Browser drag-and-drop (HTML5 DnD) and Pointer Events never
  //     conflict on the same element — we already wire `onDragOver` /
  //     `onDrop` on the wrapper for palette → canvas drops.
  interface DragSession {
    primaryId: NodeId
    pointerId: number
    target: HTMLElement
    startX: number
    startY: number
    startZoom: number
    /** Per-node initial world position; iterated on every move. */
    members: Array<{ id: NodeId; x0: number; y0: number }>
    moved: boolean
  }
  const dragRef = useRef<DragSession | null>(null)
  const [draggingId, setDraggingId] = useState<NodeId | null>(null)

  /** Pointer movement (in CSS pixels) before a click "counts" as a drag. */
  const DRAG_THRESHOLD_PX = 0.5

  function applyMove(id: NodeId, x: number, y: number) {
    let nx = x
    let ny = y
    if (snapToGrid && snapToGrid > 0) {
      nx = Math.round(nx / snapToGrid) * snapToGrid
      ny = Math.round(ny / snapToGrid) * snapToGrid
    }
    if (typeof draggable === 'function') draggable(id, nx, ny)
    else graph.moveNode(id, nx, ny)
  }

  function handleNodePointerDown(id: NodeId) {
    return (e: ReactPointerEvent<HTMLDivElement>) => {
      // Left button only — middle is reserved for pan, right is context menu.
      // Touch / pen always report `button === 0`.
      if (e.button !== 0) return

      const node = graph.getNode(id)
      if (!node) return

      const multiCapable = selectionMode !== 'single'
      const isCtrl = e.ctrlKey || e.metaKey

      if (multiCapable && isCtrl) {
        // Toggle membership — never start a drag on Ctrl+click.
        e.preventDefault()
        e.stopPropagation()
        commitSelection(toggleSelection(currentSelection, id))
        return
      }

      // If the node is part of the active selection, drag the whole group;
      // otherwise drag just this one (and, in multi modes, replace the
      // selection with `[id]` so the visual cue tracks the focus).
      if (multiCapable) {
        if (!selectionSet.has(id)) commitSelection([id])
      }

      if (!draggable) return
      e.preventDefault()
      e.stopPropagation()

      const groupIds =
        multiCapable && selectionSet.has(id) ? Array.from(new Set([id, ...currentSelection])) : [id]
      const members = groupIds
        .map((mid) => {
          const n = graph.getNode(mid)
          return n ? { id: mid, x0: n.transform.x, y0: n.transform.y } : null
        })
        .filter((m): m is { id: NodeId; x0: number; y0: number } => m !== null)

      const target = e.currentTarget
      // Capture the pointer on the node element so subsequent
      // `pointermove` / `pointerup` keep reaching us even if the user
      // drags fast or releases outside the wrapper. Without capture,
      // touch pointers commonly "escape" once the finger leaves the
      // initial element bounds, which is the root cause of the "drag
      // freezes" reports on Android/iOS.
      try {
        target.setPointerCapture(e.pointerId)
      } catch {
        // Some browsers throw if the pointer is already released — the
        // session is still valid, we just lose capture; ignore.
      }

      dragRef.current = {
        primaryId: id,
        pointerId: e.pointerId,
        target,
        startX: e.clientX,
        startY: e.clientY,
        startZoom: view.zoom,
        members,
        moved: false,
      }
      setDraggingId(id)
    }
  }

  function handleNodePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const d = dragRef.current
    if (!d || d.pointerId !== e.pointerId) return
    const dx = (e.clientX - d.startX) / d.startZoom
    const dy = (e.clientY - d.startY) / d.startZoom
    if (!d.moved && (Math.abs(dx) > DRAG_THRESHOLD_PX || Math.abs(dy) > DRAG_THRESHOLD_PX)) {
      d.moved = true
    }
    // Group commits into a single transaction so undo restores the whole
    // multi-drag rather than one node at a time.
    if (d.members.length > 1) {
      graph.transaction(() => {
        for (const m of d.members) applyMove(m.id, m.x0 + dx, m.y0 + dy)
      })
    } else {
      const m = d.members[0]!
      applyMove(m.id, m.x0 + dx, m.y0 + dy)
    }
  }

  function endDrag(e: ReactPointerEvent<HTMLDivElement>) {
    const d = dragRef.current
    if (!d || d.pointerId !== e.pointerId) return
    try {
      d.target.releasePointerCapture(d.pointerId)
    } catch {
      // Already released — ignore.
    }
    dragRef.current = null
    setDraggingId(null)
  }

  // Safety net — if the component unmounts mid-drag, the captured
  // pointer would otherwise linger and the next click on the same
  // element would behave oddly.
  useEffect(() => {
    return () => {
      const d = dragRef.current
      if (d) {
        try {
          d.target.releasePointerCapture(d.pointerId)
        } catch {
          // pointer might already be gone — nothing to do
        }
        dragRef.current = null
      }
    }
  }, [])

  // ─── Wheel: zoom (Ctrl) / pan (plain) ────────────────────────────────────
  function handleWheel(e: ReactWheelEvent<HTMLDivElement>) {
    if (!zoomable && !panable) return
    if (zoomable && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
      setView((v) => ({
        ...v,
        zoom: Math.max(0.1, Math.min(10, v.zoom * factor)),
      }))
      return
    }
    if (panable) {
      e.preventDefault()
      setView((v) => ({
        ...v,
        panX: v.panX - e.deltaX,
        panY: v.panY - e.deltaY,
      }))
    }
  }

  // ─── Lasso state ──────────────────────────────────────────────────────────
  const [lasso, setLasso] = useState<ScreenRect | null>(null)
  const lassoRef = useRef<{
    startX: number
    startY: number
    initial: readonly NodeId[]
    additive: boolean
  } | null>(null)
  const boundsByIdRef = useRef(boundsById)
  useEffect(() => {
    boundsByIdRef.current = boundsById
  }, [boundsById])
  const viewRef = useRef(view)
  useEffect(() => {
    viewRef.current = view
  }, [view])

  // Wrapper-level pointer session (lasso OR middle-button pan). We
  // keep one session at a time — both gestures emit `pointerdown` from
  // the same target so swapping modes is just a discriminator.
  type WrapperSession =
    | { kind: 'lasso'; pointerId: number }
    | { kind: 'pan'; pointerId: number; startX: number; startY: number; panX: number; panY: number }
  const wrapperSessionRef = useRef<WrapperSession | null>(null)

  function startLasso(e: ReactPointerEvent<HTMLDivElement>) {
    const rect = wrapperRef.current?.getBoundingClientRect()
    if (!rect) return
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    e.preventDefault()
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // ignored — capture is best-effort
    }
    lassoRef.current = {
      startX: sx,
      startY: sy,
      initial: currentSelection,
      additive: e.shiftKey || e.ctrlKey || e.metaKey,
    }
    wrapperSessionRef.current = { kind: 'lasso', pointerId: e.pointerId }
    setLasso({ x: sx, y: sy, w: 0, h: 0 })
  }

  function startPan(e: ReactPointerEvent<HTMLDivElement>) {
    e.preventDefault()
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // ignored
    }
    wrapperSessionRef.current = {
      kind: 'pan',
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      panX: view.panX,
      panY: view.panY,
    }
  }

  // ─── Wrapper pointerdown: middle-pan / lasso / clear-selection ────────────
  function handleWrapperPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (panable && e.button === 1) {
      startPan(e)
      return
    }

    if (e.button !== 0) return

    // Empty-canvas left click — only meaningful when selection management
    // is active. The pointerdown originates on the wrapper / canvas, never
    // on a node (those stop propagation in `handleNodePointerDown`).
    if (selectionMode === 'lasso') {
      startLasso(e)
      return
    }
    if (selectionMode === 'multi' && currentSelection.length > 0) {
      // Shift / Ctrl preserve the current selection; plain click clears.
      if (!(e.shiftKey || e.ctrlKey || e.metaKey)) commitSelection([])
    }
  }

  function handleWrapperPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const s = wrapperSessionRef.current
    if (!s || s.pointerId !== e.pointerId) return
    if (s.kind === 'pan') {
      const dx = e.clientX - s.startX
      const dy = e.clientY - s.startY
      setView((v) => ({ ...v, panX: s.panX + dx, panY: s.panY + dy }))
      return
    }
    // lasso
    const r = wrapperRef.current?.getBoundingClientRect()
    const l = lassoRef.current
    if (!r || !l) return
    const cx = e.clientX - r.left
    const cy = e.clientY - r.top
    const screen = rectFromCorners(l.startX, l.startY, cx, cy)
    setLasso(screen)
    const world = screenRectToWorld(screen, viewRef.current)
    const hits = nodesInBox(boundsByIdRef.current, world)
    const next = l.additive ? Array.from(new Set([...l.initial, ...hits])) : hits
    commitSelection(next)
  }

  function handleWrapperPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    const s = wrapperSessionRef.current
    if (!s || s.pointerId !== e.pointerId) return
    try {
      e.currentTarget.releasePointerCapture(s.pointerId)
    } catch {
      // ignored
    }
    wrapperSessionRef.current = null
    if (s.kind === 'lasso') {
      lassoRef.current = null
      setLasso(null)
    }
  }

  // ─── HTML5 drag-and-drop (palette → canvas) ───────────────────────────────
  // The wrapper accepts drops by default — see `onDropNode` / `dropTypes`.
  // `dragover` MUST `preventDefault` for the browser to fire `drop` and
  // for the cursor to switch out of "no-drop".
  const acceptedTypes = useMemo<readonly string[] | null>(() => {
    if (dropTypes === '*' || dropTypes === null) return null
    if (dropTypes === undefined) return ['application/x-sg-node']
    return dropTypes
  }, [dropTypes])

  const dropEnabled = !!onDropNode

  function dragHasAcceptedType(e: ReactDragEvent<HTMLDivElement>): boolean {
    if (!acceptedTypes) return true
    const types = e.dataTransfer?.types
    if (!types || types.length === 0) return false
    for (const t of acceptedTypes) {
      // `types` is a DOMStringList in some browsers; `includes` works on the proxy too.
      for (let i = 0; i < types.length; i++) {
        if (types[i] === t) return true
      }
    }
    return false
  }

  function handleDragOver(e: ReactDragEvent<HTMLDivElement>) {
    if (!dropEnabled) return
    if (!dragHasAcceptedType(e)) return
    e.preventDefault()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
  }

  function handleDrop(e: ReactDragEvent<HTMLDivElement>) {
    if (!onDropNode) return
    if (!dragHasAcceptedType(e)) return
    e.preventDefault()
    const rect = wrapperRef.current?.getBoundingClientRect()
    if (!rect) return
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const wx = (sx - view.panX) / (view.zoom || 1)
    const wy = (sy - view.panY) / (view.zoom || 1)
    onDropNode({
      x: wx,
      y: wy,
      screenX: e.clientX,
      screenY: e.clientY,
      dataTransfer: e.dataTransfer,
    })
  }

  // ─── Context menu plumbing ────────────────────────────────────────────────
  function handleWrapperContextMenu(e: ReactMouseEvent<HTMLDivElement>) {
    if (!onCanvasContextMenu) return
    const rect = wrapperRef.current?.getBoundingClientRect()
    if (!rect) return
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const wx = (sx - view.panX) / (view.zoom || 1)
    const wy = (sy - view.panY) / (view.zoom || 1)
    e.preventDefault()
    onCanvasContextMenu(e, { x: wx, y: wy, screenX: e.clientX, screenY: e.clientY })
  }

  function handleNodeContextMenu(node: GraphNode) {
    return (e: ReactMouseEvent<HTMLDivElement>) => {
      // Always stop propagation so the wrapper-level handler doesn't also
      // fire and treat the node as if it were the canvas. We only suppress
      // the native menu when a per-node callback is registered.
      e.stopPropagation()
      if (!onNodeContextMenu) return
      e.preventDefault()
      onNodeContextMenu(e, node)
    }
  }

  function handleEdgeContextMenu(edge: GraphEdge) {
    return (e: ReactMouseEvent<SVGPathElement>) => {
      e.stopPropagation()
      if (!onEdgeContextMenu) return
      e.preventDefault()
      onEdgeContextMenu(e, edge)
    }
  }

  // ─── Hover overlays (nodes / edges) ───────────────────────────────────────
  const [hoveredNode, setHoveredNode] = useState<NodeId | null>(null)
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null)
  const nodeHoverShowTimer = useRef<number | null>(null)
  const nodeHoverHideTimer = useRef<number | null>(null)
  const edgeHoverShowTimer = useRef<number | null>(null)
  const edgeHoverHideTimer = useRef<number | null>(null)

  const clearTimer = (ref: React.MutableRefObject<number | null>) => {
    if (ref.current != null) {
      window.clearTimeout(ref.current)
      ref.current = null
    }
  }

  useEffect(() => {
    return () => {
      clearTimer(nodeHoverShowTimer)
      clearTimer(nodeHoverHideTimer)
      clearTimer(edgeHoverShowTimer)
      clearTimer(edgeHoverHideTimer)
    }
  }, [])

  const showNodeHover = (id: NodeId) => {
    clearTimer(nodeHoverHideTimer)
    if (hoveredNode === id) return
    clearTimer(nodeHoverShowTimer)
    nodeHoverShowTimer.current = window.setTimeout(() => {
      setHoveredNode(id)
      nodeHoverShowTimer.current = null
    }, HOVER_SHOW_DELAY_MS)
  }

  const hideNodeHover = () => {
    clearTimer(nodeHoverShowTimer)
    clearTimer(nodeHoverHideTimer)
    nodeHoverHideTimer.current = window.setTimeout(() => {
      setHoveredNode(null)
      nodeHoverHideTimer.current = null
    }, HOVER_HIDE_GRACE_MS)
  }

  const showEdgeHover = (id: string) => {
    clearTimer(edgeHoverHideTimer)
    if (hoveredEdge === id) return
    clearTimer(edgeHoverShowTimer)
    edgeHoverShowTimer.current = window.setTimeout(() => {
      setHoveredEdge(id)
      edgeHoverShowTimer.current = null
    }, HOVER_SHOW_DELAY_MS)
  }

  const hideEdgeHover = () => {
    clearTimer(edgeHoverShowTimer)
    clearTimer(edgeHoverHideTimer)
    edgeHoverHideTimer.current = window.setTimeout(() => {
      setHoveredEdge(null)
      edgeHoverHideTimer.current = null
    }, HOVER_HIDE_GRACE_MS)
  }

  // ─── Render — nodes / edges / overlays ────────────────────────────────────
  const hasNodeActions = !!nodeActions && nodeActions.length > 0
  const hasEdgeActions = !!edgeActions && edgeActions.length > 0
  const edgesInteractive = !!onEdgeContextMenu || hasEdgeActions

  const hoveredNodeRecord = hoveredNode != null ? (state.nodes.get(hoveredNode) ?? null) : null
  const hoveredNodeBounds = hoveredNode != null ? (boundsById.get(hoveredNode) ?? null) : null

  const hoveredEdgeRecord = hoveredEdge != null ? (state.edges.get(hoveredEdge) ?? null) : null
  const hoveredEdgeMid = useMemo(() => {
    if (!hoveredEdgeRecord) return null
    const mid = edgeMidpoint(graph, hoveredEdgeRecord)
    if (!mid) return null
    return { x: mid[0], y: mid[1] }
  }, [graph, hoveredEdgeRecord])

  return (
    <div
      ref={wrapperRef}
      className={wrapperClass}
      style={wrapperStyle}
      onWheel={zoomable || panable ? handleWheel : undefined}
      onPointerDown={
        panable || selectionMode === 'lasso' || selectionMode === 'multi'
          ? handleWrapperPointerDown
          : undefined
      }
      onPointerMove={panable || selectionMode === 'lasso' ? handleWrapperPointerMove : undefined}
      onPointerUp={panable || selectionMode === 'lasso' ? handleWrapperPointerUp : undefined}
      onPointerCancel={panable || selectionMode === 'lasso' ? handleWrapperPointerUp : undefined}
      onLostPointerCapture={
        panable || selectionMode === 'lasso' ? handleWrapperPointerUp : undefined
      }
      onContextMenu={onCanvasContextMenu ? handleWrapperContextMenu : undefined}
      onDragOver={dropEnabled ? handleDragOver : undefined}
      onDrop={dropEnabled ? handleDrop : undefined}
      data-selection-mode={selectionMode}
      data-sg-drop={dropEnabled ? 'true' : undefined}
    >
      <div
        className={unstyled ? undefined : 'sg-diagram-canvas'}
        style={canvasStyle}
        data-zoom={view.zoom}
        data-pan-x={view.panX}
        data-pan-y={view.panY}
      >
        <svg
          className={unstyled ? undefined : 'sg-diagram-edges'}
          width={Math.max(canvasBounds.w + canvasBounds.x, 0) || '100%'}
          height={Math.max(canvasBounds.h + canvasBounds.y, 0) || '100%'}
          style={{
            position: 'absolute',
            inset: 0,
            // The SVG layer never grabs pointer events itself — only
            // its child `path[data-edge-hit]` elements opt in via
            // `pointer-events: stroke` so nodes underneath stay
            // interactive across edge gaps.
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        >
          {/*
           * Marker defs — open-V arrowhead designed in `strokeWidth`
           * units so the arrow always reads as a natural extension of
           * the path stroke (instead of looking like a glued-on
           * triangle). The shape is two strokes that meet at `(0, 0)`,
           * which is also the marker's `refX`/`refY` anchor — that
           * means the marker tip touches the path's endpoint exactly,
           * so the routing layer can leave a clean `ENDPOINT_PADDING`
           * gap between the path and the node border and the arrow
           * lands inside that gap.
           *
           * `markerUnits="strokeWidth"` is the key knob: it scales the
           * arrow with the stroke, so hover (which thickens the line)
           * also enlarges the arrowhead — visual cue-stack matching
           * React Flow, draw.io and Lucidchart.
           *
           * `context-stroke` makes the arrow inherit the line's
           * colour. The CSS fallback (`fill: currentColor`) keeps
           * Firefox and older Safari rendering the right colour.
           */}
          {edgeArrows && (
            <defs>
              <marker
                id="sg-diagram-arrow"
                viewBox="-10 -10 20 20"
                refX="0"
                refY="0"
                markerWidth="12"
                markerHeight="12"
                orient="auto-start-reverse"
                markerUnits="strokeWidth"
              >
                <path
                  d="M -7 -5 L 0 0 L -7 5"
                  fill="none"
                  stroke="context-stroke"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="sg-diagram-arrow-fill"
                />
              </marker>
            </defs>
          )}
          {edges.map((edge) =>
            renderEdge(
              edge,
              boundsById,
              routeAroundNodes,
              routingOptions,
              edgesInteractive,
              edgeArrows,
              edgesInteractive ? handleEdgeContextMenu(edge) : undefined,
              hasEdgeActions ? () => showEdgeHover(String(edge.id)) : undefined,
              hasEdgeActions ? () => hideEdgeHover() : undefined,
            ),
          )}
        </svg>
        {nodes.map((node) => {
          const bounds = graph.boundsOf(node.id)
          const isSelected = selectionSet.has(node.id)
          const isDragging = draggingId === node.id
          const nodeClass = unstyled
            ? undefined
            : [
                'sg-diagram-node',
                `sg-diagram-node-${node.outline.kind}`,
                draggable ? 'sg-diagram-node-draggable' : '',
                isSelected ? 'sg-diagram-node-selected' : '',
              ]
                .filter(Boolean)
                .join(' ')
          return (
            <div
              key={node.id}
              data-node-id={node.id}
              data-selected={isSelected ? 'true' : undefined}
              data-sg-dragging={isDragging ? 'true' : undefined}
              className={nodeClass}
              style={{
                position: 'absolute',
                left: bounds.x,
                top: bounds.y,
                width: bounds.w,
                height: bounds.h,
                cursor: draggable ? (isDragging ? 'grabbing' : 'grab') : undefined,
                userSelect: draggable ? 'none' : undefined,
              }}
              onPointerDown={
                draggable || selectionMode !== 'single' ? handleNodePointerDown(node.id) : undefined
              }
              onPointerMove={draggable ? handleNodePointerMove : undefined}
              onPointerUp={draggable ? endDrag : undefined}
              onPointerCancel={draggable ? endDrag : undefined}
              onLostPointerCapture={draggable ? endDrag : undefined}
              onContextMenu={onNodeContextMenu ? handleNodeContextMenu(node) : undefined}
              onMouseEnter={hasNodeActions ? () => showNodeHover(node.id) : undefined}
              onMouseLeave={hasNodeActions ? () => hideNodeHover() : undefined}
            >
              {renderNode(node)}
            </div>
          )
        })}
      </div>

      {/* Hover overlays — live in the wrapper (screen-space), so size /
          font don't track zoom. */}
      {hasNodeActions && hoveredNodeRecord && hoveredNodeBounds && (
        <NodeHoverActions
          node={hoveredNodeRecord}
          actions={nodeActions!}
          screenX={view.panX + hoveredNodeBounds.x * view.zoom}
          screenY={view.panY + hoveredNodeBounds.y * view.zoom}
          width={hoveredNodeBounds.w * view.zoom}
          unstyled={unstyled}
          onPointerEnter={() => showNodeHover(hoveredNodeRecord.id)}
          onPointerLeave={() => hideNodeHover()}
        />
      )}

      {hasEdgeActions && hoveredEdgeRecord && hoveredEdgeMid && (
        <EdgeHoverActions
          edge={hoveredEdgeRecord}
          actions={edgeActions!}
          screenX={view.panX + hoveredEdgeMid.x * view.zoom}
          screenY={view.panY + hoveredEdgeMid.y * view.zoom}
          unstyled={unstyled}
          onPointerEnter={() => showEdgeHover(String(hoveredEdgeRecord.id))}
          onPointerLeave={() => hideEdgeHover()}
        />
      )}

      {/* Lasso rubber band (only while dragging on empty canvas). */}
      {lasso && (
        <div
          className={unstyled ? undefined : 'sg-diagram-lasso'}
          style={{
            position: 'absolute',
            left: lasso.x,
            top: lasso.y,
            width: lasso.w,
            height: lasso.h,
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  )
}

function renderEdge(
  edge: GraphEdge,
  boundsById: ReadonlyMap<NodeId, AABB>,
  routeAroundNodes: boolean,
  routerOpts: DiagramProps['routingOptions'],
  interactive: boolean,
  arrows: boolean,
  onContextMenu: ((e: ReactMouseEvent<SVGPathElement>) => void) | undefined,
  onMouseEnter: (() => void) | undefined,
  onMouseLeave: (() => void) | undefined,
): ReactNode {
  const sBox = boundsById.get(edge.from.node)
  const tBox = boundsById.get(edge.to.node)
  if (!sBox || !tBox) return null

  // Pure-geometry floating endpoints — see `resolveEdgeEndpoint` in
  // `@skygraph/core`. Source/target each get the same outward padding
  // so the arrowhead sits in a symmetric visual gap and the line never
  // overlaps the node border.
  const { source, target } = resolveEdgeEndpoints(sBox, tBox)

  // Build the obstacle list (every node except this edge's two endpoints).
  // We only do this for `orthogonal` routing AND only when `routeAroundNodes`
  // is on — straight/manual ignore it.
  let obstacles: AABB[] | undefined
  if (routeAroundNodes && edge.routing === 'orthogonal') {
    const skip = new Set<NodeId>([edge.from.node, edge.to.node])
    obstacles = []
    for (const [id, bb] of boundsById) {
      if (!skip.has(id)) obstacles.push(bb)
    }
  }

  // No bounds are passed to the orthogonal router any more: the
  // resolver already placed the endpoints OUTSIDE the boxes
  // (padded by ENDPOINT_PADDING), so the router shouldn't re-derive
  // "exit through nearest side" — doing so on top of an already-
  // outside-the-box point produced visible loops around the source
  // node (visible on the OrthogonalRouting demo in v1).
  const d = buildEdgePath(edge, source, target, obstacles, undefined, undefined, routerOpts)

  const markerEnd = arrows ? 'url(#sg-diagram-arrow)' : undefined

  if (!interactive) {
    return (
      <path
        key={edge.id}
        d={d}
        className={`sg-diagram-edge sg-diagram-edge-${edge.routing}`}
        fill="none"
        markerEnd={markerEnd}
        data-edge-id={edge.id}
        data-obstacle-count={obstacles ? obstacles.length : 0}
      />
    )
  }

  return (
    <g key={edge.id} data-edge-id={edge.id}>
      {/* Wide invisible underlay for easier hit-testing on the thin edge. */}
      <path
        d={d}
        className="sg-diagram-edge-hit"
        fill="none"
        stroke="transparent"
        strokeWidth={16}
        data-edge-hit="true"
        style={{ pointerEvents: 'stroke', cursor: onContextMenu ? 'context-menu' : undefined }}
        onContextMenu={onContextMenu}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      />
      <path
        d={d}
        className={`sg-diagram-edge sg-diagram-edge-${edge.routing}`}
        fill="none"
        markerEnd={markerEnd}
        data-edge-id={edge.id}
        data-obstacle-count={obstacles ? obstacles.length : 0}
        style={{ pointerEvents: 'none' }}
      />
    </g>
  )
}

/**
 * Reactive diagram view (forwardRef-обёртка над `DiagramInner`). Обновлять
 * данные нужно через `graph` / `state`; для печати — `ref.print()`.
 */
export const Diagram = forwardRef<DiagramRef, DiagramProps>(DiagramInner)
Diagram.displayName = 'Diagram'

export type { NodeAction, EdgeAction } from './HoverActions'
