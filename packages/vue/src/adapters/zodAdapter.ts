import type { Rule, RuleFn } from '@skygraph/core'
import type { JSONSchema } from './jsonSchemaAdapter'

/**
 * Zod schema adapter (Vue port).
 *
 * Converts a Zod schema (or any schema with `.safeParse`) into SkyGraph form
 * rules. Mirrors the React adapter at `@skygraph/react/src/adapters/zodAdapter`
 * — same exports, same shapes, same behaviour. The Vue file is framework-free
 * (no `ref`, no Vue imports) because validation rules are pure functions.
 *
 * Works with Zod v3 / v4 or any library that implements:
 *
 *   { safeParse(value: unknown): { success: boolean; error?: { issues: Array<{ message: string }> } } }
 */
export interface ZodLikeSchema {
  safeParse(value: unknown): {
    success: boolean
    error?: { issues: Array<{ message: string; path?: (string | number)[] }> }
  }
}

export interface ZodAdapterOptions {
  /** Custom error message override. */
  message?: string
  /** Which issue to pick when multiple exist. @default 'first' */
  pick?: 'first' | 'all'
}

/**
 * Convert a single Zod schema into a SkyGraph `Rule` for one field.
 */
export function zodRule(schema: ZodLikeSchema, options?: ZodAdapterOptions): Rule {
  const rule: RuleFn = (value) => {
    const result = schema.safeParse(value)
    if (result.success) return null

    const issues = result.error?.issues ?? []
    if (issues.length === 0) return options?.message ?? 'Validation failed'

    if (options?.pick === 'all') {
      return issues.map((i) => i.message).join('; ')
    }

    return options?.message ?? issues[0].message
  }
  return rule
}

/**
 * Convert a Zod object schema into a `{ field: Rule[] }` map ready for
 * `useForm({ rules: ... })`.
 */
export interface ZodObjectLikeSchema {
  shape: Record<string, ZodLikeSchema>
}

export function zodRules(
  schema: ZodObjectLikeSchema,
  options?: ZodAdapterOptions,
): Record<string, Rule[]> {
  const result: Record<string, Rule[]> = {}
  for (const [key, fieldSchema] of Object.entries(schema.shape)) {
    result[key] = [zodRule(fieldSchema, options)]
  }
  return result
}

/**
 * Extract default values from a Zod schema. Uses `safeParse(undefined)` to
 * trigger Zod's `.default()` mechanism, then reads the parsed data.
 */
export function zodDefaults(schema: ZodObjectLikeSchema): Record<string, unknown> {
  const defaults: Record<string, unknown> = {}
  for (const [key, fieldSchema] of Object.entries(schema.shape)) {
    try {
      const result = fieldSchema.safeParse(undefined) as {
        success: boolean
        data?: unknown
        error?: { issues: Array<{ message: string }> }
      }
      if (result.success && result.data !== undefined) {
        defaults[key] = result.data
      }
    } catch {
      // Skip fields without defaults — Zod throws on schemas like ZodNever.
    }
  }
  return defaults
}

interface ZodDef {
  typeName?: string
  checks?: Array<{ kind: string; value?: unknown; regex?: RegExp; message?: string }>
  values?: unknown[]
  innerType?: { _def: ZodDef }
  type?: { _def: ZodDef }
  options?: Array<{ _def: ZodDef }>
}

interface ZodFieldSchema {
  _def: ZodDef
  description?: string
}

interface ZodObjectSchema {
  _def: ZodDef
  shape?: Record<string, ZodFieldSchema>
}

/**
 * Convert a Zod object schema to a minimal JSON Schema for `SgSchemaForm`.
 */
export function zodToJsonSchema(schema: ZodObjectSchema): JSONSchema {
  const properties: Record<string, Record<string, unknown>> = {}
  const required: string[] = []

  const shape =
    schema.shape ?? (schema as unknown as { shape: Record<string, ZodFieldSchema> }).shape
  if (!shape) return { properties, required }

  for (const [key, field] of Object.entries(shape)) {
    const prop: Record<string, unknown> = { title: key }
    let def: ZodDef = field._def

    if (def.typeName === 'ZodOptional' || def.typeName === 'ZodNullable') {
      def = def.innerType?._def ?? def
    } else {
      required.push(key)
    }

    if (def.typeName === 'ZodDefault') {
      prop.default = (def as unknown as { defaultValue: () => unknown }).defaultValue?.()
      def = def.innerType?._def ?? def
    }

    switch (def.typeName) {
      case 'ZodString':
        prop.type = 'string'
        for (const check of def.checks ?? []) {
          if (check.kind === 'min') prop.minLength = check.value
          if (check.kind === 'max') prop.maxLength = check.value
          if (check.kind === 'email') prop.format = 'email'
          if (check.kind === 'url') prop.format = 'url'
          if (check.kind === 'regex' && check.regex) prop.pattern = check.regex.source
        }
        break
      case 'ZodNumber':
        prop.type = 'number'
        for (const check of def.checks ?? []) {
          if (check.kind === 'min') prop.minimum = check.value
          if (check.kind === 'max') prop.maximum = check.value
        }
        break
      case 'ZodBoolean':
        prop.type = 'boolean'
        break
      case 'ZodEnum':
        prop.type = 'string'
        prop.enum = def.values ?? []
        break
      case 'ZodDate':
        prop.type = 'string'
        prop.format = 'date'
        break
      default:
        prop.type = 'string'
    }

    if (field.description) prop.description = field.description

    properties[key] = prop
  }

  return { properties, required }
}
