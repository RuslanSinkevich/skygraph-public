import type { Core } from '../../types'
import type {
  TreeKey,
  TreeNodeData,
  TreeFieldNames,
  TreeEngine,
  TreeEngineOptions,
  TreeState,
} from './types'

import { TREE_PREFIX } from '../namespaces'

let treeCounter = 0

interface InternalNode {
  node: TreeNodeData
  key: TreeKey
  depth: number
  parentKey: TreeKey | null
  childKeys: TreeKey[]
  isLeaf: boolean
}

export function createTree(core: Core, options?: TreeEngineOptions): TreeEngine {
  const treeId = `tr${treeCounter++}`
  const fn: Required<TreeFieldNames> = {
    key: options?.fieldNames?.key ?? 'key',
    title: options?.fieldNames?.title ?? 'title',
    children: options?.fieldNames?.children ?? 'children',
  }
  const checkStrictly = options?.checkStrictly ?? false

  let nodes: TreeNodeData[] = []
  let nodeMap = new Map<TreeKey, InternalNode>()

  let expandedKeys = new Set<TreeKey>(options?.defaultExpandedKeys ?? [])
  let checkedKeys = new Set<TreeKey>(options?.defaultCheckedKeys ?? [])
  let halfCheckedKeys = new Set<TreeKey>()
  let selectedKeys = new Set<TreeKey>(options?.defaultSelectedKeys ?? [])
  let loadedKeys = new Set<TreeKey>()
  let loadingKeys = new Set<TreeKey>()
  let filteredKeys: Set<TreeKey> | null = null

  function getKey(node: TreeNodeData): TreeKey {
    return (node as Record<string, unknown>)[fn.key] as TreeKey
  }

  function getChildren(node: TreeNodeData): TreeNodeData[] | undefined {
    return (node as Record<string, unknown>)[fn.children] as TreeNodeData[] | undefined
  }

  function buildMap(data: TreeNodeData[]): void {
    nodeMap = new Map()
    function walk(list: TreeNodeData[], parentKey: TreeKey | null, depth: number) {
      for (const n of list) {
        const k = getKey(n)
        const children = getChildren(n)
        const childKeys: TreeKey[] = []
        const isLeaf = n.isLeaf === true || (!children || children.length === 0)

        if (children && children.length > 0) {
          for (const ch of children) childKeys.push(getKey(ch))
        }

        nodeMap.set(k, { node: n, key: k, depth, parentKey, childKeys, isLeaf })

        if (children && children.length > 0) {
          walk(children, k, depth + 1)
        }
      }
    }
    walk(data, null, 0)
  }

  function getAllDescendantKeys(key: TreeKey): TreeKey[] {
    const result: TreeKey[] = []
    const internal = nodeMap.get(key)
    if (!internal) return result
    for (const ck of internal.childKeys) {
      result.push(ck)
      result.push(...getAllDescendantKeys(ck))
    }
    return result
  }

  function getAllAncestorKeys(key: TreeKey): TreeKey[] {
    const result: TreeKey[] = []
    let current = nodeMap.get(key)
    while (current && current.parentKey !== null) {
      result.push(current.parentKey)
      current = nodeMap.get(current.parentKey)
    }
    return result
  }

  function recomputeHalfChecked(): void {
    if (checkStrictly) {
      halfCheckedKeys = new Set()
      return
    }
    const half = new Set<TreeKey>()
    for (const [key, internal] of nodeMap) {
      if (internal.childKeys.length === 0) continue
      if (checkedKeys.has(key)) continue
      const allDescendants = getAllDescendantKeys(key)
      const someChecked = allDescendants.some((dk) => checkedKeys.has(dk))
      if (someChecked) half.add(key)
    }
    halfCheckedKeys = half
  }

  function cascadeCheck(key: TreeKey, checked: boolean): void {
    if (checkStrictly) {
      if (checked) checkedKeys.add(key)
      else checkedKeys.delete(key)
      return
    }

    const internal = nodeMap.get(key)
    if (!internal) return

    if (checked) {
      checkedKeys.add(key)
      const descendants = getAllDescendantKeys(key)
      for (const dk of descendants) {
        const dn = nodeMap.get(dk)
        if (dn && !dn.node.disabled && !dn.node.disableCheckbox) {
          checkedKeys.add(dk)
        }
      }
    } else {
      checkedKeys.delete(key)
      const descendants = getAllDescendantKeys(key)
      for (const dk of descendants) {
        checkedKeys.delete(dk)
      }
    }

    // Propagate up
    const ancestors = getAllAncestorKeys(key)
    for (const ak of ancestors) {
      const an = nodeMap.get(ak)
      if (!an) continue
      const allChildren = getAllDescendantKeys(ak)
      const enabledChildren = allChildren.filter((ck) => {
        const cn = nodeMap.get(ck)
        return cn && !cn.node.disabled && !cn.node.disableCheckbox
      })
      const allChecked = enabledChildren.length > 0 && enabledChildren.every((ck) => checkedKeys.has(ck))
      if (allChecked) {
        checkedKeys.add(ak)
      } else {
        checkedKeys.delete(ak)
      }
    }

    recomputeHalfChecked()
  }

  function removeFromTree(data: TreeNodeData[], targetKey: TreeKey): { remaining: TreeNodeData[]; removed: TreeNodeData | null } {
    let removed: TreeNodeData | null = null
    const remaining = data.filter((n) => {
      if (getKey(n) === targetKey) {
        removed = n
        return false
      }
      return true
    })
    if (!removed) {
      for (const n of remaining) {
        const children = getChildren(n)
        if (children && children.length > 0) {
          const result = removeFromTree(children, targetKey)
          if (result.removed) {
            ;(n as Record<string, unknown>)[fn.children] = result.remaining
            return { remaining, removed: result.removed }
          }
        }
      }
    }
    return { remaining, removed }
  }

  function insertIntoTree(
    data: TreeNodeData[],
    targetKey: TreeKey,
    node: TreeNodeData,
    position: -1 | 0 | 1,
  ): TreeNodeData[] {
    if (position === 0) {
      return data.map((n) => {
        if (getKey(n) === targetKey) {
          const children = getChildren(n) ?? []
          ;(n as Record<string, unknown>)[fn.children] = [...children, node]
          return n
        }
        const children = getChildren(n)
        if (children && children.length > 0) {
          ;(n as Record<string, unknown>)[fn.children] = insertIntoTree(children, targetKey, node, position)
        }
        return n
      })
    }

    const result: TreeNodeData[] = []
    for (const n of data) {
      if (getKey(n) === targetKey) {
        if (position === -1) {
          result.push(node, n)
        } else {
          result.push(n, node)
        }
      } else {
        const children = getChildren(n)
        if (children && children.length > 0) {
          ;(n as Record<string, unknown>)[fn.children] = insertIntoTree(children, targetKey, node, position)
        }
        result.push(n)
      }
    }
    return result
  }

  function publishState(): void {
    const path = (k: string) => `${TREE_PREFIX}${treeId}.${k}`
    core.batch(() => {
      core.set(path('expandedKeys'), [...expandedKeys])
      core.set(path('checkedKeys'), [...checkedKeys])
      core.set(path('halfCheckedKeys'), [...halfCheckedKeys])
      core.set(path('selectedKeys'), [...selectedKeys])
      core.set(path('loadedKeys'), [...loadedKeys])
      core.set(path('loadingKeys'), [...loadingKeys])
    })
  }

  function initDefaults(): void {
    if (options?.defaultExpandAll) {
      for (const [key, internal] of nodeMap) {
        if (!internal.isLeaf) expandedKeys.add(key)
      }
    }

    if (options?.defaultCheckedKeys && !checkStrictly) {
      for (const key of options.defaultCheckedKeys) {
        cascadeCheck(key, true)
      }
    }

    recomputeHalfChecked()
    publishState()
  }

  const engine: TreeEngine = {
    setData(data: TreeNodeData[]): void {
      nodes = data
      buildMap(data)
      initDefaults()
    },

    getData(): TreeNodeData[] {
      return nodes
    },

    // Expand
    expand(key: TreeKey): void {
      expandedKeys.add(key)
      publishState()
    },

    collapse(key: TreeKey): void {
      expandedKeys.delete(key)
      publishState()
    },

    toggleExpand(key: TreeKey): void {
      if (expandedKeys.has(key)) expandedKeys.delete(key)
      else expandedKeys.add(key)
      publishState()
    },

    setExpandedKeys(keys: TreeKey[]): void {
      expandedKeys = new Set(keys)
      publishState()
    },

    expandAll(): void {
      for (const [key, internal] of nodeMap) {
        if (!internal.isLeaf) expandedKeys.add(key)
      }
      publishState()
    },

    collapseAll(): void {
      expandedKeys = new Set()
      publishState()
    },

    // Check
    check(key: TreeKey): void {
      cascadeCheck(key, true)
      publishState()
    },

    uncheck(key: TreeKey): void {
      cascadeCheck(key, false)
      publishState()
    },

    toggleCheck(key: TreeKey): void {
      const checked = !checkedKeys.has(key)
      cascadeCheck(key, checked)
      publishState()
    },

    setCheckedKeys(keys: TreeKey[]): void {
      checkedKeys = new Set(keys)
      recomputeHalfChecked()
      publishState()
    },

    // Select
    select(key: TreeKey, multiple?: boolean): void {
      if (multiple) {
        if (selectedKeys.has(key)) selectedKeys.delete(key)
        else selectedKeys.add(key)
      } else {
        selectedKeys = new Set([key])
      }
      publishState()
    },

    deselect(key: TreeKey): void {
      selectedKeys.delete(key)
      publishState()
    },

    setSelectedKeys(keys: TreeKey[]): void {
      selectedKeys = new Set(keys)
      publishState()
    },

    // Async loading
    markLoading(key: TreeKey): void {
      loadingKeys.add(key)
      publishState()
    },

    markLoaded(key: TreeKey): void {
      loadingKeys.delete(key)
      loadedKeys.add(key)
      publishState()
    },

    addChildren(parentKey: TreeKey, children: TreeNodeData[]): void {
      const internal = nodeMap.get(parentKey)
      if (!internal) return
      ;(internal.node as Record<string, unknown>)[fn.children] = children
      buildMap(nodes)
      publishState()
    },

    // Drag & drop
    moveNode(dragKey: TreeKey, dropKey: TreeKey, position: -1 | 0 | 1): TreeNodeData[] | null {
      if (dragKey === dropKey) return null
      const ancestors = getAllAncestorKeys(dropKey)
      if (ancestors.includes(dragKey)) return null

      const { remaining, removed } = removeFromTree(nodes, dragKey)
      if (!removed) return null

      nodes = insertIntoTree(remaining, dropKey, removed, position)
      buildMap(nodes)
      publishState()
      return nodes
    },

    // Filter
    filterNodes(predicate: ((node: TreeNodeData) => boolean) | null): void {
      if (!predicate) {
        filteredKeys = null
        return
      }
      const matched = new Set<TreeKey>()
      for (const [key, internal] of nodeMap) {
        if (predicate(internal.node)) {
          matched.add(key)
          const ancestors = getAllAncestorKeys(key)
          for (const ak of ancestors) matched.add(ak)
        }
      }
      filteredKeys = matched
    },

    getFilteredKeys(): TreeKey[] | null {
      return filteredKeys ? [...filteredKeys] : null
    },

    // Query
    getNode(key: TreeKey): TreeNodeData | undefined {
      return nodeMap.get(key)?.node
    },

    getParentKey(key: TreeKey): TreeKey | null {
      return nodeMap.get(key)?.parentKey ?? null
    },

    getChildKeys(key: TreeKey): TreeKey[] {
      return nodeMap.get(key)?.childKeys ?? []
    },

    getAllKeys(): TreeKey[] {
      return [...nodeMap.keys()]
    },

    getLeafKeys(): TreeKey[] {
      const result: TreeKey[] = []
      for (const [key, internal] of nodeMap) {
        if (internal.isLeaf) result.push(key)
      }
      return result
    },

    getState(): TreeState {
      return {
        expandedKeys: [...expandedKeys],
        checkedKeys: [...checkedKeys],
        halfCheckedKeys: [...halfCheckedKeys],
        selectedKeys: [...selectedKeys],
        loadedKeys: [...loadedKeys],
        loadingKeys: [...loadingKeys],
      }
    },

    getFlatNodes() {
      const result: Array<{ node: TreeNodeData; key: TreeKey; depth: number; isLeaf: boolean; parentKey: TreeKey | null }> = []

      function walk(list: TreeNodeData[], parentKey: TreeKey | null, depth: number) {
        for (const n of list) {
          const k = getKey(n)
          if (filteredKeys && !filteredKeys.has(k)) continue

          const children = getChildren(n)
          const isLeaf = n.isLeaf === true || (!children || children.length === 0)

          result.push({ node: n, key: k, depth, isLeaf, parentKey })

          if (!isLeaf && expandedKeys.has(k) && children && children.length > 0) {
            walk(children, k, depth + 1)
          }
        }
      }

      walk(nodes, null, 0)
      return result
    },

    reset(): void {
      nodes = []
      nodeMap = new Map()
      expandedKeys = new Set()
      checkedKeys = new Set()
      halfCheckedKeys = new Set()
      selectedKeys = new Set()
      loadedKeys = new Set()
      loadingKeys = new Set()
      filteredKeys = null
      publishState()
    },
  }

  return engine
}
