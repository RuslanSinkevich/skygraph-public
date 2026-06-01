import { describe, it, expect } from 'vitest'
import { zodRule, zodRules } from '../adapters/zodAdapter'
import type { ZodLikeSchema, ZodObjectLikeSchema } from '../adapters/zodAdapter'

function mockSchema(validator: (v: unknown) => boolean, message = 'Invalid'): ZodLikeSchema {
  return {
    safeParse(value: unknown) {
      if (validator(value)) return { success: true }
      return { success: false, error: { issues: [{ message }] } }
    },
  }
}

describe('zodAdapter', () => {
  describe('zodRule', () => {
    it('returns null for valid value', () => {
      const schema = mockSchema((v) => typeof v === 'string' && v.length > 0)
      const rule = zodRule(schema) as (v: unknown) => string | null
      expect(rule('hello')).toBeNull()
    })

    it('returns error for invalid value', () => {
      const schema = mockSchema((v) => typeof v === 'number', 'Must be number')
      const rule = zodRule(schema) as (v: unknown) => string | null
      expect(rule('oops')).toBe('Must be number')
    })

    it('respects custom message option', () => {
      const schema = mockSchema(() => false, 'Original')
      const rule = zodRule(schema, { message: 'Custom' }) as (v: unknown) => string | null
      expect(rule('x')).toBe('Custom')
    })

    it('joins all issues when pick=all', () => {
      const schema: ZodLikeSchema = {
        safeParse() {
          return {
            success: false,
            error: { issues: [{ message: 'A' }, { message: 'B' }] },
          }
        },
      }
      const rule = zodRule(schema, { pick: 'all' }) as (v: unknown) => string | null
      expect(rule('')).toBe('A; B')
    })
  })

  describe('zodRules', () => {
    it('generates rules for each field in shape', () => {
      const objectSchema: ZodObjectLikeSchema = {
        shape: {
          name: mockSchema((v) => typeof v === 'string' && (v as string).length > 0, 'Required'),
          age: mockSchema((v) => typeof v === 'number', 'Must be number'),
        },
      }

      const rules = zodRules(objectSchema)
      expect(Object.keys(rules)).toEqual(['name', 'age'])
      expect(rules.name).toHaveLength(1)
      expect(rules.age).toHaveLength(1)

      const nameRule = rules.name[0] as (v: unknown) => string | null
      expect(nameRule('')).toBe('Required')
      expect(nameRule('John')).toBeNull()
    })
  })
})
