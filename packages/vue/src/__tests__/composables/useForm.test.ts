import { describe, it, expect, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { useForm } from '../../composables/useForm'

function harness<T>(setup: () => T) {
  let api!: T
  const Comp = defineComponent({
    setup() {
      api = setup()
      return () => h('div')
    },
  })
  const wrapper = mount(Comp)
  return { wrapper, api: () => api }
}

describe('useForm', () => {
  it('exposes default values via reactive `values` ref', async () => {
    const { api } = harness(() =>
      useForm({ defaultValues: { name: 'Ann', age: 21 } }),
    )
    await nextTick()
    expect(api().values.value).toEqual({ name: 'Ann', age: 21 })
  })

  it('updates values on setFieldValue', async () => {
    const { api } = harness(() => useForm({ defaultValues: { name: '' } }))
    api().setFieldValue('name', 'Bob')
    await nextTick()
    expect(api().values.value.name).toBe('Bob')
  })

  it('updates values on setFieldsValue (batch)', async () => {
    const { api } = harness(() => useForm({ defaultValues: { a: 0, b: 0 } }))
    api().setFieldsValue({ a: 1, b: 2 })
    await nextTick()
    expect(api().values.value).toEqual({ a: 1, b: 2 })
  })

  it('reset() restores default values', async () => {
    const { api } = harness(() =>
      useForm({ defaultValues: { name: 'Ann' } }),
    )
    api().setFieldValue('name', 'Charlie')
    await nextTick()
    expect(api().values.value.name).toBe('Charlie')
    api().reset()
    await nextTick()
    expect(api().values.value.name).toBe('Ann')
  })

  it('reset(values) sets fresh values', async () => {
    const { api } = harness(() => useForm({ defaultValues: { name: '' } }))
    api().reset({ name: 'Dora' })
    await nextTick()
    expect(api().values.value.name).toBe('Dora')
  })

  it('runs onSubmit when submit() is called', async () => {
    const onSubmit = vi.fn()
    const { api } = harness(() =>
      useForm({ defaultValues: { name: 'Ann' }, onSubmit }),
    )
    await api().submit()
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith({ name: 'Ann' })
  })

  it('reflects isValid via computed ref', async () => {
    const { api } = harness(() => {
      const f = useForm({ defaultValues: { name: '' } })
      f.form.register('name', { rules: [{ required: true }] })
      return f
    })
    await api().validateFields()
    await nextTick()
    expect(api().isValid.value).toBe(false)
    api().setFieldValue('name', 'Ada')
    await api().validateFields()
    await nextTick()
    expect(api().isValid.value).toBe(true)
  })

  it('isSubmitting toggles around async submit', async () => {
    const onSubmit = vi.fn(
      () => new Promise<void>((r) => setTimeout(r, 10)),
    )
    const { api } = harness(() =>
      useForm({ defaultValues: { name: 'a' }, onSubmit }),
    )
    const p = api().submit()
    await nextTick()
    expect(api().formState.value.isSubmitting).toBe(true)
    await p
    await nextTick()
    expect(api().formState.value.isSubmitting).toBe(false)
  })

  it('calls onSubmitInvalid when validation fails', async () => {
    const onSubmit = vi.fn()
    const onSubmitInvalid = vi.fn()
    const { api } = harness(() => {
      const f = useForm({
        defaultValues: { email: '' },
        onSubmit,
        onSubmitInvalid,
      })
      f.form.register('email', { rules: [{ required: true }] })
      return f
    })
    await api().submit()
    expect(onSubmitInvalid).toHaveBeenCalled()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('getFieldValue / getFieldsValue read live values', async () => {
    const { api } = harness(() =>
      useForm({ defaultValues: { x: 1, y: 2 } }),
    )
    expect(api().getFieldValue('x')).toBe(1)
    expect(api().getFieldsValue()).toEqual({ x: 1, y: 2 })
  })

  it('returns stable form/core references', () => {
    const { api } = harness(() =>
      useForm({ defaultValues: { name: '' } }),
    )
    const a = api()
    expect(a.form).toBeDefined()
    expect(a.core).toBeDefined()
    expect(typeof a.form.register).toBe('function')
    expect(typeof a.core.subscribe).toBe('function')
  })
})
