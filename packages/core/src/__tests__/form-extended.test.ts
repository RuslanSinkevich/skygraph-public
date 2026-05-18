import { describe, it, expect, vi } from 'vitest'
import { createCore } from '../Core'
import { createForm } from '../engines/form/FormEngine'

describe('FormEngine: multiple errors', () => {
  it('collects errors from multiple rules', async () => {
    const core = createCore()
    const form = createForm(core)

    form.register('password', {
      rules: [
        (v) => (!v ? 'Required' : null),
        (v) => (typeof v === 'string' && v.length < 8 ? 'Min 8 chars' : null),
        (v) => (typeof v === 'string' && !/[A-Z]/.test(v) ? 'Need uppercase' : null),
      ],
    })

    form.setValue('password', 'abc')
    await new Promise((r) => setTimeout(r, 10))

    const state = form.getFieldState('password')
    expect(state.errors).toEqual(['Min 8 chars', 'Need uppercase'])
    expect(state.error).toBe('Min 8 chars')
    expect(state.status).toBe('error')
  })

  it('validateFirst stops after first error', async () => {
    const core = createCore()
    const form = createForm(core, { validateFirst: true })

    form.register('password', {
      rules: [
        (v) => (!v ? 'Required' : null),
        (v) => (typeof v === 'string' && v.length < 8 ? 'Min 8 chars' : null),
        (v) => (typeof v === 'string' && !/[A-Z]/.test(v) ? 'Need uppercase' : null),
      ],
    })

    form.setValue('password', 'abc')
    await new Promise((r) => setTimeout(r, 10))

    expect(form.getFieldState('password').errors).toEqual(['Min 8 chars'])
  })
})

describe('FormEngine: warnings', () => {
  it('collects warnings separately from errors', async () => {
    const core = createCore()
    const form = createForm(core)

    form.register('name', {
      rules: [(v) => (!v ? 'Required' : null)],
      warningRules: [(v) => (typeof v === 'string' && v.length < 3 ? 'Too short for display' : null)],
    })

    form.setValue('name', 'AB')
    await new Promise((r) => setTimeout(r, 10))

    const state = form.getFieldState('name')
    expect(state.errors).toEqual([])
    expect(state.warnings).toEqual(['Too short for display'])
    expect(state.status).toBe('warning')
  })

  it('errors take priority over warnings in status', async () => {
    const core = createCore()
    const form = createForm(core)

    form.register('name', {
      rules: [(v) => (typeof v === 'string' && v.length < 2 ? 'Min 2' : null)],
      warningRules: [() => 'Always warn'],
    })

    form.setValue('name', 'X')
    await new Promise((r) => setTimeout(r, 10))

    const state = form.getFieldState('name')
    expect(state.status).toBe('error')
    expect(state.errors).toEqual(['Min 2'])
    expect(state.warnings).toEqual(['Always warn'])
  })
})

describe('FormEngine: setFieldError / setFieldWarning', () => {
  it('sets manual errors', () => {
    const core = createCore()
    const form = createForm(core)
    form.register('email')

    form.setFieldError('email', 'Server: email taken')
    expect(form.getFieldErrors('email')).toEqual(['Server: email taken'])
    expect(form.getFieldState('email').status).toBe('error')
  })

  it('sets array of errors', () => {
    const core = createCore()
    const form = createForm(core)
    form.register('email')

    form.setFieldError('email', ['Error 1', 'Error 2'])
    expect(form.getFieldErrors('email')).toEqual(['Error 1', 'Error 2'])
  })

  it('sets warnings', () => {
    const core = createCore()
    const form = createForm(core)
    form.register('name')

    form.setFieldWarning('name', 'Looks suspicious')
    expect(form.getFieldWarnings('name')).toEqual(['Looks suspicious'])
    expect(form.getFieldState('name').status).toBe('warning')
  })

  it('clearFieldErrors clears both', () => {
    const core = createCore()
    const form = createForm(core)
    form.register('field')

    form.setFieldError('field', 'err')
    form.setFieldWarning('field', 'warn')
    form.clearFieldErrors('field')

    expect(form.getFieldErrors('field')).toEqual([])
    expect(form.getFieldWarnings('field')).toEqual([])
    expect(form.getFieldState('field').status).toBeUndefined()
  })
})

describe('FormEngine: isFieldTouched / isFieldValidating', () => {
  it('isFieldTouched returns false initially', () => {
    const core = createCore()
    const form = createForm(core)
    form.register('x')
    expect(form.isFieldTouched('x')).toBe(false)
  })

  it('isFieldTouched returns true after setValue', () => {
    const core = createCore()
    const form = createForm(core)
    form.register('x')
    form.setValue('x', 'val')
    expect(form.isFieldTouched('x')).toBe(true)
  })

  it('isFieldValidating during async', async () => {
    const core = createCore()
    const form = createForm(core)

    form.register('x', {
      rules: [
        async () => {
          await new Promise((r) => setTimeout(r, 50))
          return null
        },
      ],
    })

    form.setValue('x', 'val')
    await new Promise((r) => setTimeout(r, 5))
    expect(form.isFieldValidating('x')).toBe(true)

    await new Promise((r) => setTimeout(r, 60))
    expect(form.isFieldValidating('x')).toBe(false)
  })
})

describe('FormEngine: onValuesChange / onFieldsChange', () => {
  it('fires onValuesChange on setValue', () => {
    const cb = vi.fn()
    const core = createCore()
    const form = createForm(core, { onValuesChange: cb })
    form.register('name')

    form.setValue('name', 'Ruslan')
    expect(cb).toHaveBeenCalledWith({ name: 'Ruslan' }, { name: 'Ruslan' })
  })

  it('fires onFieldsChange after validation', async () => {
    const cb = vi.fn()
    const core = createCore()
    const form = createForm(core, { onFieldsChange: cb })
    form.register('email', { rules: [(v) => (!v ? 'Required' : null)] })

    form.setValue('email', '')
    await new Promise((r) => setTimeout(r, 10))

    expect(cb).toHaveBeenCalled()
    const call = cb.mock.calls[cb.mock.calls.length - 1][0]
    expect(call[0].name).toBe('email')
    expect(call[0].errors).toEqual(['Required'])
  })
})

describe('FormEngine: validateMessages templates', () => {
  it('uses template for required', async () => {
    const core = createCore()
    const form = createForm(core, {
      validateMessages: { required: '${label} обязательно' },
    })

    form.register('username', {
      label: 'Имя',
      rules: [{ required: true }],
    })

    form.setValue('username', '')
    await new Promise((r) => setTimeout(r, 10))

    expect(form.getFieldState('username').errors).toEqual(['Имя обязательно'])
  })
})

describe('FormEngine: RuleObject validation', () => {
  it('validates type: email', async () => {
    const core = createCore()
    const form = createForm(core)
    form.register('email', { rules: [{ type: 'email' }] })

    form.setValue('email', 'not-an-email')
    await new Promise((r) => setTimeout(r, 10))
    expect(form.getFieldState('email').errors).toEqual(['Invalid email'])

    form.setValue('email', 'test@example.com')
    await new Promise((r) => setTimeout(r, 10))
    expect(form.getFieldState('email').errors).toEqual([])
  })

  it('validates min/max for strings', async () => {
    const core = createCore()
    const form = createForm(core)
    form.register('name', { rules: [{ min: 3, max: 10 }] })

    form.setValue('name', 'ab')
    await new Promise((r) => setTimeout(r, 10))
    expect(form.getFieldState('name').errors.length).toBe(1)

    form.setValue('name', 'hello')
    await new Promise((r) => setTimeout(r, 10))
    expect(form.getFieldState('name').errors).toEqual([])
  })

  it('validates pattern', async () => {
    const core = createCore()
    const form = createForm(core)
    form.register('code', { rules: [{ pattern: /^[A-Z]+$/ }] })

    form.setValue('code', 'abc')
    await new Promise((r) => setTimeout(r, 10))
    expect(form.getFieldState('code').errors).toEqual(['Invalid format'])

    form.setValue('code', 'ABC')
    await new Promise((r) => setTimeout(r, 10))
    expect(form.getFieldState('code').errors).toEqual([])
  })
})

describe('FormEngine: list operations', () => {
  it('listAdd appends by default', () => {
    const core = createCore()
    const form = createForm(core)
    core.set('items', ['a', 'b'])
    form.register('items')

    form.listAdd('items', 'c')
    expect(form.getListValue('items')).toEqual(['a', 'b', 'c'])
  })

  it('listAdd inserts at index', () => {
    const core = createCore()
    const form = createForm(core)
    core.set('items', ['a', 'c'])
    form.register('items')

    form.listAdd('items', 'b', 1)
    expect(form.getListValue('items')).toEqual(['a', 'b', 'c'])
  })

  it('listRemove removes single index', () => {
    const core = createCore()
    const form = createForm(core)
    core.set('items', ['a', 'b', 'c'])
    form.register('items')

    form.listRemove('items', 1)
    expect(form.getListValue('items')).toEqual(['a', 'c'])
  })

  it('listRemove removes multiple indices', () => {
    const core = createCore()
    const form = createForm(core)
    core.set('items', ['a', 'b', 'c', 'd'])
    form.register('items')

    form.listRemove('items', [0, 2])
    expect(form.getListValue('items')).toEqual(['b', 'd'])
  })

  it('listMove reorders items', () => {
    const core = createCore()
    const form = createForm(core)
    core.set('items', ['a', 'b', 'c'])
    form.register('items')

    form.listMove('items', 0, 2)
    expect(form.getListValue('items')).toEqual(['b', 'c', 'a'])
  })

  it('listReplace replaces all items', () => {
    const core = createCore()
    const form = createForm(core)
    core.set('items', ['old'])
    form.register('items')

    form.listReplace('items', ['x', 'y', 'z'])
    expect(form.getListValue('items')).toEqual(['x', 'y', 'z'])
  })
})

describe('FormEngine: preserve', () => {
  it('preserves value on unregister when preserve=true', () => {
    const core = createCore()
    const form = createForm(core)
    form.register('temp', { defaultValue: 'keep', preserve: true })
    form.setValue('temp', 'important')
    form.unregister('temp')

    form.register('temp', { defaultValue: 'default', preserve: true })
    expect(form.getValue('temp')).toBe('important')
  })

  it('does not preserve without flag', () => {
    const core = createCore()
    const form = createForm(core)
    form.register('temp', { defaultValue: 'keep' })
    form.setValue('temp', 'important')
    form.unregister('temp')

    form.register('temp', { defaultValue: 'default' })
    expect(form.getValue('temp')).toBe('important')
  })
})

describe('FormEngine: validate() returns warnings', () => {
  it('includes warnings in result', async () => {
    const core = createCore()
    const form = createForm(core)

    form.register('name', {
      warningRules: [() => 'Heads up'],
    })

    form.setValue('name', 'x')
    const result = await form.validate()
    expect(result.valid).toBe(true)
    expect(result.warnings['name']).toEqual(['Heads up'])
  })
})

describe('FormEngine: setFieldsValue', () => {
  it('sets multiple values at once', () => {
    const core = createCore()
    const form = createForm(core)
    form.register('a')
    form.register('b')

    form.setFieldsValue({ a: 'hello', b: 'world' })
    expect(form.getValue('a')).toBe('hello')
    expect(form.getValue('b')).toBe('world')
    expect(form.getFieldState('a').dirty).toBe(true)
    expect(form.getFieldState('b').dirty).toBe(true)
  })
})

describe('FormEngine: getFieldNames', () => {
  it('returns all registered field names', () => {
    const core = createCore()
    const form = createForm(core)
    form.register('a')
    form.register('b')
    form.register('c')

    const names = form.getFieldNames()
    expect(names).toEqual(['a', 'b', 'c'])
  })
})
