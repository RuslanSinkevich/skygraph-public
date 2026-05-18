import type React from 'react'

/** One node in a cascader tree; children define the next column. */
export interface CascaderOption {
  /** Stable value included in the selected path. */
  value: string | number
  /** Display node for the option row. */
  label: React.ReactNode
  /** Nested options for the next level. */
  children?: CascaderOption[]
  /** When `true`, the option cannot be chosen. */
  disabled?: boolean
  /** When `false`, children may load asynchronously (see `loadData`). */
  isLeaf?: boolean
}

/** Props for hierarchical single- or multi-select with search and async children. */
export interface CascaderProps {
  /** Top-level options; each may nest `children`. */
  options: CascaderOption[]
  /** Selected path from root to current value (controlled). */
  value?: (string | number)[]
  /** Initial path when uncontrolled. */
  defaultValue?: (string | number)[]
  /** Fired with the value path and resolved option chain. */
  onChange?: (value: (string | number)[], selectedOptions: CascaderOption[]) => void
  /**
   * Shown when nothing is selected.
   * @default 'Please select'
   */
  placeholder?: string
  /**
   * Shows a clear control when there is a selection.
   * @default false
   */
  allowClear?: boolean
  /**
   * Disables opening and changing the value.
   * @default false
   */
  disabled?: boolean
  /**
   * Visual size of the trigger.
   * @default 'middle'
   */
  size?: 'small' | 'middle' | 'large'
  /**
   * Allows several leaf paths as tags.
   * @default false
   */
  multiple?: boolean
  /**
   * Enables search, or `{ filter }` for custom path matching.
   * @default false
   */
  showSearch?: boolean | { filter?: (inputValue: string, path: CascaderOption[]) => boolean }
  /**
   * Opens the next column on click or hover.
   * @default 'click'
   */
  expandTrigger?: 'click' | 'hover'
  /**
   * Commits selection on non-leaf nodes when `true`.
   * @default false
   */
  changeOnSelect?: boolean
  /** Custom display for the single-select trigger from labels and options. */
  displayRender?: (labels: string[], selectedOptions: CascaderOption[]) => React.ReactNode
  /** Loads children for a node when `isLeaf` is false and children are empty. */
  loadData?: (selectedOptions: CascaderOption[]) => void
  /** Max tags shown in multiple mode before a “+N” summary. */
  maxTagCount?: number
  /** Inline styles for the dropdown panel. */
  dropdownStyle?: React.CSSProperties
  /** Root wrapper class name. */
  className?: string
  /** Root wrapper inline styles. */
  style?: React.CSSProperties
  /** Renders minimal markup without cascader CSS classes. */
  unstyled?: boolean
}
