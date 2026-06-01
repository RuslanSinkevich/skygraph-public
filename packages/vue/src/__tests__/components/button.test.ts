import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { SgButton } from '../../components/Button'

describe('SgButton', () => {
  it('renders default classes', () => {
    const wrapper = mount(SgButton, { slots: { default: 'Click' } })
    const btn = wrapper.find('button')
    expect(btn.classes()).toContain('sg-button')
    expect(btn.classes()).toContain('sg-button-default')
    expect(btn.classes()).toContain('sg-button-middle')
    expect(btn.text()).toBe('Click')
  })

  it('applies type and size modifiers', () => {
    const wrapper = mount(SgButton, {
      props: { type: 'primary', size: 'large' },
      slots: { default: 'X' },
    })
    expect(wrapper.classes()).toContain('sg-button-primary')
    expect(wrapper.classes()).toContain('sg-button-large')
  })

  it('applies danger and block modifiers', () => {
    const wrapper = mount(SgButton, {
      props: { danger: true, block: true },
    })
    expect(wrapper.classes()).toContain('sg-button-danger')
    expect(wrapper.classes()).toContain('sg-button-block')
  })

  it('emits click event', async () => {
    const wrapper = mount(SgButton, { slots: { default: 'Go' } })
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeTruthy()
    expect(wrapper.emitted('click')!.length).toBe(1)
  })

  it('does not emit click when disabled', async () => {
    const wrapper = mount(SgButton, { props: { disabled: true } })
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeFalsy()
  })

  it('shows loading spinner and adds modifier', () => {
    const wrapper = mount(SgButton, {
      props: { loading: true },
      slots: { default: 'wait' },
    })
    expect(wrapper.classes()).toContain('sg-button-loading')
    expect(wrapper.find('.sg-spin').exists()).toBe(true)
  })

  it('forwards htmlType to the underlying button', () => {
    const wrapper = mount(SgButton, { props: { htmlType: 'submit' } })
    expect(wrapper.attributes('type')).toBe('submit')
  })
})
