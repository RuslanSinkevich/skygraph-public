import { describe, it, expect } from 'vitest'
import { defineComponent, h, ref, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { useRovingTabIndex } from '../../composables/useRovingTabIndex'

describe('useRovingTabIndex', () => {
  it('first item gets tabindex 0, others -1', async () => {
    const Comp = defineComponent({
      setup() {
        const { getItemProps } = useRovingTabIndex(3)
        return () =>
          h('div', [
            h('button', { ...getItemProps(0) }, 'a'),
            h('button', { ...getItemProps(1) }, 'b'),
            h('button', { ...getItemProps(2) }, 'c'),
          ])
      },
    })
    const wrapper = mount(Comp, { attachTo: document.body })
    await nextTick()
    const buttons = wrapper.element.querySelectorAll('button')
    expect((buttons[0] as HTMLElement).getAttribute('tabindex')).toBe('0')
    expect((buttons[1] as HTMLElement).getAttribute('tabindex')).toBe('-1')
  })

  it('ArrowDown moves activeIndex forward, looping by default', async () => {
    const count = ref(3)
    let api!: ReturnType<typeof useRovingTabIndex>
    const Comp = defineComponent({
      setup() {
        api = useRovingTabIndex(count)
        return () =>
          h(
            'div',
            { tabindex: '0' },
            [0, 1, 2].map((i) => h('button', { ...api.getItemProps(i) }, String(i))),
          )
      },
    })
    const wrapper = mount(Comp, { attachTo: document.body })
    await nextTick()
    const ev = new KeyboardEvent('keydown', { key: 'ArrowDown' })
    api.handleKeyDown(ev)
    expect(api.activeIndex.value).toBe(1)
    api.handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    api.handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    expect(api.activeIndex.value).toBe(0) // looped
    wrapper.unmount()
  })

  it('honours horizontal orientation (ArrowRight / ArrowLeft)', async () => {
    let api!: ReturnType<typeof useRovingTabIndex>
    const Comp = defineComponent({
      setup() {
        api = useRovingTabIndex(3, { orientation: 'horizontal' })
        return () => h('div')
      },
    })
    const wrapper = mount(Comp)
    await nextTick()
    api.handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    expect(api.activeIndex.value).toBe(1)
    api.handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
    expect(api.activeIndex.value).toBe(0)
    api.handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    // ArrowDown ignored in horizontal orientation
    expect(api.activeIndex.value).toBe(0)
    wrapper.unmount()
  })

  it('does not loop when loop=false', async () => {
    let api!: ReturnType<typeof useRovingTabIndex>
    const Comp = defineComponent({
      setup() {
        api = useRovingTabIndex(3, { loop: false })
        return () => h('div')
      },
    })
    const wrapper = mount(Comp)
    await nextTick()
    api.handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowUp' }))
    // Was at 0 already, can't go below — stays at 0
    expect(api.activeIndex.value).toBe(0)
    wrapper.unmount()
  })

  it('Home / End jump to bounds', async () => {
    let api!: ReturnType<typeof useRovingTabIndex>
    const Comp = defineComponent({
      setup() {
        api = useRovingTabIndex(5)
        return () => h('div')
      },
    })
    const wrapper = mount(Comp)
    await nextTick()
    api.handleKeyDown(new KeyboardEvent('keydown', { key: 'End' }))
    expect(api.activeIndex.value).toBe(4)
    api.handleKeyDown(new KeyboardEvent('keydown', { key: 'Home' }))
    expect(api.activeIndex.value).toBe(0)
    wrapper.unmount()
  })
})
