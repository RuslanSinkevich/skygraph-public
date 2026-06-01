import { describe, it, expect } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import {
  SgButton,
  SgModal,
  SgDrawer,
  SgPopconfirm,
  SgTooltip,
  SgProgress,
  SgResult,
  SgEmpty,
  SgSkeleton,
  SgTabs,
  SgMenu,
  SgBreadcrumb,
  SgDropdown,
  SgPagination,
  SgSteps,
  SgSegmented,
  SgBadge,
  SgTag,
  SgAvatar,
  SgTimeline,
  SgDescriptions,
  SgCollapse,
} from '../../components/ui'
import { SgTable } from '../../components/complex/Table'

/**
 * Structural a11y tests — exercise role / aria-* / focusability contracts
 * without pulling in axe-core (currently not a Vue devDep). Mirrors the
 * intent of `a11y-axe.test.tsx` from @skygraph/react.
 */
describe('ui a11y structural contracts', () => {
  it('Button: role=button (implicit) + aria-disabled + disabled when disabled', () => {
    const w = mount(SgButton, { props: { disabled: true }, slots: { default: 'x' } })
    expect(w.find('button').attributes('aria-disabled')).toBe('true')
    expect((w.find('button').element as HTMLButtonElement).disabled).toBe(true)
  })

  it('Button: aria-busy=true when loading', () => {
    const w = mount(SgButton, { props: { loading: true }, slots: { default: 'x' } })
    expect(w.find('button').attributes('aria-busy')).toBe('true')
  })

  it('Modal: role=dialog and aria-modal=true', async () => {
    const w = mount(SgModal, {
      attachTo: document.body,
      props: { open: true, title: 'T' },
      slots: { default: 'B' },
    })
    await nextTick()
    const dialog = document.body.querySelector('.sg-modal') as HTMLElement
    expect(dialog.getAttribute('role')).toBe('dialog')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(dialog.getAttribute('aria-labelledby')).toBeTruthy()
    w.unmount()
    document.body.innerHTML = ''
  })

  it('Drawer: role=dialog and aria-modal=true', async () => {
    const w = mount(SgDrawer, {
      attachTo: document.body,
      props: { open: true, title: 'T' },
      slots: { default: 'B' },
    })
    await nextTick()
    const dialog = document.body.querySelector('.sg-drawer') as HTMLElement
    expect(dialog.getAttribute('role')).toBe('dialog')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    w.unmount()
    document.body.innerHTML = ''
  })

  it('Popconfirm: role=alertdialog when open', async () => {
    const w = mount(SgPopconfirm, {
      props: { title: 'Sure?' },
      slots: { default: '<button class="t">x</button>' },
    })
    await w.find('button.t').trigger('click')
    await nextTick()
    expect(w.find('[role="alertdialog"]').exists()).toBe(true)
  })

  it('Tooltip: role=tooltip + aria-describedby on wrapper', async () => {
    const w = mount(SgTooltip, {
      props: { title: 'Hint' },
      slots: { default: '<button>X</button>' },
    })
    await w.trigger('mouseenter')
    await nextTick()
    expect(w.find('[role="tooltip"]').exists()).toBe(true)
    expect(w.attributes('aria-describedby')).toBeTruthy()
  })

  it('Progress: role=progressbar with aria-valuenow', () => {
    const w = mount(SgProgress, { props: { percent: 60 } })
    expect(w.attributes('role')).toBe('progressbar')
    expect(w.attributes('aria-valuenow')).toBe('60')
  })

  it('Result: role=status with aria-live=polite', () => {
    const w = mount(SgResult, { props: { status: 'success', title: 'OK' } })
    expect(w.attributes('role')).toBe('status')
    expect(w.attributes('aria-live')).toBe('polite')
  })

  it('Empty: role=status', () => {
    const w = mount(SgEmpty)
    expect(w.attributes('role')).toBe('status')
  })

  it('Skeleton: aria-busy=true and aria-label=Loading', () => {
    const w = mount(SgSkeleton)
    expect(w.attributes('aria-busy')).toBe('true')
    expect(w.attributes('aria-label')).toBe('Loading')
  })

  it('Tabs: role=tablist with role=tab buttons', () => {
    const w = mount(SgTabs, {
      props: {
        items: [
          { key: 'a', label: 'A' },
          { key: 'b', label: 'B' },
        ],
      },
    })
    expect(w.find('[role="tablist"]').exists()).toBe(true)
    expect(w.findAll('[role="tab"]').length).toBe(2)
  })

  it('Menu: role=menu with aria-orientation', () => {
    const w = mount(SgMenu, { props: { items: [{ key: 'h', label: 'H' }] } })
    expect(w.attributes('role')).toBe('menu')
    expect(w.attributes('aria-orientation')).toBeTruthy()
  })

  it('Breadcrumb: nav with aria-label=Breadcrumb', () => {
    const w = mount(SgBreadcrumb, { props: { items: [{ title: 'Home' }] } })
    expect(w.element.tagName).toBe('NAV')
    expect(w.attributes('aria-label')).toBe('Breadcrumb')
  })

  it('Dropdown trigger: aria-expanded + aria-haspopup', async () => {
    const w = mount(SgDropdown, {
      props: { items: [{ key: '1', label: 'x' }], trigger: 'click' },
      slots: { default: '<button>O</button>' },
    })
    const trig = w.find('.sg-dropdown-trigger')
    expect(trig.attributes('aria-expanded')).toBe('false')
    expect(trig.attributes('aria-haspopup')).toBe('menu')
    await trig.trigger('click')
    await nextTick()
    expect(trig.attributes('aria-expanded')).toBe('true')
  })

  it('Pagination: nav with aria-label and aria-current on active page', () => {
    const w = mount(SgPagination, { props: { current: 2, total: 30 } })
    expect(w.attributes('aria-label')).toBe('Pagination')
    const active = w.find('[aria-current="page"]')
    expect(active.exists()).toBe(true)
    expect(active.text()).toBe('2')
  })

  it('Steps: aria-current=step on current step', () => {
    const w = mount(SgSteps, {
      props: { current: 1, items: [{ title: 'A' }, { title: 'B' }, { title: 'C' }] },
    })
    expect(w.find('[aria-current="step"]').text()).toContain('B')
  })

  it('Segmented: role=radiogroup with role=radio items', () => {
    const w = mount(SgSegmented, {
      props: {
        options: [
          { label: 'A', value: 'a' },
          { label: 'B', value: 'b' },
        ],
      },
    })
    expect(w.attributes('role')).toBe('radiogroup')
    expect(w.findAll('[role="radio"]').length).toBe(2)
  })

  it('Segmented: aria-checked reflects current value', () => {
    const w = mount(SgSegmented, {
      props: {
        options: [
          { label: 'A', value: 'a' },
          { label: 'B', value: 'b' },
        ],
        defaultValue: 'b',
      },
    })
    const radios = w.findAll('[role="radio"]')
    expect(radios[1].attributes('aria-checked')).toBe('true')
    expect(radios[0].attributes('aria-checked')).toBe('false')
  })

  it('Badge with status: hosts a labelled status node', () => {
    const w = mount(SgBadge, { props: { status: 'success', text: 'Live' } })
    expect(w.find('.sg-badge-status').exists()).toBe(true)
  })

  it('Tag: close button has aria-label', () => {
    const w = mount(SgTag, {
      props: { closable: true },
      slots: { default: 'x' },
    })
    expect(w.find('.sg-tag-close').attributes('aria-label')).toBe('Close')
  })

  it('Avatar: role=img with aria-label', () => {
    const w = mount(SgAvatar, {
      props: { ariaLabel: 'A' },
      slots: { default: 'A' },
    })
    expect(w.attributes('role')).toBe('img')
    expect(w.attributes('aria-label')).toBe('A')
  })

  it('Timeline: role=list with role=listitem entries', () => {
    const w = mount(SgTimeline, {
      props: { items: [{ content: 'A' }, { content: 'B' }] },
    })
    expect(w.attributes('role')).toBe('list')
    expect(w.findAll('[role="listitem"]').length).toBe(2)
  })

  it('Descriptions: role=list', () => {
    const w = mount(SgDescriptions, {
      props: { items: [{ label: 'A', value: 'a' }] },
    })
    expect(w.attributes('role')).toBe('list')
  })

  it('Collapse header: role=button with aria-expanded', async () => {
    const w = mount(SgCollapse, {
      props: { items: [{ key: '1', label: 'A', content: 'B' }] },
    })
    const header = w.find('.sg-collapse-header')
    expect(header.attributes('role')).toBe('button')
    expect(header.attributes('aria-expanded')).toBe('false')
    await header.trigger('click')
    expect(header.attributes('aria-expanded')).toBe('true')
  })

  const tableCols = [
    { key: 'name', title: 'Name', sortable: true },
    { key: 'age', title: 'Age' },
  ]
  const tableData = [
    { id: '1', data: { name: 'Alice', age: 30 } },
    { id: '2', data: { name: 'Bob', age: 25 } },
  ]

  it('Table: ARIA grid roles (table / row / columnheader / cell)', () => {
    const w = mount(SgTable, {
      props: { columns: tableCols, data: tableData, showPagination: false },
    })
    expect(w.find('[role="table"]').exists()).toBe(true)
    expect(w.findAll('[role="columnheader"]').length).toBe(2)
    expect(w.findAll('[role="row"]').length).toBeGreaterThan(0)
    expect(w.findAll('[role="cell"]').length).toBeGreaterThan(0)
  })

  it('Table: sortable header exposes aria-sort=none by default', () => {
    const w = mount(SgTable, {
      props: { columns: tableCols, data: tableData, showPagination: false },
    })
    const headers = w.findAll('[role="columnheader"]')
    expect(headers[0].attributes('aria-sort')).toBe('none')
  })

  it('Table (draggable): header cells get draggable attr, fixed columns excluded', () => {
    const w = mount(SgTable, {
      props: {
        columns: [
          { key: 'name', title: 'Name', fixed: 'left' as const },
          { key: 'age', title: 'Age' },
          { key: 'city', title: 'City' },
        ],
        data: [
          { id: '1', data: { name: 'Alice', age: 30, city: 'NY' } },
          { id: '2', data: { name: 'Bob', age: 25, city: 'LA' } },
        ],
        draggable: true,
        showPagination: false,
      },
    })
    const headers = w.findAll('[role="columnheader"]')
    // Pinned (fixed) column must not be draggable; the rest are.
    expect(headers[0].attributes('draggable')).toBeUndefined()
    expect(headers[1].attributes('draggable')).toBe('true')
    expect(headers[2].attributes('draggable')).toBe('true')
  })

  it('Table (draggable): drop reorders columns and emits column-order-change', async () => {
    const w = mount(SgTable, {
      props: {
        columns: [
          { key: 'name', title: 'Name' },
          { key: 'age', title: 'Age' },
          { key: 'city', title: 'City' },
        ],
        data: [{ id: '1', data: { name: 'Alice', age: 30, city: 'NY' } }],
        draggable: true,
        showPagination: false,
      },
    })
    const headers = () => w.findAll('[role="columnheader"]')
    const dt = {
      effectAllowed: '',
      dropEffect: '',
      setData: () => {},
      getData: () => 'city',
    }
    // Drag the 3rd column (City) onto the 1st (Name).
    await headers()[2].trigger('dragstart', { dataTransfer: dt })
    await headers()[0].trigger('dragover', { dataTransfer: dt })
    await headers()[0].trigger('drop', { dataTransfer: dt })
    const emitted = w.emitted('columnOrderChange')
    expect(emitted).toBeTruthy()
    expect(emitted![0][0]).toEqual(['city', 'name', 'age'])
    // Header order in the DOM reflects the new order.
    expect(headers().map((h) => h.find('.sg-table-th-title').text())).toEqual([
      'City',
      'Name',
      'Age',
    ])
  })
})
