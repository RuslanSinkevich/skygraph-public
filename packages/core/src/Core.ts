import { Store } from './runtime/Store'
import { SubscriptionEngine } from './runtime/SubscriptionEngine'
import { Batch } from './runtime/Batch'
import { Transaction } from './runtime/Transaction'
import { ComputedEngine } from './runtime/ComputedEngine'
import type { Core, Middleware, WriteEvent, NextFn } from './types'

class CoreImpl implements Core {
  private store = new Store()
  private subscriptions = new SubscriptionEngine()
  private batch_ = new Batch()
  private transaction_ = new Transaction()
  private computed_ = new ComputedEngine()

  private middlewares: Middleware[] = []

  // ── Middleware ──

  use(middleware: Middleware): () => void {
    this.middlewares.push(middleware)
    return () => {
      const idx = this.middlewares.indexOf(middleware)
      if (idx !== -1) this.middlewares.splice(idx, 1)
    }
  }

  private dispatchWrite(event: WriteEvent): void {
    let idx = 0
    const chain: NextFn = (ev: WriteEvent) => {
      if (idx < this.middlewares.length) {
        const mw = this.middlewares[idx++]
        mw(ev, chain)
      } else {
        this.commitWrite(ev)
      }
    }
    chain(event)
  }

  private commitWrite(event: WriteEvent): void {
    this.store.set(event.path, event.value)
  }

  // ── Public API ──

  get(path: string): unknown {
    return this.store.get(path)
  }

  set(path: string, value: unknown): void {
    if (this.transaction_.isActive) {
      this.transaction_.stage(path, value, this.store.get(path))
      return
    }

    const oldValue = this.store.get(path)
    if (Object.is(oldValue, value)) return

    this.dispatchWrite({ path, value, oldValue, source: 'user' })

    const computedChanges = this.propagateComputed(new Set([path]))

    if (this.batch_.isActive) {
      this.batch_.enqueue(path, value)
      for (const [cp, cv] of computedChanges) {
        this.batch_.enqueue(cp, cv)
      }
      return
    }

    this.subscriptions.notify(path, value)
    this.subscriptions.notifyMany(computedChanges)
  }

  subscribe(path: string, cb: (value: unknown) => void): () => void {
    return this.subscriptions.subscribe(path, cb)
  }

  batch(fn: () => void): void {
    this.batch_.start()
    try {
      fn()
    } finally {
      const changes = this.batch_.end()
      if (changes) {
        this.subscriptions.notifyMany(changes)
      }
    }
  }

  transaction(fn: () => void): void {
    this.batch_.start()
    this.transaction_.start()
    try {
      fn()
      const staged = this.transaction_.getStaged()

      // Pass all writes through middleware first, collecting approved ones.
      // dispatchWrite normally commits to store, so we temporarily redirect
      // commits to a pending list and only apply them atomically if all succeed.
      const approved: Array<{ path: string; value: unknown }> = []
      const origCommit = this.commitWrite.bind(this)
      this.commitWrite = (ev: WriteEvent) => {
        approved.push({ path: ev.path, value: ev.value })
      }

      try {
        for (const write of staged) {
          if (Object.is(write.value, write.prevValue)) continue
          this.dispatchWrite({
            path: write.path,
            value: write.value,
            oldValue: write.prevValue,
            source: 'transaction',
          })
        }
      } finally {
        this.commitWrite = origCommit
      }

      // All middleware passed — atomically apply to store
      const changes = new Map<string, unknown>()
      for (const { path, value } of approved) {
        this.store.set(path, value)
        changes.set(path, value)
      }

      this.transaction_.complete()

      const computedChanges = this.propagateComputed(new Set(changes.keys()))

      for (const [path, value] of changes) {
        this.batch_.enqueue(path, value)
      }
      for (const [path, value] of computedChanges) {
        this.batch_.enqueue(path, value)
      }
    } catch (e) {
      this.transaction_.rollback()
      throw e
    } finally {
      const batchedChanges = this.batch_.end()
      if (batchedChanges) {
        this.subscriptions.notifyMany(batchedChanges)
      }
    }
  }

  computed(
    target: string,
    deps: string[],
    fn: (...values: unknown[]) => unknown,
  ): void {
    this.computed_.register(target, deps, fn)
    const depValues = deps.map((d) => this.store.get(d))
    const value = fn(...depValues)
    const oldValue = this.store.get(target)
    this.dispatchWrite({
      path: target,
      value,
      oldValue,
      source: 'computed',
    })

    if (!Object.is(oldValue, value)) {
      this.subscriptions.notify(target, value)
    }
  }

  // ── Snapshot / Restore ──

  snapshot(): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    for (const path of this.store.paths()) {
      result[path] = this.store.get(path)
    }
    return result
  }

  restore(snap: Record<string, unknown>): void {
    this.batch_.start()
    try {
      for (const [path, value] of Object.entries(snap)) {
        const oldValue = this.store.get(path)
        if (!Object.is(oldValue, value)) {
          this.dispatchWrite({ path, value, oldValue, source: 'restore' })
          this.batch_.enqueue(path, value)
        }
      }
    } finally {
      const changes = this.batch_.end()
      if (changes) {
        this.subscriptions.notifyMany(changes)
      }
    }
  }

  // ── Internal helpers ──

  private propagateComputed(changedPaths: Set<string>): Map<string, unknown> {
    const rawChanges = this.computed_.propagateRaw(changedPaths, this.store)
    const dispatched = new Map<string, unknown>()

    for (const [path, { value, oldValue }] of rawChanges) {
      this.dispatchWrite({ path, value, oldValue, source: 'computed' })
      dispatched.set(path, value)
    }

    return dispatched
  }
}

export function createCore(): Core {
  return new CoreImpl()
}
