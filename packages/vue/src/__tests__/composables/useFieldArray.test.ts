import { describe, it, expect } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { useForm } from '../../composables/useForm'
import { useFieldArray } from '../../composables/useFieldArray'

function setupArray(name: string, defaultValues: Record<string, unknown> = {}) {
  let api!: {
    form: ReturnType<typeof useForm>
    array: ReturnType<typeof useFieldArray>
  }
  const Comp = defineComponent({
    setup() {
      const form = useForm({ defaultValues })
      form.form.register(name)
      const array = useFieldArray(form.form, name)
      api = { form, array }
      return () => h('div')
    },
  })
  const wrapper = mount(Comp)
  return { wrapper, get: () => api }
}

describe('useFieldArray', () => {
  it('starts empty when no defaults', () => {
    const { get } = setupArray('items')
    expect(get().array.fields.value).toEqual([])
  })

  it('starts populated with initial defaults', () => {
    const { get } = setupArray('items', { items: ['a', 'b', 'c'] })
    expect(get().array.fields.value.length).toBe(3)
    expect(get().array.fields.value.map((f) => f.index)).toEqual([0, 1, 2])
  })

  it('append adds a new entry', async () => {
    const { get } = setupArray('items', { items: [] })
    get().array.append('first')
    await nextTick()
    expect(get().array.fields.value.length).toBe(1)
    expect(get().form.form.getListValue('items')).toEqual(['first'])
  })

  it('append generates unique stable keys', () => {
    const { get } = setupArray('items', { items: [] })
    get().array.append('a')
    get().array.append('b')
    const keys = get().array.fields.value.map((f) => f.key)
    expect(new Set(keys).size).toBe(2)
  })

  it('remove drops entry at index', async () => {
    const { get } = setupArray('items', { items: ['a', 'b', 'c'] })
    get().array.remove(1)
    await nextTick()
    expect(get().array.fields.value.length).toBe(2)
  })

  it('move reorders entries', async () => {
    const { get } = setupArray('items', { items: ['a', 'b', 'c'] })
    const before = get().array.fields.value.map((f) => f.key)
    get().array.move(0, 2)
    await nextTick()
    const after = get().array.fields.value.map((f) => f.key)
    expect(after[2]).toBe(before[0])
  })

  it('replace swaps entire list', async () => {
    const { get } = setupArray('items', { items: ['a', 'b'] })
    get().array.replace(['x', 'y', 'z'])
    await nextTick()
    expect(get().array.fields.value.length).toBe(3)
  })
})
