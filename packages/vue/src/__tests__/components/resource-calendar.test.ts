import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import SgResourceCalendar from '../../components/complex/ResourceCalendar/ResourceCalendar.vue'

const resources = [
  { id: 'r1', name: 'Room A', color: '#0f0' },
  { id: 'r2', name: 'Room B' },
]

const assignments = [
  {
    id: 'a1',
    resourceId: 'r1',
    start: new Date('2024-01-01'),
    end: new Date('2024-01-05'),
    title: 'Task A',
  },
  {
    id: 'a2',
    resourceId: 'r1',
    start: new Date('2024-01-04'),
    end: new Date('2024-01-09'),
    title: 'Task B',
  },
  {
    id: 'a3',
    resourceId: 'r2',
    start: new Date('2024-01-10'),
    end: new Date('2024-01-12'),
    title: 'Task C',
  },
]

describe('SgResourceCalendar', () => {
  it('renders one row per resource', async () => {
    const w = mount(SgResourceCalendar, {
      props: { resources, assignments },
      attachTo: document.body,
    })
    await nextTick()
    expect(w.findAll('.sg-rcal-sidebar-row').length).toBe(2)
    expect(w.findAll('.sg-rcal-row').length).toBe(2)
    w.unmount()
  })

  it('renders one block per assignment', async () => {
    const w = mount(SgResourceCalendar, {
      props: { resources, assignments },
      attachTo: document.body,
    })
    await nextTick()
    expect(w.findAll('[data-assignment-id]').length).toBe(assignments.length)
    w.unmount()
  })

  it('marks overlapping assignments as conflict', async () => {
    const w = mount(SgResourceCalendar, {
      props: { resources, assignments },
      attachTo: document.body,
    })
    await nextTick()
    const conflicts = w.findAll('.sg-rcal-assignment-conflict')
    expect(conflicts.length).toBe(2)
    expect(w.findAll('[data-status="conflict"]').length).toBe(2)
    w.unmount()
  })

  it('does not flag conflicts on different resources', async () => {
    const w = mount(SgResourceCalendar, {
      props: {
        resources,
        assignments: [
          {
            id: 'a',
            resourceId: 'r1',
            start: new Date('2024-01-01'),
            end: new Date('2024-01-10'),
            title: 'A',
          },
          {
            id: 'b',
            resourceId: 'r2',
            start: new Date('2024-01-01'),
            end: new Date('2024-01-10'),
            title: 'B',
          },
        ],
      },
      attachTo: document.body,
    })
    await nextTick()
    expect(w.findAll('.sg-rcal-assignment-conflict').length).toBe(0)
    w.unmount()
  })

  it('shows resize handles on both edges when resizable is true', async () => {
    const w = mount(SgResourceCalendar, {
      props: { resources, assignments, resizable: true },
      attachTo: document.body,
    })
    await nextTick()
    expect(w.findAll('.sg-rcal-assignment-resize-start').length).toBe(assignments.length)
    expect(w.findAll('.sg-rcal-assignment-resize-end').length).toBe(assignments.length)
    w.unmount()
  })

  it('renders resource color swatch in sidebar when provided', async () => {
    const w = mount(SgResourceCalendar, {
      props: { resources, assignments },
      attachTo: document.body,
    })
    await nextTick()
    expect(w.findAll('.sg-rcal-sidebar-marker').length).toBe(resources.length)
    w.unmount()
  })

  it('emits assignment-change on drag (alias assignmentChange too)', async () => {
    const w = mount(SgResourceCalendar, {
      props: { resources, assignments, draggable: true, columnWidth: 60 },
      attachTo: document.body,
    })
    await nextTick()
    const block = w.find('[data-assignment-id="a1"]')
    await block.trigger('pointerdown', { clientX: 100, pointerId: 1, button: 0 })
    await w.trigger('pointermove', { clientX: 300, pointerId: 1 })
    await w.trigger('pointerup', { pointerId: 1 })
    expect(w.emitted('assignment-change')).toBeTruthy()
    expect(w.emitted('assignmentChange')).toBeTruthy()
    w.unmount()
  })

  it('exposes data-scale + sg-rcal-main wrapper + ticks (React parity)', async () => {
    const w = mount(SgResourceCalendar, {
      props: { resources, assignments, scale: 'day' },
      attachTo: document.body,
    })
    await nextTick()
    expect(w.attributes('data-scale')).toBe('day')
    expect(w.find('.sg-rcal-main').exists()).toBe(true)
    expect(w.findAll('.sg-rcal-tick').length).toBeGreaterThan(0)
    expect(w.findAll('.sg-rcal-slot').length).toBeGreaterThan(0)
    w.unmount()
  })

  it('drops default class when unstyled', async () => {
    const w = mount(SgResourceCalendar, {
      props: { resources, assignments, unstyled: true },
      attachTo: document.body,
    })
    await nextTick()
    expect(w.classes()).not.toContain('sg-rcal')
    w.unmount()
  })
})
