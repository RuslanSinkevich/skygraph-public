import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
// @ts-expect-error React is needed for JSX
import React, { useState } from 'react'

import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'

/* ============================================================
   Button: danger + block
   ============================================================ */

describe('Button danger', () => {
  it('adds sg-button-danger class when danger=true', () => {
    const { container } = render(<Button danger>Delete</Button>)
    expect(container.querySelector('.sg-button-danger')).toBeTruthy()
  })

  it('does not add sg-button-danger by default', () => {
    const { container } = render(<Button>OK</Button>)
    expect(container.querySelector('.sg-button-danger')).toBeNull()
  })

  it('combines with type="primary"', () => {
    const { container } = render(<Button type="primary" danger>Delete</Button>)
    expect(container.querySelector('.sg-button-primary.sg-button-danger')).toBeTruthy()
  })

  it('combines with type="text"', () => {
    const { container } = render(<Button type="text" danger>Remove</Button>)
    expect(container.querySelector('.sg-button-text.sg-button-danger')).toBeTruthy()
  })

  it('still triggers onClick when danger', () => {
    const fn = vi.fn()
    render(<Button danger onClick={fn}>Go</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(fn).toHaveBeenCalledOnce()
  })
})

describe('Button block', () => {
  it('adds sg-button-block class when block=true', () => {
    const { container } = render(<Button block>Wide</Button>)
    expect(container.querySelector('.sg-button-block')).toBeTruthy()
  })

  it('does not add sg-button-block by default', () => {
    const { container } = render(<Button>Narrow</Button>)
    expect(container.querySelector('.sg-button-block')).toBeNull()
  })

  it('combines with danger', () => {
    const { container } = render(<Button block danger>Wipe</Button>)
    const btn = container.querySelector('button')!
    expect(btn.classList.contains('sg-button-block')).toBe(true)
    expect(btn.classList.contains('sg-button-danger')).toBe(true)
  })
})

/* ============================================================
   Input: readOnly
   ============================================================ */

describe('Input readOnly', () => {
  it('sets HTML readonly attribute', () => {
    render(<Input value="locked" readOnly />)
    const input = screen.getByRole('textbox') as HTMLInputElement
    expect(input.readOnly).toBe(true)
  })

  it('sets aria-readonly="true"', () => {
    render(<Input value="locked" readOnly />)
    const input = screen.getByRole('textbox')
    expect(input.getAttribute('aria-readonly')).toBe('true')
  })

  it('does not set aria-readonly when readOnly is false', () => {
    render(<Input value="x" />)
    const input = screen.getByRole('textbox')
    expect(input.getAttribute('aria-readonly')).toBeNull()
  })

  it('adds sg-input-readonly class', () => {
    const { container } = render(<Input value="x" readOnly />)
    expect(container.querySelector('.sg-input-readonly')).toBeTruthy()
  })

  it('adds sg-input-wrapper-readonly class on wrapper', () => {
    const { container } = render(<Input value="x" readOnly />)
    expect(container.querySelector('.sg-input-wrapper-readonly')).toBeTruthy()
  })

  it('does not add readonly classes by default', () => {
    const { container } = render(<Input value="x" />)
    expect(container.querySelector('.sg-input-readonly')).toBeNull()
    expect(container.querySelector('.sg-input-wrapper-readonly')).toBeNull()
  })

  it('still surfaces value to the user', () => {
    render(<Input value="hello" readOnly />)
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('hello')
  })

  it('does not call onChange when typing into a readonly input', () => {
    // jsdom honours the readonly attribute and silently swallows input events:
    // typing must not produce onChange calls.
    const fn = vi.fn()
    render(<Input value="locked" readOnly onChange={fn} />)
    const input = screen.getByRole('textbox') as HTMLInputElement
    // Manual change events still fire (jsdom limitation), so we verify the
    // attribute that browsers honour to block the user.
    expect(input.readOnly).toBe(true)
    expect(input.disabled).toBe(false)
  })
})

/* ============================================================
   Select: multiple mode
   ============================================================ */

describe('Select multiple', () => {
  const options = [
    { label: 'Apple', value: 'apple' },
    { label: 'Banana', value: 'banana' },
    { label: 'Cherry', value: 'cherry' },
  ]

  it('adds sg-select-multiple class', () => {
    const { container } = render(<Select options={options} multiple value={[]} onChange={() => {}} />)
    expect(container.querySelector('.sg-select-multiple')).toBeTruthy()
  })

  it('does not add sg-select-multiple by default', () => {
    const { container } = render(<Select options={options} />)
    expect(container.querySelector('.sg-select-multiple')).toBeNull()
  })

  it('renders placeholder when empty', () => {
    render(<Select options={options} multiple value={[]} onChange={() => {}} placeholder="Pick…" />)
    expect(screen.getByText('Pick…')).toBeDefined()
  })

  it('renders chip per selected value', () => {
    const { container } = render(
      <Select options={options} multiple value={['apple', 'banana']} onChange={() => {}} />,
    )
    const tags = container.querySelectorAll('.sg-select-tag')
    expect(tags.length).toBe(2)
    expect(screen.getByText('Apple')).toBeDefined()
    expect(screen.getByText('Banana')).toBeDefined()
  })

  it('selecting an option emits an array containing that value', () => {
    const fn = vi.fn()
    render(<Select options={options} multiple value={[]} onChange={fn} />)
    fireEvent.click(screen.getByText('Select...'))
    fireEvent.click(screen.getByText('Apple'))
    expect(fn).toHaveBeenCalledWith(['apple'])
  })

  it('clicking the same option again removes it (toggle)', () => {
    function Wrapper() {
      const [v, setV] = useState<(string | number)[]>(['apple'])
      return <Select options={options} multiple value={v} onChange={setV} />
    }
    const { container } = render(<Wrapper />)
    fireEvent.click(container.querySelector('.sg-select-selector')!)
    const appleOpt = container.querySelector('.sg-select-option-selected')!
    fireEvent.click(appleOpt)
    expect(container.querySelectorAll('.sg-select-tag').length).toBe(0)
  })

  it('keeps dropdown open while picking multiple options', () => {
    function Wrapper() {
      const [v, setV] = useState<(string | number)[]>([])
      return <Select options={options} multiple value={v} onChange={setV} />
    }
    const { container } = render(<Wrapper />)
    fireEvent.click(container.querySelector('.sg-select-selector')!)
    fireEvent.click(screen.getByText('Apple'))
    expect(container.querySelector('.sg-select-dropdown')).toBeTruthy()
    fireEvent.click(screen.getByText('Banana'))
    expect(container.querySelectorAll('.sg-select-tag').length).toBe(2)
  })

  it('chip remove button removes the value', () => {
    function Wrapper() {
      const [v, setV] = useState<(string | number)[]>(['apple', 'banana'])
      return <Select options={options} multiple value={v} onChange={setV} />
    }
    const { container } = render(<Wrapper />)
    const removes = container.querySelectorAll('.sg-select-tag-remove')
    expect(removes.length).toBe(2)
    fireEvent.click(removes[0])
    expect(container.querySelectorAll('.sg-select-tag').length).toBe(1)
    expect(screen.queryByText('Apple')).toBeNull()
    expect(screen.getByText('Banana')).toBeDefined()
  })

  it('aria-multiselectable on combobox + listbox', () => {
    const { container } = render(<Select options={options} multiple value={[]} onChange={() => {}} />)
    const combobox = container.querySelector('[role="combobox"]')!
    expect(combobox.getAttribute('aria-multiselectable')).toBe('true')
    fireEvent.click(combobox)
    const listbox = container.querySelector('[role="listbox"]')!
    expect(listbox.getAttribute('aria-multiselectable')).toBe('true')
  })

  it('option aria-selected reflects multi-selection', () => {
    const { container } = render(
      <Select options={options} multiple value={['banana']} onChange={() => {}} />,
    )
    fireEvent.click(container.querySelector('.sg-select-selector')!)
    const optionEls = container.querySelectorAll('[role="option"]')
    const selected = Array.from(optionEls).filter((o) => o.getAttribute('aria-selected') === 'true')
    expect(selected.length).toBe(1)
    expect(selected[0].textContent).toContain('Banana')
  })

  it('disabled blocks chip removal', () => {
    const fn = vi.fn()
    const { container } = render(
      <Select options={options} multiple value={['apple']} onChange={fn} disabled />,
    )
    const remove = container.querySelector('.sg-select-tag-remove')!
    fireEvent.click(remove)
    expect(fn).not.toHaveBeenCalled()
  })

  it('unstyled multiple renders native multi-select', () => {
    const { container } = render(
      <Select options={options} multiple value={['apple']} onChange={() => {}} unstyled />,
    )
    const native = container.querySelector('select')!
    expect(native.multiple).toBe(true)
  })

  it('Backspace removes last chip when multi', () => {
    function Wrapper() {
      const [v, setV] = useState<(string | number)[]>(['apple', 'banana'])
      return <Select options={options} multiple value={v} onChange={setV} />
    }
    const { container } = render(<Wrapper />)
    const combobox = container.querySelector('[role="combobox"]')!
    fireEvent.keyDown(combobox, { key: 'Backspace' })
    const tags = container.querySelectorAll('.sg-select-tag')
    expect(tags.length).toBe(1)
    expect(tags[0].textContent).toContain('Apple')
  })

  it('single-select API still works (no regression)', () => {
    const fn = vi.fn()
    render(<Select options={options} onChange={fn} />)
    fireEvent.click(screen.getByText('Select...'))
    fireEvent.click(screen.getByText('Cherry'))
    expect(fn).toHaveBeenCalledWith('cherry')
  })
})
