import { useCallback, useMemo, useRef, useSyncExternalStore } from 'react'
import { createCore } from '@skygraph/core'
import type { Core } from '@skygraph/core'
import type { EditorAction, EditorField, EditorSchema, EditorState } from './types'
import { createEmptyEditorSchema } from './adapters/jsonSchema'

const HISTORY_LIMIT = 100
const STORE_PATH = '$sfe.snapshot'

/**
 * Public store API surfaced by `useSchemaEditor`. Mutations are dispatched
 * through `apply(action)` which handles undo / redo bookkeeping. Convenience
 * methods (`addField`, `removeField`, ...) wrap the corresponding actions.
 */
export interface SchemaEditorStore {
  /** Live snapshot — re-rendered on every commit. */
  state: EditorState
  /** Underlying Core instance (mirrored snapshot under `$sfe.snapshot`). */
  core: Core

  apply: (action: EditorAction) => void

  addField: (field: EditorField, index?: number) => void
  removeField: (id: string) => void
  updateField: (id: string, patch: Partial<EditorField>) => void
  moveField: (id: string, toIndex: number) => void
  moveFieldUp: (id: string) => void
  moveFieldDown: (id: string) => void
  duplicateField: (id: string) => void

  setSchema: (schema: EditorSchema) => void
  setSelectedId: (id: string | null) => void

  undo: () => void
  redo: () => void
}

export interface UseSchemaEditorOptions {
  /** Initial schema; defaults to an empty schema. */
  initialSchema?: EditorSchema
  /** External Core instance (cross-engine coordination). */
  core?: Core
  /** Fires after every successful mutation with the new schema. */
  onChange?: (schema: EditorSchema) => void
}

interface InternalState {
  schema: EditorSchema
  selectedId: string | null
}

function cloneSchema(schema: EditorSchema): EditorSchema {
  return {
    title: schema.title,
    description: schema.description,
    fields: schema.fields.map((f) => ({ ...f, options: f.options ? f.options.map((o) => ({ ...o })) : undefined })),
  }
}

export function useSchemaEditor(options: UseSchemaEditorOptions = {}): SchemaEditorStore {
  const { initialSchema, onChange } = options

  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const storeRef = useRef<{
    core: Core
    current: InternalState
    snapshot: EditorState
    undoStack: InternalState[]
    redoStack: InternalState[]
    listeners: Set<() => void>
  } | null>(null)

  if (storeRef.current === null) {
    const core = options.core ?? createCore()
    const initial: InternalState = {
      schema: initialSchema ? cloneSchema(initialSchema) : createEmptyEditorSchema(),
      selectedId: null,
    }
    storeRef.current = {
      core,
      current: initial,
      snapshot: buildSnapshot(initial, false, false),
      undoStack: [],
      redoStack: [],
      listeners: new Set(),
    }
    core.set(STORE_PATH, initial.schema)
  }

  const store = storeRef.current

  const subscribe = useCallback((cb: () => void) => {
    store.listeners.add(cb)
    return () => {
      store.listeners.delete(cb)
    }
  }, [store])

  const getSnapshot = useCallback(() => store.snapshot, [store])

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const commit = useCallback(
    (next: InternalState, captureHistory: boolean) => {
      if (captureHistory) {
        store.undoStack.push(store.current)
        if (store.undoStack.length > HISTORY_LIMIT) store.undoStack.shift()
        store.redoStack.length = 0
      }
      store.current = next
      store.snapshot = buildSnapshot(
        next,
        store.undoStack.length > 0,
        store.redoStack.length > 0,
      )
      store.core.set(STORE_PATH, next.schema)
      for (const cb of store.listeners) cb()
      onChangeRef.current?.(next.schema)
    },
    [store],
  )

  const apply = useCallback(
    (action: EditorAction) => {
      const next = reduce(store.current, action)
      if (next === store.current) return
      commit(next, true)
    },
    [store, commit],
  )

  const addField = useCallback(
    (field: EditorField, index?: number) => apply({ type: 'add', field, index }),
    [apply],
  )
  const removeField = useCallback((id: string) => apply({ type: 'remove', id }), [apply])
  const updateField = useCallback(
    (id: string, patch: Partial<EditorField>) => apply({ type: 'update', id, patch }),
    [apply],
  )
  const moveField = useCallback(
    (id: string, toIndex: number) => apply({ type: 'move', id, toIndex }),
    [apply],
  )

  const moveFieldUp = useCallback(
    (id: string) => {
      const idx = store.current.schema.fields.findIndex((f) => f.id === id)
      if (idx <= 0) return
      apply({ type: 'move', id, toIndex: idx - 1 })
    },
    [store, apply],
  )

  const moveFieldDown = useCallback(
    (id: string) => {
      const fields = store.current.schema.fields
      const idx = fields.findIndex((f) => f.id === id)
      if (idx === -1 || idx >= fields.length - 1) return
      apply({ type: 'move', id, toIndex: idx + 1 })
    },
    [store, apply],
  )

  const duplicateField = useCallback(
    (id: string) => {
      const fields = store.current.schema.fields
      const idx = fields.findIndex((f) => f.id === id)
      if (idx === -1) return
      const src = fields[idx]!
      const existingNames = fields.map((f) => f.name)
      let candidate = `${src.name}_copy`
      let suffix = 1
      while (existingNames.includes(candidate)) {
        suffix++
        candidate = `${src.name}_copy${suffix}`
      }
      const copy: EditorField = {
        ...src,
        id: `dup_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        name: candidate,
        options: src.options ? src.options.map((o) => ({ ...o })) : undefined,
      }
      apply({ type: 'add', field: copy, index: idx + 1 })
    },
    [store, apply],
  )

  const setSchema = useCallback(
    (schema: EditorSchema) => apply({ type: 'setSchema', schema }),
    [apply],
  )

  const setSelectedId = useCallback(
    (id: string | null) => {
      if (store.current.selectedId === id) return
      const next: InternalState = { ...store.current, selectedId: id }
      commit(next, false)
    },
    [store, commit],
  )

  const undo = useCallback(() => {
    if (store.undoStack.length === 0) return
    const prev = store.undoStack.pop()!
    store.redoStack.push(store.current)
    if (store.redoStack.length > HISTORY_LIMIT) store.redoStack.shift()
    store.current = prev
    store.snapshot = buildSnapshot(
      prev,
      store.undoStack.length > 0,
      store.redoStack.length > 0,
    )
    store.core.set(STORE_PATH, prev.schema)
    for (const cb of store.listeners) cb()
    onChangeRef.current?.(prev.schema)
  }, [store])

  const redo = useCallback(() => {
    if (store.redoStack.length === 0) return
    const next = store.redoStack.pop()!
    store.undoStack.push(store.current)
    if (store.undoStack.length > HISTORY_LIMIT) store.undoStack.shift()
    store.current = next
    store.snapshot = buildSnapshot(
      next,
      store.undoStack.length > 0,
      store.redoStack.length > 0,
    )
    store.core.set(STORE_PATH, next.schema)
    for (const cb of store.listeners) cb()
    onChangeRef.current?.(next.schema)
  }, [store])

  return useMemo<SchemaEditorStore>(
    () => ({
      state,
      core: store.core,
      apply,
      addField,
      removeField,
      updateField,
      moveField,
      moveFieldUp,
      moveFieldDown,
      duplicateField,
      setSchema,
      setSelectedId,
      undo,
      redo,
    }),
    [
      state,
      store,
      apply,
      addField,
      removeField,
      updateField,
      moveField,
      moveFieldUp,
      moveFieldDown,
      duplicateField,
      setSchema,
      setSelectedId,
      undo,
      redo,
    ],
  )
}

function buildSnapshot(state: InternalState, canUndo: boolean, canRedo: boolean): EditorState {
  return {
    schema: state.schema,
    selectedId: state.selectedId,
    canUndo,
    canRedo,
  }
}

function reduce(state: InternalState, action: EditorAction): InternalState {
  switch (action.type) {
    case 'add': {
      const fields = state.schema.fields.slice()
      const index = action.index ?? fields.length
      fields.splice(Math.max(0, Math.min(index, fields.length)), 0, action.field)
      return {
        ...state,
        schema: { ...state.schema, fields },
        selectedId: action.field.id,
      }
    }
    case 'remove': {
      const fields = state.schema.fields.filter((f) => f.id !== action.id)
      if (fields.length === state.schema.fields.length) return state
      return {
        ...state,
        schema: { ...state.schema, fields },
        selectedId: state.selectedId === action.id ? null : state.selectedId,
      }
    }
    case 'update': {
      const idx = state.schema.fields.findIndex((f) => f.id === action.id)
      if (idx === -1) return state
      const fields = state.schema.fields.slice()
      const current = fields[idx]!
      const merged: EditorField = { ...current, ...action.patch }
      // strip undefined explicit overrides — `patch.min: undefined` should
      // unset the field (helpful from the inspector).
      const mergedRecord = merged as unknown as Record<string, unknown>
      for (const k of Object.keys(action.patch)) {
        if ((action.patch as Record<string, unknown>)[k] === undefined) {
          delete mergedRecord[k]
        }
      }
      fields[idx] = merged
      return { ...state, schema: { ...state.schema, fields } }
    }
    case 'move': {
      const idx = state.schema.fields.findIndex((f) => f.id === action.id)
      if (idx === -1) return state
      const fields = state.schema.fields.slice()
      const [item] = fields.splice(idx, 1)
      const target = Math.max(0, Math.min(action.toIndex, fields.length))
      fields.splice(target, 0, item!)
      return { ...state, schema: { ...state.schema, fields } }
    }
    case 'setSchema': {
      return {
        ...state,
        schema: cloneSchema(action.schema),
        selectedId: null,
      }
    }
    default:
      return state
  }
}
