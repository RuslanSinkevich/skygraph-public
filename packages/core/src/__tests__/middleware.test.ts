import { describe, it, expect, vi } from 'vitest'
import { createCore } from '../Core'
import { loggerMiddleware } from '../middleware/logger'
import { freezeMiddleware } from '../middleware/freeze'
import { validationMiddleware } from '../middleware/validation'
import type { WriteEvent } from '../types'

describe('Middleware Pipeline', () => {
  describe('core.use()', () => {
    it('middleware receives write events', () => {
      const core = createCore()
      const events: WriteEvent[] = []

      core.use((event, next) => {
        events.push({ ...event })
        next(event)
      })

      core.set('a', 1)
      expect(events).toHaveLength(1)
      expect(events[0]).toMatchObject({
        path: 'a',
        value: 1,
        oldValue: undefined,
        source: 'user',
      })
    })

    it('middleware can block writes', () => {
      const core = createCore()
      core.use((_event, _next) => {
        // intentionally not calling next
      })

      core.set('a', 1)
      expect(core.get('a')).toBeUndefined()
    })

    it('middleware can modify event', () => {
      const core = createCore()
      core.use((event, next) => {
        next({ ...event, value: (event.value as number) * 2 })
      })

      core.set('a', 5)
      expect(core.get('a')).toBe(10)
    })

    it('middleware chain executes in order', () => {
      const core = createCore()
      const order: number[] = []

      core.use((event, next) => {
        order.push(1)
        next(event)
      })
      core.use((event, next) => {
        order.push(2)
        next(event)
      })
      core.use((event, next) => {
        order.push(3)
        next(event)
      })

      core.set('a', 1)
      expect(order).toEqual([1, 2, 3])
    })

    it('use() returns unsubscribe function', () => {
      const core = createCore()
      const events: WriteEvent[] = []

      const unsub = core.use((event, next) => {
        events.push({ ...event })
        next(event)
      })

      core.set('a', 1)
      expect(events).toHaveLength(1)

      unsub()
      core.set('a', 2)
      expect(events).toHaveLength(1)
    })

    it('middleware works with transactions', () => {
      const core = createCore()
      const events: WriteEvent[] = []

      core.use((event, next) => {
        events.push({ ...event })
        next(event)
      })

      core.set('x', 0)
      events.length = 0

      core.transaction(() => {
        core.set('x', 10)
        core.set('y', 20)
      })

      const transEvents = events.filter((e) => e.source === 'transaction')
      expect(transEvents).toHaveLength(2)
    })

    it('middleware works with computed values', () => {
      const core = createCore()
      const sources: string[] = []

      core.use((event, next) => {
        sources.push(event.source)
        next(event)
      })

      core.set('a', 1)
      core.set('b', 2)
      core.computed('sum', ['a', 'b'], (a, b) => (a as number) + (b as number))

      expect(core.get('sum')).toBe(3)
      expect(sources).toContain('computed')
    })

    it('middleware sees computed propagation on set', () => {
      const core = createCore()
      const events: WriteEvent[] = []

      core.set('a', 1)
      core.set('b', 2)
      core.computed('sum', ['a', 'b'], (a, b) => (a as number) + (b as number))

      core.use((event, next) => {
        events.push({ ...event })
        next(event)
      })

      core.set('a', 10)
      const computedEv = events.find((e) => e.path === 'sum')
      expect(computedEv).toBeDefined()
      expect(computedEv!.source).toBe('computed')
      expect(computedEv!.value).toBe(12)
    })
  })

  describe('snapshot / restore', () => {
    it('snapshot captures current state', () => {
      const core = createCore()
      core.set('a', 1)
      core.set('b.c', 'hello')

      const snap = core.snapshot()
      expect(snap).toEqual({ a: 1, 'b.c': 'hello' })
    })

    it('restore applies snapshot and notifies subscribers', () => {
      const core = createCore()
      core.set('a', 1)
      core.set('b', 2)

      const cb = vi.fn()
      core.subscribe('a', cb)

      core.restore({ a: 99, b: 2 })

      expect(core.get('a')).toBe(99)
      expect(cb).toHaveBeenCalledWith(99)
    })
  })

  describe('loggerMiddleware', () => {
    it('calls custom log function', () => {
      const core = createCore()
      const logs: string[] = []

      core.use(
        loggerMiddleware({
          log: (msg) => logs.push(msg),
        }),
      )

      core.set('x', 1)
      expect(logs.length).toBeGreaterThan(0)
      expect(logs[0]).toContain('skygraph')
    })

    it('respects filter', () => {
      const core = createCore()
      const logs: WriteEvent[] = []

      core.use(
        loggerMiddleware({
          filter: (e) => e.path.startsWith('track.'),
          log: (_msg, ev) => logs.push(ev),
        }),
      )

      core.set('other', 1)
      core.set('track.a', 2)

      expect(logs).toHaveLength(1)
      expect(logs[0].path).toBe('track.a')
    })
  })

  describe('freezeMiddleware', () => {
    it('blocks writes to frozen paths', () => {
      const core = createCore()
      core.set('config.theme', 'dark')

      core.use(freezeMiddleware(['config']))

      core.set('config.theme', 'light')
      expect(core.get('config.theme')).toBe('dark')
    })

    it('allows writes to non-frozen paths', () => {
      const core = createCore()
      core.use(freezeMiddleware(['config']))

      core.set('data.value', 42)
      expect(core.get('data.value')).toBe(42)
    })

    it('blocks exact path match', () => {
      const core = createCore()
      core.set('locked', 'original')

      core.use(freezeMiddleware(['locked']))

      core.set('locked', 'modified')
      expect(core.get('locked')).toBe('original')
    })
  })

  describe('validationMiddleware', () => {
    it('blocks writes that fail validation', () => {
      const core = createCore()
      core.use(
        validationMiddleware({
          age: (e) => typeof e.value === 'number' && (e.value as number) >= 0,
        }),
      )

      core.set('age', 25)
      expect(core.get('age')).toBe(25)

      core.set('age', -1)
      expect(core.get('age')).toBe(25)
    })

    it('allows writes with no matching validator', () => {
      const core = createCore()
      core.use(validationMiddleware({ age: () => true }))

      core.set('name', 'test')
      expect(core.get('name')).toBe('test')
    })
  })
})
