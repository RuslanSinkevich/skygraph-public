import type { Store } from './Store'

export interface StagedWrite {
  path: string
  value: unknown
  prevValue: unknown
}

/**
 * Transaction implements the pipeline:
 * SET -> STAGE -> RESOLVE -> PROPAGATE -> COMMIT -> NOTIFY
 *
 * PROPAGATE is handled externally by ComputedEngine.
 * NOTIFY is handled externally by SubscriptionEngine via Batch.
 */
export class Transaction {
  private active = false
  private staged: StagedWrite[] = []

  get isActive(): boolean {
    return this.active
  }

  start(): void {
    if (this.active) {
      throw new Error('SkyGraph: nested transactions are not supported')
    }
    this.active = true
    this.staged = []
  }

  /** STAGE: record a write without mutating the store */
  stage(path: string, value: unknown, prevValue: unknown): void {
    this.staged.push({ path, value, prevValue })
  }

  /**
   * RESOLVE + COMMIT: drop unchanged values, apply the rest to store.
   * Returns the map of actually changed paths and their new values.
   */
  commit(store: Store): Map<string, unknown> {
    const changes = new Map<string, unknown>()

    for (const write of this.staged) {
      if (Object.is(write.value, write.prevValue)) continue
      store.set(write.path, write.value)
      changes.set(write.path, write.value)
    }

    this.active = false
    this.staged = []
    return changes
  }

  getStaged(): readonly StagedWrite[] {
    return this.staged
  }

  complete(): void {
    this.active = false
    this.staged = []
  }

  rollback(): void {
    this.active = false
    this.staged = []
  }
}
