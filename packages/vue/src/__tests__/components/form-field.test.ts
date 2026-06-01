import { describe, it, expect, vi } from 'vitest'
import { defineComponent, nextTick } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { SgForm, SgField } from '../../components/complex/Form'
import SgInput from '../../components/ui/Input.vue'

describe('SgForm + SgField integration', () => {
  it('renders a form with sg-form classes', () => {
    const wrapper = mount(SgForm, {
      slots: { default: '<div />' },
      props: { defaultValues: {} },
    })
    expect(wrapper.find('form').classes()).toContain('sg-form')
    expect(wrapper.find('form').classes()).toContain('sg-form-vertical')
  })

  it('SgField throws when used outside SgForm', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(() =>
      mount(SgField, { props: { name: 'x' } }),
    ).toThrowError(/<SgField> must be used inside an <SgForm>/)
    spy.mockRestore()
  })

  it('SgField renders label and applies sg-field classes', () => {
    const Comp = defineComponent({
      components: { SgForm, SgField },
      template: `
        <SgForm :default-values="{ name: '' }">
          <SgField name="name" label="Name" />
        </SgForm>
      `,
    })
    const wrapper = mount(Comp)
    expect(wrapper.find('.sg-field').exists()).toBe(true)
    expect(wrapper.find('.sg-field-label').text()).toContain('Name')
  })

  it('SgField slot exposes value / onChange / errors', async () => {
    const Comp = defineComponent({
      components: { SgForm, SgField, SgInput },
      template: `
        <SgForm :default-values="{ name: '' }">
          <SgField
            name="name"
            label="Name"
            :rules="[{ required: true }]"
            v-slot="{ value, onChange, errors }"
          >
            <SgInput :model-value="value || ''" @update:model-value="onChange" />
            <span class="error-len">{{ errors.length }}</span>
          </SgField>
        </SgForm>
      `,
    })
    const wrapper = mount(Comp)
    await nextTick()
    expect(wrapper.find('input').exists()).toBe(true)
  })

  it('emits valuesChange when a registered field is updated', async () => {
    const onValuesChange = vi.fn()
    const Comp = defineComponent({
      components: { SgForm, SgField, SgInput },
      setup() {
        return { onValuesChange }
      },
      template: `
        <SgForm
          :default-values="{ name: '' }"
          @values-change="onValuesChange"
        >
          <SgField name="name" v-slot="{ value, onChange }">
            <SgInput :model-value="value || ''" @update:model-value="onChange" />
          </SgField>
        </SgForm>
      `,
    })
    const wrapper = mount(Comp)
    await nextTick()
    const input = wrapper.find('input')
    await input.setValue('Ann')
    await nextTick()
    expect(onValuesChange).toHaveBeenCalled()
  })

  it('submit triggers validation and emits submit event', async () => {
    const onSubmit = vi.fn()
    const Comp = defineComponent({
      components: { SgForm, SgField, SgInput },
      setup() {
        return { onSubmit }
      },
      template: `
        <SgForm
          :default-values="{ email: '' }"
          @submit="onSubmit"
        >
          <SgField
            name="email"
            :rules="[{ required: true }, { type: 'email' }]"
            v-slot="{ value, onChange }"
          >
            <SgInput :model-value="value || ''" @update:model-value="onChange" />
          </SgField>
          <button type="submit">go</button>
        </SgForm>
      `,
    })
    const wrapper = mount(Comp)
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(onSubmit).toHaveBeenCalled()
    const payload = onSubmit.mock.calls[0][0]
    expect(payload.valid).toBe(false)
  })

  it('valid email passes validation', async () => {
    const onSubmit = vi.fn()
    const Comp = defineComponent({
      components: { SgForm, SgField, SgInput },
      setup() {
        return { onSubmit }
      },
      template: `
        <SgForm
          :default-values="{ email: 'foo@bar.com' }"
          @submit="onSubmit"
        >
          <SgField
            name="email"
            :rules="[{ required: true }, { type: 'email' }]"
            v-slot="{ value, onChange }"
          >
            <SgInput :model-value="value || ''" @update:model-value="onChange" />
          </SgField>
        </SgForm>
      `,
    })
    const wrapper = mount(Comp)
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(onSubmit).toHaveBeenCalled()
    const payload = onSubmit.mock.calls[0][0]
    expect(payload.valid).toBe(true)
  })

  it('SgField shows error message when rule fails after submit', async () => {
    const Comp = defineComponent({
      components: { SgForm, SgField, SgInput },
      template: `
        <SgForm :default-values="{ email: '' }">
          <SgField
            name="email"
            :rules="[{ required: true, message: 'required!' }]"
            v-slot="{ value, onChange }"
          >
            <SgInput :model-value="value || ''" @update:model-value="onChange" />
          </SgField>
        </SgForm>
      `,
    })
    const wrapper = mount(Comp)
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    await nextTick()
    expect(wrapper.find('.sg-field-error').exists()).toBe(true)
    expect(wrapper.text()).toContain('required!')
  })
})
