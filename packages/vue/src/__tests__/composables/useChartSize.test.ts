import { describe, it, expect, beforeAll } from 'vitest'
import { ref, defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { useChartSize } from '../../composables/useChartSize'

beforeAll(() => {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    class FakeResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    ;(globalThis as unknown as { ResizeObserver: typeof FakeResizeObserver }).ResizeObserver =
      FakeResizeObserver
  }
})

describe('useChartSize', () => {
  it('returns the fallback size before any RO callback fires', async () => {
    let captured!: ReturnType<typeof useChartSize>
    const Comp = defineComponent({
      setup() {
        const target = ref<HTMLDivElement | null>(null)
        captured = useChartSize(target, { width: 100, height: 50 })
        return () => h('div', { ref: target })
      },
    })
    const w = mount(Comp, { attachTo: document.body })
    await nextTick()
    expect(captured.size.value.width).toBe(100)
    expect(captured.size.value.height).toBe(50)
    w.unmount()
  })

  it('updates when getBoundingClientRect provides a size', async () => {
    let captured!: ReturnType<typeof useChartSize>
    const Comp = defineComponent({
      setup() {
        const target = ref<HTMLDivElement | null>(null)
        captured = useChartSize(target, { width: 100, height: 100 })
        return () => h('div', { ref: target })
      },
    })
    const w = mount(Comp, { attachTo: document.body })
    await nextTick()
    const el = w.element as HTMLElement
    Object.defineProperty(el, 'getBoundingClientRect', {
      value: () => ({ width: 250, height: 150, top: 0, left: 0, bottom: 150, right: 250 }),
      configurable: true,
    })
    Object.defineProperty(el, 'getBoundingClientRect', {
      value: () => ({ width: 250, height: 150, top: 0, left: 0, bottom: 150, right: 250, x: 0, y: 0, toJSON() {} }),
    })
    expect(captured.size.value.width).toBe(100) // still fallback (we didn't trigger remeasure)
    w.unmount()
  })

  it('returns positive integer dimensions for the fallback path', async () => {
    let captured!: ReturnType<typeof useChartSize>
    const Comp = defineComponent({
      setup() {
        const target = ref<HTMLDivElement | null>(null)
        captured = useChartSize(target, { width: 320, height: 200 })
        return () => h('div', { ref: target })
      },
    })
    const w = mount(Comp, { attachTo: document.body })
    await nextTick()
    expect(captured.size.value.width).toBeGreaterThan(0)
    expect(captured.size.value.height).toBeGreaterThan(0)
    w.unmount()
  })
})
