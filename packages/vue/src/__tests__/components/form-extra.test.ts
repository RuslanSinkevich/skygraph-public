import { describe, it, expect, vi } from 'vitest'
import { defineComponent, nextTick } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { SgForm, SgField } from '../../components/complex/Form'
import SgInput from '../../components/ui/Input.vue'
import { useForm } from '../../composables/useForm'

describe('SgForm — extra cases', () => {
  it('accepts initialValues alias', () => {
    const Comp = defineComponent({
      components: { SgForm, SgField },
      template: `
        <SgForm :initial-values="{ name: 'Bob' }">
          <SgField name="name" v-slot="{ value }">
            <span class="v">{{ value }}</span>
          </SgField>
        </SgForm>
      `,
    })
    const wrapper = mount(Comp)
    expect(wrapper.find('.v').text()).toBe('Bob')
  })

  it('emits finish on valid submit', async () => {
    const onFinish = vi.fn()
    const Comp = defineComponent({
      components: { SgForm, SgField },
      setup() {
        return { onFinish }
      },
      template: `
        <SgForm :default-values="{ x: 'ok' }" @finish="onFinish">
          <SgField name="x" />
          <button type="submit">go</button>
        </SgForm>
      `,
    })
    const wrapper = mount(Comp)
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(onFinish).toHaveBeenCalled()
  })

  it('emits finishFailed on invalid submit', async () => {
    const onFinishFailed = vi.fn()
    const Comp = defineComponent({
      components: { SgForm, SgField },
      setup() {
        return { onFinishFailed }
      },
      template: `
        <SgForm :default-values="{ x: '' }" @finish-failed="onFinishFailed">
          <SgField name="x" :rules="[{ required: true }]" />
          <button type="submit">go</button>
        </SgForm>
      `,
    })
    const wrapper = mount(Comp)
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(onFinishFailed).toHaveBeenCalled()
  })

  it('uses external form via `form` prop', async () => {
    let externalForm: ReturnType<typeof useForm> | undefined
    const Comp = defineComponent({
      components: { SgForm, SgField },
      setup() {
        externalForm = useForm({ defaultValues: { name: 'Ext' } })
        return { externalForm }
      },
      template: `
        <SgForm :form="externalForm">
          <SgField name="name" v-slot="{ value }">
            <span class="v">{{ value }}</span>
          </SgField>
        </SgForm>
      `,
    })
    const wrapper = mount(Comp)
    expect(wrapper.find('.v').text()).toBe('Ext')
    expect(externalForm).toBeDefined()
  })

  it('applies horizontal layout class', () => {
    const wrapper = mount(SgForm, {
      props: { defaultValues: {}, layout: 'horizontal' },
      slots: { default: '<div />' },
    })
    expect(wrapper.find('form').classes()).toContain('sg-form-horizontal')
  })

  it('applies inline layout class', () => {
    const wrapper = mount(SgForm, {
      props: { defaultValues: {}, layout: 'inline' },
      slots: { default: '<div />' },
    })
    expect(wrapper.find('form').classes()).toContain('sg-form-inline')
  })

  it('applies size modifier class', () => {
    const wrapper = mount(SgForm, {
      props: { defaultValues: {}, size: 'large' },
      slots: { default: '<div />' },
    })
    expect(wrapper.find('form').classes()).toContain('sg-form-large')
  })

  it('exposes form API via defineExpose', () => {
    const wrapper = mount(SgForm, {
      props: { defaultValues: { name: 'Ada' } },
      slots: { default: '<div />' },
    })
    const exposed = wrapper.vm as unknown as {
      formApi: unknown
      submit: () => void
      reset: () => void
      validate: () => unknown
      getFieldsValue: () => Record<string, unknown>
      setFieldsValue: (v: Record<string, unknown>) => void
    }
    expect(exposed.formApi).toBeDefined()
    expect(typeof exposed.submit).toBe('function')
    expect(typeof exposed.reset).toBe('function')
    expect(exposed.getFieldsValue()).toMatchObject({ name: 'Ada' })
  })
})

describe('SgField — extra cases', () => {
  it('hidden=true skips rendering', () => {
    const Comp = defineComponent({
      components: { SgForm, SgField },
      template: `
        <SgForm :default-values="{ x: '' }">
          <SgField name="x" hidden label="X" />
        </SgForm>
      `,
    })
    const wrapper = mount(Comp)
    expect(wrapper.find('.sg-field').exists()).toBe(false)
  })

  it('noStyle skips wrapping markup', () => {
    const Comp = defineComponent({
      components: { SgForm, SgField, SgInput },
      methods: {
        toStr(v: unknown): string {
          return typeof v === 'string' ? v : ''
        },
      },
      template: `
        <SgForm :default-values="{ x: '' }">
          <SgField name="x" no-style v-slot="{ value, onChange }">
            <SgInput :model-value="toStr(value)" @update:model-value="onChange" />
          </SgField>
        </SgForm>
      `,
    })
    const wrapper = mount(Comp)
    expect(wrapper.find('.sg-field').exists()).toBe(false)
    expect(wrapper.find('input').exists()).toBe(true)
  })

  it('applies validateStatus modifier class', () => {
    const Comp = defineComponent({
      components: { SgForm, SgField },
      template: `
        <SgForm :default-values="{ x: '' }">
          <SgField name="x" label="X" validate-status="warning" />
        </SgForm>
      `,
    })
    const wrapper = mount(Comp)
    expect(wrapper.find('.sg-field').classes()).toContain('sg-field-status-warning')
  })

  it('respects required prop and renders required marker', () => {
    const Comp = defineComponent({
      components: { SgForm, SgField },
      template: `
        <SgForm :default-values="{ x: '' }">
          <SgField name="x" label="X" required />
        </SgForm>
      `,
    })
    const wrapper = mount(Comp)
    expect(wrapper.find('.sg-field-required').exists()).toBe(true)
  })

  it('renders help text when no errors', () => {
    const Comp = defineComponent({
      components: { SgForm, SgField },
      template: `
        <SgForm :default-values="{ x: '' }">
          <SgField name="x" label="X" help="Some hint" />
        </SgForm>
      `,
    })
    const wrapper = mount(Comp)
    expect(wrapper.find('.sg-field-help').text()).toBe('Some hint')
  })

  it('renders extra block when provided', () => {
    const Comp = defineComponent({
      components: { SgForm, SgField },
      template: `
        <SgForm :default-values="{ x: '' }">
          <SgField name="x" label="X" extra="extra-info" />
        </SgForm>
      `,
    })
    const wrapper = mount(Comp)
    expect(wrapper.find('.sg-field-extra').text()).toBe('extra-info')
  })

  it('normalize transforms values before commit', async () => {
    const Comp = defineComponent({
      components: { SgForm, SgField, SgInput },
      setup() {
        return {
          normalize: (v: unknown) => (typeof v === 'string' ? v.toUpperCase() : v),
        }
      },
      methods: {
        toStr(v: unknown): string {
          return typeof v === 'string' ? v : ''
        },
      },
      template: `
        <SgForm :default-values="{ x: '' }">
          <SgField name="x" :normalize="normalize" v-slot="{ value, onChange }">
            <SgInput :model-value="toStr(value)" @update:model-value="onChange" />
          </SgField>
        </SgForm>
      `,
    })
    const wrapper = mount(Comp)
    const input = wrapper.find('input')
    await input.setValue('abc')
    await nextTick()
    expect(input.element.value).toBe('ABC')
  })
})
