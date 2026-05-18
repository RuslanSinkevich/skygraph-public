export type Listener = (value: unknown) => void
export type Unsubscribe = () => void

export class SubscriptionEngine {
  private listeners: Map<string, Set<Listener>> = new Map()

  subscribe(path: string, cb: Listener): Unsubscribe {
    let set = this.listeners.get(path)
    if (!set) {
      set = new Set()
      this.listeners.set(path, set)
    }
    set.add(cb)

    return () => {
      set!.delete(cb)
      if (set!.size === 0) {
        this.listeners.delete(path)
      }
    }
  }

  notify(path: string, value: unknown): void {
    const set = this.listeners.get(path)
    if (!set) return
    for (const cb of set) {
      cb(value)
    }
  }

  notifyMany(changes: Map<string, unknown>): void {
    for (const [path, value] of changes) {
      this.notify(path, value)
    }
  }

  hasListeners(path: string): boolean {
    const set = this.listeners.get(path)
    return set !== undefined && set.size > 0
  }

  clear(): void {
    this.listeners.clear()
  }
}
