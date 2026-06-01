import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
// @ts-expect-error React is needed for JSX
import React from 'react'

import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { Switch } from '../components/ui/Switch'
import { Checkbox } from '../components/ui/Checkbox'
import { Tabs } from '../components/ui/Tabs'
import { Tag } from '../components/ui/Tag'
import { Badge } from '../components/ui/Badge'
import { Spin } from '../components/ui/Spin'
import { Select } from '../components/ui/Select'

describe('Button', () => {
  it('renders', () => {
    render(<Button>Click</Button>)
    expect(screen.getByRole('button', { name: 'Click' })).toBeDefined()
  })

  it('renders children', () => {
    render(<Button><span data-testid="inner">Hi</span></Button>)
    expect(screen.getByTestId('inner').textContent).toBe('Hi')
  })

  it('calls onClick', () => {
    const fn = vi.fn()
    render(<Button onClick={fn}>Go</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(fn).toHaveBeenCalledOnce()
  })

  it('disabled blocks onClick', () => {
    const fn = vi.fn()
    render(<Button disabled onClick={fn}>Go</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(fn).not.toHaveBeenCalled()
  })

  it('renders type classes', () => {
    const { container } = render(<Button type="primary">P</Button>)
    expect(container.querySelector('.sg-button-primary')).toBeTruthy()
  })

  it('renders dashed type', () => {
    const { container } = render(<Button type="dashed">D</Button>)
    expect(container.querySelector('.sg-button-dashed')).toBeTruthy()
  })

  it('loading state disables button and adds loading class', () => {
    const fn = vi.fn()
    const { container } = render(<Button loading onClick={fn}>L</Button>)
    const btn = screen.getByRole('button')
    expect((btn as HTMLButtonElement).disabled).toBe(true)
    expect(container.querySelector('.sg-button-loading')).toBeTruthy()
    fireEvent.click(btn)
    expect(fn).not.toHaveBeenCalled()
  })
})

describe('Input', () => {
  it('renders', () => {
    render(<Input />)
    expect(screen.getByRole('textbox')).toBeDefined()
  })

  it('controlled value', () => {
    render(<Input value="hello" />)
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('hello')
  })

  it('calls onChange', () => {
    const fn = vi.fn()
    render(<Input onChange={fn} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'x' } })
    expect(fn).toHaveBeenCalledWith('x')
  })

  it('placeholder', () => {
    render(<Input placeholder="Type..." />)
    expect(screen.getByPlaceholderText('Type...')).toBeDefined()
  })

  it('disabled', () => {
    render(<Input disabled />)
    expect((screen.getByRole('textbox') as HTMLInputElement).disabled).toBe(true)
  })

  it('password type', () => {
    const { container } = render(<Input type="password" />)
    const input = container.querySelector('input')!
    expect(input.type).toBe('password')
  })
})

describe('Modal', () => {
  it('renders when open=true', () => {
    render(<Modal open onClose={() => {}}>Content</Modal>)
    expect(screen.getByRole('dialog')).toBeDefined()
  })

  it('does not render when open=false', () => {
    render(<Modal open={false} onClose={() => {}}>Content</Modal>)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('calls onClose on close button click', () => {
    const fn = vi.fn()
    const { container } = render(<Modal open onClose={fn}>Content</Modal>)
    const closeBtn = container.querySelector('.sg-modal-close')!
    fireEvent.click(closeBtn)
    expect(fn).toHaveBeenCalledOnce()
  })

  it('renders title', () => {
    render(<Modal open onClose={() => {}} title="My Title">Body</Modal>)
    expect(screen.getByText('My Title')).toBeDefined()
  })

  it('renders children', () => {
    render(<Modal open onClose={() => {}}>Hello Modal</Modal>)
    expect(screen.getByText('Hello Modal')).toBeDefined()
  })

  it('closes on Escape', () => {
    const fn = vi.fn()
    render(<Modal open onClose={fn}>Body</Modal>)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(fn).toHaveBeenCalledOnce()
  })
})

describe('Switch', () => {
  it('renders', () => {
    render(<Switch />)
    expect(screen.getByRole('switch')).toBeDefined()
  })

  it('toggles on click', () => {
    const fn = vi.fn()
    render(<Switch onChange={fn} />)
    fireEvent.click(screen.getByRole('switch'))
    expect(fn).toHaveBeenCalledWith(true)
  })

  it('controlled checked', () => {
    render(<Switch checked />)
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true')
  })

  it('disabled blocks toggle', () => {
    const fn = vi.fn()
    render(<Switch disabled onChange={fn} />)
    fireEvent.click(screen.getByRole('switch'))
    expect(fn).not.toHaveBeenCalled()
  })

  it('onChange receives new value', () => {
    const fn = vi.fn()
    render(<Switch checked={false} onChange={fn} />)
    fireEvent.click(screen.getByRole('switch'))
    expect(fn).toHaveBeenCalledWith(true)
  })
})

describe('Checkbox', () => {
  it('renders', () => {
    render(<Checkbox>Accept</Checkbox>)
    expect(screen.getByRole('checkbox')).toBeDefined()
    expect(screen.getByText('Accept')).toBeDefined()
  })

  it('toggles checked on click', () => {
    const fn = vi.fn()
    render(<Checkbox onChange={fn}>Check</Checkbox>)
    fireEvent.click(screen.getByRole('checkbox'))
    expect(fn).toHaveBeenCalledWith(true)
  })

  it('controlled checked', () => {
    render(<Checkbox checked>Ok</Checkbox>)
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(true)
  })

  it('disabled', () => {
    const fn = vi.fn()
    render(<Checkbox disabled onChange={fn}>No</Checkbox>)
    expect((screen.getByRole('checkbox') as HTMLInputElement).disabled).toBe(true)
  })
})

describe('Tabs', () => {
  const items = [
    { key: '1', label: 'Tab A', children: <div>Content A</div> },
    { key: '2', label: 'Tab B', children: <div>Content B</div> },
  ]

  it('renders tab labels', () => {
    render(<Tabs items={items} />)
    expect(screen.getByText('Tab A')).toBeDefined()
    expect(screen.getByText('Tab B')).toBeDefined()
  })

  it('shows active tab content', () => {
    render(<Tabs items={items} activeKey="1" />)
    expect(screen.getByText('Content A')).toBeDefined()
  })

  it('switches tabs on click', () => {
    const fn = vi.fn()
    render(<Tabs items={items} onChange={fn} />)
    fireEvent.click(screen.getByText('Tab B'))
    expect(fn).toHaveBeenCalledWith('2')
    expect(screen.getByText('Content B')).toBeDefined()
  })

  it('uses card chrome by default', () => {
    const { container } = render(<Tabs items={items} />)
    expect(container.querySelector('.sg-tabs-card')).toBeTruthy()
  })

  it('uses line chrome when type is line', () => {
    const { container } = render(<Tabs items={items} type="line" />)
    expect(container.querySelector('.sg-tabs-line')).toBeTruthy()
    expect(container.querySelector('.sg-tabs-card')).toBeFalsy()
  })
})

describe('Tag', () => {
  it('renders children', () => {
    render(<Tag>Status</Tag>)
    expect(screen.getByText('Status')).toBeDefined()
  })

  it('renders closable tag', () => {
    render(<Tag closable>Close me</Tag>)
    expect(screen.getByRole('button')).toBeDefined()
  })

  it('calls onClose', () => {
    const fn = vi.fn()
    render(<Tag closable onClose={fn}>X</Tag>)
    fireEvent.click(screen.getByRole('button'))
    expect(fn).toHaveBeenCalledOnce()
  })
})

describe('Badge', () => {
  it('renders with count', () => {
    render(<Badge count={5}><span>Item</span></Badge>)
    expect(screen.getByText('5')).toBeDefined()
    expect(screen.getByText('Item')).toBeDefined()
  })

  it('renders with dot', () => {
    const { container } = render(<Badge dot><span>Dot</span></Badge>)
    expect(container.querySelector('.sg-badge-dot')).toBeTruthy()
  })

  it('renders children', () => {
    render(<Badge count={0} showZero><span>Child</span></Badge>)
    expect(screen.getByText('Child')).toBeDefined()
    expect(screen.getByText('0')).toBeDefined()
  })

  it('overflowCount shows 99+', () => {
    render(<Badge count={100}><span>Overflow</span></Badge>)
    expect(screen.getByText('99+')).toBeDefined()
  })
})

describe('Spin', () => {
  it('renders spinner when spinning=true', () => {
    const { container } = render(<Spin spinning />)
    expect(container.querySelector('.sg-spin')).toBeTruthy()
  })

  it('renders children with overlay', () => {
    const { container } = render(<Spin spinning><div>Inner</div></Spin>)
    expect(screen.getByText('Inner')).toBeDefined()
    expect(container.querySelector('.sg-spin-overlay')).toBeTruthy()
  })

  it('hides spinner when spinning=false', () => {
    const { container } = render(<Spin spinning={false}><div>Visible</div></Spin>)
    expect(screen.getByText('Visible')).toBeDefined()
    expect(container.querySelector('.sg-spin')).toBeNull()
  })

  it('returns null when not spinning and no children', () => {
    const { container } = render(<Spin spinning={false} />)
    expect(container.innerHTML).toBe('')
  })
})

describe('Select', () => {
  const options = [
    { label: 'Apple', value: 'apple' },
    { label: 'Banana', value: 'banana' },
    { label: 'Cherry', value: 'cherry' },
  ]

  it('renders placeholder (styled)', () => {
    render(<Select options={options} />)
    expect(screen.getByText('Select...')).toBeDefined()
  })

  it('opens dropdown on click (styled)', () => {
    render(<Select options={options} />)
    fireEvent.click(screen.getByText('Select...'))
    expect(screen.getByText('Apple')).toBeDefined()
    expect(screen.getByText('Banana')).toBeDefined()
  })

  it('selects an option (styled)', () => {
    const fn = vi.fn()
    render(<Select options={options} onChange={fn} />)
    fireEvent.click(screen.getByText('Select...'))
    fireEvent.click(screen.getByText('Banana'))
    expect(fn).toHaveBeenCalledWith('banana')
  })

  it('renders unstyled as native select', () => {
    render(<Select options={options} unstyled />)
    expect(screen.getByRole('combobox')).toBeDefined()
  })

  it('disabled blocks interaction', () => {
    const fn = vi.fn()
    render(<Select options={options} disabled onChange={fn} />)
    fireEvent.click(screen.getByText('Select...'))
    expect(screen.queryByText('Apple')).toBeNull()
  })
})
