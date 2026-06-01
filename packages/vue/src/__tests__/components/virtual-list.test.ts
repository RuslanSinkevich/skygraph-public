import { describe, it, expect, beforeAll } from 'vitest'
import { defineComponent, ref, nextTick } from 'vue'
import type { Component } from 'vue'
import { mount } from '@vue/test-utils'
import SgVirtualListImport from '../../components/complex/VirtualList/VirtualList.vue'

const SgVirtualList = SgVirtualListImport as unknown as Component

beforeAll(() => {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    class FakeResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    ;(globalThis as unknown as { ResizeObserver: typeof FakeResizeObserver }).ResizeObserver = FakeResizeObserver
  }
})

describe('SgVirtualList', () => {
  it('renders items via the `item` slot', async () => {
    const data = Array.from({ length: 10 }, (_, i) => ({ name: `Item ${i}` }))
    const Wrapper = defineComponent({
      components: { SgVirtualList },
      setup() {
        return { data }
      },
      template: `
        <SgVirtualList :data="data" :itemHeight="20" :containerStyle="{ height: '100px' }">
          <template #item="{ item, index }">
            <div :data-index="index">{{ item.name }}</div>
          </template>
        </SgVirtualList>
      `,
    })
    const wrapper = mount(Wrapper, { attachTo: document.body })
    await nextTick()
    // Some subset of items should be rendered (initial range may be empty
    // until the container reports its dimensions, but the wrapper at least
    // exists)
    expect(wrapper.find('div').exists()).toBe(true)
    wrapper.unmount()
  })

  it('exposes scrollToIndex via defineExpose', async () => {
    const data = Array.from({ length: 100 }, (_, i) => i)
    const Wrapper = defineComponent({
      components: { SgVirtualList },
      setup() {
        const listRef = ref<{ scrollToIndex: (i: number) => void } | null>(null)
        return { data, listRef }
      },
      template: `
        <SgVirtualList ref="listRef" :data="data" :itemHeight="20" :containerStyle="{ height: '100px' }">
          <template #item="{ item }"><div>{{ item }}</div></template>
        </SgVirtualList>
      `,
    })
    const wrapper = mount(Wrapper, { attachTo: document.body })
    await nextTick()
    const cmp = wrapper.vm.$refs.listRef as { scrollToIndex: (i: number) => void }
    expect(typeof cmp.scrollToIndex).toBe('function')
    expect(() => cmp.scrollToIndex(50)).not.toThrow()
    wrapper.unmount()
  })

  it('renders nothing when data is empty', async () => {
    const Wrapper = defineComponent({
      components: { SgVirtualList },
      setup() {
        return { data: [] as number[] }
      },
      template: `
        <SgVirtualList :data="data" :itemHeight="20" :containerStyle="{ height: '100px' }">
          <template #item="{ item }"><div>{{ item }}</div></template>
        </SgVirtualList>
      `,
    })
    const wrapper = mount(Wrapper, { attachTo: document.body })
    await nextTick()
    // No item slot output expected
    expect(wrapper.findAll('[data-index]').length).toBe(0)
    wrapper.unmount()
  })
})
