import type { AABB, NodeId } from '@skygraph/core'

/**
 * Internal helpers for {@link Diagram} selection / lasso. Pure functions —
 * no React, no DOM. Easy to unit-test and reuse from custom drag handlers.
 */

/** Axis-aligned rectangle in *screen* pixels (lasso uses these). */
export interface ScreenRect {
  x: number
  y: number
  w: number
  h: number
}

/**
 * Convert a {x0, y0, x1, y1} pair captured during a lasso drag into a
 * normalised positive-extent rectangle.
 */
export function rectFromCorners(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): ScreenRect {
  const x = Math.min(x0, x1)
  const y = Math.min(y0, y1)
  return { x, y, w: Math.abs(x1 - x0), h: Math.abs(y1 - y0) }
}

/** Project a screen-space rectangle into world-space using the current view. */
export function screenRectToWorld(
  rect: ScreenRect,
  view: { panX: number; panY: number; zoom: number },
): ScreenRect {
  const z = view.zoom || 1
  return {
    x: (rect.x - view.panX) / z,
    y: (rect.y - view.panY) / z,
    w: rect.w / z,
    h: rect.h / z,
  }
}

/** AABB / AABB intersection test (closed intervals). */
export function aabbsIntersect(a: AABB, b: AABB): boolean {
  if (a.x + a.w < b.x) return false
  if (b.x + b.w < a.x) return false
  if (a.y + a.h < b.y) return false
  if (b.y + b.h < a.y) return false
  return true
}

/**
 * Pick every entry of `boundsById` whose AABB intersects `world`.
 * Stable ordering — caller doesn't have to sort.
 */
export function nodesInBox(
  boundsById: ReadonlyMap<NodeId, AABB>,
  world: ScreenRect,
): NodeId[] {
  const out: NodeId[] = []
  for (const [id, bb] of boundsById) {
    if (aabbsIntersect(bb, world)) out.push(id)
  }
  return out
}

/** Toggle membership of `id` in `selection` (immutable). */
export function toggleSelection(selection: readonly NodeId[], id: NodeId): NodeId[] {
  const idx = selection.indexOf(id)
  if (idx === -1) return [...selection, id]
  const next = selection.slice()
  next.splice(idx, 1)
  return next
}

/** Compare two selection arrays as multisets. */
export function selectionsEqual(a: readonly NodeId[], b: readonly NodeId[]): boolean {
  if (a === b) return true
  if (a.length !== b.length) return false
  const sa = new Set(a)
  for (const id of b) if (!sa.has(id)) return false
  return true
}
