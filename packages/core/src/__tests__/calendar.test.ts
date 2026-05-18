import { describe, it, expect, vi } from 'vitest'
import { createCore } from '../Core'
import { createCalendar } from '../engines/calendar/CalendarEngine'
import { detectConflicts } from '../engines/calendar/conflicts'
import { isAvailable } from '../engines/calendar/availability'
import type {
  Assignment,
  AvailabilityRule,
  Resource,
} from '../engines/calendar/types'

const HOUR = 3_600_000
const DAY = 86_400_000
const D = (y: number, m: number, d: number, h = 0): number =>
  Date.UTC(y, m, d, h)

function setup() {
  const core = createCore()
  const cal = createCalendar(core)
  return { core, cal }
}

const alice: Resource = { id: 'alice', name: 'Alice' }
const bob: Resource = { id: 'bob', name: 'Bob' }

// ─── Resources ──────────────────────────────────────────────────────────────

describe('CalendarEngine — resources', () => {
  it('addResource stores the resource and exposes it via getResource', () => {
    const { cal } = setup()
    cal.addResource(alice)
    expect(cal.getResource('alice')).toEqual(alice)
    expect(cal.getResources()).toEqual([alice])
  })

  it('addResource throws on duplicate id', () => {
    const { cal } = setup()
    cal.addResource(alice)
    expect(() => cal.addResource({ ...alice })).toThrow(/already exists/)
  })

  it('removeResource also drops assignments tied to it', () => {
    const { cal } = setup()
    cal.addResource(alice)
    cal.addAssignment({
      id: 'a1',
      resourceId: 'alice',
      start: D(2026, 0, 5),
      end: D(2026, 0, 6),
      title: 'A',
    })
    cal.removeResource('alice')
    expect(cal.getResource('alice')).toBeUndefined()
    expect(cal.getAssignment('a1')).toBeUndefined()
  })

  it('updateResource patches in place but keeps id stable', () => {
    const { cal } = setup()
    cal.addResource(alice)
    cal.updateResource('alice', { name: 'A. Cooper', color: '#ff0000' })
    expect(cal.getResource('alice')).toMatchObject({
      id: 'alice',
      name: 'A. Cooper',
      color: '#ff0000',
    })
  })
})

// ─── Assignments ────────────────────────────────────────────────────────────

describe('CalendarEngine — assignments', () => {
  it('addAssignment validates resource existence', () => {
    const { cal } = setup()
    expect(() =>
      cal.addAssignment({
        id: 'a1',
        resourceId: 'ghost',
        start: D(2026, 0, 5),
        end: D(2026, 0, 6),
        title: 'A',
      }),
    ).toThrow(/resource "ghost" not found/)
  })

  it('addAssignment rejects end <= start', () => {
    const { cal } = setup()
    cal.addResource(alice)
    expect(() =>
      cal.addAssignment({
        id: 'a1',
        resourceId: 'alice',
        start: D(2026, 0, 5),
        end: D(2026, 0, 5),
        title: 'A',
      }),
    ).toThrow(/end .* must be greater than start/)
  })

  it('addAssignment throws on duplicate id', () => {
    const { cal } = setup()
    cal.addResource(alice)
    cal.addAssignment({
      id: 'a1',
      resourceId: 'alice',
      start: D(2026, 0, 5),
      end: D(2026, 0, 6),
      title: 'A',
    })
    expect(() =>
      cal.addAssignment({
        id: 'a1',
        resourceId: 'alice',
        start: D(2026, 0, 5),
        end: D(2026, 0, 6),
        title: 'A',
      }),
    ).toThrow(/already exists/)
  })

  it('updateAssignment preserves id and validates resource', () => {
    const { cal } = setup()
    cal.addResource(alice)
    cal.addResource(bob)
    cal.addAssignment({
      id: 'a1',
      resourceId: 'alice',
      start: D(2026, 0, 5),
      end: D(2026, 0, 6),
      title: 'A',
    })
    cal.updateAssignment('a1', { resourceId: 'bob', title: 'B' })
    expect(cal.getAssignment('a1')).toMatchObject({
      id: 'a1',
      resourceId: 'bob',
      title: 'B',
    })
    expect(() =>
      cal.updateAssignment('a1', { resourceId: 'ghost' }),
    ).toThrow(/resource "ghost" not found/)
  })

  it('removeAssignment removes the assignment', () => {
    const { cal } = setup()
    cal.addResource(alice)
    cal.addAssignment({
      id: 'a1',
      resourceId: 'alice',
      start: D(2026, 0, 5),
      end: D(2026, 0, 6),
      title: 'A',
    })
    cal.removeAssignment('a1')
    expect(cal.getAssignment('a1')).toBeUndefined()
  })

  it('moveAssignment shifts start AND end by deltaMs', () => {
    const { cal } = setup()
    cal.addResource(alice)
    cal.addAssignment({
      id: 'a1',
      resourceId: 'alice',
      start: D(2026, 0, 5),
      end: D(2026, 0, 6),
      title: 'A',
    })
    cal.moveAssignment('a1', 2 * DAY)
    const a = cal.getAssignment('a1')!
    expect(a.start).toBe(D(2026, 0, 7))
    expect(a.end).toBe(D(2026, 0, 8))
  })

  it('resizeAssignment("end", +) extends only the end', () => {
    const { cal } = setup()
    cal.addResource(alice)
    cal.addAssignment({
      id: 'a1',
      resourceId: 'alice',
      start: D(2026, 0, 5),
      end: D(2026, 0, 6),
      title: 'A',
    })
    cal.resizeAssignment('a1', 'end', DAY)
    const a = cal.getAssignment('a1')!
    expect(a.start).toBe(D(2026, 0, 5))
    expect(a.end).toBe(D(2026, 0, 7))
  })

  it('resizeAssignment("start", −) extends only the start', () => {
    const { cal } = setup()
    cal.addResource(alice)
    cal.addAssignment({
      id: 'a1',
      resourceId: 'alice',
      start: D(2026, 0, 5),
      end: D(2026, 0, 6),
      title: 'A',
    })
    cal.resizeAssignment('a1', 'start', -DAY)
    const a = cal.getAssignment('a1')!
    expect(a.start).toBe(D(2026, 0, 4))
    expect(a.end).toBe(D(2026, 0, 6))
  })

  it('resizeAssignment clamps so width never inverts (min 1ms)', () => {
    const { cal } = setup()
    cal.addResource(alice)
    cal.addAssignment({
      id: 'a1',
      resourceId: 'alice',
      start: D(2026, 0, 5),
      end: D(2026, 0, 6),
      title: 'A',
    })
    cal.resizeAssignment('a1', 'end', -10 * DAY)
    const a1 = cal.getAssignment('a1')!
    expect(a1.end).toBe(a1.start + 1)

    cal.addAssignment({
      id: 'a2',
      resourceId: 'alice',
      start: D(2026, 1, 5),
      end: D(2026, 1, 6),
      title: 'B',
    })
    cal.resizeAssignment('a2', 'start', 10 * DAY)
    const a2 = cal.getAssignment('a2')!
    expect(a2.start).toBe(a2.end - 1)
  })
})

// ─── Conflicts: overlap ─────────────────────────────────────────────────────

describe('CalendarEngine — conflict detection (overlap)', () => {
  it('two overlapping assignments on the same resource produce one overlap', () => {
    const { cal } = setup()
    cal.addResource(alice)
    cal.addAssignment({
      id: 'a1',
      resourceId: 'alice',
      start: D(2026, 0, 5),
      end: D(2026, 0, 8),
      title: 'A',
    })
    cal.addAssignment({
      id: 'a2',
      resourceId: 'alice',
      start: D(2026, 0, 7),
      end: D(2026, 0, 9),
      title: 'B',
    })
    const cs = cal.getConflicts()
    expect(cs.length).toBe(1)
    expect(cs[0]!.reason).toBe('overlap')
    expect(cs[0]!.assignmentIds).toEqual(['a1', 'a2'])
  })

  it('touching ranges (b.start === a.end) are NOT a conflict', () => {
    const { cal } = setup()
    cal.addResource(alice)
    cal.addAssignment({
      id: 'a1',
      resourceId: 'alice',
      start: D(2026, 0, 5),
      end: D(2026, 0, 7),
      title: 'A',
    })
    cal.addAssignment({
      id: 'a2',
      resourceId: 'alice',
      start: D(2026, 0, 7),
      end: D(2026, 0, 9),
      title: 'B',
    })
    expect(cal.getConflicts().length).toBe(0)
  })

  it('overlap on different resources never collides', () => {
    const { cal } = setup()
    cal.addResource(alice)
    cal.addResource(bob)
    cal.addAssignment({
      id: 'a1',
      resourceId: 'alice',
      start: D(2026, 0, 5),
      end: D(2026, 0, 8),
      title: 'A',
    })
    cal.addAssignment({
      id: 'b1',
      resourceId: 'bob',
      start: D(2026, 0, 5),
      end: D(2026, 0, 8),
      title: 'B',
    })
    expect(cal.getConflicts().length).toBe(0)
  })

  it('three pairwise overlapping assignments → 3 overlap conflicts', () => {
    const { cal } = setup()
    cal.addResource(alice)
    for (let i = 1; i <= 3; i++) {
      cal.addAssignment({
        id: `a${i}`,
        resourceId: 'alice',
        start: D(2026, 0, 5) + i * HOUR,
        end: D(2026, 0, 8),
        title: `A${i}`,
      })
    }
    const cs = cal.getConflicts().filter((c) => c.reason === 'overlap')
    // a1↔a2, a1↔a3, a2↔a3 → 3 pairwise
    expect(cs.length).toBe(3)
  })

  it('participating assignments are auto-promoted to status "conflict"', () => {
    const { cal } = setup()
    cal.addResource(alice)
    cal.addAssignment({
      id: 'a1',
      resourceId: 'alice',
      start: D(2026, 0, 5),
      end: D(2026, 0, 8),
      title: 'A',
      status: 'confirmed',
    })
    cal.addAssignment({
      id: 'a2',
      resourceId: 'alice',
      start: D(2026, 0, 7),
      end: D(2026, 0, 9),
      title: 'B',
    })
    expect(cal.getAssignment('a1')!.status).toBe('conflict')
    expect(cal.getAssignment('a2')!.status).toBe('conflict')
  })

  it('removing one of the overlapping assignments clears the conflict', () => {
    const { cal } = setup()
    cal.addResource(alice)
    cal.addAssignment({
      id: 'a1',
      resourceId: 'alice',
      start: D(2026, 0, 5),
      end: D(2026, 0, 8),
      title: 'A',
    })
    cal.addAssignment({
      id: 'a2',
      resourceId: 'alice',
      start: D(2026, 0, 7),
      end: D(2026, 0, 9),
      title: 'B',
    })
    expect(cal.getConflicts().length).toBe(1)
    cal.removeAssignment('a2')
    expect(cal.getConflicts().length).toBe(0)
    expect(cal.getAssignment('a1')!.status).not.toBe('conflict')
  })
})

// ─── Conflicts: capacity ────────────────────────────────────────────────────

describe('CalendarEngine — conflict detection (capacity)', () => {
  it('capacityPerSlot=2 with two concurrent → no over-capacity', () => {
    const { cal } = setup()
    cal.addResource({ ...alice, capacityPerSlot: 2 })
    cal.addAssignment({
      id: 'a1',
      resourceId: 'alice',
      start: D(2026, 0, 5),
      end: D(2026, 0, 8),
      title: 'A',
    })
    cal.addAssignment({
      id: 'a2',
      resourceId: 'alice',
      start: D(2026, 0, 6),
      end: D(2026, 0, 7),
      title: 'B',
    })
    expect(
      cal.getConflicts().filter((c) => c.reason === 'over-capacity').length,
    ).toBe(0)
  })

  it('capacityPerSlot=2 with three concurrent → over-capacity emitted', () => {
    const { cal } = setup()
    cal.addResource({ ...alice, capacityPerSlot: 2 })
    cal.addAssignment({
      id: 'a1',
      resourceId: 'alice',
      start: D(2026, 0, 5),
      end: D(2026, 0, 8),
      title: 'A',
    })
    cal.addAssignment({
      id: 'a2',
      resourceId: 'alice',
      start: D(2026, 0, 6),
      end: D(2026, 0, 9),
      title: 'B',
    })
    cal.addAssignment({
      id: 'a3',
      resourceId: 'alice',
      start: D(2026, 0, 6),
      end: D(2026, 0, 7),
      title: 'C',
    })
    const overCap = cal
      .getConflicts()
      .filter((c) => c.reason === 'over-capacity')
    expect(overCap.length).toBeGreaterThan(0)
    expect(overCap[0]!.assignmentIds.sort()).toEqual(['a1', 'a2', 'a3'])
  })

  it('capacity uses the configured scale step', () => {
    const core = createCore()
    const cal = createCalendar(core, { scale: 'week' })
    cal.addResource({ ...alice, capacityPerSlot: 1 })
    // Two assignments inside the same week-slot.
    cal.addAssignment({
      id: 'a1',
      resourceId: 'alice',
      start: D(2026, 0, 5),
      end: D(2026, 0, 6),
      title: 'A',
    })
    cal.addAssignment({
      id: 'a2',
      resourceId: 'alice',
      start: D(2026, 0, 7),
      end: D(2026, 0, 8),
      title: 'B',
    })
    expect(
      cal.getConflicts().filter((c) => c.reason === 'over-capacity').length,
    ).toBeGreaterThan(0)
  })
})

// ─── Conflicts: availability ────────────────────────────────────────────────

describe('CalendarEngine — conflict detection (availability)', () => {
  it('assignment outside HH:MM window → outside-availability', () => {
    const { cal } = setup()
    cal.addResource(alice)
    // Alice works only 09:00-17:00 every day.
    const rules: AvailabilityRule[] = [
      { resourceId: 'alice', from: '09:00', to: '17:00' },
    ]
    cal.setRules(rules)
    cal.addAssignment({
      id: 'a1',
      resourceId: 'alice',
      // 2026-01-05 18:00 → 19:00 UTC = outside the window.
      start: D(2026, 0, 5, 18),
      end: D(2026, 0, 5, 19),
      title: 'After hours',
    })
    const cs = cal
      .getConflicts()
      .filter((c) => c.reason === 'outside-availability')
    expect(cs.length).toBe(1)
    expect(cs[0]!.assignmentIds).toEqual(['a1'])
  })

  it('assignment inside the HH:MM window → no availability conflict', () => {
    const { cal } = setup()
    cal.addResource(alice)
    cal.setRules([{ resourceId: 'alice', from: '09:00', to: '17:00' }])
    cal.addAssignment({
      id: 'a1',
      resourceId: 'alice',
      start: D(2026, 0, 5, 10),
      end: D(2026, 0, 5, 11),
      title: 'Stand-up',
    })
    expect(
      cal.getConflicts().filter((c) => c.reason === 'outside-availability')
        .length,
    ).toBe(0)
  })

  it('dayOfWeek restricts the rule to that weekday only', () => {
    const { cal } = setup()
    cal.addResource(alice)
    // Monday only (2026-01-05 is a Monday in UTC).
    cal.setRules([
      { resourceId: 'alice', dayOfWeek: 1, from: '09:00', to: '17:00' },
    ])
    cal.addAssignment({
      id: 'mon',
      resourceId: 'alice',
      start: D(2026, 0, 5, 10),
      end: D(2026, 0, 5, 11),
      title: 'Mon meeting',
    })
    cal.addAssignment({
      id: 'tue',
      resourceId: 'alice',
      start: D(2026, 0, 6, 10),
      end: D(2026, 0, 6, 11),
      title: 'Tue meeting',
    })
    const offenders = cal
      .getConflicts()
      .filter((c) => c.reason === 'outside-availability')
      .map((c) => c.assignmentIds[0])
    expect(offenders.sort()).toEqual(['tue'])
  })

  it('isAvailable: bare helper is exported and works on a single resource', () => {
    const r: Resource = { id: 'x', name: 'X' }
    const rules: AvailabilityRule[] = [
      { resourceId: 'x', from: '08:00', to: '12:00' },
    ]
    expect(
      isAvailable(r, { start: D(2026, 0, 5, 9), end: D(2026, 0, 5, 11) }, rules),
    ).toBe(true)
    expect(
      isAvailable(r, { start: D(2026, 0, 5, 7), end: D(2026, 0, 5, 9) }, rules),
    ).toBe(false)
  })

  it('isAvailable: empty rules ⇒ always available', () => {
    const r: Resource = { id: 'x', name: 'X' }
    expect(
      isAvailable(r, { start: D(2026, 0, 5), end: D(2026, 0, 6) }, []),
    ).toBe(true)
  })
})

// ─── Engine subscribe + store mirror ───────────────────────────────────────

describe('CalendarEngine — subscribe + store mirror', () => {
  it('subscribe fires after every public mutation', () => {
    const { cal } = setup()
    const fn = vi.fn()
    cal.subscribe(fn)
    cal.addResource(alice)
    cal.addAssignment({
      id: 'a1',
      resourceId: 'alice',
      start: D(2026, 0, 5),
      end: D(2026, 0, 6),
      title: 'A',
    })
    cal.moveAssignment('a1', DAY)
    expect(fn.mock.calls.length).toBeGreaterThanOrEqual(3)
  })

  it('subscribe returns an unsubscribe', () => {
    const { cal } = setup()
    const fn = vi.fn()
    const off = cal.subscribe(fn)
    off()
    cal.addResource(alice)
    expect(fn).not.toHaveBeenCalled()
  })

  it('state is mirrored to the core store under $calendar.<id>.*', () => {
    const { core, cal } = setup()
    cal.addResource(alice)
    cal.addAssignment({
      id: 'a1',
      resourceId: 'alice',
      start: D(2026, 0, 5),
      end: D(2026, 0, 6),
      title: 'A',
    })
    const resPath = `$calendar.${cal.id}.resources`
    const assignPath = `$calendar.${cal.id}.assignments`
    expect((core.get(resPath) as Resource[])[0]?.id).toBe('alice')
    expect((core.get(assignPath) as Assignment[])[0]?.id).toBe('a1')
  })

  it('setScale changes the published view and re-runs detection', () => {
    const { core, cal } = setup()
    cal.addResource({ ...alice, capacityPerSlot: 1 })
    cal.addAssignment({
      id: 'a1',
      resourceId: 'alice',
      start: D(2026, 0, 5),
      end: D(2026, 0, 6),
      title: 'A',
    })
    cal.addAssignment({
      id: 'a2',
      resourceId: 'alice',
      start: D(2026, 0, 7),
      end: D(2026, 0, 8),
      title: 'B',
    })
    const before = cal.getConflicts().length
    cal.setScale('week')
    const after = cal.getConflicts().length
    expect(after).toBeGreaterThan(before)
    expect((core.get(`$calendar.${cal.id}.view`) as { scale: string })?.scale).toBe('week')
  })
})

// ─── Pure detectConflicts contract ─────────────────────────────────────────

describe('detectConflicts (standalone)', () => {
  it('returns [] for an empty state', () => {
    expect(detectConflicts({ resources: [], assignments: [] })).toEqual([])
  })

  it('emits exactly one overlap conflict for two overlapping assignments', () => {
    const out = detectConflicts({
      resources: [alice],
      assignments: [
        { id: 'a1', resourceId: 'alice', start: 0, end: 100, title: 'A' },
        { id: 'a2', resourceId: 'alice', start: 50, end: 150, title: 'B' },
      ],
    })
    expect(out.length).toBe(1)
    expect(out[0]!.reason).toBe('overlap')
  })

  it('does NOT emit overlap when resources differ', () => {
    const out = detectConflicts({
      resources: [alice, bob],
      assignments: [
        { id: 'a1', resourceId: 'alice', start: 0, end: 100, title: 'A' },
        { id: 'b1', resourceId: 'bob', start: 50, end: 150, title: 'B' },
      ],
    })
    expect(out.length).toBe(0)
  })
})

// ─── Clear + reset ─────────────────────────────────────────────────────────

describe('CalendarEngine — clear', () => {
  it('clear resets resources, assignments and conflicts', () => {
    const { cal } = setup()
    cal.addResource(alice)
    cal.addAssignment({
      id: 'a1',
      resourceId: 'alice',
      start: D(2026, 0, 5),
      end: D(2026, 0, 6),
      title: 'A',
    })
    cal.clear()
    expect(cal.getResources()).toEqual([])
    expect(cal.getAssignments()).toEqual([])
    expect(cal.getConflicts()).toEqual([])
  })
})
