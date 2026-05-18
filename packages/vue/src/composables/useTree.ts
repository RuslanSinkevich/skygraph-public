import { ref, type Ref } from 'vue'
import { createCore, createTree } from '@skygraph/core'
import type {
  Core,
  TreeEngine,
  TreeEngineOptions,
  TreeKey,
  TreeNodeData,
  TreeState,
} from '@skygraph/core'

export interface UseTreeOptions extends TreeEngineOptions {
  data?: TreeNodeData[]
}

export interface UseTreeReturn {
  core: Core
  tree: TreeEngine
  treeState: Ref<TreeState>
  flatNodes: Ref<ReturnType<TreeEngine['getFlatNodes']>>
  expand: (key: TreeKey) => void
  collapse: (key: TreeKey) => void
  toggleExpand: (key: TreeKey) => void
  setExpandedKeys: (keys: TreeKey[]) => void
  expandAll: () => void
  collapseAll: () => void
  expandToLevel: (level: number) => void
  check: (key: TreeKey) => void
  uncheck: (key: TreeKey) => void
  toggleCheck: (key: TreeKey) => void
  setCheckedKeys: (keys: TreeKey[]) => void
  checkAll: () => void
  uncheckAll: () => void
  select: (key: TreeKey, multiple?: boolean) => void
  deselect: (key: TreeKey) => void
  setSelectedKeys: (keys: TreeKey[]) => void
  markLoading: (key: TreeKey) => void
  markLoaded: (key: TreeKey) => void
  addChildren: (parentKey: TreeKey, children: TreeNodeData[]) => void
  moveNode: (
    dragKey: TreeKey,
    dropKey: TreeKey,
    position: -1 | 0 | 1,
  ) => TreeNodeData[] | null
  filterNodes: (predicate: ((node: TreeNodeData) => boolean) | null) => void
  getNodePath: (key: TreeKey) => TreeKey[]
  refresh: () => void
}

/**
 * Vue 3 composable parallel to React's `useTree`.
 */
export function useTree(options?: UseTreeOptions): UseTreeReturn {
  const core = createCore()
  const tree = createTree(core, options)
  if (options?.data) {
    tree.setData(options.data)
  }

  const treeState = ref(tree.getState()) as Ref<TreeState>
  const flatNodes = ref(tree.getFlatNodes()) as Ref<ReturnType<TreeEngine['getFlatNodes']>>

  const refresh = () => {
    treeState.value = tree.getState()
    flatNodes.value = tree.getFlatNodes()
  }

  const expand = (key: TreeKey) => {
    tree.expand(key)
    refresh()
  }
  const collapse = (key: TreeKey) => {
    tree.collapse(key)
    refresh()
  }
  const toggleExpand = (key: TreeKey) => {
    tree.toggleExpand(key)
    refresh()
  }
  const setExpandedKeys = (keys: TreeKey[]) => {
    tree.setExpandedKeys(keys)
    refresh()
  }
  const expandAll = () => {
    tree.expandAll()
    refresh()
  }
  const collapseAll = () => {
    tree.collapseAll()
    refresh()
  }
  const expandToLevel = (level: number) => {
    tree.expandAll()
    const allFlat = tree.getFlatNodes()
    const keys: TreeKey[] = []
    for (const item of allFlat) {
      if (item.depth < level && !item.isLeaf) keys.push(item.key)
    }
    tree.setExpandedKeys(keys)
    refresh()
  }
  const check = (key: TreeKey) => {
    tree.check(key)
    refresh()
  }
  const uncheck = (key: TreeKey) => {
    tree.uncheck(key)
    refresh()
  }
  const toggleCheck = (key: TreeKey) => {
    tree.toggleCheck(key)
    refresh()
  }
  const setCheckedKeys = (keys: TreeKey[]) => {
    tree.setCheckedKeys(keys)
    refresh()
  }
  const checkAll = () => {
    tree.setCheckedKeys(tree.getAllKeys())
    refresh()
  }
  const uncheckAll = () => {
    tree.setCheckedKeys([])
    refresh()
  }
  const select = (key: TreeKey, multiple?: boolean) => {
    tree.select(key, multiple)
    refresh()
  }
  const deselect = (key: TreeKey) => {
    tree.deselect(key)
    refresh()
  }
  const setSelectedKeys = (keys: TreeKey[]) => {
    tree.setSelectedKeys(keys)
    refresh()
  }
  const markLoading = (key: TreeKey) => {
    tree.markLoading(key)
    refresh()
  }
  const markLoaded = (key: TreeKey) => {
    tree.markLoaded(key)
    refresh()
  }
  const addChildren = (parentKey: TreeKey, children: TreeNodeData[]) => {
    tree.addChildren(parentKey, children)
    refresh()
  }
  const moveNode = (
    dragKey: TreeKey,
    dropKey: TreeKey,
    position: -1 | 0 | 1,
  ): TreeNodeData[] | null => {
    const result = tree.moveNode(dragKey, dropKey, position)
    refresh()
    return result
  }
  const filterNodes = (predicate: ((node: TreeNodeData) => boolean) | null) => {
    tree.filterNodes(predicate)
    refresh()
  }
  const getNodePath = (key: TreeKey): TreeKey[] => {
    const path: TreeKey[] = []
    let current: TreeKey | null = key
    while (current !== null) {
      path.unshift(current)
      current = tree.getParentKey(current)
    }
    return path
  }

  return {
    core,
    tree,
    treeState,
    flatNodes,
    expand,
    collapse,
    toggleExpand,
    setExpandedKeys,
    expandAll,
    collapseAll,
    expandToLevel,
    check,
    uncheck,
    toggleCheck,
    setCheckedKeys,
    checkAll,
    uncheckAll,
    select,
    deselect,
    setSelectedKeys,
    markLoading,
    markLoaded,
    addChildren,
    moveNode,
    filterNodes,
    getNodePath,
    refresh,
  }
}
