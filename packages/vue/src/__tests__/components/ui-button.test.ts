import { describe, it, expect } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { SgButton, SgConfigProvider } from '../../components/ui'

describe('SgButton (ui)', () => {
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

  it('does not emit click when loading', async () => {
    const wrapper = mount(SgButton, { props: { loading: true } })
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

  it('exposes aria-disabled and aria-busy', () => {
    const wrapper = mount(SgButton, { props: { loading: true } })
    expect(wrapper.attributes('aria-disabled')).toBe('true')
    expect(wrapper.attributes('aria-busy')).toBe('true')
  })

  it('renders icon slot before content', () => {
    const wrapper = mount(SgButton, {
      slots: {
        default: 'Save',
        icon: '<i class="ico" />',
      },
    })
    expect(wrapper.find('i.ico').exists()).toBe(true)
  })

  it('inherits size from ConfigProvider', () => {
    const Comp = defineComponent({
      components: { SgConfigProvider, SgButton },
      template: `
        <SgConfigProvider size="large">
          <SgButton>x</SgButton>
        </SgConfigProvider>
      `,
    })
    const wrapper = mount(Comp)
    expect(wrapper.find('button').classes()).toContain('sg-button-large')
  })

  it('inherits disabled from ConfigProvider', async () => {
    const Comp = defineComponent({
      components: { SgConfigProvider, SgButton },
      template: `
        <SgConfigProvider :disabled="true">
          <SgButton class="b">x</SgButton>
        </SgConfigProvider>
      `,
    })
    const wrapper = mount(Comp)
    const btn = wrapper.find('.b')
    expect(btn.attributes('disabled')).toBeDefined()
  })

  it('local size prop overrides config size', () => {
    const Comp = defineComponent({
      components: { SgConfigProvider, SgButton },
      template: `
        <SgConfigProvider size="large">
          <SgButton size="small">x</SgButton>
        </SgConfigProvider>
      `,
    })
    const wrapper = mount(Comp)
    expect(wrapper.find('button').classes()).toContain('sg-button-small')
  })

  it('unstyled drops sg-button class', () => {
    const wrapper = mount(SgButton, {
      props: { unstyled: true },
      slots: { default: 'x' },
    })
    expect(wrapper.classes()).not.toContain('sg-button')
  })
})
