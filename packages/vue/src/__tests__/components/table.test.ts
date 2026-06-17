import { describe, it, expect } from 'vitest'
import { defineComponent, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import SgTable from '../../components/complex/Table/Table.vue'

const sampleColumns = [
  { key: 'name', title: 'Name', sortable: true },
  { key: 'age', title: 'Age', sortable: true },
  { key: 'role', title: 'Role' },
]

const sampleData = [
  { id: '1', data: { name: 'Alice', age: 30, role: 'Engineer' } },
  { id: '2', data: { name: 'Bob', age: 25, role: 'Designer' } },
  { id: '3', data: { name: 'Charlie', age: 35, role: 'Manager' } },
]

describe('SgTable', () => {
  it('renders columns and rows', () => {
    const Wrapper = defineComponent({
      components: { SgTable },
      template: `<SgTable :columns="cols" :data="data" />`,
      data() {
        return { cols: sampleColumns, data: sampleData }
      },
    })
    const wrapper = mount(Wrapper)
    const rows = wrapper.findAll('.sg-table-row-clickable')
    expect(rows.length).toBe(3)
    expect(wrapper.text()).toContain('Alice')
    expect(wrapper.text()).toContain('Engineer')
  })

  it('shows empty placeholder when no data', () => {
    const Wrapper = defineComponent({
      components: { SgTable },
      template: `<SgTable :columns="cols" :data="[]" :locale="{ emptyText: 'Empty' }" />`,
      data() {
        return { cols: sampleColumns }
      },
    })
    const wrapper = mount(Wrapper)
    expect(wrapper.text()).toContain('Empty')
  })

  it('clicking sortable header cycles asc → desc → none', async () => {
    const Wrapper = defineComponent({
      components: { SgTable },
      template: `<SgTable :columns="cols" :data="data" />`,
      data() {
        return { cols: sampleColumns, data: sampleData }
      },
    })
    const wrapper = mount(Wrapper)
    const ageHeader = wrapper.findAll('.sg-table-th-sortable')[1]
    await ageHeader.trigger('click')
    let firstCell = wrapper.findAll('.sg-table-row-clickable')[0].findAll('.sg-table-td')[1]
    expect(firstCell.text()).toBe('25') // asc
    await ageHeader.trigger('click')
    firstCell = wrapper.findAll('.sg-table-row-clickable')[0].findAll('.sg-table-td')[1]
    expect(firstCell.text()).toBe('35') // desc
    await ageHeader.trigger('click')
    firstCell = wrapper.findAll('.sg-table-row-clickable')[0].findAll('.sg-table-td')[1]
    expect(firstCell.text()).toBe('30') // back to original order (insertion)
  })

  it('search filter narrows rows', async () => {
    const Wrapper = defineComponent({
      components: { SgTable },
      template: `<SgTable :columns="cols" :data="data" searchable />`,
      data() {
        return { cols: sampleColumns, data: sampleData }
      },
    })
    const wrapper = mount(Wrapper)
    expect(wrapper.findAll('.sg-table-row-clickable').length).toBe(3)
    const input = wrapper.find('.sg-table-search-input input')
    await input.setValue('Bob')
    await nextTick()
    const rows = wrapper.findAll('.sg-table-row-clickable')
    expect(rows.length).toBe(1)
    expect(rows[0].text()).toContain('Bob')
  })

  it('rowSelection: clicking checkbox toggles selection', async () => {
    let lastChange: { keys: unknown[]; rows: unknown[] } | null = null
    const Wrapper = defineComponent({
      components: { SgTable },
      data() {
        return { cols: sampleColumns, data: sampleData, selected: [] as string[] }
      },
      computed: {
        rowSelection() {
          return {
            selectedKeys: this.selected,
            onChange: (keys: unknown[], rows: unknown[]) => {
              lastChange = { keys, rows }
              this.selected = keys as string[]
            },
          }
        },
      },
      template: `<SgTable :columns="cols" :data="data" :row-selection="rowSelection" />`,
    })
    const wrapper = mount(Wrapper)
    const cb = wrapper.findAll('.sg-table-row-clickable input[type="checkbox"]')[0]
    await cb.trigger('change')
    expect(lastChange).not.toBeNull()
    expect(lastChange!.keys).toEqual(['1'])
  })

  it('paginates when pageSize set', async () => {
    const data = Array.from({ length: 30 }, (_, i) => ({
      id: String(i),
      data: { name: `User ${i}`, age: i, role: 'X' },
    }))
    const Wrapper = defineComponent({
      components: { SgTable },
      template: `<SgTable :columns="cols" :data="data" :page-size="10" />`,
      data() {
        return { cols: sampleColumns, data }
      },
    })
    const wrapper = mount(Wrapper)
    expect(wrapper.findAll('.sg-table-row-clickable').length).toBe(10)
    const next = wrapper.find('.sg-table-pagination-controls .sg-pagination-next')
    await next.trigger('click')
    await nextTick()
    expect(wrapper.findAll('.sg-table-row-clickable').length).toBe(10)
    // Should now show users from page 2
    expect(wrapper.text()).toContain('User 10')
  })

  it('column filter narrows rows via checklist popover', async () => {
    // Mirrors React's `FilterDropdown`: a ▾ trigger opens a checkbox/radio
    // checklist with Reset/Confirm; confirming applies the selection.
    const cols = [
      {
        key: 'role',
        title: 'Role',
        filters: [
          { text: 'Engineer', value: 'Engineer' },
          { text: 'Designer', value: 'Designer' },
        ],
      },
    ]
    const Wrapper = defineComponent({
      components: { SgTable },
      template: `<SgTable :columns="cols" :data="data" />`,
      data() {
        return { cols, data: sampleData }
      },
    })
    const wrapper = mount(Wrapper)
    expect(wrapper.findAll('.sg-table-row-clickable').length).toBe(3)
    await wrapper.find('.sg-table-filter-trigger').trigger('click')
    await nextTick()
    const items = wrapper.findAll('.sg-table-filter-item')
    const engineer = items.find((i) => i.text().includes('Engineer'))
    expect(engineer).toBeTruthy()
    await engineer!.find('input').trigger('change')
    await nextTick()
    // The primary (last) action button confirms the draft selection.
    const actions = wrapper.findAll('.sg-table-filter-actions button')
    await actions[actions.length - 1].trigger('click')
    await nextTick()
    const rows = wrapper.findAll('.sg-table-row-clickable')
    expect(rows.length).toBe(1)
    expect(rows[0].text()).toContain('Engineer')
  })

  it('rowClick emits id and data', async () => {
    const captured: { value: { id: unknown; data: unknown } | null } = { value: null }
    const Wrapper = defineComponent({
      components: { SgTable },
      methods: {
        onRowClick(id: unknown, data: unknown) {
          captured.value = { id, data }
        },
      },
      template: `<SgTable :columns="cols" :data="data" @row-click="onRowClick" />`,
      data() {
        return { cols: sampleColumns, data: sampleData }
      },
    })
    const wrapper = mount(Wrapper)
    const row = wrapper.findAll('.sg-table-row-clickable')[0]
    await row.trigger('click')
    expect(captured.value?.id).toBe('1')
  })

  it('toolbar search uses SgInput (no raw <input class="sg-input">)', () => {
    const wrapper = mount(SgTable, {
      props: { columns: sampleColumns, data: sampleData, searchable: true },
    })
    expect(wrapper.find('.sg-table-search-input.sg-input-wrapper').exists()).toBe(true)
    expect(wrapper.find('.sg-table-search-input input.sg-input').exists()).toBe(true)
  })

  it('row selection uses SgCheckbox (no raw checkbox)', () => {
    const rowSelection = { selectedKeys: [] as string[], type: 'checkbox' as const }
    const wrapper = mount(SgTable, {
      props: { columns: sampleColumns, data: sampleData, rowSelection },
    })
    expect(wrapper.findAll('.sg-table-cell-selection .sg-checkbox').length).toBeGreaterThan(0)
  })

  it('column filter uses SgCheckbox checklist (no raw <select>)', () => {
    const cols = [
      {
        key: 'role',
        title: 'Role',
        filters: [{ text: 'Engineer', value: 'Engineer' }],
      },
    ]
    const wrapper = mount(SgTable, { props: { columns: cols, data: sampleData } })
    // Canonical filter UI (React parity): ▾ trigger + SgCheckbox checklist,
    // never a raw <select>.
    expect(wrapper.find('.sg-table-filter-trigger').exists()).toBe(true)
    expect(wrapper.find('.sg-table-filter-item .sg-checkbox').exists()).toBe(true)
    expect(wrapper.find('select').exists()).toBe(false)
  })

  it('pagination uses SgPagination (no raw button.sg-table-pagination-next)', () => {
    const data = Array.from({ length: 30 }, (_, i) => ({
      id: String(i),
      data: { name: `User ${i}`, age: i, role: 'X' },
    }))
    const wrapper = mount(SgTable, {
      props: { columns: sampleColumns, data, pageSize: 10 },
    })
    expect(wrapper.find('.sg-table-pagination-controls.sg-pagination').exists()).toBe(true)
    expect(wrapper.find('.sg-table-pagination-next').exists()).toBe(false)
  })

  it('loading renders mask overlay and adds sg-table-loading class', () => {
    const wrapper = mount(SgTable, {
      props: { columns: sampleColumns, data: sampleData, loading: true },
    })
    expect(wrapper.find('.sg-table-loading').exists()).toBe(true)
    expect(wrapper.find('.sg-table-loading-mask').exists()).toBe(true)
    expect(wrapper.find('.sg-table-loading-mask .sg-spin').exists()).toBe(true)
  })

  it('loading=false (default) does not render mask', () => {
    const wrapper = mount(SgTable, {
      props: { columns: sampleColumns, data: sampleData },
    })
    expect(wrapper.find('.sg-table-loading').exists()).toBe(false)
    expect(wrapper.find('.sg-table-loading-mask').exists()).toBe(false)
  })

  it('cell slot allows custom rendering', () => {
    const Wrapper = defineComponent({
      components: { SgTable },
      template: `
        <SgTable :columns="cols" :data="data">
          <template #cell="{ column, value }">
            <span v-if="column.key === 'age'" class="age-cell">[{{ value }}]</span>
            <span v-else>{{ value }}</span>
          </template>
        </SgTable>
      `,
      data() {
        return { cols: sampleColumns, data: sampleData }
      },
    })
    const wrapper = mount(Wrapper)
    expect(wrapper.find('.age-cell').exists()).toBe(true)
    expect(wrapper.text()).toContain('[30]')
  })
})
