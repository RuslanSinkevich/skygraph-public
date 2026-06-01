import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import { Gantt } from '../index'
import type { GanttResource, GanttTask } from '../index'

const DAY = 86_400_000

const baseRange = {
  from: new Date(Date.UTC(2026, 0, 1)),
  to: new Date(Date.UTC(2026, 0, 11)),
}

const sampleTasks: GanttTask[] = [
  {
    id: 't1',
    name: 'Design',
    start: Date.UTC(2026, 0, 2),
    end: Date.UTC(2026, 0, 5),
    progress: 0.5,
  },
  {
    id: 't2',
    name: 'Implement',
    start: Date.UTC(2026, 0, 4),
    end: Date.UTC(2026, 0, 9),
    dependencies: ['t1'],
    color: '#ff8800',
  },
]

describe('Gantt — render', () => {
  it('wraps the chart in a region with sg-gantt class', () => {
    const { container } = render(
      <Gantt tasks={sampleTasks} range={baseRange} columnWidth={40} />,
    )
    const root = container.querySelector('.sg-gantt') as HTMLElement
    expect(root).not.toBeNull()
    expect(root.getAttribute('role')).toBe('region')
    expect(root.getAttribute('aria-label')).toBe('Gantt chart')
  })

  it('renders one bar per task with stable data-task-id', () => {
    const { container } = render(
      <Gantt tasks={sampleTasks} range={baseRange} columnWidth={40} />,
    )
    const bars = container.querySelectorAll('[data-task-id]')
    expect(bars.length).toBe(2)
    const ids = Array.from(bars).map((b) => b.getAttribute('data-task-id'))
    expect(ids).toEqual(['t1', 't2'])
  })

  it('without resources, sidebar lists task names (one row per task)', () => {
    const { container } = render(
      <Gantt tasks={sampleTasks} range={baseRange} columnWidth={40} />,
    )
    const rows = container.querySelectorAll('.sg-gantt-sidebar-row')
    expect(rows.length).toBe(2)
    const labels = Array.from(rows).map((r) => r.textContent)
    expect(labels).toEqual(['Design', 'Implement'])
  })

  it('drops sg-gantt classes when unstyled', () => {
    const { container } = render(
      <Gantt tasks={sampleTasks} range={baseRange} unstyled />,
    )
    expect(container.querySelector('.sg-gantt')).toBeNull()
    expect(container.querySelector('.sg-gantt-bar')).toBeNull()
    expect(container.querySelector('.sg-gantt-sidebar')).toBeNull()
    expect(container.querySelectorAll('[data-task-id]').length).toBe(2)
  })

  it('exposes data-scale on the root for the active scale', () => {
    const { container, rerender } = render(
      <Gantt tasks={sampleTasks} range={baseRange} scale="day" />,
    )
    expect(container.querySelector('.sg-gantt')!.getAttribute('data-scale')).toBe('day')
    rerender(<Gantt tasks={sampleTasks} range={baseRange} scale="week" />)
    expect(container.querySelector('.sg-gantt')!.getAttribute('data-scale')).toBe('week')
  })

  it('progress renders an inner sg-gantt-bar-progress strip with width %', () => {
    const { container } = render(
      <Gantt tasks={sampleTasks} range={baseRange} columnWidth={40} />,
    )
    const bar = container.querySelector('[data-task-id="t1"]') as HTMLElement
    const progress = bar.querySelector('.sg-gantt-bar-progress') as HTMLElement
    expect(progress).not.toBeNull()
    expect(progress.style.width).toBe('50%')
    expect(progress.getAttribute('data-progress')).toBe('0.5')
  })

  it('task color is applied as the bar background', () => {
    const { container } = render(
      <Gantt tasks={sampleTasks} range={baseRange} columnWidth={40} />,
    )
    const colored = container.querySelector('[data-task-id="t2"]') as HTMLElement
    // jsdom may normalize hex → rgb(); accept either form.
    const bg = colored.style.background.toLowerCase()
    expect(bg.includes('#ff8800') || bg.includes('255, 136, 0')).toBe(true)
  })

  it('positions bars by their start / end against the range', () => {
    const { container } = render(
      <Gantt
        tasks={sampleTasks}
        range={baseRange}
        scale="day"
        columnWidth={40}
      />,
    )
    // t1: starts day 1 (offset from range.from = 1 day) → x = 40
    //     spans 3 days → w = 120
    const bar = container.querySelector('[data-task-id="t1"]') as HTMLElement
    expect(bar.style.left).toBe('40px')
    expect(bar.style.width).toBe('120px')
  })
})

describe('Gantt — scale switching', () => {
  it('day scale produces one tick per day in the range', () => {
    const { container } = render(
      <Gantt
        tasks={sampleTasks}
        range={baseRange}
        scale="day"
        columnWidth={40}
      />,
    )
    const ticks = container.querySelectorAll('[data-tick-time]')
    expect(ticks.length).toBe(10) // 11 days exclusive end → 10 buckets
  })

  it('week scale produces fewer ticks than day for the same range', () => {
    const { container, rerender } = render(
      <Gantt tasks={sampleTasks} range={baseRange} scale="day" columnWidth={40} />,
    )
    const dayCount = container.querySelectorAll('[data-tick-time]').length
    rerender(
      <Gantt tasks={sampleTasks} range={baseRange} scale="week" columnWidth={40} />,
    )
    const weekCount = container.querySelectorAll('[data-tick-time]').length
    expect(weekCount).toBeLessThan(dayCount)
    expect(weekCount).toBeGreaterThan(0)
  })

  it('derives a default range when no range prop is provided', () => {
    const { container } = render(
      <Gantt tasks={sampleTasks} scale="day" columnWidth={40} />,
    )
    // Auto-range covers all tasks; expect at least as many ticks as
    // (max(end) - min(start)) / day.
    const ticks = container.querySelectorAll('[data-tick-time]')
    expect(ticks.length).toBeGreaterThanOrEqual(7)
  })
})

describe('Gantt — drag / resize', () => {
  it('dragging a bar by exactly 1 column emits onTaskChange shifted by 1 day', () => {
    const onTaskChange = vi.fn()
    const { container } = render(
      <Gantt
        tasks={sampleTasks}
        range={baseRange}
        scale="day"
        columnWidth={40}
        draggable
        onTaskChange={onTaskChange}
      />,
    )
    const bar = container.querySelector('[data-task-id="t1"]') as HTMLElement
    fireEvent.mouseDown(bar, { button: 0, clientX: 0, clientY: 0 })
    fireEvent.mouseMove(window, { clientX: 40, clientY: 0 })
    fireEvent.mouseUp(window)

    expect(onTaskChange).toHaveBeenCalled()
    const lastCall = onTaskChange.mock.calls[onTaskChange.mock.calls.length - 1]!
    const next = lastCall[0] as GanttTask
    expect(next.id).toBe('t1')
    const origStart = sampleTasks[0]!.start as number
    const origEnd = sampleTasks[0]!.end as number
    expect(next.start).toBe(origStart + DAY)
    expect(next.end).toBe(origEnd + DAY)
  })

  it('dragging a sub-snap distance does not fire onTaskChange', () => {
    const onTaskChange = vi.fn()
    const { container } = render(
      <Gantt
        tasks={sampleTasks}
        range={baseRange}
        scale="day"
        columnWidth={40}
        draggable
        onTaskChange={onTaskChange}
      />,
    )
    const bar = container.querySelector('[data-task-id="t1"]') as HTMLElement
    fireEvent.mouseDown(bar, { button: 0, clientX: 0, clientY: 0 })
    // 8 px is well below half a column (40 / 2 = 20) → snaps to 0.
    fireEvent.mouseMove(window, { clientX: 8, clientY: 0 })
    fireEvent.mouseUp(window)
    expect(onTaskChange).not.toHaveBeenCalled()
  })

  it('resize handle drag changes only end (start stays)', () => {
    const onTaskChange = vi.fn()
    const { container } = render(
      <Gantt
        tasks={sampleTasks}
        range={baseRange}
        scale="day"
        columnWidth={40}
        resizable
        onTaskChange={onTaskChange}
      />,
    )
    const handle = container.querySelector(
      '[data-task-id="t1"] [data-role="resize-handle"]',
    ) as HTMLElement
    expect(handle).not.toBeNull()
    fireEvent.mouseDown(handle, { button: 0, clientX: 0, clientY: 0 })
    fireEvent.mouseMove(window, { clientX: 40, clientY: 0 }) // +1 day
    fireEvent.mouseUp(window)

    expect(onTaskChange).toHaveBeenCalled()
    const next = onTaskChange.mock.calls[onTaskChange.mock.calls.length - 1]![0] as GanttTask
    expect(next.id).toBe('t1')
    expect(next.start).toBe(sampleTasks[0]!.start)
    expect(next.end).toBe((sampleTasks[0]!.end as number) + DAY)
  })

  it('hides the resize handle when resizable=false', () => {
    const { container } = render(
      <Gantt tasks={sampleTasks} range={baseRange} columnWidth={40} draggable />,
    )
    expect(container.querySelectorAll('[data-role="resize-handle"]').length).toBe(0)
  })

  it('does not move when draggable=false even on mousedown', () => {
    const onTaskChange = vi.fn()
    const { container } = render(
      <Gantt
        tasks={sampleTasks}
        range={baseRange}
        columnWidth={40}
        onTaskChange={onTaskChange}
      />,
    )
    const bar = container.querySelector('[data-task-id="t1"]') as HTMLElement
    fireEvent.mouseDown(bar, { button: 0, clientX: 0, clientY: 0 })
    fireEvent.mouseMove(window, { clientX: 200, clientY: 0 })
    fireEvent.mouseUp(window)
    expect(onTaskChange).not.toHaveBeenCalled()
  })
})

describe('Gantt — dependencies', () => {
  it('renders one SVG dependency path per dependency', () => {
    const { container } = render(
      <Gantt tasks={sampleTasks} range={baseRange} columnWidth={40} />,
    )
    const deps = container.querySelectorAll('.sg-gantt-dep')
    expect(deps.length).toBe(1)
    expect(deps[0]!.getAttribute('data-dep-id')).toBe('t1->t2')
  })

  it('omits the dependency overlay entirely when no task has dependencies', () => {
    const noDeps: GanttTask[] = sampleTasks.map((t) => ({ ...t, dependencies: undefined }))
    const { container } = render(
      <Gantt tasks={noDeps} range={baseRange} columnWidth={40} />,
    )
    expect(container.querySelector('.sg-gantt-deps')).toBeNull()
    expect(container.querySelector('.sg-gantt-dep')).toBeNull()
  })

  it('dependency arrow uses the orthogonal router (path has L commands)', () => {
    const { container } = render(
      <Gantt tasks={sampleTasks} range={baseRange} columnWidth={40} />,
    )
    const path = container.querySelector('.sg-gantt-dep') as SVGPathElement
    const d = path.getAttribute('d')!
    expect(d).toMatch(/^M /)
    expect((d.match(/L /g) ?? []).length).toBeGreaterThanOrEqual(1)
  })
})

describe('Gantt — resources', () => {
  const resources: GanttResource[] = [
    { id: 'alice', name: 'Alice' },
    { id: 'bob', name: 'Bob' },
  ]

  const tasks: GanttTask[] = [
    {
      id: 'a1',
      name: 'A1',
      start: Date.UTC(2026, 0, 2),
      end: Date.UTC(2026, 0, 4),
      resourceId: 'alice',
    },
    {
      id: 'b1',
      name: 'B1',
      start: Date.UTC(2026, 0, 5),
      end: Date.UTC(2026, 0, 8),
      resourceId: 'bob',
    },
  ]

  it('renders one sidebar row per resource (not per task)', () => {
    const { container, getByText } = render(
      <Gantt tasks={tasks} resources={resources} range={baseRange} columnWidth={40} />,
    )
    const rows = container.querySelectorAll('.sg-gantt-sidebar-row')
    expect(rows.length).toBe(2)
    expect(getByText('Alice')).toBeDefined()
    expect(getByText('Bob')).toBeDefined()
  })

  it('places each task on the row matching its resourceId', () => {
    const { container } = render(
      <Gantt tasks={tasks} resources={resources} range={baseRange} columnWidth={40} rowHeight={32} />,
    )
    const a1 = container.querySelector('[data-task-id="a1"]') as HTMLElement
    const b1 = container.querySelector('[data-task-id="b1"]') as HTMLElement
    expect(a1.getAttribute('data-row-index')).toBe('0')
    expect(b1.getAttribute('data-row-index')).toBe('1')
    // Top is row * rowHeight + 4px inset.
    expect(a1.style.top).toBe('4px')
    expect(b1.style.top).toBe('36px')
  })
})
