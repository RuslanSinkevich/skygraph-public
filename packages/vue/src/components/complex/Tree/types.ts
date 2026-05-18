import type { TreeKey, TreeNodeData, TreeFieldNames } from '@skygraph/core'

export type { TreeKey, TreeNodeData, TreeFieldNames }

export interface CheckInfo {
  checked: boolean
  node: TreeNodeData
  checkedNodes: TreeNodeData[]
  halfCheckedKeys: TreeKey[]
}

export interface SelectInfo {
  selected: boolean
  node: TreeNodeData
  selectedNodes: TreeNodeData[]
}

export interface ExpandInfo {
  expanded: boolean
  node: TreeNodeData
}

export interface DragInfo {
  event: DragEvent
  node: TreeNodeData
}

export interface DropInfo {
  event: DragEvent
  node: TreeNodeData
  dragNode: TreeNodeData
  dropPosition: -1 | 0 | 1
}

export interface EditInfo {
  key: TreeKey
  node: TreeNodeData
  value: string
  oldValue: string
}

export type TreeNodeStatus = 'default' | 'success' | 'warning' | 'error' | 'info'

export interface TreeNodeAction {
  /** Action identifier (also a Vue list key). */
  key: string
  /** Button icon (string or VNode-compatible render). */
  icon?: string
  /** Tooltip / aria-label text. */
  title?: string
  /** Click handler receiving the node and key. */
  onClick: (node: TreeNodeData, key: TreeKey) => void
  /** Hides the action for nodes where this returns false. */
  visible?: (node: TreeNodeData) => boolean
  /** Disables the action per node (boolean or predicate). */
  disabled?: boolean | ((node: TreeNodeData) => boolean)
  /** Destructive styling. */
  danger?: boolean
}

export interface TreeLocale {
  emptyText?: string
  loadingText?: string
  searchPlaceholder?: string
  expandAllText?: string
  collapseAllText?: string
  checkAllText?: string
  uncheckAllText?: string
}

export const DEFAULT_TREE_LOCALE: Required<TreeLocale> = {
  emptyText: 'No data',
  loadingText: 'Loading...',
  searchPlaceholder: 'Search...',
  expandAllText: 'Expand All',
  collapseAllText: 'Collapse All',
  checkAllText: 'Check All',
  uncheckAllText: 'Uncheck All',
}

export const DEFAULT_INDENT = 24
export const NODE_HEIGHT = 28

export interface TreeProps {
  /** Hierarchical data with keys and optional children. */
  treeData: TreeNodeData[]
  /** Renames `title`, `key`, `children`, and other field accessors. */
  fieldNames?: TreeFieldNames

  /** Shows checkboxes on nodes. @default false */
  checkable?: boolean
  /** When true, parent and child checks are independent. @default false */
  checkStrictly?: boolean
  /** Controlled checked keys. */
  checkedKeys?: TreeKey[]
  /** Initial checked keys in uncontrolled mode. */
  defaultCheckedKeys?: TreeKey[]

  /** Allows clicking titles to select nodes. @default true */
  selectable?: boolean
  /** Allows multiple selected nodes. @default false */
  multiple?: boolean
  /** Controlled selected keys. */
  selectedKeys?: TreeKey[]
  /** Initial selected keys in uncontrolled mode. */
  defaultSelectedKeys?: TreeKey[]

  /** Controlled expanded keys. */
  expandedKeys?: TreeKey[]
  /** Initial expanded keys in uncontrolled mode. */
  defaultExpandedKeys?: TreeKey[]
  /** Expands every parent on first render when uncontrolled. @default false */
  defaultExpandAll?: boolean
  /** Expands ancestors of the focused or matched node when filtering. @default false */
  autoExpandParent?: boolean

  /** Enables drag handles per node or per node predicate. @default false */
  draggable?: boolean | ((node: TreeNodeData) => boolean)
  /** Validates whether a drop is allowed. */
  allowDrop?: (info: {
    dragNode: TreeNodeData
    dropNode: TreeNodeData
    dropPosition: -1 | 0 | 1
  }) => boolean

  /** Loads children asynchronously. */
  loadData?: (node: TreeNodeData) => Promise<void>

  /** Makes the whole row clickable for selection. @default false */
  blockNode?: boolean
  /** Fixed viewport height enabling internal virtual scroll. */
  height?: number
  /** Uses windowed rendering when `height` is set and the list is large. @default true */
  virtual?: boolean
  /** Disables all interactions. @default false */
  disabled?: boolean
  /** Horizontal indent per depth level in pixels. @default 24 */
  indentSize?: number

  /** Directory-style selection expands folders on click. @default false */
  directory?: boolean

  /** Shows the toolbar search field. @default false */
  showSearch?: boolean
  /** Controlled filter text. */
  searchValue?: string
  /** Initial filter text when uncontrolled. @default '' */
  defaultSearchValue?: string
  /** Predicate to include nodes while searching. */
  filterTreeNode?: (node: TreeNodeData, searchValue: string) => boolean
  /** Highlights matched text in titles. @default true */
  highlightSearch?: boolean

  /** Enables built-in keyboard navigation helpers. @default true */
  keyboard?: boolean

  /** Shows toolbar with expand/collapse/check-all controls. @default false */
  showToolbar?: boolean
  /** Enables expand/collapse animations. @default true */
  animated?: boolean

  /** Focuses a node on mount when supported. @default false */
  autoFocus?: boolean

  /** Scrolls the given key into view when it changes. */
  scrollToKey?: TreeKey

  /** Overrides default locale strings. */
  locale?: TreeLocale

  /** Renders semantic tree without Skygraph styles. */
  unstyled?: boolean

  /** Maps a node to a status color variant (paints status dot + left border). */
  nodeStatus?: (node: TreeNodeData) => TreeNodeStatus
  /** Inline action buttons on node rows, rendered on hover. */
  actions?: TreeNodeAction[]
  /** Enables inline title editing per node or predicate. @default false */
  editable?: boolean | ((node: TreeNodeData) => boolean)
  /** Renders guide lines between levels. @default false */
  showLine?: boolean
}
