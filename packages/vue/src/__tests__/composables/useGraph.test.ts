import { describe, it, expect } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { useGraph } from '../../composables/useGraph'

function harness<T>(setup: () => T) {
  let api!: T
  const Comp = defineComponent({
    setup() {
      api = setup()
      return () => h('div')
    },
  })
  const wrapper = mount(Comp)
  return { wrapper, get: () => api }
}

describe('useGraph', () => {
  it('initial state has no nodes / edges', () => {
    const { get } = harness(() => useGraph())
    expect(get().state.value.nodes.size).toBe(0)
    expect(get().state.value.edges.size).toBe(0)
  })

  it('addNode reflects in reactive state', async () => {
    const { get } = harness(() => useGraph())
    get().graph.addNode({ id: 'n1', transform: { x: 0, y: 0 } })
    await nextTick()
    expect(get().state.value.nodes.size).toBe(1)
    expect(get().state.value.nodes.get('n1')).toBeDefined()
  })

  it('addEdge increases edges count', async () => {
    const { get } = harness(() => useGraph())
    get().graph.addNode({ id: 'a', transform: { x: 0, y: 0 } })
    get().graph.addNode({ id: 'b', transform: { x: 200, y: 0 } })
    get().graph.addEdge({
      id: 'e1',
      from: { node: 'a', anchor: { s: 0.5 } },
      to: { node: 'b', anchor: { s: 0.5 } },
    })
    await nextTick()
    expect(get().state.value.edges.size).toBe(1)
  })
})
