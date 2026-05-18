import type { Core } from '../../types'
import { CALENDAR_PREFIX } from '../namespaces'
import { detectConflicts } from './conflicts'
import type {
  Assignment,
  AvailabilityRule,
  CalendarEngine,
  CalendarEngineOptions,
  CalendarScale,
  CalendarState,
  Conflict,
  Resource,
} from './types'

let calendarCounter = 0

/**
 * Resource Calendar engine — the sixth member of the
 * form / table / tree / virtual / graph / **calendar** family.
 *
 * The in-memory maps are the source of truth and the public read API;
 * snapshots are mirrored to the Core store under
 * `$calendar.<id>.{resources,assignments,conflicts,view}` so other
 * engines / external observers can react via `core.subscribe(...)`.
 *
 * v0 scope:
 *   - addResource / removeResource / updateResource
 *   - addAssignment / updateAssignment / removeAssignment
 *   - moveAssignment(id, deltaMs) — shifts both ends together
 *   - resizeAssignment(id, side, deltaMs) — clamps so width >= 1ms
 *   - setRules / setScale — re-compute conflicts on change
 *   - detectConflicts under the hood; status of involved assignments
 *     is auto-promoted to `'conflict'` so the React adapter can render
 *     without re-running the algorithm.
 *
 * NOT in v0 (deferred to round-10):
 *   - exception dates on `AvailabilityRule`
 *   - full per-engine undo/redo (use `core.snapshot/restore` instead)
 *   - aggregate read APIs over a sub-range
 */
export function createCalendar(
  core: Core,
  options?: CalendarEngineOptions,
): CalendarEngine {
  const engineId = `c${calendarCounter++}${options?.name ? `-${options.name}` : ''}`
  const prefix = CALENDAR_PREFIX

  const resources = new Map<string, Resource>()
  const assignments = new Map<string, Assignment>()
  let rules: AvailabilityRule[] = options?.rules ? [...options.rules] : []
  let scale: CalendarScale = options?.scale ?? 'day'
  let conflicts: Conflict[] = []

  const localSubscribers = new Set<() => void>()

  function publish(): void {
    const resList = [...resources.values()]
    const assignList = [...assignments.values()]
    core.batch(() => {
      core.set(`${prefix}${engineId}.resources`, resList)
      core.set(`${prefix}${engineId}.assignments`, assignList)
      core.set(`${prefix}${engineId}.conflicts`, conflicts)
      core.set(`${prefix}${engineId}.view`, { scale })
    })
    for (const cb of localSubscribers) cb()
  }

  function recompute(): void {
    conflicts = detectConflicts(
      { resources: [...resources.values()], assignments: [...assignments.values()] },
      { scale, rules },
    )
    // Promote involved assignments to status: 'conflict'. Assignments
    // that aren't in any conflict get their original (or default)
    // status restored. We don't lose the underlying intent: the
    // promotion is reversible and recomputed on every mutation.
    const involved = new Set<string>()
    for (const c of conflicts) for (const id of c.assignmentIds) involved.add(id)
    for (const [id, a] of assignments) {
      const isConflicting = involved.has(id)
      if (isConflicting && a.status !== 'conflict') {
        assignments.set(id, { ...a, status: 'conflict' })
      } else if (!isConflicting && a.status === 'conflict') {
        // Drop the auto-`conflict` flag — the original intent (tentative
        // / confirmed / undefined) was lost when we promoted, and the
        // adapter only needs to know "no longer conflicting", so we
        // default back to `'tentative'` which is the safest fallback.
        assignments.set(id, { ...a, status: 'tentative' })
      }
    }
  }

  function commitAndPublish(): void {
    recompute()
    publish()
  }

  function subscribe(cb: () => void): () => void {
    localSubscribers.add(cb)
    return () => {
      localSubscribers.delete(cb)
    }
  }

  function addResource(resource: Resource): void {
    if (resources.has(resource.id)) {
      throw new Error(
        `[skygraph/calendar] resource id "${resource.id}" already exists`,
      )
    }
    resources.set(resource.id, { ...resource })
    commitAndPublish()
  }

  function removeResource(id: string): void {
    if (!resources.has(id)) return
    resources.delete(id)
    // Cascade: drop assignments tied to this resource.
    for (const [aid, a] of assignments) {
      if (a.resourceId === id) assignments.delete(aid)
    }
    commitAndPublish()
  }

  function updateResource(id: string, patch: Partial<Resource>): void {
    const r = resources.get(id)
    if (!r) throw new Error(`[skygraph/calendar] resource "${id}" not found`)
    resources.set(id, { ...r, ...patch, id })
    commitAndPublish()
  }

  function getResource(id: string): Resource | undefined {
    return resources.get(id)
  }

  function getResources(): Resource[] {
    return [...resources.values()]
  }

  function addAssignment(assignment: Assignment): void {
    if (assignments.has(assignment.id)) {
      throw new Error(
        `[skygraph/calendar] assignment id "${assignment.id}" already exists`,
      )
    }
    if (!resources.has(assignment.resourceId)) {
      throw new Error(
        `[skygraph/calendar] addAssignment: resource "${assignment.resourceId}" not found`,
      )
    }
    if (assignment.end <= assignment.start) {
      throw new Error(
        `[skygraph/calendar] addAssignment: end (${assignment.end}) must be greater than start (${assignment.start})`,
      )
    }
    assignments.set(assignment.id, { ...assignment })
    commitAndPublish()
  }

  function updateAssignment(id: string, patch: Partial<Assignment>): void {
    const a = assignments.get(id)
    if (!a) throw new Error(`[skygraph/calendar] assignment "${id}" not found`)
    const next: Assignment = { ...a, ...patch, id }
    if (next.end <= next.start) {
      throw new Error(
        `[skygraph/calendar] updateAssignment: end (${next.end}) must be greater than start (${next.start})`,
      )
    }
    if (!resources.has(next.resourceId)) {
      throw new Error(
        `[skygraph/calendar] updateAssignment: resource "${next.resourceId}" not found`,
      )
    }
    assignments.set(id, next)
    commitAndPublish()
  }

  function removeAssignment(id: string): void {
    if (!assignments.has(id)) return
    assignments.delete(id)
    commitAndPublish()
  }

  function moveAssignment(id: string, deltaMs: number): void {
    const a = assignments.get(id)
    if (!a) throw new Error(`[skygraph/calendar] assignment "${id}" not found`)
    if (deltaMs === 0) return
    assignments.set(id, { ...a, start: a.start + deltaMs, end: a.end + deltaMs })
    commitAndPublish()
  }

  function resizeAssignment(
    id: string,
    side: 'start' | 'end',
    deltaMs: number,
  ): void {
    const a = assignments.get(id)
    if (!a) throw new Error(`[skygraph/calendar] assignment "${id}" not found`)
    if (deltaMs === 0) return
    let next: Assignment
    if (side === 'end') {
      const nextEnd = Math.max(a.start + 1, a.end + deltaMs)
      next = { ...a, end: nextEnd }
    } else {
      const nextStart = Math.min(a.end - 1, a.start + deltaMs)
      next = { ...a, start: nextStart }
    }
    assignments.set(id, next)
    commitAndPublish()
  }

  function getAssignment(id: string): Assignment | undefined {
    return assignments.get(id)
  }

  function getAssignments(): Assignment[] {
    return [...assignments.values()]
  }

  function setRules(next: readonly AvailabilityRule[]): void {
    rules = [...next]
    commitAndPublish()
  }

  function getRules(): AvailabilityRule[] {
    return [...rules]
  }

  function getConflicts(): Conflict[] {
    return [...conflicts]
  }

  function setScale(next: CalendarScale): void {
    if (next === scale) return
    scale = next
    commitAndPublish()
  }

  function getScale(): CalendarScale {
    return scale
  }

  function getState(): CalendarState {
    return {
      resources: [...resources.values()],
      assignments: [...assignments.values()],
      conflicts: [...conflicts],
    }
  }

  function clear(): void {
    resources.clear()
    assignments.clear()
    rules = []
    conflicts = []
    publish()
  }

  publish() // initial empty publish so subscribers see a stable shape

  return {
    id: engineId,
    addResource,
    removeResource,
    updateResource,
    getResource,
    getResources,
    addAssignment,
    updateAssignment,
    removeAssignment,
    moveAssignment,
    resizeAssignment,
    getAssignment,
    getAssignments,
    setRules,
    getRules,
    getConflicts,
    setScale,
    getScale,
    getState,
    subscribe,
    clear,
  }
}
