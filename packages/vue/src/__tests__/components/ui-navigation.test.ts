import { describe, it, expect, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import {
  SgTabs,
  SgMenu,
  SgBreadcrumb,
  SgDropdown,
  SgPagination,
  SgSteps,
  SgSegmented,
} from '../../components/ui'

describe('SgTabs', () => {
  const items = [
    { key: 'a', label: 'Alpha', content: 'A-body' },
    { key: 'b', label: 'Beta', content: 'B-body' },
    { key: 'c', label: 'Gamma', content: 'C-body', disabled: true },
  ]

  it('renders all tab labels', () => {
    const wrapper = mount(SgTabs, { props: { items } })
    expect(wrapper.text()).toContain('Alpha')
    expect(wrapper.text()).toContain('Beta')
    expect(wrapper.text()).toContain('Gamma')
  })

  it('marks first tab active by default', () => {
    const wrapper = mount(SgTabs, { props: { items } })
    const tabs = wrapper.findAll('[role="tab"]')
    expect(tabs[0].classes()).toContain('sg-tabs-tab-active')
  })

  it('uses defaultActiveKey when set', () => {
    const wrapper = mount(SgTabs, { props: { items, defaultActiveKey: 'b' } })
    const active = wrapper.find('.sg-tabs-tab-active')
    expect(active.text()).toContain('Beta')
  })

  it('emits change on click', async () => {
    const wrapper = mount(SgTabs, { props: { items } })
    const tabs = wrapper.findAll('[role="tab"]')
    await tabs[1].trigger('click')
    expect(wrapper.emitted('change')).toBeTruthy()
    expect(wrapper.emitted('change')![0]).toEqual(['b'])
  })

  it('does not change on disabled tab', async () => {
    const wrapper = mount(SgTabs, { props: { items } })
    const tabs = wrapper.findAll('[role="tab"]')
    await tabs[2].trigger('click')
    expect(wrapper.emitted('change')).toBeFalsy()
  })

  it('keyboard ArrowRight moves to next', async () => {
    const wrapper = mount(SgTabs, { props: { items, defaultActiveKey: 'a' } })
    const tabs = wrapper.findAll('[role="tab"]')
    await tabs[0].trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.emitted('change')![0]).toEqual(['b'])
  })

  it('renders content for active tab via panel slot', () => {
    const wrapper = mount(SgTabs, { props: { items } })
    expect(wrapper.find('.sg-tabs-content').text()).toContain('A-body')
  })

  it('applies type=line modifier', () => {
    const wrapper = mount(SgTabs, { props: { items, type: 'line' } })
    expect(wrapper.classes()).toContain('sg-tabs-line')
  })
})

describe('SgMenu', () => {
  const items = [
    { key: 'home', label: 'Home' },
    { key: 'about', label: 'About' },
    { key: 'd1', label: '', type: 'divider' as const },
    { key: 'contact', label: 'Contact' },
  ]

  it('renders all menu items', () => {
    const wrapper = mount(SgMenu, { props: { items } })
    expect(wrapper.text()).toContain('Home')
    expect(wrapper.text()).toContain('About')
    expect(wrapper.text()).toContain('Contact')
  })

  it('renders divider with role separator', () => {
    const wrapper = mount(SgMenu, { props: { items } })
    expect(wrapper.find('.sg-menu-divider').exists()).toBe(true)
  })

  it('emits select on item click', async () => {
    const wrapper = mount(SgMenu, { props: { items } })
    const homeEl = wrapper.findAll('[data-menu-key="about"]')[0]
    await homeEl.trigger('click')
    expect(wrapper.emitted('select')).toBeTruthy()
    expect((wrapper.emitted('select') as any)[0][0].key).toBe('about')
  })

  it('disabled item is not selectable', async () => {
    const ditems = [{ key: 'no', label: 'No', disabled: true }]
    const wrapper = mount(SgMenu, { props: { items: ditems } })
    const el = wrapper.findAll('[data-menu-key="no"]')[0]
    await el.trigger('click')
    expect(wrapper.emitted('select')).toBeFalsy()
  })

  it('inline submenu opens on parent click', async () => {
    const subItems = [
      {
        key: 'parent',
        label: 'Parent',
        children: [{ key: 'child', label: 'Child' }],
      },
    ]
    const wrapper = mount(SgMenu, { props: { items: subItems, mode: 'inline' } })
    expect(wrapper.find('[data-menu-key="parent"]').exists()).toBe(true)
    await wrapper.find('[data-menu-key="parent"]').trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('Child')
  })

  it('sets aria-orientation horizontal in horizontal mode', () => {
    const wrapper = mount(SgMenu, { props: { items, mode: 'horizontal' } })
    expect(wrapper.attributes('aria-orientation')).toBe('horizontal')
  })

  it('renders theme dark class', () => {
    const wrapper = mount(SgMenu, { props: { items, theme: 'dark' } })
    expect(wrapper.classes()).toContain('sg-menu-dark')
  })
})

describe('SgBreadcrumb', () => {
  const items = [{ title: 'Home', href: '/' }, { title: 'Products' }, { title: 'Detail' }]

  it('renders all items', () => {
    const wrapper = mount(SgBreadcrumb, { props: { items } })
    expect(wrapper.text()).toContain('Home')
    expect(wrapper.text()).toContain('Products')
    expect(wrapper.text()).toContain('Detail')
  })

  it('renders separators between items', () => {
    const wrapper = mount(SgBreadcrumb, { props: { items } })
    expect(wrapper.findAll('.sg-breadcrumb-separator').length).toBe(2)
  })

  it('renders link for items with href', () => {
    const wrapper = mount(SgBreadcrumb, { props: { items } })
    expect(wrapper.find('a').exists()).toBe(true)
    expect(wrapper.find('a').attributes('href')).toBe('/')
  })

  it('marks last item as current', () => {
    const wrapper = mount(SgBreadcrumb, { props: { items } })
    expect(wrapper.find('.sg-breadcrumb-current').text()).toBe('Detail')
  })

  it('uses custom separator', () => {
    const wrapper = mount(SgBreadcrumb, { props: { items, separator: '>' } })
    const seps = wrapper.findAll('.sg-breadcrumb-separator')
    expect(seps[0].text()).toBe('>')
  })

  it('emits itemClick when link is clicked', async () => {
    const wrapper = mount(SgBreadcrumb, { props: { items } })
    await wrapper.find('a').trigger('click')
    expect(wrapper.emitted('itemClick')).toBeTruthy()
  })

  it('aria-label is "Breadcrumb"', () => {
    const wrapper = mount(SgBreadcrumb, { props: { items } })
    expect(wrapper.attributes('aria-label')).toBe('Breadcrumb')
  })
})

describe('SgDropdown', () => {
  const items = [
    { key: '1', label: 'First' },
    { key: '2', label: 'Second' },
    { key: 'div', label: '', divider: true },
    { key: '3', label: 'Third' },
  ]

  it('renders trigger element', () => {
    const wrapper = mount(SgDropdown, {
      props: { items },
      slots: { default: '<button>Open</button>' },
    })
    expect(wrapper.find('button').exists()).toBe(true)
  })

  it('opens menu on trigger click', async () => {
    const wrapper = mount(SgDropdown, {
      props: { items, trigger: 'click' },
      slots: { default: '<button>Open</button>' },
    })
    await wrapper.find('.sg-dropdown-trigger').trigger('click')
    await nextTick()
    expect(wrapper.find('[role="menu"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('First')
  })

  it('emits select on item click', async () => {
    const wrapper = mount(SgDropdown, {
      props: { items, trigger: 'click' },
      slots: { default: '<button>Open</button>' },
    })
    await wrapper.find('.sg-dropdown-trigger').trigger('click')
    await nextTick()
    const itemEls = wrapper.findAll('[role="menuitem"]')
    await itemEls[0].trigger('click')
    expect(wrapper.emitted('select')).toBeTruthy()
    expect(wrapper.emitted('select')![0]).toEqual(['1'])
  })

  it('opens on hover when trigger=hover', async () => {
    const wrapper = mount(SgDropdown, {
      props: { items, trigger: 'hover' },
      slots: { default: '<button>Open</button>' },
    })
    await wrapper.trigger('mouseenter')
    await nextTick()
    expect(wrapper.find('[role="menu"]').exists()).toBe(true)
  })

  it('renders divider as separator', async () => {
    const wrapper = mount(SgDropdown, {
      props: { items, trigger: 'click' },
      slots: { default: '<button>X</button>' },
    })
    await wrapper.find('.sg-dropdown-trigger').trigger('click')
    await nextTick()
    expect(wrapper.find('[role="separator"]').exists()).toBe(true)
  })

  it('disabled trigger does not open menu', async () => {
    const wrapper = mount(SgDropdown, {
      props: { items, trigger: 'click', disabled: true },
      slots: { default: '<button>X</button>' },
    })
    await wrapper.find('.sg-dropdown-trigger').trigger('click')
    await nextTick()
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
  })
})

describe('SgPagination', () => {
  it('renders numbered pages', () => {
    const wrapper = mount(SgPagination, { props: { current: 1, total: 30 } })
    expect(wrapper.text()).toContain('1')
    expect(wrapper.text()).toContain('2')
    expect(wrapper.text()).toContain('3')
  })

  it('emits change on page click', async () => {
    const wrapper = mount(SgPagination, { props: { current: 1, total: 50 } })
    const buttons = wrapper.findAll('.sg-pagination-item')
    const target = buttons.find((b) => b.text() === '2')!
    await target.trigger('click')
    expect(wrapper.emitted('change')).toBeTruthy()
    expect(wrapper.emitted('change')![0]).toEqual([2])
  })

  it('disables prev button on first page', () => {
    const wrapper = mount(SgPagination, { props: { current: 1, total: 50 } })
    const prev = wrapper.find('.sg-pagination-prev')
    expect((prev.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('disables next button on last page', () => {
    const wrapper = mount(SgPagination, { props: { current: 5, total: 50, pageSize: 10 } })
    const next = wrapper.find('.sg-pagination-next')
    expect((next.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('shows total when showTotal=true', () => {
    const wrapper = mount(SgPagination, {
      props: { current: 1, total: 50, showTotal: true },
    })
    expect(wrapper.text()).toContain('50')
  })

  it('renders simple variant', () => {
    const wrapper = mount(SgPagination, {
      props: { current: 2, total: 50, simple: true },
    })
    expect(wrapper.find('.sg-pagination-simple-pager').exists()).toBe(true)
  })

  it('renders ellipsis with many pages', () => {
    const wrapper = mount(SgPagination, {
      props: { current: 5, total: 200, pageSize: 10 },
    })
    expect(wrapper.findAll('.sg-pagination-ellipsis').length).toBeGreaterThan(0)
  })

  it('renders size changer', () => {
    const wrapper = mount(SgPagination, {
      props: { current: 1, total: 50, showSizeChanger: true },
    })
    expect(wrapper.find('select.sg-pagination-size-changer').exists()).toBe(true)
  })

  it('emits pageSizeChange on select change', async () => {
    const wrapper = mount(SgPagination, {
      props: { current: 1, total: 50, showSizeChanger: true },
    })
    const select = wrapper.find('select')
    await select.setValue('20')
    expect(wrapper.emitted('pageSizeChange')).toBeTruthy()
    expect(wrapper.emitted('pageSizeChange')![0]).toEqual([20])
  })

  it('disabled blocks all clicks', async () => {
    const wrapper = mount(SgPagination, {
      props: { current: 1, total: 50, disabled: true },
    })
    const buttons = wrapper.findAll('.sg-pagination-item')
    const target = buttons.find((b) => b.text() === '2')
    if (target) await target.trigger('click')
    expect(wrapper.emitted('change')).toBeFalsy()
  })

  it('aria-label is Pagination', () => {
    const wrapper = mount(SgPagination, { props: { current: 1, total: 30 } })
    expect(wrapper.attributes('aria-label')).toBe('Pagination')
  })
})

describe('SgSteps', () => {
  const items = [{ title: 'One' }, { title: 'Two' }, { title: 'Three' }]

  it('renders all step titles', () => {
    const wrapper = mount(SgSteps, { props: { items, current: 0 } })
    expect(wrapper.text()).toContain('One')
    expect(wrapper.text()).toContain('Two')
    expect(wrapper.text()).toContain('Three')
  })

  it('marks current step as process', () => {
    const wrapper = mount(SgSteps, { props: { items, current: 1 } })
    const proc = wrapper.find('.sg-steps-item-process')
    expect(proc.exists()).toBe(true)
    expect(proc.text()).toContain('Two')
  })

  it('marks completed steps as finish', () => {
    const wrapper = mount(SgSteps, { props: { items, current: 2 } })
    expect(wrapper.findAll('.sg-steps-item-finish').length).toBe(2)
  })

  it('marks future steps as wait', () => {
    const wrapper = mount(SgSteps, { props: { items, current: 0 } })
    expect(wrapper.findAll('.sg-steps-item-wait').length).toBe(2)
  })

  it('emits change when step is clicked (with listener attached)', async () => {
    const onChange = vi.fn()
    const wrapper = mount(SgSteps, {
      props: { items, current: 0 },
      attrs: { onChange },
    })
    const steps = wrapper.findAll('.sg-steps-item')
    await steps[2].trigger('click')
    expect(wrapper.emitted('change')).toBeTruthy()
    expect(wrapper.emitted('change')![0]).toEqual([2])
  })

  it('suppresses change emit when no listener and clickable is unset (React parity)', async () => {
    const wrapper = mount(SgSteps, { props: { items, current: 0 } })
    const steps = wrapper.findAll('.sg-steps-item')
    expect(steps[0].classes()).not.toContain('sg-steps-item-clickable')
    await steps[2].trigger('click')
    expect(wrapper.emitted('change')).toBeFalsy()
  })

  it('clickable=true forces clickable affordance even without listener', () => {
    const wrapper = mount(SgSteps, { props: { items, current: 0, clickable: true } })
    expect(wrapper.find('.sg-steps-item-clickable').exists()).toBe(true)
  })

  it('item.icon renders sg-steps-icon-custom', () => {
    const wrapper = mount(SgSteps, {
      props: {
        items: [{ title: 'Custom', icon: '★' }],
        current: 0,
      },
    })
    const custom = wrapper.find('.sg-steps-icon-custom')
    expect(custom.exists()).toBe(true)
    expect(custom.text()).toBe('★')
  })

  it('renders description when set', () => {
    const wrapper = mount(SgSteps, {
      props: { items: [{ title: 'A', description: 'first step' }], current: 0 },
    })
    expect(wrapper.find('.sg-steps-item-description').text()).toBe('first step')
  })

  it('vertical direction adds modifier class', () => {
    const wrapper = mount(SgSteps, {
      props: { items, current: 0, direction: 'vertical' },
    })
    expect(wrapper.classes()).toContain('sg-steps-vertical')
  })

  it('navigation type adds modifier', () => {
    const wrapper = mount(SgSteps, {
      props: { items, current: 0, type: 'navigation' },
    })
    expect(wrapper.classes()).toContain('sg-steps-navigation')
  })
})

describe('SgSegmented', () => {
  const opts = [
    { label: 'Day', value: 'day' },
    { label: 'Week', value: 'week' },
    { label: 'Month', value: 'month' },
  ]

  it('renders all options', () => {
    const wrapper = mount(SgSegmented, { props: { options: opts } })
    expect(wrapper.text()).toContain('Day')
    expect(wrapper.text()).toContain('Week')
    expect(wrapper.text()).toContain('Month')
  })

  it('first option is selected by default', () => {
    const wrapper = mount(SgSegmented, { props: { options: opts } })
    const sel = wrapper.find('.sg-segmented-item-selected')
    expect(sel.text()).toBe('Day')
  })

  it('respects defaultValue', () => {
    const wrapper = mount(SgSegmented, {
      props: { options: opts, defaultValue: 'week' },
    })
    expect(wrapper.find('.sg-segmented-item-selected').text()).toBe('Week')
  })

  it('emits change on click', async () => {
    const wrapper = mount(SgSegmented, { props: { options: opts } })
    const items = wrapper.findAll('.sg-segmented-item')
    await items[1].trigger('click')
    expect(wrapper.emitted('change')).toBeTruthy()
    expect(wrapper.emitted('change')![0]).toEqual(['week'])
  })

  it('disabled blocks selection', async () => {
    const wrapper = mount(SgSegmented, { props: { options: opts, disabled: true } })
    const items = wrapper.findAll('.sg-segmented-item')
    await items[1].trigger('click')
    expect(wrapper.emitted('change')).toBeFalsy()
  })

  it('individual option disabled', async () => {
    const items = [
      { label: 'A', value: 'a', disabled: true },
      { label: 'B', value: 'b' },
    ]
    const wrapper = mount(SgSegmented, { props: { options: items } })
    const els = wrapper.findAll('.sg-segmented-item')
    await els[0].trigger('click')
    expect(wrapper.emitted('change')).toBeFalsy()
  })

  it('block applies modifier', () => {
    const wrapper = mount(SgSegmented, { props: { options: opts, block: true } })
    expect(wrapper.classes()).toContain('sg-segmented-block')
  })

  it('aria role radiogroup', () => {
    const wrapper = mount(SgSegmented, { props: { options: opts } })
    expect(wrapper.attributes('role')).toBe('radiogroup')
  })

  it('accepts string options', () => {
    const wrapper = mount(SgSegmented, { props: { options: ['x', 'y'] as any } })
    expect(wrapper.text()).toContain('x')
    expect(wrapper.text()).toContain('y')
  })

  it('emits update:value + update:modelValue for v-model parity', async () => {
    const wrapper = mount(SgSegmented, { props: { options: opts } })
    const items = wrapper.findAll('.sg-segmented-item')
    await items[1].trigger('click')
    expect(wrapper.emitted('update:value')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:value')![0]).toEqual(['week'])
  })

  it('option.icon renders sg-segmented-item-icon', () => {
    const wrapper = mount(SgSegmented, {
      props: {
        options: [
          { label: 'Map', value: 'map', icon: '★' },
          { label: 'Grid', value: 'grid' },
        ],
      },
    })
    const icons = wrapper.findAll('.sg-segmented-item-icon')
    expect(icons.length).toBe(1)
    expect(icons[0].text()).toBe('★')
  })

  it('modelValue prop drives selection (Vue v-model alias)', () => {
    const wrapper = mount(SgSegmented, { props: { options: opts, modelValue: 'month' } })
    expect(wrapper.find('.sg-segmented-item-selected').text()).toBe('Month')
  })
})
