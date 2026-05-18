/**
 * Undo/redo history for `GraphEngine`.
 *
 * Snapshots are shallow: they capture the current `nodes` / `edges` arrays
 * plus the engine id counters. Because all mutating paths in `GraphEngine`
 * replace nodes/edges via `Map.set(id, { ...next })` (never in-place mutation),
 * a shallow array of references is enough to restore an exact prior state.
 *
 * The store/derived data (`edgesByNode`) is rebuilt from `edges` on restore —
 * keeping it out of the snapshot avoids subtle corruption if a future change
 * adds a derived index.
 */
import type { GraphEdge, GraphNode } from './types'

/** Maximum number of entries kept in either undo or redo stack. */
export const HISTORY_LIMIT = 100

/**
 * Immutable snapshot of the engine's state at a point in time.
 * Restoration is exact — including id counters so newly generated ids
 * don't collide with ids that existed in a future-then-undone state.
 */
export interface GraphSnapshot {
  readonly nodes: readonly GraphNode[]
  readonly edges: readonly GraphEdge[]
  readonly nodeCounter: number
  readonly edgeCounter: number
}

/** One entry on the undo or redo stack. */
export interface HistoryEntry {
  readonly snapshot: GraphSnapshot
  readonly label?: string
}

export interface History {
  push(entry: HistoryEntry): void
  popUndo(): HistoryEntry | undefined
  popRedo(): HistoryEntry | undefined
  pushRedo(entry: HistoryEntry): void
  clearRedo(): void
  canUndo(): boolean
  canRedo(): boolean
  clear(): void
  /**
   * Replace the label on the most recent undo entry without disturbing
   * its snapshot. No-op when the stack is empty.
   */
  relabelTop(label: string | undefined): void
  /** Read-only label of the most recent undo entry (or `undefined`). */
  topLabel(): string | undefined
  /** @internal — for tests/introspection only. */
  size(): { undo: number; redo: number }
}

/**
 * Pure data store for the undo/redo stacks. The engine owns the capture /
 * restore semantics; this module only enforces the LIFO discipline and the
 * stack-size cap.
 */
export function createHistory(limit: number = HISTORY_LIMIT): History {
  const undoStack: HistoryEntry[] = []
  const redoStack: HistoryEntry[] = []

  function trim(stack: HistoryEntry[]): void {
    while (stack.length > limit) stack.shift()
  }

  return {
    push(entry) {
      undoStack.push(entry)
      trim(undoStack)
    },
    popUndo() {
      return undoStack.pop()
    },
    pushRedo(entry) {
      redoStack.push(entry)
      trim(redoStack)
    },
    popRedo() {
      return redoStack.pop()
    },
    clearRedo() {
      redoStack.length = 0
    },
    canUndo() {
      return undoStack.length > 0
    },
    canRedo() {
      return redoStack.length > 0
    },
    clear() {
      undoStack.length = 0
      redoStack.length = 0
    },
    relabelTop(label) {
      const top = undoStack[undoStack.length - 1]
      if (!top) return
      undoStack[undoStack.length - 1] = { snapshot: top.snapshot, label }
    },
    topLabel() {
      return undoStack[undoStack.length - 1]?.label
    },
    size() {
      return { undo: undoStack.length, redo: redoStack.length }
    },
  }
}
