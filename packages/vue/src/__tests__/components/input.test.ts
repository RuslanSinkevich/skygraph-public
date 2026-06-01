import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SgInput from '../../components/ui/Input.vue'

describe('SgInput', () => {
  it('renders sg-input* classes by default', () => {
    const wrapper = mount(SgInput)
    expect(wrapper.classes()).toContain('sg-input-wrapper')
    expect(wrapper.classes()).toContain('sg-input-wrapper-middle')
    const input = wrapper.find('input')
    expect(input.classes()).toContain('sg-input')
  })

  it('respects placeholder', () => {
    const wrapper = mount(SgInput, { props: { placeholder: 'Type…' } })
    expect(wrapper.find('input').attributes('placeholder')).toBe('Type…')
  })

  it('respects disabled / readonly attributes', () => {
    const w1 = mount(SgInput, { props: { disabled: true } })
    expect(w1.find('input').attributes('disabled')).toBeDefined()
    const w2 = mount(SgInput, { props: { readOnly: true } })
    expect(w2.find('input').attributes('readonly')).toBeDefined()
    expect(w2.classes()).toContain('sg-input-wrapper-readonly')
  })

  it('v-model emits update:modelValue on input', async () => {
    const wrapper = mount(SgInput, { props: { modelValue: '' } })
    const input = wrapper.find('input')
    await input.setValue('hello')
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['hello'])
  })

  it('renders status modifier class', () => {
    const wrapper = mount(SgInput, { props: { status: 'error' } })
    expect(wrapper.classes()).toContain('sg-input-wrapper-status-error')
    expect(wrapper.find('input').classes()).toContain('sg-input-status-error')
  })

  it('shows clear button when allowClear and value is non-empty', async () => {
    const wrapper = mount(SgInput, {
      props: { allowClear: true, modelValue: 'foo' },
    })
    const clear = wrapper.find('.sg-input-clear')
    expect(clear.exists()).toBe(true)
    await clear.trigger('click')
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([''])
    expect(wrapper.emitted('clear')).toBeTruthy()
  })
})
