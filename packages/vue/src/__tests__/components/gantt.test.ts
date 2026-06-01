import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import SgGantt from '../../components/complex/Gantt/Gantt.vue'

const tasks = [
  { id: 't1', name: 'Plan', start: new Date('2024-01-01'), end: new Date('2024-01-05'), progress: 0.5 },
  { id: 't2', name: 'Build', start: new Date('2024-01-05'), end: new Date('2024-01-15'), resourceId: 'r1' },
  { id: 't3', name: 'Test', start: new Date('2024-01-15'), end: new Date('2024-01-20'), resourceId: 'r2' },
]

const resources = [
  { id: 'r1', name: 'Alice' },
  { id: 'r2', name: 'Bob' },
]

describe('SgGantt', () => {
  it('renders one bar per task', async () => {
    const w = mount(SgGantt, { props: { tasks }, attachTo: document.body })
    await nextTick()
    expect(w.findAll('[data-task-id]').length).toBe(tasks.length)
    w.unmount()
  })

  it('groups tasks by resource when resources are provided', async () => {
    const w = mount(SgGantt, { props: { tasks, resources }, attachTo: document.body })
    await nextTick()
    const rows = w.findAll('.sg-gantt-sidebar-row')
    expect(rows.length).toBe(2)
    expect(rows[0].text()).toContain('Alice')
    w.unmount()
  })

  it('renders progress strip when progress is set', async () => {
    const w = mount(SgGantt, { props: { tasks }, attachTo: document.body })
    await nextTick()
    expect(w.findAll('.sg-gantt-bar-progress').length).toBe(1)
    w.unmount()
  })

  it('shows resize handle when resizable is true', async () => {
    const w = mount(SgGantt, { props: { tasks, resizable: true }, attachTo: document.body })
    await nextTick()
    expect(w.findAll('.sg-gantt-bar-resize').length).toBe(tasks.length)
    w.unmount()
  })

  it('emits task-change on drag (move)', async () => {
    const w = mount(SgGantt, {
      props: { tasks, draggable: true, columnWidth: 40 },
      attachTo: document.body,
    })
    await nextTick()
    const bar = w.find('[data-task-id="t1"]')
    await bar.trigger('pointerdown', { clientX: 50, pointerId: 1 })
    await w.trigger('pointermove', { clientX: 200, pointerId: 1 })
    await w.trigger('pointerup', { pointerId: 1 })
    expect(w.emitted('task-change')).toBeTruthy()
    w.unmount()
  })

  it('respects scale prop (header tick count)', async () => {
    const w = mount(SgGantt, { props: { tasks, scale: 'week' }, attachTo: document.body })
    await nextTick()
    const ticks = w.findAll('.sg-gantt-header > div')
    expect(ticks.length).toBeGreaterThan(0)
    w.unmount()
  })

  it('honours custom range', async () => {
    const w = mount(SgGantt, {
      props: {
        tasks,
        range: { from: new Date('2024-01-01'), to: new Date('2024-01-31') },
      },
      attachTo: document.body,
    })
    await nextTick()
    expect(w.find('.sg-gantt-header').exists()).toBe(true)
    w.unmount()
  })

  it('drops default sg-gantt class when unstyled', async () => {
    const w = mount(SgGantt, { props: { tasks, unstyled: true }, attachTo: document.body })
    await nextTick()
    expect(w.classes()).not.toContain('sg-gantt')
    w.unmount()
  })
})
