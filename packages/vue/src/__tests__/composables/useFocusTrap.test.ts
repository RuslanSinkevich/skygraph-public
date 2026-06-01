import { describe, it, expect } from 'vitest'
import { defineComponent, h, ref, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { useFocusTrap } from '../../composables/useFocusTrap'

describe('useFocusTrap', () => {
  it('returns a template ref that binds to a container', async () => {
    let containerRef!: ReturnType<typeof useFocusTrap>
    const active = ref(false)
    const Comp = defineComponent({
      setup() {
        containerRef = useFocusTrap(active)
        return () =>
          h('div', { ref: containerRef, tabindex: '-1' }, [
            h('button', { class: 'b1' }, 'A'),
            h('button', { class: 'b2' }, 'B'),
          ])
      },
    })
    const wrapper = mount(Comp, { attachTo: document.body })
    await nextTick()
    expect(containerRef.value).toBeTruthy()
    expect(containerRef.value?.querySelectorAll('button').length).toBe(2)
    wrapper.unmount()
  })

  it('cycles focus on Tab when active', async () => {
    const active = ref(true)
    let containerRef!: ReturnType<typeof useFocusTrap>
    const Comp = defineComponent({
      setup() {
        containerRef = useFocusTrap(active)
        return () =>
          h('div', { ref: containerRef, tabindex: '-1' }, [
            h('button', { id: 'first' }, 'A'),
            h('button', { id: 'last' }, 'B'),
          ])
      },
    })
    const wrapper = mount(Comp, { attachTo: document.body })
    await nextTick()
    const container = containerRef.value as HTMLElement
    const last = container.querySelector('#last') as HTMLButtonElement
    last.focus()

    const ev = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })
    container.dispatchEvent(ev)
    await nextTick()
    expect(document.activeElement?.id).toBe('first')
    wrapper.unmount()
  })

  it('Shift+Tab from first wraps to last', async () => {
    const active = ref(true)
    let containerRef!: ReturnType<typeof useFocusTrap>
    const Comp = defineComponent({
      setup() {
        containerRef = useFocusTrap(active)
        return () =>
          h('div', { ref: containerRef, tabindex: '-1' }, [
            h('button', { id: 'first' }, 'A'),
            h('button', { id: 'last' }, 'B'),
          ])
      },
    })
    const wrapper = mount(Comp, { attachTo: document.body })
    await nextTick()
    const container = containerRef.value as HTMLElement
    const first = container.querySelector('#first') as HTMLButtonElement
    first.focus()
    const ev = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true })
    container.dispatchEvent(ev)
    await nextTick()
    expect(document.activeElement?.id).toBe('last')
    wrapper.unmount()
  })
})
