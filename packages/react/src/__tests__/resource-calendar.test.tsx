import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import { ResourceCalendar } from '../index'
import type {
  Assignment,
  AvailabilityRule,
  Conflict,
  Resource,
} from '../index'
import { useState } from 'react'

const DAY = 86_400_000

const baseRange = {
  from: new Date(Date.UTC(2026, 0, 5)),
  to: new Date(Date.UTC(2026, 0, 12)),
}

const resources: Resource[] = [
  { id: 'alice', name: 'Alice', color: '#3b82f6' },
  { id: 'bob', name: 'Bob', color: '#f97316' },
]

const sample: Assignment[] = [
  {
    id: 'a1',
    resourceId: 'alice',
    start: Date.UTC(2026, 0, 5),
    end: Date.UTC(2026, 0, 7),
    title: 'Stand-up',
  },
  {
    id: 'a2',
    resourceId: 'alice',
    start: Date.UTC(2026, 0, 8),
    end: Date.UTC(2026, 0, 10),
    title: 'Pairing',
  },
  {
    id: 'b1',
    resourceId: 'bob',
    start: Date.UTC(2026, 0, 5),
    end: Date.UTC(2026, 0, 8),
    title: 'Onboarding',
  },
]

describe('ResourceCalendar — render', () => {
  it('wraps the calendar in a region with sg-rcal class', () => {
    const { container } = render(
      <ResourceCalendar
        resources={resources}
        assignments={sample}
        range={baseRange}
        scale="day"
        columnWidth={40}
      />,
    )
    const root = container.querySelector('.sg-rcal') as HTMLElement
    expect(root).not.toBeNull()
    expect(root.getAttribute('role')).toBe('region')
    expect(root.getAttribute('aria-label')).toBe('Resource calendar')
  })

  it('renders one sidebar row per resource (not per assignment)', () => {
    const { container, getByText } = render(
      <ResourceCalendar
        resources={resources}
        assignments={sample}
        range={baseRange}
        scale="day"
      />,
    )
    const rows = container.querySelectorAll('.sg-rcal-sidebar-row')
    expect(rows.length).toBe(2)
    expect(getByText('Alice')).toBeDefined()
    expect(getByText('Bob')).toBeDefined()
  })

  it('renders one assignment block per assignment with stable data-assignment-id', () => {
    const { container } = render(
      <ResourceCalendar
        resources={resources}
        assignments={sample}
        range={baseRange}
        scale="day"
      />,
    )
    const blocks = container.querySelectorAll('[data-assignment-id]')
    expect(blocks.length).toBe(3)
    const ids = Array.from(blocks).map((b) =>
      b.getAttribute('data-assignment-id'),
    )
    expect(ids.sort()).toEqual(['a1', 'a2', 'b1'])
  })

  it('positions blocks using start/end against the range', () => {
    const { container } = render(
      <ResourceCalendar
        resources={resources}
        assignments={sample}
        range={baseRange}
        scale="day"
        columnWidth={40}
        rowHeight={40}
      />,
    )
    const a1 = container.querySelector(
      '[data-assignment-id="a1"]',
    ) as HTMLElement
    expect(a1.style.left).toBe('0px')
    expect(a1.style.width).toBe('80px') // 2 days × 40px
    expect(a1.style.top).toBe('4px')
  })

  it('drops sg-rcal classes when unstyled', () => {
    const { container } = render(
      <ResourceCalendar
        resources={resources}
        assignments={sample}
        range={baseRange}
        unstyled
      />,
    )
    expect(container.querySelector('.sg-rcal')).toBeNull()
    expect(container.querySelector('.sg-rcal-sidebar')).toBeNull()
    expect(container.querySelectorAll('[data-assignment-id]').length).toBe(3)
  })

  it('exposes data-scale on the root for the active scale', () => {
    const { container, rerender } = render(
      <ResourceCalendar
        resources={resources}
        assignments={sample}
        range={baseRange}
        scale="day"
      />,
    )
    expect(
      container.querySelector('.sg-rcal')!.getAttribute('data-scale'),
    ).toBe('day')
    rerender(
      <ResourceCalendar
        resources={resources}
        assignments={sample}
        range={baseRange}
        scale="week"
      />,
    )
    expect(
      container.querySelector('.sg-rcal')!.getAttribute('data-scale'),
    ).toBe('week')
  })
})

describe('ResourceCalendar — scale switching', () => {
  it('day scale produces one tick per day in the range', () => {
    const { container } = render(
      <ResourceCalendar
        resources={resources}
        assignments={sample}
        range={baseRange}
        scale="day"
        columnWidth={40}
      />,
    )
    // Header has its own tick row + per-row slot dividers; we assert on the
    // header's [data-tick-time] inside the header element only.
    const header = container.querySelector('.sg-rcal-header') as HTMLElement
    const ticks = header.querySelectorAll('[data-tick-time]')
    expect(ticks.length).toBe(7) // 2026-01-05..2026-01-11 = 7 days
  })

  it('week scale produces fewer ticks than day for the same range', () => {
    const { container, rerender } = render(
      <ResourceCalendar
        resources={resources}
        assignments={sample}
        range={baseRange}
        scale="day"
      />,
    )
    const dayHeader = container.querySelector('.sg-rcal-header') as HTMLElement
    const dayCount = dayHeader.querySelectorAll('[data-tick-time]').length
    rerender(
      <ResourceCalendar
        resources={resources}
        assignments={sample}
        range={baseRange}
        scale="week"
      />,
    )
    const weekHeader = container.querySelector('.sg-rcal-header') as HTMLElement
    const weekCount = weekHeader.querySelectorAll('[data-tick-time]').length
    expect(weekCount).toBeLessThan(dayCount)
    expect(weekCount).toBeGreaterThan(0)
  })
})

describe('ResourceCalendar — drag / resize', () => {
  it('dragging a block by 1 column emits onAssignmentChange shifted by 1 day', () => {
    const onAssignmentChange = vi.fn()
    const { container } = render(
      <ResourceCalendar
        resources={resources}
        assignments={sample}
        range={baseRange}
        scale="day"
        columnWidth={40}
        draggable
        onAssignmentChange={onAssignmentChange}
      />,
    )
    const block = container.querySelector(
      '[data-assignment-id="a1"]',
    ) as HTMLElement
    fireEvent.mouseDown(block, { button: 0, clientX: 0, clientY: 0 })
    fireEvent.mouseMove(window, { clientX: 40, clientY: 0 })
    fireEvent.mouseUp(window)

    expect(onAssignmentChange).toHaveBeenCalled()
    const last = onAssignmentChange.mock.calls.at(-1)![0] as Assignment
    expect(last.id).toBe('a1')
    expect(last.start).toBe((sample[0]!.start as number) + DAY)
    expect(last.end).toBe((sample[0]!.end as number) + DAY)
  })

  it('drag below the snap threshold does not fire onAssignmentChange', () => {
    const onAssignmentChange = vi.fn()
    const { container } = render(
      <ResourceCalendar
        resources={resources}
        assignments={sample}
        range={baseRange}
        scale="day"
        columnWidth={40}
        draggable
        onAssignmentChange={onAssignmentChange}
      />,
    )
    const block = container.querySelector(
      '[data-assignment-id="a1"]',
    ) as HTMLElement
    fireEvent.mouseDown(block, { button: 0, clientX: 0, clientY: 0 })
    // 8 px is well below half a column → snaps to 0.
    fireEvent.mouseMove(window, { clientX: 8, clientY: 0 })
    fireEvent.mouseUp(window)
    expect(onAssignmentChange).not.toHaveBeenCalled()
  })

  it('resize-end handle drag changes only end (start stays)', () => {
    const onAssignmentChange = vi.fn()
    const { container } = render(
      <ResourceCalendar
        resources={resources}
        assignments={sample}
        range={baseRange}
        scale="day"
        columnWidth={40}
        resizable
        onAssignmentChange={onAssignmentChange}
      />,
    )
    const handle = container.querySelector(
      '[data-assignment-id="a1"] [data-role="resize-handle-end"]',
    ) as HTMLElement
    expect(handle).not.toBeNull()
    fireEvent.mouseDown(handle, { button: 0, clientX: 0, clientY: 0 })
    fireEvent.mouseMove(window, { clientX: 40, clientY: 0 }) // +1 day
    fireEvent.mouseUp(window)

    const next = onAssignmentChange.mock.calls.at(-1)![0] as Assignment
    expect(next.id).toBe('a1')
    expect(next.start).toBe(sample[0]!.start)
    expect(next.end).toBe((sample[0]!.end as number) + DAY)
  })

  it('resize-start handle drag changes only start (end stays)', () => {
    const onAssignmentChange = vi.fn()
    const { container } = render(
      <ResourceCalendar
        resources={resources}
        assignments={sample}
        range={baseRange}
        scale="day"
        columnWidth={40}
        resizable
        onAssignmentChange={onAssignmentChange}
      />,
    )
    const handle = container.querySelector(
      '[data-assignment-id="a1"] [data-role="resize-handle-start"]',
    ) as HTMLElement
    expect(handle).not.toBeNull()
    fireEvent.mouseDown(handle, { button: 0, clientX: 0, clientY: 0 })
    fireEvent.mouseMove(window, { clientX: -40, clientY: 0 }) // −1 day
    fireEvent.mouseUp(window)

    const next = onAssignmentChange.mock.calls.at(-1)![0] as Assignment
    expect(next.id).toBe('a1')
    expect(next.start).toBe((sample[0]!.start as number) - DAY)
    expect(next.end).toBe(sample[0]!.end)
  })

  it('arrow keys move the assignment by ±1 step when draggable', () => {
    const onAssignmentChange = vi.fn()
    const { container } = render(
      <ResourceCalendar
        resources={resources}
        assignments={sample}
        range={baseRange}
        scale="day"
        columnWidth={40}
        draggable
        onAssignmentChange={onAssignmentChange}
      />,
    )
    const block = container.querySelector(
      '[data-assignment-id="a1"]',
    ) as HTMLElement
    fireEvent.keyDown(block, { key: 'ArrowRight' })
    const next = onAssignmentChange.mock.calls.at(-1)![0] as Assignment
    expect(next.start).toBe((sample[0]!.start as number) + DAY)
  })
})

describe('ResourceCalendar — conflicts', () => {
  it('renders the conflict modifier on overlapping assignments', () => {
    const overlapping: Assignment[] = [
      {
        id: 'x1',
        resourceId: 'alice',
        start: Date.UTC(2026, 0, 5),
        end: Date.UTC(2026, 0, 8),
        title: 'X1',
      },
      {
        id: 'x2',
        resourceId: 'alice',
        start: Date.UTC(2026, 0, 7),
        end: Date.UTC(2026, 0, 9),
        title: 'X2',
      },
    ]
    const { container } = render(
      <ResourceCalendar
        resources={resources}
        assignments={overlapping}
        range={baseRange}
        scale="day"
      />,
    )
    const x1 = container.querySelector(
      '[data-assignment-id="x1"]',
    ) as HTMLElement
    const x2 = container.querySelector(
      '[data-assignment-id="x2"]',
    ) as HTMLElement
    expect(x1.getAttribute('data-status')).toBe('conflict')
    expect(x2.getAttribute('data-status')).toBe('conflict')
    expect(x1.className).toContain('sg-rcal-assignment-conflict')
    expect(x2.className).toContain('sg-rcal-assignment-conflict')
  })

  it('onConflict fires with the freshly detected Conflict[]', () => {
    const onConflict = vi.fn()
    const overlapping: Assignment[] = [
      {
        id: 'x1',
        resourceId: 'alice',
        start: Date.UTC(2026, 0, 5),
        end: Date.UTC(2026, 0, 8),
        title: 'X1',
      },
      {
        id: 'x2',
        resourceId: 'alice',
        start: Date.UTC(2026, 0, 7),
        end: Date.UTC(2026, 0, 9),
        title: 'X2',
      },
    ]
    render(
      <ResourceCalendar
        resources={resources}
        assignments={overlapping}
        range={baseRange}
        scale="day"
        onConflict={onConflict}
      />,
    )
    expect(onConflict).toHaveBeenCalled()
    const last = onConflict.mock.calls.at(-1)![0] as Conflict[]
    expect(last.length).toBeGreaterThan(0)
    expect(last[0]!.reason).toBe('overlap')
  })

  it('availability rules render an off-window band for the affected resource', () => {
    const rules: AvailabilityRule[] = [
      // Alice never works on Tuesday (dayOfWeek = 2 → 2026-01-06 is Tue UTC).
      { resourceId: 'alice', dayOfWeek: 0, from: '00:00', to: '24:00' },
      { resourceId: 'alice', dayOfWeek: 1, from: '00:00', to: '24:00' },
      // Skipping dayOfWeek=2 → Tuesday is off.
      { resourceId: 'alice', dayOfWeek: 3, from: '00:00', to: '24:00' },
      { resourceId: 'alice', dayOfWeek: 4, from: '00:00', to: '24:00' },
      { resourceId: 'alice', dayOfWeek: 5, from: '00:00', to: '24:00' },
      { resourceId: 'alice', dayOfWeek: 6, from: '00:00', to: '24:00' },
    ]
    const { container } = render(
      <ResourceCalendar
        resources={resources}
        assignments={[]}
        range={baseRange}
        scale="day"
        rules={rules}
      />,
    )
    const bands = container.querySelectorAll('[data-role="availability-off"]')
    expect(bands.length).toBeGreaterThanOrEqual(1)
  })
})

describe('ResourceCalendar — controlled vs uncontrolled', () => {
  it('controlled flow: parent state drives the rendered position', () => {
    function Controlled() {
      const [list, setList] = useState(sample)
      return (
        <ResourceCalendar
          resources={resources}
          assignments={list}
          range={baseRange}
          scale="day"
          columnWidth={40}
          draggable
          onAssignmentChange={(next) =>
            setList((prev) =>
              prev.map((a) => (a.id === next.id ? { ...a, ...next } : a)),
            )
          }
        />
      )
    }
    const { container } = render(<Controlled />)
    const block = container.querySelector(
      '[data-assignment-id="a1"]',
    ) as HTMLElement
    fireEvent.mouseDown(block, { button: 0, clientX: 0, clientY: 0 })
    fireEvent.mouseMove(window, { clientX: 40, clientY: 0 })
    fireEvent.mouseUp(window)
    const after = container.querySelector(
      '[data-assignment-id="a1"]',
    ) as HTMLElement
    // After the drag the parent state moved the start to day 6 → x = 40px.
    expect(after.style.left).toBe('40px')
  })

  it('uncontrolled-style: without onAssignmentChange the block stays put', () => {
    const { container } = render(
      <ResourceCalendar
        resources={resources}
        assignments={sample}
        range={baseRange}
        scale="day"
        columnWidth={40}
        draggable
      />,
    )
    const block = container.querySelector(
      '[data-assignment-id="a1"]',
    ) as HTMLElement
    const before = block.style.left
    fireEvent.mouseDown(block, { button: 0, clientX: 0, clientY: 0 })
    fireEvent.mouseMove(window, { clientX: 80, clientY: 0 })
    fireEvent.mouseUp(window)
    expect(block.style.left).toBe(before)
  })
})
