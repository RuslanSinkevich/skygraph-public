import { describe, it, expect } from 'vitest'
import { createCore } from '../Core'
import { createForm } from '../engines/form/FormEngine'

describe('Benchmark: Core scalability', () => {
  it('handles 10,000 nodes set/get', () => {
    const core = createCore()
    const count = 10_000

    const start = performance.now()
    for (let i = 0; i < count; i++) {
      core.set(`field.${i}`, i)
    }
    const setTime = performance.now() - start

    const start2 = performance.now()
    for (let i = 0; i < count; i++) {
      core.get(`field.${i}`)
    }
    const getTime = performance.now() - start2

    console.log(`  10k set: ${setTime.toFixed(1)}ms, 10k get: ${getTime.toFixed(1)}ms`)
    expect(setTime).toBeLessThan(500)
    expect(getTime).toBeLessThan(100)
  })

  it('handles 10,000 subscriptions without leak', () => {
    const core = createCore()
    const unsubs: (() => void)[] = []

    const start = performance.now()
    for (let i = 0; i < 10_000; i++) {
      unsubs.push(core.subscribe(`field.${i}`, () => {}))
    }
    const subTime = performance.now() - start

    const start2 = performance.now()
    for (const u of unsubs) u()
    const unsubTime = performance.now() - start2

    console.log(`  10k subscribe: ${subTime.toFixed(1)}ms, 10k unsubscribe: ${unsubTime.toFixed(1)}ms`)
    expect(subTime).toBeLessThan(500)
    expect(unsubTime).toBeLessThan(500)
  })

  it('batch with 1000 writes produces 1 notify per path', () => {
    const core = createCore()
    let notifyCount = 0
    core.subscribe('x', () => { notifyCount++ })

    core.batch(() => {
      for (let i = 0; i < 1000; i++) {
        core.set('x', i)
      }
    })

    expect(notifyCount).toBe(1)
  })

  it('transaction with 1000 writes is atomic', () => {
    const core = createCore()
    let notifyCount = 0

    for (let i = 0; i < 100; i++) {
      core.subscribe(`f.${i}`, () => { notifyCount++ })
    }

    core.transaction(() => {
      for (let i = 0; i < 100; i++) {
        core.set(`f.${i}`, i * 2)
      }
    })

    expect(notifyCount).toBe(100)
  })

  it('computed chain: 100 deep', () => {
    const core = createCore()
    core.set('base', 1)

    for (let i = 1; i <= 100; i++) {
      const dep = i === 1 ? 'base' : `c.${i - 1}`
      core.computed(`c.${i}`, [dep], (v) => (v as number) + 1)
    }

    expect(core.get('c.100')).toBe(101)

    core.set('base', 10)
    expect(core.get('c.100')).toBe(110)
  })
})

describe('Benchmark: FormEngine scalability', () => {
  it('registers 1000 fields', () => {
    const core = createCore()
    const form = createForm(core)

    const start = performance.now()
    for (let i = 0; i < 1000; i++) {
      form.register(`field_${i}`, { defaultValue: '' })
    }
    const elapsed = performance.now() - start

    console.log(`  1000 field register: ${elapsed.toFixed(1)}ms`)
    expect(elapsed).toBeLessThan(1000)

    const state = form.getFormState()
    expect(state.isDirty).toBe(false)
    expect(state.isValid).toBe(true)
  })

  it('setValue on 1000 fields', () => {
    const core = createCore()
    const form = createForm(core, { validateOn: 'submit' })

    for (let i = 0; i < 1000; i++) {
      form.register(`field_${i}`, { defaultValue: '' })
    }

    const start = performance.now()
    for (let i = 0; i < 1000; i++) {
      form.setValue(`field_${i}`, `value_${i}`)
    }
    const elapsed = performance.now() - start

    console.log(`  1000 setValue: ${elapsed.toFixed(1)}ms`)
    expect(elapsed).toBeLessThan(2000)

    expect(form.getFormState().isDirty).toBe(true)
  })

  it('validate 1000 fields with sync rules', async () => {
    const core = createCore()
    const form = createForm(core, { validateOn: 'submit' })

    const required = (v: unknown) => (!v ? 'Required' : null)

    for (let i = 0; i < 1000; i++) {
      form.register(`field_${i}`, { rules: [required] })
    }

    const start = performance.now()
    const result = await form.validate()
    const elapsed = performance.now() - start

    console.log(`  1000 field validate: ${elapsed.toFixed(1)}ms`)
    expect(elapsed).toBeLessThan(2000)
    expect(result.valid).toBe(false)
    expect(Object.keys(result.errors).length).toBe(1000)
  })
})
