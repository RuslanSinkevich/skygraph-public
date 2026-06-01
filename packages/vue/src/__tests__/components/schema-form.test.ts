import { describe, it, expect, vi } from 'vitest'
import { defineComponent, nextTick } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { SgSchemaForm, SgAutoField, SgSubmitButton } from '../../components/complex/SchemaForm'
import { SgForm } from '../../components/complex/Form'
import {
  jsonSchemaToFields,
  jsonSchemaToRules,
  jsonSchemaToDefaults,
} from '../../adapters/jsonSchemaAdapter'

describe('jsonSchemaAdapter', () => {
  it('converts simple string properties to text fields', () => {
    const fields = jsonSchemaToFields({
      type: 'object',
      properties: { name: { type: 'string', title: 'Name' } },
    })
    expect(fields).toHaveLength(1)
    expect(fields[0].name).toBe('name')
    expect(fields[0].label).toBe('Name')
    expect(fields[0].type).toBe('string')
  })

  it('infers number type', () => {
    const fields = jsonSchemaToFields({
      type: 'object',
      properties: { age: { type: 'number' } },
    })
    expect(fields[0].type).toBe('number')
  })

  it('infers boolean type', () => {
    const fields = jsonSchemaToFields({
      type: 'object',
      properties: { active: { type: 'boolean' } },
    })
    expect(fields[0].type).toBe('boolean')
  })

  it('infers email format', () => {
    const fields = jsonSchemaToFields({
      type: 'object',
      properties: { mail: { type: 'string', format: 'email' } },
    })
    expect(fields[0].type).toBe('email')
  })

  it('builds enum options', () => {
    const fields = jsonSchemaToFields({
      type: 'object',
      properties: { color: { type: 'string', enum: ['red', 'blue'] } },
    })
    expect(fields[0].type).toBe('select')
    expect(fields[0].options?.length).toBe(2)
  })

  it('extracts required rules', () => {
    const rules = jsonSchemaToRules({
      type: 'object',
      properties: { email: { type: 'string', format: 'email' } },
      required: ['email'],
    })
    expect(rules.email.some((r) => 'required' in r && r.required === true)).toBe(true)
  })

  it('extracts minLength/maxLength rules', () => {
    const rules = jsonSchemaToRules({
      type: 'object',
      properties: { user: { type: 'string', minLength: 3, maxLength: 20 } },
    })
    expect(rules.user).toBeDefined()
    expect(rules.user.length).toBeGreaterThan(0)
  })

  it('returns default values', () => {
    const defaults = jsonSchemaToDefaults({
      type: 'object',
      properties: {
        name: { type: 'string', default: 'Bob' },
        age: { type: 'number', default: 30 },
      },
    })
    expect(defaults).toEqual({ name: 'Bob', age: 30 })
  })
})

describe('SgAutoField', () => {
  it('throws when used outside <SgForm>', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(() => mount(SgAutoField, { props: { name: 'x' } })).toThrowError(
      /<SgAutoField> must be used inside an <SgForm>/,
    )
    spy.mockRestore()
  })

  it('renders text input by default', () => {
    const Comp = defineComponent({
      components: { SgForm, SgAutoField },
      template: `
        <SgForm :default-values="{ name: '' }">
          <SgAutoField name="name" type="string" />
        </SgForm>
      `,
    })
    const wrapper = mount(Comp)
    expect(wrapper.find('input').exists()).toBe(true)
  })

  it('renders number input when type is number', () => {
    const Comp = defineComponent({
      components: { SgForm, SgAutoField },
      template: `
        <SgForm :default-values="{ age: 0 }">
          <SgAutoField name="age" type="number" />
        </SgForm>
      `,
    })
    const wrapper = mount(Comp)
    expect(wrapper.find('input[type=number]').exists()).toBe(true)
  })

  it('renders checkbox when type is boolean', () => {
    const Comp = defineComponent({
      components: { SgForm, SgAutoField },
      template: `
        <SgForm :default-values="{ on: false }">
          <SgAutoField name="on" type="boolean" />
        </SgForm>
      `,
    })
    const wrapper = mount(Comp)
    expect(wrapper.find('input[type=checkbox]').exists()).toBe(true)
  })

  it('renders select when options are provided', () => {
    const Comp = defineComponent({
      components: { SgForm, SgAutoField },
      template: `
        <SgForm :default-values="{ color: '' }">
          <SgAutoField name="color" type="select" :options="[{ value: 'red', label: 'Red' }]" />
        </SgForm>
      `,
    })
    const wrapper = mount(Comp)
    expect(wrapper.find('select').exists()).toBe(true)
  })

  it('renders radio buttons for radio type', () => {
    const Comp = defineComponent({
      components: { SgForm, SgAutoField },
      template: `
        <SgForm :default-values="{ pick: 'a' }">
          <SgAutoField name="pick" type="radio" :options="[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]" />
        </SgForm>
      `,
    })
    const wrapper = mount(Comp)
    expect(wrapper.findAll('input[type=radio]').length).toBe(2)
  })

  it('renders textarea for textarea type', () => {
    const Comp = defineComponent({
      components: { SgForm, SgAutoField },
      template: `
        <SgForm :default-values="{ bio: '' }">
          <SgAutoField name="bio" type="textarea" />
        </SgForm>
      `,
    })
    const wrapper = mount(Comp)
    expect(wrapper.find('textarea').exists()).toBe(true)
  })

  it('writes to form on input', async () => {
    const Comp = defineComponent({
      components: { SgForm, SgAutoField },
      template: `
        <SgForm :default-values="{ name: '' }">
          <SgAutoField name="name" type="string" />
        </SgForm>
      `,
    })
    const wrapper = mount(Comp)
    await wrapper.find('input').setValue('hello')
    await nextTick()
    expect(wrapper.find('input').element.value).toBe('hello')
  })
})

describe('SgSubmitButton', () => {
  it('renders submit button with default text', () => {
    const w = mount(SgSubmitButton)
    expect(w.find('button').exists()).toBe(true)
    expect(w.attributes('type')).toBe('submit')
    expect(w.text()).toContain('Submit')
  })

  it('renders custom slot content', () => {
    const w = mount(SgSubmitButton, { slots: { default: 'Save' } })
    expect(w.text()).toContain('Save')
  })

  it('disables button when disabled prop is true', () => {
    const w = mount(SgSubmitButton, { props: { disabled: true } })
    expect(w.attributes('disabled')).toBeDefined()
  })

  it('renders loading spinner when loading', () => {
    const w = mount(SgSubmitButton, { props: { loading: true } })
    expect(w.find('.sg-spin').exists()).toBe(true)
  })

  it('disables button when loading', () => {
    const w = mount(SgSubmitButton, { props: { loading: true } })
    expect(w.attributes('disabled')).toBeDefined()
  })
})

describe('SgSchemaForm', () => {
  const simpleSchema = {
    type: 'object' as const,
    properties: {
      name: { type: 'string', title: 'Name', default: 'Alice' },
      age: { type: 'number', title: 'Age', default: 25 },
    },
    required: ['name'],
  }

  it('renders fields from schema', () => {
    const w = mount(SgSchemaForm, { props: { schema: simpleSchema } })
    expect(w.findAll('.sg-field').length).toBe(2)
  })

  it('renders default submit button', () => {
    const w = mount(SgSchemaForm, { props: { schema: simpleSchema } })
    expect(w.find('button[type=submit]').exists()).toBe(true)
  })

  it('uses default values from schema', () => {
    const w = mount(SgSchemaForm, { props: { schema: simpleSchema } })
    const inputs = w.findAll('input')
    expect((inputs[0].element as HTMLInputElement).value).toBe('Alice')
  })

  it('emits submit on form submission', async () => {
    const w = mount(SgSchemaForm, { props: { schema: simpleSchema } })
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(w.emitted('submit')).toBeTruthy()
  })

  it('respects custom slot for submit area', () => {
    const w = mount(SgSchemaForm, {
      props: { schema: simpleSchema },
      slots: { default: '<button class="custom" type="submit">Save</button>' },
    })
    expect(w.find('.custom').exists()).toBe(true)
  })

  it('respects layout prop', () => {
    const w = mount(SgSchemaForm, { props: { schema: simpleSchema, layout: 'horizontal' } })
    expect(w.find('form').classes()).toContain('sg-form-horizontal')
  })

  it('passes disabled through to fields', () => {
    const w = mount(SgSchemaForm, { props: { schema: simpleSchema, disabled: true } })
    expect(w.find('form').classes()).toContain('sg-form-disabled')
  })
})
