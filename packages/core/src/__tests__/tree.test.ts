import { describe, it, expect } from 'vitest'
import { createCore } from '../Core'
import { createTree } from '../engines/tree/TreeEngine'

const sampleTree = () => [
  {
    key: '1', title: 'Root 1', children: [
      { key: '1-1', title: 'Child 1-1', children: [
        { key: '1-1-1', title: 'Leaf 1-1-1' },
        { key: '1-1-2', title: 'Leaf 1-1-2' },
      ]},
      { key: '1-2', title: 'Child 1-2' },
    ],
  },
  { key: '2', title: 'Root 2', children: [
    { key: '2-1', title: 'Child 2-1' },
  ]},
  { key: '3', title: 'Leaf Root 3' },
]

function setup(options?: Parameters<typeof createTree>[1]) {
  const core = createCore()
  const tree = createTree(core, options)
  tree.setData(sampleTree())
  return { core, tree }
}

// ---------------------------------------------------------------------------
// 1. Basic queries
// ---------------------------------------------------------------------------
describe('TreeEngine: basic queries', () => {
  it('setData / getData round-trip', () => {
    const { tree } = setup()
    expect(tree.getData()).toHaveLength(3)
    expect(tree.getData()[0].key).toBe('1')
  })

  it('getNode returns node by key', () => {
    const { tree } = setup()
    expect(tree.getNode('1-1-1')?.title).toBe('Leaf 1-1-1')
    expect(tree.getNode('nonexistent')).toBeUndefined()
  })

  it('getParentKey', () => {
    const { tree } = setup()
    expect(tree.getParentKey('1-1-1')).toBe('1-1')
    expect(tree.getParentKey('1')).toBeNull()
  })

  it('getChildKeys', () => {
    const { tree } = setup()
    expect(tree.getChildKeys('1')).toEqual(['1-1', '1-2'])
    expect(tree.getChildKeys('1-1-1')).toEqual([])
  })

  it('getAllKeys returns every key', () => {
    const { tree } = setup()
    expect(tree.getAllKeys().sort()).toEqual(
      ['1', '1-1', '1-1-1', '1-1-2', '1-2', '2', '2-1', '3'].sort(),
    )
  })

  it('getLeafKeys returns only leaves', () => {
    const { tree } = setup()
    expect(tree.getLeafKeys().sort()).toEqual(
      ['1-1-1', '1-1-2', '1-2', '2-1', '3'].sort(),
    )
  })
})

// ---------------------------------------------------------------------------
// 2. Expand / collapse
// ---------------------------------------------------------------------------
describe('TreeEngine: expand / collapse', () => {
  it('expand and collapse a node', () => {
    const { tree } = setup()
    tree.expand('1')
    expect(tree.getState().expandedKeys).toContain('1')
    tree.collapse('1')
    expect(tree.getState().expandedKeys).not.toContain('1')
  })

  it('toggleExpand flips state', () => {
    const { tree } = setup()
    tree.toggleExpand('1')
    expect(tree.getState().expandedKeys).toContain('1')
    tree.toggleExpand('1')
    expect(tree.getState().expandedKeys).not.toContain('1')
  })

  it('expandAll expands non-leaf nodes only', () => {
    const { tree } = setup()
    tree.expandAll()
    const expanded = tree.getState().expandedKeys
    expect(expanded).toContain('1')
    expect(expanded).toContain('1-1')
    expect(expanded).toContain('2')
    expect(expanded).not.toContain('3')
    expect(expanded).not.toContain('1-1-1')
  })

  it('collapseAll clears expanded keys', () => {
    const { tree } = setup()
    tree.expandAll()
    tree.collapseAll()
    expect(tree.getState().expandedKeys).toEqual([])
  })

  it('setExpandedKeys replaces set', () => {
    const { tree } = setup()
    tree.setExpandedKeys(['2'])
    expect(tree.getState().expandedKeys).toEqual(['2'])
  })

  it('defaultExpandAll option', () => {
    const { tree } = setup({ defaultExpandAll: true })
    const expanded = tree.getState().expandedKeys
    expect(expanded).toContain('1')
    expect(expanded).toContain('1-1')
    expect(expanded).toContain('2')
  })
})

// ---------------------------------------------------------------------------
// 3. Check — cascade mode (default)
// ---------------------------------------------------------------------------
describe('TreeEngine: check (cascade)', () => {
  it('checking parent checks all descendants', () => {
    const { tree } = setup()
    tree.check('1')
    const s = tree.getState()
    expect(s.checkedKeys).toContain('1')
    expect(s.checkedKeys).toContain('1-1')
    expect(s.checkedKeys).toContain('1-1-1')
    expect(s.checkedKeys).toContain('1-1-2')
    expect(s.checkedKeys).toContain('1-2')
  })

  it('unchecking parent unchecks descendants', () => {
    const { tree } = setup()
    tree.check('1')
    tree.uncheck('1')
    const s = tree.getState()
    expect(s.checkedKeys).toEqual([])
  })

  it('checking all children auto-checks parent', () => {
    const { tree } = setup()
    tree.check('1-1-1')
    tree.check('1-1-2')
    const s = tree.getState()
    expect(s.checkedKeys).toContain('1-1')
  })

  it('checking all children + siblings cascades to root', () => {
    const { tree } = setup()
    tree.check('1-1-1')
    tree.check('1-1-2')
    tree.check('1-2')
    const s = tree.getState()
    expect(s.checkedKeys).toContain('1-1')
    expect(s.checkedKeys).toContain('1')
  })

  it('halfCheckedKeys computed correctly', () => {
    const { tree } = setup()
    tree.check('1-1-1')
    const s = tree.getState()
    expect(s.halfCheckedKeys).toContain('1-1')
    expect(s.halfCheckedKeys).toContain('1')
    expect(s.halfCheckedKeys).not.toContain('1-1-1')
  })

  it('toggleCheck flips and cascades', () => {
    const { tree } = setup()
    tree.toggleCheck('1')
    expect(tree.getState().checkedKeys).toContain('1-2')
    tree.toggleCheck('1')
    expect(tree.getState().checkedKeys).toEqual([])
  })

  it('disabled nodes skipped during cascade', () => {
    const core = createCore()
    const tree = createTree(core)
    tree.setData([
      { key: 'p', title: 'Parent', children: [
        { key: 'c1', title: 'Child 1' },
        { key: 'c2', title: 'Child 2', disabled: true },
      ]},
    ])
    tree.check('p')
    const s = tree.getState()
    expect(s.checkedKeys).toContain('c1')
    expect(s.checkedKeys).not.toContain('c2')
  })

  it('disableCheckbox nodes skipped during cascade', () => {
    const core = createCore()
    const tree = createTree(core)
    tree.setData([
      { key: 'p', title: 'Parent', children: [
        { key: 'c1', title: 'Child 1' },
        { key: 'c2', title: 'Child 2', disableCheckbox: true },
      ]},
    ])
    tree.check('p')
    expect(tree.getState().checkedKeys).not.toContain('c2')
  })

  it('setCheckedKeys replaces and recomputes half-checked', () => {
    const { tree } = setup()
    tree.setCheckedKeys(['1-1-1'])
    const s = tree.getState()
    expect(s.checkedKeys).toEqual(['1-1-1'])
    expect(s.halfCheckedKeys).toContain('1-1')
    expect(s.halfCheckedKeys).toContain('1')
  })
})

// ---------------------------------------------------------------------------
// 4. Check — strict mode
// ---------------------------------------------------------------------------
describe('TreeEngine: check (strict)', () => {
  it('check does not cascade', () => {
    const { tree } = setup({ checkStrictly: true })
    tree.check('1')
    const s = tree.getState()
    expect(s.checkedKeys).toEqual(['1'])
    expect(s.halfCheckedKeys).toEqual([])
  })

  it('uncheck in strict mode only removes the key', () => {
    const { tree } = setup({ checkStrictly: true })
    tree.check('1')
    tree.check('1-1')
    tree.uncheck('1')
    expect(tree.getState().checkedKeys).toEqual(['1-1'])
  })
})

// ---------------------------------------------------------------------------
// 5. Selection
// ---------------------------------------------------------------------------
describe('TreeEngine: selection', () => {
  it('single select replaces previous', () => {
    const { tree } = setup()
    tree.select('1')
    tree.select('2')
    expect(tree.getState().selectedKeys).toEqual(['2'])
  })

  it('multiple select toggles membership', () => {
    const { tree } = setup()
    tree.select('1', true)
    tree.select('2', true)
    expect(tree.getState().selectedKeys.sort()).toEqual(['1', '2'])
    tree.select('1', true)
    expect(tree.getState().selectedKeys).toEqual(['2'])
  })

  it('deselect removes from set', () => {
    const { tree } = setup()
    tree.select('1')
    tree.deselect('1')
    expect(tree.getState().selectedKeys).toEqual([])
  })

  it('setSelectedKeys replaces', () => {
    const { tree } = setup()
    tree.setSelectedKeys(['1', '3'])
    expect(tree.getState().selectedKeys.sort()).toEqual(['1', '3'])
  })
})

// ---------------------------------------------------------------------------
// 6. Drag & drop (moveNode)
// ---------------------------------------------------------------------------
describe('TreeEngine: drag & drop', () => {
  it('moveNode position 1 — insert after sibling', () => {
    const { tree } = setup()
    const result = tree.moveNode('3', '1', 1)
    expect(result).not.toBeNull()
    const topKeys = result!.map((n) => n.key)
    expect(topKeys).toEqual(['1', '3', '2'])
  })

  it('moveNode position -1 — insert before sibling', () => {
    const { tree } = setup()
    const result = tree.moveNode('3', '1', -1)
    expect(result).not.toBeNull()
    const topKeys = result!.map((n) => n.key)
    expect(topKeys).toEqual(['3', '1', '2'])
  })

  it('moveNode position 0 — insert as child', () => {
    const { tree } = setup()
    const result = tree.moveNode('3', '2', 0)
    expect(result).not.toBeNull()
    const children = result!.find((n) => n.key === '2')?.children
    expect(children?.map((c) => c.key)).toContain('3')
  })

  it('prevents drop onto self', () => {
    const { tree } = setup()
    expect(tree.moveNode('1', '1', 0)).toBeNull()
  })

  it('prevents drop onto own descendant', () => {
    const { tree } = setup()
    expect(tree.moveNode('1', '1-1-1', 0)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// 7. Filter
// ---------------------------------------------------------------------------
describe('TreeEngine: filter', () => {
  it('filterNodes returns matched keys and their ancestors', () => {
    const { tree } = setup()
    tree.filterNodes((n) => n.title === 'Leaf 1-1-1')
    const filtered = tree.getFilteredKeys()!
    expect(filtered).toContain('1-1-1')
    expect(filtered).toContain('1-1')
    expect(filtered).toContain('1')
    expect(filtered).not.toContain('2')
    expect(filtered).not.toContain('3')
  })

  it('clearing filter with null returns null from getFilteredKeys', () => {
    const { tree } = setup()
    tree.filterNodes((n) => n.title === 'Leaf 1-1-1')
    tree.filterNodes(null)
    expect(tree.getFilteredKeys()).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// 8. Async loading
// ---------------------------------------------------------------------------
describe('TreeEngine: async loading', () => {
  it('markLoading / markLoaded flow', () => {
    const { tree } = setup()
    tree.markLoading('1-2')
    expect(tree.getState().loadingKeys).toContain('1-2')
    tree.markLoaded('1-2')
    expect(tree.getState().loadingKeys).not.toContain('1-2')
    expect(tree.getState().loadedKeys).toContain('1-2')
  })

  it('addChildren attaches children and rebuilds map', () => {
    const { tree } = setup()
    tree.addChildren('1-2', [
      { key: '1-2-1', title: 'Dynamic 1' },
      { key: '1-2-2', title: 'Dynamic 2' },
    ])
    expect(tree.getChildKeys('1-2')).toEqual(['1-2-1', '1-2-2'])
    expect(tree.getNode('1-2-1')?.title).toBe('Dynamic 1')
    expect(tree.getParentKey('1-2-1')).toBe('1-2')
  })
})

// ---------------------------------------------------------------------------
// 9. getFlatNodes
// ---------------------------------------------------------------------------
describe('TreeEngine: getFlatNodes', () => {
  it('only includes children of expanded nodes', () => {
    const { tree } = setup()
    const flat0 = tree.getFlatNodes()
    expect(flat0.map((f) => f.key)).toEqual(['1', '2', '3'])

    tree.expand('1')
    const flat1 = tree.getFlatNodes()
    expect(flat1.map((f) => f.key)).toEqual(['1', '1-1', '1-2', '2', '3'])
  })

  it('respects active filter', () => {
    const { tree } = setup()
    tree.expandAll()
    tree.filterNodes((n) => n.title === 'Leaf 1-1-1')
    const flat = tree.getFlatNodes()
    const keys = flat.map((f) => f.key)
    expect(keys).toContain('1-1-1')
    expect(keys).not.toContain('2')
    expect(keys).not.toContain('3')
  })

  it('nodes carry correct depth and parentKey', () => {
    const { tree } = setup()
    tree.expandAll()
    const leaf = tree.getFlatNodes().find((f) => f.key === '1-1-1')!
    expect(leaf.depth).toBe(2)
    expect(leaf.parentKey).toBe('1-1')
    expect(leaf.isLeaf).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 10. Reset
// ---------------------------------------------------------------------------
describe('TreeEngine: reset', () => {
  it('clears all state', () => {
    const { tree } = setup()
    tree.expandAll()
    tree.check('1')
    tree.select('2')
    tree.markLoading('3')
    tree.reset()

    const s = tree.getState()
    expect(s.expandedKeys).toEqual([])
    expect(s.checkedKeys).toEqual([])
    expect(s.halfCheckedKeys).toEqual([])
    expect(s.selectedKeys).toEqual([])
    expect(s.loadingKeys).toEqual([])
    expect(s.loadedKeys).toEqual([])
    expect(tree.getData()).toEqual([])
    expect(tree.getAllKeys()).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// 11. State published to core
// ---------------------------------------------------------------------------
describe('TreeEngine: core state publishing', () => {
  function findTreeId(core: ReturnType<typeof createCore>): string {
    for (let i = 0; i < 500; i++) {
      if (core.get(`$tree.tr${i}.expandedKeys`) !== undefined) return `tr${i}`
    }
    throw new Error('tree id not found in core')
  }

  it('expandedKeys published on expand', () => {
    const { core, tree } = setup()
    const id = findTreeId(core)
    tree.expand('1')
    const published = core.get(`$tree.${id}.expandedKeys`) as string[]
    expect(published).toContain('1')
  })

  it('subscribe receives updates on mutations', () => {
    const core = createCore()
    const tree = createTree(core)
    tree.setData(sampleTree())
    const id = findTreeId(core)

    const captured: unknown[] = []
    core.subscribe(`$tree.${id}.selectedKeys`, (v) => captured.push(v))

    tree.select('1')
    tree.select('2')

    expect(captured.length).toBeGreaterThanOrEqual(2)
    expect(captured[captured.length - 1]).toEqual(['2'])
  })
})

// ---------------------------------------------------------------------------
// 12. Default options
// ---------------------------------------------------------------------------
describe('TreeEngine: default options', () => {
  it('defaultExpandedKeys pre-expands', () => {
    const { tree } = setup({ defaultExpandedKeys: ['1', '2'] })
    const s = tree.getState()
    expect(s.expandedKeys).toContain('1')
    expect(s.expandedKeys).toContain('2')
  })

  it('defaultSelectedKeys pre-selects', () => {
    const { tree } = setup({ defaultSelectedKeys: ['3'] })
    expect(tree.getState().selectedKeys).toEqual(['3'])
  })

  it('defaultCheckedKeys cascades in non-strict mode', () => {
    const { tree } = setup({ defaultCheckedKeys: ['1'] })
    const s = tree.getState()
    expect(s.checkedKeys).toContain('1-1-1')
    expect(s.checkedKeys).toContain('1-2')
  })
})
