import type { FieldType, AutoFieldOption } from '../SchemaForm/AutoField.vue'

export interface EditorField {
  /** Stable client-side identifier (survives renames / reorders). */
  id: string
  /** JSON-Schema property key. */
  name: string
  /** Display label. */
  label: string
  /** Mapped to AutoField.type and back to a JSON-Schema type/format. */
  type: FieldType
  /** Whether this field is in the schema-level required array. */
  required?: boolean
  /** Min — minLength for string, minimum for number, min for slider. */
  min?: number
  /** Max — maxLength for string, maximum for number, max for slider. */
  max?: number
  /** RegExp source (string) for pattern validation. */
  pattern?: string
  /** Default value applied when the form mounts. */
  defaultValue?: unknown
  /** Inline help text rendered below the control. */
  helpText?: string
  /** Placeholder for the rendered control. */
  placeholder?: string
  /** Choices for select / radio. */
  options?: AutoFieldOption[]
}

export interface EditorSchema {
  title?: string
  description?: string
  fields: EditorField[]
}

export type EditorAction =
  | { type: 'add'; field: EditorField; index?: number }
  | { type: 'remove'; id: string }
  | { type: 'update'; id: string; patch: Partial<EditorField> }
  | { type: 'move'; id: string; toIndex: number }
  | { type: 'setSchema'; schema: EditorSchema }

export interface EditorState {
  schema: EditorSchema
  selectedId: string | null
  canUndo: boolean
  canRedo: boolean
}
