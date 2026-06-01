import { describe, it, expect } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { useForm } from '../../composables/useForm'
import { useField } from '../../composables/useField'

function setupField(name: string, registerOpts?: Parameters<ReturnType<typeof useForm>['form']['register']>[1]) {
  let api!: { form: ReturnType<typeof useForm>; field: ReturnType<typeof useField> }
  const Comp = defineComponent({
    setup() {
      const form = useForm({ defaultValues: { [name]: '' } })
      form.form.register(name, registerOpts)
      const field = useField(form.core, form.form, name)
      api = { form, field }
      return () => h('div')
    },
  })
  const wrapper = mount(Comp)
  return { wrapper, get: () => api }
}

describe('useField', () => {
  it('reads initial value from default values', () => {
    const { get } = setupField('name')
    expect(get().field.value.value).toBe('')
  })

  it('reflects setValue writes', async () => {
    const { get } = setupField('name')
    get().field.onChange('Ann')
    await nextTick()
    expect(get().field.value.value).toBe('Ann')
  })

  it('errors update reactively after validate()', async () => {
    const { get } = setupField('name', { rules: [{ required: true }] })
    await get().form.validateFields('name')
    await nextTick()
    expect(get().field.errors.value.length).toBeGreaterThan(0)
    expect(get().field.error.value).toBeTruthy()
    get().field.onChange('Bob')
    await get().form.validateFields('name')
    await nextTick()
    expect(get().field.errors.value).toEqual([])
  })

  it('touched flips after onBlur', async () => {
    const { get } = setupField('name')
    expect(get().field.touched.value).toBe(false)
    get().field.onBlur()
    await nextTick()
    expect(get().field.touched.value).toBe(true)
  })

  it('status follows errors', async () => {
    const { get } = setupField('name', { rules: [{ required: true }] })
    await get().form.validateFields('name')
    await nextTick()
    expect(get().field.status.value).toBe('error')
  })
})
