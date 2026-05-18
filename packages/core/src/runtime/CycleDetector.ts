/**
 * Detects cycles in the computed dependency graph using DFS.
 * Throws on cycle detection to prevent infinite recomputation.
 */
export class CycleDetector {
  private graph: Map<string, Set<string>> = new Map()

  addEdge(from: string, to: string): void {
    let deps = this.graph.get(from)
    if (!deps) {
      deps = new Set()
      this.graph.set(from, deps)
    }
    deps.add(to)

    if (this.hasCycle(to, new Set([from]))) {
      deps.delete(to)
      if (deps.size === 0) this.graph.delete(from)
      throw new Error(
        `SkyGraph: circular dependency detected: ${from} -> ${to}`
      )
    }
  }

  removeNode(id: string): void {
    this.graph.delete(id)
    for (const deps of this.graph.values()) {
      deps.delete(id)
    }
  }

  getDependents(id: string): string[] {
    const targets = this.graph.get(id)
    return targets ? [...targets] : []
  }

  private hasCycle(node: string, visited: Set<string>): boolean {
    if (visited.has(node)) return true
    const deps = this.graph.get(node)
    if (!deps) return false
    visited.add(node)
    for (const dep of deps) {
      if (this.hasCycle(dep, new Set(visited))) return true
    }
    return false
  }
}
