import type { Middleware, WriteEvent, NextFn } from '../types'

/**
 * Prevents writes to specified path prefixes.
 * Useful for making parts of the store read-only.
 */
export function freezeMiddleware(frozenPaths: string[]): Middleware {
  return (event: WriteEvent, next: NextFn) => {
    for (const prefix of frozenPaths) {
      if (event.path === prefix || event.path.startsWith(prefix + '.')) {
        return
      }
    }
    next(event)
  }
}
