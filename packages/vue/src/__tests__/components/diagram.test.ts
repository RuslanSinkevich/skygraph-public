import { describe, it, expect, beforeAll } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import SgDiagram from '../../components/complex/Diagram/Diagram.vue'
import { createCore, createGraph } from '@skygraph/core'

beforeAll(() => {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    class FakeResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    ;(globalThis as unknown as { ResizeObserver: typeof FakeResizeObserver }).ResizeObserver =
      FakeResizeObserver
  }
})

function setupGraph() {
  const core = createCore()
  const graph = createGraph(core)
  graph.addNode({
    id: 'a',
    transform: { x: 0, y: 0 },
    outline: { kind: 'rect', w: 80, h: 40 },
  })
  graph.addNode({
    id: 'b',
    transform: { x: 200, y: 100 },
    outline: { kind: 'rect', w: 80, h: 40 },
  })
  graph.addEdge({ id: 'e', from: { node: 'a', anchor: 'nw' }, to: { node: 'b', anchor: 'nw' } })
  return { graph, core }
}

describe('SgDiagram', () => {
  it('renders one DOM wrapper per graph node', async () => {
    const { graph } = setupGraph()
    const w = mount(SgDiagram, {
      props: { graph, state: graph.getState() },
      attachTo: document.body,
    })
    await nextTick()
    expect(w.findAll('[data-node-id]').length).toBe(2)
    w.unmount()
  })

  it('positions node wrappers using node transform', async () => {
    const { graph } = setupGraph()
    const w = mount(SgDiagram, {
      props: { graph, state: graph.getState() },
      attachTo: document.body,
    })
    await nextTick()
    const nodeB = w.find('[data-node-id="b"]')
    const style = nodeB.attributes('style') ?? ''
    expect(style).toContain('left: 200px')
    expect(style).toContain('top: 100px')
    w.unmount()
  })

  it('renders one SVG path per edge', async () => {
    const { graph } = setupGraph()
    const w = mount(SgDiagram, {
      props: { graph, state: graph.getState() },
      attachTo: document.body,
    })
    await nextTick()
    expect(w.findAll('path[data-edge-id]').length).toBe(1)
    w.unmount()
  })

  it('selects a node on click', async () => {
    const { graph } = setupGraph()
    const w = mount(SgDiagram, {
      props: { graph, state: graph.getState() },
      attachTo: document.body,
    })
    await nextTick()
    await w.find('[data-node-id="a"]').trigger('click')
    expect(w.emitted('selection-change')).toBeTruthy()
    expect(w.emitted('selection-change')![0][0]).toEqual(['a'])
    w.unmount()
  })

  it('clears selection on canvas click', async () => {
    const { graph } = setupGraph()
    const w = mount(SgDiagram, {
      props: { graph, state: graph.getState() },
      attachTo: document.body,
    })
    await nextTick()
    await w.find('[data-node-id="a"]').trigger('click')
    await w.find('.sg-diagram-canvas').trigger('click')
    const all = w.emitted('selection-change') as unknown[][]
    expect(all[all.length - 1][0]).toEqual([])
    w.unmount()
  })

  it('exposes the imperative print method (parity with React DiagramRef)', async () => {
    const { graph } = setupGraph()
    const w = mount(SgDiagram, {
      props: { graph, state: graph.getState() },
      attachTo: document.body,
    })
    await nextTick()
    const cmp = w.vm as unknown as { print: (opts?: { fileName?: string }) => void }
    expect(typeof cmp.print).toBe('function')
    // Prior `setSelectedIds`/`getSelectedIds` Vue-only methods were removed
    // for parity (T-Vue-Misc D1) — selection is now managed exclusively
    // through `selectedNodeIds` prop + `selection-change` emit.
    expect((w.vm as unknown as Record<string, unknown>).getSelectedIds).toBeUndefined()
    expect((w.vm as unknown as Record<string, unknown>).setSelectedIds).toBeUndefined()
    w.unmount()
  })

  it('emits node-click with node payload', async () => {
    const { graph } = setupGraph()
    const w = mount(SgDiagram, {
      props: { graph, state: graph.getState() },
      attachTo: document.body,
    })
    await nextTick()
    await w.find('[data-node-id="b"]').trigger('click')
    const evt = w.emitted('node-click')![0][0] as { id: string }
    expect(evt.id).toBe('b')
    w.unmount()
  })
})
