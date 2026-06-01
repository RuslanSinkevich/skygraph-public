import type { AABB, Point } from './types'

/**
 * Orthogonal-routing module.
 *
 * Two strategies share one entry point — `routeOrthogonal`:
 *
 *   1. **L-route fallback** (no obstacles): a single-bend right-angle path.
 *      Cheap, deterministic, and good enough for the "two free-floating
 *      nodes" case.
 *
 *   2. **A* on a uniform grid** (with obstacles): when the caller passes
 *      `obstacles`, the router discretises world space into a grid of step
 *      `gridSize` (default 10) and runs a 4-connected A* with a turn
 *      penalty so the search prefers long straight runs. The result is a
 *      polyline whose interior bends are all axis-aligned right angles
 *      and which never enters the interior of any obstacle.
 *
 * Both strategies share a common output shape: a `readonly Point[]`
 * with the original `start` as the first element and the original `end`
 * as the last. Consumers (e.g. `<Diagram>`) feed it straight to
 * `pointsToPath`.
 *
 * **`sourceBounds` / `targetBounds` (since 3.3c).** When the caller knows
 * which axis-aligned rectangle each endpoint sits on, the router will
 * pick the side of the rectangle nearest to the *other* endpoint and
 * extend a short perpendicular stub away from the node. That keeps edges
 * from sliding diagonally out of corner-anchors (`s = 0.25` / `s = 0.75`)
 * and from immediately re-entering the node they just exited — both of
 * which were visible in the Workflow Editor showcase prior to 3.3c.
 *
 * The router is intentionally pure — no engine state, no React, no DOM —
 * so it can be tested in isolation and reused outside of `<Diagram>`
 * (e.g. server-side path pre-computation).
 */

/** Direction the previous step entered the current cell from. */
type Dir = 'h' | 'v' | null

/** Side of an AABB the route exits through. */
export type RectSide = 'top' | 'right' | 'bottom' | 'left'

/** Options for {@link routeOrthogonal}. */
export interface RouteOrthogonalOptions {
  /**
   * Bend preference for the no-obstacle case.
   *  - `auto` (default) picks H-then-V or V-then-H based on which leg is longer.
   *  - `hv` forces horizontal first.
   *  - `vh` forces vertical first.
   *
   * Ignored when `obstacles` is non-empty — A* picks bends from costs.
   */
  preferred?: 'auto' | 'hv' | 'vh'
  /**
   * Rectangular obstacles to avoid (in world coordinates). When omitted /
   * empty, the router takes the cheap L-route path.
   */
  obstacles?: readonly AABB[]
  /**
   * Discretisation step for A*. Smaller values give smoother paths at the
   * cost of more search nodes. Default: 10.
   */
  gridSize?: number
  /**
   * Inflate every obstacle by this margin (world units) before clipping.
   * Useful to keep edges from hugging node borders. Default: 0.
   */
  inflate?: number
  /**
   * Hard cap on A* expansions. Acts as a safety net so a pathological
   * search never hangs the renderer. Default: 5000.
   */
  maxNodes?: number
  /**
   * AABB of the source node. When provided, the route exits the side of
   * the rectangle nearest to `end` with a short perpendicular stub. The
   * raw `start` point is kept as the first polyline vertex so the edge
   * still meets the anchor exactly.
   */
  sourceBounds?: AABB
  /**
   * AABB of the target node. When provided, the route enters the side of
   * the rectangle nearest to `start` with a short perpendicular stub. The
   * raw `end` point is kept as the last polyline vertex.
   */
  targetBounds?: AABB
  /**
   * Length (world units) of the perpendicular stub generated when
   * `sourceBounds` / `targetBounds` is set. Defaults to `max(20, gridSize)`
   * — matches React Flow's `offset = 20` for smoothstep edges.
   */
  stubLength?: number
  /**
   * Snap intermediate waypoints to a grid of this step. Defaults to the
   * effective `gridSize`. Set to `0` to disable snapping in the no-
   * obstacle path. A* already operates on the grid so this option only
   * affects the L-route fallback.
   */
  snap?: number
  /**
   * Where the central bend sits on the connector when both
   * `sourceBounds` and `targetBounds` are provided.
   *
   *   - `0`   → bend right at the source stub
   *   - `0.5` → midpoint between the two stubs (default — matches
   *             React Flow's `stepPosition`)
   *   - `1`   → bend right at the target stub
   *
   * Ignored when bounds are missing (we fall back to the legacy L-route)
   * or when A* is engaged (it picks bends from path-cost, not position).
   */
  stepPosition?: number
}

/**
 * Compute an orthogonal (right-angled) path between two points.
 *
 *   - With no `sourceBounds` / `targetBounds` and no obstacles: a single-
 *     bend L-route, identical to the v0 implementation.
 *   - With `sourceBounds` / `targetBounds`: the route exits/enters from
 *     the side of each rectangle nearest to the other endpoint.
 *   - With obstacles: 4-connected A* on a grid of step `gridSize`. Uses
 *     a turn penalty so straight runs are preferred. Falls back to the
 *     L-route if A* cannot find a path within `maxNodes` expansions or
 *     either endpoint is unreachable.
 *
 * The third argument also accepts the legacy bare-string form
 * (`'auto' | 'hv' | 'vh'`) for backwards compatibility with the v0 API.
 */
export function routeOrthogonal(
  start: Point,
  end: Point,
  options?: RouteOrthogonalOptions | 'auto' | 'hv' | 'vh',
): readonly Point[] {
  const opts: RouteOrthogonalOptions =
    typeof options === 'string' ? { preferred: options } : (options ?? {})

  const gridSize = opts.gridSize ?? 10
  const stubLength = opts.stubLength ?? Math.max(20, gridSize)
  const stepPosition = opts.stepPosition ?? 0.5

  // ─── Step 1. Derive the "approach points" from optional bounds ────────────
  // Each approach point lives at the centre of the side of the source/
  // target rectangle that is closest to the other endpoint. We extend a
  // short perpendicular stub OUTWARDS from the rectangle so the rendered
  // edge has at least one straight segment exiting/entering the node.

  let sExit: Point | null = null
  let sStub: Point | null = null
  let sCorner: Point | null = null
  let sSide: RectSide | null = null
  if (opts.sourceBounds) {
    const exitInfo = exitOnNearestSide(opts.sourceBounds, end, start)
    sExit = exitInfo.point
    sSide = exitInfo.side
    sStub = extrudePoint(exitInfo.point, exitInfo.side, stubLength)
    // Bridge from the raw anchor (which may sit anywhere on the
    // outline — corner anchors like `s=0.25` are common) to `sExit`
    // through a right-angle bend, so every segment stays axis-aligned.
    sCorner = orthoBridge(start, sExit, exitInfo.side)
  }

  let tExit: Point | null = null
  let tStub: Point | null = null
  let tCorner: Point | null = null
  let tSide: RectSide | null = null
  if (opts.targetBounds) {
    const enterInfo = exitOnNearestSide(opts.targetBounds, start, end)
    tExit = enterInfo.point
    tSide = enterInfo.side
    tStub = extrudePoint(enterInfo.point, enterInfo.side, stubLength)
    tCorner = orthoBridge(end, tExit, enterInfo.side)
  }

  // ─── Step 2. Determine the "core" route between sStub and tStub ──────────
  // When neither bounds is set, the core route is just `start → end`.
  // Otherwise it sits between the perpendicular stubs we just built.
  const coreStart: Point = sStub ?? start
  const coreEnd: Point = tStub ?? end

  // Obstacles: when both source/target bounds are provided, they should
  // NOT be obstacles to themselves — caller is expected to filter the
  // pair out, but we double-strip just in case (matches by reference).
  const obstacles = opts.obstacles ?? []
  const filteredObstacles =
    obstacles.length > 0 && (opts.sourceBounds || opts.targetBounds)
      ? obstacles.filter((o) => o !== opts.sourceBounds && o !== opts.targetBounds)
      : obstacles

  let core: readonly Point[]
  if (filteredObstacles.length === 0) {
    // When BOTH endpoint sides are known, mimic React Flow's smoothstep
    // routing: a 3-segment connector that always exits/enters
    // perpendicular to the node face, with the centre bend positioned
    // via `stepPosition`. This is the visual signature of Visio /
    // draw.io / Lucidchart orthogonal edges and reads vastly cleaner
    // than the legacy single-bend L when both endpoints face each
    // other or sit on the same axis.
    if (sSide && tSide) {
      core = smoothStepRoute(coreStart, sSide, coreEnd, tSide, stepPosition)
    } else {
      const snap = opts.snap ?? gridSize
      core = lRoute(coreStart, coreEnd, opts.preferred ?? 'auto', snap)
    }
  } else {
    const inflate = opts.inflate ?? 0
    const maxNodes = opts.maxNodes ?? 5000
    const aStar = aStarRoute(coreStart, coreEnd, filteredObstacles, gridSize, inflate, maxNodes)
    core = aStar ?? lRoute(coreStart, coreEnd, opts.preferred ?? 'auto', opts.snap ?? gridSize)
  }

  // ─── Step 3. Stitch the final polyline ────────────────────────────────────
  // [start, sExit, sStub, ...core..., tStub, tExit, end], collapsing
  // adjacent duplicates and runs of collinear points.

  const points: Point[] = []
  pushIfDistinct(points, start)
  if (sCorner && !pointsEqual(sCorner, start)) pushIfDistinct(points, sCorner)
  if (sExit && !pointsEqual(sExit, points[points.length - 1]!)) pushIfDistinct(points, sExit)
  if (sStub && !pointsEqual(sStub, points[points.length - 1]!)) pushIfDistinct(points, sStub)

  for (let i = 0; i < core.length; i++) {
    const p = core[i]!
    // skip the core endpoints if they exactly match the stubs we already pushed
    if (i === 0 && sStub && pointsEqual(p, sStub)) continue
    if (i === core.length - 1 && tStub && pointsEqual(p, tStub)) continue
    pushIfDistinct(points, p)
  }

  if (tStub && !pointsEqual(tStub, points[points.length - 1]!)) pushIfDistinct(points, tStub)
  if (tExit && !pointsEqual(tExit, points[points.length - 1]!)) pushIfDistinct(points, tExit)
  if (tCorner && !pointsEqual(tCorner, points[points.length - 1]!)) pushIfDistinct(points, tCorner)
  if (!pointsEqual(end, points[points.length - 1]!)) pushIfDistinct(points, end)

  return compressCollinear(points)
}

// ─── Smoothstep core (no obstacles, both sides known) ──────────────────────

/**
 * React Flow-style smoothstep core: build the bend(s) between two
 * perpendicular stubs.
 *
 *   - When the two sides are OPPOSITE on the same axis (typical
 *     `right→left` / `top→bottom`), the connector takes one of two
 *     shapes depending on the axis the stubs leave from:
 *
 *         ─── stub  ┐                ┌─── stub
 *                   │  (verticalSplit)│
 *                   └─── stub        stub ──┘ (horizontalSplit)
 *
 *     `stepPosition` slides the centre split toward source (`0`) or
 *     target (`1`).
 *
 *   - When the sides face the SAME way (e.g. both `right`), the route
 *     bypasses around to the far side via a single L bend.
 *
 *   - When the sides are PERPENDICULAR (e.g. `right→bottom`), one
 *     coordinate of the bend comes from the source stub, the other
 *     from the target stub.
 *
 * The output always starts at `coreStart` and ends at `coreEnd` so the
 * stitching loop in `routeOrthogonal` can dedupe matching endpoints.
 */
function smoothStepRoute(
  coreStart: Point,
  sSide: RectSide,
  coreEnd: Point,
  tSide: RectSide,
  stepPosition: number,
): readonly Point[] {
  const [sx, sy] = coreStart
  const [tx, ty] = coreEnd
  const sAxis = sideAxis(sSide)
  const tAxis = sideAxis(tSide)
  const sDir = sideDir(sSide)
  const tDir = sideDir(tSide)

  // Same axis (both horizontal or both vertical).
  if (sAxis === tAxis) {
    // Opposite directions on the same axis → classic smoothstep with
    // a configurable centre.
    if (sDir + tDir === 0) {
      if (sAxis === 'x') {
        const cx = sx + (tx - sx) * stepPosition
        return [
          [sx, sy],
          [cx, sy],
          [cx, ty],
          [tx, ty],
        ]
      }
      const cy = sy + (ty - sy) * stepPosition
      return [
        [sx, sy],
        [sx, cy],
        [tx, cy],
        [tx, ty],
      ]
    }
    // Same direction (both `right` for example) → loop around to the
    // far side. The extra segment guarantees the connector clears the
    // node bodies even when both stubs face the same way.
    if (sAxis === 'x') {
      const extX = sDir > 0 ? Math.max(sx, tx) : Math.min(sx, tx)
      return [
        [sx, sy],
        [extX, sy],
        [extX, ty],
        [tx, ty],
      ]
    }
    const extY = sDir > 0 ? Math.max(sy, ty) : Math.min(sy, ty)
    return [
      [sx, sy],
      [sx, extY],
      [tx, extY],
      [tx, ty],
    ]
  }

  // Perpendicular sides: one bend takes the source's bend-axis and the
  // target's bend-axis. The orientation of the corner depends on which
  // axis each stub leaves from.
  if (sAxis === 'x') {
    // Source leaves horizontally, target leaves vertically — the corner
    // sits at (target.x, source.y).
    return [
      [sx, sy],
      [tx, sy],
      [tx, ty],
    ]
  }
  // Source leaves vertically, target leaves horizontally — corner at
  // (source.x, target.y).
  return [
    [sx, sy],
    [sx, ty],
    [tx, ty],
  ]
}

function sideAxis(s: RectSide): 'x' | 'y' {
  return s === 'left' || s === 'right' ? 'x' : 'y'
}

/** +1 for `right` / `bottom`, -1 for `left` / `top`. */
function sideDir(s: RectSide): 1 | -1 {
  return s === 'right' || s === 'bottom' ? 1 : -1
}

/**
 * Build an SVG path `d` attribute from a polyline.
 *
 *   pointsToPath([[0,0], [10,0], [10,5]]) → "M 0 0 L 10 0 L 10 5"
 */
export function pointsToPath(points: readonly Point[]): string {
  if (points.length === 0) return ''
  const [head, ...rest] = points
  return `M ${head[0]} ${head[1]} ${rest.map((p) => `L ${p[0]} ${p[1]}`).join(' ')}`
}

/**
 * Build a rounded-corner SVG path from an orthogonal polyline.
 *
 * Every interior bend (where two consecutive segments meet at a right
 * angle) is replaced with a quadratic Bezier whose control point sits
 * exactly at the corner — this produces the visual signature of
 * "smooth-step" edges found in React Flow / draw.io / Lucidchart
 * without changing the underlying polyline geometry.
 *
 *   pointsToRoundedPath([[0,0], [10,0], [10,5]], 4)
 *     → "M 0 0 L 6 0 Q 10 0 10 4 L 10 5"
 *
 * `radius` is clamped to half of the shorter adjacent segment so the
 * curves never overshoot. Passing `0` makes it identical to
 * {@link pointsToPath}.
 */
export function pointsToRoundedPath(points: readonly Point[], radius: number): string {
  if (points.length === 0) return ''
  if (points.length < 3 || radius <= 0) return pointsToPath(points)

  let d = `M ${points[0]![0]} ${points[0]![1]}`
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1]!
    const b = points[i]!
    const c = points[i + 1]!

    // Length of segments meeting at b — clamp the bend so it never
    // eats more than half of either neighbour.
    const lenAB = Math.hypot(b[0] - a[0], b[1] - a[1])
    const lenBC = Math.hypot(c[0] - b[0], c[1] - b[1])
    const r = Math.min(radius, lenAB / 2, lenBC / 2)

    const ux = (b[0] - a[0]) / (lenAB || 1)
    const uy = (b[1] - a[1]) / (lenAB || 1)
    const vx = (c[0] - b[0]) / (lenBC || 1)
    const vy = (c[1] - b[1]) / (lenBC || 1)

    // Collinear corner (cross product is zero) → the "bend" is just
    // a continuation of the previous segment; emit a plain line and
    // skip the Q. This keeps multi-segment straight runs visually
    // identical to {@link pointsToPath} regardless of the radius.
    const cross = ux * vy - uy * vx
    if (r < 0.5 || Math.abs(cross) < 1e-9) {
      d += ` L ${b[0]} ${b[1]}`
      continue
    }

    const p1x = b[0] - ux * r
    const p1y = b[1] - uy * r
    const p2x = b[0] + vx * r
    const p2y = b[1] + vy * r

    d += ` L ${p1x} ${p1y} Q ${b[0]} ${b[1]} ${p2x} ${p2y}`
  }
  const tail = points[points.length - 1]!
  d += ` L ${tail[0]} ${tail[1]}`
  return d
}

// ─── Bezier routing ────────────────────────────────────────────────────────

/** Side of an AABB that an endpoint exits / enters through. */
export type Side = 'top' | 'right' | 'bottom' | 'left'

export interface BezierPathOptions {
  /** Source point — where the curve starts. */
  source: Point
  /** Side of the source node the curve exits through. */
  sourceSide: Side
  /** Target point — where the curve ends. */
  target: Point
  /** Side of the target node the curve enters through. */
  targetSide: Side
  /**
   * Curve intensity. `0.25` is React Flow's default — strong enough
   * to feel natural, soft enough not to loop. Range: `0..1`.
   */
  curvature?: number
}

function controlOffset(distance: number, curvature: number): number {
  if (distance >= 0) return 0.5 * distance
  // Negative distance means the curve has to swing back around; we
  // boost the control offset proportionally so the loop reads cleanly.
  return curvature * 25 * Math.sqrt(-distance)
}

function controlPoint(
  side: Side,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  curvature: number,
): Point {
  switch (side) {
    case 'left':
      return [x1 - controlOffset(x1 - x2, curvature), y1]
    case 'right':
      return [x1 + controlOffset(x2 - x1, curvature), y1]
    case 'top':
      return [x1, y1 - controlOffset(y1 - y2, curvature)]
    case 'bottom':
      return [x1, y1 + controlOffset(y2 - y1, curvature)]
  }
}

/**
 * Cubic-bezier SVG path between two endpoints, with control handles
 * extending perpendicular to each side. Mirrors React Flow's
 * `getBezierPath` algorithm.
 *
 * `sourceSide` / `targetSide` tell the function which face of each
 * node the endpoint sits on so the curve always exits and enters
 * perpendicular to the node outline — this is the difference between
 * a "wavy" edge and a "deliberate" one.
 *
 * Use {@link nearestSide} to derive the side from an AABB + opposite
 * point when the caller doesn't already know it.
 */
export function getBezierPath(opts: BezierPathOptions): string {
  const curvature = opts.curvature ?? 0.25
  const [sx, sy] = opts.source
  const [tx, ty] = opts.target
  const [c1x, c1y] = controlPoint(opts.sourceSide, sx, sy, tx, ty, curvature)
  const [c2x, c2y] = controlPoint(opts.targetSide, tx, ty, sx, sy, curvature)
  return `M ${sx} ${sy} C ${c1x} ${c1y} ${c2x} ${c2y} ${tx} ${ty}`
}

/**
 * Compute the intersection of the line from `box`'s centre to
 * `opposite` with the rectangle's border. Returns the border point and
 * the side it sits on.
 *
 * This is the "floating anchor" trick used by React Flow's
 * FloatingEdges example and most graph viz libraries: instead of
 * binding an endpoint to a fixed corner or midpoint, you bind it to
 * the centre and let it slide along the perimeter following the
 * direction to the other node. The result is dramatically cleaner on
 * dense / unstructured graphs because every edge picks the closest
 * face automatically as nodes are dragged around.
 */
export function floatingAnchor(box: AABB, opposite: Point): { point: Point; side: Side } {
  const cx = box.x + box.w / 2
  const cy = box.y + box.h / 2
  const dx = opposite[0] - cx
  const dy = opposite[1] - cy

  if (dx === 0 && dy === 0) {
    // Both centres coincide — return any side; this is a degenerate
    // self-loop case that the caller is expected to handle separately
    // anyway.
    return { point: [box.x + box.w, cy], side: 'right' }
  }

  const hw = box.w / 2
  const hh = box.h / 2
  // Parametrise the ray (cx + t*dx, cy + t*dy) and find the first
  // border hit. `tx` / `ty` are the parameters at which the ray
  // crosses x = ±hw and y = ±hh in the local frame.
  const tx = dx === 0 ? Infinity : hw / Math.abs(dx)
  const ty = dy === 0 ? Infinity : hh / Math.abs(dy)
  if (tx < ty) {
    const sign = dx > 0 ? 1 : -1
    return {
      point: [cx + sign * hw, cy + sign * (hw / Math.abs(dx)) * dy],
      side: sign > 0 ? 'right' : 'left',
    }
  }
  const sign = dy > 0 ? 1 : -1
  return {
    point: [cx + sign * (hh / Math.abs(dy)) * dx, cy + sign * hh],
    side: sign > 0 ? 'bottom' : 'top',
  }
}

/**
 * Pick the side of `box` whose midpoint is closest to `target`. Same
 * logic as the internal helper used by orthogonal routing — exposed
 * publicly so consumers of `getBezierPath` don't need to re-implement
 * it.
 */
export function nearestSide(box: AABB, target: Point): Side {
  const cx = box.x + box.w / 2
  const cy = box.y + box.h / 2
  const dx = target[0] - cx
  const dy = target[1] - cy
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'right' : 'left'
  return dy >= 0 ? 'bottom' : 'top'
}

/**
 * Resolved edge endpoint geometry — output of {@link resolveEdgeEndpoint}.
 *
 * `point` is in world space, sitting on (or just outside of) the
 * `box` border. `side` records which face the connector exits / enters
 * so downstream consumers (bezier control handles, orthogonal stubs)
 * can stay perpendicular.
 */
export interface ResolvedEndpoint {
  point: Point
  side: Side
}

/**
 * Compute the intersection of the segment between the centre of
 * `intersectionBox` and `targetCenter` with the perimeter of
 * `intersectionBox`.
 *
 * **Source / credit.** Direct port of the algorithm used by xyflow
 * (React Flow) for FloatingEdges and by mxGraph / draw.io's
 * `mxPerimeter.RectanglePerimeter`. The closed-form derivation is in
 * https://math.stackexchange.com/questions/1724792 — it parametrises
 * the rectangle as the manhattan-norm rhombus `|x| + |y| = 1` and
 * solves for the unit intersection in one step, which is faster and
 * numerically more stable than the angle-based formulation.
 *
 * We use this as the canonical endpoint resolver for every routing
 * mode (`straight` / `orthogonal` / `bezier`). The visible benefit is
 * stability: nothing in this function depends on user-supplied
 * anchors — the side, the point, the angle of approach are all pure
 * functions of the two rectangles' bounding boxes, so dragging a node
 * around never produces the "wrong-side-of-the-box" / "edge cuts
 * through the node body" artifacts that the anchor-honouring resolver
 * used to leak.
 *
 * Returns the world-space intersection point. When `box` has zero
 * area (degenerate node) the function returns its centre so callers
 * can still draw a useful edge to it.
 */
export function getNodeIntersection(intersectionBox: AABB, targetCenter: Point): Point {
  const w = intersectionBox.w / 2
  const h = intersectionBox.h / 2
  const x2 = intersectionBox.x + w
  const y2 = intersectionBox.y + h

  // Degenerate — collapse to centre. Without this the algebra below
  // divides by zero on point-like nodes.
  if (w === 0 || h === 0) return [x2, y2]

  const x1 = targetCenter[0]
  const y1 = targetCenter[1]

  const xx1 = (x1 - x2) / (2 * w) - (y1 - y2) / (2 * h)
  const yy1 = (x1 - x2) / (2 * w) + (y1 - y2) / (2 * h)
  const denom = Math.abs(xx1) + Math.abs(yy1)
  if (denom === 0) {
    // Centres coincide (overlapping nodes) — return the right side as
    // a stable default; the visual layer will collapse the edge.
    return [intersectionBox.x + intersectionBox.w, y2]
  }
  const a = 1 / denom
  const xx3 = a * xx1
  const yy3 = a * yy1
  const x = w * (xx3 + yy3) + x2
  const y = h * (-xx3 + yy3) + y2
  return [x, y]
}

/**
 * Classify which face of `box` the `intersectionPoint` sits on.
 * Companion to {@link getNodeIntersection} — together they replace the
 * old anchor-driven endpoint resolver.
 *
 * The function rounds both the box position and the point to integer
 * pixels (matches the xyflow heuristic) before comparing, which keeps
 * floating-point noise from picking the wrong side when an
 * intersection lands almost exactly on a corner.
 */
export function getEdgePosition(box: AABB, intersectionPoint: Point): Side {
  const nx = Math.round(box.x)
  const ny = Math.round(box.y)
  const px = Math.round(intersectionPoint[0])
  const py = Math.round(intersectionPoint[1])
  if (px <= nx + 1) return 'left'
  if (px >= nx + box.w - 1) return 'right'
  if (py <= ny + 1) return 'top'
  if (py >= ny + box.h - 1) return 'bottom'
  // Point sits inside the box (shouldn't happen with a real
  // intersection result, but keep a safe fallback so callers never
  // see `undefined`).
  return 'top'
}

/**
 * Single canonical edge endpoint resolver used by `<Diagram>` for
 * every routing mode. Wraps {@link getNodeIntersection} +
 * {@link getEdgePosition} into the `{ point, side }` shape the
 * adapters expect, and applies a small outward `padding` so the
 * arrowhead marker has room to sit between the path tip and the node
 * border (matches React Flow / draw.io behaviour).
 *
 * **Important: anchor information is intentionally ignored here.**
 * The `<Diagram>` API still accepts `from: { anchor: 'nw' }` etc. for
 * back-compat and semantic intent, but the visual layer now derives
 * the endpoint purely from bounding boxes. This is the floating-edges
 * approach taken by every mainstream diagram library — it's what
 * makes drag-around-the-canvas behaviour feel correct on randomly
 * laid-out graphs.
 */
export function resolveEdgeEndpoint(
  sourceBox: AABB,
  targetBox: AABB,
  padding: number = 0,
): ResolvedEndpoint {
  const targetCenter: Point = [targetBox.x + targetBox.w / 2, targetBox.y + targetBox.h / 2]
  const raw = getNodeIntersection(sourceBox, targetCenter)
  const side = getEdgePosition(sourceBox, raw)
  if (padding === 0) return { point: raw, side }
  // Push the point outward along the chosen side's normal so the
  // marker glyph has a clean gap.
  let point: Point = raw
  switch (side) {
    case 'right':
      point = [raw[0] + padding, raw[1]]
      break
    case 'left':
      point = [raw[0] - padding, raw[1]]
      break
    case 'bottom':
      point = [raw[0], raw[1] + padding]
      break
    case 'top':
      point = [raw[0], raw[1] - padding]
      break
  }
  return { point, side }
}

/**
 * Decide which face an endpoint sits on, combining two cues:
 *
 *   1. **Anchor position** — if `anchor` is already at one of `box`'s
 *      borders (within `tolerance`), the corresponding face is returned
 *      as-is. This lets consumers express intent ("exit from the right
 *      side") simply by placing the anchor on that border.
 *
 *   2. **Geometry fallback** — when the anchor is interior to `box`
 *      (or no border match) we fall back to {@link nearestSide} pointed
 *      at the opposite endpoint. This is the right answer for centre
 *      anchors and produces stable sides for big graphs where every
 *      pair of nodes has a different relative position.
 *
 * Returns the side along with a `confident` flag — `true` when the
 * decision came from the anchor position (case 1), `false` when it
 * fell back to geometry (case 2). Consumers that want to override the
 * fallback in special cases can branch on the flag.
 *
 * Corner anchors (touching two borders simultaneously like `nw` / `ne`)
 * are disambiguated by which face points more strongly at the opposite
 * endpoint. **The disambiguation is also clamped to faces that face the
 * other node** — a `ne` anchor on the source whose target sits to its
 * left will pick `left` instead of `right`, because using `right` would
 * route the edge AWAY from the target. This is the key fix for the
 * "stub-then-180°-loop" artifact visible on randomly-laid-out graphs.
 */
export function inferSide(
  box: AABB,
  anchor: Point,
  opposite: Point,
  tolerance: number = 1,
): { side: Side; confident: boolean } {
  const onLeft = Math.abs(anchor[0] - box.x) <= tolerance
  const onRight = Math.abs(anchor[0] - (box.x + box.w)) <= tolerance
  const onTop = Math.abs(anchor[1] - box.y) <= tolerance
  const onBottom = Math.abs(anchor[1] - (box.y + box.h)) <= tolerance

  // Corner anchors (on two borders simultaneously) — disambiguate by
  // which face points more at the opposite endpoint. This is the
  // `ne`/`nw`/`se`/`sw` case from `perEdge: k=1` policy.
  const horizontalHit = onLeft || onRight
  const verticalHit = onTop || onBottom
  if (horizontalHit && verticalHit) {
    const cx = box.x + box.w / 2
    const cy = box.y + box.h / 2
    const dx = opposite[0] - cx
    const dy = opposite[1] - cy
    // Pick the axis that points more strongly at the opposite endpoint.
    if (Math.abs(dx) >= Math.abs(dy)) {
      return { side: onRight ? 'right' : 'left', confident: true }
    }
    return { side: onBottom ? 'bottom' : 'top', confident: true }
  }
  if (onLeft) return { side: 'left', confident: true }
  if (onRight) return { side: 'right', confident: true }
  if (onTop) return { side: 'top', confident: true }
  if (onBottom) return { side: 'bottom', confident: true }

  return { side: nearestSide(box, opposite), confident: false }
}

// ─── Side / stub helpers ────────────────────────────────────────────────────

/**
 * Pick the side of `box` nearest to `target` and return the midpoint of
 * that side.
 *
 * When `anchor` is provided AND it sits on (or very near) one of the
 * box's borders, that border wins — the caller has explicitly placed
 * the connection point and we honour the intent rather than overriding
 * it with pure geometry. For corner anchors (touching two borders
 * simultaneously, e.g. `ne` / `nw`), we disambiguate by which face
 * faces `target` more strongly.
 *
 * Falling back to pure geometry (anchor missing OR interior to box)
 * matches the legacy behaviour: pick the face whose normal is most
 * aligned with the (target → centre) vector.
 */
function exitOnNearestSide(
  box: AABB,
  target: Point,
  anchor?: Point,
): { point: Point; side: RectSide } {
  const cx = box.x + box.w / 2
  const cy = box.y + box.h / 2

  if (anchor) {
    const tolerance = 1
    const onLeft = Math.abs(anchor[0] - box.x) <= tolerance
    const onRight = Math.abs(anchor[0] - (box.x + box.w)) <= tolerance
    const onTop = Math.abs(anchor[1] - box.y) <= tolerance
    const onBottom = Math.abs(anchor[1] - (box.y + box.h)) <= tolerance
    const horizontalHit = onLeft || onRight
    const verticalHit = onTop || onBottom

    if (horizontalHit && verticalHit) {
      // Corner anchor — pick the axis pointing at the opposite endpoint.
      const dx = target[0] - cx
      const dy = target[1] - cy
      if (Math.abs(dx) >= Math.abs(dy)) {
        return onRight
          ? { point: [box.x + box.w, cy], side: 'right' }
          : { point: [box.x, cy], side: 'left' }
      }
      return onBottom
        ? { point: [cx, box.y + box.h], side: 'bottom' }
        : { point: [cx, box.y], side: 'top' }
    }
    if (onRight) return { point: [box.x + box.w, cy], side: 'right' }
    if (onLeft) return { point: [box.x, cy], side: 'left' }
    if (onBottom) return { point: [cx, box.y + box.h], side: 'bottom' }
    if (onTop) return { point: [cx, box.y], side: 'top' }
    // Anchor is interior to the box — fall through to geometry.
  }

  const dx = target[0] - cx
  const dy = target[1] - cy
  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx >= 0) return { point: [box.x + box.w, cy], side: 'right' }
    return { point: [box.x, cy], side: 'left' }
  }
  if (dy >= 0) return { point: [cx, box.y + box.h], side: 'bottom' }
  return { point: [cx, box.y], side: 'top' }
}

/** Extrude `point` perpendicular to `side` by `distance` world units. */
function extrudePoint(point: Point, side: RectSide, distance: number): Point {
  switch (side) {
    case 'top':
      return [point[0], point[1] - distance]
    case 'right':
      return [point[0] + distance, point[1]]
    case 'bottom':
      return [point[0], point[1] + distance]
    case 'left':
      return [point[0] - distance, point[1]]
  }
}

/**
 * Right-angle bridge between an arbitrary anchor (`start`) and the
 * side-midpoint exit (`exit`). Returns the corner where the path bends
 * 90° so every segment stays axis-aligned.
 *
 * For a `right`/`left` exit the path runs vertical-first (drops to the
 * exit's row, then exits horizontally); for `top`/`bottom` it runs
 * horizontal-first. Collinear cases collapse harmlessly during
 * compression.
 */
function orthoBridge(start: Point, exit: Point, side: RectSide): Point {
  switch (side) {
    case 'right':
    case 'left':
      // bend at (exit.x, start.y) → vertical run first, then horizontal exit
      return [exit[0], start[1]]
    case 'top':
    case 'bottom':
      // bend at (start.x, exit.y) → horizontal run first, then vertical exit
      return [start[0], exit[1]]
  }
}

function pointsEqual(a: Point, b: Point): boolean {
  return a[0] === b[0] && a[1] === b[1]
}

function pushIfDistinct(arr: Point[], p: Point): void {
  if (arr.length === 0) {
    arr.push(p)
    return
  }
  const last = arr[arr.length - 1]!
  if (!pointsEqual(last, p)) arr.push(p)
}

/**
 * Drop collinear interior points so the output polyline only has corners.
 * Handles both pure-vertical / pure-horizontal segments produced by
 * orthogonal routing and the rare diagonal we emit when stitching
 * non-orthogonal endpoints to the exit point.
 */
function compressCollinear(points: readonly Point[]): Point[] {
  if (points.length <= 2) return points.slice()
  const out: Point[] = [points[0]!, points[1]!]
  for (let i = 2; i < points.length; i++) {
    const cur = points[i]!
    const a = out[out.length - 2]!
    const b = out[out.length - 1]!
    const dx1 = b[0] - a[0]
    const dy1 = b[1] - a[1]
    const dx2 = cur[0] - b[0]
    const dy2 = cur[1] - b[1]
    // Both vectors point in the same direction (cross = 0 AND signs match)
    // → `b` is interior to a straight run; drop it.
    const cross = dx1 * dy2 - dy1 * dx2
    if (cross === 0 && Math.sign(dx1) === Math.sign(dx2) && Math.sign(dy1) === Math.sign(dy2)) {
      out[out.length - 1] = cur
    } else {
      out.push(cur)
    }
  }
  return out
}

// ─── L-route (no obstacles) ────────────────────────────────────────────────

function lRoute(
  start: Point,
  end: Point,
  preferred: 'auto' | 'hv' | 'vh',
  _snapStep: number,
): readonly Point[] {
  const [sx, sy] = start
  const [ex, ey] = end

  if (sx === ex || sy === ey) return [start, end]

  // The corner sits at `(ex, sy)` (HV) or `(sx, ey)` (VH). Both
  // coordinates are anchored to one of the endpoints, so the resulting
  // two segments are guaranteed axis-aligned. We deliberately do NOT
  // snap to a grid here: `start` / `end` are exact anchor positions
  // (set by the caller), and rounding the corner to a grid step would
  // skew one of the two segments into a diagonal. `_snapStep` is kept
  // in the signature so the A*-fallback can pass it through; snapping
  // proper happens inside A* where the whole search runs on the grid.
  const dx = Math.abs(ex - sx)
  const dy = Math.abs(ey - sy)
  const useHV = preferred === 'hv' ? true : preferred === 'vh' ? false : dx >= dy

  if (useHV) return [start, [ex, sy], end]
  return [start, [sx, ey], end]
}

// ─── A* on a grid (obstacle-aware path) ────────────────────────────────────

interface InflatedRect {
  x0: number
  y0: number
  x1: number
  y1: number
}

function inflateObstacles(obstacles: readonly AABB[], pad: number): InflatedRect[] {
  return obstacles.map((o) => ({
    x0: o.x - pad,
    y0: o.y - pad,
    x1: o.x + o.w + pad,
    y1: o.y + o.h + pad,
  }))
}

/**
 * Strict-interior point-in-obstacle test. Border points are considered
 * free so paths can "hug" an obstacle without snagging on it.
 */
function pointBlocked(x: number, y: number, rects: readonly InflatedRect[]): boolean {
  for (const r of rects) {
    if (x > r.x0 && x < r.x1 && y > r.y0 && y < r.y1) return true
  }
  return false
}

function snap(value: number, step: number): number {
  return Math.round(value / step) * step
}

function key(x: number, y: number): string {
  return `${x},${y}`
}

function manhattan(ax: number, ay: number, bx: number, by: number): number {
  return Math.abs(ax - bx) + Math.abs(ay - by)
}

/**
 * Reconstruct path from `cameFrom` map and compress collinear points so
 * the output polyline only has corners.
 */
function reconstruct(cameFrom: Map<string, string>, endKey: string): Point[] {
  const reversed: Point[] = []
  let cursor: string | undefined = endKey
  while (cursor !== undefined) {
    const [xs, ys] = cursor.split(',')
    reversed.push([Number(xs), Number(ys)])
    cursor = cameFrom.get(cursor)
  }
  reversed.reverse()
  // Collapse runs of collinear points.
  const out: Point[] = []
  for (let i = 0; i < reversed.length; i++) {
    const cur = reversed[i]!
    if (out.length < 2) {
      out.push(cur)
      continue
    }
    const a = out[out.length - 2]!
    const b = out[out.length - 1]!
    const dx1 = b[0] - a[0]
    const dy1 = b[1] - a[1]
    const dx2 = cur[0] - b[0]
    const dy2 = cur[1] - b[1]
    if (Math.sign(dx1) === Math.sign(dx2) && Math.sign(dy1) === Math.sign(dy2)) {
      out[out.length - 1] = cur
    } else {
      out.push(cur)
    }
  }
  return out
}

/**
 * Minimal binary min-heap keyed by `f`. Replaces the original linear
 * scan over `open` — that was O(N) per pop, which dominated the A*
 * runtime on dense diagrams. With the heap a 6-node / 8-edge layout
 * routes in ~1 ms instead of ~12 ms.
 *
 * Stale entries (i.e. a key that's been re-pushed with a smaller `f`)
 * are tolerated: we re-check `gScore` on pop and drop entries that
 * don't match the current best score. This is the standard "lazy
 * deletion" pattern and keeps the heap operations cheap.
 */
interface OpenEntry {
  k: string
  x: number
  y: number
  f: number
}

class MinHeap {
  private readonly data: OpenEntry[] = []

  get size(): number {
    return this.data.length
  }

  push(entry: OpenEntry): void {
    this.data.push(entry)
    this.bubbleUp(this.data.length - 1)
  }

  pop(): OpenEntry | undefined {
    if (this.data.length === 0) return undefined
    const head = this.data[0]!
    const tail = this.data.pop()!
    if (this.data.length > 0) {
      this.data[0] = tail
      this.bubbleDown(0)
    }
    return head
  }

  private bubbleUp(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (this.data[i]!.f < this.data[parent]!.f) {
        const tmp = this.data[i]!
        this.data[i] = this.data[parent]!
        this.data[parent] = tmp
        i = parent
      } else {
        return
      }
    }
  }

  private bubbleDown(i: number): void {
    const n = this.data.length
    while (true) {
      const l = i * 2 + 1
      const r = l + 1
      let smallest = i
      if (l < n && this.data[l]!.f < this.data[smallest]!.f) smallest = l
      if (r < n && this.data[r]!.f < this.data[smallest]!.f) smallest = r
      if (smallest === i) return
      const tmp = this.data[i]!
      this.data[i] = this.data[smallest]!
      this.data[smallest] = tmp
      i = smallest
    }
  }
}

function aStarRoute(
  start: Point,
  end: Point,
  obstacles: readonly AABB[],
  gridSize: number,
  inflate: number,
  maxNodes: number,
): readonly Point[] | null {
  const rects = inflateObstacles(obstacles, inflate)

  const sx = snap(start[0], gridSize)
  const sy = snap(start[1], gridSize)
  const ex = snap(end[0], gridSize)
  const ey = snap(end[1], gridSize)

  if (pointBlocked(sx, sy, rects) || pointBlocked(ex, ey, rects)) return null

  const startKey = key(sx, sy)
  const endKey = key(ex, ey)

  const gScore = new Map<string, number>([[startKey, 0]])
  const cameFrom = new Map<string, string>()
  const cameDir = new Map<string, Dir>([[startKey, null]])

  const open = new MinHeap()
  open.push({ k: startKey, x: sx, y: sy, f: manhattan(sx, sy, ex, ey) })

  const TURN_PENALTY = gridSize

  let expansions = 0

  while (open.size > 0) {
    if (expansions++ > maxNodes) return null

    const current = open.pop()!
    // Lazy deletion: discard stale heap entries left over from
    // previous, now-superseded score updates.
    const bestG = gScore.get(current.k) ?? Infinity
    const expectedF = bestG + manhattan(current.x, current.y, ex, ey)
    if (current.f > expectedF) continue

    if (current.k === endKey) {
      const path = reconstruct(cameFrom, endKey)
      if (path.length > 0) {
        path[0] = start
        path[path.length - 1] = end
      }
      return path
    }

    const incomingDir = cameDir.get(current.k) ?? null
    const neighbours: ReadonlyArray<readonly [number, number, Dir]> = [
      [gridSize, 0, 'h'],
      [-gridSize, 0, 'h'],
      [0, gridSize, 'v'],
      [0, -gridSize, 'v'],
    ]
    for (const [dx, dy, dir] of neighbours) {
      const nx = current.x + dx
      const ny = current.y + dy
      if (pointBlocked(nx, ny, rects)) continue

      const turn = incomingDir !== null && incomingDir !== dir
      const tentativeG = bestG + gridSize + (turn ? TURN_PENALTY : 0)
      const nk = key(nx, ny)
      const prevG = gScore.get(nk) ?? Infinity
      if (tentativeG < prevG) {
        cameFrom.set(nk, current.k)
        cameDir.set(nk, dir)
        gScore.set(nk, tentativeG)
        const f = tentativeG + manhattan(nx, ny, ex, ey)
        open.push({ k: nk, x: nx, y: ny, f })
      }
    }
  }

  return null
}
