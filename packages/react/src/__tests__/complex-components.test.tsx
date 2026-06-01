import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
// @ts-expect-error React is needed for JSX
import React from 'react'

import { Table } from '../components/complex/Table'
import { Tree } from '../components/complex/Tree'
import { Cascader } from '../components/complex/Cascader'
import { Transfer } from '../components/complex/Transfer'
import { List } from '../components/complex/List'

// ─── Table ──────────────────────────────────────────────────────────────

const tableCols = [
  { key: 'name', title: 'Name', sortable: true },
  { key: 'age', title: 'Age', sortable: true },
]

const tableData = [
  { id: '1', data: { name: 'Alice', age: 30 } },
  { id: '2', data: { name: 'Bob', age: 25 } },
  { id: '3', data: { name: 'Charlie', age: 35 } },
]

describe('Table', () => {
  it('renders rows and columns', () => {
    render(<Table columns={tableCols} data={tableData} showPagination={false} />)
    expect(screen.getByText('Alice')).toBeDefined()
    expect(screen.getByText('Bob')).toBeDefined()
    expect(screen.getByText('Charlie')).toBeDefined()
    expect(screen.getByText('Name')).toBeDefined()
    expect(screen.getByText('Age')).toBeDefined()
  })

  it('renders empty state', () => {
    render(<Table columns={tableCols} data={[]} showPagination={false} />)
    expect(screen.getByText('No data')).toBeDefined()
  })

  it('unstyled mode renders with role="table"', () => {
    const { container } = render(
      <Table columns={tableCols} data={tableData} unstyled showPagination={false} />,
    )
    expect(container.querySelector('[role="table"]')).toBeTruthy()
    const headers = container.querySelectorAll('[role="columnheader"]')
    expect(headers.length).toBe(2)
  })

  it('sorts on header click', () => {
    const { container } = render(
      <Table columns={tableCols} data={tableData} showPagination={false} />,
    )
    const nameHeader = screen.getByText('Name')
    fireEvent.click(nameHeader)

    const cells = container.querySelectorAll('.sg-table-td')
    const texts = Array.from(cells).map((c) => c.textContent)
    expect(texts[0]).toBe('Alice')
  })

  it('row selection works', () => {
    const onChange = vi.fn()
    render(
      <Table
        columns={tableCols}
        data={tableData}
        rowSelection={{ selectedKeys: [], onChange, type: 'checkbox' }}
        showPagination={false}
      />,
    )
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes.length).toBeGreaterThan(0)
  })

  it('reorders columns via header drag-and-drop (draggable)', () => {
    const onColumnOrderChange = vi.fn()
    const { container } = render(
      <Table
        columns={[
          { key: 'name', title: 'Name' },
          { key: 'age', title: 'Age' },
        ]}
        data={tableData}
        draggable
        onColumnOrderChange={onColumnOrderChange}
        showPagination={false}
      />,
    )
    const headers = container.querySelectorAll('[role="columnheader"]')
    const dt = {
      effectAllowed: '',
      dropEffect: '',
      setData: vi.fn(),
      getData: () => 'age',
    } as unknown as DataTransfer
    // Drag "Age" (index 1) onto "Name" (index 0).
    fireEvent.dragStart(headers[1], { dataTransfer: dt })
    fireEvent.dragOver(headers[0], { dataTransfer: dt })
    fireEvent.drop(headers[0], { dataTransfer: dt })
    expect(onColumnOrderChange).toHaveBeenCalledWith(['age', 'name'])
    const reordered = container.querySelectorAll('[role="columnheader"] .sg-table-th-title')
    expect(Array.from(reordered).map((n) => n.textContent)).toEqual(['Age', 'Name'])
  })

  it('search filters rows', () => {
    render(<Table columns={tableCols} data={tableData} searchable showPagination={false} />)
    const input = screen.getByPlaceholderText('Search...')
    fireEvent.change(input, { target: { value: 'Alice' } })
    expect(screen.getByText('Alice')).toBeDefined()
  })

  it('custom render function works', () => {
    const cols = [
      {
        key: 'name',
        title: 'Name',
        render: (val: unknown) => <strong data-testid="custom">{String(val)}</strong>,
      },
    ]
    render(<Table columns={cols} data={tableData} showPagination={false} />)
    const customs = screen.getAllByTestId('custom')
    expect(customs.length).toBe(3)
    expect(customs[0].textContent).toBe('Alice')
  })

  it('keeps explicit column widths in pixels in fluid layout', () => {
    const { container } = render(
      <Table
        columns={[
          { key: 'name', title: 'Name' },
          { key: 'age', title: 'Age', width: 80 },
          { key: 'city', title: 'City' },
        ]}
        data={tableData}
        showPagination={false}
      />,
    )

    const grid = container.querySelector('.sg-table-grid') as HTMLElement
    expect(grid.style.gridTemplateColumns).toContain('minmax(50px, 80px)')
    expect(grid.style.gridTemplateColumns).not.toContain('80fr')
  })

  it('stretches all explicit column widths to fill fluid layout', () => {
    const { container } = render(
      <Table
        columns={[
          { key: 'name', title: 'Name', width: 180 },
          { key: 'age', title: 'Age', width: 80 },
          { key: 'city', title: 'City', width: 120 },
        ]}
        data={tableData}
        showPagination={false}
      />,
    )

    const grid = container.querySelector('.sg-table-grid') as HTMLElement
    expect(grid.style.gridTemplateColumns).toContain('minmax(50px, 180fr)')
    expect(grid.style.gridTemplateColumns).toContain('minmax(50px, 80fr)')
  })

  it('fills extra numeric scroll width without a blank trailing track', () => {
    const { container } = render(
      <Table
        columns={[
          { key: 'name', title: 'Name', width: 160, fixed: 'left' },
          { key: 'age', title: 'Age', width: 80 },
          { key: 'city', title: 'City', width: 120 },
          { key: 'action', title: 'Action', width: 90, fixed: 'right' },
        ]}
        data={tableData}
        scroll={{ x: 500 }}
        showPagination={false}
      />,
    )

    const grid = container.querySelector('.sg-table-grid') as HTMLElement
    expect(grid.style.gridTemplateColumns).toContain('160px')
    expect(grid.style.gridTemplateColumns).toContain('minmax(80px, 80fr)')
    expect(grid.style.gridTemplateColumns).toContain('minmax(120px, 120fr)')
    expect(grid.style.gridTemplateColumns).toContain('90px')
  })

  it('expandable rows', () => {
    const expandConfig = {
      expandedRowRender: (row: Record<string, unknown>) => (
        <span data-testid="expanded">Details: {String(row.name)}</span>
      ),
    }
    const { container } = render(
      <Table
        columns={tableCols}
        data={tableData}
        expandable={expandConfig}
        showPagination={false}
      />,
    )
    const expandBtns = container.querySelectorAll('.sg-table-expand-btn')
    expect(expandBtns.length).toBe(3)
    fireEvent.click(expandBtns[0])
    expect(screen.getByTestId('expanded').textContent).toBe('Details: Alice')
  })

  it('column visibility toggle', () => {
    const { container } = render(
      <Table columns={tableCols} data={tableData} columnVisibility showPagination={false} />,
    )
    const btn = screen.getByText('Show Columns')
    fireEvent.click(btn)
    const dropdown = container.querySelector('.sg-table-col-visibility-dropdown')
    expect(dropdown).toBeTruthy()
  })

  it('export buttons render when exportable', () => {
    render(<Table columns={tableCols} data={tableData} exportable showPagination={false} />)
    expect(screen.getByText('Export CSV')).toBeDefined()
    expect(screen.getByText('Copy')).toBeDefined()
  })

  it('striped class applies to alternating rows', () => {
    const { container } = render(
      <Table columns={tableCols} data={tableData} striped showPagination={false} />,
    )
    expect(container.querySelector('.sg-table-striped')).toBeTruthy()
  })
})

// ─── Table grouping ─────────────────────────────────────────────────────

const groupedCols = [
  { key: 'name', title: 'Name' },
  { key: 'city', title: 'City' },
  { key: 'score', title: 'Score', aggregate: 'sum' as const },
]

const groupedData = [
  { id: '1', data: { name: 'Alice', city: 'Moscow', score: 50 } },
  { id: '2', data: { name: 'Bob', city: 'Berlin', score: 80 } },
  { id: '3', data: { name: 'Charlie', city: 'Moscow', score: 70 } },
  { id: '4', data: { name: 'Dave', city: 'Berlin', score: 100 } },
]

describe('Table grouping', () => {
  it('renders group rows when groupBy is set', () => {
    const { container } = render(
      <Table
        columns={groupedCols}
        data={groupedData}
        groupBy="city"
        defaultGroupExpanded
        showPagination={false}
      />,
    )
    const groupRows = container.querySelectorAll('.sg-table-group-row')
    expect(groupRows.length).toBe(2)
  })

  it('shows group title with raw value', () => {
    const { container } = render(
      <Table
        columns={groupedCols}
        data={groupedData}
        groupBy="city"
        defaultGroupExpanded
        showPagination={false}
      />,
    )
    const titles = Array.from(container.querySelectorAll('.sg-table-group-title strong')).map(
      (n) => n.textContent,
    )
    expect(titles).toEqual(['Moscow', 'Berlin'])
  })

  it('shows row count per group', () => {
    const { container } = render(
      <Table
        columns={groupedCols}
        data={groupedData}
        groupBy="city"
        defaultGroupExpanded
        showPagination={false}
      />,
    )
    const counts = container.querySelectorAll('.sg-table-group-count')
    expect(counts.length).toBe(2)
    expect(counts[0].textContent).toBe('(2)')
  })

  it('renders aggregate values inside group header', () => {
    const { container } = render(
      <Table
        columns={groupedCols}
        data={groupedData}
        groupBy="city"
        defaultGroupExpanded
        showPagination={false}
      />,
    )
    const aggs = container.querySelectorAll('.sg-table-group-agg-item')
    const texts = Array.from(aggs).map((n) => n.textContent ?? '')
    expect(texts.some((t) => t.includes('score') && t.includes('120'))).toBe(true)
    expect(texts.some((t) => t.includes('score') && t.includes('180'))).toBe(true)
  })

  it('groups start collapsed by default', () => {
    const { container } = render(
      <Table columns={groupedCols} data={groupedData} groupBy="city" showPagination={false} />,
    )
    expect(screen.queryByText('Alice')).toBeNull()
    expect(screen.queryByText('Bob')).toBeNull()
    expect(container.querySelectorAll('.sg-table-group-row').length).toBe(2)
  })

  it('clicking group header expands the group', () => {
    render(<Table columns={groupedCols} data={groupedData} groupBy="city" showPagination={false} />)
    expect(screen.queryByText('Alice')).toBeNull()
    const moscowHeader = screen.getByText('Moscow').closest('.sg-table-group-cell') as HTMLElement
    fireEvent.click(moscowHeader)
    expect(screen.getByText('Alice')).toBeDefined()
    expect(screen.getByText('Charlie')).toBeDefined()
    expect(screen.queryByText('Bob')).toBeNull()
  })

  it('Expand All button reveals all group children', () => {
    render(<Table columns={groupedCols} data={groupedData} groupBy="city" showPagination={false} />)
    expect(screen.queryByText('Alice')).toBeNull()
    fireEvent.click(screen.getByText('Expand All'))
    expect(screen.getByText('Alice')).toBeDefined()
    expect(screen.getByText('Bob')).toBeDefined()
    expect(screen.getByText('Charlie')).toBeDefined()
    expect(screen.getByText('Dave')).toBeDefined()
  })

  it('Collapse All button hides all group children', () => {
    render(
      <Table
        columns={groupedCols}
        data={groupedData}
        groupBy="city"
        defaultGroupExpanded
        showPagination={false}
      />,
    )
    expect(screen.getByText('Alice')).toBeDefined()
    fireEvent.click(screen.getByText('Collapse All'))
    expect(screen.queryByText('Alice')).toBeNull()
    expect(screen.queryByText('Bob')).toBeNull()
  })

  it('groupByOptions toolbar dropdown switches grouping field', () => {
    const onChange = vi.fn()
    const { container } = render(
      <Table
        columns={groupedCols}
        data={groupedData}
        groupByOptions={[
          { key: 'city', label: 'City' },
          { key: 'name', label: 'Name' },
        ]}
        onGroupByChange={onChange}
        showPagination={false}
      />,
    )
    const trigger = screen.getByText('Group by')
    fireEvent.click(trigger)
    const dropdown = container.querySelector('.sg-table-group-by-dropdown')
    expect(dropdown).toBeTruthy()
    fireEvent.click(within(dropdown as HTMLElement).getByText('City'))
    expect(onChange).toHaveBeenCalledWith('city')
  })

  it('custom aggregate function value is rendered', () => {
    const cols = [
      { key: 'name', title: 'Name' },
      { key: 'city', title: 'City' },
      {
        key: 'score',
        title: 'Score',
        aggregate: (vals: unknown[]) =>
          `range:${Math.min(...(vals as number[]))}-${Math.max(...(vals as number[]))}`,
      },
    ]
    const { container } = render(
      <Table
        columns={cols}
        data={groupedData}
        groupBy="city"
        defaultGroupExpanded
        showPagination={false}
      />,
    )
    const aggs = container.querySelectorAll('.sg-table-group-agg-item')
    const texts = Array.from(aggs).map((n) => n.textContent ?? '')
    expect(texts.some((t) => t.includes('range:50-70'))).toBe(true)
    expect(texts.some((t) => t.includes('range:80-100'))).toBe(true)
  })
})

// ─── Tree ───────────────────────────────────────────────────────────────

const treeData = [
  {
    key: 'parent-1',
    title: 'Parent 1',
    children: [
      { key: 'child-1-1', title: 'Child 1-1' },
      { key: 'child-1-2', title: 'Child 1-2' },
    ],
  },
  {
    key: 'parent-2',
    title: 'Parent 2',
    children: [{ key: 'child-2-1', title: 'Child 2-1' }],
  },
]

describe('Tree', () => {
  it('renders tree nodes', () => {
    render(<Tree treeData={treeData} />)
    expect(screen.getByText('Parent 1')).toBeDefined()
    expect(screen.getByText('Parent 2')).toBeDefined()
  })

  it('expands node on switcher click', () => {
    render(<Tree treeData={treeData} />)
    const switchers = document.querySelectorAll('.sg-tree-switcher:not(.sg-tree-switcher-noop)')
    expect(switchers.length).toBeGreaterThan(0)
    fireEvent.click(switchers[0])
    expect(screen.getByText('Child 1-1')).toBeDefined()
    expect(screen.getByText('Child 1-2')).toBeDefined()
  })

  it('defaultExpandAll shows all children', () => {
    render(<Tree treeData={treeData} defaultExpandAll />)
    expect(screen.getByText('Child 1-1')).toBeDefined()
    expect(screen.getByText('Child 2-1')).toBeDefined()
  })

  it('checkable mode renders checkboxes', () => {
    render(<Tree treeData={treeData} checkable defaultExpandAll />)
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes.length).toBeGreaterThanOrEqual(5)
  })

  it('onSelect callback fires', () => {
    const onSelect = vi.fn()
    render(<Tree treeData={treeData} onSelect={onSelect} />)
    fireEvent.click(screen.getByText('Parent 1'))
    expect(onSelect).toHaveBeenCalledOnce()
    expect(onSelect.mock.calls[0][0]).toContain('parent-1')
  })

  it('onCheck callback fires', () => {
    const onCheck = vi.fn()
    render(<Tree treeData={treeData} checkable defaultExpandAll onCheck={onCheck} />)
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0])
    expect(onCheck).toHaveBeenCalledOnce()
  })

  it('empty tree shows empty text', () => {
    render(<Tree treeData={[]} />)
    expect(screen.getByText('No data')).toBeDefined()
  })

  it('showLine adds line class', () => {
    const { container } = render(<Tree treeData={treeData} showLine defaultExpandAll />)
    expect(container.querySelector('.sg-tree-show-line')).toBeTruthy()
  })

  it('directory mode renders folder icons', () => {
    render(<Tree treeData={treeData} directory defaultExpandAll />)
    expect(screen.getAllByText('📂').length).toBeGreaterThan(0)
  })

  it('unstyled mode uses roles', () => {
    const { container } = render(<Tree treeData={treeData} unstyled defaultExpandAll />)
    const items = container.querySelectorAll('[role="treeitem"]')
    expect(items.length).toBeGreaterThanOrEqual(2)
  })
})

// ─── Cascader ───────────────────────────────────────────────────────────

const cascaderOptions = [
  {
    value: 'zhejiang',
    label: 'Zhejiang',
    children: [
      {
        value: 'hangzhou',
        label: 'Hangzhou',
        children: [{ value: 'xihu', label: 'West Lake' }],
      },
    ],
  },
  {
    value: 'jiangsu',
    label: 'Jiangsu',
    children: [
      {
        value: 'nanjing',
        label: 'Nanjing',
        children: [{ value: 'zhonghua', label: 'Zhonghua Gate' }],
      },
    ],
  },
]

describe('Cascader', () => {
  it('renders with placeholder', () => {
    render(<Cascader options={cascaderOptions} placeholder="Select region" />)
    expect(screen.getByText('Select region')).toBeDefined()
  })

  it('opens dropdown on click', () => {
    const { container } = render(<Cascader options={cascaderOptions} />)
    fireEvent.click(container.querySelector('.sg-cascader-selector')!)
    expect(container.querySelector('.sg-cascader-dropdown')).toBeTruthy()
  })

  it('shows options in first column', () => {
    const { container } = render(<Cascader options={cascaderOptions} />)
    fireEvent.click(container.querySelector('.sg-cascader-selector')!)
    expect(screen.getByText('Zhejiang')).toBeDefined()
    expect(screen.getByText('Jiangsu')).toBeDefined()
  })

  it('expands child column on option click', () => {
    const { container } = render(<Cascader options={cascaderOptions} />)
    fireEvent.click(container.querySelector('.sg-cascader-selector')!)
    fireEvent.click(screen.getByText('Zhejiang'))
    expect(screen.getByText('Hangzhou')).toBeDefined()
  })

  it('fires onChange on leaf selection', () => {
    const onChange = vi.fn()
    const { container } = render(<Cascader options={cascaderOptions} onChange={onChange} />)
    fireEvent.click(container.querySelector('.sg-cascader-selector')!)
    fireEvent.click(screen.getByText('Zhejiang'))
    fireEvent.click(screen.getByText('Hangzhou'))
    fireEvent.click(screen.getByText('West Lake'))
    expect(onChange).toHaveBeenCalledWith(['zhejiang', 'hangzhou', 'xihu'], expect.any(Array))
  })

  it('displays selected value', () => {
    render(<Cascader options={cascaderOptions} value={['zhejiang', 'hangzhou', 'xihu']} />)
    expect(screen.getByText('Zhejiang / Hangzhou / West Lake')).toBeDefined()
  })

  it('allowClear shows clear button', () => {
    const { container } = render(
      <Cascader options={cascaderOptions} value={['zhejiang', 'hangzhou', 'xihu']} allowClear />,
    )
    expect(container.querySelector('.sg-cascader-clear')).toBeTruthy()
  })

  it('disabled state prevents opening', () => {
    const { container } = render(<Cascader options={cascaderOptions} disabled />)
    fireEvent.click(container.querySelector('.sg-cascader-selector')!)
    expect(container.querySelector('.sg-cascader-dropdown')).toBeNull()
  })

  it('unstyled mode renders without sg- classes', () => {
    const { container } = render(<Cascader options={cascaderOptions} unstyled />)
    expect(container.querySelector('.sg-cascader')).toBeNull()
  })
})

// ─── Transfer ───────────────────────────────────────────────────────────

const transferData = [
  { key: '1', title: 'Item 1' },
  { key: '2', title: 'Item 2' },
  { key: '3', title: 'Item 3' },
  { key: '4', title: 'Item 4' },
]

describe('Transfer', () => {
  it('renders source and target lists', () => {
    const { container } = render(<Transfer dataSource={transferData} targetKeys={['3']} />)
    const lists = container.querySelectorAll('.sg-transfer-list')
    expect(lists.length).toBe(2)
  })

  it('shows items in source list', () => {
    render(<Transfer dataSource={transferData} targetKeys={['3']} />)
    expect(screen.getByText('Item 1')).toBeDefined()
    expect(screen.getByText('Item 2')).toBeDefined()
    expect(screen.getByText('Item 4')).toBeDefined()
  })

  it('shows items in target list', () => {
    render(<Transfer dataSource={transferData} targetKeys={['3']} />)
    expect(screen.getByText('Item 3')).toBeDefined()
  })

  it('move to right button works', () => {
    const onChange = vi.fn()
    const { container } = render(
      <Transfer dataSource={transferData} targetKeys={[]} onChange={onChange} />,
    )
    const checkboxes = container.querySelectorAll(
      '.sg-transfer-list:first-child .sg-transfer-list-item',
    )
    expect(checkboxes.length).toBeGreaterThan(0)

    const firstCheck = within(checkboxes[0] as HTMLElement).getByRole('checkbox')
    fireEvent.click(firstCheck)

    const moveBtn = container.querySelectorAll('.sg-transfer-operations button')
    fireEvent.click(moveBtn[0])
    expect(onChange).toHaveBeenCalledOnce()
    expect(onChange.mock.calls[0][1]).toBe('right')
  })

  it('search filters items', () => {
    render(<Transfer dataSource={transferData} targetKeys={[]} showSearch />)
    const inputs = screen.getAllByRole('textbox')
    expect(inputs.length).toBeGreaterThanOrEqual(1)
  })

  it('disabled state prevents interaction', () => {
    const { container } = render(<Transfer dataSource={transferData} targetKeys={[]} disabled />)
    expect(container.querySelector('.sg-transfer-disabled')).toBeTruthy()
    const buttons = container.querySelectorAll('.sg-transfer-operations button')
    buttons.forEach((btn) => {
      expect((btn as HTMLButtonElement).disabled).toBe(true)
    })
  })

  it('oneWay hides left arrow button', () => {
    const { container } = render(<Transfer dataSource={transferData} targetKeys={['1']} oneWay />)
    const buttons = container.querySelectorAll('.sg-transfer-operations button')
    expect(buttons.length).toBe(1)
  })

  it('custom titles render', () => {
    render(
      <Transfer dataSource={transferData} targetKeys={[]} titles={['Available', 'Selected']} />,
    )
    expect(screen.getByText('Available')).toBeDefined()
    expect(screen.getByText('Selected')).toBeDefined()
  })

  it('unstyled mode renders without sg- classes', () => {
    const { container } = render(<Transfer dataSource={transferData} targetKeys={[]} unstyled />)
    expect(container.querySelector('.sg-transfer')).toBeNull()
  })
})

// ─── List ───────────────────────────────────────────────────────────────

const listData = ['Racing car', 'Japanese princess', 'Australian walk', 'Chinese food']

describe('List', () => {
  it('renders items', () => {
    render(<List dataSource={listData} renderItem={(item: string) => <div>{item}</div>} />)
    expect(screen.getByText('Racing car')).toBeDefined()
    expect(screen.getByText('Japanese princess')).toBeDefined()
  })

  it('shows header and footer', () => {
    render(
      <List
        dataSource={listData}
        renderItem={(item: string) => <div>{item}</div>}
        header={<div>Header</div>}
        footer={<div>Footer</div>}
      />,
    )
    expect(screen.getByText('Header')).toBeDefined()
    expect(screen.getByText('Footer')).toBeDefined()
  })

  it('empty state', () => {
    render(<List dataSource={[]} renderItem={(item: string) => <div>{item}</div>} />)
    expect(screen.getByText('No Data')).toBeDefined()
  })

  it('loading state shows spinner', () => {
    const { container } = render(
      <List dataSource={listData} renderItem={(item: string) => <div>{item}</div>} loading />,
    )
    expect(container.querySelector('.sg-list-loading')).toBeTruthy()
  })

  it('bordered adds border class', () => {
    const { container } = render(
      <List dataSource={listData} renderItem={(item: string) => <div>{item}</div>} bordered />,
    )
    expect(container.querySelector('.sg-list-bordered')).toBeTruthy()
  })

  it('grid mode applies grid layout', () => {
    const { container } = render(
      <List
        dataSource={listData}
        renderItem={(item: string) => <div>{item}</div>}
        grid={{ column: 2 }}
      />,
    )
    expect(container.querySelector('.sg-list-grid')).toBeTruthy()
  })

  it('pagination renders when configured', () => {
    render(
      <List
        dataSource={listData}
        renderItem={(item: string) => <div>{item}</div>}
        pagination={{ pageSize: 2 }}
      />,
    )
    const pag = document.querySelector('.sg-list-pagination')
    expect(pag).toBeTruthy()
  })

  it('size classes apply', () => {
    const { container } = render(
      <List dataSource={listData} renderItem={(item: string) => <div>{item}</div>} size="small" />,
    )
    expect(container.querySelector('.sg-list-small')).toBeTruthy()
  })

  it('unstyled mode works', () => {
    const { container } = render(
      <List dataSource={listData} renderItem={(item: string) => <div>{item}</div>} unstyled />,
    )
    expect(container.querySelector('.sg-list')).toBeNull()
    expect(screen.getByText('Racing car')).toBeDefined()
  })

  it('custom locale empty text', () => {
    render(
      <List
        dataSource={[]}
        renderItem={(item: string) => <div>{item}</div>}
        locale={{ emptyText: 'Nothing here' }}
      />,
    )
    expect(screen.getByText('Nothing here')).toBeDefined()
  })
})

// ─── Table export utils ─────────────────────────────────────────────────

import { toCSVString, toTSVString } from '../components/complex/Table/export'

describe('Table export utils', () => {
  it('toCSVString handles commas and quotes', () => {
    const data = [
      ['Name', 'Value'],
      ['Hello, World', '"quoted"'],
    ]
    const csv = toCSVString(data)
    expect(csv).toBe('Name,Value\n"Hello, World","""quoted"""')
  })

  it('toTSVString uses tabs', () => {
    const data = [
      ['A', 'B'],
      ['1', '2'],
    ]
    expect(toTSVString(data)).toBe('A\tB\n1\t2')
  })
})
