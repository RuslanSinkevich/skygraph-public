import { describe, it, expect } from 'vitest'
import { render, cleanup } from '@testing-library/react'
// @ts-expect-error React is needed for JSX
import React from 'react'

import { Table } from '../components/complex/Table'
import { createCore, createTable } from '@skygraph/core'

/**
 * Перф-регрессионные тесты для `<Table>` 100k rows.
 *
 * Поводом стало 12-кратное отставание от antd virtual в Wave-2 (см.
 * `docs/_streams/T-Table-Perf.md`). После рефакторинга `TableEngine`
 * (данные строк живут в private `Map<RowId, RowData>` вместо per-cell в
 * Core store) `addRows(100k)` падает с 1.4s до ~140ms. Этот файл фиксирует
 * порог как защитную сетку — если кто-то снова начнёт писать ячейки в Core
 * через `core.set` per cell, тесты упадут.
 *
 * Тесты гейтнуты `RUN_BENCH=1` (как и core-бенч в `core/__tests__/table.test.ts`),
 * потому что 100k mount в jsdom занимает заметное время и не нужен в обычном
 * `pnpm test`.
 */

const runBench = process.env.RUN_BENCH === '1'
const ROWS = 100_000

const cols = [
  { key: 'id', title: 'ID', width: 80 },
  { key: 'name', title: 'Name', width: 180 },
  { key: 'department', title: 'Department', width: 140 },
  { key: 'role', title: 'Role', width: 140 },
  { key: 'salary', title: 'Salary', width: 120 },
  { key: 'status', title: 'Status', width: 120 },
  { key: 'hiredAt', title: 'Hired', width: 120 },
]

function makeData(n: number) {
  const out = new Array(n)
  for (let i = 0; i < n; i++) {
    out[i] = {
      id: `r-${i}`,
      data: {
        id: i + 1,
        name: `Employee ${i + 1}`,
        department: ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance', 'Ops'][i % 6],
        role: ['Developer', 'Manager', 'Analyst', 'Director', 'Lead'][i % 5],
        salary: 50_000 + ((i * 137) % 250_000),
        status: ['Active', 'On Leave', 'Terminated'][i % 3],
        hiredAt: `${2010 + (i % 15)}-01-01`,
      },
    }
  }
  return out
}

describe.runIf(runBench)('Table perf — 100k rows mount', () => {
  it('addRows engine path stays under 600ms (regression guard)', () => {
    const data = makeData(ROWS)
    const core = createCore()
    const table = createTable(core)
    const t0 = performance.now()
    table.addRows(data)
    const dt = performance.now() - t0
    console.log(`  table-perf [engine.addRows ${ROWS}]: ${dt.toFixed(0)}ms`)
    // Pre-fix baseline was ~1400ms. We give 4× headroom to absorb CI noise.
    expect(dt).toBeLessThan(600)
  })

  it('virtualized mount renders < 100 rows in DOM regardless of dataset size', () => {
    const data = makeData(ROWS)
    const t0 = performance.now()
    const { container } = render(
      <Table
        columns={cols}
        data={data}
        showPagination={false}
        virtual={{ rowHeight: 40, overscan: 5 }}
        scroll={{ y: 480 }}
      />,
    )
    const mountMs = performance.now() - t0
    console.log(`  table-perf [react.mount ${ROWS}]: ${mountMs.toFixed(0)}ms`)

    const visibleRows = container.querySelectorAll('[data-sg-virtual-row-index]')
    expect(visibleRows.length).toBeLessThan(100)
    expect(visibleRows.length).toBeGreaterThan(0)

    // jsdom layout cost dominates this number (no GPU/compositor) and varies
    // wildly across machines. We only assert the virtualization itself works
    // (DOM size bounded above) and let `console.log` carry the timing for
    // human review. A hard threshold here would be flaky.
    cleanup()
  })
})

describe('Table perf — engine API parity (always-on)', () => {
  it('addRows + getVisibleRows + sort + filter still work after refactor', () => {
    const core = createCore()
    const table = createTable(core, { pageSize: 50 })

    table.addRows([
      { id: 'r1', data: { name: 'Alice', age: 30 } },
      { id: 'r2', data: { name: 'Bob', age: 25 } },
      { id: 'r3', data: { name: 'Charlie', age: 35 } },
    ])

    expect(table.getRow('r1')).toEqual({ name: 'Alice', age: 30 })
    expect(table.getCell('r2', 'age')).toBe(25)
    expect(table.getVisibleRows().map((r) => r.id)).toEqual(['r1', 'r2', 'r3'])

    table.setSort('age', 'asc')
    expect(table.getVisibleRows().map((r) => r.id)).toEqual(['r2', 'r1', 'r3'])

    table.addFilter({ column: 'age', operator: 'gte', value: 30 })
    expect(table.getVisibleRows().map((r) => r.id)).toEqual(['r1', 'r3'])

    table.updateCell('r2', 'age', 40)
    expect(table.getCell('r2', 'age')).toBe(40)
    // r2 теперь подходит под фильтр >= 30 и сортируется по возрасту asc.
    expect(table.getVisibleRows().map((r) => r.id)).toEqual(['r1', 'r3', 'r2'])

    table.removeRow('r1')
    expect(table.getRow('r1')).toBeUndefined()
    expect(table.getVisibleRows().map((r) => r.id)).toEqual(['r3', 'r2'])
  })
})
