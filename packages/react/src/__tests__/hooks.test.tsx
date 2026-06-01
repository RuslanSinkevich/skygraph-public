import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { render } from '@testing-library/react'
// @ts-expect-error React is needed for JSX
import React from 'react'
import { createCore, createForm } from '@skygraph/core'
import { useForm } from '../hooks/useForm'
import { useField } from '../hooks/useField'
import { useFieldArray } from '../hooks/useFieldArray'
import { useVirtualScroll } from '../hooks/useVirtualScroll'
import { useFocusTrap } from '../hooks/a11y/useFocusTrap'
import { useRovingTabIndex } from '../hooks/a11y/useRovingTabIndex'
import { useListNavigation } from '../hooks/a11y/useListNavigation'

/* ============================================================
   useForm
   ============================================================ */

describe('useForm', () => {
  it('returns form API', () => {
    const { result } = renderHook(() => useForm())
    expect(result.current.core).toBeDefined()
    expect(result.current.form).toBeDefined()
    expect(result.current.submit).toBeTypeOf('function')
    expect(result.current.reset).toBeTypeOf('function')
  })

  it('setFieldValue and getFieldValue work', () => {
    const { result } = renderHook(() => useForm())
    act(() => {
      result.current.form.register('name', { defaultValue: '' })
      result.current.setFieldValue('name', 'John')
    })
    expect(result.current.getFieldValue('name')).toBe('John')
  })

  it('setFieldsValue sets multiple values', () => {
    const { result } = renderHook(() => useForm())
    act(() => {
      result.current.form.register('a', { defaultValue: '' })
      result.current.form.register('b', { defaultValue: '' })
      result.current.setFieldsValue({ a: '1', b: '2' })
    })
    expect(result.current.getFieldValue('a')).toBe('1')
    expect(result.current.getFieldValue('b')).toBe('2')
  })

  it('reset clears values', () => {
    const { result } = renderHook(() => useForm())
    act(() => {
      result.current.form.register('x', { defaultValue: 'init' })
      result.current.setFieldValue('x', 'changed')
    })
    expect(result.current.getFieldValue('x')).toBe('changed')
    act(() => result.current.reset())
    expect(result.current.getFieldValue('x')).toBe('init')
  })

  it('getFieldsValue returns all', () => {
    const { result } = renderHook(() => useForm())
    act(() => {
      result.current.form.register('a', { defaultValue: '1' })
      result.current.form.register('b', { defaultValue: '2' })
    })
    const vals = result.current.getFieldsValue()
    expect(vals.a).toBe('1')
    expect(vals.b).toBe('2')
  })

  it('validateFields validates', async () => {
    const { result } = renderHook(() => useForm())
    act(() => {
      result.current.form.register('email', {
        defaultValue: '',
        rules: [{ required: true, message: 'Required' }],
      })
    })
    const res = await act(() => result.current.validateFields())
    expect(res.valid).toBe(false)
  })
})

/* ============================================================
   useField
   ============================================================ */

describe('useField', () => {
  it('returns field state', () => {
    const core = createCore()
    const form = createForm(core)
    form.register('name', { defaultValue: 'test' })

    const { result } = renderHook(() => useField(core, form, 'name'))
    expect(result.current.value).toBe('test')
    expect(result.current.errors).toEqual([])
    expect(result.current.touched).toBe(false)
  })

  it('onChange updates value', () => {
    const core = createCore()
    const form = createForm(core)
    form.register('name', { defaultValue: '' })

    const { result } = renderHook(() => useField(core, form, 'name'))
    act(() => result.current.onChange('hello'))
    expect(result.current.value).toBe('hello')
  })

  it('onBlur marks touched', () => {
    const core = createCore()
    const form = createForm(core)
    form.register('name', { defaultValue: '' })

    const { result } = renderHook(() => useField(core, form, 'name'))
    act(() => result.current.onBlur())
    expect(result.current.touched).toBe(true)
  })
})

/* ============================================================
   useFieldArray
   ============================================================ */

describe('useFieldArray', () => {
  it('starts empty', () => {
    const core = createCore()
    const form = createForm(core)

    const { result } = renderHook(() => useFieldArray(form, 'items'))
    expect(result.current.fields).toEqual([])
  })

  it('append adds item', () => {
    const core = createCore()
    const form = createForm(core)

    const { result } = renderHook(() => useFieldArray(form, 'items'))
    act(() => result.current.append('a'))
    expect(result.current.fields.length).toBe(1)
  })

  it('remove removes item', () => {
    const core = createCore()
    const form = createForm(core)

    const { result } = renderHook(() => useFieldArray(form, 'items'))
    act(() => {
      result.current.append('a')
      result.current.append('b')
    })
    expect(result.current.fields.length).toBe(2)
    act(() => result.current.remove(0))
    expect(result.current.fields.length).toBe(1)
  })

  it('replace replaces all', () => {
    const core = createCore()
    const form = createForm(core)

    const { result } = renderHook(() => useFieldArray(form, 'items'))
    act(() => {
      result.current.append('a')
      result.current.append('b')
    })
    act(() => result.current.replace(['x', 'y', 'z']))
    expect(result.current.fields.length).toBe(3)
  })
})

/* ============================================================
   useVirtualScroll
   ============================================================ */

describe('useVirtualScroll', () => {
  it('returns range and scrollToIndex', () => {
    const { result } = renderHook(() =>
      useVirtualScroll({ itemCount: 1000, itemHeight: 30 }),
    )
    expect(result.current.range).toBeDefined()
    expect(result.current.scrollToIndex).toBeTypeOf('function')
    expect(result.current.containerRef).toBeDefined()
    expect(result.current.engine).toBeDefined()
  })

  it('range is defined', () => {
    const { result } = renderHook(() =>
      useVirtualScroll({ itemCount: 100, itemHeight: 50 }),
    )
    expect(result.current.range).toBeDefined()
  })
})

/* ============================================================
   useFocusTrap
   ============================================================ */

describe('useFocusTrap', () => {
  it('returns a ref', () => {
    const { result } = renderHook(() => useFocusTrap(false))
    expect(result.current).toBeDefined()
    expect(result.current.current).toBeNull()
  })

  it('renders with active trap without error', () => {
    function TestTrap() {
      const ref = useFocusTrap(true)
      return (
        <div ref={ref}>
          <button>First</button>
          <button>Last</button>
        </div>
      )
    }
    const { container } = render(<TestTrap />)
    const buttons = container.querySelectorAll('button')
    expect(buttons.length).toBe(2)
  })
})

/* ============================================================
   useRovingTabIndex
   ============================================================ */

describe('useRovingTabIndex', () => {
  it('returns activeIndex and getItemProps', () => {
    const { result } = renderHook(() => useRovingTabIndex(5))
    expect(result.current.activeIndex).toBe(0)
    expect(result.current.getItemProps).toBeTypeOf('function')
    expect(result.current.setActiveIndex).toBeTypeOf('function')
  })

  it('getItemProps returns tabIndex 0 for active, -1 for others', () => {
    const { result } = renderHook(() => useRovingTabIndex(3))
    expect(result.current.getItemProps(0).tabIndex).toBe(0)
    expect(result.current.getItemProps(1).tabIndex).toBe(-1)
    expect(result.current.getItemProps(2).tabIndex).toBe(-1)
  })

  it('setActiveIndex changes active', () => {
    const { result } = renderHook(() => useRovingTabIndex(3))
    act(() => result.current.setActiveIndex(2))
    expect(result.current.activeIndex).toBe(2)
  })
})

/* ============================================================
   useListNavigation
   ============================================================ */

describe('useListNavigation', () => {
  it('returns navigation API', () => {
    const { result } = renderHook(() =>
      useListNavigation({ itemCount: 5 }),
    )
    expect(result.current.activeIndex).toBe(-1)
    expect(result.current.setActiveIndex).toBeTypeOf('function')
    expect(result.current.setItemRef).toBeTypeOf('function')
    expect(result.current.handleKeyDown).toBeTypeOf('function')
  })

  it('setActiveIndex updates index', () => {
    const { result } = renderHook(() =>
      useListNavigation({ itemCount: 5 }),
    )
    act(() => result.current.setActiveIndex(3))
    expect(result.current.activeIndex).toBe(3)
  })

  it('setLabels is callable', () => {
    const { result } = renderHook(() =>
      useListNavigation({ itemCount: 3 }),
    )
    act(() => result.current.setLabels(['A', 'B', 'C']))
    // no error means success
  })
})
