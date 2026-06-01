import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { EventTimeline } from '../index'
import type { TimelineEvent } from '../index'

const sampleEvents: TimelineEvent[] = [
  {
    id: 'e3',
    date: Date.UTC(2026, 0, 5),
    title: 'Released',
    description: 'v1.0 shipped',
  },
  {
    id: 'e1',
    date: Date.UTC(2026, 0, 1),
    title: 'Kickoff',
    color: '#00aa55',
  },
  {
    id: 'e2',
    date: Date.UTC(2026, 0, 1, 12),
    title: 'Design done',
  },
  {
    id: 'e4',
    date: Date.UTC(2026, 1, 3),
    title: 'Retrospective',
  },
]

describe('EventTimeline — render', () => {
  it('wraps the list in role=list with sg-event-timeline class', () => {
    const { container } = render(<EventTimeline events={sampleEvents} />)
    const root = container.querySelector('.sg-event-timeline') as HTMLElement
    expect(root).not.toBeNull()
    expect(root.getAttribute('role')).toBe('list')
    expect(root.getAttribute('aria-label')).toBe('Timeline')
  })

  it('renders one item per event with stable data-event-id', () => {
    const { container } = render(<EventTimeline events={sampleEvents} />)
    const items = container.querySelectorAll('[data-event-id]')
    expect(items.length).toBe(4)
  })

  it('default orientation is vertical', () => {
    const { container } = render(<EventTimeline events={sampleEvents} />)
    const root = container.querySelector('.sg-event-timeline') as HTMLElement
    expect(root.getAttribute('data-orientation')).toBe('vertical')
    expect(root.classList.contains('sg-event-timeline-vertical')).toBe(true)
  })

  it('horizontal orientation reflects in className + data attribute', () => {
    const { container } = render(
      <EventTimeline events={sampleEvents} orientation="horizontal" />,
    )
    const root = container.querySelector('.sg-event-timeline') as HTMLElement
    expect(root.getAttribute('data-orientation')).toBe('horizontal')
    expect(root.classList.contains('sg-event-timeline-horizontal')).toBe(true)
  })

  it('drops sg-event-timeline classes when unstyled', () => {
    const { container } = render(<EventTimeline events={sampleEvents} unstyled />)
    expect(container.querySelector('.sg-event-timeline')).toBeNull()
    expect(container.querySelector('.sg-event-timeline-item')).toBeNull()
    expect(container.querySelectorAll('[data-event-id]').length).toBe(4)
  })

  it('sorts events chronologically regardless of input order', () => {
    const { container } = render(<EventTimeline events={sampleEvents} />)
    const items = Array.from(container.querySelectorAll('[data-event-id]'))
    const ids = items.map((el) => el.getAttribute('data-event-id'))
    expect(ids).toEqual(['e1', 'e2', 'e3', 'e4'])
  })

  it('renders the description block when provided', () => {
    const { getByText } = render(<EventTimeline events={sampleEvents} />)
    expect(getByText('v1.0 shipped')).toBeDefined()
  })

  it('omits the description block when undefined', () => {
    const ev: TimelineEvent[] = [
      { id: 'x', date: Date.UTC(2026, 0, 1), title: 'No desc' },
    ]
    const { container } = render(<EventTimeline events={ev} />)
    expect(container.querySelector('.sg-event-timeline-description')).toBeNull()
  })

  it('event color is applied to the default dot inline-style', () => {
    const { container } = render(<EventTimeline events={sampleEvents} />)
    const e1 = container.querySelector('[data-event-id="e1"]') as HTMLElement
    const dot = e1.querySelector('.sg-event-timeline-dot') as HTMLElement
    expect(dot).not.toBeNull()
    const bg = dot.style.background.toLowerCase()
    expect(bg.includes('#00aa55') || bg.includes('0, 170, 85')).toBe(true)
  })

  it('exposes data-event-time matching the original date as ms', () => {
    const { container } = render(<EventTimeline events={sampleEvents} />)
    const e3 = container.querySelector('[data-event-id="e3"]') as HTMLElement
    expect(Number(e3.getAttribute('data-event-time'))).toBe(Date.UTC(2026, 0, 5))
  })
})

describe('EventTimeline — groupBy', () => {
  it('without groupBy emits no group dividers', () => {
    const { container } = render(<EventTimeline events={sampleEvents} />)
    expect(container.querySelectorAll('.sg-event-timeline-group').length).toBe(0)
  })

  it("groupBy='day' creates one divider per unique calendar day", () => {
    const { container } = render(
      <EventTimeline events={sampleEvents} groupBy="day" />,
    )
    const groups = container.querySelectorAll('.sg-event-timeline-group')
    // Sorted: 2026-01-01 (e1, e2 — same day), 2026-01-05, 2026-02-03 → 3 days.
    expect(groups.length).toBe(3)
    expect(groups[0]!.getAttribute('data-group-key')).toBe('2026-01-01')
    expect(groups[1]!.getAttribute('data-group-key')).toBe('2026-01-05')
    expect(groups[2]!.getAttribute('data-group-key')).toBe('2026-02-03')
  })

  it("groupBy='month' merges same-month events into one bucket", () => {
    const { container } = render(
      <EventTimeline events={sampleEvents} groupBy="month" />,
    )
    const groups = container.querySelectorAll('.sg-event-timeline-group')
    // 2026-01 (e1, e2, e3), 2026-02 (e4) → 2 months.
    expect(groups.length).toBe(2)
    expect(groups[0]!.getAttribute('data-group-key')).toBe('2026-01')
    expect(groups[1]!.getAttribute('data-group-key')).toBe('2026-02')
  })

  it("groupBy='year' merges all-year events into one bucket", () => {
    const { container } = render(
      <EventTimeline events={sampleEvents} groupBy="year" />,
    )
    const groups = container.querySelectorAll('.sg-event-timeline-group')
    expect(groups.length).toBe(1)
    expect(groups[0]!.getAttribute('data-group-key')).toBe('2026')
  })

  it('reflects the active groupBy on the data attribute', () => {
    const { container, rerender } = render(
      <EventTimeline events={sampleEvents} groupBy="day" />,
    )
    expect(
      container.querySelector('.sg-event-timeline')!.getAttribute('data-group-by'),
    ).toBe('day')
    rerender(<EventTimeline events={sampleEvents} />)
    expect(
      container.querySelector('.sg-event-timeline')!.getAttribute('data-group-by'),
    ).toBe('none')
  })
})

describe('EventTimeline — custom renderers', () => {
  it('renderMarker replaces the default dot', () => {
    const { container } = render(
      <EventTimeline
        events={sampleEvents}
        renderMarker={(ev) => (
          <span data-testid="custom-marker" data-id={ev.id}>
            ★
          </span>
        )}
      />,
    )
    expect(container.querySelectorAll('[data-testid="custom-marker"]').length).toBe(4)
    expect(container.querySelector('.sg-event-timeline-dot')).toBeNull()
  })

  it('renderEvent replaces the default title / description block', () => {
    const { container, getByText, queryByText } = render(
      <EventTimeline
        events={sampleEvents}
        renderEvent={(ev) => <div data-testid="custom-body">{`#${ev.id}`}</div>}
      />,
    )
    expect(container.querySelectorAll('[data-testid="custom-body"]').length).toBe(4)
    expect(getByText('#e1')).toBeDefined()
    // Default title block must be gone.
    expect(queryByText('Kickoff')).toBeNull()
  })
})
