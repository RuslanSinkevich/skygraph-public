export type TreeKey = string | number

export interface TreeNodeData {
  key: TreeKey
  title?: string
  children?: TreeNodeData[]
  isLeaf?: boolean
  disabled?: boolean
  disableCheckbox?: boolean
  selectable?: boolean
  checkable?: boolean
  [field: string]: unknown
}

export interface TreeFieldNames {
  key?: string
  title?: string
  children?: string
}

export interface TreeState {
  expandedKeys: TreeKey[]
  checkedKeys: TreeKey[]
  halfCheckedKeys: TreeKey[]
  selectedKeys: TreeKey[]
  loadedKeys: TreeKey[]
  loadingKeys: TreeKey[]
}

export interface TreeEngineOptions {
  fieldNames?: TreeFieldNames
  checkStrictly?: boolean
  defaultExpandAll?: boolean
  defaultExpandedKeys?: TreeKey[]
  defaultCheckedKeys?: TreeKey[]
  defaultSelectedKeys?: TreeKey[]
}

export interface TreeEngine {
  setData(nodes: TreeNodeData[]): void
  getData(): TreeNodeData[]

  // Expand
  expand(key: TreeKey): void
  collapse(key: TreeKey): void
  toggleExpand(key: TreeKey): void
  setExpandedKeys(keys: TreeKey[]): void
  expandAll(): void
  collapseAll(): void

  // Check
  check(key: TreeKey): void
  uncheck(key: TreeKey): void
  toggleCheck(key: TreeKey): void
  setCheckedKeys(keys: TreeKey[]): void

  // Select
  select(key: TreeKey, multiple?: boolean): void
  deselect(key: TreeKey): void
  setSelectedKeys(keys: TreeKey[]): void

  // Async loading
  markLoading(key: TreeKey): void
  markLoaded(key: TreeKey): void
  addChildren(parentKey: TreeKey, children: TreeNodeData[]): void

  // Drag & drop
  moveNode(dragKey: TreeKey, dropKey: TreeKey, position: -1 | 0 | 1): TreeNodeData[] | null

  // Search / filter
  filterNodes(predicate: ((node: TreeNodeData) => boolean) | null): void
  getFilteredKeys(): TreeKey[] | null

  // Query
  getNode(key: TreeKey): TreeNodeData | undefined
  getParentKey(key: TreeKey): TreeKey | null
  getChildKeys(key: TreeKey): TreeKey[]
  getAllKeys(): TreeKey[]
  getLeafKeys(): TreeKey[]
  getState(): TreeState

  // Flat list for rendering (respects expand state + filter)
  getFlatNodes(): Array<{ node: TreeNodeData; key: TreeKey; depth: number; isLeaf: boolean; parentKey: TreeKey | null }>

  reset(): void
}
