import { describe, it, expect } from 'vitest'
import {
  jsonSchemaToFields,
  jsonSchemaToRules,
  jsonSchemaToDefaults,
} from '../adapters/jsonSchemaAdapter'
import type { JSONSchema } from '../adapters/jsonSchemaAdapter'

const testSchema: JSONSchema = {
  properties: {
    name: { type: 'string', title: 'Name', minLength: 2, maxLength: 50 },
    email: { type: 'string', format: 'email', title: 'Email' },
    age: { type: 'number', title: 'Age', minimum: 0, maximum: 150 },
    active: { type: 'boolean', title: 'Active' },
    role: {
      type: 'string',
      title: 'Role',
      enum: ['admin', 'user', 'editor'],
      enumNames: ['Administrator', 'User', 'Editor'],
    },
    bio: { type: 'string', title: 'Bio', maxLength: 500 },
    website: { type: 'string', format: 'url', title: 'Website' },
  },
  required: ['name', 'email'],
}

describe('jsonSchemaToFields', () => {
  it('converts schema properties to field configs', () => {
    const fields = jsonSchemaToFields(testSchema)
    expect(fields.length).toBe(7)

    const nameField = fields.find((f) => f.name === 'name')
    expect(nameField?.type).toBe('string')
    expect(nameField?.label).toBe('Name')

    const emailField = fields.find((f) => f.name === 'email')
    expect(emailField?.type).toBe('email')

    const ageField = fields.find((f) => f.name === 'age')
    expect(ageField?.type).toBe('number')
    expect(ageField?.min).toBe(0)
    expect(ageField?.max).toBe(150)

    const activeField = fields.find((f) => f.name === 'active')
    expect(activeField?.type).toBe('boolean')

    const roleField = fields.find((f) => f.name === 'role')
    expect(roleField?.type).toBe('select')
    expect(roleField?.options).toEqual([
      { value: 'admin', label: 'Administrator' },
      { value: 'user', label: 'User' },
      { value: 'editor', label: 'Editor' },
    ])

    const websiteField = fields.find((f) => f.name === 'website')
    expect(websiteField?.type).toBe('url')
  })

  it('uses textarea for long strings', () => {
    const schema: JSONSchema = {
      properties: {
        text: { type: 'string', maxLength: 500 },
      },
    }
    const fields = jsonSchemaToFields(schema)
    expect(fields[0].type).toBe('textarea')
  })
})

describe('jsonSchemaToRules', () => {
  it('generates required rules', () => {
    const rules = jsonSchemaToRules(testSchema)
    expect(rules['name']).toBeDefined()
    expect(rules['name'].length).toBeGreaterThan(0)
    expect(rules['email']).toBeDefined()
  })

  it('generates string length rules', () => {
    const rules = jsonSchemaToRules(testSchema)
    expect(rules['name'].length).toBeGreaterThanOrEqual(2)
  })

  it('generates email type rule', () => {
    const rules = jsonSchemaToRules(testSchema)
    const emailRules = rules['email']
    expect(emailRules.some((r) => typeof r === 'object' && r.type === 'email')).toBe(true)
  })
})

describe('jsonSchemaToDefaults', () => {
  it('extracts defaults', () => {
    const schema: JSONSchema = {
      properties: {
        name: { type: 'string', default: 'John' },
        age: { type: 'number', default: 25 },
        bio: { type: 'string' },
      },
    }

    const defaults = jsonSchemaToDefaults(schema)
    expect(defaults).toEqual({ name: 'John', age: 25 })
  })

  it('returns empty for no defaults', () => {
    const defaults = jsonSchemaToDefaults(testSchema)
    expect(defaults).toEqual({})
  })
})

describe('oneOf support', () => {
  it('handles oneOf as select options', () => {
    const schema: JSONSchema = {
      properties: {
        status: {
          title: 'Status',
          oneOf: [
            { const: 'draft', title: 'Draft' },
            { const: 'published', title: 'Published' },
          ],
        },
      },
    }
    const fields = jsonSchemaToFields(schema)
    expect(fields[0].type).toBe('select')
    expect(fields[0].options).toEqual([
      { value: 'draft', label: 'Draft' },
      { value: 'published', label: 'Published' },
    ])
  })
})
