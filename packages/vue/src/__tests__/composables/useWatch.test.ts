import { describe, it, expect } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { useForm } from '../../composables/useForm'
import { useWatch } from '../../composables/useWatch'

function setupWatch(name: string, defaults: Record<string, unknown>) {
  let api!: {
    form: ReturnType<typeof useForm>
    watched: ReturnType<typeof useWatch>
  }
  const Comp = defineComponent({
    setup() {
      const form = useForm({ defaultValues: defaults })
      const watched = useWatch(form.core, name)
      api = { form, watched }
      return () => h('div')
    },
  })
  const wrapper = mount(Comp)
  return { wrapper, get: () => api }
}

describe('useWatch', () => {
  it('returns reactive ref for given path', () => {
    const { get } = setupWatch('name', { name: 'Alice' })
    expect(get().watched.value).toBe('Alice')
  })

  it('updates when value changes', async () => {
    const { get } = setupWatch('name', { name: 'Alice' })
    get().form.core.set('name', 'Bob')
    await nextTick()
    expect(get().watched.value).toBe('Bob')
  })

  it('returns undefined for unset paths', () => {
    const { get } = setupWatch('missing', {})
    expect(get().watched.value).toBeUndefined()
  })

  it('tracks subsequent writes to a path', async () => {
    const { get } = setupWatch('count', { count: 0 })
    expect(get().watched.value).toBe(0)
    get().form.core.set('count', 1)
    await nextTick()
    expect(get().watched.value).toBe(1)
    get().form.core.set('count', 2)
    await nextTick()
    expect(get().watched.value).toBe(2)
  })

  it('disposes the subscription on unmount', () => {
    const { wrapper } = setupWatch('name', { name: 'Alice' })
    expect(() => wrapper.unmount()).not.toThrow()
  })
})
