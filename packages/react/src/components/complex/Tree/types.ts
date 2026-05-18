import type React from 'react'
import type { TreeKey, TreeNodeData, TreeFieldNames } from '@skygraph/core'

/** Re-exports core tree data types. */
export type { TreeKey, TreeNodeData, TreeFieldNames }

/** Payload for `onCheck` describing the toggle and affected nodes. */
export interface CheckInfo {
  /** Whether the toggled node ended checked. */
  checked: boolean
  /** Node whose checkbox was toggled. */
  node: TreeNodeData
  /** All fully checked nodes after the update. */
  checkedNodes: TreeNodeData[]
  /** Keys in indeterminate half-checked state. */
  halfCheckedKeys: TreeKey[]
}

/** Payload for `onSelect` after a selection change. */
export interface SelectInfo {
  /** Whether the node ended selected. */
  selected: boolean
  /** Node that was clicked for selection. */
  node: TreeNodeData
  /** All selected nodes after the update. */
  selectedNodes: TreeNodeData[]
}

/** Payload for `onExpand` after an expand/collapse. */
export interface ExpandInfo {
  /** Whether the node ended expanded. */
  expanded: boolean
  /** Node whose expander was toggled. */
  node: TreeNodeData
}

/** Drag lifecycle event payload with DOM event and node. */
export interface DragInfo {
  /** Browser drag event. */
  event: React.DragEvent
  /** Associated tree node. */
  node: TreeNodeData
}

/** Drop completion payload including dragged node and position. */
export interface DropInfo {
  /** Browser drop event. */
  event: React.DragEvent
  /** Drop target node. */
  node: TreeNodeData
  /** Node that was dragged. */
  dragNode: TreeNodeData
  /** Insert position relative to the target. */
  dropPosition: -1 | 0 | 1
}

/** Payload when an inline edit is committed (if editing is used). */
export interface EditInfo {
  /** Edited node key. */
  key: TreeKey
  /** Edited node. */
  node: TreeNodeData
  /** New title text. */
  value: string
  /** Previous title text. */
  oldValue: string
}

/** Visual status hint for a node row. */
export type TreeNodeStatus = 'default' | 'success' | 'warning' | 'error' | 'info'

/** Declarative action button on a tree node row. */
export interface TreeNodeAction {
  /** Action identifier. */
  key: string
  /** Button icon. */
  icon?: React.ReactNode
  /** Tooltip or aria label text. */
  title?: string
  /** Click handler receiving node and key. */
  onClick: (node: TreeNodeData, key: TreeKey) => void
  /** Hides the action for nodes where this returns false. */
  visible?: (node: TreeNodeData) => boolean
  /** Disables the action per node. */
  disabled?: (node: TreeNodeData) => boolean
  /** Destructive styling. */
  danger?: boolean
}

/** Localizable strings for built-in tree UI. */
export interface TreeLocale {
  /** Empty tree placeholder. */
  emptyText?: React.ReactNode
  /** Async loading label. */
  loadingText?: string
  /** Search field placeholder. */
  searchPlaceholder?: string
  /** Toolbar control to expand all nodes. */
  expandAllText?: string
  /** Toolbar control to collapse all nodes. */
  collapseAllText?: string
  /** Toolbar control to check all checkboxes. */
  checkAllText?: string
  /** Toolbar control to clear all checks. */
  uncheckAllText?: string
  /** Accessible label for the clear-search (×) button. */
  clearSearch?: string
}

/** Default English strings for `Tree`. */
export const DEFAULT_TREE_LOCALE: Required<TreeLocale> = {
  emptyText: 'No data',
  loadingText: 'Loading...',
  searchPlaceholder: 'Search...',
  expandAllText: 'Expand All',
  collapseAllText: 'Collapse All',
  checkAllText: 'Check All',
  uncheckAllText: 'Uncheck All',
  clearSearch: 'Clear search',
}

/** Default indent between tree levels in pixels. */
export const DEFAULT_INDENT = 24
/** Default node row height used for virtual scroll estimates. */
export const NODE_HEIGHT = 28

/** Props for the `Tree` component. */
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
  /** Fires after check state changes. */
  onCheck?: (checkedKeys: TreeKey[], info: CheckInfo) => void

  /** Allows clicking titles to select nodes. @default true */
  selectable?: boolean
  /** Allows multiple selected nodes. @default false */
  multiple?: boolean
  /** Controlled selected keys. */
  selectedKeys?: TreeKey[]
  /** Initial selected keys in uncontrolled mode. */
  defaultSelectedKeys?: TreeKey[]
  /** Fires after selection changes. */
  onSelect?: (selectedKeys: TreeKey[], info: SelectInfo) => void

  /** Controlled expanded keys. */
  expandedKeys?: TreeKey[]
  /** Initial expanded keys in uncontrolled mode. */
  defaultExpandedKeys?: TreeKey[]
  /** Expands every parent on first render when uncontrolled. @default false */
  defaultExpandAll?: boolean
  /** Expands ancestors of the focused or matched node when filtering. @default false */
  autoExpandParent?: boolean
  /** Fires after expand/collapse. */
  onExpand?: (expandedKeys: TreeKey[], info: ExpandInfo) => void

  /** Enables drag handles per node or per node predicate. @default false */
  draggable?: boolean | ((node: TreeNodeData) => boolean)
  /** Validates whether a drop is allowed. */
  allowDrop?: (info: {
    dragNode: TreeNodeData
    dropNode: TreeNodeData
    dropPosition: -1 | 0 | 1
  }) => boolean
  /** Drag start callback. */
  onDragStart?: (info: DragInfo) => void
  /** Drag enter callback. */
  onDragEnter?: (info: DragInfo) => void
  /** Drag over callback. */
  onDragOver?: (info: DragInfo) => void
  /** Drag leave callback. */
  onDragLeave?: (info: DragInfo) => void
  /** Drag end callback. */
  onDragEnd?: (info: DragInfo) => void
  /** Drop callback after a successful internal move. */
  onDrop?: (info: DropInfo) => void

  /** Loads children asynchronously; return promise resolves when data is ready. */
  loadData?: (node: TreeNodeData) => Promise<void>
  /** Keys whose children have finished loading. */
  loadedKeys?: TreeKey[]

  /** Renders guide lines between levels or configures leaf icons. @default false */
  showLine?: boolean | { showLeafIcon?: boolean | React.ReactNode }
  /** Shows a leading icon column. @default false */
  showIcon?: boolean
  /** Default node icon render or element. */
  icon?: React.ReactNode | ((props: { expanded: boolean; selected: boolean }) => React.ReactNode)
  /** Custom expand/collapse control. */
  switcherIcon?:
    | React.ReactNode
    | ((props: { expanded: boolean; loading: boolean; isLeaf: boolean }) => React.ReactNode)
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

  /** Context menu handler on node rows. */
  onRightClick?: (info: { event: React.MouseEvent; node: TreeNodeData }) => void

  /** Shows the toolbar search field. @default false */
  showSearch?: boolean
  /** Controlled filter text. */
  searchValue?: string
  /** Initial filter text when uncontrolled. @default '' */
  defaultSearchValue?: string
  /** Emits filter text changes. */
  onSearch?: (value: string) => void
  /** Predicate to include nodes while searching. */
  filterTreeNode?: (node: TreeNodeData, searchValue: string) => boolean
  /** Highlights matched text in titles. @default true */
  highlightSearch?: boolean

  /** Enables built-in keyboard navigation helpers. @default true */
  keyboard?: boolean

  /** Enables inline editing of titles per node or predicate. @default false */
  editable?: boolean | ((node: TreeNodeData) => boolean)
  /** Commit handler for inline edits. */
  onEdit?: (info: EditInfo) => void
  /** Cancel handler for inline edits. */
  onEditCancel?: (key: TreeKey) => void

  /** Custom title area render. */
  titleRender?: (
    node: TreeNodeData,
    info: { expanded: boolean; selected: boolean; checked: boolean; halfChecked: boolean },
  ) => React.ReactNode

  /** Inline action buttons on node rows. */
  actions?: TreeNodeAction[]

  /** Shows toolbar with expand/collapse/check-all controls. @default false */
  showToolbar?: boolean
  /** Extra toolbar nodes after built-ins. */
  toolbarExtra?: React.ReactNode

  /** Enables expand/collapse animations. @default true */
  animated?: boolean

  /** Focuses a node on mount when supported. @default false */
  autoFocus?: boolean
  /** Controlled focused node key. */
  focusedKey?: TreeKey
  /** Fires when focus moves to a node. */
  onFocus?: (key: TreeKey) => void

  /** Scrolls the given key into view when it changes. */
  scrollToKey?: TreeKey

  /** Maps a node to a status color variant. */
  nodeStatus?: (node: TreeNodeData) => TreeNodeStatus

  /** Overrides default locale strings. */
  locale?: TreeLocale

  /** Root wrapper class name. */
  className?: string
  /** Root wrapper style. */
  style?: React.CSSProperties
  /** Renders semantic tree without Skygraph styles. */
  unstyled?: boolean
}
