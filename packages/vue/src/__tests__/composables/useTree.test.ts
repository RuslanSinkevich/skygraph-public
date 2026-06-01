import { describe, it, expect } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { useTree } from '../../composables/useTree'

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

const sampleTree = [
  {
    key: 'a',
    title: 'A',
    children: [
      { key: 'a1', title: 'A1', children: [] },
      { key: 'a2', title: 'A2', children: [] },
    ],
  },
  { key: 'b', title: 'B', children: [] },
]

describe('useTree', () => {
  it('flatNodes contains seeded data', () => {
    const { get } = harness(() => useTree({ data: sampleTree }))
    expect(get().flatNodes.value.length).toBeGreaterThan(0)
  })

  it('expand / collapse mutates state.expandedKeys', () => {
    const { get } = harness(() => useTree({ data: sampleTree }))
    get().expand('a')
    expect(get().treeState.value.expandedKeys).toContain('a')
    get().collapse('a')
    expect(get().treeState.value.expandedKeys).not.toContain('a')
  })

  it('select stores a selected key', () => {
    const { get } = harness(() => useTree({ data: sampleTree }))
    get().select('a1')
    expect(get().treeState.value.selectedKeys).toContain('a1')
  })
})
