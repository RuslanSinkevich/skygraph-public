// ── Middleware types ──

/**
 * Origin of a write event as seen by the runtime.
 *
 * Keep this union strictly runtime-level. Engine-specific tags (form, table,
 * tree, custom) MUST live in `WriteEvent.meta`, NOT here. Adding an engine
 * category to this union is an architecture violation — it makes core know
 * about engines.
 */
export type WriteSource = 'user' | 'computed' | 'transaction' | 'restore'

export interface WriteEvent {
  path: string
  value: unknown
  oldValue: unknown
  source: WriteSource
  /**
   * Opaque metadata bag for engines / plugins. Middleware may read/write it.
   * Runtime itself must never branch on specific keys here.
   */
  meta?: Record<string, unknown>
}

export type NextFn = (event: WriteEvent) => void

export type Middleware = (event: WriteEvent, next: NextFn) => void

// ── Core interface ──

export interface Core {
  get(path: string): unknown
  set(path: string, value: unknown): void
  subscribe(path: string, cb: (value: unknown) => void): () => void
  batch(fn: () => void): void
  transaction(fn: () => void): void
  computed(
    target: string,
    deps: string[],
    fn: (...values: unknown[]) => unknown
  ): void

  use(middleware: Middleware): () => void

  snapshot(): Record<string, unknown>
  restore(snapshot: Record<string, unknown>): void
}
