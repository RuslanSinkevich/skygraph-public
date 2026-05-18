import type { AABB, Point } from './types'

/**
 * Oriented Bounding Box — a rectangle in world space described by its centre,
 * half-extents along its local axes, and a rotation angle.
 *
 * Used when a node has a non-zero `transform.rot`: the AABB is no longer a
 * tight fit, so callers that need a tight collision shape (selection
 * outline, manipulator handles, etc.) should use the OBB instead.
 *
 * Conventions:
 *   - `center` is the centre of the rectangle in world coordinates.
 *   - `halfWidth` / `halfHeight` are the half-extents along the OBB's own
 *     local axes (already pre-multiplied by the world scale).
 *   - `angle` is the rotation of the OBB's local frame relative to world,
 *     in radians, positive counter-clockwise.
 *
 * For an axis-aligned node (`angle === 0`) the OBB and AABB coincide, modulo
 * the (centre + half-extents) vs (top-left + size) representation.
 */
export interface OBB {
  readonly center: Point
  readonly halfWidth: number
  readonly halfHeight: number
  readonly angle: number
}

/**
 * Compute the four corners of an OBB in world space.
 *
 * Order is: top-left → top-right → bottom-right → bottom-left in OBB-local
 * space, after applying the rotation. Useful for SVG `<polygon>` rendering
 * and for AABB derivation.
 */
export function obbCorners(obb: OBB): readonly [Point, Point, Point, Point] {
  const cos = Math.cos(obb.angle)
  const sin = Math.sin(obb.angle)
  const { halfWidth: hw, halfHeight: hh } = obb
  const [cx, cy] = obb.center
  // local corners (TL, TR, BR, BL)
  const lx: readonly number[] = [-hw, hw, hw, -hw]
  const ly: readonly number[] = [-hh, -hh, hh, hh]
  const out: Point[] = []
  for (let i = 0; i < 4; i++) {
    const x = lx[i]!
    const y = ly[i]!
    out.push([cx + x * cos - y * sin, cy + x * sin + y * cos])
  }
  return out as unknown as readonly [Point, Point, Point, Point]
}

/**
 * Build the tightest axis-aligned bounding box that contains a given OBB.
 *
 * For a non-zero `angle` the resulting AABB is strictly larger (in area)
 * than the OBB — it has to enclose all four rotated corners. This is the
 * canonical "broad-phase" box used by the routing layer.
 */
export function aabbFromOBB(obb: OBB): AABB {
  const corners = obbCorners(obb)
  let x0 = corners[0][0]
  let x1 = corners[0][0]
  let y0 = corners[0][1]
  let y1 = corners[0][1]
  for (let i = 1; i < 4; i++) {
    const [x, y] = corners[i]!
    if (x < x0) x0 = x
    if (x > x1) x1 = x
    if (y < y0) y0 = y
    if (y > y1) y1 = y
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

/**
 * Test whether a world-space point lies inside an OBB.
 *
 * Inverse-rotates the point into OBB-local space and checks the
 * half-extents. O(1).
 */
export function obbContainsPoint(obb: OBB, p: Point): boolean {
  const cos = Math.cos(-obb.angle)
  const sin = Math.sin(-obb.angle)
  const dx = p[0] - obb.center[0]
  const dy = p[1] - obb.center[1]
  const lx = dx * cos - dy * sin
  const ly = dx * sin + dy * cos
  return Math.abs(lx) <= obb.halfWidth && Math.abs(ly) <= obb.halfHeight
}
