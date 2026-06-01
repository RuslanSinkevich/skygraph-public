/**
 * Проверки стилевого контракта (`docs/styling-contract.md` §4).
 *
 * Каждый тест рендерит компонент и убеждается, что заявленные слоты
 * присутствуют в DOM + что пропы `classNames` и `styles` доезжают до
 * соответствующих узлов.
 */

import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
// @ts-expect-error React is needed for JSX
import React from 'react'

import { Table } from '../components/complex/Table'
import { List } from '../components/complex/List'
import { Tree } from '../components/complex/Tree'
import { Modal } from '../components/ui/Modal'
import { Drawer } from '../components/ui/Drawer'
import { Tabs } from '../components/ui/Tabs'
import { Menu } from '../components/ui/Menu'

const tableCols = [
  { key: 'name', title: 'Name', sortable: true },
  { key: 'age', title: 'Age' },
]

const tableData = [
  { id: '1', data: { name: 'Alice', age: 30 } },
  { id: '2', data: { name: 'Bob', age: 25 } },
]

describe('Table — styling contract', () => {
  it('default render exposes declared slot classes in DOM', () => {
    const { container } = render(
      <Table
        columns={tableCols}
        data={tableData}
        searchable
        showPagination={false}
      />,
    )
    expect(container.querySelector('.sg-table-wrapper')).toBeTruthy()
    expect(container.querySelector('.sg-table-toolbar')).toBeTruthy()
    expect(container.querySelector('.sg-table-scroll')).toBeTruthy()
    expect(container.querySelector('.sg-table-grid')).toBeTruthy()
    expect(container.querySelector('.sg-table-th')).toBeTruthy()
    expect(container.querySelector('.sg-table-th-content')).toBeTruthy()
    expect(container.querySelector('.sg-table-row')).toBeTruthy()
    expect(container.querySelector('.sg-table-td')).toBeTruthy()
  })

  it('empty state exposes `.sg-table-empty`', () => {
    const { container } = render(
      <Table columns={tableCols} data={[]} showPagination={false} />,
    )
    expect(container.querySelector('.sg-table-empty')).toBeTruthy()
  })

  it('`classNames` prop reaches declared slots', () => {
    const { container } = render(
      <Table
        columns={tableCols}
        data={tableData}
        searchable
        showPagination={false}
        classNames={{
          root: 'test-root',
          toolbar: 'test-toolbar',
          scroll: 'test-scroll',
          grid: 'test-grid',
          headerCell: 'test-th',
          headerCellContent: 'test-th-content',
          row: 'test-row',
          bodyCell: 'test-td',
        }}
      />,
    )
    expect(container.querySelector('.sg-table-wrapper.test-root')).toBeTruthy()
    expect(container.querySelector('.sg-table-toolbar.test-toolbar')).toBeTruthy()
    expect(container.querySelector('.sg-table-scroll.test-scroll')).toBeTruthy()
    expect(container.querySelector('.sg-table-grid.test-grid')).toBeTruthy()
    expect(container.querySelector('.sg-table-th.test-th')).toBeTruthy()
    expect(container.querySelector('.sg-table-th-content.test-th-content')).toBeTruthy()
    expect(container.querySelector('.sg-table-row.test-row')).toBeTruthy()
    expect(container.querySelector('.sg-table-td.test-td')).toBeTruthy()
  })

  it('`styles` prop reaches declared slots', () => {
    const { container } = render(
      <Table
        columns={tableCols}
        data={tableData}
        showPagination={false}
        styles={{
          root: { outline: '1px solid red' },
          headerCell: { fontSize: '20px' },
        }}
      />,
    )
    const wrapper = container.querySelector('.sg-table-wrapper') as HTMLElement
    expect(wrapper?.style.outline).toContain('red')
    const th = container.querySelector('.sg-table-th') as HTMLElement
    expect(th?.style.fontSize).toBe('20px')
  })

  it('`column.headerClassName` applies to specific header cell', () => {
    const cols = [
      { key: 'name', title: 'Name', headerClassName: 'th-name' },
      { key: 'age', title: 'Age' },
    ]
    const { container } = render(
      <Table columns={cols} data={tableData} showPagination={false} />,
    )
    const headers = container.querySelectorAll('.sg-table-th')
    const withClass = Array.from(headers).filter((h) => h.classList.contains('th-name'))
    expect(withClass.length).toBe(1)
  })
})

describe('List — styling contract', () => {
  it('default render exposes declared slot classes', () => {
    const { container } = render(
      <List
        dataSource={[1, 2, 3]}
        renderItem={(n: number) => <List.Item>{n}</List.Item>}
        header="Header"
        footer="Footer"
      />,
    )
    expect(container.querySelector('.sg-list')).toBeTruthy()
    expect(container.querySelector('.sg-list-header')).toBeTruthy()
    expect(container.querySelector('.sg-list-footer')).toBeTruthy()
    expect(container.querySelector('.sg-list-items')).toBeTruthy()
    expect(container.querySelector('.sg-list-item')).toBeTruthy()
  })

  it('empty state exposes `.sg-list-empty`', () => {
    const { container } = render(
      <List dataSource={[]} renderItem={() => null} />,
    )
    expect(container.querySelector('.sg-list-empty')).toBeTruthy()
  })

  it('`classNames` prop reaches slots', () => {
    const { container } = render(
      <List
        dataSource={[1]}
        renderItem={(n: number) => <List.Item>{n}</List.Item>}
        header="h"
        footer="f"
        classNames={{
          root: 'x-root',
          header: 'x-header',
          footer: 'x-footer',
          items: 'x-items',
        }}
      />,
    )
    expect(container.querySelector('.sg-list.x-root')).toBeTruthy()
    expect(container.querySelector('.sg-list-header.x-header')).toBeTruthy()
    expect(container.querySelector('.sg-list-footer.x-footer')).toBeTruthy()
    expect(container.querySelector('.sg-list-items.x-items')).toBeTruthy()
  })
})

describe('Tree — styling contract', () => {
  it('root and nodes expose `.sg-tree` and `.sg-tree-node`', () => {
    const { container } = render(
      <Tree
        treeData={[
          { key: 'a', title: 'A', children: [{ key: 'a1', title: 'A1' }] },
        ]}
        defaultExpandAll
      />,
    )
    expect(container.querySelector('.sg-tree')).toBeTruthy()
    expect(container.querySelectorAll('.sg-tree-node').length).toBeGreaterThan(0)
  })
})

describe('Modal — styling contract', () => {
  it('body exposes `.sg-modal-mask` and `.sg-modal`', () => {
    const { baseElement } = render(
      <Modal open title="Title" onClose={() => {}}>
        body
      </Modal>,
    )
    expect(baseElement.querySelector('.sg-modal-mask')).toBeTruthy()
    expect(baseElement.querySelector('.sg-modal')).toBeTruthy()
  })
})

describe('Drawer — styling contract', () => {
  it('body exposes `.sg-drawer-mask` and `.sg-drawer`', () => {
    const { baseElement } = render(
      <Drawer open onClose={() => {}}>
        body
      </Drawer>,
    )
    expect(baseElement.querySelector('.sg-drawer-mask')).toBeTruthy()
    expect(baseElement.querySelector('.sg-drawer')).toBeTruthy()
  })
})

describe('Tabs — styling contract', () => {
  it('root exposes `.sg-tabs` with bar and content', () => {
    const { container } = render(
      <Tabs
        items={[
          { key: 'a', label: 'A', children: 'AA' },
          { key: 'b', label: 'B', children: 'BB' },
        ]}
      />,
    )
    expect(container.querySelector('.sg-tabs')).toBeTruthy()
    expect(container.querySelector('.sg-tabs-card')).toBeTruthy()
    expect(container.querySelector('.sg-tabs-nav')).toBeTruthy()
    expect(container.querySelector('.sg-tabs-tab')).toBeTruthy()
    expect(container.querySelector('.sg-tabs-content')).toBeTruthy()
  })
})

describe('Menu — styling contract', () => {
  it('root exposes `.sg-menu` and items', () => {
    const { container } = render(
      <Menu
        items={[
          { key: '1', label: 'one' },
          { key: '2', label: 'two' },
        ]}
      />,
    )
    expect(container.querySelector('.sg-menu')).toBeTruthy()
    expect(container.querySelectorAll('.sg-menu-item').length).toBeGreaterThanOrEqual(2)
  })
})
