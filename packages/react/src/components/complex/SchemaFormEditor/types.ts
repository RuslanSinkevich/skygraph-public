import type { FieldType, AutoFieldOption } from '../AutoField/AutoField'

/**
 * A single field in an editor schema. This is a UI-aware projection over a
 * JSON-Schema property — extra editor metadata (defaultValue, helpText, the
 * stable client-side `id`) lives alongside the standard JSON-Schema bits.
 *
 * The `id` is opaque to JSON-Schema and only used by the editor to track a
 * field across reorders / renames. When exporting to plain JSON-Schema the
 * `id` is dropped (`name` is the JSON-Schema property key).
 */
export interface EditorField {
  /** Stable client-side identifier (survives renames / reorders). */
  id: string
  /** JSON-Schema property key (i.e. `properties[name]`). */
  name: string
  /** Display label (`title` in JSON-Schema). */
  label: string
  /** Mapped to `AutoField.type` and back to a JSON-Schema `type` / `format`. */
  type: FieldType
  /** Whether this field is in the schema-level `required` array. */
  required?: boolean
  /** Min — `minLength` for string, `minimum` for number, `min` for slider. */
  min?: number
  /** Max — `maxLength` for string, `maximum` for number, `max` for slider. */
  max?: number
  /** RegExp source (string) for `pattern` validation on string fields. */
  pattern?: string
  /** Default value applied when the form mounts. */
  defaultValue?: unknown
  /** Inline help text rendered below the control. Editor-only. */
  helpText?: string
  /** Placeholder for the rendered control. */
  placeholder?: string
  /** Choices for select / radio. */
  options?: AutoFieldOption[]
}

/**
 * Top-level editor schema. We intentionally do NOT model nested groups /
 * field-arrays in v1 (see TODO in adapters/jsonSchema.ts) — the field list
 * is flat, mirroring `JSONSchema.properties`.
 */
export interface EditorSchema {
  /** Optional schema title shown in the live preview header. */
  title?: string
  /** Optional schema description shown in the live preview header. */
  description?: string
  /** Ordered list of fields. Order maps directly to render order. */
  fields: EditorField[]
}

/**
 * Discriminated union of all supported editor mutations. Routed through the
 * store so undo / redo + onChange callbacks see a single point of truth.
 */
export type EditorAction =
  | { type: 'add'; field: EditorField; index?: number }
  | { type: 'remove'; id: string }
  | { type: 'update'; id: string; patch: Partial<EditorField> }
  | { type: 'move'; id: string; toIndex: number }
  | { type: 'setSchema'; schema: EditorSchema }

/** External, read-only snapshot of the editor store. */
export interface EditorState {
  schema: EditorSchema
  selectedId: string | null
  canUndo: boolean
  canRedo: boolean
}
