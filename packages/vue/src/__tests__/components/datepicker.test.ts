import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SgDatePicker from '../../components/ui/DatePicker.vue'

describe('DatePicker - functional fixes', () => {
  it('renders month-grid when picker=month with controlled open', () => {
    const w = mount(SgDatePicker, {
      props: { picker: 'month', open: true },
      attachTo: document.body,
    })
    expect(w.find('.sg-dp-month-grid').exists()).toBe(true)
    w.unmount()
  })

  it('renders year-grid when picker=year with controlled open', () => {
    const w = mount(SgDatePicker, {
      props: { picker: 'year', open: true },
      attachTo: document.body,
    })
    expect(w.find('.sg-dp-year-grid').exists()).toBe(true)
    w.unmount()
  })

  it('renders time-panel when showTime=true', () => {
    const w = mount(SgDatePicker, {
      props: { showTime: true, open: true },
      attachTo: document.body,
    })
    expect(w.find('.sg-dp-time-panel').exists()).toBe(true)
    expect(w.findAll('.sg-dp-time-col').length).toBeGreaterThan(0)
    w.unmount()
  })

  it('renders presets sidebar', () => {
    const w = mount(SgDatePicker, {
      props: {
        presets: [{ label: 'Today', value: new Date() }],
        open: true,
      },
      attachTo: document.body,
    })
    expect(w.find('.sg-dp-presets').exists()).toBe(true)
    expect(w.find('.sg-dp-preset-item').text()).toBe('Today')
    w.unmount()
  })

  it('has aria-label on navigation buttons', () => {
    const w = mount(SgDatePicker, { props: { open: true }, attachTo: document.body })
    const navBtns = w.findAll('.sg-dp-nav-btn')
    for (const btn of navBtns) {
      expect(btn.attributes('aria-label')).toBeTruthy()
      expect(btn.attributes('type')).toBe('button')
    }
    w.unmount()
  })

  it('renders calendar icon svg in suffix', () => {
    const w = mount(SgDatePicker)
    expect(w.find('.sg-datepicker-icon').exists()).toBe(true)
    w.unmount()
  })

  it('opens dropdown on trigger click', async () => {
    const w = mount(SgDatePicker, { attachTo: document.body })
    expect(w.find('.sg-dp-dropdown').exists()).toBe(false)
    await w.find('.sg-datepicker-input').trigger('click')
    expect(w.emitted('openChange')?.[0]).toEqual([true])
    w.unmount()
  })

  it('renders read-only span when inputReadOnly=true', () => {
    const w = mount(SgDatePicker, { props: { inputReadOnly: true } })
    expect(w.find('span.sg-datepicker-input-text').exists()).toBe(true)
    expect(w.find('input.sg-datepicker-input-text').exists()).toBe(false)
    w.unmount()
  })

  it('applies placement class to dropdown', () => {
    const w = mount(SgDatePicker, {
      props: { open: true, placement: 'topRight' },
      attachTo: document.body,
    })
    expect(w.find('.sg-dp-dropdown-topRight').exists()).toBe(true)
    w.unmount()
  })
})
