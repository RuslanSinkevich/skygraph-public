import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import { Dashboard } from '../index'
import type { DashboardWidget, WidgetAction } from '../index'
import { DashboardEditor } from '../components/complex/Dashboard'

const sampleWidgets: DashboardWidget[] = [
  { id: 'kpi', title: 'Revenue', x: 1, y: 1, w: 4, h: 2, children: <strong>$120k</strong> },
  { id: 'chart', title: 'Traffic', x: 5, y: 1, w: 8, h: 3, children: <span>chart</span> },
  { id: 'feed', x: 1, y: 3, w: 4, h: 4, children: <span>feed</span> },
]

describe('Dashboard', () => {
  it('renders one wrapper with sg-dashboard class', () => {
    const { container } = render(<Dashboard widgets={sampleWidgets} />)
    expect(container.querySelector('.sg-dashboard')).not.toBeNull()
  })

  it('renders one widget div per entry with stable data-widget-id', () => {
    const { container } = render(<Dashboard widgets={sampleWidgets} />)
    const items = container.querySelectorAll('[data-widget-id]')
    expect(items.length).toBe(3)
    const ids = Array.from(items).map((n) => n.getAttribute('data-widget-id'))
    expect(ids).toEqual(['kpi', 'chart', 'feed'])
  })

  it('uses gridColumn / gridRow inline styles per widget', () => {
    const { container } = render(<Dashboard widgets={sampleWidgets} />)
    const kpi = container.querySelector('[data-widget-id="kpi"]') as HTMLElement
    expect(kpi.style.gridColumn).toBe('1 / span 4')
    expect(kpi.style.gridRow).toBe('1 / span 2')
  })

  it('omits the header when title is undefined', () => {
    const { container } = render(<Dashboard widgets={sampleWidgets} />)
    const feed = container.querySelector('[data-widget-id="feed"]') as HTMLElement
    expect(feed.querySelector('.sg-dashboard-widget-header')).toBeNull()
  })

  it('renders the header when title is set', () => {
    const { container, getByText } = render(<Dashboard widgets={sampleWidgets} />)
    expect(getByText('Revenue')).toBeDefined()
    expect(getByText('Traffic')).toBeDefined()
    const kpi = container.querySelector('[data-widget-id="kpi"]') as HTMLElement
    expect(kpi.querySelector('.sg-dashboard-widget-header')).not.toBeNull()
  })

  it('uses given columns / rowHeight / gap on the grid', () => {
    const { container } = render(
      <Dashboard widgets={sampleWidgets} columns={6} rowHeight={120} gap={24} />,
    )
    const root = container.querySelector('.sg-dashboard') as HTMLElement
    expect(root.style.gridTemplateColumns).toBe('repeat(6, 1fr)')
    expect(root.style.gridAutoRows).toBe('120px')
    expect(root.style.gap).toBe('24px')
  })

  it('drops sg-dashboard classes when unstyled', () => {
    const { container } = render(<Dashboard widgets={sampleWidgets} unstyled />)
    expect(container.querySelector('.sg-dashboard')).toBeNull()
    expect(container.querySelector('.sg-dashboard-widget')).toBeNull()
  })

  it('render callback can replace children', () => {
    const widgets: DashboardWidget[] = [
      { id: 'r', title: 'R', x: 1, y: 1, render: () => <div data-testid="from-render">via render</div> },
    ]
    const { container } = render(<Dashboard widgets={widgets} />)
    expect(container.querySelector('[data-testid="from-render"]')).not.toBeNull()
  })

  it('survives empty widgets', () => {
    expect(() => render(<Dashboard widgets={[]} />)).not.toThrow()
  })
})

// ─── DashboardEditor ────────────────────────────────────────────────────────

const editorWidgets: DashboardWidget[] = [
  { id: 'kpi', title: 'KPI', x: 1, y: 1, w: 2, h: 2, children: <span>kpi</span> },
  { id: 'chart', title: 'Chart', x: 5, y: 1, w: 4, h: 2, children: <span>chart</span> },
]

/**
 * jsdom returns 0×0 for `getBoundingClientRect()` by default — patch the
 * grid element so cell math (which divides by container width) lands on
 * predictable integer values during tests.
 */
function mockRect(el: Element, width: number, height: number) {
  el.getBoundingClientRect = () => ({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: width,
    bottom: height,
    width,
    height,
    toJSON: () => ({}),
  }) as DOMRect
}

/**
 * Dispatch a `pointer*` event on a target. jsdom's `PointerEvent`
 * constructor silently drops `clientX` / `clientY`, so we dispatch a
 * `MouseEvent` typed as `pointer*` instead — React's synthetic event
 * extracts `clientX` / `clientY` from the native event regardless of
 * its constructor name.
 */
function firePointerEvent(
  target: EventTarget,
  type: 'pointerdown' | 'pointermove' | 'pointerup',
  clientX: number,
  clientY: number,
) {
  const ev = new MouseEvent(type, { clientX, clientY, bubbles: true, cancelable: true })
  target.dispatchEvent(ev)
}

describe('DashboardEditor', () => {
  it('renders sg-dashboard-editor wrapper with data-edit-mode="true"', () => {
    const { container } = render(<DashboardEditor widgets={editorWidgets} />)
    const root = container.querySelector('.sg-dashboard-editor') as HTMLElement
    expect(root).not.toBeNull()
    expect(root.getAttribute('data-edit-mode')).toBe('true')
    expect(root.style.gridTemplateColumns).toBe('repeat(12, 1fr)')
  })

  it('renders one drag-handle and one resize-handle per widget', () => {
    const { container } = render(<DashboardEditor widgets={editorWidgets} />)
    expect(container.querySelectorAll('[data-role="drag-handle"]').length).toBe(2)
    expect(container.querySelectorAll('[data-role="resize-handle"]').length).toBe(2)
  })

  it('drops sg-dashboard-editor classes when unstyled', () => {
    const { container } = render(<DashboardEditor widgets={editorWidgets} unstyled />)
    expect(container.querySelector('.sg-dashboard-editor')).toBeNull()
    expect(container.querySelector('.sg-dashboard-widget')).toBeNull()
    expect(container.querySelector('.sg-dashboard-editor-resize-handle')).toBeNull()
    // Drag handle div still exists (without the styling class).
    expect(container.querySelectorAll('[data-role="drag-handle"]').length).toBe(2)
  })

  it('reflects editable=false via data-edit-mode and hides resize handles', () => {
    const { container } = render(
      <DashboardEditor widgets={editorWidgets} editable={false} />,
    )
    const root = container.querySelector('.sg-dashboard-editor') as HTMLElement
    expect(root.getAttribute('data-edit-mode')).toBe('false')
    expect(container.querySelectorAll('[data-role="resize-handle"]').length).toBe(0)
  })

  it('drag header fires onLayoutChange with the snapped (x, y)', () => {
    const onLayoutChange = vi.fn()
    const { container } = render(
      <DashboardEditor
        widgets={editorWidgets}
        onLayoutChange={onLayoutChange}
        columns={12}
        rowHeight={80}
        gap={16}
      />,
    )
    const root = container.querySelector('.sg-dashboard-editor') as HTMLElement
    // 12 cols × 100px + 11 gaps × 16px = 1376 → cellW = 100, colUnit = 116.
    // rowUnit = 80 + 16 = 96.
    mockRect(root, 1376, 480)

    const header = container.querySelector(
      '[data-widget-id="kpi"] [data-role="drag-handle"]',
    ) as HTMLElement
    firePointerEvent(header, 'pointerdown', 0, 0)
    firePointerEvent(window, 'pointermove', 116, 96) // exactly +1 col, +1 row
    firePointerEvent(window, 'pointerup', 116, 96)

    expect(onLayoutChange).toHaveBeenCalled()
    const calls = onLayoutChange.mock.calls
    const [next, meta] = calls[calls.length - 1]!
    const moved = (next as DashboardWidget[]).find((w) => w.id === 'kpi')!
    expect(moved.x).toBe(2)
    expect(moved.y).toBe(2)
    expect(meta).toEqual({ widgetId: 'kpi', patch: { x: 2, y: 2 } })
  })

  it('drag header does not fire when the pointer stays within the same cell', () => {
    const onLayoutChange = vi.fn()
    const { container } = render(
      <DashboardEditor widgets={editorWidgets} onLayoutChange={onLayoutChange} />,
    )
    const root = container.querySelector('.sg-dashboard-editor') as HTMLElement
    mockRect(root, 1376, 480)

    const header = container.querySelector(
      '[data-widget-id="kpi"] [data-role="drag-handle"]',
    ) as HTMLElement
    firePointerEvent(header, 'pointerdown', 0, 0)
    // 30px is well below colUnit (116) and rowUnit (96) — still cell (1, 1).
    firePointerEvent(window, 'pointermove', 30, 30)
    firePointerEvent(window, 'pointerup', 30, 30)

    expect(onLayoutChange).not.toHaveBeenCalled()
  })

  it('resize handle fires onLayoutChange with the snapped (w, h)', () => {
    const onLayoutChange = vi.fn()
    const { container } = render(
      <DashboardEditor
        widgets={editorWidgets}
        onLayoutChange={onLayoutChange}
        columns={12}
        rowHeight={80}
        gap={16}
      />,
    )
    const root = container.querySelector('.sg-dashboard-editor') as HTMLElement
    mockRect(root, 1376, 480)

    const handle = container.querySelector(
      '[data-widget-id="kpi"] [data-role="resize-handle"]',
    ) as HTMLElement
    firePointerEvent(handle, 'pointerdown', 0, 0)
    firePointerEvent(window, 'pointermove', 116, 96) // +1 col, +1 row
    firePointerEvent(window, 'pointerup', 116, 96)

    expect(onLayoutChange).toHaveBeenCalled()
    const calls = onLayoutChange.mock.calls
    const [next, meta] = calls[calls.length - 1]!
    const resized = (next as DashboardWidget[]).find((w) => w.id === 'kpi')!
    expect(resized.w).toBe(3) // 2 + 1
    expect(resized.h).toBe(3) // 2 + 1
    expect(meta.patch).toEqual({ w: 3, h: 3 })
  })

  it('drag clamps x so the widget stays inside the grid', () => {
    const onLayoutChange = vi.fn()
    const { container } = render(
      <DashboardEditor
        widgets={editorWidgets}
        onLayoutChange={onLayoutChange}
        columns={12}
        rowHeight={80}
        gap={16}
      />,
    )
    const root = container.querySelector('.sg-dashboard-editor') as HTMLElement
    mockRect(root, 1376, 480)

    const header = container.querySelector(
      '[data-widget-id="kpi"] [data-role="drag-handle"]',
    ) as HTMLElement
    firePointerEvent(header, 'pointerdown', 0, 0)
    // Nudge far to the right — kpi (w=2) would fit at x=1..11, clamp to 11.
    firePointerEvent(window, 'pointermove', 9999, 0)
    firePointerEvent(window, 'pointerup', 9999, 0)

    const calls = onLayoutChange.mock.calls
    expect(calls.length).toBeGreaterThan(0)
    const lastCall = calls[calls.length - 1]!
    const last = (lastCall[0] as DashboardWidget[]).find((w) => w.id === 'kpi')!
    expect(last.x).toBe(11) // 12 - 2 + 1
    expect(last.y).toBe(1)
  })

  it('does not fire onLayoutChange when editable is false', () => {
    const onLayoutChange = vi.fn()
    const { container } = render(
      <DashboardEditor
        widgets={editorWidgets}
        onLayoutChange={onLayoutChange}
        editable={false}
      />,
    )
    const header = container.querySelector(
      '[data-widget-id="kpi"] [data-role="drag-handle"]',
    ) as HTMLElement
    // Even firing pointer events on a non-editable header must be a no-op.
    firePointerEvent(header, 'pointerdown', 0, 0)
    firePointerEvent(window, 'pointermove', 200, 200)
    firePointerEvent(window, 'pointerup', 200, 200)
    expect(onLayoutChange).not.toHaveBeenCalled()
  })

  it('uses given columns / rowHeight / gap on the grid root', () => {
    const { container } = render(
      <DashboardEditor
        widgets={editorWidgets}
        columns={6}
        rowHeight={120}
        gap={24}
      />,
    )
    const root = container.querySelector('.sg-dashboard-editor') as HTMLElement
    expect(root.style.gridTemplateColumns).toBe('repeat(6, 1fr)')
    expect(root.style.gridAutoRows).toBe('120px')
    expect(root.style.gap).toBe('24px')
  })
})

// ─── Hover actions + context menu (Tab C) ───────────────────────────────────

describe('Dashboard — widget actions menu', () => {
  function actionWidgets(actions: readonly WidgetAction[]): DashboardWidget[] {
    return [{ id: 'kpi', title: 'KPI', x: 1, y: 1, w: 2, h: 2, actions, children: <span>kpi</span> }]
  }

  it('omits the more button when the widget declares no actions', () => {
    const { container } = render(<Dashboard widgets={[
      { id: 'a', title: 'A', x: 1, y: 1, children: <span>a</span> },
    ]} />)
    expect(container.querySelector('[data-role="widget-more-button"]')).toBeNull()
    expect(container.querySelector('[data-sg-actions]')).toBeNull()
  })

  it('flips data-sg-actions to "visible" on widget hover', () => {
    const onClick = vi.fn()
    const { container } = render(
      <Dashboard widgets={actionWidgets([{ id: 'r', label: 'Refresh', onClick }])} />,
    )
    const widget = container.querySelector('[data-widget-id="kpi"]') as HTMLElement
    expect(widget.getAttribute('data-sg-actions')).toBe('hidden')
    fireEvent.mouseEnter(widget)
    expect(widget.getAttribute('data-sg-actions')).toBe('visible')
    fireEvent.mouseLeave(widget)
    expect(widget.getAttribute('data-sg-actions')).toBe('hidden')
  })

  it('opens the actions menu when the more button is clicked', () => {
    const { container } = render(
      <Dashboard widgets={actionWidgets([{ id: 'r', label: 'Refresh', onClick: () => {} }])} />,
    )
    expect(container.querySelector('[data-role="widget-actions-menu"]')).toBeNull()
    const trigger = container.querySelector('[data-role="widget-more-button"]') as HTMLButtonElement
    fireEvent.click(trigger)
    const menu = container.querySelector('[data-role="widget-actions-menu"]')
    expect(menu).not.toBeNull()
    expect(menu!.querySelector('[data-action-id="r"]')).not.toBeNull()
  })

  it('clicking an action invokes onClick with the widget and closes the menu', () => {
    const onClick = vi.fn()
    const { container } = render(
      <Dashboard widgets={actionWidgets([{ id: 'r', label: 'Refresh', onClick }])} />,
    )
    fireEvent.click(container.querySelector('[data-role="widget-more-button"]') as HTMLElement)
    fireEvent.click(container.querySelector('[data-action-id="r"]') as HTMLElement)
    expect(onClick).toHaveBeenCalledTimes(1)
    const arg = onClick.mock.calls[0]![0] as DashboardWidget
    expect(arg.id).toBe('kpi')
    // Menu closes after activation.
    expect(container.querySelector('[data-role="widget-actions-menu"]')).toBeNull()
  })

  it('hidden() predicate filters out per-widget actions', () => {
    const onClick = vi.fn()
    const { container } = render(
      <Dashboard
        widgets={actionWidgets([
          { id: 'visible', label: 'Visible', onClick },
          { id: 'gone', label: 'Gone', onClick, hidden: () => true },
        ])}
      />,
    )
    fireEvent.click(container.querySelector('[data-role="widget-more-button"]') as HTMLElement)
    expect(container.querySelector('[data-action-id="visible"]')).not.toBeNull()
    expect(container.querySelector('[data-action-id="gone"]')).toBeNull()
  })
})

describe('Dashboard — context menu', () => {
  const widgets: DashboardWidget[] = [
    { id: 'kpi', title: 'KPI', x: 1, y: 1, children: <span>kpi</span> },
  ]

  it('calls onWidgetContextMenu with preventDefault on right click', () => {
    const onWidgetContextMenu = vi.fn()
    const { container } = render(
      <Dashboard widgets={widgets} onWidgetContextMenu={onWidgetContextMenu} />,
    )
    const widget = container.querySelector('[data-widget-id="kpi"]') as HTMLElement
    const ev = fireEvent.contextMenu(widget)
    expect(onWidgetContextMenu).toHaveBeenCalledTimes(1)
    const [event, w] = onWidgetContextMenu.mock.calls[0]!
    expect((w as DashboardWidget).id).toBe('kpi')
    expect((event as { defaultPrevented: boolean }).defaultPrevented).toBe(true)
    expect(ev).toBe(false) // contextMenu returns false when default was prevented
  })

  it('calls onDashboardContextMenu when the background is right-clicked', () => {
    const onDashboardContextMenu = vi.fn()
    const { container } = render(
      <Dashboard widgets={widgets} onDashboardContextMenu={onDashboardContextMenu} />,
    )
    const root = container.querySelector('.sg-dashboard') as HTMLElement
    fireEvent.contextMenu(root)
    expect(onDashboardContextMenu).toHaveBeenCalledTimes(1)
  })

  it('does NOT preventDefault when no context menu handler is provided', () => {
    // The default browser menu must keep working when the consumer
    // hasn't opted in. We assert this by checking the React onContextMenu
    // attribute isn't wired (no handler → no preventDefault).
    const { container } = render(<Dashboard widgets={widgets} />)
    const widget = container.querySelector('[data-widget-id="kpi"]') as HTMLElement
    const result = fireEvent.contextMenu(widget)
    // fireEvent returns true when the event was NOT preventDefault'd.
    expect(result).toBe(true)
  })
})

describe('DashboardEditor — defaults & actions', () => {
  const baseWidgets: DashboardWidget[] = [
    { id: 'kpi', title: 'KPI', x: 1, y: 1, w: 2, h: 2, children: <span>kpi</span> },
  ]

  it('synthesises a default actions menu when widget has no actions and onLayoutChange is set', () => {
    const onLayoutChange = vi.fn()
    const { container } = render(
      <DashboardEditor widgets={baseWidgets} onLayoutChange={onLayoutChange} />,
    )
    fireEvent.click(container.querySelector('[data-role="widget-more-button"]') as HTMLElement)
    expect(container.querySelector('[data-action-id="__maximize__"]')).not.toBeNull()
    expect(container.querySelector('[data-action-id="__remove__"]')).not.toBeNull()
    // Refresh / Settings only when their callbacks are wired.
    expect(container.querySelector('[data-action-id="__refresh__"]')).toBeNull()
    expect(container.querySelector('[data-action-id="__settings__"]')).toBeNull()
  })

  it('does NOT render default actions when onLayoutChange is missing', () => {
    const { container } = render(<DashboardEditor widgets={baseWidgets} />)
    expect(container.querySelector('[data-role="widget-more-button"]')).toBeNull()
  })

  it('default Remove action drops the widget via onLayoutChange', () => {
    const onLayoutChange = vi.fn()
    const { container } = render(
      <DashboardEditor
        widgets={[
          { id: 'a', title: 'A', x: 1, y: 1, children: <span>a</span> },
          { id: 'b', title: 'B', x: 3, y: 1, children: <span>b</span> },
        ]}
        onLayoutChange={onLayoutChange}
      />,
    )
    const widgetA = container.querySelector('[data-widget-id="a"]') as HTMLElement
    fireEvent.click(widgetA.querySelector('[data-role="widget-more-button"]') as HTMLElement)
    fireEvent.click(widgetA.querySelector('[data-action-id="__remove__"]') as HTMLElement)
    expect(onLayoutChange).toHaveBeenCalledTimes(1)
    const [next, meta] = onLayoutChange.mock.calls[0]!
    expect((next as DashboardWidget[]).map((w) => w.id)).toEqual(['b'])
    expect(meta).toEqual({ widgetId: 'a', patch: {} })
  })

  it('Maximize action toggles data-sg-maximized on the widget', () => {
    const onLayoutChange = vi.fn()
    const { container } = render(
      <DashboardEditor widgets={baseWidgets} onLayoutChange={onLayoutChange} />,
    )
    const widget = container.querySelector('[data-widget-id="kpi"]') as HTMLElement
    expect(widget.getAttribute('data-sg-maximized')).toBeNull()
    fireEvent.click(widget.querySelector('[data-role="widget-more-button"]') as HTMLElement)
    fireEvent.click(widget.querySelector('[data-action-id="__maximize__"]') as HTMLElement)
    expect(widget.getAttribute('data-sg-maximized')).toBe('true')
    // Click again — label is now "Restore", id is still __maximize__.
    fireEvent.click(widget.querySelector('[data-role="widget-more-button"]') as HTMLElement)
    fireEvent.click(widget.querySelector('[data-action-id="__maximize__"]') as HTMLElement)
    expect(widget.getAttribute('data-sg-maximized')).toBeNull()
  })
})
