import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import SgEventTimeline from '../../components/complex/Timeline/EventTimeline.vue'

const evts = [
  { id: '1', date: new Date('2024-01-15'), title: 'A', description: 'first' },
  { id: '2', date: new Date('2024-02-20'), title: 'B' },
  { id: '3', date: new Date('2024-02-25'), title: 'C', color: '#ff0000' },
]

describe('SgEventTimeline', () => {
  it('renders one item per event', async () => {
    const w = mount(SgEventTimeline, { props: { events: evts } })
    await nextTick()
    expect(w.findAll('.sg-event-timeline-item').length).toBe(3)
  })

  it('sorts events chronologically', async () => {
    const w = mount(SgEventTimeline, {
      props: {
        events: [
          { id: 'a', date: new Date('2024-03-01'), title: 'A' },
          { id: 'b', date: new Date('2024-01-01'), title: 'B' },
        ],
      },
    })
    await nextTick()
    const items = w.findAll('.sg-event-timeline-item')
    expect(items[0].attributes('data-event-id')).toBe('b')
    expect(items[1].attributes('data-event-id')).toBe('a')
  })

  it('respects orientation prop', async () => {
    const w = mount(SgEventTimeline, { props: { events: evts, orientation: 'horizontal' } })
    await nextTick()
    expect(w.attributes('data-orientation')).toBe('horizontal')
    expect(w.classes()).toContain('sg-event-timeline-horizontal')
  })

  it('groups by month when groupBy="month"', async () => {
    const w = mount(SgEventTimeline, { props: { events: evts, groupBy: 'month' } })
    await nextTick()
    const groups = w.findAll('.sg-event-timeline-group')
    expect(groups.length).toBe(2)
  })

  it('groups by year', async () => {
    const w = mount(SgEventTimeline, {
      props: {
        events: [
          { id: '1', date: new Date('2024-01-01'), title: '1' },
          { id: '2', date: new Date('2025-02-01'), title: '2' },
        ],
        groupBy: 'year',
      },
    })
    await nextTick()
    expect(w.findAll('.sg-event-timeline-group').length).toBe(2)
  })

  it('renders descriptions when provided', async () => {
    const w = mount(SgEventTimeline, { props: { events: evts } })
    await nextTick()
    expect(w.text()).toContain('first')
  })

  it('honours `unstyled` to drop default classes', async () => {
    const w = mount(SgEventTimeline, { props: { events: evts, unstyled: true } })
    await nextTick()
    expect(w.classes()).not.toContain('sg-event-timeline')
  })

  it('applies custom color via inline style', async () => {
    const w = mount(SgEventTimeline, {
      props: { events: [{ id: '1', date: new Date(0), title: 'T', color: 'rgb(255, 0, 0)' }] },
    })
    await nextTick()
    const dot = w.find('.sg-event-timeline-dot')
    expect(dot.attributes('style')).toContain('rgb(255, 0, 0)')
  })
})
