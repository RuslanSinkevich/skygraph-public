import { describe, it, expect, beforeAll } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { useVirtualScroll } from '../../composables/useVirtualScroll'

// jsdom doesn't ship a ResizeObserver. Provide a no-op stand-in so the
// composable can attach without crashing under test.
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

function harness<T>(setup: () => T) {
  let api!: T
  const Comp = defineComponent({
    setup() {
      api = setup()
      return () => h('div', { ref: 'el', style: 'height: 200px; overflow: auto' })
    },
  })
  const wrapper = mount(Comp, { attachTo: document.body })
  return { wrapper, get: () => api }
}

describe('useVirtualScroll', () => {
  it('initialises with empty range when container is unmounted', () => {
    const { get } = harness(() =>
      useVirtualScroll({ itemCount: 100, itemHeight: 30 }),
    )
    const range = get().range.value
    expect(range.totalHeight).toBeGreaterThan(0)
    expect(Array.isArray(range.visibleItems)).toBe(true)
  })

  it('reacts to itemCount Ref changes', async () => {
    const count = ref(50)
    const { get } = harness(() =>
      useVirtualScroll({ itemCount: count, itemHeight: 20 }),
    )
    const before = get().range.value.totalHeight
    count.value = 200
    await nextTick()
    const after = get().range.value.totalHeight
    expect(after).toBeGreaterThan(before)
  })

  it('exposes scrollToIndex without crashing on detached container', () => {
    const { get } = harness(() =>
      useVirtualScroll({ itemCount: 100, itemHeight: 25 }),
    )
    expect(() => get().scrollToIndex(50)).not.toThrow()
  })

  it('engine handle is stable across calls', () => {
    const { get } = harness(() =>
      useVirtualScroll({ itemCount: 10, itemHeight: 20 }),
    )
    const a = get().engine
    const b = get().engine
    expect(a).toBe(b)
  })
})
