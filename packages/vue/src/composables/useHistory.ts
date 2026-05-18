import { ref, computed, onScopeDispose, type Ref, type ComputedRef } from 'vue'
import { createHistory } from '@skygraph/core'
import type { Core, HistoryPlugin, HistoryOptions } from '@skygraph/core'

export interface UseHistoryReturn {
  history: HistoryPlugin
  canUndo: ComputedRef<boolean>
  canRedo: ComputedRef<boolean>
  cursor: ComputedRef<number>
  entries: Ref<HistoryPlugin['entries']>
  undo: () => void
  redo: () => void
  jumpTo: (index: number) => void
  clear: () => void
}

/**
 * Vue 3 composable parallel to React's `useHistory`.
 *
 * Wraps a `HistoryPlugin` and exposes `canUndo` / `canRedo` / `cursor` /
 * `entries` reactively. Mutating methods (`undo`, `redo`, `jumpTo`, `clear`)
 * trigger a refresh of the reactive snapshots. Subscribes to Core writes
 * via middleware so any external write that creates a history entry also
 * surfaces in the snapshot.
 */
export function useHistory(core: Core, options?: HistoryOptions): UseHistoryReturn {
  const history = createHistory(core, options)

  const cursor = ref(history.cursor)
  const entries = ref<HistoryPlugin['entries']>([...history.entries])

  const refresh = () => {
    cursor.value = history.cursor
    entries.value = [...history.entries]
  }

  // Track Core writes so externally-driven history entries refresh the
  // reactive snapshots without an explicit user call. Schedule via microtask
  // so we observe the post-commit state of the plugin.
  let scheduled = false
  const scheduleRefresh = () => {
    if (scheduled) return
    scheduled = true
    queueMicrotask(() => {
      scheduled = false
      refresh()
    })
  }

  const removeMiddleware = core.use((event, next) => {
    next(event)
    scheduleRefresh()
  })

  const undo = () => {
    history.undo()
    refresh()
  }

  const redo = () => {
    history.redo()
    refresh()
  }

  const jumpTo = (index: number) => {
    history.jumpTo(index)
    refresh()
  }

  const clear = () => {
    history.clear()
    refresh()
  }

  onScopeDispose(() => {
    removeMiddleware()
    history.destroy()
  })

  return {
    history,
    canUndo: computed(() => cursor.value >= 0),
    canRedo: computed(() => cursor.value < entries.value.length - 1),
    cursor: computed(() => cursor.value),
    entries,
    undo,
    redo,
    jumpTo,
    clear,
  }
}
