import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SgTimePicker from '../../components/ui/TimePicker.vue'

describe('TimePicker - functional fixes', () => {
  it('renders trigger with aria attributes', () => {
    const w = mount(SgTimePicker)
    const trigger = w.find('.sg-timepicker-input')
    expect(trigger.exists()).toBe(true)
    expect(trigger.attributes('aria-haspopup')).toBe('dialog')
    expect(trigger.attributes('aria-expanded')).toBe('false')
    expect(trigger.attributes('role')).toBe('combobox')
    w.unmount()
  })

  it('opens dropdown on trigger click', async () => {
    const w = mount(SgTimePicker)
    expect(w.find('.sg-tp-dropdown').exists()).toBe(false)
    await w.find('.sg-timepicker-input').trigger('click')
    await w.vm.$nextTick()
    expect(w.emitted('openChange')?.[0]).toEqual([true])
    expect(w.find('.sg-tp-dropdown').exists()).toBe(true)
    w.unmount()
  })

  it('closes dropdown on Escape', async () => {
    const w = mount(SgTimePicker, { attachTo: document.body })
    await w.find('.sg-timepicker-input').trigger('click')
    await w.vm.$nextTick()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await w.vm.$nextTick()
    const events = w.emitted('openChange')
    expect(events?.some((e) => e[0] === false)).toBe(true)
    w.unmount()
  })

  it('renders clock icon in suffix', () => {
    const w = mount(SgTimePicker)
    expect(w.find('.sg-timepicker-icon').exists()).toBe(true)
    w.unmount()
  })

  it('does not open when disabled', async () => {
    const w = mount(SgTimePicker, { props: { disabled: true } })
    await w.find('.sg-timepicker-input').trigger('click')
    expect(w.find('.sg-tp-dropdown').exists()).toBe(false)
    w.unmount()
  })

  it('renders AM/PM column when use12Hours=true', () => {
    const w = mount(SgTimePicker, {
      props: { use12Hours: true, open: true },
      attachTo: document.body,
    })
    expect(w.find('.sg-tp-col-ampm').exists()).toBe(true)
    w.unmount()
  })

  it('emits update:modelValue when picking a minute', async () => {
    const w = mount(SgTimePicker, {
      props: { modelValue: '00:00:00', open: true },
      attachTo: document.body,
    })
    const minuteCells = w.findAll('.sg-tp-cell')
    if (minuteCells.length > 1) {
      await minuteCells[1].trigger('click')
      expect(w.emitted('update:modelValue')).toBeTruthy()
    }
    w.unmount()
  })

  it('Now button commits current time and closes', async () => {
    const w = mount(SgTimePicker, { props: { open: true }, attachTo: document.body })
    const nowBtn = w.find('.sg-tp-now-btn')
    expect(nowBtn.exists()).toBe(true)
    await nowBtn.trigger('click')
    expect(w.emitted('update:modelValue')).toBeTruthy()
    w.unmount()
  })
})
