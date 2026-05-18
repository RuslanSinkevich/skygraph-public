/**
 * Batch collects path changes during a batch callback
 * and defers notifications until the callback completes.
 */
export class Batch {
  private depth = 0
  private pending: Map<string, unknown> = new Map()

  get isActive(): boolean {
    return this.depth > 0
  }

  start(): void {
    this.depth++
  }

  end(): Map<string, unknown> | null {
    this.depth--
    if (this.depth > 0) return null

    if (this.pending.size === 0) return null

    const changes = new Map(this.pending)
    this.pending.clear()
    return changes
  }

  enqueue(path: string, value: unknown): void {
    this.pending.set(path, value)
  }
}
