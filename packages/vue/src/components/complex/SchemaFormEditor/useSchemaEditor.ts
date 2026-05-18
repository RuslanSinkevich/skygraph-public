import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { createCore } from '@skygraph/core'
import type { Core } from '@skygraph/core'
import type { EditorAction, EditorField, EditorSchema, EditorState } from './types'
import { createEmptyEditorSchema } from './adapters/jsonSchema'

const HISTORY_LIMIT = 100
const STORE_PATH = '$sfe.snapshot'

export interface SchemaEditorStore {
  /** Reactive snapshot — re-rendered on every commit. */
  state: ComputedRef<EditorState>
  /** Underlying Core instance. */
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
  initialSchema?: EditorSchema
  core?: Core
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
    fields: schema.fields.map((f) => ({
      ...f,
      options: f.options ? f.options.map((o) => ({ ...o })) : undefined,
    })),
  }
}

function buildSnapshot(s: InternalState, canUndo: boolean, canRedo: boolean): EditorState {
  return {
    schema: s.schema,
    selectedId: s.selectedId,
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

export function useSchemaEditor(options: UseSchemaEditorOptions = {}): SchemaEditorStore {
  const core = options.core ?? createCore()

  const initial: InternalState = {
    schema: options.initialSchema ? cloneSchema(options.initialSchema) : createEmptyEditorSchema(),
    selectedId: null,
  }

  const current: Ref<InternalState> = ref(initial) as Ref<InternalState>
  const undoStack = ref<InternalState[]>([])
  const redoStack = ref<InternalState[]>([])

  core.set(STORE_PATH, initial.schema)

  const state = computed<EditorState>(() =>
    buildSnapshot(current.value, undoStack.value.length > 0, redoStack.value.length > 0),
  )

  const commit = (next: InternalState, captureHistory: boolean) => {
    if (captureHistory) {
      undoStack.value = [...undoStack.value, current.value]
      if (undoStack.value.length > HISTORY_LIMIT) {
        undoStack.value = undoStack.value.slice(-HISTORY_LIMIT)
      }
      redoStack.value = []
    }
    current.value = next
    core.set(STORE_PATH, next.schema)
    options.onChange?.(next.schema)
  }

  const apply = (action: EditorAction) => {
    const next = reduce(current.value, action)
    if (next === current.value) return
    commit(next, true)
  }

  const addField = (field: EditorField, index?: number) =>
    apply({ type: 'add', field, index })
  const removeField = (id: string) => apply({ type: 'remove', id })
  const updateField = (id: string, patch: Partial<EditorField>) =>
    apply({ type: 'update', id, patch })
  const moveField = (id: string, toIndex: number) =>
    apply({ type: 'move', id, toIndex })

  const moveFieldUp = (id: string) => {
    const idx = current.value.schema.fields.findIndex((f) => f.id === id)
    if (idx <= 0) return
    apply({ type: 'move', id, toIndex: idx - 1 })
  }

  const moveFieldDown = (id: string) => {
    const fields = current.value.schema.fields
    const idx = fields.findIndex((f) => f.id === id)
    if (idx === -1 || idx >= fields.length - 1) return
    apply({ type: 'move', id, toIndex: idx + 1 })
  }

  const duplicateField = (id: string) => {
    const fields = current.value.schema.fields
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
  }

  const setSchema = (schema: EditorSchema) => apply({ type: 'setSchema', schema })

  const setSelectedId = (id: string | null) => {
    if (current.value.selectedId === id) return
    commit({ ...current.value, selectedId: id }, false)
  }

  const undo = () => {
    if (undoStack.value.length === 0) return
    const stack = [...undoStack.value]
    const prev = stack.pop()!
    undoStack.value = stack
    redoStack.value = [...redoStack.value, current.value]
    if (redoStack.value.length > HISTORY_LIMIT) {
      redoStack.value = redoStack.value.slice(-HISTORY_LIMIT)
    }
    current.value = prev
    core.set(STORE_PATH, prev.schema)
    options.onChange?.(prev.schema)
  }

  const redo = () => {
    if (redoStack.value.length === 0) return
    const stack = [...redoStack.value]
    const next = stack.pop()!
    redoStack.value = stack
    undoStack.value = [...undoStack.value, current.value]
    if (undoStack.value.length > HISTORY_LIMIT) {
      undoStack.value = undoStack.value.slice(-HISTORY_LIMIT)
    }
    current.value = next
    core.set(STORE_PATH, next.schema)
    options.onChange?.(next.schema)
  }

  return {
    state,
    core,
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
  }
}
