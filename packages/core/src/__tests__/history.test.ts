import { describe, it, expect, vi } from 'vitest'
import { createCore } from '../Core'
import { createHistory } from '../plugins/history'

describe('HistoryPlugin', () => {
  it('records user writes', () => {
    const core = createCore()
    const h = createHistory(core)

    core.set('a', 1)
    core.set('b', 2)

    expect(h.entries).toHaveLength(2)
    expect(h.cursor).toBe(1)
  })

  it('undo restores previous value', () => {
    const core = createCore()
    const h = createHistory(core)

    core.set('x', 1)
    core.set('x', 2)

    h.undo()
    expect(core.get('x')).toBe(1)
    expect(h.cursor).toBe(0)
  })

  it('redo re-applies value', () => {
    const core = createCore()
    const h = createHistory(core)

    core.set('x', 1)
    core.set('x', 2)

    h.undo()
    h.redo()
    expect(core.get('x')).toBe(2)
    expect(h.cursor).toBe(1)
  })

  it('undo all the way to initial state', () => {
    const core = createCore()
    const h = createHistory(core)

    core.set('x', 10)
    core.set('x', 20)

    h.undo()
    h.undo()
    expect(core.get('x')).toBe(undefined)
    expect(h.canUndo).toBe(false)
    expect(h.canRedo).toBe(true)
  })

  it('new write after undo truncates future', () => {
    const core = createCore()
    const h = createHistory(core)

    core.set('x', 1)
    core.set('x', 2)
    core.set('x', 3)

    h.undo()
    h.undo()

    core.set('x', 99)
    expect(h.entries).toHaveLength(2)
    expect(h.cursor).toBe(1)
    expect(core.get('x')).toBe(99)
    expect(h.canRedo).toBe(false)
  })

  it('jumpTo moves to specific entry', () => {
    const core = createCore()
    const h = createHistory(core)

    core.set('x', 1)
    core.set('x', 2)
    core.set('x', 3)
    core.set('x', 4)

    h.jumpTo(1)
    expect(core.get('x')).toBe(2)
    expect(h.cursor).toBe(1)

    h.jumpTo(3)
    expect(core.get('x')).toBe(4)
    expect(h.cursor).toBe(3)
  })

  it('does not record computed propagation as separate entry', () => {
    const core = createCore()
    const h = createHistory(core)

    core.set('a', 1)
    core.set('b', 2)
    core.computed('sum', ['a', 'b'], (a, b) => (a as number) + (b as number))

    const before = h.entries.length
    core.set('a', 10)

    expect(h.entries.length).toBe(before + 1)
    const lastEntry = h.entries[h.entries.length - 1]
    expect(lastEntry.patches).toHaveLength(1)
    expect(lastEntry.patches[0].path).toBe('a')
  })

  it('respects maxEntries option', () => {
    const core = createCore()
    const h = createHistory(core, { maxEntries: 3 })

    core.set('a', 1)
    core.set('a', 2)
    core.set('a', 3)
    core.set('a', 4)
    core.set('a', 5)

    expect(h.entries).toHaveLength(3)
  })

  it('respects filter option', () => {
    const core = createCore()
    const h = createHistory(core, {
      filter: (e) => e.path.startsWith('track.'),
    })

    core.set('ignore', 1)
    core.set('track.a', 2)
    core.set('track.b', 3)

    expect(h.entries).toHaveLength(2)
  })

  it('clear resets history', () => {
    const core = createCore()
    const h = createHistory(core)

    core.set('a', 1)
    core.set('b', 2)
    h.clear()

    expect(h.entries).toHaveLength(0)
    expect(h.cursor).toBe(-1)
    expect(h.canUndo).toBe(false)
    expect(h.canRedo).toBe(false)
  })

  it('destroy removes middleware and clears', () => {
    const core = createCore()
    const h = createHistory(core)

    core.set('a', 1)
    h.destroy()

    core.set('b', 2)
    expect(h.entries).toHaveLength(0)
  })

  it('canUndo / canRedo flags', () => {
    const core = createCore()
    const h = createHistory(core)

    expect(h.canUndo).toBe(false)
    expect(h.canRedo).toBe(false)

    core.set('x', 1)
    expect(h.canUndo).toBe(true)
    expect(h.canRedo).toBe(false)

    h.undo()
    expect(h.canUndo).toBe(false)
    expect(h.canRedo).toBe(true)
  })

  it('undo/redo notifies subscribers', () => {
    const core = createCore()
    const h = createHistory(core)

    core.set('x', 1)
    core.set('x', 2)

    const cb = vi.fn()
    core.subscribe('x', cb)

    h.undo()
    expect(cb).toHaveBeenCalledWith(1)

    h.redo()
    expect(cb).toHaveBeenCalledWith(2)
  })

  it('groupWindow batches rapid writes', async () => {
    const core = createCore()
    const h = createHistory(core, { groupWindow: 50 })

    core.set('a', 1)
    core.set('b', 2)
    core.set('c', 3)

    await new Promise((r) => setTimeout(r, 100))

    expect(h.entries).toHaveLength(1)
    expect(h.entries[0].patches).toHaveLength(3)
  })

  it('transaction writes grouped as single entry', () => {
    const core = createCore()
    const h = createHistory(core)

    core.transaction(() => {
      core.set('a', 1)
      core.set('b', 2)
      core.set('c', 3)
    })

    expect(h.entries).toHaveLength(3)
  })
})
