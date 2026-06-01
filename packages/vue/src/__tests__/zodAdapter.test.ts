import { describe, it, expect } from 'vitest'
import { zodRule, zodRules, zodDefaults } from '../adapters/zodAdapter'
import type { ZodLikeSchema, ZodObjectLikeSchema } from '../adapters/zodAdapter'

function mockSchema(validator: (v: unknown) => boolean, message = 'Invalid'): ZodLikeSchema {
  return {
    safeParse(value: unknown) {
      if (validator(value)) return { success: true }
      return { success: false, error: { issues: [{ message }] } }
    },
  }
}

describe('zodAdapter (Vue parity port)', () => {
  describe('zodRule', () => {
    it('returns null for a valid value', () => {
      const schema = mockSchema((v) => typeof v === 'string' && v.length > 0)
      const rule = zodRule(schema) as (v: unknown) => string | null
      expect(rule('hello')).toBeNull()
    })

    it('returns the issue message for an invalid value', () => {
      const schema = mockSchema((v) => typeof v === 'number', 'Must be number')
      const rule = zodRule(schema) as (v: unknown) => string | null
      expect(rule('oops')).toBe('Must be number')
    })

    it('honours options.message override', () => {
      const schema = mockSchema(() => false, 'Original')
      const rule = zodRule(schema, { message: 'Custom' }) as (v: unknown) => string | null
      expect(rule('x')).toBe('Custom')
    })

    it('joins every issue when pick="all"', () => {
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

    it('falls back to a generic message when issues array is empty', () => {
      const schema: ZodLikeSchema = {
        safeParse() {
          return { success: false, error: { issues: [] } }
        },
      }
      const rule = zodRule(schema) as (v: unknown) => string | null
      expect(rule('x')).toBe('Validation failed')
    })
  })

  describe('zodRules', () => {
    it('generates rules for every field in the object schema shape', () => {
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

      const ageRule = rules.age[0] as (v: unknown) => string | null
      expect(ageRule(42)).toBeNull()
      expect(ageRule('not a number')).toBe('Must be number')
    })
  })

  describe('zodDefaults', () => {
    it('reads .data when safeParse(undefined) succeeds', () => {
      const objectSchema: ZodObjectLikeSchema = {
        shape: {
          a: {
            safeParse: () =>
              ({ success: true, data: 1 }) as unknown as ReturnType<ZodLikeSchema['safeParse']>,
          },
          b: {
            safeParse: () =>
              ({ success: true, data: 'hi' }) as unknown as ReturnType<ZodLikeSchema['safeParse']>,
          },
          c: { safeParse: () => ({ success: false }) as ReturnType<ZodLikeSchema['safeParse']> },
        },
      }
      const defaults = zodDefaults(objectSchema)
      expect(defaults).toEqual({ a: 1, b: 'hi' })
    })

    it('skips fields whose safeParse throws', () => {
      const objectSchema: ZodObjectLikeSchema = {
        shape: {
          a: {
            safeParse: () => {
              throw new Error('boom')
            },
          },
          b: {
            safeParse: () =>
              ({ success: true, data: 2 }) as unknown as ReturnType<ZodLikeSchema['safeParse']>,
          },
        },
      }
      const defaults = zodDefaults(objectSchema)
      expect(defaults).toEqual({ b: 2 })
    })
  })
})
