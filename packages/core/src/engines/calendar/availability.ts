import type { AvailabilityRule, DayOfWeek, Resource } from './types'

const DAY_MS = 86_400_000

/**
 * Parse `HH:MM` into milliseconds-from-midnight.
 *
 * Returns `null` for malformed input — callers treat that as "rule has no
 * window on this side" (i.e. the canonical 00:00 / 24:00 fallback).
 */
function parseHHMM(s: string | undefined, fallback: number): number {
  if (s === undefined) return fallback
  const m = /^(\d{1,2}):(\d{2})$/.exec(s)
  if (!m) return fallback
  const h = Number(m[1])
  const mm = Number(m[2])
  if (!Number.isFinite(h) || !Number.isFinite(mm)) return fallback
  if (h < 0 || h > 24 || mm < 0 || mm >= 60) return fallback
  return h * 3_600_000 + mm * 60_000
}

/** Rules attached to one resource. Cheap to compute, cached per call. */
function rulesFor(
  resourceId: string,
  rules: readonly AvailabilityRule[],
): AvailabilityRule[] {
  return rules.filter((r) => r.resourceId === resourceId)
}

function dayBucket(t: number): { dayStart: number; dayOfWeek: DayOfWeek } {
  // Floor to UTC day boundary; getUTCDay returns 0..6 (Sun..Sat).
  const d = new Date(t)
  const dayStart =
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  const dayOfWeek = new Date(dayStart).getUTCDay() as DayOfWeek
  return { dayStart, dayOfWeek }
}

/**
 * `true` ⇔ the entire `[start, end)` interval falls inside at least one
 * availability window for `resource`. A resource without any matching
 * rule (or without any rules at all) is considered always available —
 * unconfigured calendars stay friendly.
 *
 * Implementation: walk one UTC day at a time and check that the slice of
 * `[start, end)` intersected with that day is fully covered by the union
 * of windows attached to that day. The union is built by sorting rule
 * windows by `from` and merging overlaps in O(k log k) where k = rules
 * for that day (typically 1–3).
 */
export function isAvailable(
  resource: Resource,
  range: { start: number; end: number },
  rules: readonly AvailabilityRule[],
): boolean {
  if (range.end <= range.start) return true

  const own = rulesFor(resource.id, rules)
  if (own.length === 0) return true

  let cursor = range.start
  while (cursor < range.end) {
    const { dayStart, dayOfWeek } = dayBucket(cursor)
    const dayEnd = dayStart + DAY_MS
    const sliceEnd = Math.min(range.end, dayEnd)

    const dayRules = own.filter(
      (r) => r.dayOfWeek === undefined || r.dayOfWeek === dayOfWeek,
    )
    if (dayRules.length === 0) return false

    // Build union of windows for this day, in absolute ms.
    const intervals = dayRules
      .map((r) => {
        const fromMs = parseHHMM(r.from, 0)
        const toMs = parseHHMM(r.to, DAY_MS)
        return { from: dayStart + fromMs, to: dayStart + toMs }
      })
      .filter((w) => w.to > w.from)
      .sort((a, b) => a.from - b.from)

    if (intervals.length === 0) return false

    const merged: Array<{ from: number; to: number }> = []
    for (const w of intervals) {
      const last = merged[merged.length - 1]
      if (last && w.from <= last.to) {
        last.to = Math.max(last.to, w.to)
      } else {
        merged.push({ ...w })
      }
    }

    // The required slice for this day is [cursor, sliceEnd). It must be
    // fully contained in the union. We sweep the merged windows.
    let needed = cursor
    for (const w of merged) {
      if (w.from > needed) return false
      if (w.to >= sliceEnd) {
        needed = sliceEnd
        break
      }
      needed = Math.max(needed, w.to)
    }
    if (needed < sliceEnd) return false

    cursor = sliceEnd
  }

  return true
}
