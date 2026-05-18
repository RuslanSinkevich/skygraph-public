import type { Middleware, WriteEvent, NextFn } from '../types'

export interface LoggerOptions {
  filter?: (event: WriteEvent) => boolean
  log?: (message: string, event: WriteEvent) => void
}

export function loggerMiddleware(options: LoggerOptions = {}): Middleware {
  const log = options.log ?? ((msg, ev) => console.log(msg, ev.path, ev.value))
  const filter = options.filter

  return (event: WriteEvent, next: NextFn) => {
    if (filter && !filter(event)) {
      next(event)
      return
    }
    log(`[skygraph:${event.source}]`, event)
    next(event)
  }
}
