import type React from 'react'
import type { TreeNodeData, TreeFieldNames, TreeKey } from '@skygraph/core'

/** Re-exports core types used by `TreeSelect`. */
export type { TreeNodeData, TreeFieldNames, TreeKey }

/** Props for the tree-based dropdown selector. */
export interface TreeSelectProps {
  /** Tree nodes to show in the dropdown. */
  treeData: TreeNodeData[]
  /** Controlled selected key(s). */
  value?: TreeKey | TreeKey[]
  /** Initial selected key(s) when uncontrolled. */
  defaultValue?: TreeKey | TreeKey[]
  /** Fires when selection changes; value is single key or array when multiple/checkable. */
  onChange?: (value: TreeKey | TreeKey[], label: React.ReactNode[], extra: { triggerNode: TreeNodeData }) => void
  /** Maps custom field names on tree nodes. */
  fieldNames?: TreeFieldNames
  /** Allows selecting more than one leaf without checkboxes. @default false */
  multiple?: boolean
  /** Uses checkboxes and check propagation like `Tree`. @default false */
  treeCheckable?: boolean
  /** Independent parent/child checks when checkable. @default false */
  treeCheckStrictly?: boolean
  /** Expands all nodes initially in the dropdown tree. @default false */
  treeDefaultExpandAll?: boolean
  /** Initial expanded keys in the dropdown tree. */
  treeDefaultExpandedKeys?: TreeKey[]
  /** Shows search input in the dropdown. @default false */
  showSearch?: boolean
  /** Filters nodes while searching (defaults to title substring). */
  filterTreeNode?: (inputValue: string, treeNode: TreeNodeData) => boolean
  /** Trigger placeholder when nothing selected. @default 'Please select' */
  placeholder?: string
  /** Shows clear control on the trigger. @default false */
  allowClear?: boolean
  /** Disables opening and editing the value. @default false */
  disabled?: boolean
  /** Selector size token. @default 'middle' */
  size?: 'small' | 'middle' | 'large'
  /** Collapses multiple tags to a “+N” rest indicator. */
  maxTagCount?: number
  /** Inline style for the dropdown panel. */
  dropdownStyle?: React.CSSProperties
  /** Enables guide lines on the inner `Tree`. @default false */
  treeLine?: boolean
  /** Which checked keys are surfaced to the trigger when checkable. @default 'SHOW_ALL' */
  showCheckedStrategy?: 'SHOW_ALL' | 'SHOW_PARENT' | 'SHOW_CHILD'
  /** Fires when the search text changes. */
  onSearch?: (value: string) => void
  /** Root wrapper class name. */
  className?: string
  /** Root wrapper style. */
  style?: React.CSSProperties
  /** Renders minimal markup without Skygraph selector styles. */
  unstyled?: boolean
}
