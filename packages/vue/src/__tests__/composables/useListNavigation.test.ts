import { describe, it, expect, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { useListNavigation } from '../../composables/useListNavigation'

function harnessNav(opts?: Parameters<typeof useListNavigation>[0]) {
  let api!: ReturnType<typeof useListNavigation>
  const onSelect = vi.fn()
  const Comp = defineComponent({
    setup() {
      api = useListNavigation({
        itemCount: 4,
        onSelect,
        ...opts,
      })
      return () => h('div')
    },
  })
  const wrapper = mount(Comp)
  return { wrapper, get: () => api, onSelect }
}

describe('useListNavigation', () => {
  it('starts with activeIndex = -1', async () => {
    const { get } = harnessNav()
    await nextTick()
    expect(get().activeIndex.value).toBe(-1)
  })

  it('ArrowDown / ArrowUp move with looping', async () => {
    const { get } = harnessNav()
    await nextTick()
    get().handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    expect(get().activeIndex.value).toBe(0)
    get().handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowUp' }))
    expect(get().activeIndex.value).toBe(3) // looped
  })

  it('Enter / Space invokes onSelect', async () => {
    const { get, onSelect } = harnessNav()
    await nextTick()
    get().handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    get().handleKeyDown(new KeyboardEvent('keydown', { key: 'Enter' }))
    expect(onSelect).toHaveBeenCalledWith(0)
    get().handleKeyDown(new KeyboardEvent('keydown', { key: ' ' }))
    expect(onSelect).toHaveBeenCalledTimes(2)
  })

  it('Escape resets activeIndex to -1', async () => {
    const { get } = harnessNav()
    await nextTick()
    get().handleKeyDown(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    expect(get().activeIndex.value).toBe(0)
    get().handleKeyDown(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(get().activeIndex.value).toBe(-1)
  })

  it('typeahead jumps to label starting with the typed character', async () => {
    const { get } = harnessNav()
    await nextTick()
    get().setLabels(['Apple', 'Banana', 'Cherry', 'Date'])
    get().handleKeyDown(new KeyboardEvent('keydown', { key: 'c' }))
    expect(get().activeIndex.value).toBe(2)
  })

  it('Home and End move to bounds', async () => {
    const { get } = harnessNav()
    await nextTick()
    get().handleKeyDown(new KeyboardEvent('keydown', { key: 'End' }))
    expect(get().activeIndex.value).toBe(3)
    get().handleKeyDown(new KeyboardEvent('keydown', { key: 'Home' }))
    expect(get().activeIndex.value).toBe(0)
  })
})
