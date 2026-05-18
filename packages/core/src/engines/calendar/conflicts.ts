import { isAvailable } from './availability'
import type {
  Assignment,
  AvailabilityRule,
  CalendarScale,
  CalendarState,
  Conflict,
  Resource,
} from './types'

const DAY_MS = 86_400_000
const STEP_MS: Record<CalendarScale, number> = {
  day: DAY_MS,
  week: 7 * DAY_MS,
  month: 30 * DAY_MS,
}

export interface DetectConflictsArgs {
  scale?: CalendarScale
  rules?: readonly AvailabilityRule[]
}

function makeId(reason: Conflict['reason'], ids: readonly string[]): string {
  return `${reason}:${[...ids].sort().join(',')}`
}

function pushConflict(
  out: Map<string, Conflict>,
  reason: Conflict['reason'],
  ids: string[],
): void {
  if (ids.length === 0) return
  const sorted = [...ids].sort()
  const id = makeId(reason, sorted)
  if (out.has(id)) return
  out.set(id, { id, reason, assignmentIds: sorted })
}

/**
 * Find all conflicts in `state`.
 *
 * Algorithm — three independent passes, results de-duplicated by
 * `(reason, sorted-ids)` so the same overlapping pair is never reported
 * twice as `overlap`:
 *
 *   1. **overlap** (per resource): sort assignments by `start` and sweep.
 *      Keep an active set ordered by `end` ASC; whenever a new
 *      assignment opens, every still-active assignment forms a pairwise
 *      `overlap` conflict with it. O(n log n + k) where k = total
 *      overlapping pairs.
 *
 *   2. **over-capacity** (per resource with `capacityPerSlot`): bucket
 *      every assignment into the slots it touches (1 slot = 1 scale
 *      step). For each slot whose concurrent count exceeds capacity,
 *      emit one `over-capacity` conflict naming exactly the assignments
 *      that touch that slot. This is the simple counter approach (no
 *      interval tree) — fine up to ~10⁵ assignments per resource.
 *
 *   3. **outside-availability**: per-assignment check via
 *      `isAvailable`. Each violation becomes its own one-element
 *      conflict.
 */
export function detectConflicts(
  state: Pick<CalendarState, 'resources' | 'assignments'>,
  opts: DetectConflictsArgs = {},
): Conflict[] {
  const scale = opts.scale ?? 'day'
  const step = STEP_MS[scale]
  const rules = opts.rules ?? []
  const conflicts = new Map<string, Conflict>()

  const byResource = new Map<string, Assignment[]>()
  for (const a of state.assignments) {
    let bucket = byResource.get(a.resourceId)
    if (!bucket) {
      bucket = []
      byResource.set(a.resourceId, bucket)
    }
    bucket.push(a)
  }

  // ── 1. Pairwise overlap (per resource) ─────────────────────────────
  for (const list of byResource.values()) {
    const sorted = [...list].sort((x, y) => x.start - y.start)
    for (let i = 0; i < sorted.length; i++) {
      const a = sorted[i]!
      for (let j = i + 1; j < sorted.length; j++) {
        const b = sorted[j]!
        if (b.start >= a.end) break
        // Touching boundaries (b.start === a.end) is NOT a conflict —
        // assignment ranges are half-open [start, end).
        pushConflict(conflicts, 'overlap', [a.id, b.id])
      }
    }
  }

  // ── 2. Over-capacity per slot (per resource with capacityPerSlot) ──
  const resourceById = new Map<string, Resource>()
  for (const r of state.resources) resourceById.set(r.id, r)

  for (const [rid, list] of byResource) {
    const resource = resourceById.get(rid)
    if (!resource || resource.capacityPerSlot === undefined) continue
    const cap = Math.max(0, Math.floor(resource.capacityPerSlot))

    const slotMap = new Map<number, string[]>()
    for (const a of list) {
      // Every slot the assignment touches.
      const lo = Math.floor(a.start / step) * step
      const hi = Math.ceil(a.end / step) * step
      for (let s = lo; s < hi; s += step) {
        let bucket = slotMap.get(s)
        if (!bucket) {
          bucket = []
          slotMap.set(s, bucket)
        }
        bucket.push(a.id)
      }
    }

    for (const ids of slotMap.values()) {
      if (ids.length > cap) {
        pushConflict(conflicts, 'over-capacity', ids)
      }
    }
  }

  // ── 3. Outside availability (per assignment) ───────────────────────
  if (rules.length > 0) {
    for (const a of state.assignments) {
      const r = resourceById.get(a.resourceId)
      if (!r) continue
      if (!isAvailable(r, { start: a.start, end: a.end }, rules)) {
        pushConflict(conflicts, 'outside-availability', [a.id])
      }
    }
  }

  return [...conflicts.values()]
}
