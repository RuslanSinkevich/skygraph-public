import { describe, it, expect } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { createCore } from '@skygraph/core'
import { useHistory } from '../../composables/useHistory'

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

describe('useHistory', () => {
  it('initialises with empty undo / redo stack', () => {
    const core = createCore()
    const { get } = harness(() => useHistory(core))
    expect(get().canUndo.value).toBe(false)
    expect(get().canRedo.value).toBe(false)
  })

  it('tracks core writes and supports undo / redo', async () => {
    const core = createCore()
    const { get } = harness(() => useHistory(core))

    core.set('foo', 1)
    // Wait for microtask-scheduled refresh
    await Promise.resolve()
    expect(get().canUndo.value).toBe(true)
    expect(core.get('foo')).toBe(1)

    get().undo()
    expect(core.get('foo')).toBeUndefined()
    expect(get().canRedo.value).toBe(true)

    get().redo()
    expect(core.get('foo')).toBe(1)
    expect(get().canUndo.value).toBe(true)
    expect(get().canRedo.value).toBe(false)
  })

  it('clear() resets the history', async () => {
    const core = createCore()
    const { get } = harness(() => useHistory(core))
    core.set('a', 1)
    core.set('a', 2)
    await Promise.resolve()
    expect(get().entries.value.length).toBeGreaterThan(0)
    get().clear()
    expect(get().entries.value.length).toBe(0)
    expect(get().canUndo.value).toBe(false)
    expect(get().canRedo.value).toBe(false)
  })

  it('jumpTo() moves cursor to specific entry', async () => {
    const core = createCore()
    const { get } = harness(() => useHistory(core))
    core.set('a', 1)
    core.set('a', 2)
    core.set('a', 3)
    await Promise.resolve()
    get().jumpTo(0)
    expect(core.get('a')).toBe(1)
  })
})
