import type { Core } from '../../types'
import { GRAPH_PREFIX } from '../namespaces'
import { createHistory, HISTORY_LIMIT, type HistoryEntry, type GraphSnapshot } from './history'
import type {
  AABB,
  Anchor,
  AnchorId,
  AnchorPolicy,
  EdgeEndpoint,
  EdgeId,
  EdgeInit,
  GraphEdge,
  GraphEngine,
  GraphEngineOptions,
  GraphNode,
  GraphState,
  NodeId,
  NodeInit,
  NodeTransform,
  NodeUpdate,
  OBB,
  Outline,
  Point,
} from './types'

let engineCounter = 0

const DEFAULT_OUTLINE: Outline = { kind: 'rect', w: 100, h: 60 }
const DEFAULT_TRANSFORM: NodeTransform = { x: 0, y: 0 }
const DEFAULT_ANCHOR_POLICY: AnchorPolicy = { kind: 'perEdge', k: 1 }

/**
 * Reactive diagram engine — the fourth member of the form / table / tree /
 * **graph** family. State is mirrored into the Core store under `$graph.`
 * for cross-engine coordination, but the in-memory maps are the source of
 * truth and the public read API.
 *
 * v0 scope (initial Graph engine stream — see CHANGELOG):
 *   - Node / Edge model + parent hierarchy
 *   - addNode / removeNode / updateNode / moveNode / setParent
 *   - addEdge / removeEdge
 *   - anchor generator (perEdge / byLength / manual)
 *   - bounds computation (AABB, no rotation)
 *   - geomRevision bump on geometry-affecting updates
 *
 * NOT in v0:
 *   - orthogonal routing (with obstacle avoidance)
 *   - undo / redo (covered separately by `plugins/history`)
 *   - snap-to-grid, drag-and-drop palette
 *   - rotated bounding boxes (OBB)
 */
export function createGraph(core: Core, options?: GraphEngineOptions): GraphEngine {
  const engineId = `g${engineCounter++}${options?.name ? `-${options.name}` : ''}`
  const prefix = GRAPH_PREFIX

  const nodes = new Map<NodeId, GraphNode>()
  const edges = new Map<EdgeId, GraphEdge>()
  const edgesByNode = new Map<NodeId, Set<EdgeId>>()

  let nodeCounter = 0
  let edgeCounter = 0

  // ─── Persistence + local subscribers ──────────────────────────────────────
  //
  // We mirror snapshots into the Core store so other engines / external
  // observers can react via `core.subscribe(...)`. We ALSO maintain a small
  // local subscriber set that React adapters use directly — that avoids
  // having to know the engineId-suffixed path from the outside.

  const localSubscribers = new Set<() => void>()

  function publishSnapshot() {
    core.set(`${prefix}snapshot.${engineId}`, {
      nodes: Array.from(nodes.values()),
      edges: Array.from(edges.values()),
    })
    for (const cb of localSubscribers) cb()
  }

  function subscribeLocal(cb: () => void): () => void {
    localSubscribers.add(cb)
    return () => {
      localSubscribers.delete(cb)
    }
  }

  publishSnapshot() // initial empty snapshot

  // ─── History (undo/redo) ──────────────────────────────────────────────────
  //
  // The engine wraps every mutating public method in `_withHistory`. The
  // wrapper captures the engine state on the OUTERMOST call (so nested
  // mutations — e.g. `removeNode` -> `removeEdge` — only contribute one
  // history entry) and pushes the captured snapshot to the undo stack on
  // commit. `transaction(fn)` is the public form of the same primitive,
  // letting callers batch unrelated mutations into a single entry.
  //
  // Restoration (`undo`/`redo`) sets `isRestoring = true` to suppress
  // history capture inside `_restoreState`.

  const history = createHistory(HISTORY_LIMIT)
  let transactionDepth = 0
  let pendingEntry: HistoryEntry | null = null
  let isRestoring = false

  function _captureState(): GraphSnapshot {
    return {
      nodes: Array.from(nodes.values()),
      edges: Array.from(edges.values()),
      nodeCounter,
      edgeCounter,
    }
  }

  function _restoreState(snapshot: GraphSnapshot): void {
    nodes.clear()
    edges.clear()
    edgesByNode.clear()
    for (const n of snapshot.nodes) {
      nodes.set(n.id, n)
      edgesByNode.set(n.id, new Set())
    }
    for (const e of snapshot.edges) {
      edges.set(e.id, e)
      ensureBucket(endpointNode(e.from)).add(e.id)
      ensureBucket(endpointNode(e.to)).add(e.id)
    }
    nodeCounter = snapshot.nodeCounter
    edgeCounter = snapshot.edgeCounter
  }

  function _withHistory<T>(fn: () => T, label?: string): T {
    if (isRestoring) return fn()
    const wasOuter = transactionDepth === 0
    if (wasOuter) {
      pendingEntry = { snapshot: _captureState(), label }
    } else if (label !== undefined && pendingEntry && pendingEntry.label === undefined) {
      pendingEntry = { snapshot: pendingEntry.snapshot, label }
    }
    transactionDepth++
    try {
      return fn()
    } finally {
      transactionDepth--
      if (transactionDepth === 0 && wasOuter) {
        if (pendingEntry !== null) {
          history.push(pendingEntry)
          history.clearRedo()
        }
        pendingEntry = null
      }
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function newNodeId(): NodeId {
    return `${engineId}-n${nodeCounter++}`
  }

  function newEdgeId(): EdgeId {
    return `${engineId}-e${edgeCounter++}`
  }

  function ensureBucket(nodeId: NodeId): Set<EdgeId> {
    let bucket = edgesByNode.get(nodeId)
    if (!bucket) {
      bucket = new Set()
      edgesByNode.set(nodeId, bucket)
    }
    return bucket
  }

  function endpointNode(ep: EdgeEndpoint): NodeId {
    return ep.node
  }

  function bumpRevision(node: GraphNode): GraphNode {
    return { ...node, geomRevision: node.geomRevision + 1 }
  }

  // ─── Node operations ──────────────────────────────────────────────────────
  //
  // The `_impl` functions are the raw mutators. The exported `addNode` /
  // `removeNode` / ... wrap them in `_withHistory` so the public surface
  // automatically participates in undo/redo. Internal calls between
  // mutators (e.g. `removeNode` → `removeEdge`) go through the wrapped
  // form too, but `_withHistory` recognizes nested transactions and only
  // commits one entry.

  function _addNodeImpl(init: NodeInit = {}): NodeId {
    const id = init.id ?? newNodeId()
    if (nodes.has(id)) {
      throw new Error(`[skygraph/graph] node id "${id}" already exists`)
    }
    const node: GraphNode = {
      id,
      parentId: init.parentId ?? null,
      transform: init.transform ?? { ...DEFAULT_TRANSFORM },
      outline: init.outline ?? DEFAULT_OUTLINE,
      anchorPolicy: init.anchorPolicy ?? DEFAULT_ANCHOR_POLICY,
      data: init.data,
      geomRevision: 0,
    }
    nodes.set(id, node)
    edgesByNode.set(id, new Set())
    publishSnapshot()
    return id
  }

  function addNode(init: NodeInit = {}): NodeId {
    return _withHistory(() => _addNodeImpl(init))
  }

  function _removeNodeImpl(id: NodeId): void {
    if (!nodes.has(id)) return
    const incident = edgesByNode.get(id)
    if (incident) {
      for (const eid of incident) removeEdge(eid)
    }
    // re-parent any children to root (do not orphan them)
    for (const [otherId, n] of nodes) {
      if (n.parentId === id) {
        nodes.set(otherId, { ...n, parentId: null })
      }
    }
    nodes.delete(id)
    edgesByNode.delete(id)
    publishSnapshot()
  }

  function removeNode(id: NodeId): void {
    _withHistory(() => _removeNodeImpl(id))
  }

  function _updateNodeImpl(id: NodeId, patch: NodeUpdate): void {
    const node = nodes.get(id)
    if (!node) {
      throw new Error(`[skygraph/graph] node "${id}" not found`)
    }
    const next: GraphNode = {
      ...node,
      transform: patch.transform ? { ...node.transform, ...patch.transform } : node.transform,
      outline: patch.outline ?? node.outline,
      anchorPolicy: patch.anchorPolicy ?? node.anchorPolicy,
      data: patch.data === undefined ? node.data : patch.data,
    }
    const geomChanged =
      patch.transform !== undefined ||
      patch.outline !== undefined ||
      patch.anchorPolicy !== undefined
    nodes.set(id, geomChanged ? bumpRevision(next) : next)
    publishSnapshot()
  }

  function updateNode(id: NodeId, patch: NodeUpdate): void {
    _withHistory(() => _updateNodeImpl(id, patch))
  }

  function moveNode(id: NodeId, x: number, y: number): void {
    _withHistory(() => _updateNodeImpl(id, { transform: { x, y } }))
  }

  function _setParentImpl(id: NodeId, parentId: NodeId | null): void {
    const node = nodes.get(id)
    if (!node) {
      throw new Error(`[skygraph/graph] node "${id}" not found`)
    }
    if (parentId !== null && !nodes.has(parentId)) {
      throw new Error(`[skygraph/graph] parent node "${parentId}" not found`)
    }
    if (parentId === id) {
      throw new Error(`[skygraph/graph] node cannot be its own parent ("${id}")`)
    }
    // cycle check — walk up the chain to make sure we don't introduce a loop
    let cursor: NodeId | null = parentId
    while (cursor !== null) {
      if (cursor === id) {
        throw new Error(`[skygraph/graph] setParent would create a cycle ("${id}" → "${parentId}")`)
      }
      cursor = nodes.get(cursor)?.parentId ?? null
    }
    nodes.set(id, { ...node, parentId })
    publishSnapshot()
  }

  function setParent(id: NodeId, parentId: NodeId | null): void {
    _withHistory(() => _setParentImpl(id, parentId))
  }

  // ─── Edge operations ──────────────────────────────────────────────────────

  function _addEdgeImpl(init: EdgeInit): EdgeId {
    const id = init.id ?? newEdgeId()
    if (edges.has(id)) {
      throw new Error(`[skygraph/graph] edge id "${id}" already exists`)
    }
    const fromId = endpointNode(init.from)
    const toId = endpointNode(init.to)
    if (!nodes.has(fromId)) {
      throw new Error(`[skygraph/graph] addEdge: from-node "${fromId}" not found`)
    }
    if (!nodes.has(toId)) {
      throw new Error(`[skygraph/graph] addEdge: to-node "${toId}" not found`)
    }
    const edge: GraphEdge = {
      id,
      from: init.from,
      to: init.to,
      routing: init.routing ?? 'straight',
      waypoints: init.waypoints,
      data: init.data,
    }
    edges.set(id, edge)
    ensureBucket(fromId).add(id)
    ensureBucket(toId).add(id)
    publishSnapshot()
    return id
  }

  function addEdge(init: EdgeInit): EdgeId {
    return _withHistory(() => _addEdgeImpl(init))
  }

  function _removeEdgeImpl(id: EdgeId): void {
    const edge = edges.get(id)
    if (!edge) return
    edgesByNode.get(endpointNode(edge.from))?.delete(id)
    edgesByNode.get(endpointNode(edge.to))?.delete(id)
    edges.delete(id)
    publishSnapshot()
  }

  function removeEdge(id: EdgeId): void {
    _withHistory(() => _removeEdgeImpl(id))
  }

  // ─── Read API ─────────────────────────────────────────────────────────────

  function getNode(id: NodeId): GraphNode | undefined {
    return nodes.get(id)
  }

  function getEdge(id: EdgeId): GraphEdge | undefined {
    return edges.get(id)
  }

  function getState(): GraphState {
    const byNode = new Map<NodeId, readonly EdgeId[]>()
    for (const [nid, set] of edgesByNode) byNode.set(nid, Array.from(set))
    return {
      nodes: new Map(nodes),
      edges: new Map(edges),
      edgesByNode: byNode,
    }
  }

  function childrenOf(id: NodeId | null): NodeId[] {
    const out: NodeId[] = []
    for (const n of nodes.values()) {
      if (n.parentId === id) out.push(n.id)
    }
    return out
  }

  function edgesOf(id: NodeId): EdgeId[] {
    return Array.from(edgesByNode.get(id) ?? [])
  }

  // ─── Anchor generator ────────────────────────────────────────────────────
  //
  // Anchor IDs are deterministic functions of (outline kind, anchor policy).
  // Bumping `k` keeps existing anchors stable: corner ids never change, and
  // mid-edge anchor ids include the current `k` so callers can re-bind by
  // perimeter parameter `s` if they care about stability under k changes.

  function rectCornerId(corner: 'nw' | 'ne' | 'se' | 'sw'): AnchorId {
    return corner
  }

  function rectAnchors(w: number, h: number, policy: AnchorPolicy): Anchor[] {
    const corners: Anchor[] = [
      { id: rectCornerId('nw'), s: 0,    point: [0, 0] },
      { id: rectCornerId('ne'), s: 0.25, point: [w, 0] },
      { id: rectCornerId('se'), s: 0.5,  point: [w, h] },
      { id: rectCornerId('sw'), s: 0.75, point: [0, h] },
    ]
    if (policy.kind === 'manual') {
      return policy.anchors.map(a => ({
        id: a.id,
        s: a.s,
        point: pointOnRectPerimeter(w, h, a.s),
      }))
    }

    const k = policy.kind === 'perEdge' ? Math.max(0, Math.floor(policy.k)) : null
    const density = policy.kind === 'byLength' ? policy.density : null

    const out: Anchor[] = [...corners]
    // four edges, in clockwise order — n, e, s, w
    const edgesGeom: Array<{ start: number; end: number }> = [
      { start: 0,    end: 0.25 }, // top
      { start: 0.25, end: 0.5 },  // right
      { start: 0.5,  end: 0.75 }, // bottom
      { start: 0.75, end: 1 },    // left
    ]
    edgesGeom.forEach((edge, edgeIdx) => {
      let count = 0
      if (k !== null) count = k
      if (density !== null) {
        const len = edgeIdx % 2 === 0 ? w : h
        count = Math.max(0, Math.floor(len / density) - 1)
      }
      for (let i = 1; i <= count; i++) {
        const t = i / (count + 1)
        const s = edge.start + (edge.end - edge.start) * t
        out.push({
          id: `edge${edgeIdx}-${i}of${count}`,
          s,
          point: pointOnRectPerimeter(w, h, s),
        })
      }
    })
    out.sort((a, b) => a.s - b.s)
    return out
  }

  function pointOnRectPerimeter(w: number, h: number, s: number): Point {
    // s ∈ [0..1) traversing nw→ne→se→sw→nw
    const ss = ((s % 1) + 1) % 1
    if (ss < 0.25) return [w * (ss / 0.25), 0]
    if (ss < 0.5)  return [w, h * ((ss - 0.25) / 0.25)]
    if (ss < 0.75) return [w * (1 - (ss - 0.5) / 0.25), h]
    return [0, h * (1 - (ss - 0.75) / 0.25)]
  }

  function polygonAnchors(verts: readonly Point[], policy: AnchorPolicy): Anchor[] {
    if (verts.length === 0) return []
    // total perimeter
    const segLengths: number[] = []
    let total = 0
    for (let i = 0; i < verts.length; i++) {
      const a = verts[i]
      const b = verts[(i + 1) % verts.length]
      const dx = b[0] - a[0]
      const dy = b[1] - a[1]
      const len = Math.hypot(dx, dy)
      segLengths.push(len)
      total += len
    }
    const cumS: number[] = [0]
    for (let i = 0; i < segLengths.length; i++) {
      cumS.push(cumS[i]! + segLengths[i]! / total)
    }

    function pointAt(s: number): Point {
      const ss = ((s % 1) + 1) % 1
      // find segment
      let i = 0
      while (i < cumS.length - 1 && cumS[i + 1]! <= ss) i++
      const a = verts[i % verts.length]
      const b = verts[(i + 1) % verts.length]
      const segS0 = cumS[i]!
      const segS1 = cumS[i + 1]!
      const t = segS1 === segS0 ? 0 : (ss - segS0) / (segS1 - segS0)
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
    }

    if (policy.kind === 'manual') {
      return policy.anchors.map(a => ({ id: a.id, s: a.s, point: pointAt(a.s) }))
    }

    const out: Anchor[] = []
    // vertices always become anchors
    for (let i = 0; i < verts.length; i++) {
      out.push({
        id: `v${i}`,
        s: cumS[i]!,
        point: [verts[i]![0], verts[i]![1]],
      })
    }

    const k = policy.kind === 'perEdge' ? Math.max(0, Math.floor(policy.k)) : null
    const density = policy.kind === 'byLength' ? policy.density : null

    for (let i = 0; i < verts.length; i++) {
      const segLen = segLengths[i]!
      let count = 0
      if (k !== null) count = k
      if (density !== null) count = Math.max(0, Math.floor(segLen / density) - 1)
      const s0 = cumS[i]!
      const s1 = cumS[i + 1]!
      for (let j = 1; j <= count; j++) {
        const t = j / (count + 1)
        const s = s0 + (s1 - s0) * t
        out.push({ id: `v${i}-${j}of${count}`, s, point: pointAt(s) })
      }
    }
    out.sort((a, b) => a.s - b.s)
    return out
  }

  function ellipseAnchors(rx: number, ry: number, policy: AnchorPolicy): Anchor[] {
    function pointAt(s: number): Point {
      const angle = ((s % 1) + 1) % 1 * Math.PI * 2
      return [rx * Math.cos(angle), ry * Math.sin(angle)]
    }
    if (policy.kind === 'manual') {
      return policy.anchors.map(a => ({ id: a.id, s: a.s, point: pointAt(a.s) }))
    }
    const k = policy.kind === 'perEdge' ? Math.max(1, Math.floor(policy.k)) : null
    // density-by-arc is approximate; uniform-by-angle is good enough for v0.
    const totalSamples = k !== null
      ? Math.max(4, k * 4)
      : Math.max(4, Math.floor((2 * Math.PI * Math.max(rx, ry)) / (policy as { kind: 'byLength'; density: number }).density))
    const out: Anchor[] = []
    for (let i = 0; i < totalSamples; i++) {
      const s = i / totalSamples
      out.push({ id: `el${i}of${totalSamples}`, s, point: pointAt(s) })
    }
    return out
  }

  function anchorsOf(id: NodeId): Anchor[] {
    const node = nodes.get(id)
    if (!node) return []
    const o = node.outline
    if (o.kind === 'rect') return rectAnchors(o.w, o.h, node.anchorPolicy)
    if (o.kind === 'polygon') return polygonAnchors(o.verts, node.anchorPolicy)
    if (o.kind === 'ellipse') return ellipseAnchors(o.rx, o.ry, node.anchorPolicy)
    if (o.kind === 'path') return polygonAnchors(o.flatten, node.anchorPolicy)
    return []
  }

  // ─── Bounds (AABB in world space — no rotation in v0) ────────────────────

  function localBounds(node: GraphNode): { x0: number; y0: number; x1: number; y1: number } {
    const o = node.outline
    if (o.kind === 'rect') return { x0: 0, y0: 0, x1: o.w, y1: o.h }
    if (o.kind === 'ellipse') return { x0: -o.rx, y0: -o.ry, x1: o.rx, y1: o.ry }
    const verts = o.kind === 'polygon' ? o.verts : o.flatten
    if (verts.length === 0) return { x0: 0, y0: 0, x1: 0, y1: 0 }
    let x0 = verts[0]![0]
    let x1 = verts[0]![0]
    let y0 = verts[0]![1]
    let y1 = verts[0]![1]
    for (const [x, y] of verts) {
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
    return { x0, y0, x1, y1 }
  }

  function worldOriginOf(id: NodeId): { x: number; y: number; scale: number } {
    let cursor: NodeId | null = id
    let x = 0
    let y = 0
    let scale = 1
    while (cursor !== null) {
      const n = nodes.get(cursor)
      if (!n) break
      const s = n.transform.scale ?? 1
      x = n.transform.x + x * s
      y = n.transform.y + y * s
      scale *= s
      cursor = n.parentId
    }
    return { x, y, scale }
  }

  function boundsOf(id: NodeId): AABB {
    const node = nodes.get(id)
    if (!node) return { x: 0, y: 0, w: 0, h: 0 }
    const lb = localBounds(node)
    const origin = worldOriginOf(id)
    const w = (lb.x1 - lb.x0) * origin.scale
    const h = (lb.y1 - lb.y0) * origin.scale
    return {
      x: origin.x + lb.x0 * origin.scale,
      y: origin.y + lb.y0 * origin.scale,
      w,
      h,
    }
  }

  /**
   * Oriented bounding box in world space.
   *
   * v0 simplification: rotation is composed by summing `transform.rot`
   * along the parent chain (treating ancestors as if their rotations
   * commuted). For a single rotated node this is exact; for nested rotated
   * groups the centre / angle remain a useful approximation suitable for
   * selection overlays. Tighter OBB composition (full affine product)
   * lands when the engine grows a proper world-matrix cache.
   */
  function getNodeOBB(id: NodeId): OBB {
    const node = nodes.get(id)
    if (!node) return { center: [0, 0], halfWidth: 0, halfHeight: 0, angle: 0 }
    const lb = localBounds(node)
    const origin = worldOriginOf(id)
    const localCx = (lb.x0 + lb.x1) / 2
    const localCy = (lb.y0 + lb.y1) / 2
    const halfWidth = Math.abs((lb.x1 - lb.x0) / 2 * origin.scale)
    const halfHeight = Math.abs((lb.y1 - lb.y0) / 2 * origin.scale)
    let angle = 0
    let cursor: NodeId | null = id
    while (cursor !== null) {
      const n = nodes.get(cursor)
      if (!n) break
      angle += n.transform.rot ?? 0
      cursor = n.parentId
    }
    const center: Point = [
      origin.x + localCx * origin.scale,
      origin.y + localCy * origin.scale,
    ]
    return { center, halfWidth, halfHeight, angle }
  }

  function clear(): void {
    nodes.clear()
    edges.clear()
    edgesByNode.clear()
    nodeCounter = 0
    edgeCounter = 0
    history.clear()
    pendingEntry = null
    transactionDepth = 0
    isRestoring = false
    publishSnapshot()
  }

  // ─── Public history API ──────────────────────────────────────────────────

  function transaction(fn: () => void, label?: string): void {
    _withHistory(fn, label)
  }

  function pushHistory(label?: string): void {
    if (transactionDepth > 0) {
      // Inside a transaction: commit the current pending entry as a sub-
      // boundary, then start a fresh capture for the remainder of the
      // transaction. This lets a single `transaction(fn)` produce more
      // than one undo entry — useful when a batch operation has natural
      // sub-steps (`}; { ` between groups).
      if (pendingEntry !== null) {
        history.push({ snapshot: pendingEntry.snapshot, label: pendingEntry.label ?? label })
        history.clearRedo()
      }
      pendingEntry = { snapshot: _captureState(), label: undefined }
      return
    }
    // Standalone: re-label the most recent undo entry. We DO NOT push a
    // duplicate snapshot of the current state — auto-push has already
    // captured every meaningful boundary, so an extra standalone push
    // would just clutter the stack with no-op entries that consume undo
    // slots without changing visible state. Re-labeling is the useful
    // bit you can't get any other way outside a transaction.
    history.relabelTop(label)
  }

  function undo(): boolean {
    if (!history.canUndo()) return false
    const entry = history.popUndo()!
    history.pushRedo({ snapshot: _captureState(), label: entry.label })
    isRestoring = true
    try {
      _restoreState(entry.snapshot)
    } finally {
      isRestoring = false
    }
    publishSnapshot()
    return true
  }

  function redo(): boolean {
    if (!history.canRedo()) return false
    const entry = history.popRedo()!
    history.push({ snapshot: _captureState(), label: entry.label })
    isRestoring = true
    try {
      _restoreState(entry.snapshot)
    } finally {
      isRestoring = false
    }
    publishSnapshot()
    return true
  }

  function canUndo(): boolean {
    return history.canUndo()
  }

  function canRedo(): boolean {
    return history.canRedo()
  }

  function clearHistory(): void {
    history.clear()
  }

  return {
    addNode,
    removeNode,
    updateNode,
    moveNode,
    setParent,
    addEdge,
    removeEdge,
    getNode,
    getEdge,
    getState,
    childrenOf,
    edgesOf,
    anchorsOf,
    boundsOf,
    getNodeOBB,
    subscribe: subscribeLocal,
    transaction,
    pushHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
    clear,
  }
}
