import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Checkbox } from '../../ui/Checkbox'
import { Spin } from '../../ui/Spin'
import type { TreeKey, TreeNodeData, TreeLocale, TreeNodeAction, TreeNodeStatus } from './types'

/** Internal props for a single rendered tree node row. */
interface TreeNodeRowProps {
  /** Node data. */
  node: TreeNodeData
  /** Node key. */
  nodeKey: TreeKey
  /** Nesting depth for layout. */
  depth: number
  /** Whether this node is a leaf in the flattened list. */
  isLeaf: boolean
  /** Indentation step in pixels. */
  indentSize: number

  /** Expanded state. */
  expanded: boolean
  /** Checked state. */
  checked: boolean
  /** Indeterminate checkbox state. */
  halfChecked: boolean
  /** Selected state. */
  selected: boolean
  /** Async children loading flag. */
  loading: boolean
  /** Row interaction disabled. */
  disabled: boolean
  /** Whether this row has keyboard focus. */
  focused: boolean

  /** Checkbox column visible. */
  checkable: boolean
  /** Title click selects the node. */
  selectable: boolean
  /** Vertical guide lines enabled. */
  showLine: boolean
  /** Custom leaf connector when `showLine` is on. */
  showLeafIcon: boolean | React.ReactNode
  /** Leading custom or folder icon. */
  showIcon: boolean
  /** Full row hit target for selection. */
  blockNode: boolean
  /** Directory-style expand-on-select for folders. */
  directory: boolean
  /** Animate expand/collapse affordance. */
  animated: boolean

  /** Tree-level default icon. */
  globalIcon?: React.ReactNode | ((props: { expanded: boolean; selected: boolean }) => React.ReactNode)
  /** Per-node icon override. */
  nodeIcon?: React.ReactNode | ((props: { expanded: boolean; selected: boolean }) => React.ReactNode)
  /** Custom expander icon. */
  switcherIcon?: React.ReactNode | ((props: { expanded: boolean; loading: boolean; isLeaf: boolean }) => React.ReactNode)

  /** Row is draggable. */
  draggable: boolean
  /** Active drop indicator band on this row. */
  dropPosition: -1 | 0 | 1 | null
  /** Key of the row currently being dragged, if any. */
  dragKey: TreeKey | null

  /** Resolved locale strings. */
  t: Required<TreeLocale>

  /** Toggle expand. */
  onExpand: (key: TreeKey) => void
  /** Toggle check. */
  onCheck: (key: TreeKey) => void
  /** Toggle select. */
  onSelect: (key: TreeKey) => void
  /** Native drag start. */
  onDragStart: (e: React.DragEvent, key: TreeKey) => void
  /** Native drag over. */
  onDragOver: (e: React.DragEvent, key: TreeKey) => void
  /** Native drag leave. */
  onDragLeave: (e: React.DragEvent, key: TreeKey) => void
  /** Native drag end. */
  onDragEnd: (e: React.DragEvent, key: TreeKey) => void
  /** Native drop. */
  onDrop: (e: React.DragEvent, key: TreeKey) => void
  /** Context menu handler. */
  onRightClick?: (e: React.MouseEvent, node: TreeNodeData) => void
  /** Lazy-load children on expand. */
  onLoadData?: (node: TreeNodeData) => void
  /** Moves roving tabindex / focus highlight. */
  onFocusNode: (key: TreeKey | null) => void

  /** Custom title render replacing default text. */
  titleRender?: (node: TreeNodeData, info: { expanded: boolean; selected: boolean; checked: boolean; halfChecked: boolean }) => React.ReactNode
  /** Current filter string for search highlighting. */
  searchValue?: string

  /** Inline edit allowed for this row. */
  editable: boolean
  /** Row is currently in edit mode. */
  editing: boolean
  /** Enter edit mode. */
  onEditStart: (key: TreeKey) => void
  /** Commit edited title. */
  onEditConfirm: (key: TreeKey, value: string) => void
  /** Cancel edit mode. */
  onEditCancel: (key: TreeKey) => void

  /** Hover action buttons. */
  actions?: TreeNodeAction[]

  /** Semantic status styling for the row. */
  status: TreeNodeStatus

  /** Whether this node is the last child of its parent (line drawing). */
  lineIsLast: boolean
  /** Ancestor “last child” flags for line drawing. */
  lineParentIsLast: boolean[]

  /** Unstyled row. */
  unstyled?: boolean
  /** Extra class from node. */
  nodeClassName?: string
  /** Inline style from node. */
  nodeStyle?: React.CSSProperties
}

/** Renders one tree row: lines, switcher, checkbox, icon, title, edit field, and actions. */
export function TreeNodeRow(props: TreeNodeRowProps) {
  const {
    node, nodeKey, depth, isLeaf, indentSize,
    expanded, checked, halfChecked, selected, loading, disabled, focused,
    checkable, selectable, showLine, showLeafIcon, showIcon, blockNode, directory,
    globalIcon, nodeIcon, switcherIcon,
    draggable, dropPosition, dragKey,
    onExpand, onCheck, onSelect,
    onDragStart, onDragOver, onDragLeave, onDragEnd, onDrop,
    onRightClick, onLoadData, onFocusNode,
    titleRender, searchValue,
    editable, editing, onEditStart, onEditConfirm, onEditCancel,
    actions,
    status,
    lineIsLast, lineParentIsLast,
    unstyled, nodeClassName, nodeStyle,
  } = props

  const rowRef = useRef<HTMLDivElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)
  const [editValue, setEditValue] = useState('')

  useEffect(() => {
    if (editing) {
      setEditValue(String(node.title ?? ''))
      setTimeout(() => editInputRef.current?.focus(), 0)
    }
  }, [editing, node.title])

  useEffect(() => {
    if (focused && rowRef.current) {
      rowRef.current.scrollIntoView?.({ block: 'nearest' })
    }
  }, [focused])

  const handleSwitcherClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isLeaf) return
    if (!expanded && loading) return
    onExpand(nodeKey)
    if (!expanded && !isLeaf && onLoadData) {
      onLoadData(node)
    }
  }

  const handleCheckChange = () => {
    if (disabled || node.disableCheckbox) return
    onCheck(nodeKey)
  }

  const handleSelect = () => {
    if (disabled || (node.selectable === false)) return
    if (!selectable) return
    onSelect(nodeKey)
    if (directory && !isLeaf) {
      onExpand(nodeKey)
    }
  }

  const handleClick = () => {
    onFocusNode(nodeKey)
    handleSelect()
  }

  const handleDoubleClick = () => {
    if (editable && !editing) {
      onEditStart(nodeKey)
    }
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    if (onRightClick) {
      e.preventDefault()
      onRightClick(e, node)
    }
  }

  const handleEditKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation()
    if (e.key === 'Enter') {
      onEditConfirm(nodeKey, editValue)
    } else if (e.key === 'Escape') {
      onEditCancel(nodeKey)
    }
  }, [nodeKey, editValue, onEditConfirm, onEditCancel])

  const handleEditBlur = useCallback(() => {
    onEditConfirm(nodeKey, editValue)
  }, [nodeKey, editValue, onEditConfirm])

  // Highlighted title with search match
  const renderHighlightedTitle = (title: string) => {
    if (!searchValue) return title
    const index = title.toLowerCase().indexOf(searchValue.toLowerCase())
    if (index === -1) return title
    const before = title.slice(0, index)
    const match = title.slice(index, index + searchValue.length)
    const after = title.slice(index + searchValue.length)
    return (
      <>
        {before}
        <span className="sg-tree-highlight">{match}</span>
        {after}
      </>
    )
  }

  // Switcher icon
  const renderSwitcher = () => {
    if (isLeaf) {
      if (showLine) {
        if (showLeafIcon === false) return <span className="sg-tree-switcher sg-tree-switcher-noop" />
        if (showLeafIcon && typeof showLeafIcon !== 'boolean') {
          return <span className="sg-tree-switcher sg-tree-switcher-leaf-icon">{showLeafIcon}</span>
        }
        return <span className="sg-tree-switcher sg-tree-switcher-leaf">─</span>
      }
      return <span className="sg-tree-switcher sg-tree-switcher-noop" />
    }

    if (loading) {
      return <span className="sg-tree-switcher sg-tree-switcher-loading"><Spin size="small" /></span>
    }

    let iconContent: React.ReactNode
    if (switcherIcon) {
      iconContent = typeof switcherIcon === 'function'
        ? switcherIcon({ expanded, loading, isLeaf })
        : switcherIcon
    } else {
      iconContent = (
        <svg
          className={`sg-tree-switcher-arrow${expanded ? ' sg-tree-switcher-arrow-open' : ''}`}
          width="10" height="10" viewBox="0 0 10 10" fill="none"
        >
          <path d="M3 2L7 5L3 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    }

    return (
      <span
        className={`sg-tree-switcher${expanded ? ' sg-tree-switcher-open' : ' sg-tree-switcher-close'}`}
        onClick={handleSwitcherClick}
      >
        {iconContent}
      </span>
    )
  }

  // Node icon
  const renderIcon = () => {
    if (!showIcon && !directory) return null
    const iconSource = nodeIcon ?? globalIcon
    let iconContent: React.ReactNode = null

    if (iconSource) {
      iconContent = typeof iconSource === 'function'
        ? iconSource({ expanded, selected })
        : iconSource
    } else if (directory) {
      iconContent = expanded ? '📂' : '📁'
    }

    if (!iconContent) return null
    return <span className="sg-tree-icon">{iconContent}</span>
  }

  // Title content
  const renderTitle = () => {
    if (editing) {
      return (
        <input
          ref={editInputRef}
          className="sg-tree-edit-input"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleEditKeyDown}
          onBlur={handleEditBlur}
          onClick={(e) => e.stopPropagation()}
        />
      )
    }

    if (titleRender) {
      return titleRender(node, { expanded, selected, checked, halfChecked })
    }

    const titleText = String(node.title ?? nodeKey)
    return renderHighlightedTitle(titleText)
  }

  // Action buttons
  const renderActions = () => {
    if (!actions || actions.length === 0) return null
    const visibleActions = actions.filter((a) => !a.visible || a.visible(node))
    if (visibleActions.length === 0) return null

    return (
      <span className="sg-tree-actions" onClick={(e) => e.stopPropagation()}>
        {visibleActions.map((action) => {
          const isDisabled = action.disabled?.(node) ?? false
          return (
            <button
              key={action.key}
              className={`sg-tree-action-btn${action.danger ? ' sg-tree-action-danger' : ''}${isDisabled ? ' sg-tree-action-disabled' : ''}`}
              title={action.title}
              onClick={(e) => {
                e.stopPropagation()
                if (!isDisabled) action.onClick(node, nodeKey)
              }}
              disabled={isDisabled}
              type="button"
            >
              {action.icon ?? action.title ?? action.key}
            </button>
          )
        })}
      </span>
    )
  }

  // Connecting lines
  const renderIndentLines = () => {
    if (!showLine) return null
    const lines: React.ReactNode[] = []
    for (let i = 0; i < depth; i++) {
      const isParentLast = lineParentIsLast[i] ?? false
      lines.push(
        <span
          key={i}
          className={`sg-tree-indent-line${isParentLast ? ' sg-tree-indent-line-hidden' : ''}`}
          style={{ left: i * indentSize + indentSize / 2 }}
        />
      )
    }
    if (depth > 0) {
      lines.push(
        <span
          key="branch"
          className={`sg-tree-indent-branch${lineIsLast ? ' sg-tree-indent-branch-last' : ''}`}
          style={{ left: (depth - 1) * indentSize + indentSize / 2 }}
        />
      )
    }
    return <>{lines}</>
  }

  // Status dot
  const renderStatus = () => {
    if (status === 'default') return null
    return <span className={`sg-tree-status sg-tree-status-${status}`} />
  }

  if (unstyled) {
    return (
      <div
        ref={rowRef}
        role="treeitem"
        aria-expanded={isLeaf ? undefined : expanded}
        aria-selected={selected}
        aria-checked={checkable ? checked : undefined}
        aria-level={depth + 1}
        data-key={nodeKey}
      >
        {checkable && (
          <Checkbox
            checked={checked}
            indeterminate={halfChecked}
            disabled={disabled || node.disableCheckbox}
            onChange={handleCheckChange}
            unstyled
          />
        )}
        <span onClick={handleClick}>{renderTitle()}</span>
      </div>
    )
  }

  const isDragging = dragKey === nodeKey

  const rowCls = [
    'sg-tree-node',
    selected ? 'sg-tree-node-selected' : '',
    disabled ? 'sg-tree-node-disabled' : '',
    isLeaf ? 'sg-tree-node-leaf' : '',
    expanded ? 'sg-tree-node-expanded' : '',
    draggable ? 'sg-tree-node-draggable' : '',
    isDragging ? 'sg-tree-node-dragging' : '',
    dropPosition === 0 ? 'sg-tree-node-drop-inner' : '',
    dropPosition === -1 ? 'sg-tree-node-drop-before' : '',
    dropPosition === 1 ? 'sg-tree-node-drop-after' : '',
    showLine ? 'sg-tree-node-show-line' : '',
    blockNode ? 'sg-tree-node-block' : '',
    directory ? 'sg-tree-node-directory' : '',
    focused ? 'sg-tree-node-focused' : '',
    editing ? 'sg-tree-node-editing' : '',
    status !== 'default' ? `sg-tree-node-status-${status}` : '',
    nodeClassName,
  ].filter(Boolean).join(' ')

  return (
    <div
      ref={rowRef}
      className={rowCls}
      style={{ ...nodeStyle, paddingLeft: depth * indentSize }}
      role="treeitem"
      aria-expanded={isLeaf ? undefined : expanded}
      aria-selected={selected}
      aria-checked={checkable ? checked : undefined}
      aria-level={depth + 1}
      data-key={nodeKey}
      draggable={draggable && !editing}
      onDragStart={draggable ? (e) => onDragStart(e, nodeKey) : undefined}
      onDragOver={draggable ? (e) => { e.preventDefault(); onDragOver(e, nodeKey) } : undefined}
      onDragLeave={draggable ? (e) => onDragLeave(e, nodeKey) : undefined}
      onDragEnd={draggable ? (e) => onDragEnd(e, nodeKey) : undefined}
      onDrop={draggable ? (e) => { e.preventDefault(); onDrop(e, nodeKey) } : undefined}
      onContextMenu={handleContextMenu}
      onClick={handleClick}
      onDoubleClick={editable ? handleDoubleClick : undefined}
    >
      {renderIndentLines()}
      {renderSwitcher()}

      {checkable && node.checkable !== false && (
        <Checkbox
          checked={checked}
          indeterminate={halfChecked}
          disabled={disabled || node.disableCheckbox}
          onChange={handleCheckChange}
        />
      )}

      {renderIcon()}
      {renderStatus()}

      <span
        className={`sg-tree-title${selectable && !editing ? ' sg-tree-title-selectable' : ''}`}
      >
        {renderTitle()}
      </span>

      {renderActions()}
    </div>
  )
}
