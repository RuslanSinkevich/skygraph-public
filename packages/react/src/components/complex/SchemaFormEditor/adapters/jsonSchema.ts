import type { JSONSchema, JSONSchemaProperty } from '../../../../adapters/jsonSchemaAdapter'
import type { FieldType } from '../../AutoField/AutoField'
import type { EditorField, EditorSchema } from '../types'

let idCounter = 0
function nextId(prefix = 'fld'): string {
  idCounter++
  return `${prefix}_${Date.now().toString(36)}_${idCounter}`
}

/**
 * Map a `FieldType` (the SkyGraph runtime type) to the matching pair of
 * JSON-Schema `type` and `format`. Anything we cannot round-trip cleanly
 * (e.g. `slider` — JSON-Schema has no slider hint) is exported as
 * `type: number` plus a `description` marker, see TODO below.
 */
function fieldTypeToJsonSchemaType(
  type: FieldType,
): { type: JSONSchemaProperty['type']; format?: string } {
  switch (type) {
    case 'string':
    case 'textarea':
      return { type: 'string' }
    case 'email':
      return { type: 'string', format: 'email' }
    case 'url':
      return { type: 'string', format: 'url' }
    case 'date':
      return { type: 'string', format: 'date' }
    case 'time':
      return { type: 'string', format: 'time' }
    case 'password':
      return { type: 'string', format: 'password' }
    case 'color':
      return { type: 'string', format: 'color' }
    case 'number':
    case 'slider':
    case 'rate':
      // TODO: `slider` / `rate` are SkyGraph extensions; we lose the visual
      // hint when round-tripping through pure JSON Schema.
      return { type: 'number' }
    case 'boolean':
    case 'switch':
      return { type: 'boolean' }
    case 'select':
    case 'radio':
      return { type: 'string' }
    case 'multiselect':
      return { type: 'array' }
    case 'file':
      return { type: 'string' }
    default:
      return { type: 'string' }
  }
}

/**
 * Best-effort inverse of `fieldTypeToJsonSchemaType`. Defaults to `string`
 * if we cannot determine the precise widget — the inspector lets the user
 * change it later.
 */
function jsonSchemaPropertyToFieldType(prop: JSONSchemaProperty): FieldType {
  if (prop.enum || prop.oneOf) return 'select'
  if (prop.format === 'email') return 'email'
  if (prop.format === 'uri' || prop.format === 'url') return 'url'
  if (prop.format === 'date') return 'date'
  if (prop.format === 'time') return 'time'
  if (prop.format === 'password') return 'password'
  if (prop.format === 'color') return 'color'

  switch (prop.type) {
    case 'number':
    case 'integer':
      return 'number'
    case 'boolean':
      return 'boolean'
    case 'array':
      return 'multiselect'
    default:
      if (prop.maxLength && prop.maxLength > 200) return 'textarea'
      return 'string'
  }
}

/** Build an empty editor schema. Useful for the "blank canvas" demo. */
export function createEmptyEditorSchema(): EditorSchema {
  return { fields: [] }
}

/**
 * Convert a plain JSON Schema (the same shape `SchemaForm` accepts) to an
 * `EditorSchema`. Property order is preserved (`Object.entries` is stable
 * for string keys per ES2015).
 */
export function jsonSchemaToEditorSchema(schema: JSONSchema): EditorSchema {
  const props = schema.properties ?? {}
  const required = new Set(schema.required ?? [])

  const fields: EditorField[] = []
  for (const [name, prop] of Object.entries(props)) {
    const ftype = jsonSchemaPropertyToFieldType(prop)
    fields.push({
      id: nextId('imp'),
      name,
      label: prop.title ?? name,
      type: ftype,
      required: required.has(name),
      min: prop.minimum ?? prop.minLength,
      max: prop.maximum ?? prop.maxLength,
      pattern: prop.pattern,
      defaultValue: prop.default,
      helpText: prop.description,
      placeholder: undefined,
      options:
        prop.oneOf?.map((o) => ({
          value: o.const as string | number,
          label: o.title ?? String(o.const),
        })) ??
        prop.enum?.map((v, i) => ({
          value: v as string | number,
          label: prop.enumNames?.[i] ?? String(v),
        })),
    })
  }

  return {
    title: schema.title,
    description: schema.description,
    fields,
  }
}

/** Serialize an `EditorField` to a single JSON-Schema property entry. */
function editorFieldToProperty(field: EditorField): JSONSchemaProperty {
  const { type, format } = fieldTypeToJsonSchemaType(field.type)
  const prop: JSONSchemaProperty = { type }
  if (format) prop.format = format
  if (field.label && field.label !== field.name) prop.title = field.label
  if (field.helpText) prop.description = field.helpText
  if (field.defaultValue !== undefined) prop.default = field.defaultValue

  if (type === 'string') {
    if (field.min !== undefined) prop.minLength = field.min
    if (field.max !== undefined) prop.maxLength = field.max
    if (field.pattern) prop.pattern = field.pattern
  } else if (type === 'number' || type === 'integer') {
    if (field.min !== undefined) prop.minimum = field.min
    if (field.max !== undefined) prop.maximum = field.max
  }

  if (field.options && field.options.length > 0) {
    prop.enum = field.options.map((o) => o.value)
    prop.enumNames = field.options.map((o) => o.label)
  }

  if (field.type === 'textarea' && prop.maxLength === undefined) {
    // Keep round-trip stable: textarea inference requires maxLength > 200.
    prop.maxLength = 1000
  }

  return prop
}

/** Convert an `EditorSchema` back to a plain JSON Schema. */
export function editorSchemaToJsonSchema(editor: EditorSchema): JSONSchema {
  const properties: Record<string, JSONSchemaProperty> = {}
  const required: string[] = []
  for (const field of editor.fields) {
    properties[field.name] = editorFieldToProperty(field)
    if (field.required) required.push(field.name)
  }
  const out: JSONSchema = {
    type: 'object',
    properties,
  }
  if (required.length > 0) out.required = required
  if (editor.title) out.title = editor.title
  if (editor.description) out.description = editor.description
  return out
}

/**
 * Factory for newly-dropped palette items. Keeps the per-type defaults in
 * one place so the palette and the inspector agree on what e.g. a brand-new
 * "Slider" should look like.
 */
export function createFieldFromPaletteType(type: FieldType, existingNames: string[]): EditorField {
  const baseName = `field${existingNames.length + 1}`
  let name = baseName
  let suffix = 1
  while (existingNames.includes(name)) {
    suffix++
    name = `${baseName}_${suffix}`
  }

  const baseLabel = type.charAt(0).toUpperCase() + type.slice(1)
  const field: EditorField = {
    id: nextId('new'),
    name,
    label: baseLabel,
    type,
  }

  if (type === 'select' || type === 'radio') {
    field.options = [
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2' },
    ]
  }
  if (type === 'number' || type === 'slider') {
    field.min = 0
    field.max = 100
  }
  if (type === 'rate') {
    field.max = 5
  }

  return field
}
