import { describe, it, expect, vi } from 'vitest'
import { createCore } from '../Core'

describe('Core: get/set', () => {
  it('returns undefined for unset path', () => {
    const core = createCore()
    expect(core.get('user.name')).toBeUndefined()
  })

  it('stores and retrieves a value', () => {
    const core = createCore()
    core.set('user.name', 'Ruslan')
    expect(core.get('user.name')).toBe('Ruslan')
  })

  it('overwrites existing value', () => {
    const core = createCore()
    core.set('count', 1)
    core.set('count', 2)
    expect(core.get('count')).toBe(2)
  })

  it('does not notify when value unchanged (Object.is)', () => {
    const core = createCore()
    const cb = vi.fn()
    core.set('x', 1)
    core.subscribe('x', cb)
    core.set('x', 1)
    expect(cb).not.toHaveBeenCalled()
  })
})

describe('Core: subscribe', () => {
  it('notifies subscriber on change', () => {
    const core = createCore()
    const cb = vi.fn()
    core.subscribe('user.name', cb)
    core.set('user.name', 'Ruslan')
    expect(cb).toHaveBeenCalledWith('Ruslan')
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('does not notify after unsubscribe', () => {
    const core = createCore()
    const cb = vi.fn()
    const unsub = core.subscribe('x', cb)
    unsub()
    core.set('x', 42)
    expect(cb).not.toHaveBeenCalled()
  })

  it('notifies only the correct path', () => {
    const core = createCore()
    const cbA = vi.fn()
    const cbB = vi.fn()
    core.subscribe('a', cbA)
    core.subscribe('b', cbB)
    core.set('a', 1)
    expect(cbA).toHaveBeenCalledWith(1)
    expect(cbB).not.toHaveBeenCalled()
  })

  it('supports multiple subscribers on same path', () => {
    const core = createCore()
    const cb1 = vi.fn()
    const cb2 = vi.fn()
    core.subscribe('x', cb1)
    core.subscribe('x', cb2)
    core.set('x', 'hello')
    expect(cb1).toHaveBeenCalledWith('hello')
    expect(cb2).toHaveBeenCalledWith('hello')
  })
})

describe('Core: batch', () => {
  it('defers notifications until batch ends', () => {
    const core = createCore()
    const cb = vi.fn()
    core.subscribe('a', cb)
    core.subscribe('b', vi.fn())

    core.batch(() => {
      core.set('a', 1)
      core.set('b', 2)
      expect(cb).not.toHaveBeenCalled()
    })

    expect(cb).toHaveBeenCalledTimes(1)
    expect(cb).toHaveBeenCalledWith(1)
  })

  it('notifies with final value when set multiple times in batch', () => {
    const core = createCore()
    const cb = vi.fn()
    core.subscribe('x', cb)

    core.batch(() => {
      core.set('x', 1)
      core.set('x', 2)
      core.set('x', 3)
    })

    expect(cb).toHaveBeenCalledTimes(1)
    expect(cb).toHaveBeenCalledWith(3)
  })

  it('supports nested batches', () => {
    const core = createCore()
    const cb = vi.fn()
    core.subscribe('x', cb)

    core.batch(() => {
      core.set('x', 1)
      core.batch(() => {
        core.set('x', 2)
      })
      expect(cb).not.toHaveBeenCalled()
    })

    expect(cb).toHaveBeenCalledTimes(1)
    expect(cb).toHaveBeenCalledWith(2)
  })
})

describe('Core: transaction', () => {
  it('applies all changes atomically', () => {
    const core = createCore()
    const cbA = vi.fn()
    const cbB = vi.fn()
    core.subscribe('a', cbA)
    core.subscribe('b', cbB)

    core.transaction(() => {
      core.set('a', 10)
      core.set('b', 20)
      expect(cbA).not.toHaveBeenCalled()
      expect(cbB).not.toHaveBeenCalled()
    })

    expect(cbA).toHaveBeenCalledWith(10)
    expect(cbB).toHaveBeenCalledWith(20)
    expect(core.get('a')).toBe(10)
    expect(core.get('b')).toBe(20)
  })

  it('rolls back on error', () => {
    const core = createCore()
    core.set('x', 'original')

    expect(() => {
      core.transaction(() => {
        core.set('x', 'changed')
        throw new Error('boom')
      })
    }).toThrow('boom')

    expect(core.get('x')).toBe('original')
  })

  it('drops unchanged values', () => {
    const core = createCore()
    core.set('x', 42)
    const cb = vi.fn()
    core.subscribe('x', cb)

    core.transaction(() => {
      core.set('x', 42)
    })

    expect(cb).not.toHaveBeenCalled()
  })
})

describe('Core: computed', () => {
  it('computes initial value from deps', () => {
    const core = createCore()
    core.set('price', 10)
    core.set('qty', 3)
    core.computed('total', ['price', 'qty'], (p, q) => (p as number) * (q as number))
    expect(core.get('total')).toBe(30)
  })

  it('recomputes when dependency changes', () => {
    const core = createCore()
    core.set('price', 10)
    core.set('qty', 3)
    core.computed('total', ['price', 'qty'], (p, q) => (p as number) * (q as number))

    core.set('price', 20)
    expect(core.get('total')).toBe(60)
  })

  it('notifies subscribers of computed value', () => {
    const core = createCore()
    core.set('a', 1)
    core.set('b', 2)
    core.computed('sum', ['a', 'b'], (a, b) => (a as number) + (b as number))

    const cb = vi.fn()
    core.subscribe('sum', cb)

    core.set('a', 10)
    expect(cb).toHaveBeenCalledWith(12)
  })

  it('chains computed values', () => {
    const core = createCore()
    core.set('x', 2)
    core.computed('double', ['x'], (x) => (x as number) * 2)
    core.computed('quad', ['double'], (d) => (d as number) * 2)

    expect(core.get('double')).toBe(4)
    expect(core.get('quad')).toBe(8)

    core.set('x', 5)
    expect(core.get('double')).toBe(10)
    expect(core.get('quad')).toBe(20)
  })

  it('detects cycles and throws', () => {
    const core = createCore()
    core.set('a', 1)
    core.computed('b', ['a'], (a) => a)

    expect(() => {
      core.computed('a', ['b'], (b) => b)
    }).toThrow(/circular dependency/)
  })

  it('works within transaction', () => {
    const core = createCore()
    core.set('price', 10)
    core.set('qty', 2)
    core.computed('total', ['price', 'qty'], (p, q) => (p as number) * (q as number))

    const cb = vi.fn()
    core.subscribe('total', cb)

    core.transaction(() => {
      core.set('price', 100)
      core.set('qty', 5)
    })

    expect(core.get('total')).toBe(500)
    expect(cb).toHaveBeenCalledWith(500)
    expect(cb).toHaveBeenCalledTimes(1)
  })
})
