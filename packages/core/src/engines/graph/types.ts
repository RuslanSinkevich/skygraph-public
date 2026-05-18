/**
 * GraphEngine types — the diagram (Visio-like) domain engine.
 *
 * Design intent (see ARCHITECTURE.md / chat-derived spec):
 *
 *   - The engine knows ONLY topology + minimal geometry needed for routing /
 *     hit-testing. It does NOT know about React, DOM, SVG, canvas — those live
 *     in `@skygraph/react/<Diagram component>`.
 *   - A Node has an `outline` (rect / ellipse / polygon / flattened path),
 *     a `transform` (position in parent space), an optional `parentId` for
 *     hierarchy (groups, sub-groups), and an `anchorPolicy` describing how to
 *     generate connection points along the outline.
 *   - An Edge connects two anchors (each by node id + either an anchor id or
 *     a normalized perimeter parameter `s ∈ [0..1]`).
 *   - All anchor IDs are stable across `anchorPolicy` changes for the same
 *     outline kind, so existing edges do not get "torn off" when the user
 *     bumps `k` from 3 to 5.
 */

export type NodeId = string
export type EdgeId = string
export type AnchorId = string

/**
 * 2D point in the local coordinate space of an outline.
 * The first element is x, the second is y.
 */
export type Point = readonly [number, number]

/**
 * Axis-aligned bounding box in world space (no rotation).
 * Computed from `transform` + `outline`. Used for broad-phase collision /
 * spatial indexing in the routing layer.
 */
export interface AABB {
  x: number
  y: number
  w: number
  h: number
}

/**
 * Oriented bounding box in world space — a rectangle that may be rotated
 * relative to the world axes. Returned by {@link GraphEngine.getNodeOBB}
 * and consumed by selection / manipulator overlays that need a tight fit
 * around a rotated node. See `obb.ts` for the helper module.
 *
 * `halfWidth` / `halfHeight` are pre-multiplied by world scale, so an OBB
 * with `angle === 0` describes the same rectangle as the matching AABB
 * (modulo the centre-vs-top-left representation).
 */
export interface OBB {
  readonly center: Point
  readonly halfWidth: number
  readonly halfHeight: number
  readonly angle: number
}

/**
 * Visual outline of a node, expressed in the node's local coordinate space.
 *
 * - `rect` / `ellipse` are parametric primitives; the engine generates anchors
 *   along their boundary on demand.
 * - `polygon` carries explicit vertices.
 * - `path` is a "flattened approximation" — the visual layer (React) is free
 *   to render a curve (SVG path, Bezier, ...) but commits a discrete polyline
 *   to the engine. This way the engine never needs to know about cubic Beziers.
 */
export type Outline =
  | { readonly kind: 'rect'; readonly w: number; readonly h: number }
  | { readonly kind: 'ellipse'; readonly rx: number; readonly ry: number }
  | { readonly kind: 'polygon'; readonly verts: readonly Point[] }
  | { readonly kind: 'path'; readonly flatten: readonly Point[] }

/**
 * 2D affine-ish transform of a node within its parent.
 * Only translate is required; rotate/scale are optional for the v0 engine.
 */
export interface NodeTransform {
  /** X position in the parent's local space. */
  x: number
  /** Y position in the parent's local space. */
  y: number
  /** Rotation in radians. Optional; default 0. */
  rot?: number
  /** Uniform scale factor. Optional; default 1. */
  scale?: number
}

/**
 * Strategy for generating anchor points on a node outline.
 *
 *   - `perEdge: { k: 1..10 }` — primitives only (rect, polygon).
 *     Corners are always anchors. `k` evenly-spaced anchors per edge,
 *     not counting corners (open interval) — bumping `k` does NOT shift
 *     existing anchor IDs.
 *
 *   - `byLength: { density }` — uniform along the perimeter at the given
 *     distance step (in local units). Works for every outline kind.
 *
 *   - `manual: anchors[]` — explicit anchor list with stable IDs and
 *     normalized perimeter parameter `s ∈ [0..1]`.
 */
export type AnchorPolicy =
  | { readonly kind: 'perEdge'; readonly k: number }
  | { readonly kind: 'byLength'; readonly density: number }
  | { readonly kind: 'manual'; readonly anchors: readonly { id: AnchorId; s: number }[] }

/**
 * A point on the outline where edges can attach.
 * `s` is the normalized perimeter parameter (0..1, monotonically increasing
 * around the outline). Persisting an edge endpoint by `s` makes it stable
 * under outline edits / anchor regeneration.
 */
export interface Anchor {
  /** Stable id assigned by the anchor generator (e.g. `nw`, `edge-0:1of3`). */
  id: AnchorId
  /** Normalized perimeter parameter; `0` is the start of the outline traversal. */
  s: number
  /** Local coordinates on the outline (x, y). */
  point: Point
}

/**
 * A graph node — building block of the diagram. Can be a "shape" (with a
 * visible outline), a "group" (`outline.kind === 'rect'` with `w=h=0` plus
 * children, or any other size — visual layer decides whether to render
 * border / background), or a leaf widget. The engine itself does NOT
 * distinguish — it only sees outline + transform + children-by-parentId.
 */
export interface GraphNode {
  /** Stable identity; unique within the graph. */
  id: NodeId
  /** Parent node id, or `null` for root-level nodes. */
  parentId: NodeId | null
  /** Position / rotation / scale in parent space. */
  transform: NodeTransform
  /** Local-space outline. */
  outline: Outline
  /** How anchors are generated along the outline. */
  anchorPolicy: AnchorPolicy
  /** Optional application payload; the engine never inspects it. */
  data?: unknown
  /** Monotonic revision; increments on transform / outline / anchorPolicy change. */
  geomRevision: number
}

/**
 * An edge is a connection between two anchors on (possibly different) nodes.
 *
 * `endpoint.anchor` may be:
 *   - an `AnchorId` referring to an explicit / generated anchor;
 *   - a `{ s }` parameter binding the edge to a perimeter position even when
 *     the anchor list is regenerated.
 */
export type EdgeEndpoint =
  | { readonly node: NodeId; readonly anchor: AnchorId }
  | { readonly node: NodeId; readonly anchor: { readonly s: number } }

export interface GraphEdge {
  /** Stable identity; unique within the graph. */
  id: EdgeId
  /** Source endpoint. */
  from: EdgeEndpoint
  /** Target endpoint. */
  to: EdgeEndpoint
  /**
   * Routing hint:
   *   • `straight`   — single L line between the two anchors.
   *   • `orthogonal` — axis-aligned polyline (right-angled). Combined
   *                    with `routeAroundNodes` in `<Diagram>` the
   *                    router avoids other nodes via A*. The visual
   *                    layer also draws rounded corners.
   *   • `bezier`     — single cubic Bezier curve. Control handles
   *                    extend perpendicular to each node's nearest
   *                    side, matching React Flow's `getBezierPath`.
   *   • `manual`     — explicit waypoint polyline.
   */
  routing: 'straight' | 'orthogonal' | 'bezier' | 'manual'
  /** Optional waypoints for `manual` routing (in world coordinates). */
  waypoints?: readonly Point[]
  /** Optional application payload. */
  data?: unknown
}

/**
 * Snapshot of the current graph state — read-model the engine exposes.
 * This object is immutable from the consumer's perspective; the engine
 * publishes a new snapshot on every commit by writing into the Core store
 * under the `$graph.` prefix.
 */
export interface GraphState {
  nodes: ReadonlyMap<NodeId, GraphNode>
  edges: ReadonlyMap<EdgeId, GraphEdge>
  /** Per-node list of incident edges (incoming + outgoing) for O(degree) lookup. */
  edgesByNode: ReadonlyMap<NodeId, readonly EdgeId[]>
}

/** Patch type for `moveNode` / `updateNode`. */
export interface NodeUpdate {
  transform?: Partial<NodeTransform>
  outline?: Outline
  anchorPolicy?: AnchorPolicy
  data?: unknown
}

/** Options for `addNode`. */
export interface NodeInit {
  /** Optional pre-set id. If omitted, the engine generates one. */
  id?: NodeId
  /** Parent for hierarchy. `null` (default) places the node at the root. */
  parentId?: NodeId | null
  /** Transform in parent space. Defaults to `{ x: 0, y: 0 }`. */
  transform?: NodeTransform
  /** Outline; defaults to a 100×60 rect. */
  outline?: Outline
  /** Anchor strategy; defaults to `{ kind: 'perEdge', k: 1 }`. */
  anchorPolicy?: AnchorPolicy
  /** Application payload. */
  data?: unknown
}

/** Options for `addEdge`. */
export interface EdgeInit {
  /** Optional pre-set id. If omitted, the engine generates one. */
  id?: EdgeId
  from: EdgeEndpoint
  to: EdgeEndpoint
  /** Routing strategy. Defaults to `'straight'`. */
  routing?: 'straight' | 'orthogonal' | 'bezier' | 'manual'
  waypoints?: readonly Point[]
  data?: unknown
}

/**
 * Public API of the Graph engine. Created via `createGraph(core, options?)`.
 * The engine is a thin façade over a path-based Core store under `$graph.`.
 */
export interface GraphEngine {
  /** Add a node and return its assigned id. */
  addNode(init?: NodeInit): NodeId
  /** Remove a node and all edges incident to it. */
  removeNode(id: NodeId): void
  /** Patch a node's transform / outline / anchorPolicy / data. */
  updateNode(id: NodeId, patch: NodeUpdate): void
  /** Move a node by an absolute new (x, y) in parent space. */
  moveNode(id: NodeId, x: number, y: number): void
  /** Re-parent a node (groups / sub-groups). `null` = root. */
  setParent(id: NodeId, parentId: NodeId | null): void

  /** Add an edge between two endpoints. */
  addEdge(init: EdgeInit): EdgeId
  /** Remove an edge by id. */
  removeEdge(id: EdgeId): void

  /** Get a single node (or undefined). */
  getNode(id: NodeId): GraphNode | undefined
  /** Get a single edge (or undefined). */
  getEdge(id: EdgeId): GraphEdge | undefined

  /** Snapshot of the entire graph state. */
  getState(): GraphState

  /** Direct children (immediate parentId match). */
  childrenOf(id: NodeId | null): NodeId[]
  /** Edges incident to a node (incoming + outgoing). */
  edgesOf(id: NodeId): EdgeId[]

  /** Compute anchors for a node according to its `anchorPolicy`. */
  anchorsOf(id: NodeId): Anchor[]
  /** Compute axis-aligned bounding box of a node in world coordinates. */
  boundsOf(id: NodeId): AABB
  /**
   * Compute the oriented bounding box of a node in world coordinates.
   *
   * For an axis-aligned node (`transform.rot === 0` everywhere up the
   * parent chain) the OBB and AABB describe the same rectangle. When any
   * ancestor has a non-zero rotation, the OBB is the tight fit and
   * `boundsOf` (AABB) becomes a strict superset.
   */
  getNodeOBB(id: NodeId): OBB

  /**
   * Subscribe to commits — callback fires after every snapshot publish
   * (any `addNode`, `removeNode`, `addEdge`, etc.). Returns an unsubscribe fn.
   *
   * Prefer this for React adapters: it sidesteps the `$graph.snapshot.<id>`
   * path lookup that varies per engine instance.
   */
  subscribe(cb: () => void): () => void

  // ── Undo / redo ─────────────────────────────────────────────────────────
  //
  // Each mutating call (`addNode`, `removeNode`, `updateNode`, `moveNode`,
  // `setParent`, `addEdge`, `removeEdge`) automatically pushes the prior
  // state onto the undo stack — so by default one command = one history
  // entry. Use `transaction(fn)` to group multiple mutations into a single
  // entry. The redo stack is cleared whenever a new mutation happens
  // outside of an `undo()` / `redo()` call, matching the standard linear
  // editor history model.

  /** Group multiple mutations into one history entry. Optional `label` is
   *  attached to the resulting `HistoryEntry`. */
  transaction(fn: () => void, label?: string): void

  /**
   * Add a label to the history without changing the visible state.
   *
   * Behaviour depends on context:
   *
   *   - **Inside `transaction(fn)`**: commits the in-progress pending
   *     entry as a sub-boundary (with `label`) and starts a fresh
   *     capture for the rest of the transaction. Use this to split one
   *     batch into multiple undo entries.
   *
   *   - **Outside a transaction**: re-labels the most recent undo entry.
   *     Does NOT push a duplicate snapshot — auto-push has already
   *     captured every meaningful boundary, so a standalone push would
   *     only clutter the stack.
   */
  pushHistory(label?: string): void

  /** Restore the previous state, returning `true` if anything was undone. */
  undo(): boolean
  /** Re-apply the most recently undone state, returning `true` on success. */
  redo(): boolean
  /** `true` when there is at least one entry on the undo stack. */
  canUndo(): boolean
  /** `true` when there is at least one entry on the redo stack. */
  canRedo(): boolean
  /** Drop all undo and redo entries (state itself is not affected). */
  clearHistory(): void

  /**
   * Reset the graph (drops all nodes / edges, clears history).
   * @internal Test helper.
   */
  clear(): void
}

/** Options accepted by `createGraph`. */
export interface GraphEngineOptions {
  /** Optional debug name for the engine instance. */
  name?: string
}
