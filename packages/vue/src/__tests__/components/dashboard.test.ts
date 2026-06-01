import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import SgDashboard from '../../components/complex/Dashboard/Dashboard.vue'
import SgDashboardEditor from '../../components/complex/Dashboard/DashboardEditor.vue'

const widgets = [
  { id: 'a', title: 'A', x: 1, y: 1, w: 4, h: 1 },
  { id: 'b', title: 'B', x: 5, y: 1, w: 8, h: 2 },
  { id: 'c', title: 'C', x: 1, y: 3, w: 12, h: 1 },
]

describe('SgDashboard', () => {
  it('renders one element per widget', async () => {
    const w = mount(SgDashboard, { props: { widgets }, attachTo: document.body })
    await nextTick()
    expect(w.findAll('[data-widget-id]').length).toBe(3)
    w.unmount()
  })

  it('places widgets via grid-column / grid-row styles', async () => {
    const w = mount(SgDashboard, { props: { widgets }, attachTo: document.body })
    await nextTick()
    const wb = w.find('[data-widget-id="b"]')
    const style = wb.attributes('style') ?? ''
    expect(style).toContain('grid-column-start: 5')
    expect(style).toContain('grid-row-start: 1')
    w.unmount()
  })

  it('uses configured columns count in template', async () => {
    const w = mount(SgDashboard, { props: { widgets, columns: 6 }, attachTo: document.body })
    await nextTick()
    const root = w.element as HTMLElement
    expect(root.style.gridTemplateColumns).toContain('repeat(6')
    w.unmount()
  })

  it('renders widget header when title is provided', async () => {
    const w = mount(SgDashboard, { props: { widgets }, attachTo: document.body })
    await nextTick()
    expect(w.findAll('.sg-dashboard-widget-header').length).toBe(3)
    w.unmount()
  })

  it('exposes print method via defineExpose', async () => {
    const w = mount(SgDashboard, { props: { widgets }, attachTo: document.body })
    await nextTick()
    const cmp = w.vm as unknown as { print: () => void }
    expect(typeof cmp.print).toBe('function')
    w.unmount()
  })

  it('drops default class when unstyled', async () => {
    const w = mount(SgDashboard, { props: { widgets, unstyled: true }, attachTo: document.body })
    await nextTick()
    expect(w.classes()).not.toContain('sg-dashboard')
    w.unmount()
  })
})

describe('SgDashboardEditor', () => {
  it('renders widgets', async () => {
    const w = mount(SgDashboardEditor, { props: { widgets }, attachTo: document.body })
    await nextTick()
    expect(w.findAll('[data-widget-id]').length).toBe(3)
    w.unmount()
  })

  it('shows resize handle when resizable is true', async () => {
    const w = mount(SgDashboardEditor, {
      props: { widgets, resizable: true },
      attachTo: document.body,
    })
    await nextTick()
    expect(w.findAll('.sg-dashboard-resize-handle').length).toBe(3)
    w.unmount()
  })

  it('hides resize handle when resizable is false', async () => {
    const w = mount(SgDashboardEditor, {
      props: { widgets, resizable: false },
      attachTo: document.body,
    })
    await nextTick()
    expect(w.findAll('.sg-dashboard-resize-handle').length).toBe(0)
    w.unmount()
  })

  it('exposes getLayout returning current widget array', async () => {
    const w = mount(SgDashboardEditor, { props: { widgets }, attachTo: document.body })
    await nextTick()
    const cmp = w.vm as unknown as { getLayout: () => unknown[] }
    expect(cmp.getLayout()).toHaveLength(3)
    w.unmount()
  })
})
