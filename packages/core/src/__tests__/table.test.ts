import { describe, it, expect } from 'vitest'
import { createCore } from '../Core'
import { createTable } from '../engines/table/TableEngine'

describe('TableEngine: basic CRUD', () => {
  it('adds a row and retrieves it', () => {
    const core = createCore()
    const table = createTable(core)

    table.addRow('r1', { name: 'Alice', age: 30 })
    expect(table.getRow('r1')).toEqual({ name: 'Alice', age: 30 })
  })

  it('adds multiple rows at once', () => {
    const core = createCore()
    const table = createTable(core)

    table.addRows([
      { id: 'r1', data: { name: 'Alice' } },
      { id: 'r2', data: { name: 'Bob' } },
      { id: 'r3', data: { name: 'Charlie' } },
    ])

    expect(table.getAllRowIds()).toEqual(['r1', 'r2', 'r3'])
    expect(table.getTableState().totalRows).toBe(3)
  })

  it('removes a row', () => {
    const core = createCore()
    const table = createTable(core)

    table.addRow('r1', { name: 'Alice' })
    table.addRow('r2', { name: 'Bob' })
    table.removeRow('r1')

    expect(table.getAllRowIds()).toEqual(['r2'])
    expect(table.getTableState().totalRows).toBe(1)
  })

  it('updates a cell', () => {
    const core = createCore()
    const table = createTable(core)

    table.addRow('r1', { name: 'Alice', age: 30 })
    table.updateCell('r1', 'age', 31)

    expect(table.getCell('r1', 'age')).toBe(31)
    expect(table.getRow('r1')).toEqual({ name: 'Alice', age: 31 })
  })

  it('cell updates reflect in getCell', () => {
    const core = createCore()
    const table = createTable(core)

    table.addRow('r1', { name: 'Alice' })
    expect(table.getCell('r1', 'name')).toBe('Alice')

    table.updateCell('r1', 'name', 'Alicia')
    expect(table.getCell('r1', 'name')).toBe('Alicia')
    expect(table.getRow('r1')?.name).toBe('Alicia')
  })
})

describe('TableEngine: pagination', () => {
  function createLargeTable(size: number) {
    const core = createCore()
    const table = createTable(core, { pageSize: 10 })

    const rows = Array.from({ length: size }, (_, i) => ({
      id: `r${i}`,
      data: { name: `User ${i}`, value: i },
    }))
    table.addRows(rows)
    return { core, table }
  }

  it('returns first page by default', () => {
    const { table } = createLargeTable(100)
    const visible = table.getVisibleRows()

    expect(visible.length).toBe(10)
    expect(visible[0].id).toBe('r0')
    expect(visible[9].id).toBe('r9')
  })

  it('navigates to page 2', () => {
    const { table } = createLargeTable(100)
    table.setPage(2)

    const visible = table.getVisibleRows()
    expect(visible[0].id).toBe('r10')
    expect(visible[9].id).toBe('r19')
  })

  it('nextPage / prevPage', () => {
    const { table } = createLargeTable(30)

    table.nextPage()
    expect(table.getTableState().page).toBe(2)

    table.nextPage()
    expect(table.getTableState().page).toBe(3)

    table.nextPage()
    expect(table.getTableState().page).toBe(3) // clamped

    table.prevPage()
    expect(table.getTableState().page).toBe(2)
  })

  it('reports correct totalPages', () => {
    const { table } = createLargeTable(25)
    expect(table.getTableState().totalPages).toBe(3)
  })

  it('last page has correct row count', () => {
    const { table } = createLargeTable(25)
    table.setPage(3)
    expect(table.getVisibleRows().length).toBe(5)
  })
})

describe('TableEngine: sorting', () => {
  it('sorts ascending', () => {
    const core = createCore()
    const table = createTable(core, { pageSize: 100 })

    table.addRows([
      { id: 'r1', data: { name: 'Charlie' } },
      { id: 'r2', data: { name: 'Alice' } },
      { id: 'r3', data: { name: 'Bob' } },
    ])

    table.setSort('name', 'asc')
    const rows = table.getVisibleRows()
    expect(rows.map((r) => r.data.name)).toEqual(['Alice', 'Bob', 'Charlie'])
  })

  it('sorts descending', () => {
    const core = createCore()
    const table = createTable(core, { pageSize: 100 })

    table.addRows([
      { id: 'r1', data: { value: 10 } },
      { id: 'r2', data: { value: 30 } },
      { id: 'r3', data: { value: 20 } },
    ])

    table.setSort('value', 'desc')
    const rows = table.getVisibleRows()
    expect(rows.map((r) => r.data.value)).toEqual([30, 20, 10])
  })

  it('clearSort restores original order', () => {
    const core = createCore()
    const table = createTable(core, { pageSize: 100 })

    table.addRows([
      { id: 'r1', data: { name: 'Charlie' } },
      { id: 'r2', data: { name: 'Alice' } },
      { id: 'r3', data: { name: 'Bob' } },
    ])

    table.setSort('name', 'asc')
    table.clearSort()

    const rows = table.getVisibleRows()
    expect(rows.map((r) => r.id)).toEqual(['r1', 'r2', 'r3'])
  })
})

describe('TableEngine: filtering', () => {
  it('filters by exact value', () => {
    const core = createCore()
    const table = createTable(core, { pageSize: 100 })

    table.addRows([
      { id: 'r1', data: { city: 'Moscow', age: 25 } },
      { id: 'r2', data: { city: 'Berlin', age: 30 } },
      { id: 'r3', data: { city: 'Moscow', age: 35 } },
    ])

    table.addFilter({ column: 'city', value: 'Moscow' })
    const rows = table.getVisibleRows()

    expect(rows.length).toBe(2)
    expect(rows.map((r) => r.id)).toEqual(['r1', 'r3'])
  })

  it('filters by contains (string)', () => {
    const core = createCore()
    const table = createTable(core, { pageSize: 100 })

    table.addRows([
      { id: 'r1', data: { name: 'Alexander' } },
      { id: 'r2', data: { name: 'Bob' } },
      { id: 'r3', data: { name: 'Alex Jr' } },
    ])

    table.addFilter({ column: 'name', value: 'alex', operator: 'contains' })
    const rows = table.getVisibleRows()

    expect(rows.length).toBe(2)
    expect(rows.map((r) => r.id)).toEqual(['r1', 'r3'])
  })

  it('filters by numeric comparison', () => {
    const core = createCore()
    const table = createTable(core, { pageSize: 100 })

    table.addRows([
      { id: 'r1', data: { score: 50 } },
      { id: 'r2', data: { score: 80 } },
      { id: 'r3', data: { score: 70 } },
    ])

    table.addFilter({ column: 'score', value: 60, operator: 'gte' })
    const rows = table.getVisibleRows()

    expect(rows.length).toBe(2)
    expect(rows.map((r) => r.data.score)).toEqual([80, 70])
  })

  it('removeFilter restores rows', () => {
    const core = createCore()
    const table = createTable(core, { pageSize: 100 })

    table.addRows([
      { id: 'r1', data: { active: true } },
      { id: 'r2', data: { active: false } },
    ])

    table.addFilter({ column: 'active', value: true })
    expect(table.getVisibleRows().length).toBe(1)

    table.removeFilter('active')
    expect(table.getVisibleRows().length).toBe(2)
  })

  it('custom filterFn', () => {
    const core = createCore()
    const table = createTable(core, { pageSize: 100 })

    table.addRows([
      { id: 'r1', data: { x: 1, y: 2 } },
      { id: 'r2', data: { x: 5, y: 10 } },
      { id: 'r3', data: { x: 3, y: 4 } },
    ])

    table.setFilterFn((row) => (row.x as number) + (row.y as number) > 5)
    const rows = table.getVisibleRows()

    expect(rows.length).toBe(2)
    expect(rows.map((r) => r.id)).toEqual(['r2', 'r3'])
  })

  it('filter + sort combined', () => {
    const core = createCore()
    const table = createTable(core, { pageSize: 100 })

    table.addRows([
      { id: 'r1', data: { city: 'Moscow', name: 'Zara' } },
      { id: 'r2', data: { city: 'Berlin', name: 'Bob' } },
      { id: 'r3', data: { city: 'Moscow', name: 'Alice' } },
    ])

    table.addFilter({ column: 'city', value: 'Moscow' })
    table.setSort('name', 'asc')

    const rows = table.getVisibleRows()
    expect(rows.map((r) => r.data.name)).toEqual(['Alice', 'Zara'])
  })

  it('filter resets page to 1', () => {
    const core = createCore()
    const table = createTable(core, { pageSize: 2 })

    table.addRows([
      { id: 'r1', data: { x: 1 } },
      { id: 'r2', data: { x: 2 } },
      { id: 'r3', data: { x: 3 } },
      { id: 'r4', data: { x: 4 } },
    ])

    table.setPage(2)
    expect(table.getTableState().page).toBe(2)

    table.addFilter({ column: 'x', value: 1 })
    expect(table.getTableState().page).toBe(1)
  })
})

describe('TableEngine: state in core', () => {
  it('publishes table state to core', () => {
    const core = createCore()
    const table = createTable(core, { pageSize: 10 })

    table.addRows(
      Array.from({ length: 25 }, (_, i) => ({
        id: `r${i}`,
        data: { v: i },
      }))
    )

    const state = table.getTableState()
    expect(state.totalRows).toBe(25)
    expect(state.filteredRows).toBe(25)
    expect(state.totalPages).toBe(3)
    expect(state.page).toBe(1)
    expect(state.pageSize).toBe(10)
  })
})

describe('TableEngine: column widths', () => {
  it('setColumnWidth + getColumnWidth round-trip', () => {
    const core = createCore()
    const table = createTable(core)

    expect(table.getColumnWidth('name')).toBeUndefined()
    table.setColumnWidth('name', 220)
    expect(table.getColumnWidth('name')).toBe(220)
  })

  it('getColumnWidths returns all persisted widths as a snapshot', () => {
    const core = createCore()
    const table = createTable(core)

    table.setColumnWidth('a', 100)
    table.setColumnWidth('b', 250)

    const widths = table.getColumnWidths()
    expect(widths).toEqual({ a: 100, b: 250 })

    // The returned record is a copy — mutating it must not affect the engine.
    widths.a = 999
    expect(table.getColumnWidth('a')).toBe(100)
  })

  it('clearColumnWidths drops all persisted widths', () => {
    const core = createCore()
    const table = createTable(core)

    table.setColumnWidth('a', 100)
    table.setColumnWidth('b', 250)
    table.clearColumnWidths()

    expect(table.getColumnWidths()).toEqual({})
    expect(table.getColumnWidth('a')).toBeUndefined()
  })

  it('persists widths into the Core store under $table.<id>.state.columnWidths', () => {
    const core = createCore()
    const table = createTable(core)

    const observed: Array<Record<string, number>> = []
    // Find the engine's store path indirectly: the only state path holding a
    // `columnWidths` record published from the engine is what we want. Use a
    // wildcard-style subscribe by listening to each path the engine writes.
    // The engine reserves `$table.` as a prefix, so we scan keys after each
    // write via `core.snapshot()`.
    table.setColumnWidth('name', 180)
    let snap = core.snapshot()
    const key = Object.keys(snap).find(
      (k) => k.startsWith('$table.') && k.endsWith('.state.columnWidths'),
    )
    expect(key).toBeDefined()
    expect(snap[key!]).toEqual({ name: 180 })

    table.setColumnWidth('email', 240)
    snap = core.snapshot()
    expect(snap[key!]).toEqual({ name: 180, email: 240 })

    void observed
  })

  it('reset() also clears persisted column widths', () => {
    const core = createCore()
    const table = createTable(core)

    table.setColumnWidth('a', 120)
    expect(table.getColumnWidth('a')).toBe(120)

    table.reset()
    expect(table.getColumnWidths()).toEqual({})
    expect(table.getColumnWidth('a')).toBeUndefined()
  })

  it('subscribers on the columnWidths path are notified after each setColumnWidth', () => {
    const core = createCore()
    const table = createTable(core)

    table.setColumnWidth('a', 100) // ensure path exists
    const snap = core.snapshot()
    const key = Object.keys(snap).find(
      (k) => k.startsWith('$table.') && k.endsWith('.state.columnWidths'),
    )!

    const updates: Array<Record<string, number> | undefined> = []
    const unsub = core.subscribe(key, (val) => {
      updates.push(val as Record<string, number>)
    })

    table.setColumnWidth('a', 150)
    table.setColumnWidth('b', 80)

    unsub()
    expect(updates.length).toBe(2)
    expect(updates[0]).toEqual({ a: 150 })
    expect(updates[1]).toEqual({ a: 150, b: 80 })
  })
})

describe('TableEngine: advanced filter operators', () => {
  function makeTable() {
    const core = createCore()
    const table = createTable(core, { pageSize: 100 })
    table.addRows([
      { id: 'r1', data: { name: 'Alice', city: 'Moscow', score: 50, tag: 'a' } },
      { id: 'r2', data: { name: 'Bob', city: 'Berlin', score: 80, tag: 'b' } },
      { id: 'r3', data: { name: 'Charlie', city: 'Moscow', score: 70, tag: '' } },
      { id: 'r4', data: { name: 'Dave', city: 'Paris', score: 100, tag: null } },
    ])
    return table
  }

  it('eq operator', () => {
    const table = makeTable()
    table.setColumnFilter('city', { op: 'eq', value: 'Moscow' })
    expect(table.getVisibleRows().map((r) => r.id)).toEqual(['r1', 'r3'])
  })

  it('neq operator', () => {
    const table = makeTable()
    table.setColumnFilter('city', { op: 'neq', value: 'Moscow' })
    expect(table.getVisibleRows().map((r) => r.id)).toEqual(['r2', 'r4'])
  })

  it('lt operator', () => {
    const table = makeTable()
    table.setColumnFilter('score', { op: 'lt', value: 70 })
    expect(table.getVisibleRows().map((r) => r.id)).toEqual(['r1'])
  })

  it('lte operator', () => {
    const table = makeTable()
    table.setColumnFilter('score', { op: 'lte', value: 70 })
    expect(table.getVisibleRows().map((r) => r.id)).toEqual(['r1', 'r3'])
  })

  it('gt operator', () => {
    const table = makeTable()
    table.setColumnFilter('score', { op: 'gt', value: 70 })
    expect(table.getVisibleRows().map((r) => r.id)).toEqual(['r2', 'r4'])
  })

  it('gte operator', () => {
    const table = makeTable()
    table.setColumnFilter('score', { op: 'gte', value: 70 })
    expect(table.getVisibleRows().map((r) => r.id)).toEqual(['r2', 'r3', 'r4'])
  })

  it('between operator (inclusive)', () => {
    const table = makeTable()
    table.setColumnFilter('score', { op: 'between', value: [70, 90] })
    expect(table.getVisibleRows().map((r) => r.id)).toEqual(['r2', 'r3'])
  })

  it('in operator', () => {
    const table = makeTable()
    table.setColumnFilter('city', { op: 'in', value: ['Moscow', 'Paris'] })
    expect(table.getVisibleRows().map((r) => r.id)).toEqual(['r1', 'r3', 'r4'])
  })

  it('notIn operator', () => {
    const table = makeTable()
    table.setColumnFilter('city', { op: 'notIn', value: ['Moscow', 'Paris'] })
    expect(table.getVisibleRows().map((r) => r.id)).toEqual(['r2'])
  })

  it('contains operator (case-insensitive)', () => {
    const table = makeTable()
    table.setColumnFilter('name', { op: 'contains', value: 'AL' })
    expect(table.getVisibleRows().map((r) => r.id)).toEqual(['r1'])
  })

  it('startsWith operator', () => {
    const table = makeTable()
    table.setColumnFilter('name', { op: 'startsWith', value: 'b' })
    expect(table.getVisibleRows().map((r) => r.id)).toEqual(['r2'])
  })

  it('endsWith operator', () => {
    const table = makeTable()
    table.setColumnFilter('name', { op: 'endsWith', value: 'e' })
    expect(table.getVisibleRows().map((r) => r.id)).toEqual(['r1', 'r3', 'r4'])
  })

  it('isEmpty operator (matches null and "")', () => {
    const table = makeTable()
    table.setColumnFilter('tag', { op: 'isEmpty' })
    expect(table.getVisibleRows().map((r) => r.id)).toEqual(['r3', 'r4'])
  })

  it('isNotEmpty operator', () => {
    const table = makeTable()
    table.setColumnFilter('tag', { op: 'isNotEmpty' })
    expect(table.getVisibleRows().map((r) => r.id)).toEqual(['r1', 'r2'])
  })

  it('setColumnFilter(null) clears the column filter', () => {
    const table = makeTable()
    table.setColumnFilter('city', { op: 'eq', value: 'Moscow' })
    expect(table.getVisibleRows().length).toBe(2)
    table.setColumnFilter('city', null)
    expect(table.getVisibleRows().length).toBe(4)
  })

  it('setColumnFilter accepts ColumnFilter shape (legacy)', () => {
    const table = makeTable()
    table.setColumnFilter('score', { column: 'score', operator: 'gte', value: 80 })
    expect(table.getVisibleRows().map((r) => r.id)).toEqual(['r2', 'r4'])
  })

  it('addFilter with array value behaves as `in` (backward-compat)', () => {
    const table = makeTable()
    table.addFilter({ column: 'city', value: ['Moscow', 'Berlin'] })
    expect(table.getVisibleRows().map((r) => r.id)).toEqual(['r1', 'r2', 'r3'])
  })
})

describe('TableEngine: groupBy', () => {
  function makeTable() {
    const core = createCore()
    const table = createTable(core, { pageSize: 100 })
    table.addRows([
      { id: 'r1', data: { name: 'Alice', city: 'Moscow', score: 50 } },
      { id: 'r2', data: { name: 'Bob', city: 'Berlin', score: 80 } },
      { id: 'r3', data: { name: 'Charlie', city: 'Moscow', score: 70 } },
      { id: 'r4', data: { name: 'Dave', city: 'Berlin', score: 100 } },
      { id: 'r5', data: { name: 'Eve', city: 'Paris', score: 60 } },
    ])
    return table
  }

  it('groups rows by field', () => {
    const table = makeTable()
    table.groupBy('city')
    const g = table.getGroups()
    expect(g.length).toBe(3)
    expect(g.map((x) => x.key)).toEqual(['Moscow', 'Berlin', 'Paris'])
  })

  it('group rows contain matching ids in original order', () => {
    const table = makeTable()
    table.groupBy('city')
    const moscow = table.getGroups().find((g) => g.key === 'Moscow')!
    expect(moscow.rows).toEqual(['r1', 'r3'])
  })

  it('group value preserves raw type', () => {
    const core = createCore()
    const table = createTable(core, { pageSize: 100 })
    table.addRows([
      { id: 'a', data: { active: true, n: 1 } },
      { id: 'b', data: { active: false, n: 2 } },
      { id: 'c', data: { active: true, n: 3 } },
    ])
    table.groupBy('active')
    const groups = table.getGroups()
    expect(groups.length).toBe(2)
    expect(groups.find((g) => g.key === 'true')!.value).toBe(true)
    expect(groups.find((g) => g.key === 'false')!.value).toBe(false)
  })

  it('null group falls into __null__ key', () => {
    const core = createCore()
    const table = createTable(core, { pageSize: 100 })
    table.addRows([
      { id: 'a', data: { x: 'A', n: 1 } },
      { id: 'b', data: { x: null, n: 2 } },
      { id: 'c', data: { x: null, n: 3 } },
    ])
    table.groupBy('x')
    const groups = table.getGroups()
    expect(groups.find((g) => g.key === '__null__')!.rows).toEqual(['b', 'c'])
  })

  it('clearGroupBy removes groups', () => {
    const table = makeTable()
    table.groupBy('city')
    expect(table.getGroups().length).toBe(3)
    table.clearGroupBy()
    expect(table.getGroups().length).toBe(0)
    expect(table.getGroupBy()).toBeNull()
  })

  it('groupBy(null) is equivalent to clearGroupBy', () => {
    const table = makeTable()
    table.groupBy('city')
    table.groupBy(null)
    expect(table.getGroups().length).toBe(0)
  })

  it('groups respect active filters', () => {
    const table = makeTable()
    table.groupBy('city')
    table.setColumnFilter('score', { op: 'gte', value: 70 })
    const groups = table.getGroups()
    expect(groups.find((g) => g.key === 'Moscow')!.rows).toEqual(['r3'])
    expect(groups.find((g) => g.key === 'Berlin')!.rows).toEqual(['r2', 'r4'])
    expect(groups.find((g) => g.key === 'Paris')).toBeUndefined()
  })

  it('groups recompute after addRow', () => {
    const table = makeTable()
    table.groupBy('city')
    table.addRow('r6', { name: 'Frank', city: 'Moscow', score: 40 })
    const moscow = table.getGroups().find((g) => g.key === 'Moscow')!
    expect(moscow.rows).toEqual(['r1', 'r3', 'r6'])
  })

  it('getTableState exposes groupBy and groupCount', () => {
    const table = makeTable()
    table.groupBy('city')
    const state = table.getTableState()
    expect(state.groupBy).toBe('city')
    expect(state.groupCount).toBe(3)
  })

  it('getGroups returns deep copies', () => {
    const table = makeTable()
    table.groupBy('city')
    const snap = table.getGroups()
    snap[0].rows.push('zzz')
    expect(table.getGroups()[0].rows).not.toContain('zzz')
  })
})

describe('TableEngine: aggregates', () => {
  function makeTable() {
    const core = createCore()
    const table = createTable(core, { pageSize: 100 })
    table.addRows([
      { id: 'r1', data: { city: 'Moscow', score: 50 } },
      { id: 'r2', data: { city: 'Berlin', score: 80 } },
      { id: 'r3', data: { city: 'Moscow', score: 70 } },
      { id: 'r4', data: { city: 'Berlin', score: 100 } },
    ])
    return table
  }

  it('sum aggregate', () => {
    const table = makeTable()
    table.groupBy('city', [{ column: 'score', type: 'sum' }])
    const moscow = table.getGroups().find((g) => g.key === 'Moscow')!
    const berlin = table.getGroups().find((g) => g.key === 'Berlin')!
    expect(moscow.aggregates.score).toBe(120)
    expect(berlin.aggregates.score).toBe(180)
  })

  it('avg aggregate', () => {
    const table = makeTable()
    table.groupBy('city', [{ column: 'score', type: 'avg' }])
    const moscow = table.getGroups().find((g) => g.key === 'Moscow')!
    const berlin = table.getGroups().find((g) => g.key === 'Berlin')!
    expect(moscow.aggregates.score).toBe(60)
    expect(berlin.aggregates.score).toBe(90)
  })

  it('min / max aggregates', () => {
    const table = makeTable()
    table.groupBy('city', [
      { column: 'score', type: 'min' },
    ])
    expect(
      table.getGroups().find((g) => g.key === 'Moscow')!.aggregates.score,
    ).toBe(50)

    table.groupBy('city', [{ column: 'score', type: 'max' }])
    expect(
      table.getGroups().find((g) => g.key === 'Berlin')!.aggregates.score,
    ).toBe(100)
  })

  it('count aggregate counts all rows in group', () => {
    const table = makeTable()
    table.groupBy('city', [{ column: 'score', type: 'count' }])
    expect(
      table.getGroups().find((g) => g.key === 'Moscow')!.aggregates.score,
    ).toBe(2)
  })

  it('custom aggregate function', () => {
    const table = makeTable()
    table.groupBy('city', [
      {
        column: 'score',
        type: (vals) => `range:${Math.min(...(vals as number[]))}-${Math.max(...(vals as number[]))}`,
      },
    ])
    expect(
      table.getGroups().find((g) => g.key === 'Moscow')!.aggregates.score,
    ).toBe('range:50-70')
  })

  it('aggregates recompute after filter change', () => {
    const table = makeTable()
    table.groupBy('city', [{ column: 'score', type: 'sum' }])
    table.setColumnFilter('score', { op: 'gt', value: 50 })
    const moscow = table.getGroups().find((g) => g.key === 'Moscow')!
    expect(moscow.aggregates.score).toBe(70)
  })
})

// `100k rows` is a benchmark, not a correctness test. It dominates the
// total `vitest run` time (~7-13s on dev hardware), so we gate it behind
// the `RUN_BENCH=1` env flag. Default `pnpm -r test` skips the block;
// `pnpm --filter @skygraph/core test:bench` runs it.
const runBench = process.env.RUN_BENCH === '1'
describe.runIf(runBench)('TableEngine: scalability', () => {
  it('handles 100k rows', () => {
    const core = createCore()
    const table = createTable(core, { pageSize: 50 })

    const start = performance.now()
    const rows = Array.from({ length: 100_000 }, (_, i) => ({
      id: `r${i}`,
      data: { name: `User ${i}`, value: Math.random() * 1000 },
    }))
    table.addRows(rows)
    const addTime = performance.now() - start

    const start2 = performance.now()
    const visible = table.getVisibleRows()
    const visibleTime = performance.now() - start2

    const start3 = performance.now()
    table.setSort('value', 'desc')
    const sortTime = performance.now() - start3

    const start4 = performance.now()
    table.addFilter({ column: 'value', value: 500, operator: 'gte' })
    const filterTime = performance.now() - start4

    console.log(
      `  100k addRows: ${addTime.toFixed(0)}ms, ` +
        `getVisible: ${visibleTime.toFixed(1)}ms, ` +
        `sort: ${sortTime.toFixed(0)}ms, ` +
        `filter: ${filterTime.toFixed(0)}ms`
    )

    expect(visible.length).toBe(50)
    expect(table.getTableState().totalRows).toBe(100_000)
    expect(addTime).toBeLessThan(10000)
  })
})
