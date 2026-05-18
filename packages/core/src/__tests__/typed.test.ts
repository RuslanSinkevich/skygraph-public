import { describe, it, expect, vi } from 'vitest'
import { createCore } from '../Core'
import { createTypedCore } from '../typed'
import type { TypedCore as _TypedCore } from '../typed'

interface AppSchema {
  user: {
    name: string
    age: number
    address: {
      city: string
      zip: string
    }
  }
  settings: {
    theme: string
    notifications: boolean
  }
}

describe('TypedCore', () => {
  it('provides type-safe get/set', () => {
    const core = createCore()
    const typed = createTypedCore<AppSchema>(core)

    typed.set('user.name', 'Ruslan')
    typed.set('user.age', 28)
    typed.set('user.address.city', 'Moscow')
    typed.set('settings.theme', 'dark')
    typed.set('settings.notifications', true)

    expect(typed.get('user.name')).toBe('Ruslan')
    expect(typed.get('user.age')).toBe(28)
    expect(typed.get('user.address.city')).toBe('Moscow')
    expect(typed.get('settings.theme')).toBe('dark')
    expect(typed.get('settings.notifications')).toBe(true)
  })

  it('subscribe works with typed paths', () => {
    const core = createCore()
    const typed = createTypedCore<AppSchema>(core)

    const cb = vi.fn()
    typed.subscribe('user.name', cb)

    typed.set('user.name', 'Test')
    expect(cb).toHaveBeenCalledWith('Test')
  })

  it('batch and transaction work', () => {
    const core = createCore()
    const typed = createTypedCore<AppSchema>(core)

    const cb = vi.fn()
    typed.subscribe('user.name', cb)

    typed.batch(() => {
      typed.set('user.name', 'A')
      typed.set('user.name', 'B')
    })

    expect(cb).toHaveBeenCalledTimes(1)
    expect(cb).toHaveBeenCalledWith('B')
  })

  it('computed works with typed paths', () => {
    const core = createCore()
    const typed = createTypedCore<AppSchema>(core)

    typed.set('user.name', 'Ruslan')
    typed.set('user.address.city', 'Moscow')

    // raw core for untyped computed (result path not in schema)
    typed.raw.computed(
      'user.address.zip',
      ['user.address.city'],
      (city) => (city === 'Moscow' ? '101000' : '000000')
    )

    expect(typed.get('user.address.zip')).toBe('101000')
  })

  it('exposes raw core', () => {
    const core = createCore()
    const typed = createTypedCore<AppSchema>(core)

    typed.set('user.name', 'Test')
    expect(typed.raw.get('user.name')).toBe('Test')
  })
})
