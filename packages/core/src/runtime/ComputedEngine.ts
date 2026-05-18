import { CycleDetector } from './CycleDetector'
import type { Store } from './Store'

export type ComputeFn = (...values: unknown[]) => unknown

interface ComputedNode {
  target: string
  deps: string[]
  fn: ComputeFn
}

/**
 * Manages computed (derived) values in the reactive graph.
 * When a dependency changes, the computed value is recomputed
 * and only propagated if the result actually changed.
 */
export class ComputedEngine {
  private computedNodes: Map<string, ComputedNode> = new Map()
  private cycleDetector = new CycleDetector()

  register(target: string, deps: string[], fn: ComputeFn): void {
    if (this.computedNodes.has(target)) {
      this.remove(target)
    }

    for (const dep of deps) {
      this.cycleDetector.addEdge(dep, target)
    }

    this.computedNodes.set(target, { target, deps, fn })
  }

  remove(target: string): void {
    this.computedNodes.delete(target)
    this.cycleDetector.removeNode(target)
  }

  isComputed(path: string): boolean {
    return this.computedNodes.has(path)
  }

  /**
   * Like propagate, but returns both new and old values for middleware support.
   * Does NOT write to the store — the caller handles that via dispatchWrite.
   */
  propagateRaw(
    changedPaths: Set<string>,
    store: Store,
  ): Map<string, { value: unknown; oldValue: unknown }> {
    const result = new Map<string, { value: unknown; oldValue: unknown }>()
    const visited = new Set<string>()
    const queue = [...changedPaths]

    while (queue.length > 0) {
      const path = queue.shift()!
      if (visited.has(path)) continue
      visited.add(path)

      const dependents = this.cycleDetector.getDependents(path)

      for (const depTarget of dependents) {
        const computed = this.computedNodes.get(depTarget)
        if (!computed) continue

        const depValues = computed.deps.map((d) => {
          const pending = result.get(d)
          return pending ? pending.value : store.get(d)
        })
        const newValue = computed.fn(...depValues)
        const oldValue = result.has(depTarget)
          ? result.get(depTarget)!.oldValue
          : store.get(depTarget)

        if (!Object.is(newValue, oldValue)) {
          result.set(depTarget, { value: newValue, oldValue })
          queue.push(depTarget)
        }
      }
    }

    return result
  }

  /**
   * Initialize all computed values based on current store state.
   */
  initializeAll(store: Store): void {
    for (const computed of this.computedNodes.values()) {
      const depValues = computed.deps.map((d) => store.get(d))
      const value = computed.fn(...depValues)
      store.set(computed.target, value)
    }
  }
}
