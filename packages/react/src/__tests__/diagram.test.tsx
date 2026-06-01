import { describe, it, expect, vi } from 'vitest'
import { render, act, renderHook, fireEvent } from '@testing-library/react'
import { Diagram, useGraph } from '../index'

/**
 * Dispatch a `pointer*` event on a target. jsdom's `PointerEvent`
 * constructor silently drops `clientX` / `clientY` / `button`, so we
 * dispatch a `MouseEvent` typed as `pointer*` instead — React's
 * synthetic-event layer extracts the relevant fields from the native
 * event regardless of its constructor name. Mirrors the trick used in
 * the Dashboard test suite.
 *
 * `pointerId` is forced to a deterministic value because jsdom's
 * `MouseEvent` has no pointerId field — the diagram component matches
 * pointerdown ↔ pointermove ↔ pointerup pairs by that id, so we need
 * one that stays constant across the three calls.
 */
function firePointerEvent(
  target: EventTarget,
  type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel',
  init: {
    clientX?: number
    clientY?: number
    button?: number
    ctrlKey?: boolean
    pointerId?: number
  } = {},
) {
  const ev = new MouseEvent(type, {
    clientX: init.clientX ?? 0,
    clientY: init.clientY ?? 0,
    button: init.button ?? 0,
    ctrlKey: init.ctrlKey ?? false,
    bubbles: true,
    cancelable: true,
  })
  // Patch a pointerId onto the synthetic event. React's
  // `SyntheticPointerEvent` exposes `pointerId` straight off the
  // native event, so this is enough to make the production code's
  // pairing logic happy.
  Object.defineProperty(ev, 'pointerId', { value: init.pointerId ?? 1 })
  target.dispatchEvent(ev)
}

describe('useGraph hook', () => {
  it('returns a stable graph reference and an empty initial state', () => {
    const { result, rerender } = renderHook(() => useGraph())
    const first = result.current.graph
    rerender()
    expect(result.current.graph).toBe(first)
    expect(result.current.state.nodes.size).toBe(0)
    expect(result.current.state.edges.size).toBe(0)
  })

  it('snapshot updates when a node is added', () => {
    const { result } = renderHook(() => useGraph())
    act(() => {
      result.current.graph.addNode({ id: 'n1' })
    })
    expect(result.current.state.nodes.size).toBe(1)
    expect(result.current.state.nodes.get('n1')).toBeDefined()
  })

  it('snapshot updates when an edge is added', () => {
    const { result } = renderHook(() => useGraph())
    act(() => {
      result.current.graph.addNode({ id: 'a' })
      result.current.graph.addNode({ id: 'b' })
      result.current.graph.addEdge({
        id: 'e',
        from: { node: 'a', anchor: 'nw' },
        to: { node: 'b', anchor: 'nw' },
      })
    })
    expect(result.current.state.edges.size).toBe(1)
    expect(result.current.state.edges.get('e')).toBeDefined()
  })

  it('removeNode also drops incident edges from the snapshot', () => {
    const { result } = renderHook(() => useGraph())
    act(() => {
      result.current.graph.addNode({ id: 'a' })
      result.current.graph.addNode({ id: 'b' })
      result.current.graph.addEdge({
        id: 'e',
        from: { node: 'a', anchor: 'nw' },
        to: { node: 'b', anchor: 'nw' },
      })
      result.current.graph.removeNode('a')
    })
    expect(result.current.state.nodes.size).toBe(1)
    expect(result.current.state.edges.size).toBe(0)
  })

  it('undo / redo round-trip a node addition through the React snapshot', () => {
    const { result } = renderHook(() => useGraph())
    act(() => {
      result.current.graph.addNode({ id: 'a' })
    })
    expect(result.current.state.nodes.size).toBe(1)

    act(() => {
      result.current.graph.undo()
    })
    expect(result.current.state.nodes.size).toBe(0)

    act(() => {
      result.current.graph.redo()
    })
    expect(result.current.state.nodes.size).toBe(1)
    expect(result.current.state.nodes.get('a')).toBeDefined()
  })

  it('transaction() groups mutations: a single undo restores the prior empty state', () => {
    const { result } = renderHook(() => useGraph())
    act(() => {
      result.current.graph.transaction(() => {
        result.current.graph.addNode({ id: 'a' })
        result.current.graph.addNode({ id: 'b' })
        result.current.graph.addEdge({
          id: 'e',
          from: { node: 'a', anchor: 'nw' },
          to: { node: 'b', anchor: 'nw' },
        })
      })
    })
    expect(result.current.state.nodes.size).toBe(2)
    expect(result.current.state.edges.size).toBe(1)

    act(() => {
      result.current.graph.undo()
    })
    expect(result.current.state.nodes.size).toBe(0)
    expect(result.current.state.edges.size).toBe(0)
  })
})

describe('Diagram component', () => {
  it('renders the wrapper with sg-diagram class by default', () => {
    const { graph, state } = simpleScene()
    const { container } = render(<Diagram graph={graph} state={state} />)
    const wrapper = container.querySelector('.sg-diagram')
    expect(wrapper).not.toBeNull()
  })

  it('drops sg-diagram classes when unstyled', () => {
    const { graph, state } = simpleScene()
    const { container } = render(<Diagram graph={graph} state={state} unstyled />)
    expect(container.querySelector('.sg-diagram')).toBeNull()
    expect(container.querySelector('.sg-diagram-node')).toBeNull()
  })

  it('renders one DOM node per graph node', () => {
    const { graph, state } = simpleScene()
    const { container } = render(<Diagram graph={graph} state={state} />)
    const nodes = container.querySelectorAll('.sg-diagram-node')
    expect(nodes.length).toBe(3) // a, b, c
  })

  it('renders one SVG path per edge', () => {
    const { graph, state } = simpleScene()
    const { container } = render(<Diagram graph={graph} state={state} />)
    const paths = container.querySelectorAll('.sg-diagram-edge')
    expect(paths.length).toBe(2) // a→b, b→c
  })

  it('renderNode prop replaces the default label', () => {
    const { graph, state } = simpleScene()
    const { container } = render(
      <Diagram
        graph={graph}
        state={state}
        renderNode={(n) => <span data-testid="custom-label">CUSTOM:{n.id}</span>}
      />,
    )
    const labels = container.querySelectorAll('[data-testid="custom-label"]')
    expect(labels.length).toBe(3)
    expect(labels[0]!.textContent).toContain('CUSTOM:a')
  })

  it('uses outline kind to pick a node modifier class', () => {
    const { graph, state } = simpleScene()
    const { container } = render(<Diagram graph={graph} state={state} />)
    const rectNodes = container.querySelectorAll('.sg-diagram-node-rect')
    expect(rectNodes.length).toBe(3)
  })

  it('survives empty graph (no nodes / no edges)', () => {
    const { result } = renderHook(() => useGraph())
    const { graph, state } = result.current
    const { container } = render(<Diagram graph={graph} state={state} />)
    expect(container.querySelectorAll('.sg-diagram-node').length).toBe(0)
    expect(container.querySelectorAll('.sg-diagram-edge').length).toBe(0)
  })

  it('orthogonal edges produce an orthogonal polyline through right-angle bends', () => {
    const { result } = renderHook(() => useGraph())
    act(() => {
      const a = result.current.graph.addNode({
        id: 'a',
        transform: { x: 0, y: 0 },
        outline: { kind: 'rect', w: 50, h: 30 },
      })
      const b = result.current.graph.addNode({
        id: 'b',
        transform: { x: 200, y: 100 },
        outline: { kind: 'rect', w: 50, h: 30 },
      })
      result.current.graph.addEdge({
        from: { node: a, anchor: 'ne' },
        to: { node: b, anchor: 'nw' },
        routing: 'orthogonal',
      })
    })
    const { container } = render(
      <Diagram graph={result.current.graph} state={result.current.state} />,
    )
    const path = container.querySelector('.sg-diagram-edge-orthogonal') as SVGPathElement
    expect(path).not.toBeNull()
    const d = path.getAttribute('d')!
    // T-Diagram-Polish (3.3c): the router now exits / enters through the
    // side of each node nearest to the other endpoint and adds a short
    // perpendicular stub, so an orthogonal edge produces ≥ 2 line
    // segments (≥ 1 bend) — not just a clean L-route.
    const lCount = (d.match(/L /g) ?? []).length
    expect(lCount).toBeGreaterThanOrEqual(2)
    // The orthogonal polyline is rendered with rounded corners
    // (`pointsToRoundedPath`): straight runs are `L` commands and each
    // bend becomes a short quadratic curve (`Q cx cy x y`). We assert
    // that every `L` segment is still axis-aligned (no diagonals) and
    // that any `Q` keeps the same property between its control / end
    // points.
    const tokens = d.split(/\s+/).filter((t) => t.length > 0)
    type Cmd =
      | { kind: 'M'; x: number; y: number }
      | { kind: 'L'; x: number; y: number }
      | { kind: 'Q'; cx: number; cy: number; x: number; y: number }
    const cmds: Cmd[] = []
    for (let i = 0; i < tokens.length; ) {
      const k = tokens[i]!
      if (k === 'M' || k === 'L') {
        cmds.push({ kind: k, x: Number(tokens[i + 1]), y: Number(tokens[i + 2]) })
        i += 3
      } else if (k === 'Q') {
        cmds.push({
          kind: 'Q',
          cx: Number(tokens[i + 1]),
          cy: Number(tokens[i + 2]),
          x: Number(tokens[i + 3]),
          y: Number(tokens[i + 4]),
        })
        i += 5
      } else {
        // Unrecognised path command — fail fast with a helpful message.
        throw new Error(`Unexpected token in orthogonal path: ${k}`)
      }
    }
    let prev: { x: number; y: number } | null = null
    for (const cmd of cmds) {
      if (cmd.kind === 'M') {
        prev = { x: cmd.x, y: cmd.y }
        continue
      }
      if (cmd.kind === 'L') {
        if (prev) expect(prev.x === cmd.x || prev.y === cmd.y).toBe(true)
        prev = { x: cmd.x, y: cmd.y }
      } else {
        // Q: control + end. The router rounds a 90° corner, so the
        // control point sits ON the corner — meaning one axis matches
        // the previous endpoint and the other matches the Q endpoint.
        if (prev) {
          expect(prev.x === cmd.cx || prev.y === cmd.cy).toBe(true)
          expect(cmd.cx === cmd.x || cmd.cy === cmd.y).toBe(true)
        }
        prev = { x: cmd.x, y: cmd.y }
      }
    }
  })

  it('manual edges with waypoints render through them', () => {
    const { result } = renderHook(() => useGraph())
    act(() => {
      const a = result.current.graph.addNode({ id: 'a', transform: { x: 0, y: 0 } })
      const b = result.current.graph.addNode({ id: 'b', transform: { x: 100, y: 100 } })
      result.current.graph.addEdge({
        from: { node: a, anchor: 'ne' },
        to: { node: b, anchor: 'nw' },
        routing: 'manual',
        waypoints: [
          [50, 0],
          [50, 100],
        ],
      })
    })
    const { container } = render(
      <Diagram graph={result.current.graph} state={result.current.state} />,
    )
    const path = container.querySelector('.sg-diagram-edge-manual') as SVGPathElement
    expect(path).not.toBeNull()
    const d = path.getAttribute('d')!
    // start + 2 waypoints + end = 4 points → 3 L commands
    const lCount = (d.match(/L /g) ?? []).length
    expect(lCount).toBe(3)
  })

  it('draggable adds sg-diagram-node-draggable class and grab cursor', () => {
    const { result } = renderHook(() => useGraph())
    act(() => {
      result.current.graph.addNode({ id: 'a', transform: { x: 0, y: 0 } })
    })
    const { container } = render(
      <Diagram graph={result.current.graph} state={result.current.state} draggable />,
    )
    const nodeEl = container.querySelector('.sg-diagram-node-draggable') as HTMLElement
    expect(nodeEl).not.toBeNull()
    expect(nodeEl.style.cursor).toBe('grab')
  })

  it('not-draggable nodes have no cursor styling', () => {
    const { result } = renderHook(() => useGraph())
    act(() => {
      result.current.graph.addNode({ id: 'a', transform: { x: 0, y: 0 } })
    })
    const { container } = render(
      <Diagram graph={result.current.graph} state={result.current.state} />,
    )
    const nodeEl = container.querySelector('.sg-diagram-node') as HTMLElement
    expect(container.querySelector('.sg-diagram-node-draggable')).toBeNull()
    expect(nodeEl.style.cursor).toBe('')
  })

  it('Ctrl+wheel zoom updates the canvas transform when zoomable', () => {
    const { result } = renderHook(() => useGraph())
    act(() => {
      result.current.graph.addNode({ id: 'a', transform: { x: 0, y: 0 } })
    })
    const { container } = render(
      <Diagram graph={result.current.graph} state={result.current.state} zoomable />,
    )
    const wrapper = container.querySelector('.sg-diagram') as HTMLElement
    const canvas = container.querySelector('.sg-diagram-canvas') as HTMLElement
    expect(canvas.dataset.zoom).toBe('1')

    // Ctrl+wheel up → zoom in.
    fireEvent.wheel(wrapper, { deltaY: -100, ctrlKey: true })
    expect(Number(canvas.dataset.zoom)).toBeGreaterThan(1)

    // Ctrl+wheel down → zoom out below the previous value.
    const after = Number(canvas.dataset.zoom)
    fireEvent.wheel(wrapper, { deltaY: 100, ctrlKey: true })
    expect(Number(canvas.dataset.zoom)).toBeLessThan(after)
  })

  it('plain wheel pans the canvas when panable', () => {
    const { result } = renderHook(() => useGraph())
    act(() => {
      result.current.graph.addNode({ id: 'a', transform: { x: 0, y: 0 } })
    })
    const { container } = render(
      <Diagram graph={result.current.graph} state={result.current.state} panable />,
    )
    const wrapper = container.querySelector('.sg-diagram') as HTMLElement
    const canvas = container.querySelector('.sg-diagram-canvas') as HTMLElement
    expect(canvas.dataset.panX).toBe('0')
    expect(canvas.dataset.panY).toBe('0')

    fireEvent.wheel(wrapper, { deltaX: 30, deltaY: 50 })
    expect(Number(canvas.dataset.panX)).toBe(-30)
    expect(Number(canvas.dataset.panY)).toBe(-50)
  })

  it('middle-button drag pans the canvas when panable', () => {
    const { result } = renderHook(() => useGraph())
    act(() => {
      result.current.graph.addNode({ id: 'a', transform: { x: 0, y: 0 } })
    })
    const { container } = render(
      <Diagram graph={result.current.graph} state={result.current.state} panable />,
    )
    const wrapper = container.querySelector('.sg-diagram') as HTMLElement
    const canvas = container.querySelector('.sg-diagram-canvas') as HTMLElement

    act(() => {
      firePointerEvent(wrapper, 'pointerdown', { button: 1, clientX: 100, clientY: 100 })
      firePointerEvent(wrapper, 'pointermove', { clientX: 140, clientY: 170 })
      firePointerEvent(wrapper, 'pointerup', { clientX: 140, clientY: 170 })
    })

    expect(Number(canvas.dataset.panX)).toBe(40)
    expect(Number(canvas.dataset.panY)).toBe(70)
  })

  it('zoom controls clamp to a sensible range (no negative or zero zoom)', () => {
    const { result } = renderHook(() => useGraph())
    act(() => {
      result.current.graph.addNode({ id: 'a', transform: { x: 0, y: 0 } })
    })
    const { container } = render(
      <Diagram graph={result.current.graph} state={result.current.state} zoomable />,
    )
    const wrapper = container.querySelector('.sg-diagram') as HTMLElement
    const canvas = container.querySelector('.sg-diagram-canvas') as HTMLElement

    // Hammer zoom-out a lot — final value must remain strictly positive.
    for (let i = 0; i < 100; i++) {
      fireEvent.wheel(wrapper, { deltaY: 100, ctrlKey: true })
    }
    expect(Number(canvas.dataset.zoom)).toBeGreaterThan(0)
  })

  it('snapToGrid rounds drag coordinates to multiples of the step', () => {
    const { result } = renderHook(() => useGraph())
    act(() => {
      result.current.graph.addNode({ id: 'a', transform: { x: 0, y: 0 } })
    })
    const { container } = render(
      <Diagram
        graph={result.current.graph}
        state={result.current.state}
        draggable
        snapToGrid={20}
      />,
    )
    const nodeEl = container.querySelector('[data-node-id="a"]') as HTMLElement

    firePointerEvent(nodeEl, 'pointerdown', { button: 0, clientX: 0, clientY: 0 })
    firePointerEvent(nodeEl, 'pointermove', { clientX: 27, clientY: 13 })
    firePointerEvent(nodeEl, 'pointerup', { clientX: 27, clientY: 13 })

    const node = result.current.graph.getNode('a')!
    expect(node.transform.x % 20).toBe(0)
    expect(node.transform.y % 20).toBe(0)
    expect(node.transform.x).toBe(20)
    expect(node.transform.y).toBe(20)
  })

  it('snapToGrid attaches the sg-diagram-grid hook class', () => {
    const { result } = renderHook(() => useGraph())
    const { container } = render(
      <Diagram graph={result.current.graph} state={result.current.state} snapToGrid={25} />,
    )
    expect(container.querySelector('.sg-diagram.sg-diagram-grid')).not.toBeNull()
  })

  it('without snapToGrid the grid hook class is absent', () => {
    const { result } = renderHook(() => useGraph())
    const { container } = render(
      <Diagram graph={result.current.graph} state={result.current.state} />,
    )
    expect(container.querySelector('.sg-diagram-grid')).toBeNull()
  })

  it('routeAroundNodes makes orthogonal edges avoid intermediate node bounds', () => {
    const { result } = renderHook(() => useGraph())
    act(() => {
      const a = result.current.graph.addNode({
        id: 'a',
        transform: { x: 0, y: 0 },
        outline: { kind: 'rect', w: 40, h: 40 },
      })
      // Wall-like obstacle directly between a and b.
      result.current.graph.addNode({
        id: 'wall',
        transform: { x: 80, y: -40 },
        outline: { kind: 'rect', w: 40, h: 120 },
      })
      const b = result.current.graph.addNode({
        id: 'b',
        transform: { x: 200, y: 0 },
        outline: { kind: 'rect', w: 40, h: 40 },
      })
      result.current.graph.addEdge({
        from: { node: a, anchor: 'ne' },
        to: { node: b, anchor: 'nw' },
        routing: 'orthogonal',
      })
    })
    const { container } = render(
      <Diagram graph={result.current.graph} state={result.current.state} routeAroundNodes />,
    )
    const path = container.querySelector('.sg-diagram-edge-orthogonal') as SVGPathElement
    expect(path).not.toBeNull()
    expect(Number(path.getAttribute('data-obstacle-count'))).toBeGreaterThan(0)
    const d = path.getAttribute('d')!
    // The simple L-route would only have 2 L commands; an obstacle-avoiding
    // path detours and produces strictly more.
    const lCount = (d.match(/L /g) ?? []).length
    expect(lCount).toBeGreaterThan(2)
  })

  it('straight edges (default) produce a single L segment', () => {
    const { result } = renderHook(() => useGraph())
    act(() => {
      const a = result.current.graph.addNode({ id: 'a', transform: { x: 0, y: 0 } })
      const b = result.current.graph.addNode({ id: 'b', transform: { x: 100, y: 100 } })
      result.current.graph.addEdge({
        from: { node: a, anchor: 'ne' },
        to: { node: b, anchor: 'nw' },
        // routing defaults to 'straight'
      })
    })
    const { container } = render(
      <Diagram graph={result.current.graph} state={result.current.state} />,
    )
    const path = container.querySelector('.sg-diagram-edge-straight') as SVGPathElement
    expect(path).not.toBeNull()
    const d = path.getAttribute('d')!
    expect((d.match(/L /g) ?? []).length).toBe(1)
  })
})

describe('Diagram — context menu', () => {
  it('onNodeContextMenu fires with the right node and preventDefault is called', () => {
    const { graph, state } = simpleScene()
    const onNodeContextMenu = vi.fn()
    const { container } = render(
      <Diagram graph={graph} state={state} onNodeContextMenu={onNodeContextMenu} />,
    )
    const nodeA = container.querySelector('[data-node-id="a"]') as HTMLElement
    const ev = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    nodeA.dispatchEvent(ev)
    expect(onNodeContextMenu).toHaveBeenCalledTimes(1)
    const passedNode = onNodeContextMenu.mock.calls[0]![1]
    expect(passedNode.id).toBe('a')
    expect(ev.defaultPrevented).toBe(true)
  })

  it('onEdgeContextMenu fires when right-clicking an edge hit-area', () => {
    const { graph, state } = simpleScene()
    const onEdgeContextMenu = vi.fn()
    const { container } = render(
      <Diagram graph={graph} state={state} onEdgeContextMenu={onEdgeContextMenu} />,
    )
    const hit = container.querySelector('.sg-diagram-edge-hit') as SVGPathElement
    expect(hit).not.toBeNull()
    fireEvent.contextMenu(hit)
    expect(onEdgeContextMenu).toHaveBeenCalledTimes(1)
    const passedEdge = onEdgeContextMenu.mock.calls[0]![1]
    expect(passedEdge.from.node).toBe('a')
  })

  it('onCanvasContextMenu fires with world + screen coords on empty area', () => {
    const { graph, state } = simpleScene()
    const onCanvasContextMenu = vi.fn()
    const { container } = render(
      <Diagram graph={graph} state={state} onCanvasContextMenu={onCanvasContextMenu} />,
    )
    const wrapper = container.querySelector('.sg-diagram') as HTMLElement
    fireEvent.contextMenu(wrapper, { clientX: 50, clientY: 80 })
    expect(onCanvasContextMenu).toHaveBeenCalledTimes(1)
    const point = onCanvasContextMenu.mock.calls[0]![1]
    expect(point).toMatchObject({ screenX: 50, screenY: 80 })
    expect(typeof point.x).toBe('number')
    expect(typeof point.y).toBe('number')
  })

  it('without callbacks the native menu fires (no preventDefault)', () => {
    const { graph, state } = simpleScene()
    const { container } = render(<Diagram graph={graph} state={state} />)
    const nodeA = container.querySelector('[data-node-id="a"]') as HTMLElement
    const ev = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    nodeA.dispatchEvent(ev)
    expect(ev.defaultPrevented).toBe(false)
  })

  it('node context menu does NOT bubble to canvas handler', () => {
    const { graph, state } = simpleScene()
    const onNodeContextMenu = vi.fn()
    const onCanvasContextMenu = vi.fn()
    const { container } = render(
      <Diagram
        graph={graph}
        state={state}
        onNodeContextMenu={onNodeContextMenu}
        onCanvasContextMenu={onCanvasContextMenu}
      />,
    )
    const nodeA = container.querySelector('[data-node-id="a"]') as HTMLElement
    fireEvent.contextMenu(nodeA)
    expect(onNodeContextMenu).toHaveBeenCalledTimes(1)
    expect(onCanvasContextMenu).not.toHaveBeenCalled()
  })
})

describe('Diagram — selection / multi-select', () => {
  it('Ctrl+click adds a node to the selection (multi mode)', () => {
    const { graph, state } = simpleScene()
    const onSelectionChange = vi.fn()
    const { container } = render(
      <Diagram
        graph={graph}
        state={state}
        selectionMode="multi"
        onSelectionChange={onSelectionChange}
      />,
    )
    const nodeA = container.querySelector('[data-node-id="a"]') as HTMLElement
    act(() => {
      firePointerEvent(nodeA, 'pointerdown', { button: 0, ctrlKey: true })
    })
    expect(onSelectionChange).toHaveBeenCalledWith(['a'])

    const nodeB = container.querySelector('[data-node-id="b"]') as HTMLElement
    act(() => {
      firePointerEvent(nodeB, 'pointerdown', { button: 0, ctrlKey: true })
    })
    expect(onSelectionChange).toHaveBeenLastCalledWith(['a', 'b'])
  })

  it('Ctrl+click on selected node toggles it OFF', () => {
    const { graph, state } = simpleScene()
    const onSelectionChange = vi.fn()
    const { container } = render(
      <Diagram
        graph={graph}
        state={state}
        selectionMode="multi"
        defaultSelection={['a', 'b']}
        onSelectionChange={onSelectionChange}
      />,
    )
    const nodeA = container.querySelector('[data-node-id="a"]') as HTMLElement
    firePointerEvent(nodeA, 'pointerdown', { button: 0, ctrlKey: true })
    expect(onSelectionChange).toHaveBeenLastCalledWith(['b'])
  })

  it('controlled selection prop applies sg-diagram-node-selected class', () => {
    const { graph, state } = simpleScene()
    const { container } = render(<Diagram graph={graph} state={state} selection={['a', 'c']} />)
    const selected = container.querySelectorAll('.sg-diagram-node-selected')
    expect(selected.length).toBe(2)
    const ids = Array.from(selected).map((el) => el.getAttribute('data-node-id'))
    expect(ids.sort()).toEqual(['a', 'c'])
  })

  it('lasso drag on empty canvas selects nodes whose AABB intersects', () => {
    const { graph, state } = simpleScene()
    // simpleScene: a@(0,0) 80x40, b@(200,0) 80x40, c@(200,200) 80x40.
    const onSelectionChange = vi.fn()
    const { container } = render(
      <Diagram
        graph={graph}
        state={state}
        selectionMode="lasso"
        onSelectionChange={onSelectionChange}
      />,
    )
    const wrapper = container.querySelector('.sg-diagram') as HTMLElement
    // jsdom returns zeroed getBoundingClientRect; treat clientX/Y as
    // wrapper-local coords. Pan/zoom are 0/1 by default.
    firePointerEvent(wrapper, 'pointerdown', { button: 0, clientX: -10, clientY: -10 })
    // Drag to (300, 50) — should cover a and b but not c.
    firePointerEvent(wrapper, 'pointermove', { clientX: 300, clientY: 50 })
    firePointerEvent(wrapper, 'pointerup', { clientX: 300, clientY: 50 })

    expect(onSelectionChange).toHaveBeenCalled()
    const last = onSelectionChange.mock.calls.at(-1)![0] as string[]
    expect(last.sort()).toEqual(['a', 'b'])
  })

  it('multi-drag moves every selected node by the same delta', () => {
    const { result } = renderHook(() => useGraph())
    act(() => {
      result.current.graph.addNode({
        id: 'a',
        transform: { x: 0, y: 0 },
        outline: { kind: 'rect', w: 40, h: 40 },
      })
      result.current.graph.addNode({
        id: 'b',
        transform: { x: 100, y: 50 },
        outline: { kind: 'rect', w: 40, h: 40 },
      })
    })
    const { container } = render(
      <Diagram
        graph={result.current.graph}
        state={result.current.state}
        draggable
        selectionMode="multi"
        defaultSelection={['a', 'b']}
      />,
    )
    const nodeA = container.querySelector('[data-node-id="a"]') as HTMLElement
    firePointerEvent(nodeA, 'pointerdown', { button: 0, clientX: 0, clientY: 0 })
    firePointerEvent(nodeA, 'pointermove', { clientX: 30, clientY: 20 })
    firePointerEvent(nodeA, 'pointerup', { clientX: 30, clientY: 20 })

    const a = result.current.graph.getNode('a')!
    const b = result.current.graph.getNode('b')!
    expect(a.transform.x).toBe(30)
    expect(a.transform.y).toBe(20)
    expect(b.transform.x).toBe(130)
    expect(b.transform.y).toBe(70)
  })

  it('plain click on empty canvas clears selection (multi mode)', () => {
    const { graph, state } = simpleScene()
    const onSelectionChange = vi.fn()
    const { container } = render(
      <Diagram
        graph={graph}
        state={state}
        selectionMode="multi"
        defaultSelection={['a', 'b']}
        onSelectionChange={onSelectionChange}
      />,
    )
    const wrapper = container.querySelector('.sg-diagram') as HTMLElement
    firePointerEvent(wrapper, 'pointerdown', { button: 0, clientX: 5, clientY: 5 })
    expect(onSelectionChange).toHaveBeenLastCalledWith([])
  })

  it('selectionMode="single" preserves legacy drag behaviour with no selection mgmt', () => {
    const { result } = renderHook(() => useGraph())
    act(() => {
      result.current.graph.addNode({
        id: 'a',
        transform: { x: 0, y: 0 },
        outline: { kind: 'rect', w: 40, h: 40 },
      })
    })
    const onSelectionChange = vi.fn()
    const { container } = render(
      <Diagram
        graph={result.current.graph}
        state={result.current.state}
        draggable
        onSelectionChange={onSelectionChange}
      />,
    )
    const nodeA = container.querySelector('[data-node-id="a"]') as HTMLElement
    // Ctrl+click in single mode: does not change selection.
    firePointerEvent(nodeA, 'pointerdown', { button: 0, ctrlKey: true, clientX: 0, clientY: 0 })
    firePointerEvent(nodeA, 'pointerup', { clientX: 0, clientY: 0 })
    expect(onSelectionChange).not.toHaveBeenCalled()
    // Drag still works.
    firePointerEvent(nodeA, 'pointerdown', { button: 0, clientX: 0, clientY: 0 })
    firePointerEvent(nodeA, 'pointermove', { clientX: 17, clientY: 9 })
    firePointerEvent(nodeA, 'pointerup', { clientX: 17, clientY: 9 })
    expect(result.current.graph.getNode('a')!.transform.x).toBe(17)
  })
})

describe('Diagram — hover actions', () => {
  it('renders nothing until the hover delay elapses', () => {
    vi.useFakeTimers()
    try {
      const { graph, state } = simpleScene()
      const { container } = render(
        <Diagram
          graph={graph}
          state={state}
          nodeActions={[{ id: 'edit', label: 'Edit', onClick: () => {} }]}
        />,
      )
      const nodeA = container.querySelector('[data-node-id="a"]') as HTMLElement
      fireEvent.mouseEnter(nodeA)
      expect(container.querySelector('.sg-diagram-hover-actions')).toBeNull()
      act(() => {
        vi.advanceTimersByTime(220)
      })
      const overlay = container.querySelector('.sg-diagram-hover-actions')
      expect(overlay).not.toBeNull()
      expect(overlay!.getAttribute('data-node-id')).toBe('a')
      expect(overlay!.querySelectorAll('[data-action-id="edit"]').length).toBe(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('hidden() filters actions out before render', () => {
    vi.useFakeTimers()
    try {
      const { graph, state } = simpleScene()
      const { container } = render(
        <Diagram
          graph={graph}
          state={state}
          nodeActions={[
            { id: 'edit', label: 'Edit', onClick: () => {} },
            { id: 'remove', label: 'Remove', onClick: () => {}, hidden: () => true },
          ]}
        />,
      )
      const nodeA = container.querySelector('[data-node-id="a"]') as HTMLElement
      fireEvent.mouseEnter(nodeA)
      act(() => {
        vi.advanceTimersByTime(220)
      })
      expect(container.querySelector('[data-action-id="edit"]')).not.toBeNull()
      expect(container.querySelector('[data-action-id="remove"]')).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })
})

// ─── Helpers ──────────────────────────────────────────────────────────────

function simpleScene() {
  const { result } = renderHook(() => useGraph())
  act(() => {
    const a = result.current.graph.addNode({
      id: 'a',
      transform: { x: 0, y: 0 },
      outline: { kind: 'rect', w: 80, h: 40 },
    })
    const b = result.current.graph.addNode({
      id: 'b',
      transform: { x: 200, y: 0 },
      outline: { kind: 'rect', w: 80, h: 40 },
    })
    const c = result.current.graph.addNode({
      id: 'c',
      transform: { x: 200, y: 200 },
      outline: { kind: 'rect', w: 80, h: 40 },
    })
    result.current.graph.addEdge({ from: { node: a, anchor: 'ne' }, to: { node: b, anchor: 'nw' } })
    result.current.graph.addEdge({ from: { node: b, anchor: 'se' }, to: { node: c, anchor: 'nw' } })
  })
  // `result.current` is captured here (after act()) so the returned values are
  // a stable snapshot of the graph engine + reactive state for the test.
  return { graph: result.current.graph, state: result.current.state }
}
