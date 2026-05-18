import { describe, it, expect, vi } from 'vitest'
import { createCore } from '../Core'
import { createForm } from '../engines/form/FormEngine'

describe('FormEngine: register/unregister', () => {
  it('registers a field with default value', () => {
    const core = createCore()
    const form = createForm(core)

    form.register('username', { defaultValue: '' })
    expect(form.getValue('username')).toBe('')
    expect(form.getFieldState('username').touched).toBe(false)
    expect(form.getFieldState('username').dirty).toBe(false)
    expect(form.getFieldState('username').errors).toEqual([])
    expect(form.getFieldState('username').error).toBeNull()
  })

  it('does not overwrite existing value on register', () => {
    const core = createCore()
    core.set('name', 'Ruslan')
    const form = createForm(core)

    form.register('name', { defaultValue: 'Default' })
    expect(form.getValue('name')).toBe('Ruslan')
  })

  it('unregisters a field', () => {
    const core = createCore()
    const form = createForm(core)
    form.register('x')
    form.unregister('x')
    expect(form.getFormState().isDirty).toBe(false)
  })
})

describe('FormEngine: setValue', () => {
  it('sets value and marks dirty + touched', () => {
    const core = createCore()
    const form = createForm(core)
    form.register('name')

    form.setValue('name', 'Ruslan')

    expect(form.getValue('name')).toBe('Ruslan')
    expect(form.getFieldState('name').dirty).toBe(true)
    expect(form.getFieldState('name').touched).toBe(true)
  })

  it('notifies core subscribers', () => {
    const core = createCore()
    const form = createForm(core)
    form.register('name')

    const cb = vi.fn()
    core.subscribe('name', cb)

    form.setValue('name', 'Hello')
    expect(cb).toHaveBeenCalledWith('Hello')
  })
})

describe('FormEngine: validation', () => {
  it('runs sync validation on setValue', async () => {
    const core = createCore()
    const form = createForm(core)

    const required = (v: unknown) => (!v ? 'Required' : null)
    form.register('email', { rules: [required] })

    form.setValue('email', '')
    await new Promise((r) => setTimeout(r, 10))

    expect(form.getFieldState('email').errors).toEqual(['Required'])
    expect(form.getFieldState('email').error).toBe('Required')
  })

  it('clears error when value becomes valid', async () => {
    const core = createCore()
    const form = createForm(core)

    const required = (v: unknown) => (!v ? 'Required' : null)
    form.register('email', { rules: [required] })

    form.setValue('email', '')
    await new Promise((r) => setTimeout(r, 10))
    expect(form.getFieldState('email').errors).toEqual(['Required'])

    form.setValue('email', 'test@mail.com')
    await new Promise((r) => setTimeout(r, 10))
    expect(form.getFieldState('email').errors).toEqual([])
    expect(form.getFieldState('email').error).toBeNull()
  })

  it('runs async validation', async () => {
    const core = createCore()
    const form = createForm(core)

    const asyncRule = async (v: unknown) => {
      await new Promise((r) => setTimeout(r, 5))
      return v === 'taken' ? 'Already taken' : null
    }
    form.register('username', { rules: [asyncRule] })

    form.setValue('username', 'taken')
    await new Promise((r) => setTimeout(r, 20))

    expect(form.getFieldState('username').errors).toEqual(['Already taken'])
  })

  it('cancels stale async validation (AbortController)', async () => {
    const core = createCore()
    const form = createForm(core)

    const slowRule = async (v: unknown) => {
      await new Promise((r) => setTimeout(r, 50))
      return v === 'bad' ? 'Error' : null
    }
    form.register('field', { rules: [slowRule] })

    form.setValue('field', 'bad')
    form.setValue('field', 'good')

    await new Promise((r) => setTimeout(r, 100))

    expect(form.getFieldState('field').errors).toEqual([])
  })

  it('validates all fields on form.validate()', async () => {
    const core = createCore()
    const form = createForm(core)

    const required = (v: unknown) => (!v ? 'Required' : null)
    form.register('a', { rules: [required] })
    form.register('b', { rules: [required] })

    const result = await form.validate()
    expect(result.valid).toBe(false)
    expect(result.errors['a']).toEqual(['Required'])
    expect(result.errors['b']).toEqual(['Required'])
  })

  it('validates single field', async () => {
    const core = createCore()
    const form = createForm(core)

    const required = (v: unknown) => (!v ? 'Required' : null)
    form.register('a', { rules: [required] })
    form.register('b', { rules: [required] })

    const result = await form.validate('a')
    expect(result.valid).toBe(false)
    expect(result.errors['a']).toEqual(['Required'])
    expect(result.errors['b']).toBeUndefined()
  })
})

describe('FormEngine: depends', () => {
  it('revalidates dependent field when dependency changes', async () => {
    const core = createCore()
    const form = createForm(core)

    form.register('password')
    form.register('confirm', {
      rules: [
        (v: unknown) =>
          v !== core.get('password') ? 'Passwords must match' : null,
      ],
    })

    form.depends('confirm', ['password'])

    form.setValue('password', 'abc')
    form.setValue('confirm', 'abc')
    await new Promise((r) => setTimeout(r, 20))
    expect(form.getFieldState('confirm').errors).toEqual([])

    form.setValue('password', 'changed')
    await new Promise((r) => setTimeout(r, 20))
    expect(form.getFieldState('confirm').errors).toEqual(['Passwords must match'])
  })
})

describe('FormEngine: submit', () => {
  it('calls handler with values on valid form', async () => {
    const core = createCore()
    const form = createForm(core)
    form.register('name', { defaultValue: 'Ruslan' })

    const handler = vi.fn().mockResolvedValue(undefined)
    await form.submit(handler)

    expect(handler).toHaveBeenCalledWith({ name: 'Ruslan' })
  })

  it('does not call handler if validation fails', async () => {
    const core = createCore()
    const form = createForm(core)
    form.register('email', { rules: [(v) => (!v ? 'Required' : null)] })

    const handler = vi.fn()
    await form.submit(handler)

    expect(handler).not.toHaveBeenCalled()
  })

  it('marks all fields as touched on submit', async () => {
    const core = createCore()
    const form = createForm(core)
    form.register('a')
    form.register('b')

    await form.submit(vi.fn().mockResolvedValue(undefined))

    expect(form.getFieldState('a').touched).toBe(true)
    expect(form.getFieldState('b').touched).toBe(true)
  })
})

describe('FormEngine: reset', () => {
  it('resets to default values', () => {
    const core = createCore()
    const form = createForm(core)
    form.register('name', { defaultValue: 'Default' })

    form.setValue('name', 'Changed')
    expect(form.getValue('name')).toBe('Changed')
    expect(form.getFieldState('name').dirty).toBe(true)

    form.reset()
    expect(form.getValue('name')).toBe('Default')
    expect(form.getFieldState('name').dirty).toBe(false)
    expect(form.getFieldState('name').touched).toBe(false)
    expect(form.getFieldState('name').errors).toEqual([])
  })

  it('resets to provided values', () => {
    const core = createCore()
    const form = createForm(core)
    form.register('name', { defaultValue: 'Default' })

    form.reset({ name: 'Override' })
    expect(form.getValue('name')).toBe('Override')
  })
})

describe('FormEngine: getFormState', () => {
  it('reports isDirty correctly', () => {
    const core = createCore()
    const form = createForm(core)
    form.register('x')

    expect(form.getFormState().isDirty).toBe(false)
    form.setValue('x', 'dirty')
    expect(form.getFormState().isDirty).toBe(true)
  })

  it('reports isValid correctly', async () => {
    const core = createCore()
    const form = createForm(core)
    form.register('x', { rules: [(v) => (!v ? 'Err' : null)] })

    await form.validate()
    expect(form.getFormState().isValid).toBe(false)

    form.setValue('x', 'ok')
    await new Promise((r) => setTimeout(r, 10))
    expect(form.getFormState().isValid).toBe(true)
  })
})
