import type { Middleware, WriteEvent, NextFn } from '../types'

export interface PersistenceOptions {
  key?: string
  paths?: string[]
  storage?: {
    getItem(key: string): string | null
    setItem(key: string, value: string): void
  }
  debounce?: number
}

/**
 * Persists selected paths to a storage backend (localStorage by default).
 * Debounced to avoid excessive writes.
 */
export function persistenceMiddleware(options: PersistenceOptions = {}): Middleware {
  const storageKey = options.key ?? 'skygraph:state'
  const storage = options.storage ?? (typeof localStorage !== 'undefined' ? localStorage : null)
  const paths = options.paths
  const debounceMs = options.debounce ?? 100

  let pending: Record<string, unknown> = {}
  let timer: ReturnType<typeof setTimeout> | null = null

  function flush() {
    if (!storage) return
    const existing = storage.getItem(storageKey)
    let data: Record<string, unknown> = {}
    if (existing) {
      try {
        data = JSON.parse(existing)
      } catch {
        /* corrupted, start fresh */
      }
    }
    Object.assign(data, pending)
    storage.setItem(storageKey, JSON.stringify(data))
    pending = {}
    timer = null
  }

  return (event: WriteEvent, next: NextFn) => {
    next(event)

    if (paths && !paths.some((p) => event.path === p || event.path.startsWith(p + '.'))) {
      return
    }

    pending[event.path] = event.value

    if (timer === null) {
      timer = setTimeout(flush, debounceMs)
    }
  }
}
