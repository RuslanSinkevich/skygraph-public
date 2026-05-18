export type Task = () => void

/**
 * Scheduler manages different priority queues for updates.
 * - micro: synchronous, within current transaction
 * - macro: deferred async effects (validation, server sync)
 * - render: batched UI notifications (grouped per frame)
 */
export class Scheduler {
  private microQueue: Task[] = []
  private macroQueue: Task[] = []
  private renderQueue: Task[] = []
  private renderScheduled = false

  enqueueMicro(task: Task): void {
    this.microQueue.push(task)
  }

  enqueueMacro(task: Task): void {
    this.macroQueue.push(task)
    queueMicrotask(() => this.flushMacro())
  }

  enqueueRender(task: Task): void {
    this.renderQueue.push(task)
    if (!this.renderScheduled) {
      this.renderScheduled = true
      if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(() => this.flushRender())
      } else {
        queueMicrotask(() => this.flushRender())
      }
    }
  }

  flushMicro(): void {
    while (this.microQueue.length > 0) {
      const task = this.microQueue.shift()!
      task()
    }
  }

  private flushMacro(): void {
    const tasks = [...this.macroQueue]
    this.macroQueue = []
    for (const task of tasks) {
      task()
    }
  }

  private flushRender(): void {
    this.renderScheduled = false
    const tasks = [...this.renderQueue]
    this.renderQueue = []
    for (const task of tasks) {
      task()
    }
  }
}
