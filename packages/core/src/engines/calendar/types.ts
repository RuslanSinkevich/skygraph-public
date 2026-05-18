/**
 * Resource Calendar — engine domain types.
 *
 * The engine works with `number` (epoch ms) timestamps internally so the
 * full state can round-trip through `core.snapshot()` / `core.restore()`
 * without any custom (de)serialization. The React adapter accepts both
 * `Date` and `number` on the public surface and normalizes on input.
 */

export type CalendarScale = 'day' | 'week' | 'month'

export type AssignmentStatus = 'tentative' | 'confirmed' | 'conflict'

export type ConflictReason = 'overlap' | 'over-capacity' | 'outside-availability'

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface Resource {
  id: string
  name: string
  /** Optional accent colour rendered alongside the resource label. */
  color?: string
  /**
   * Maximum number of simultaneous assignments tolerated on this resource
   * within the same scale-step. `undefined` ≡ no concurrency limit
   * (overlaps still count as `overlap` conflicts but never as
   * `over-capacity`). When set, every slot whose concurrent count exceeds
   * `capacityPerSlot` produces an `over-capacity` conflict containing
   * exactly the assignments that touch that slot.
   */
  capacityPerSlot?: number
  /** Free-form metadata. The engine ignores this and round-trips it as-is. */
  meta?: unknown
}

/**
 * A single booking on the timeline.
 *
 * `start` / `end` are stored as epoch milliseconds. `start` is inclusive,
 * `end` is exclusive — same convention as `GanttTask` and the JS `Date`
 * arithmetic the engine uses internally.
 */
export interface Assignment {
  id: string
  resourceId: string
  start: number
  end: number
  title: string
  /**
   * `'conflict'` is set automatically by the engine after every mutation
   * for assignments that participate in at least one detected conflict;
   * consumers may pass `'tentative'` / `'confirmed'` to label the
   * underlying intent, those values are preserved and only escalated to
   * `'conflict'` when a conflict actually exists.
   */
  status?: AssignmentStatus
  meta?: unknown
}

export interface Conflict {
  id: string
  /** Assignments involved, sorted ascending by id for stable equality. */
  assignmentIds: string[]
  reason: ConflictReason
}

/**
 * Availability rule.
 *
 * v0 keeps the rule shape minimal — `dayOfWeek` plus an `HH:MM` window.
 * One rule = one window. Multiple windows on the same day = multiple
 * rules. A resource with NO rules is considered always available.
 *
 * TODO(round-10): exception dates (`exception: { date, kind }`) for
 * one-off blackouts / additions are explicitly out of scope for v0 — the
 * spec calls them out but the use-cases (PTO calendars, holiday packs)
 * are not finalised yet. Add them once a production consumer needs
 * either kind so we don't bake the wrong shape in.
 */
export interface AvailabilityRule {
  resourceId: string
  /** 0 = Sunday … 6 = Saturday. Omitted ≡ rule applies every day. */
  dayOfWeek?: DayOfWeek
  /** `HH:MM` (24h, UTC). Omitted ≡ open from 00:00. */
  from?: string
  /** `HH:MM` (24h, UTC). Omitted ≡ open until 24:00. */
  to?: string
}

export interface CalendarState {
  resources: Resource[]
  assignments: Assignment[]
  conflicts: Conflict[]
}

export interface DetectConflictsOptions {
  scale?: CalendarScale
  rules?: readonly AvailabilityRule[]
}

export interface CalendarEngineOptions {
  /** Optional debug name appended to the generated engine id. */
  name?: string
  /** Default scale used for capacity slot computation. @default 'day' */
  scale?: CalendarScale
  /** Initial availability rules. Can be replaced via `setRules` later. */
  rules?: readonly AvailabilityRule[]
}

export interface CalendarEngine {
  /** Stable engine id. Used as the suffix on the `$calendar.<id>.*` paths. */
  readonly id: string

  // ── Resources ──
  addResource(resource: Resource): void
  removeResource(id: string): void
  updateResource(id: string, patch: Partial<Resource>): void
  getResource(id: string): Resource | undefined
  getResources(): Resource[]

  // ── Assignments ──
  addAssignment(assignment: Assignment): void
  updateAssignment(id: string, patch: Partial<Assignment>): void
  removeAssignment(id: string): void
  /** Shifts both `start` and `end` by `deltaMs`. */
  moveAssignment(id: string, deltaMs: number): void
  /**
   * Resizes one side. `'end'` shifts only the end timestamp;
   * `'start'` shifts only the start. The opposite side stays put.
   * The engine clamps the result so the assignment never inverts —
   * minimum width is `1` ms (the React adapter additionally enforces
   * a per-scale step in its drag handler).
   */
  resizeAssignment(id: string, side: 'start' | 'end', deltaMs: number): void
  getAssignment(id: string): Assignment | undefined
  getAssignments(): Assignment[]

  // ── Availability rules ──
  setRules(rules: readonly AvailabilityRule[]): void
  getRules(): AvailabilityRule[]

  // ── Conflicts ──
  /** Latest computed conflicts; refreshed automatically on mutations. */
  getConflicts(): Conflict[]

  // ── View ──
  setScale(scale: CalendarScale): void
  getScale(): CalendarScale
  getState(): CalendarState

  /** Subscribe to ANY engine mutation. Returns an unsubscribe fn. */
  subscribe(cb: () => void): () => void

  /** Reset the engine — drops resources, assignments, rules, conflicts. */
  clear(): void
}
