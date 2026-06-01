import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SgColorPicker from '../../components/ui/ColorPicker.vue'

describe('ColorPicker - functional fixes', () => {
  it('renders trigger with aria-haspopup and aria-expanded', () => {
    const w = mount(SgColorPicker)
    const trigger = w.find('.sg-colorpicker-trigger')
    expect(trigger.exists()).toBe(true)
    expect(trigger.attributes('aria-haspopup')).toBe('dialog')
    expect(trigger.attributes('aria-expanded')).toBe('false')
    expect(trigger.attributes('type')).toBe('button')
    w.unmount()
  })

  it('opens dropdown on trigger click and renders saturation/hue panels', async () => {
    const w = mount(SgColorPicker)
    await w.find('.sg-colorpicker-trigger').trigger('click')
    await w.vm.$nextTick()
    expect(w.emitted('openChange')?.[0]).toEqual([true])
    expect(w.find('.sg-colorpicker-dropdown').exists()).toBe(true)
    expect(w.find('.sg-colorpicker-saturation').exists()).toBe(true)
    expect(w.find('.sg-colorpicker-hue').exists()).toBe(true)
    expect(w.find('.sg-colorpicker-input').exists()).toBe(true)
    w.unmount()
  })

  it('renders dropdown when controlled open=true', () => {
    const w = mount(SgColorPicker, { props: { open: true }, attachTo: document.body })
    expect(w.find('.sg-colorpicker-dropdown').exists()).toBe(true)
    w.unmount()
  })

  it('renders preset groups', () => {
    const w = mount(SgColorPicker, {
      props: {
        open: true,
        presets: [{ label: 'Reds', colors: ['#ff0000', '#ff4d4f'] }],
      },
      attachTo: document.body,
    })
    expect(w.find('.sg-colorpicker-preset-group').exists()).toBe(true)
    expect(w.findAll('.sg-colorpicker-preset-color').length).toBe(2)
    w.unmount()
  })

  it('emits change when preset is clicked', async () => {
    const w = mount(SgColorPicker, {
      props: {
        open: true,
        presets: [{ label: 'Reds', colors: ['#ff0000'] }],
      },
      attachTo: document.body,
    })
    await w.find('.sg-colorpicker-preset-color').trigger('click')
    const updates = w.emitted('update:modelValue')
    expect(updates).toBeTruthy()
    expect((updates![0] as string[])[0]).toBe('#ff0000')
    w.unmount()
  })

  it('does not open when disabled', async () => {
    const w = mount(SgColorPicker, { props: { disabled: true }, attachTo: document.body })
    await w.find('.sg-colorpicker-trigger').trigger('click')
    expect(w.find('.sg-colorpicker-dropdown').exists()).toBe(false)
    w.unmount()
  })

  it('shows formatted text when showText=true', () => {
    const w = mount(SgColorPicker, { props: { defaultValue: '#1677ff', showText: true } })
    expect(w.find('.sg-colorpicker-text').text()).toBe('#1677ff')
    w.unmount()
  })

  it('formats as rgb when format=rgb', () => {
    const w = mount(SgColorPicker, {
      props: { defaultValue: '#1677ff', showText: true, format: 'rgb' },
    })
    expect(w.find('.sg-colorpicker-text').text()).toBe('rgb(22, 119, 255)')
    w.unmount()
  })

  it('closes dropdown on Escape', async () => {
    const w = mount(SgColorPicker, { attachTo: document.body })
    await w.find('.sg-colorpicker-trigger').trigger('click')
    await w.vm.$nextTick()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await w.vm.$nextTick()
    const events = w.emitted('openChange')
    expect(events?.some((e) => e[0] === false)).toBe(true)
    w.unmount()
  })
})
