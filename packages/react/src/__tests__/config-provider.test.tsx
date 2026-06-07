import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
// @ts-expect-error React is needed for JSX
import React from 'react'

import {
  ConfigProvider,
  useConfig,
  useConfigWithDefaults,
  buildThemeVars,
} from '../components/ConfigProvider'
import { Empty } from '../components/ui/Empty'

function Probe() {
  const cfg = useConfig()
  return (
    <div data-testid="probe">
      {cfg.size ?? ''}|{String(cfg.disabled ?? false)}|{cfg.direction ?? ''}
    </div>
  )
}

describe('ConfigProvider + useConfig', () => {
  it('returns empty config when no provider', () => {
    function Bare() {
      const cfg = useConfig()
      return <div data-testid="bare">{Object.keys(cfg).length}</div>
    }
    render(<Bare />)
    expect(screen.getByTestId('bare').textContent).toBe('0')
  })

  it('exposes size, disabled and direction', () => {
    render(
      <ConfigProvider size="large" disabled direction="rtl">
        <Probe />
      </ConfigProvider>,
    )
    expect(screen.getByTestId('probe').textContent).toBe('large|true|rtl')
  })

  it('merges nested providers (child wins, parent inherited)', () => {
    render(
      <ConfigProvider size="small" disabled>
        <ConfigProvider size="large">
          <Probe />
        </ConfigProvider>
      </ConfigProvider>,
    )
    expect(screen.getByTestId('probe').textContent).toBe('large|true|')
  })

  it('shallow-merges locale across providers', () => {
    function LocaleProbe() {
      const cfg = useConfig()
      return (
        <div data-testid="loc">
          {cfg.locale?.modal?.okText}|{cfg.locale?.popconfirm?.okText}
        </div>
      )
    }
    render(
      <ConfigProvider locale={{ modal: { okText: 'Yes' } }}>
        <ConfigProvider locale={{ popconfirm: { okText: 'Sure' } }}>
          <LocaleProbe />
        </ConfigProvider>
      </ConfigProvider>,
    )
    expect(screen.getByTestId('loc').textContent).toBe('Yes|Sure')
  })
})

describe('useConfigWithDefaults', () => {
  function Resolved({
    size,
    disabled,
  }: {
    size?: 'small' | 'middle' | 'large'
    disabled?: boolean
  }) {
    const r = useConfigWithDefaults({ size, disabled }, { size: 'middle' })
    return (
      <div data-testid="res">
        {r.resolvedSize}|{String(r.resolvedDisabled)}|{r.resolvedDirection}
      </div>
    )
  }

  it('prop overrides provider', () => {
    render(
      <ConfigProvider size="large">
        <Resolved size="small" />
      </ConfigProvider>,
    )
    expect(screen.getByTestId('res').textContent).toBe('small|false|ltr')
  })

  it('falls back to provider, then default', () => {
    render(
      <ConfigProvider size="large" disabled direction="rtl">
        <Resolved />
      </ConfigProvider>,
    )
    expect(screen.getByTestId('res').textContent).toBe('large|true|rtl')
  })
})

describe('theme', () => {
  it('buildThemeVars maps tokens and raw cssVars', () => {
    const vars = buildThemeVars({
      token: { colorPrimary: '#f50', borderRadius: 10, fontFamily: 'Inter' },
      cssVars: { '--sg-color-link': '#09f', 'sg-extra': '1px' },
    })
    expect(vars['--sg-color-primary']).toBe('#f50')
    expect(vars['--sg-border-radius']).toBe('10px')
    expect(vars['--sg-font-sans']).toBe('Inter')
    expect(vars['--sg-color-link']).toBe('#09f')
    expect(vars['--sg-extra']).toBe('1px')
  })

  it('renders a display:contents scope wrapper with dir + data-sg-theme', () => {
    const { container } = render(
      <ConfigProvider direction="rtl" theme={{ mode: 'dark', token: { colorPrimary: '#f50' } }}>
        <span>content</span>
      </ConfigProvider>,
    )
    const scope = container.querySelector('.sg-config-provider') as HTMLElement
    expect(scope).not.toBeNull()
    expect(scope.getAttribute('dir')).toBe('rtl')
    expect(scope.getAttribute('data-sg-theme')).toBe('dark')
    expect(scope.style.getPropertyValue('--sg-color-primary')).toBe('#f50')
    expect(scope.style.display).toBe('contents')
  })

  it('does not render a wrapper when no theme/direction is set', () => {
    const { container } = render(
      <ConfigProvider size="large">
        <span>content</span>
      </ConfigProvider>,
    )
    expect(container.querySelector('.sg-config-provider')).toBeNull()
  })
})

describe('renderEmpty', () => {
  it('overrides the default Empty art', () => {
    render(
      <ConfigProvider renderEmpty={(name) => <div data-testid="custom">empty:{name}</div>}>
        <Empty />
      </ConfigProvider>,
    )
    expect(screen.getByTestId('custom').textContent).toBe('empty:Empty')
  })

  it('does not override when Empty is customized', () => {
    render(
      <ConfigProvider renderEmpty={() => <div data-testid="custom">x</div>}>
        <Empty description="Nothing here" />
      </ConfigProvider>,
    )
    expect(screen.queryByTestId('custom')).toBeNull()
    expect(screen.getByText('Nothing here')).toBeTruthy()
  })
})
