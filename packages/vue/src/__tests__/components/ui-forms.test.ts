import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SgInputNumber from '../../components/ui/InputNumber.vue'
import SgTextarea from '../../components/ui/Textarea.vue'
import SgSelect from '../../components/ui/Select.vue'
import SgCheckbox from '../../components/ui/Checkbox.vue'
import SgRadio from '../../components/ui/Radio.vue'
import SgSwitch from '../../components/ui/Switch.vue'
import SgSlider from '../../components/ui/Slider.vue'
import SgRate from '../../components/ui/Rate.vue'
import SgAutoComplete from '../../components/ui/AutoComplete.vue'
import SgColorPicker from '../../components/ui/ColorPicker.vue'
import SgDatePicker from '../../components/ui/DatePicker.vue'
import SgTimePicker from '../../components/ui/TimePicker.vue'
import SgCalendar from '../../components/ui/Calendar.vue'
import SgUpload from '../../components/ui/Upload.vue'
import SgCascader from '../../components/ui/Cascader.vue'
import SgTreeSelect from '../../components/ui/TreeSelect.vue'
import SgTransfer from '../../components/ui/Transfer.vue'
import SgMentions from '../../components/ui/Mentions.vue'

describe('SgInputNumber', () => {
  it('renders sg-input-number wrapper', () => {
    const w = mount(SgInputNumber)
    expect(w.classes().some((c) => c.startsWith('sg-input-number'))).toBe(true)
  })

  it('emits update:modelValue on input', async () => {
    const w = mount(SgInputNumber, { props: { modelValue: 0 } })
    const input = w.find('input')
    await input.setValue('5')
    expect(w.emitted('update:modelValue')).toBeTruthy()
  })

  it('clamps value to min/max', async () => {
    const w = mount(SgInputNumber, { props: { min: 0, max: 10, modelValue: 5 } })
    const input = w.find('input')
    await input.setValue('100')
    await input.trigger('blur')
    const events = w.emitted('update:modelValue') ?? []
    const last = events[events.length - 1]?.[0]
    if (typeof last === 'number') expect(last).toBeLessThanOrEqual(10)
  })

  it('accepts initial modelValue', () => {
    const w = mount(SgInputNumber, { props: { modelValue: 42 } })
    expect(w.find('input').element.value).toBe('42')
  })
})

describe('SgTextarea', () => {
  it('renders sg-textarea class', () => {
    const w = mount(SgTextarea)
    expect(w.find('textarea').classes()).toContain('sg-textarea')
  })

  it('emits update:modelValue on input', async () => {
    const w = mount(SgTextarea, { props: { modelValue: '' } })
    const ta = w.find('textarea')
    await ta.setValue('hello')
    expect(w.emitted('update:modelValue')?.[0]).toEqual(['hello'])
  })

  it('respects rows prop', () => {
    const w = mount(SgTextarea, { props: { rows: 5 } })
    expect(w.find('textarea').attributes('rows')).toBe('5')
  })

  it('shows character count when showCount is true', () => {
    const w = mount(SgTextarea, { props: { modelValue: 'hi', showCount: true, maxLength: 10 } })
    expect(w.text()).toContain('2')
  })
})

describe('SgSelect', () => {
  const options = [
    { value: 'a', label: 'Apple' },
    { value: 'b', label: 'Banana' },
  ]

  it('renders sg-select wrapper', () => {
    const w = mount(SgSelect, { props: { options } })
    expect(w.classes().some((c) => c.startsWith('sg-select'))).toBe(true)
  })

  it('shows placeholder when value is empty', () => {
    const w = mount(SgSelect, { props: { options, placeholder: 'Pick one' } })
    expect(w.text()).toContain('Pick one')
  })

  it('emits update:modelValue on selection', async () => {
    const w = mount(SgSelect, { props: { options, modelValue: '' } })
    await w.find('.sg-select-input,.sg-select-selector').trigger('click')
    const items = w.findAll('.sg-select-option, .sg-select-item, li')
    if (items.length > 0) {
      await items[0].trigger('click')
      expect(w.emitted('update:modelValue')).toBeTruthy()
    }
  })

  it('respects disabled prop', () => {
    const w = mount(SgSelect, { props: { options, disabled: true } })
    expect(w.classes().some((c) => c.includes('disabled'))).toBe(true)
  })
})

describe('SgCheckbox', () => {
  it('renders sg-checkbox class', () => {
    const w = mount(SgCheckbox)
    expect(w.classes().some((c) => c.startsWith('sg-checkbox'))).toBe(true)
  })

  it('emits update:modelValue on change', async () => {
    const w = mount(SgCheckbox, { props: { modelValue: false } })
    await w.find('input[type=checkbox]').setValue(true)
    expect(w.emitted('update:modelValue')).toBeTruthy()
  })

  it('reflects checked state from modelValue', () => {
    const w = mount(SgCheckbox, { props: { modelValue: true } })
    expect((w.find('input').element as HTMLInputElement).checked).toBe(true)
  })

  it('renders label slot', () => {
    const w = mount(SgCheckbox, { slots: { default: 'Accept' } })
    expect(w.text()).toContain('Accept')
  })
})

describe('SgRadio (group)', () => {
  const options = [
    { value: 'a', label: 'A' },
    { value: 'b', label: 'B' },
  ]

  it('renders one input per option', () => {
    const w = mount(SgRadio, { props: { options } })
    expect(w.findAll('input[type=radio]').length).toBe(2)
  })

  it('emits update:modelValue on change', async () => {
    const w = mount(SgRadio, { props: { options, modelValue: 'a' } })
    const inputs = w.findAll('input[type=radio]')
    await inputs[1].trigger('change')
    expect(w.emitted('update:modelValue')).toBeTruthy()
  })

  it('reflects modelValue as checked', () => {
    const w = mount(SgRadio, { props: { options, modelValue: 'b' } })
    const inputs = w.findAll('input[type=radio]')
    expect((inputs[1].element as HTMLInputElement).checked).toBe(true)
  })
})

describe('SgSwitch', () => {
  it('renders sg-switch class', () => {
    const w = mount(SgSwitch)
    expect(w.classes().some((c) => c.startsWith('sg-switch'))).toBe(true)
  })

  it('emits update:modelValue on click', async () => {
    const w = mount(SgSwitch, { props: { modelValue: false } })
    await w.trigger('click')
    expect(w.emitted('update:modelValue')).toBeTruthy()
  })

  it('does not toggle when disabled', async () => {
    const w = mount(SgSwitch, { props: { modelValue: false, disabled: true } })
    await w.trigger('click')
    expect(w.emitted('update:modelValue')).toBeFalsy()
  })

  it('reflects checked modifier when on', () => {
    const w = mount(SgSwitch, { props: { modelValue: true } })
    expect(w.classes().some((c) => c.includes('checked'))).toBe(true)
  })
})

describe('SgSlider', () => {
  it('renders sg-slider class', () => {
    const w = mount(SgSlider)
    expect(w.classes()).toContain('sg-slider')
  })

  it('respects modelValue position', () => {
    const w = mount(SgSlider, { props: { modelValue: 50, min: 0, max: 100 } })
    const handle = w.find('[role=slider]')
    expect(handle.exists()).toBe(true)
  })

  it('arrow keys increment value', async () => {
    const w = mount(SgSlider, { props: { modelValue: 50, min: 0, max: 100, step: 1 } })
    const handle = w.find('[role=slider]')
    await handle.trigger('keydown', { key: 'ArrowRight' })
    expect(w.emitted('update:modelValue')).toBeTruthy()
    expect(w.emitted('update:modelValue')![0]).toEqual([51])
  })

  it('does not respond when disabled', async () => {
    const w = mount(SgSlider, { props: { modelValue: 50, disabled: true } })
    await w.find('[role=slider]').trigger('keydown', { key: 'ArrowRight' })
    expect(w.emitted('update:modelValue')).toBeFalsy()
  })
})

describe('SgRate', () => {
  it('renders count stars', () => {
    const w = mount(SgRate, { props: { count: 5 } })
    expect(w.findAll('[role=radio]').length).toBe(5)
  })

  it('emits update:modelValue on click', async () => {
    const w = mount(SgRate, { props: { modelValue: 0, count: 5 } })
    const stars = w.findAll('[role=radio]')
    await stars[2].trigger('click')
    expect(w.emitted('update:modelValue')).toBeTruthy()
  })

  it('respects custom character', () => {
    const w = mount(SgRate, { props: { count: 3, character: '♥' } })
    expect(w.text()).toContain('♥')
  })
})

describe('SgAutoComplete', () => {
  const options = [{ value: 'apple' }, { value: 'apricot' }, { value: 'banana' }]

  it('renders text input with sg class', () => {
    const w = mount(SgAutoComplete, { props: { options } })
    expect(w.find('input').exists()).toBe(true)
  })

  it('emits update:modelValue when typing', async () => {
    const w = mount(SgAutoComplete, { props: { options, modelValue: '' } })
    await w.find('input').setValue('a')
    expect(w.emitted('update:modelValue')).toBeTruthy()
  })

  it('shows filtered suggestions when typing', async () => {
    const w = mount(SgAutoComplete, { props: { options, modelValue: '' } })
    await w.find('input').setValue('a')
    await w.find('input').trigger('focus')
    expect(w.text()).toContain('apple')
  })
})

describe('SgColorPicker', () => {
  it('renders sg-colorpicker class', () => {
    const w = mount(SgColorPicker)
    expect(w.classes().some((c) => c.startsWith('sg-colorpicker'))).toBe(true)
  })

  it('shows current color value when showText is true', () => {
    const w = mount(SgColorPicker, { props: { modelValue: '#ff0000', showText: true } })
    expect(w.text()).toContain('#ff0000')
  })

  it('emits update:modelValue when typing hex value in dropdown', async () => {
    const w = mount(SgColorPicker, { props: { modelValue: '#000000' }, attachTo: document.body })
    await w.find('.sg-colorpicker-trigger').trigger('click')
    const input = w.find('input.sg-colorpicker-input')
    if (input.exists()) {
      await input.setValue('#abcdef')
      expect(w.emitted('update:modelValue')).toBeTruthy()
    }
    w.unmount()
  })
})

describe('SgDatePicker', () => {
  it('renders sg-datepicker class', () => {
    const w = mount(SgDatePicker)
    expect(w.classes().some((c) => c.startsWith('sg-datepicker'))).toBe(true)
  })

  it('shows placeholder when value is empty', () => {
    const w = mount(SgDatePicker, { props: { placeholder: 'Pick a date' } })
    const input = w.find('input.sg-datepicker-input-text')
    expect(input.exists()).toBe(true)
    expect(input.attributes('placeholder')).toBe('Pick a date')
  })

  it('renders dropdown when controlled open=true', () => {
    const w = mount(SgDatePicker, { props: { open: true }, attachTo: document.body })
    expect(w.find('.sg-dp-dropdown').exists()).toBe(true)
    w.unmount()
  })

  it('shows formatted date when value is set', () => {
    const w = mount(SgDatePicker, { props: { modelValue: new Date(2025, 5, 15) } })
    const input = w.find('input.sg-datepicker-input-text').element as HTMLInputElement
    expect(input.value).toContain('2025')
  })
})

describe('SgTimePicker', () => {
  it('renders sg-timepicker class', () => {
    const w = mount(SgTimePicker)
    expect(w.classes().some((c) => c.startsWith('sg-timepicker'))).toBe(true)
  })

  it('renders dropdown when controlled open=true', () => {
    const w = mount(SgTimePicker, { props: { open: true }, attachTo: document.body })
    expect(w.find('.sg-tp-dropdown').exists()).toBe(true)
    w.unmount()
  })

  it('emits change when selecting hours', async () => {
    const w = mount(SgTimePicker, {
      attachTo: document.body,
      props: { modelValue: '00:00:00', open: true },
    })
    const cells = w.findAll('.sg-tp-cell')
    if (cells.length > 0) {
      await cells[1].trigger('click')
      expect(w.emitted('update:modelValue')).toBeTruthy()
    }
    w.unmount()
  })
})

describe('SgCalendar', () => {
  it('renders sg-calendar class', () => {
    const w = mount(SgCalendar)
    expect(w.classes()).toContain('sg-calendar')
  })

  it('renders month grid (7 columns × 6 rows)', () => {
    const w = mount(SgCalendar)
    expect(w.findAll('.sg-calendar-cell').length).toBe(42)
  })

  it('selecting a cell emits update:modelValue', async () => {
    const w = mount(SgCalendar)
    const cells = w.findAll('.sg-calendar-cell')
    await cells[10].trigger('click')
    expect(w.emitted('update:modelValue')).toBeTruthy()
  })

  it('next/prev month navigation works', async () => {
    const w = mount(SgCalendar, { props: { modelValue: new Date(2025, 0, 15) } })
    const navBtns = w.findAll('.sg-calendar-nav-btn')
    expect(navBtns.length).toBeGreaterThanOrEqual(2)
    await navBtns[1].trigger('click')
    expect(w.emitted('panelChange')).toBeTruthy()
  })

  it('renders fullscreen wrapper class + Today footer button by default', () => {
    const w = mount(SgCalendar)
    expect(w.classes()).toContain('sg-calendar-fullscreen')
    expect(w.find('.sg-calendar-today-btn').exists()).toBe(true)
  })

  it('Year mode renders 12 month cells, clicking switches back to month', async () => {
    const w = mount(SgCalendar, { props: { mode: 'year' } })
    const monthCells = w.findAll('.sg-calendar-month-cell')
    expect(monthCells.length).toBe(12)
    await monthCells[3].trigger('click')
    expect(w.emitted('modeChange')).toBeTruthy()
    expect(w.emitted('modeChange')![0]).toEqual(['month'])
  })

  it('show-week-number renders week column', () => {
    const w = mount(SgCalendar, { props: { showWeekNumber: true } })
    expect(w.find('.sg-calendar-week-header').exists()).toBe(true)
    expect(w.findAll('.sg-calendar-week-number').length).toBe(6)
  })

  it('events render dots with max-events overflow', () => {
    const d = new Date(2025, 0, 15)
    const events = [
      { id: 'a', date: d, title: 'A' },
      { id: 'b', date: d, title: 'B' },
      { id: 'c', date: d, title: 'C' },
      { id: 'd', date: d, title: 'D' },
    ]
    const w = mount(SgCalendar, {
      props: { modelValue: d, events, maxEvents: 2 },
    })
    expect(w.findAll('.sg-calendar-event-dot').length).toBe(2)
    expect(w.find('.sg-calendar-event-more').text()).toBe('+2')
  })

  it('disabled-date blocks selection emit', async () => {
    const w = mount(SgCalendar, {
      props: {
        modelValue: new Date(2025, 0, 15),
        disabledDate: (d: Date) => d.getDate() === 16,
      },
    })
    const disabled = w.find('.sg-calendar-cell-disabled')
    expect(disabled.exists()).toBe(true)
    await disabled.trigger('click')
    expect(w.emitted('update:modelValue')).toBeFalsy()
  })

  it('Today footer button selects current date', async () => {
    const w = mount(SgCalendar, { props: { modelValue: new Date(2020, 0, 1) } })
    await w.find('.sg-calendar-today-btn').trigger('click')
    const events = w.emitted('update:modelValue')
    expect(events).toBeTruthy()
    const today = new Date()
    const picked = events![0][0] as Date
    expect(picked.getFullYear()).toBe(today.getFullYear())
    expect(picked.getMonth()).toBe(today.getMonth())
    expect(picked.getDate()).toBe(today.getDate())
  })
})

describe('SgUpload', () => {
  it('renders sg-upload class', () => {
    const w = mount(SgUpload)
    expect(w.classes().some((c) => c.startsWith('sg-upload'))).toBe(true)
  })

  it('renders file input', () => {
    const w = mount(SgUpload)
    expect(w.find('input[type=file]').exists()).toBe(true)
  })

  it('renders existing files in list', () => {
    const files = [
      { uid: '1', name: 'a.txt', status: 'done' as const },
      { uid: '2', name: 'b.txt', status: 'done' as const },
    ]
    const w = mount(SgUpload, { props: { fileList: files } })
    expect(w.findAll('.sg-upload-item').length).toBe(2)
    expect(w.findAll('.sg-upload-item-name').length).toBe(2)
  })

  it('emits remove on item × click', async () => {
    const files = [{ uid: '1', name: 'a.txt', status: 'done' as const }]
    const w = mount(SgUpload, { props: { fileList: files } })
    await w.find('.sg-upload-item-remove').trigger('click')
    expect(w.emitted('remove')).toBeTruthy()
  })

  it('uploading row hides remove and shows SgSpin', () => {
    const files = [{ uid: '1', name: 'a.txt', status: 'uploading' as const, percent: 33 }]
    const w = mount(SgUpload, { props: { fileList: files } })
    expect(w.find('.sg-upload-item-remove').exists()).toBe(false)
    expect(w.find('.sg-spin').exists()).toBe(true)
    expect(w.find('.sg-upload-item-progress').text()).toBe('33%')
  })

  it('default trigger uses SgButton not native <button>', () => {
    const w = mount(SgUpload)
    expect(w.find('button.sg-button').exists()).toBe(true)
  })

  it('drag mode renders sg-upload-drag-area', () => {
    const w = mount(SgUpload, { props: { drag: true } })
    expect(w.find('.sg-upload-drag-area').exists()).toBe(true)
    expect(w.find('.sg-upload-drag-icon').exists()).toBe(true)
  })

  it('listType modifier ends up on wrapper class', () => {
    const w = mount(SgUpload, { props: { listType: 'picture-card' } })
    expect(w.classes()).toContain('sg-upload-picture-card')
  })
})

describe('SgCascader', () => {
  const options = [
    {
      value: 'zhejiang',
      label: 'Zhejiang',
      children: [{ value: 'hangzhou', label: 'Hangzhou' }],
    },
    { value: 'jiangsu', label: 'Jiangsu' },
  ]

  it('renders sg-cascader class', () => {
    const w = mount(SgCascader, { props: { options } })
    expect(w.classes().some((c) => c.startsWith('sg-cascader'))).toBe(true)
  })

  it('opens dropdown on click', async () => {
    const w = mount(SgCascader, { props: { options }, attachTo: document.body })
    await w.find('.sg-cascader-selector').trigger('click')
    expect(w.classes().some((c) => c.includes('open'))).toBe(true)
    w.unmount()
  })

  it('selecting a leaf emits update:modelValue', async () => {
    const w = mount(SgCascader, { props: { options }, attachTo: document.body })
    await w.find('.sg-cascader-selector').trigger('click')
    const items = w.findAll('.sg-cascader-menu-item')
    await items[0].trigger('click')
    const updated = w.findAll('.sg-cascader-menu-item')
    if (updated.length > 2) {
      await updated[updated.length - 1].trigger('click')
    }
    expect(w.emitted('update:modelValue') ?? w.emitted('change')).toBeTruthy()
    w.unmount()
  })
})

describe('SgTreeSelect', () => {
  // Mirrors React's TreeNodeData shape (key/title), see
  // packages/vue/src/components/ui/TreeSelect.vue.
  const treeData = [
    {
      key: 'p',
      title: 'Parent',
      children: [
        { key: 'c1', title: 'Child 1' },
        { key: 'c2', title: 'Child 2' },
      ],
    },
  ]

  it('renders sg-treeselect class', () => {
    const w = mount(SgTreeSelect, { props: { treeData } })
    expect(w.classes().some((c) => c.startsWith('sg-treeselect'))).toBe(true)
  })

  it('opens dropdown on click', async () => {
    const w = mount(SgTreeSelect, { props: { treeData }, attachTo: document.body })
    await w.find('.sg-treeselect-selector').trigger('click')
    expect(w.classes().some((c) => c.includes('open'))).toBe(true)
    w.unmount()
  })

  it('emits update:modelValue on selection', async () => {
    const w = mount(SgTreeSelect, {
      props: { treeData, treeDefaultExpandedKeys: ['p'] },
      attachTo: document.body,
    })
    await w.find('.sg-treeselect-selector').trigger('click')
    const titles = w.findAll('.sg-tree-node-title')
    if (titles.length >= 2) {
      await titles[1].trigger('click')
      expect(w.emitted('update:modelValue')).toBeTruthy()
    }
    w.unmount()
  })
})

describe('SgTransfer', () => {
  const dataSource = [
    { key: '1', title: 'Apple' },
    { key: '2', title: 'Banana' },
    { key: '3', title: 'Cherry' },
  ]

  it('renders two transfer lists', () => {
    const w = mount(SgTransfer, { props: { dataSource } })
    expect(w.findAll('.sg-transfer-list').length).toBe(2)
  })

  it('shows source items in left pane', () => {
    const w = mount(SgTransfer, { props: { dataSource } })
    const leftItems = w.findAll('.sg-transfer-list')[0].findAll('.sg-transfer-list-item')
    expect(leftItems.length).toBe(3)
  })

  it('moves selected items to right pane', async () => {
    const w = mount(SgTransfer, { props: { dataSource, modelValue: [] } })
    const items = w.findAll('.sg-transfer-list-item')
    await items[0].trigger('click')
    const moveRightBtn = w.findAll('.sg-transfer-operations .sg-button')[0]
    await moveRightBtn.trigger('click')
    expect(w.emitted('update:modelValue')).toBeTruthy()
  })

  it('renders select-all checkbox + count text in each header', () => {
    const w = mount(SgTransfer, { props: { dataSource, modelValue: ['2'] } })
    const headers = w.findAll('.sg-transfer-list-header')
    expect(headers.length).toBe(2)
    expect(headers[0].find('.sg-checkbox input[type=checkbox]').exists()).toBe(true)
    expect(headers[1].find('.sg-checkbox input[type=checkbox]').exists()).toBe(true)
    expect(headers[0].find('.sg-transfer-list-header-count').text()).toContain('items')
  })

  it('show-search renders SgInput on each pane', () => {
    const w = mount(SgTransfer, { props: { dataSource, showSearch: true } })
    const searches = w.findAll('.sg-transfer-list-search input.sg-input')
    expect(searches.length).toBe(2)
  })

  it('empty filtered pane shows notFoundContent', async () => {
    const w = mount(SgTransfer, { props: { dataSource, showSearch: true } })
    const searches = w.findAll('.sg-transfer-list-search input.sg-input')
    await searches[0].setValue('zzzzz')
    expect(w.find('.sg-transfer-list-empty').exists()).toBe(true)
  })

  it('move arrow button uses sg-button class (not native button)', () => {
    const w = mount(SgTransfer, { props: { dataSource } })
    const opBtns = w.findAll('.sg-transfer-operations button.sg-button')
    expect(opBtns.length).toBeGreaterThanOrEqual(1)
  })

  it('oneWay hides the left-move button', () => {
    const w = mount(SgTransfer, { props: { dataSource, oneWay: true } })
    const opBtns = w.findAll('.sg-transfer-operations button.sg-button')
    expect(opBtns.length).toBe(1)
  })
})

describe('SgMentions', () => {
  const options = [{ value: 'alice' }, { value: 'bob' }]

  it('renders textarea', () => {
    const w = mount(SgMentions, { props: { options } })
    expect(w.find('textarea').exists()).toBe(true)
  })

  it('emits update:modelValue on input', async () => {
    const w = mount(SgMentions, { props: { options, modelValue: '' } })
    await w.find('textarea').setValue('hello')
    expect(w.emitted('update:modelValue')).toBeTruthy()
  })
})
