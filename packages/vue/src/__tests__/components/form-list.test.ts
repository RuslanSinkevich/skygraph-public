import { describe, it, expect, vi } from 'vitest'
import { defineComponent, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { SgForm, SgField, SgFormList, SgFormProvider } from '../../components/complex/Form'
import SgInput from '../../components/ui/Input.vue'

describe('SgFormList', () => {
  it('throws when used outside <SgForm>', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(() =>
      mount(SgFormList, { props: { name: 'items' } }),
    ).toThrowError(/<SgFormList> must be used inside an <SgForm>/)
    spy.mockRestore()
  })

  it('exposes empty fields when name is unset', async () => {
    const Comp = defineComponent({
      components: { SgForm, SgFormList },
      template: `
        <SgForm :default-values="{}">
          <SgFormList name="items" v-slot="{ fields }">
            <span class="count">{{ fields.length }}</span>
          </SgFormList>
        </SgForm>
      `,
    })
    const wrapper = mount(Comp)
    await nextTick()
    expect(wrapper.find('.count').text()).toBe('0')
  })

  it('renders one slot per item in the array', async () => {
    const Comp = defineComponent({
      components: { SgForm, SgFormList },
      template: `
        <SgForm :default-values="{ tags: ['a','b','c'] }">
          <SgFormList name="tags" v-slot="{ fields }">
            <ul>
              <li v-for="f in fields" :key="f.key" class="tag-item">{{ f.index }}</li>
            </ul>
          </SgFormList>
        </SgForm>
      `,
    })
    const wrapper = mount(Comp)
    await nextTick()
    expect(wrapper.findAll('.tag-item').length).toBe(3)
  })

  it('operation.add appends a new field', async () => {
    let opRef: { add?: (...args: unknown[]) => unknown } = {}
    const Comp = defineComponent({
      components: { SgForm, SgFormList },
      setup() {
        return { capture: (op: { add?: (...args: unknown[]) => unknown }) => { opRef = op; return op } }
      },
      template: `
        <SgForm :default-values="{ tags: ['a'] }">
          <SgFormList name="tags" v-slot="{ fields, operation }">
            <span class="count">{{ fields.length }}</span>
            <span class="hidden">{{ capture(operation) ? '' : '' }}</span>
          </SgFormList>
        </SgForm>
      `,
    })
    const wrapper = mount(Comp)
    await nextTick()
    expect(wrapper.find('.count').text()).toBe('1')
    opRef.add?.('b')
    await nextTick()
    expect(wrapper.find('.count').text()).toBe('2')
  })

  it('operation.remove drops a field at index', async () => {
    let opRef: { remove?: (i: number) => unknown } = {}
    const Comp = defineComponent({
      components: { SgForm, SgFormList },
      setup() {
        return { capture: (op: { remove?: (i: number) => unknown }) => { opRef = op; return op } }
      },
      template: `
        <SgForm :default-values="{ tags: ['a','b','c'] }">
          <SgFormList name="tags" v-slot="{ fields, operation }">
            <span class="count">{{ fields.length }}</span>
            <span class="hidden">{{ capture(operation) ? '' : '' }}</span>
          </SgFormList>
        </SgForm>
      `,
    })
    const wrapper = mount(Comp)
    await nextTick()
    opRef.remove?.(1)
    await nextTick()
    expect(wrapper.find('.count').text()).toBe('2')
  })

  it('renders nested SgField inside FormList', async () => {
    const Comp = defineComponent({
      components: { SgForm, SgFormList, SgField, SgInput },
      methods: {
        toStr(v: unknown): string {
          return typeof v === 'string' ? v : ''
        },
      },
      template: `
        <SgForm :default-values="{ tags: [{ name: 'a' }, { name: 'b' }] }">
          <SgFormList name="tags" v-slot="{ fields }">
            <SgField v-for="f in fields" :key="f.key" :name="\`tags.\${f.index}.name\`" v-slot="{ value, onChange }">
              <SgInput :model-value="toStr(value)" @update:model-value="onChange" />
            </SgField>
          </SgFormList>
        </SgForm>
      `,
    })
    const wrapper = mount(Comp)
    await nextTick()
    expect(wrapper.findAll('input').length).toBe(2)
  })
})

describe('SgFormProvider', () => {
  it('renders children inside the provider context', () => {
    const Comp = defineComponent({
      components: { SgFormProvider },
      template: `
        <SgFormProvider>
          <div class="inside">child</div>
        </SgFormProvider>
      `,
    })
    const wrapper = mount(Comp)
    expect(wrapper.find('.inside').exists()).toBe(true)
  })

  it('emits form-finish when a named form submits successfully', async () => {
    const onFinish = vi.fn()
    const Comp = defineComponent({
      components: { SgFormProvider, SgForm },
      setup() {
        return { onFinish }
      },
      template: `
        <SgFormProvider @form-finish="onFinish">
          <SgForm name="login" :default-values="{ email: 'a@b.com' }">
            <button type="submit">go</button>
          </SgForm>
        </SgFormProvider>
      `,
    })
    const wrapper = mount(Comp)
    await wrapper.find('form').trigger('submit')
    await new Promise((r) => setTimeout(r, 10))
    expect(onFinish).toHaveBeenCalled()
    expect(onFinish.mock.calls[0][0]).toBe('login')
  })
})
