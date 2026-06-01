<script setup lang="ts">
/**
 * `<SgDiagram>` — Vue port of `@skygraph/react` `Diagram`. DOM, class
 * names, props and emitted events are kept 1:1 with the React component
 * (`packages/react/src/components/complex/Diagram/Diagram.tsx`) so a
 * consumer can swap frameworks without rewriting the surrounding code.
 *
 * For backwards compatibility with the v0 Vue API, the following props /
 * events still work as aliases (see `decisions/T-Diagram-Polish.md` D2):
 *
 *   | Legacy                  | Modern (React parity)                   |
 *   |-------------------------|------------------------------------------|
 *   | `:draggable-nodes`      | `:draggable`                             |
 *   | `:pan-zoom`             | `:panable` + `:zoomable`                 |
 *   | `:selected-node-ids`    | `:selection`                             |
 *   | `@selection-change`     | (still emitted, now also `selectionChange`) |
 */
import { computed, getCurrentInstance, onBeforeUnmount, ref, watch } from 'vue'
import {
  resolveEdgeEndpoint,
  getBezierPath,
  pointsToPath,
  pointsToRoundedPath,
  routeOrthogonal,
  type AABB,
  type GraphEdge,
  type GraphNode,
  type NodeId,
  type ResolvedEndpoint,
} from '@skygraph/core'
import { printElement } from '../../../utils/print'
import type { PrintOptions } from '../../../utils/print'
import { useConfig } from '../../ui/ConfigProvider.vue'
import type {
  DiagramCanvasContextPoint,
  DiagramDropPoint,
  DiagramEdgeAction,
  DiagramNodeAction,
  DiagramProps,
} from './types'

const props = withDefaults(defineProps<DiagramProps>(), {
  width: '100%',
  height: 400,
  unstyled: false,
  // Defaults below match React (`Diagram.tsx`).
  draggable: false,
  zoomable: false,
  panable: false,
  routeAroundNodes: false,
  selectionMode: 'single',
  fileName: 'diagram',
  edgeArrows: true,
  // Legacy aliases default to undefined so we can detect "explicitly set".
})

/** Default corner radius for rounded orthogonal corners. */
const ORTHOGONAL_CORNER_RADIUS = 8
/**
 * Visual gap between the arrowhead tip and the node border. ~8 world
 * units matches the typical `border-radius` on shape nodes and the
 * `markerWidth` of the arrowhead, so the marker lands cleanly inside
 * the gap without biting into the node. Parity with React.
 */
const ENDPOINT_PADDING = 8
/** Movement threshold (CSS px) before a pointer interaction counts as a drag. */
const DRAG_THRESHOLD_PX = 0.5

const emit = defineEmits<{
  (e: 'node-click', payload: { id: NodeId; node: GraphNode; event: MouseEvent }): void
  (e: 'selection-change', ids: NodeId[]): void
  (e: 'selectionChange', ids: NodeId[]): void
  (e: 'drop-node', point: DiagramDropPoint): void
  (e: 'dropNode', point: DiagramDropPoint): void
  (e: 'node-context-menu', payload: { event: MouseEvent; node: GraphNode }): void
  (e: 'edge-context-menu', payload: { event: MouseEvent; edge: GraphEdge }): void
  (e: 'canvas-context-menu', payload: { event: MouseEvent; point: DiagramCanvasContextPoint }): void
}>()

defineSlots<{
  node?(props: { node: GraphNode }): unknown
}>()

const rootRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLDivElement | null>(null)

// ─── Legacy → modern prop reconciliation ───────────────────────────────────
const effectiveDraggable = computed<boolean | ((id: NodeId, x: number, y: number) => void)>(() => {
  if (typeof props.draggable === 'function') return props.draggable
  if (props.draggable) return true
  if (props.draggableNodes) return true
  return false
})
const effectivePanable = computed<boolean>(() => props.panable || !!props.panZoom)
const effectiveZoomable = computed<boolean>(() => props.zoomable || !!props.panZoom)

// ─── Selection (controlled / uncontrolled) ────────────────────────────────
const isControlled = computed(
  () => props.selection !== undefined || props.selectedNodeIds !== undefined,
)
const controlledIds = computed<readonly NodeId[]>(
  () => (props.selection ?? props.selectedNodeIds ?? []) as readonly NodeId[],
)
const internalSelection = ref<readonly NodeId[]>(props.defaultSelection ?? [])
const currentSelection = computed<readonly NodeId[]>(() =>
  isControlled.value ? controlledIds.value : internalSelection.value,
)
const selectionSet = computed(() => new Set(currentSelection.value))

function commitSelection(next: readonly NodeId[]) {
  if (selectionsEqual(currentSelection.value, next)) return
  const arr: NodeId[] = Array.isArray(next) ? (next as NodeId[]) : Array.from(next)
  if (!isControlled.value) internalSelection.value = arr
  emit('selection-change', arr)
  emit('selectionChange', arr)
}

function selectionsEqual(a: readonly NodeId[], b: readonly NodeId[]): boolean {
  if (a === b) return true
  if (a.length !== b.length) return false
  const sa = new Set(a)
  for (const id of b) if (!sa.has(id)) return false
  return true
}

// Drop dropped/removed ids from the internal selection.
watch(
  () => props.state,
  (s) => {
    if (isControlled.value) return
    const filtered = internalSelection.value.filter((id) => s.nodes.has(id))
    if (filtered.length !== internalSelection.value.length) {
      internalSelection.value = filtered
      emit('selection-change', filtered as NodeId[])
      emit('selectionChange', filtered as NodeId[])
    }
  },
)

// ─── View (pan / zoom) ─────────────────────────────────────────────────────
const view = ref({ panX: 0, panY: 0, zoom: 1 })

// ─── Graph snapshots ──────────────────────────────────────────────────────
const nodes = computed<GraphNode[]>(() => Array.from(props.state.nodes.values()))
const edges = computed<GraphEdge[]>(() => Array.from(props.state.edges.values()))

const allBounds = computed<AABB[]>(() => nodes.value.map((n) => props.graph.boundsOf(n.id)))
const boundsById = computed<Map<NodeId, AABB>>(() => {
  const m = new Map<NodeId, AABB>()
  nodes.value.forEach((n, i) => m.set(n.id, allBounds.value[i]!))
  return m
})

// ─── Edge geometry ─────────────────────────────────────────────────────────

/**
 * Pure-geometry floating endpoint pair — parity with the React adapter
 * which delegates to `resolveEdgeEndpoint` from `@skygraph/core`
 * (a port of xyflow / mxGraph). Anchor information from the engine is
 * intentionally ignored at the render layer; see the matching
 * comment in `Diagram.tsx` for the rationale.
 */
function resolveEdgePair(
  sourceBox: AABB,
  targetBox: AABB,
): { source: ResolvedEndpoint; target: ResolvedEndpoint } {
  return {
    source: resolveEdgeEndpoint(sourceBox, targetBox, ENDPOINT_PADDING),
    target: resolveEdgeEndpoint(targetBox, sourceBox, ENDPOINT_PADDING),
  }
}

function buildEdgePath(
  edge: GraphEdge,
  source: ResolvedEndpoint,
  target: ResolvedEndpoint,
  obstacles: readonly AABB[] | undefined,
  sourceBounds: AABB | undefined,
  targetBounds: AABB | undefined,
): string {
  const start = source.point
  const end = target.point
  switch (edge.routing) {
    case 'orthogonal': {
      const pts = routeOrthogonal(start, end, {
        obstacles,
        gridSize: props.routingOptions?.gridSize,
        inflate: props.routingOptions?.inflate,
        maxNodes: props.routingOptions?.maxNodes,
        sourceBounds,
        targetBounds,
        stepPosition: props.routingOptions?.stepPosition,
        stubLength: props.routingOptions?.stubLength,
      })
      return pointsToRoundedPath(
        pts,
        props.routingOptions?.cornerRadius ?? ORTHOGONAL_CORNER_RADIUS,
      )
    }
    case 'bezier': {
      return getBezierPath({
        source: start,
        sourceSide: source.side,
        target: end,
        targetSide: target.side,
        curvature: props.routingOptions?.curvature,
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

interface RenderedEdge {
  id: string
  d: string
  routing: GraphEdge['routing']
  mid: { x: number; y: number } | null
  raw: GraphEdge
}

const renderedEdges = computed<RenderedEdge[]>(() => {
  const map = boundsById.value
  const out: RenderedEdge[] = []
  for (const edge of edges.value) {
    const sBox = map.get(edge.from.node)
    const tBox = map.get(edge.to.node)
    if (!sBox || !tBox) continue
    const { source, target } = resolveEdgePair(sBox, tBox)

    let obstacles: AABB[] | undefined
    if (props.routeAroundNodes && edge.routing === 'orthogonal') {
      const skip = new Set<NodeId>([edge.from.node, edge.to.node])
      obstacles = []
      for (const [id, bb] of map) {
        if (!skip.has(id)) obstacles.push(bb)
      }
    }
    // Resolved endpoints already sit OUTSIDE the bboxes (padded), so
    // we no longer pass source/target bounds to the router — letting
    // it re-derive an "exit side" on top of an outside-the-box point
    // produced loops around the source node.
    out.push({
      id: String(edge.id),
      d: buildEdgePath(edge, source, target, obstacles, undefined, undefined),
      routing: edge.routing,
      mid: {
        x: (source.point[0] + target.point[0]) / 2,
        y: (source.point[1] + target.point[1]) / 2,
      },
      raw: edge,
    })
  }
  return out
})

// ─── Drag state (Pointer Events) ──────────────────────────────────────────
//
// Pointer Events replaced the old `mousedown` + window-mousemove dance
// for parity with React. The win for Vue is the same: touchscreens,
// trackpads and pen tablets all funnel through one code path, and
// `setPointerCapture` guarantees pointermove / pointerup keep firing
// even after the cursor exits the wrapper.
interface DragSession {
  primaryId: NodeId
  pointerId: number
  target: HTMLElement
  startX: number
  startY: number
  startZoom: number
  members: Array<{ id: NodeId; x0: number; y0: number }>
  moved: boolean
}
let dragRef: DragSession | null = null
const draggingId = ref<NodeId | null>(null)

function applyMove(id: NodeId, x: number, y: number) {
  let nx = x
  let ny = y
  if (props.snapToGrid && props.snapToGrid > 0) {
    nx = Math.round(nx / props.snapToGrid) * props.snapToGrid
    ny = Math.round(ny / props.snapToGrid) * props.snapToGrid
  }
  const d = effectiveDraggable.value
  if (typeof d === 'function') d(id, nx, ny)
  else props.graph.moveNode(id, nx, ny)
}

function beginDrag(
  primaryId: NodeId,
  members: Array<{ id: NodeId; x0: number; y0: number }>,
  e: PointerEvent,
) {
  const target = e.currentTarget as HTMLElement
  try {
    target.setPointerCapture(e.pointerId)
  } catch {
    // Best-effort — proceed without capture if the browser refuses.
  }
  dragRef = {
    primaryId,
    pointerId: e.pointerId,
    target,
    startX: e.clientX,
    startY: e.clientY,
    startZoom: view.value.zoom || 1,
    members,
    moved: false,
  }
  draggingId.value = primaryId
}

function onNodePointerMove(e: PointerEvent) {
  if (!dragRef || dragRef.pointerId !== e.pointerId) return
  const dx = (e.clientX - dragRef.startX) / dragRef.startZoom
  const dy = (e.clientY - dragRef.startY) / dragRef.startZoom
  if (!dragRef.moved && (Math.abs(dx) > DRAG_THRESHOLD_PX || Math.abs(dy) > DRAG_THRESHOLD_PX)) {
    dragRef.moved = true
  }
  if (dragRef.members.length > 1) {
    props.graph.transaction(() => {
      for (const m of dragRef!.members) applyMove(m.id, m.x0 + dx, m.y0 + dy)
    })
  } else {
    const m = dragRef.members[0]!
    applyMove(m.id, m.x0 + dx, m.y0 + dy)
  }
}

function endNodeDrag(e: PointerEvent) {
  if (!dragRef || dragRef.pointerId !== e.pointerId) return
  try {
    dragRef.target.releasePointerCapture(dragRef.pointerId)
  } catch {
    // Pointer might already be released — ignore.
  }
  dragRef = null
  draggingId.value = null
}

function toggleSelection(arr: readonly NodeId[], id: NodeId): NodeId[] {
  const idx = arr.indexOf(id)
  if (idx === -1) return [...arr, id]
  const next = arr.slice()
  next.splice(idx, 1)
  return next as NodeId[]
}

function onNodePointerDown(e: PointerEvent, node: GraphNode) {
  if (e.button !== 0) return
  const multiCapable = props.selectionMode !== 'single'
  const isCtrl = e.ctrlKey || e.metaKey

  if (multiCapable && isCtrl) {
    e.preventDefault()
    e.stopPropagation()
    commitSelection(toggleSelection(currentSelection.value, node.id))
    return
  }

  if (multiCapable) {
    if (!selectionSet.value.has(node.id)) commitSelection([node.id])
  }

  if (!effectiveDraggable.value) return
  e.preventDefault()
  e.stopPropagation()

  const groupIds =
    multiCapable && selectionSet.value.has(node.id)
      ? Array.from(new Set([node.id, ...currentSelection.value]))
      : [node.id]
  const members = groupIds
    .map((mid) => {
      const n = props.graph.getNode(mid)
      return n ? { id: mid, x0: n.transform.x, y0: n.transform.y } : null
    })
    .filter((m): m is { id: NodeId; x0: number; y0: number } => m !== null)

  beginDrag(node.id, members, e)
}

function onNodeClick(e: MouseEvent, node: GraphNode) {
  e.stopPropagation()
  emit('node-click', { id: node.id, node, event: e })
  if (props.selectionMode === 'single') {
    commitSelection([node.id])
    return
  }
  if (props.selectionMode === 'multi' && (e.ctrlKey || e.metaKey || e.shiftKey)) {
    commitSelection(toggleSelection(currentSelection.value, node.id))
    return
  }
  commitSelection([node.id])
}

// ─── Wheel: zoom / pan ─────────────────────────────────────────────────────
function onWheel(e: WheelEvent) {
  if (!effectiveZoomable.value && !effectivePanable.value) return
  if (effectiveZoomable.value && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
    view.value = {
      ...view.value,
      zoom: Math.max(0.1, Math.min(10, view.value.zoom * factor)),
    }
    return
  }
  if (effectivePanable.value) {
    e.preventDefault()
    view.value = {
      ...view.value,
      panX: view.value.panX - e.deltaX,
      panY: view.value.panY - e.deltaY,
    }
  }
}

// ─── Lasso ────────────────────────────────────────────────────────────────
interface ScreenRect {
  x: number
  y: number
  w: number
  h: number
}
const lasso = ref<ScreenRect | null>(null)
let lassoRef: {
  startX: number
  startY: number
  initial: readonly NodeId[]
  additive: boolean
} | null = null

function rectFromCorners(x0: number, y0: number, x1: number, y1: number): ScreenRect {
  return { x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0) }
}

function screenRectToWorld(r: ScreenRect): ScreenRect {
  const z = view.value.zoom || 1
  return {
    x: (r.x - view.value.panX) / z,
    y: (r.y - view.value.panY) / z,
    w: r.w / z,
    h: r.h / z,
  }
}

function aabbIntersects(a: AABB, b: ScreenRect): boolean {
  if (a.x + a.w < b.x) return false
  if (b.x + b.w < a.x) return false
  if (a.y + a.h < b.y) return false
  if (b.y + b.h < a.y) return false
  return true
}

function nodesInBox(world: ScreenRect): NodeId[] {
  const out: NodeId[] = []
  for (const [id, bb] of boundsById.value) {
    if (aabbIntersects(bb, world)) out.push(id)
  }
  return out
}

// Wrapper pointer session (lasso OR middle-button pan). One session
// at a time — both originate from the wrapper's `pointerdown`.
type WrapperSession =
  | { kind: 'lasso'; pointerId: number }
  | { kind: 'pan'; pointerId: number; startX: number; startY: number; panX: number; panY: number }
let wrapperSession: WrapperSession | null = null

function startLasso(e: PointerEvent) {
  const rect = rootRef.value?.getBoundingClientRect()
  if (!rect) return
  const sx = e.clientX - rect.left
  const sy = e.clientY - rect.top
  e.preventDefault()
  try {
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  } catch {
    // best-effort
  }
  lassoRef = {
    startX: sx,
    startY: sy,
    initial: currentSelection.value,
    additive: e.shiftKey || e.ctrlKey || e.metaKey,
  }
  wrapperSession = { kind: 'lasso', pointerId: e.pointerId }
  lasso.value = { x: sx, y: sy, w: 0, h: 0 }
}

function startPan(e: PointerEvent) {
  e.preventDefault()
  try {
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  } catch {
    // best-effort
  }
  wrapperSession = {
    kind: 'pan',
    pointerId: e.pointerId,
    startX: e.clientX,
    startY: e.clientY,
    panX: view.value.panX,
    panY: view.value.panY,
  }
}

// ─── Wrapper pointerdown: middle-pan / lasso / clear-selection ────────────
function onWrapperPointerDown(e: PointerEvent) {
  if (effectivePanable.value && e.button === 1) {
    startPan(e)
    return
  }

  if (e.button !== 0) return

  // Don't lasso when starting on a node.
  if ((e.target as HTMLElement).closest('[data-node-id]')) return

  if (props.selectionMode === 'lasso') {
    startLasso(e)
    return
  }
  if (props.selectionMode === 'multi' && currentSelection.value.length > 0) {
    if (!(e.shiftKey || e.ctrlKey || e.metaKey)) commitSelection([])
  }
}

function onWrapperPointerMove(e: PointerEvent) {
  if (!wrapperSession || wrapperSession.pointerId !== e.pointerId) return
  if (wrapperSession.kind === 'pan') {
    const s = wrapperSession
    view.value = {
      ...view.value,
      panX: s.panX + (e.clientX - s.startX),
      panY: s.panY + (e.clientY - s.startY),
    }
    return
  }
  const r = rootRef.value?.getBoundingClientRect()
  if (!r || !lassoRef) return
  const cx = e.clientX - r.left
  const cy = e.clientY - r.top
  const screen = rectFromCorners(lassoRef.startX, lassoRef.startY, cx, cy)
  lasso.value = screen
  const world = screenRectToWorld(screen)
  const hits = nodesInBox(world)
  const next = lassoRef.additive ? Array.from(new Set([...lassoRef.initial, ...hits])) : hits
  commitSelection(next)
}

function onWrapperPointerUp(e: PointerEvent) {
  if (!wrapperSession || wrapperSession.pointerId !== e.pointerId) return
  try {
    ;(e.currentTarget as HTMLElement).releasePointerCapture(wrapperSession.pointerId)
  } catch {
    // best-effort
  }
  if (wrapperSession.kind === 'lasso') {
    lassoRef = null
    lasso.value = null
  }
  wrapperSession = null
}

// ─── Canvas click — clear selection on empty space (single mode) ──────────
function onCanvasClick(e: MouseEvent) {
  if ((e.target as HTMLElement).closest('[data-node-id]')) return
  if (props.selectionMode === 'single' && currentSelection.value.length > 0) {
    commitSelection([])
  }
}

// ─── DnD (palette → canvas) ───────────────────────────────────────────────
// `dropEnabled` mirrors React's `dropEnabled = !!onDropNode` — we inspect
// the current Vue instance's attrs (`onDrop-node` is the kebab-cased
// listener, `onDropNode` is the camel form) so the canvas only goes into
// "drop target" mode when the parent actually listens.
const __instance = getCurrentInstance()
const cfg = useConfig()
const diagramLabel = computed(() => cfg.value.locale?.diagram?.ariaLabel ?? 'Diagram')
const dropEnabled = computed(() => {
  const attrs = __instance?.vnode?.props ?? {}
  return Boolean(
    (attrs as Record<string, unknown>)['onDrop-node'] ||
    (attrs as Record<string, unknown>).onDropNode,
  )
})

const acceptedTypes = computed<readonly string[] | null>(() => {
  if (props.dropTypes === '*' || props.dropTypes === null) return null
  if (props.dropTypes === undefined) return ['application/x-sg-node']
  return props.dropTypes
})

function dragHasAcceptedType(e: DragEvent): boolean {
  if (!acceptedTypes.value) return true
  const types = e.dataTransfer?.types
  if (!types || types.length === 0) return false
  for (const t of acceptedTypes.value) {
    for (let i = 0; i < types.length; i++) {
      if (types[i] === t) return true
    }
  }
  return false
}

function onDragOver(e: DragEvent) {
  if (!dragHasAcceptedType(e)) return
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
}

function onDrop(e: DragEvent) {
  if (!dragHasAcceptedType(e)) return
  e.preventDefault()
  const rect = rootRef.value?.getBoundingClientRect()
  if (!rect) return
  const sx = e.clientX - rect.left
  const sy = e.clientY - rect.top
  const wx = (sx - view.value.panX) / (view.value.zoom || 1)
  const wy = (sy - view.value.panY) / (view.value.zoom || 1)
  const payload: DiagramDropPoint = {
    x: wx,
    y: wy,
    screenX: e.clientX,
    screenY: e.clientY,
    dataTransfer: e.dataTransfer,
  }
  emit('drop-node', payload)
  emit('dropNode', payload)
}

// ─── Context menu ─────────────────────────────────────────────────────────
function onWrapperContextMenu(e: MouseEvent) {
  // Always stop the bubble from a node so the canvas handler doesn't fire
  // with a node-as-target.
  if ((e.target as HTMLElement).closest('[data-node-id]')) return
  e.preventDefault()
  const rect = rootRef.value?.getBoundingClientRect()
  if (!rect) return
  const sx = e.clientX - rect.left
  const sy = e.clientY - rect.top
  const wx = (sx - view.value.panX) / (view.value.zoom || 1)
  const wy = (sy - view.value.panY) / (view.value.zoom || 1)
  emit('canvas-context-menu', {
    event: e,
    point: { x: wx, y: wy, screenX: e.clientX, screenY: e.clientY },
  })
}

function onNodeContextMenu(e: MouseEvent, node: GraphNode) {
  e.stopPropagation()
  e.preventDefault()
  emit('node-context-menu', { event: e, node })
}

function onEdgeContextMenu(e: MouseEvent, edge: GraphEdge) {
  e.stopPropagation()
  e.preventDefault()
  emit('edge-context-menu', { event: e, edge })
}

// ─── Hover overlays (nodes / edges) ───────────────────────────────────────
const HOVER_SHOW_DELAY_MS = 200
const HOVER_HIDE_GRACE_MS = 150
const hoveredNode = ref<NodeId | null>(null)
const hoveredEdge = ref<string | null>(null)
let nodeHoverShowTimer: number | null = null
let nodeHoverHideTimer: number | null = null
let edgeHoverShowTimer: number | null = null
let edgeHoverHideTimer: number | null = null

function clearTimer(handle: number | null) {
  if (handle != null) window.clearTimeout(handle)
}

function showNodeHover(id: NodeId) {
  if (nodeHoverHideTimer != null) {
    clearTimer(nodeHoverHideTimer)
    nodeHoverHideTimer = null
  }
  if (hoveredNode.value === id) return
  if (nodeHoverShowTimer != null) clearTimer(nodeHoverShowTimer)
  nodeHoverShowTimer = window.setTimeout(() => {
    hoveredNode.value = id
    nodeHoverShowTimer = null
  }, HOVER_SHOW_DELAY_MS)
}
function hideNodeHover() {
  if (nodeHoverShowTimer != null) {
    clearTimer(nodeHoverShowTimer)
    nodeHoverShowTimer = null
  }
  if (nodeHoverHideTimer != null) clearTimer(nodeHoverHideTimer)
  nodeHoverHideTimer = window.setTimeout(() => {
    hoveredNode.value = null
    nodeHoverHideTimer = null
  }, HOVER_HIDE_GRACE_MS)
}
function showEdgeHover(id: string) {
  if (edgeHoverHideTimer != null) {
    clearTimer(edgeHoverHideTimer)
    edgeHoverHideTimer = null
  }
  if (hoveredEdge.value === id) return
  if (edgeHoverShowTimer != null) clearTimer(edgeHoverShowTimer)
  edgeHoverShowTimer = window.setTimeout(() => {
    hoveredEdge.value = id
    edgeHoverShowTimer = null
  }, HOVER_SHOW_DELAY_MS)
}
function hideEdgeHover() {
  if (edgeHoverShowTimer != null) {
    clearTimer(edgeHoverShowTimer)
    edgeHoverShowTimer = null
  }
  if (edgeHoverHideTimer != null) clearTimer(edgeHoverHideTimer)
  edgeHoverHideTimer = window.setTimeout(() => {
    hoveredEdge.value = null
    edgeHoverHideTimer = null
  }, HOVER_HIDE_GRACE_MS)
}
onBeforeUnmount(() => {
  clearTimer(nodeHoverShowTimer)
  clearTimer(nodeHoverHideTimer)
  clearTimer(edgeHoverShowTimer)
  clearTimer(edgeHoverHideTimer)
  // Release any pointer captures still in flight — without this a
  // mid-drag unmount could leave the captured pointer attached to the
  // detached element until the next click anywhere on the page.
  if (dragRef) {
    try {
      dragRef.target.releasePointerCapture(dragRef.pointerId)
    } catch {
      // pointer might already be gone
    }
    dragRef = null
  }
  wrapperSession = null
})

const hasNodeActions = computed(() => (props.nodeActions?.length ?? 0) > 0)
const hasEdgeActions = computed(() => (props.edgeActions?.length ?? 0) > 0)
const edgesInteractive = computed(() => hasEdgeActions.value)

const hoveredNodeRecord = computed<GraphNode | null>(() =>
  hoveredNode.value != null ? (props.state.nodes.get(hoveredNode.value) ?? null) : null,
)
const hoveredNodeBounds = computed<AABB | null>(() =>
  hoveredNode.value != null ? (boundsById.value.get(hoveredNode.value) ?? null) : null,
)
const hoveredEdgeRecord = computed<GraphEdge | null>(() =>
  hoveredEdge.value != null ? (props.state.edges.get(hoveredEdge.value) ?? null) : null,
)
const hoveredEdgeMid = computed<{ x: number; y: number } | null>(() => {
  if (!hoveredEdgeRecord.value) return null
  const sBox = boundsById.value.get(hoveredEdgeRecord.value.from.node)
  const tBox = boundsById.value.get(hoveredEdgeRecord.value.to.node)
  if (!sBox || !tBox) return null
  const { source, target } = resolveEdgePair(sBox, tBox)
  return {
    x: (source.point[0] + target.point[0]) / 2,
    y: (source.point[1] + target.point[1]) / 2,
  }
})

// ─── Canvas bounds (SVG sizing) ───────────────────────────────────────────
const canvasBounds = computed(() => {
  if (allBounds.value.length === 0) return { x: 0, y: 0, w: 0, h: 0 }
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const b of allBounds.value) {
    if (b.x < x0) x0 = b.x
    if (b.y < y0) y0 = b.y
    if (b.x + b.w > x1) x1 = b.x + b.w
    if (b.y + b.h > y1) y1 = b.y + b.h
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
})

const wrapperClass = computed(() =>
  props.unstyled
    ? [props.className].filter(Boolean)
    : ['sg-diagram', props.snapToGrid ? 'sg-diagram-grid' : '', props.className].filter(Boolean),
)

const wrapperStyle = computed(() => {
  const base: Record<string, string | number> = {
    position: 'relative',
    width: typeof props.width === 'number' ? `${props.width}px` : props.width,
    height: typeof props.height === 'number' ? `${props.height}px` : props.height,
    overflow: 'hidden',
  }
  if (props.snapToGrid) {
    base['--sg-grid-size' as keyof typeof base] = `${props.snapToGrid * view.value.zoom}px`
    base.backgroundPosition = `${view.value.panX}px ${view.value.panY}px`
  }
  return { ...base, ...(props.style ?? {}) }
})

const canvasStyle = computed(() => ({
  position: 'absolute' as const,
  top: 0,
  left: 0,
  transform: `translate(${view.value.panX}px, ${view.value.panY}px) scale(${view.value.zoom})`,
  transformOrigin: '0 0',
  width: '100%',
  height: '100%',
}))

function nodeClassFor(node: GraphNode): string[] {
  if (props.unstyled) return []
  const isSelected = selectionSet.value.has(node.id)
  const isDragging = draggingId.value === node.id
  return [
    'sg-diagram-node',
    `sg-diagram-node-${node.outline.kind}`,
    effectiveDraggable.value ? 'sg-diagram-node-draggable' : '',
    isSelected ? 'sg-diagram-node-selected' : '',
    // Legacy class kept for backward-compat with v0 selectors.
    isSelected ? 'sg-diagram-node--selected' : '',
    isDragging ? 'sg-diagram-node-dragging' : '',
  ].filter(Boolean)
}

function nodeStyleFor(node: GraphNode): Record<string, string | number | undefined> {
  const b = boundsById.value.get(node.id)
  if (!b) return {}
  const isDragging = draggingId.value === node.id
  return {
    position: 'absolute',
    left: `${b.x}px`,
    top: `${b.y}px`,
    width: `${b.w}px`,
    height: `${b.h}px`,
    cursor: effectiveDraggable.value ? (isDragging ? 'grabbing' : 'grab') : undefined,
    userSelect: effectiveDraggable.value ? 'none' : undefined,
  }
}

function visibleNodeActions(node: GraphNode): readonly DiagramNodeAction[] {
  return (props.nodeActions ?? []).filter((a) => !a.hidden?.(node))
}

function visibleEdgeActions(edge: GraphEdge): readonly DiagramEdgeAction[] {
  return (props.edgeActions ?? []).filter((a) => !a.hidden?.(edge))
}

defineExpose({
  print: (opts?: PrintOptions) => {
    if (!rootRef.value) return
    printElement(rootRef.value, {
      ...opts,
      fileName: opts?.fileName ?? props.fileName ?? 'diagram',
    })
  },
})
</script>

<template>
  <div
    ref="rootRef"
    :class="wrapperClass"
    :style="wrapperStyle"
    :data-selection-mode="props.selectionMode"
    :data-sg-drop="dropEnabled ? 'true' : undefined"
    role="application"
    :aria-label="diagramLabel"
    @wheel="effectiveZoomable || effectivePanable ? onWheel($event) : undefined"
    @pointerdown="onWrapperPointerDown"
    @pointermove="onWrapperPointerMove"
    @pointerup="onWrapperPointerUp"
    @pointercancel="onWrapperPointerUp"
    @lostpointercapture="onWrapperPointerUp"
    @contextmenu="onWrapperContextMenu"
    @dragover="dropEnabled ? onDragOver($event) : undefined"
    @drop="dropEnabled ? onDrop($event) : undefined"
  >
    <div
      ref="canvasRef"
      :class="props.unstyled ? undefined : 'sg-diagram-canvas'"
      :style="canvasStyle"
      :data-zoom="view.zoom"
      :data-pan-x="view.panX"
      :data-pan-y="view.panY"
      @click="onCanvasClick"
    >
      <svg
        :class="props.unstyled ? undefined : 'sg-diagram-edges'"
        :width="Math.max(canvasBounds.w + canvasBounds.x, 0) || '100%'"
        :height="Math.max(canvasBounds.h + canvasBounds.y, 0) || '100%'"
        :style="{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
        }"
        aria-hidden="true"
      >
        <!--
          Marker defs — open-V arrowhead in `strokeWidth` units so the
          arrow scales naturally with the line. `refX/refY = 0` puts the
          tip on the path's endpoint exactly, and the routing layer
          leaves an `ENDPOINT_PADDING` gap for the marker to sit in.
          Parity with React `Diagram.tsx`.
        -->
        <defs v-if="props.edgeArrows">
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
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="sg-diagram-arrow-fill"
            />
          </marker>
        </defs>
        <template v-for="ep in renderedEdges" :key="ep.id">
          <g v-if="edgesInteractive" :data-edge-id="ep.id">
            <path
              :d="ep.d"
              class="sg-diagram-edge-hit"
              fill="none"
              stroke="transparent"
              :stroke-width="16"
              data-edge-hit="true"
              :style="{ pointerEvents: 'stroke', cursor: 'context-menu' }"
              @contextmenu="onEdgeContextMenu($event, ep.raw)"
              @mouseenter="showEdgeHover(ep.id)"
              @mouseleave="hideEdgeHover()"
            />
            <path
              :d="ep.d"
              :class="`sg-diagram-edge sg-diagram-edge-${ep.routing}`"
              fill="none"
              :data-edge-id="ep.id"
              :marker-end="props.edgeArrows ? 'url(#sg-diagram-arrow)' : undefined"
              :style="{ pointerEvents: 'none' }"
            />
          </g>
          <path
            v-else
            :d="ep.d"
            :class="`sg-diagram-edge sg-diagram-edge-${ep.routing}`"
            fill="none"
            :data-edge-id="ep.id"
            :marker-end="props.edgeArrows ? 'url(#sg-diagram-arrow)' : undefined"
          />
        </template>
      </svg>

      <div
        v-for="node in nodes"
        :key="node.id"
        :data-node-id="node.id"
        :data-selected="selectionSet.has(node.id) ? 'true' : undefined"
        :data-sg-dragging="draggingId === node.id ? 'true' : undefined"
        :class="nodeClassFor(node)"
        :style="nodeStyleFor(node)"
        @pointerdown="onNodePointerDown($event, node)"
        @pointermove="effectiveDraggable ? onNodePointerMove($event) : undefined"
        @pointerup="effectiveDraggable ? endNodeDrag($event) : undefined"
        @pointercancel="effectiveDraggable ? endNodeDrag($event) : undefined"
        @lostpointercapture="effectiveDraggable ? endNodeDrag($event) : undefined"
        @click="onNodeClick($event, node)"
        @contextmenu="onNodeContextMenu($event, node)"
        @mouseenter="hasNodeActions ? showNodeHover(node.id) : undefined"
        @mouseleave="hasNodeActions ? hideNodeHover() : undefined"
      >
        <slot name="node" :node="node">{{ node.id }}</slot>
      </div>
    </div>

    <!-- Hover overlays — screen-space (constant size regardless of zoom). -->
    <div
      v-if="hasNodeActions && hoveredNodeRecord && hoveredNodeBounds"
      :class="props.unstyled ? undefined : 'sg-diagram-hover-actions'"
      :data-node-id="String(hoveredNodeRecord.id)"
      :style="{
        position: 'absolute',
        left: `${view.panX + (hoveredNodeBounds.x + hoveredNodeBounds.w / 2) * view.zoom}px`,
        top: `${view.panY + hoveredNodeBounds.y * view.zoom}px`,
        transform: 'translate(-50%, calc(-100% - 8px))',
        pointerEvents: 'auto',
        zIndex: 5,
      }"
      @mouseenter="showNodeHover(hoveredNodeRecord.id)"
      @mouseleave="hideNodeHover()"
    >
      <button
        v-for="action in visibleNodeActions(hoveredNodeRecord)"
        :key="action.id"
        type="button"
        :data-action-id="action.id"
        :class="props.unstyled ? undefined : 'sg-diagram-hover-action'"
        :aria-label="action.label ?? action.id"
        :title="action.label"
        @mousedown.stop
        @click.stop="action.onClick(hoveredNodeRecord!, $event)"
      >
        <template v-if="action.icon">{{ action.icon }}</template>
        <template v-else>{{ action.label ?? action.id }}</template>
      </button>
    </div>

    <div
      v-if="hasEdgeActions && hoveredEdgeRecord && hoveredEdgeMid"
      :class="props.unstyled ? undefined : 'sg-diagram-hover-actions'"
      :data-edge-id="String(hoveredEdgeRecord.id)"
      :style="{
        position: 'absolute',
        left: `${view.panX + hoveredEdgeMid.x * view.zoom}px`,
        top: `${view.panY + hoveredEdgeMid.y * view.zoom}px`,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'auto',
        zIndex: 5,
      }"
      @mouseenter="showEdgeHover(String(hoveredEdgeRecord.id))"
      @mouseleave="hideEdgeHover()"
    >
      <button
        v-for="action in visibleEdgeActions(hoveredEdgeRecord)"
        :key="action.id"
        type="button"
        :data-action-id="action.id"
        :class="props.unstyled ? undefined : 'sg-diagram-hover-action'"
        :aria-label="action.label ?? action.id"
        :title="action.label"
        @mousedown.stop
        @click.stop="action.onClick(hoveredEdgeRecord!, $event)"
      >
        <template v-if="action.icon">{{ action.icon }}</template>
        <template v-else>{{ action.label ?? action.id }}</template>
      </button>
    </div>

    <!-- Lasso rubber band. -->
    <div
      v-if="lasso"
      :class="props.unstyled ? undefined : 'sg-diagram-lasso'"
      :style="{
        position: 'absolute',
        left: `${lasso.x}px`,
        top: `${lasso.y}px`,
        width: `${lasso.w}px`,
        height: `${lasso.h}px`,
        pointerEvents: 'none',
      }"
    />
  </div>
</template>
