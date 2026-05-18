/**
 * Subpath exports smoke tests.
 *
 * `@skygraph/core` exposes per-engine subpaths (`./table`, `./tree`,
 * `./virtual`, `./graph`, plus the legacy `./form` and the package root).
 * These tests guard the contract by importing each subpath through the
 * corresponding `engines/<X>/index.ts` barrel — the same file that
 * `tsup` consumes as an entry point.
 *
 * If any of these imports break, downstream consumers using
 * `import { TableEngine } from '@skygraph/core/table'` will silently fail
 * at typecheck time (or worse, at bundle time for some bundlers). We
 * cover both factory presence and a couple of public type surfaces.
 */
import { describe, it, expect } from 'vitest'

import { createCore } from '../Core'
// All factories live under their respective subpath barrel.
import { createForm } from '../engines/form/index'
import { createTable, matchesOperator, computeAggregate } from '../engines/table/index'
import { createTree } from '../engines/tree/index'
import { createVirtual } from '../engines/virtual/index'
import { createGraph, routeOrthogonal, pointsToPath, aabbFromOBB } from '../engines/graph/index'
import { createCalendar, detectConflicts, isAvailable } from '../engines/calendar/index'

describe('subpath barrels expose stable factories', () => {
  it('@skygraph/core/form → createForm', () => {
    expect(typeof createForm).toBe('function')
  })

  it('@skygraph/core/table → createTable + helpers', () => {
    expect(typeof createTable).toBe('function')
    expect(typeof matchesOperator).toBe('function')
    expect(typeof computeAggregate).toBe('function')
  })

  it('@skygraph/core/tree → createTree', () => {
    expect(typeof createTree).toBe('function')
  })

  it('@skygraph/core/virtual → createVirtual', () => {
    expect(typeof createVirtual).toBe('function')
  })

  it('@skygraph/core/graph → createGraph + routing helpers', () => {
    expect(typeof createGraph).toBe('function')
    expect(typeof routeOrthogonal).toBe('function')
    expect(typeof pointsToPath).toBe('function')
    expect(typeof aabbFromOBB).toBe('function')
  })

  it('@skygraph/core/calendar → createCalendar + helpers', () => {
    expect(typeof createCalendar).toBe('function')
    expect(typeof detectConflicts).toBe('function')
    expect(typeof isAvailable).toBe('function')
  })
})

describe('subpath barrels: factories actually instantiate', () => {
  it('createTable (subpath import) yields a working engine', () => {
    const core = createCore()
    const table = createTable(core)
    table.addRow('r1', { name: 'a' })
    expect(table.getTableState().totalRows).toBe(1)
    expect(table.getRow('r1')).toEqual({ name: 'a' })
  })

  it('createVirtual (subpath import) yields a working engine', () => {
    const v = createVirtual({ itemCount: 100, itemHeight: 30 })
    expect(v.itemCount).toBe(100)
    expect(v.totalHeight).toBe(3000)
    const range = v.getRange(0, 200)
    expect(range.startIndex).toBe(0)
    expect(range.visibleItems.length).toBeGreaterThan(0)
  })

  it('createGraph (subpath import) yields a working engine', () => {
    const core = createCore()
    const g = createGraph(core)
    g.addNode({ id: 'a', transform: { x: 0, y: 0 } })
    expect(g.getNode('a')).toBeDefined()
    expect(g.getState().nodes.size).toBe(1)
  })

  it('createCalendar (subpath import) yields a working engine', () => {
    const core = createCore()
    const cal = createCalendar(core)
    cal.addResource({ id: 'r1', name: 'R1' })
    cal.addAssignment({ id: 'a1', resourceId: 'r1', start: 0, end: 100, title: 'A' })
    expect(cal.getAssignments().length).toBe(1)
    expect(cal.getConflicts()).toEqual([])
  })

  it('routeOrthogonal (subpath import) returns a valid L-route fallback', () => {
    // `Point` is a `[x, y]` tuple, not an object — guard against accidental
    // shape drift in the subpath barrel.
    const points = routeOrthogonal([0, 0], [100, 50])
    expect(points.length).toBeGreaterThanOrEqual(2)
    expect(points[0]).toEqual([0, 0])
    expect(points[points.length - 1]).toEqual([100, 50])
    // pointsToPath should produce a valid SVG `d` from the same tuple shape.
    expect(pointsToPath(points)).toMatch(/^M 0 0 L /)
  })
})
