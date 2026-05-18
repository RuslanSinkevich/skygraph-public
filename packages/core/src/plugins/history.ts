import type { Core, Middleware, WriteEvent, NextFn } from '../types'

export interface HistoryEntry {
  timestamp: number
  patches: ReadonlyArray<{ path: string; value: unknown; oldValue: unknown }>
}

export interface HistoryPlugin {
  readonly entries: ReadonlyArray<HistoryEntry>
  readonly cursor: number
  readonly canUndo: boolean
  readonly canRedo: boolean

  undo(): void
  redo(): void
  jumpTo(index: number): void
  clear(): void
  destroy(): void
}

export interface HistoryOptions {
  maxEntries?: number
  /** Group multiple writes within this window (ms) into a single entry */
  groupWindow?: number
  filter?: (event: WriteEvent) => boolean
}

export function createHistory(core: Core, options: HistoryOptions = {}): HistoryPlugin {
  const maxEntries = options.maxEntries ?? 100
  const groupWindow = options.groupWindow ?? 0
  const filter = options.filter

  const entries: HistoryEntry[] = []
  let cursor = -1
  let travelling = false
  let groupTimer: ReturnType<typeof setTimeout> | null = null
  let pendingPatches: HistoryEntry['patches'][number][] = []

  function flushGroup() {
    if (pendingPatches.length === 0) return
    const entry: HistoryEntry = {
      timestamp: Date.now(),
      patches: [...pendingPatches],
    }
    pendingPatches = []

    if (cursor < entries.length - 1) {
      entries.splice(cursor + 1)
    }

    entries.push(entry)
    cursor++
    if (entries.length > maxEntries) {
      entries.shift()
      cursor--
    }

    groupTimer = null
  }

  const middleware: Middleware = (event: WriteEvent, next: NextFn) => {
    next(event)

    if (travelling) return
    if (event.source === 'computed') return
    if (filter && !filter(event)) return

    pendingPatches.push({
      path: event.path,
      value: event.value,
      oldValue: event.oldValue,
    })

    if (groupWindow > 0) {
      if (groupTimer === null) {
        groupTimer = setTimeout(flushGroup, groupWindow)
      }
    } else {
      flushGroup()
    }
  }

  const unsub = core.use(middleware)

  function applyPatches(patches: HistoryEntry['patches'], direction: 'undo' | 'redo') {
    travelling = true
    try {
      core.batch(() => {
        if (direction === 'undo') {
          for (let i = patches.length - 1; i >= 0; i--) {
            core.set(patches[i].path, patches[i].oldValue)
          }
        } else {
          for (const patch of patches) {
            core.set(patch.path, patch.value)
          }
        }
      })
    } finally {
      travelling = false
    }
  }

  return {
    get entries() {
      return entries as ReadonlyArray<HistoryEntry>
    },
    get cursor() {
      return cursor
    },
    get canUndo() {
      return cursor >= 0
    },
    get canRedo() {
      return cursor < entries.length - 1
    },

    undo() {
      if (cursor < 0) return
      flushGroup()
      applyPatches(entries[cursor].patches, 'undo')
      cursor--
    },

    redo() {
      if (cursor >= entries.length - 1) return
      flushGroup()
      cursor++
      applyPatches(entries[cursor].patches, 'redo')
    },

    jumpTo(index: number) {
      if (index < -1 || index >= entries.length) return
      flushGroup()

      while (cursor > index) {
        applyPatches(entries[cursor].patches, 'undo')
        cursor--
      }
      while (cursor < index) {
        cursor++
        applyPatches(entries[cursor].patches, 'redo')
      }
    },

    clear() {
      entries.length = 0
      cursor = -1
      pendingPatches = []
      if (groupTimer !== null) {
        clearTimeout(groupTimer)
        groupTimer = null
      }
    },

    destroy() {
      this.clear()
      unsub()
    },
  }
}
