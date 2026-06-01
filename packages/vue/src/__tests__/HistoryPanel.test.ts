import { describe, it, expect } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { createCore } from '@skygraph/core'
import { useHistory } from '../composables/useHistory'
import SgHistoryPanel from '../components/devtools/HistoryPanel.vue'

/**
 * Mounts a host that calls `useHistory` in its setup, so reactive refs
 * stay alive while we drive Core writes from the test.
 */
function mountPanel() {
  let api!: ReturnType<typeof useHistory>
  const Host = defineComponent({
    setup() {
      const core = createCore()
      api = useHistory(core)
      ;(api as unknown as { __core: ReturnType<typeof createCore> }).__core = core
      return () => h(SgHistoryPanel, { history: api })
    },
  })
  const wrapper = mount(Host)
  const core = (api as unknown as { __core: ReturnType<typeof createCore> }).__core
  return { wrapper, api, core }
}

describe('SgHistoryPanel (devtool, parity with React)', () => {
  it('renders the empty state with no history yet', () => {
    const { wrapper } = mountPanel()
    expect(wrapper.text()).toContain('Time-Travel (0)')
    expect(wrapper.text()).toContain('No history yet')
  })

  it('renders an entry per history record after a Core write', async () => {
    const { wrapper, core } = mountPanel()
    core.set('foo', 1)
    await Promise.resolve() // microtask refresh in useHistory
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Time-Travel (1)')
    expect(wrapper.findAll('li').length).toBe(1)
  })

  it('disables Undo / Redo controls when not available', () => {
    const { wrapper } = mountPanel()
    const buttons = wrapper.findAll('button')
    const undo = buttons.find((b) => b.text() === 'Undo')
    const redo = buttons.find((b) => b.text() === 'Redo')
    expect(undo?.attributes('disabled')).toBeDefined()
    expect(redo?.attributes('disabled')).toBeDefined()
  })

  it('clear() empties the panel', async () => {
    const { wrapper, api, core } = mountPanel()
    core.set('a', 1)
    core.set('a', 2)
    await Promise.resolve()
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('li').length).toBeGreaterThan(0)

    api.clear()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('No history yet')
  })

  it('singularises the write count for entries with one patch', async () => {
    const { wrapper, core } = mountPanel()
    core.set('a', 1)
    await Promise.resolve()
    await wrapper.vm.$nextTick()
    // Each entry has exactly one patch in this scenario, so `text()` must
    // contain "1 write" but never "1 writes" — the React component picks
    // singular vs plural the same way (`length !== 1 ? 's' : ''`).
    const text = wrapper.text()
    expect(text).toContain('1 write')
    expect(text).not.toContain('1 writes')
  })
})
