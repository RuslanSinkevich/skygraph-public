import type { Rule } from '@skygraph/core'
import type { FieldType, AutoFieldOption } from '../components/complex/SchemaForm/AutoField.vue'

export interface JSONSchemaProperty {
  type?: string
  title?: string
  description?: string
  default?: unknown
  enum?: unknown[]
  enumNames?: string[]
  minimum?: number
  maximum?: number
  minLength?: number
  maxLength?: number
  pattern?: string
  format?: string
  items?: JSONSchemaProperty
  required?: string[]
  properties?: Record<string, JSONSchemaProperty>
  oneOf?: Array<{ const: unknown; title?: string }>
}

export interface JSONSchema extends JSONSchemaProperty {
  $schema?: string
}

export interface AutoFieldConfig {
  name: string
  label?: string
  type: FieldType
  placeholder?: string
  options?: AutoFieldOption[]
  min?: number
  max?: number
  step?: number
}

function jsonTypeToFieldType(schema: JSONSchemaProperty): FieldType {
  if (schema.enum || schema.oneOf) return 'select'
  if (schema.format === 'email') return 'email'
  if (schema.format === 'uri' || schema.format === 'url') return 'url'
  if (schema.format === 'date') return 'date'
  if (schema.format === 'time') return 'time'
  if (schema.format === 'password') return 'password'
  if (schema.format === 'color') return 'color'

  switch (schema.type) {
    case 'number':
    case 'integer':
      return 'number'
    case 'boolean':
      return 'boolean'
    case 'array':
      return 'multiselect'
    default:
      if (schema.maxLength && schema.maxLength > 200) return 'textarea'
      return 'string'
  }
}

function buildOptions(schema: JSONSchemaProperty): AutoFieldOption[] | undefined {
  if (schema.oneOf) {
    return schema.oneOf.map((item) => ({
      value: item.const as string | number,
      label: item.title ?? String(item.const),
    }))
  }
  if (schema.enum) {
    return schema.enum.map((val, i) => ({
      value: val as string | number,
      label: schema.enumNames?.[i] ?? String(val),
    }))
  }
  return undefined
}

export function jsonSchemaToFields(schema: JSONSchema): AutoFieldConfig[] {
  const result: AutoFieldConfig[] = []
  const props = schema.properties ?? {}
  for (const [name, prop] of Object.entries(props)) {
    result.push({
      name,
      label: prop.title ?? name,
      type: jsonTypeToFieldType(prop),
      placeholder: prop.description,
      options: buildOptions(prop),
      min: prop.minimum,
      max: prop.maximum,
    })
  }
  return result
}

export function jsonSchemaToRules(schema: JSONSchema): Record<string, Rule[]> {
  const result: Record<string, Rule[]> = {}
  const props = schema.properties ?? {}
  const requiredFields = new Set(schema.required ?? [])

  for (const [name, prop] of Object.entries(props)) {
    const rules: Rule[] = []
    if (requiredFields.has(name)) {
      rules.push({ required: true, message: `${prop.title ?? name} is required` })
    }
    if (prop.type === 'string') {
      if (prop.minLength !== undefined) {
        rules.push({ min: prop.minLength, message: `Minimum ${prop.minLength} characters` })
      }
      if (prop.maxLength !== undefined) {
        rules.push({ max: prop.maxLength, message: `Maximum ${prop.maxLength} characters` })
      }
      if (prop.pattern) {
        rules.push({ pattern: new RegExp(prop.pattern), message: 'Invalid format' })
      }
    }
    if (prop.type === 'number' || prop.type === 'integer') {
      if (prop.minimum !== undefined) rules.push({ min: prop.minimum, type: 'number' })
      if (prop.maximum !== undefined) rules.push({ max: prop.maximum, type: 'number' })
    }
    if (prop.format === 'email') rules.push({ type: 'email' })
    if (prop.format === 'uri' || prop.format === 'url') rules.push({ type: 'url' })
    if (rules.length > 0) result[name] = rules
  }

  return result
}

export function jsonSchemaToDefaults(schema: JSONSchema): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  const props = schema.properties ?? {}
  for (const [name, prop] of Object.entries(props)) {
    if (prop.default !== undefined) {
      result[name] = prop.default
    }
  }
  return result
}
