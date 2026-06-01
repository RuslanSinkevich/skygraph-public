import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRovingTabIndex, useListNavigation } from '../hooks/a11y'

// ─── useRovingTabIndex ────────────────────────────────────────────────────

describe('useRovingTabIndex', () => {
  it('starts at index 0', () => {
    const { result } = renderHook(() => useRovingTabIndex(5))
    expect(result.current.activeIndex).toBe(0)
  })

  it('getItemProps gives tabIndex=0 to active and -1 to others', () => {
    const { result } = renderHook(() => useRovingTabIndex(3))
    const props0 = result.current.getItemProps(0)
    const props1 = result.current.getItemProps(1)
    expect(props0.tabIndex).toBe(0)
    expect(props1.tabIndex).toBe(-1)
  })

  it('ArrowDown advances activeIndex (vertical)', () => {
    const { result } = renderHook(() => useRovingTabIndex(3))
    act(() => {
      result.current.handleKeyDown({
        key: 'ArrowDown',
        preventDefault: () => {},
      } as React.KeyboardEvent)
    })
    expect(result.current.activeIndex).toBe(1)
  })

  it('ArrowDown wraps when loop=true', () => {
    const { result } = renderHook(() => useRovingTabIndex(2, { loop: true }))
    act(() => {
      result.current.setActiveIndex(1)
    })
    act(() => {
      result.current.handleKeyDown({
        key: 'ArrowDown',
        preventDefault: () => {},
      } as React.KeyboardEvent)
    })
    expect(result.current.activeIndex).toBe(0)
  })

  it('ArrowDown clamps when loop=false', () => {
    const { result } = renderHook(() => useRovingTabIndex(2, { loop: false }))
    act(() => {
      result.current.setActiveIndex(1)
    })
    act(() => {
      result.current.handleKeyDown({
        key: 'ArrowDown',
        preventDefault: () => {},
      } as React.KeyboardEvent)
    })
    expect(result.current.activeIndex).toBe(1)
  })

  it('Home jumps to 0, End jumps to last', () => {
    const { result } = renderHook(() => useRovingTabIndex(5))
    act(() => {
      result.current.handleKeyDown({
        key: 'End',
        preventDefault: () => {},
      } as React.KeyboardEvent)
    })
    expect(result.current.activeIndex).toBe(4)

    act(() => {
      result.current.handleKeyDown({
        key: 'Home',
        preventDefault: () => {},
      } as React.KeyboardEvent)
    })
    expect(result.current.activeIndex).toBe(0)
  })

  it('horizontal orientation responds to ArrowRight/Left, ignores ArrowDown/Up', () => {
    const { result } = renderHook(() => useRovingTabIndex(3, { orientation: 'horizontal' }))
    act(() => {
      result.current.handleKeyDown({
        key: 'ArrowDown',
        preventDefault: () => {},
      } as React.KeyboardEvent)
    })
    expect(result.current.activeIndex).toBe(0) // unchanged

    act(() => {
      result.current.handleKeyDown({
        key: 'ArrowRight',
        preventDefault: () => {},
      } as React.KeyboardEvent)
    })
    expect(result.current.activeIndex).toBe(1)
  })
})

// ─── useListNavigation ───────────────────────────────────────────────────

describe('useListNavigation', () => {
  it('starts with no active item (-1)', () => {
    const { result } = renderHook(() =>
      useListNavigation({ itemCount: 5 }),
    )
    expect(result.current.activeIndex).toBe(-1)
  })

  it('ArrowDown moves from -1 → 0 → 1', () => {
    const { result } = renderHook(() =>
      useListNavigation({ itemCount: 3 }),
    )
    act(() => {
      result.current.handleKeyDown({
        key: 'ArrowDown',
        preventDefault: () => {},
      } as React.KeyboardEvent)
    })
    expect(result.current.activeIndex).toBe(0)

    act(() => {
      result.current.handleKeyDown({
        key: 'ArrowDown',
        preventDefault: () => {},
      } as React.KeyboardEvent)
    })
    expect(result.current.activeIndex).toBe(1)
  })

  it('Enter calls onSelect(activeIndex)', () => {
    const onSelect = vi.fn()
    const { result } = renderHook(() =>
      useListNavigation({ itemCount: 3, onSelect }),
    )
    act(() => {
      result.current.setActiveIndex(2)
    })
    act(() => {
      result.current.handleKeyDown({
        key: 'Enter',
        preventDefault: () => {},
      } as React.KeyboardEvent)
    })
    expect(onSelect).toHaveBeenCalledWith(2)
  })

  it('Escape resets activeIndex to -1', () => {
    const { result } = renderHook(() =>
      useListNavigation({ itemCount: 3 }),
    )
    act(() => {
      result.current.setActiveIndex(1)
    })
    act(() => {
      result.current.handleKeyDown({
        key: 'Escape',
        preventDefault: () => {},
      } as React.KeyboardEvent)
    })
    expect(result.current.activeIndex).toBe(-1)
  })

  it('ArrowUp from active 0 wraps to last when loop=true', () => {
    const { result } = renderHook(() =>
      useListNavigation({ itemCount: 3, loop: true }),
    )
    act(() => {
      result.current.setActiveIndex(0)
    })
    act(() => {
      result.current.handleKeyDown({
        key: 'ArrowUp',
        preventDefault: () => {},
      } as React.KeyboardEvent)
    })
    expect(result.current.activeIndex).toBe(2)
  })

  it('typeahead matches label prefix', () => {
    const { result } = renderHook(() =>
      useListNavigation({ itemCount: 3 }),
    )
    act(() => {
      result.current.setLabels(['Apple', 'Banana', 'Cherry'])
    })
    act(() => {
      result.current.handleKeyDown({
        key: 'b',
        preventDefault: () => {},
      } as React.KeyboardEvent)
    })
    expect(result.current.activeIndex).toBe(1)
  })
})
