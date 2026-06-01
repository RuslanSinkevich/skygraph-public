import { describe, it, expect, beforeAll } from 'vitest'
import { defineComponent, ref, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import SgDataGrid from '../../components/complex/DataGrid/DataGrid.vue'
import type { DataGridColumn } from '../../components/complex/DataGrid/types'

type Row = { id: number; name: string; age: number }

beforeAll(() => {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    class FakeResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    ;(globalThis as unknown as { ResizeObserver: typeof FakeResizeObserver }).ResizeObserver =
      FakeResizeObserver
  }
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get() {
      return 400
    },
  })
})

const baseColumns: DataGridColumn<Row>[] = [
  { key: 'id', title: 'ID', sortable: true, width: 80 },
  { key: 'name', title: 'Name', editable: true, width: 200 },
  { key: 'age', title: 'Age', sortable: true, width: 100 },
]

const baseData: Row[] = [
  { id: 1, name: 'Alice', age: 30 },
  { id: 2, name: 'Bob', age: 24 },
  { id: 3, name: 'Carol', age: 28 },
]

function renderGrid(extra: Record<string, unknown> = {}) {
  const Wrapper = defineComponent({
    components: { SgDataGrid },
    props: {
      columns: { type: Array, required: true },
      data: { type: Array, required: true },
      extra: { type: Object, default: () => ({}) },
    },
    setup(p) {
      return { p }
    },
    template: `
      <SgDataGrid
        :columns="p.columns"
        :data="p.data"
        rowKey="id"
        :height="200"
        v-bind="p.extra"
      />
    `,
  })
  return mount(Wrapper, {
    props: { columns: baseColumns, data: baseData, extra },
    attachTo: document.body,
  })
}

describe('SgDataGrid', () => {
  it('renders header cells from columns', async () => {
    const w = renderGrid()
    await nextTick()
    const headers = w.findAll('.sg-datagrid-header-cell')
    const titles = headers.map((h) => h.text())
    expect(titles).toContain('ID')
    expect(titles).toContain('Name')
    expect(titles).toContain('Age')
    w.unmount()
  })

  it('renders rows with row keys', async () => {
    const w = renderGrid()
    await nextTick()
    await nextTick()
    expect(w.findAll('.sg-datagrid-row').length).toBeGreaterThanOrEqual(1)
    w.unmount()
  })

  it('emits sort event when clicking a sortable header', async () => {
    const Wrapper = defineComponent({
      components: { SgDataGrid },
      setup() {
        const events = ref<Array<{ column: string; direction: 'asc' | 'desc' }>>([])
        return { events, baseColumns, baseData }
      },
      template: `
        <SgDataGrid
          :columns="baseColumns"
          :data="baseData"
          rowKey="id"
          @sort="(p) => events.push(p)"
        />
      `,
    })
    const w = mount(Wrapper, { attachTo: document.body })
    await nextTick()
    const headers = w.findAll('.sg-datagrid-header-cell--sortable')
    expect(headers.length).toBeGreaterThan(0)
    await headers[0].trigger('click')
    expect((w.vm as unknown as { events: Array<{ column: string; direction: 'asc' | 'desc' }> }).events).toHaveLength(1)
    w.unmount()
  })

  it('does not emit sort for non-sortable column', async () => {
    const cols: DataGridColumn<Row>[] = [
      { key: 'id', title: 'ID' },
      { key: 'name', title: 'Name' },
    ]
    const Wrapper = defineComponent({
      components: { SgDataGrid },
      setup() {
        const events = ref<unknown[]>([])
        return { events, cols, baseData }
      },
      template: `
        <SgDataGrid :columns="cols" :data="baseData" rowKey="id" @sort="(p) => events.push(p)" />
      `,
    })
    const w = mount(Wrapper, { attachTo: document.body })
    await nextTick()
    const headers = w.findAll('.sg-datagrid-header-cell')
    await headers[0].trigger('click')
    expect((w.vm as unknown as { events: unknown[] }).events).toHaveLength(0)
    w.unmount()
  })

  it('toggles row selection via checkbox column', async () => {
    const Wrapper = defineComponent({
      components: { SgDataGrid },
      setup() {
        const sel = ref<Set<string | number> | null>(null)
        return { sel, baseColumns, baseData }
      },
      template: `
        <SgDataGrid
          :columns="baseColumns"
          :data="baseData"
          rowKey="id"
          rowSelection
          @selected-rows-change="(s) => sel = new Set(s)"
        />
      `,
    })
    const w = mount(Wrapper, { attachTo: document.body })
    await nextTick()
    await nextTick()
    const cellChecks = w
      .findAll('.sg-datagrid-row .sg-datagrid-selection-cell input[type="checkbox"]')
    expect(cellChecks.length).toBeGreaterThan(0)
    await cellChecks[0].setValue(true)
    expect((w.vm as unknown as { sel: Set<string | number> }).sel?.size).toBe(1)
    w.unmount()
  })

  it('select-all checkbox toggles all rows', async () => {
    const Wrapper = defineComponent({
      components: { SgDataGrid },
      setup() {
        const sel = ref<Set<string | number> | null>(null)
        return { sel, baseColumns, baseData }
      },
      template: `
        <SgDataGrid
          :columns="baseColumns"
          :data="baseData"
          rowKey="id"
          rowSelection
          @selected-rows-change="(s) => sel = new Set(s)"
        />
      `,
    })
    const w = mount(Wrapper, { attachTo: document.body })
    await nextTick()
    const headChk = w.find('.sg-datagrid-header .sg-datagrid-selection-cell input[type="checkbox"]')
    await headChk.setValue(true)
    expect((w.vm as unknown as { sel: Set<string | number> }).sel?.size).toBe(baseData.length)
    w.unmount()
  })

  it('renders row numbers when showRowNumber is true', async () => {
    const w = renderGrid({ showRowNumber: true })
    await nextTick()
    await nextTick()
    const rowNumberCells = w.findAll('.sg-datagrid-row .sg-datagrid-row-number-cell')
    expect(rowNumberCells.length).toBeGreaterThanOrEqual(1)
    w.unmount()
  })

  it('shows empty state when data is empty', async () => {
    const w = renderGrid({})
    w.unmount()
    const Wrapper = defineComponent({
      components: { SgDataGrid },
      setup() {
        return { baseColumns, empty: [] as Row[] }
      },
      template: `
        <SgDataGrid :columns="baseColumns" :data="empty" rowKey="id" emptyText="Nothing" />
      `,
    })
    const w2 = mount(Wrapper, { attachTo: document.body })
    await nextTick()
    expect(w2.find('.sg-datagrid-empty').text()).toBe('Nothing')
    w2.unmount()
  })

  it('shows loading overlay when loading is true', async () => {
    const w = renderGrid({ loading: true })
    await nextTick()
    expect(w.find('.sg-datagrid-loading').exists()).toBe(true)
    w.unmount()
  })

  it('emits row-click on row click', async () => {
    const Wrapper = defineComponent({
      components: { SgDataGrid },
      setup() {
        const last = ref<{ row: Row; rowIndex: number } | null>(null)
        return { last, baseColumns, baseData }
      },
      template: `
        <SgDataGrid
          :columns="baseColumns"
          :data="baseData"
          rowKey="id"
          @row-click="(p) => last = p"
        />
      `,
    })
    const w = mount(Wrapper, { attachTo: document.body })
    await nextTick()
    const rows = w.findAll('.sg-datagrid-row')
    if (rows.length > 0) {
      await rows[0].trigger('click')
      expect((w.vm as unknown as { last: { row: Row; rowIndex: number } | null }).last?.rowIndex).toBe(0)
    }
    w.unmount()
  })

  it('opens editor on double-click of editable cell', async () => {
    const w = renderGrid()
    await nextTick()
    const cells = w.findAll('.sg-datagrid-cell')
    const nameCell = cells.find((c) => c.attributes('data-col-key') === 'name')
    if (nameCell) {
      await nameCell.trigger('dblclick')
      expect(w.find('.sg-datagrid-cell--editing').exists()).toBe(true)
    }
    w.unmount()
  })

  it('exposes scrollToRow imperative API', async () => {
    const Wrapper = defineComponent({
      components: { SgDataGrid },
      setup() {
        const gridRef = ref<InstanceType<typeof SgDataGrid> | null>(null)
        return { gridRef, baseColumns, baseData }
      },
      template: `
        <SgDataGrid ref="gridRef" :columns="baseColumns" :data="baseData" rowKey="id" />
      `,
    })
    const w = mount(Wrapper, { attachTo: document.body })
    await nextTick()
    const cmp = w.vm.$refs.gridRef as { scrollToRow: (i: number) => void }
    expect(typeof cmp.scrollToRow).toBe('function')
    expect(() => cmp.scrollToRow(2)).not.toThrow()
    w.unmount()
  })

  it('renders summary rows when configured', async () => {
    const Wrapper = defineComponent({
      components: { SgDataGrid },
      setup() {
        return {
          baseColumns,
          baseData,
          summary: [
            {
              render: (key: string, data: Row[]) => {
                if (key === 'age') return data.reduce((a, r) => a + r.age, 0)
                return null
              },
            },
          ],
        }
      },
      template: `
        <SgDataGrid :columns="baseColumns" :data="baseData" rowKey="id" :summaryRows="summary" />
      `,
    })
    const w = mount(Wrapper, { attachTo: document.body })
    await nextTick()
    expect(w.findAll('.sg-datagrid-summary-row').length).toBe(1)
    expect(w.find('.sg-datagrid-summary').text()).toContain('82')
    w.unmount()
  })

  it('respects frozen column ordering (left first, right last)', async () => {
    const cols: DataGridColumn<Row>[] = [
      { key: 'name', title: 'Name' },
      { key: 'id', title: 'ID', frozen: 'left' },
      { key: 'age', title: 'Age', frozen: 'right' },
    ]
    const Wrapper = defineComponent({
      components: { SgDataGrid },
      setup() {
        return { cols, baseData }
      },
      template: `
        <SgDataGrid :columns="cols" :data="baseData" rowKey="id" />
      `,
    })
    const w = mount(Wrapper, { attachTo: document.body })
    await nextTick()
    const headers = w.findAll('.sg-datagrid-header-cell')
    expect(headers[0].text()).toBe('ID')
    expect(headers[headers.length - 1].text()).toBe('Age')
    w.unmount()
  })
})
