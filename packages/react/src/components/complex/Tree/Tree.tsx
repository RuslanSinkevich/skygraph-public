import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useTree } from '../../../hooks/useTree'
import { TreeNodeRow } from './TreeNodeRow'
import type { TreeProps, TreeKey, TreeNodeData } from './types'
import { DEFAULT_TREE_LOCALE, DEFAULT_INDENT, NODE_HEIGHT } from './types'

/**
 * Hierarchical list with expand/collapse, checkboxes, selection, search, keyboard focus, and optional drag-and-drop.
 * State is managed by `useTree`; rows are rendered through `TreeNodeRow`.
 */
export function Tree(props: TreeProps) {
  const {
    treeData,
    fieldNames,
    checkable = false,
    checkStrictly = false,
    checkedKeys: controlledCheckedKeys,
    defaultCheckedKeys,
    onCheck,
    selectable = true,
    multiple = false,
    selectedKeys: controlledSelectedKeys,
    defaultSelectedKeys,
    onSelect,
    expandedKeys: controlledExpandedKeys,
    defaultExpandedKeys,
    defaultExpandAll = false,
    autoExpandParent = false,
    onExpand,
    draggable = false,
    allowDrop,
    onDragStart,
    onDragOver,
    onDragLeave,
    onDragEnd,
    onDrop,
    loadData,
    showLine = false,
    showIcon = false,
    icon: globalIcon,
    switcherIcon,
    blockNode = false,
    height,
    virtual = true,
    disabled = false,
    indentSize = DEFAULT_INDENT,
    directory = false,
    onRightClick,
    // Search
    showSearch = false,
    searchValue: controlledSearchValue,
    defaultSearchValue = '',
    onSearch,
    filterTreeNode,
    highlightSearch = true,
    // Keyboard
    keyboard = true,
    // Editable
    editable = false,
    onEdit,
    onEditCancel,
    // Custom render
    titleRender,
    // Actions
    actions,
    // Toolbar
    showToolbar = false,
    toolbarExtra,
    // Animation
    animated = true,
    // Focus
    autoFocus = false,
    focusedKey: controlledFocusedKey,
    onFocus: onFocusCallback,
    // Scroll
    scrollToKey,
    // Status
    nodeStatus,
    locale,
    className,
    style,
    unstyled,
  } = props

  const t = useMemo(() => ({ ...DEFAULT_TREE_LOCALE, ...locale }), [locale])

  const showLineConfig = typeof showLine === 'object' ? showLine : { showLeafIcon: false }
  const isShowLine = !!showLine

  const {
    tree,
    treeState,
    flatNodes,
    toggleExpand,
    setExpandedKeys,
    expandAll,
    collapseAll,
    toggleCheck,
    setCheckedKeys,
    select,
    setSelectedKeys,
    markLoading,
    markLoaded,
    moveNode,
    filterNodes,
    refresh,
  } = useTree({
    data: treeData,
    fieldNames,
    checkStrictly,
    defaultExpandAll,
    defaultExpandedKeys,
    defaultCheckedKeys,
    defaultSelectedKeys,
  })

  // ═══════════════════════════════════════════
  // SEARCH STATE
  // ═══════════════════════════════════════════
  const [internalSearchValue, setInternalSearchValue] = useState(defaultSearchValue)
  const searchValue = controlledSearchValue ?? internalSearchValue

  const handleSearchChange = useCallback(
    (value: string) => {
      if (controlledSearchValue === undefined) {
        setInternalSearchValue(value)
      }
      onSearch?.(value)

      if (!value) {
        filterNodes(null)
        return
      }

      const predicate = filterTreeNode
        ? (node: TreeNodeData) => filterTreeNode(node, value)
        : (node: TreeNodeData) => {
            const title = String(node.title ?? '')
            return title.toLowerCase().includes(value.toLowerCase())
          }

      filterNodes(predicate)

      if (autoExpandParent) {
        const filtered = tree.getFilteredKeys()
        if (filtered) {
          setExpandedKeys(filtered)
        }
      }
    },
    [
      controlledSearchValue,
      onSearch,
      filterTreeNode,
      filterNodes,
      autoExpandParent,
      tree,
      setExpandedKeys,
    ],
  )

  useEffect(() => {
    if (controlledSearchValue !== undefined && controlledSearchValue !== internalSearchValue) {
      handleSearchChange(controlledSearchValue)
    }
  }, [controlledSearchValue]) // eslint-disable-line react-hooks/exhaustive-deps

  // ═══════════════════════════════════════════
  // SYNC DATA CHANGES
  // ═══════════════════════════════════════════
  const prevDataRef = useRef(treeData)
  useEffect(() => {
    if (prevDataRef.current !== treeData) {
      prevDataRef.current = treeData
      tree.setData(treeData)
      refresh()
    }
  }, [treeData, tree, refresh])

  // Controlled keys
  useEffect(() => {
    if (controlledExpandedKeys !== undefined) setExpandedKeys(controlledExpandedKeys)
  }, [controlledExpandedKeys, setExpandedKeys])

  useEffect(() => {
    if (controlledCheckedKeys !== undefined) setCheckedKeys(controlledCheckedKeys)
  }, [controlledCheckedKeys, setCheckedKeys])

  useEffect(() => {
    if (controlledSelectedKeys !== undefined) setSelectedKeys(controlledSelectedKeys)
  }, [controlledSelectedKeys, setSelectedKeys])

  // ═══════════════════════════════════════════
  // FOCUS STATE
  // ═══════════════════════════════════════════
  const [internalFocusedKey, setInternalFocusedKey] = useState<TreeKey | null>(null)
  const focusedKey = controlledFocusedKey ?? internalFocusedKey
  const treeRef = useRef<HTMLDivElement>(null)

  const setFocusedKey = useCallback(
    (key: TreeKey | null) => {
      setInternalFocusedKey(key)
      if (key !== null) onFocusCallback?.(key)
    },
    [onFocusCallback],
  )

  useEffect(() => {
    if (autoFocus && flatNodes.length > 0 && focusedKey === null) {
      setFocusedKey(flatNodes[0].key)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ═══════════════════════════════════════════
  // EDITING STATE
  // ═══════════════════════════════════════════
  const [editingKey, setEditingKey] = useState<TreeKey | null>(null)

  const isNodeEditable = useCallback(
    (node: TreeNodeData): boolean => {
      if (typeof editable === 'function') return editable(node)
      return !!editable
    },
    [editable],
  )

  const handleEditStart = useCallback((key: TreeKey) => {
    setEditingKey(key)
  }, [])

  const handleEditConfirm = useCallback(
    (key: TreeKey, value: string) => {
      const node = tree.getNode(key)
      if (node && onEdit) {
        onEdit({ key, node, value, oldValue: String(node.title ?? '') })
      }
      setEditingKey(null)
    },
    [tree, onEdit],
  )

  const handleEditCancelInternal = useCallback(
    (key: TreeKey) => {
      setEditingKey(null)
      onEditCancel?.(key)
    },
    [onEditCancel],
  )

  // ═══════════════════════════════════════════
  // DRAG STATE
  // ═══════════════════════════════════════════
  const [dragKey, setDragKey] = useState<TreeKey | null>(null)
  const [dropKey, setDropKey] = useState<TreeKey | null>(null)
  const [dropPosition, setDropPosition] = useState<-1 | 0 | 1>(0)

  // ═══════════════════════════════════════════
  // EVENT HANDLERS
  // ═══════════════════════════════════════════
  const handleExpand = useCallback(
    (key: TreeKey) => {
      toggleExpand(key)
      const node = tree.getNode(key)
      if (node && onExpand) {
        const newState = tree.getState()
        const expanded = newState.expandedKeys.includes(key)
        onExpand(newState.expandedKeys, { expanded, node })
      }
    },
    [toggleExpand, tree, onExpand],
  )

  const handleCheck = useCallback(
    (key: TreeKey) => {
      toggleCheck(key)
      if (onCheck) {
        const newState = tree.getState()
        const node = tree.getNode(key)!
        const checkedNodes = newState.checkedKeys
          .map((ck: TreeKey) => tree.getNode(ck))
          .filter(Boolean) as TreeNodeData[]
        onCheck(newState.checkedKeys, {
          checked: newState.checkedKeys.includes(key),
          node,
          checkedNodes,
          halfCheckedKeys: newState.halfCheckedKeys,
        })
      }
    },
    [toggleCheck, tree, onCheck],
  )

  const handleSelect = useCallback(
    (key: TreeKey) => {
      select(key, multiple)
      if (onSelect) {
        const newState = tree.getState()
        const node = tree.getNode(key)!
        const selectedNodes = newState.selectedKeys
          .map((sk: TreeKey) => tree.getNode(sk))
          .filter(Boolean) as TreeNodeData[]
        onSelect(newState.selectedKeys, {
          selected: newState.selectedKeys.includes(key),
          node,
          selectedNodes,
        })
      }
    },
    [select, multiple, tree, onSelect],
  )

  const handleLoadData = useCallback(
    (node: TreeNodeData) => {
      if (!loadData) return
      const key = node.key
      if (treeState.loadedKeys.includes(key) || treeState.loadingKeys.includes(key)) return
      markLoading(key)
      loadData(node).then(() => {
        markLoaded(key)
      })
    },
    [loadData, treeState.loadedKeys, treeState.loadingKeys, markLoading, markLoaded],
  )

  // Drag handlers
  const handleDragStart = useCallback(
    (e: React.DragEvent, key: TreeKey) => {
      setDragKey(key)
      e.dataTransfer.effectAllowed = 'move'
      const node = tree.getNode(key)
      if (node) onDragStart?.({ event: e, node })
    },
    [tree, onDragStart],
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent, key: TreeKey) => {
      e.preventDefault()
      setDropKey(key)
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const y = e.clientY - rect.top
      const h = rect.height
      let pos: -1 | 0 | 1 = 0
      if (y < h * 0.25) pos = -1
      else if (y > h * 0.75) pos = 1
      setDropPosition(pos)
      const node = tree.getNode(key)
      if (node) onDragOver?.({ event: e, node })
    },
    [tree, onDragOver],
  )

  const handleDragLeave = useCallback(
    (e: React.DragEvent, key: TreeKey) => {
      setDropKey(null)
      const node = tree.getNode(key)
      if (node) onDragLeave?.({ event: e, node })
    },
    [tree, onDragLeave],
  )

  const handleDragEnd = useCallback(
    (e: React.DragEvent, key: TreeKey) => {
      setDragKey(null)
      setDropKey(null)
      const node = tree.getNode(key)
      if (node) onDragEnd?.({ event: e, node })
    },
    [tree, onDragEnd],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent, key: TreeKey) => {
      e.preventDefault()
      if (dragKey === null || dragKey === key) {
        setDragKey(null)
        setDropKey(null)
        return
      }

      const dragNode = tree.getNode(dragKey)
      const dropNode = tree.getNode(key)
      if (!dragNode || !dropNode) return

      if (allowDrop && !allowDrop({ dragNode, dropNode, dropPosition })) {
        setDragKey(null)
        setDropKey(null)
        return
      }

      moveNode(dragKey, key, dropPosition)

      if (onDrop) {
        onDrop({ event: e, node: dropNode, dragNode, dropPosition })
      }

      setDragKey(null)
      setDropKey(null)
    },
    [dragKey, dropPosition, tree, allowDrop, moveNode, onDrop],
  )

  const handleRightClick = useCallback(
    (e: React.MouseEvent, node: TreeNodeData) => {
      onRightClick?.({ event: e, node })
    },
    [onRightClick],
  )

  const isDraggable = (node: TreeNodeData): boolean => {
    if (typeof draggable === 'function') return draggable(node)
    return !!draggable
  }

  // ═══════════════════════════════════════════
  // VIRTUAL SCROLL (refs declared early — used by keyboard handlers below)
  // ═══════════════════════════════════════════
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const itemHeight = NODE_HEIGHT

  // Scrolls the virtual viewport so the row for `key` is visible. Declared
  // before `handleKeyDown` so it can be listed in the callback's deps array
  // (otherwise eslint-react-hooks/exhaustive-deps complains).
  const scrollToFocused = useCallback(
    (key: TreeKey) => {
      const index = flatNodes.findIndex((item) => item.key === key)
      if (index === -1) return
      const el = containerRef.current ?? treeRef.current
      if (!el) return
      const targetTop = index * itemHeight
      const { scrollTop: st, clientHeight: ch } = el
      if (targetTop < st) {
        el.scrollTop = targetTop
      } else if (targetTop + itemHeight > st + ch) {
        el.scrollTop = targetTop + itemHeight - ch
      }
    },
    [flatNodes, itemHeight],
  )

  // ═══════════════════════════════════════════
  // KEYBOARD NAVIGATION
  // ═══════════════════════════════════════════
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!keyboard || disabled || editingKey !== null) return

      const currentIndex = flatNodes.findIndex((item) => item.key === focusedKey)
      if (currentIndex === -1 && flatNodes.length === 0) return

      const focusNode = (index: number) => {
        if (index >= 0 && index < flatNodes.length) {
          setFocusedKey(flatNodes[index].key)
          scrollToFocused(flatNodes[index].key)
        }
      }

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault()
          focusNode(currentIndex === -1 ? 0 : Math.min(currentIndex + 1, flatNodes.length - 1))
          break
        }
        case 'ArrowUp': {
          e.preventDefault()
          focusNode(currentIndex === -1 ? 0 : Math.max(currentIndex - 1, 0))
          break
        }
        case 'ArrowRight': {
          e.preventDefault()
          if (currentIndex === -1) break
          const item = flatNodes[currentIndex]
          if (!item.isLeaf && !treeState.expandedKeys.includes(item.key)) {
            handleExpand(item.key)
          } else if (!item.isLeaf && treeState.expandedKeys.includes(item.key)) {
            focusNode(currentIndex + 1)
          }
          break
        }
        case 'ArrowLeft': {
          e.preventDefault()
          if (currentIndex === -1) break
          const item = flatNodes[currentIndex]
          if (!item.isLeaf && treeState.expandedKeys.includes(item.key)) {
            handleExpand(item.key)
          } else if (item.parentKey !== null) {
            const parentIndex = flatNodes.findIndex((n) => n.key === item.parentKey)
            if (parentIndex !== -1) focusNode(parentIndex)
          }
          break
        }
        case 'Home': {
          e.preventDefault()
          focusNode(0)
          break
        }
        case 'End': {
          e.preventDefault()
          focusNode(flatNodes.length - 1)
          break
        }
        case 'Enter': {
          e.preventDefault()
          if (currentIndex === -1) break
          const item = flatNodes[currentIndex]
          if (selectable) handleSelect(item.key)
          break
        }
        case ' ': {
          e.preventDefault()
          if (currentIndex === -1) break
          const item = flatNodes[currentIndex]
          if (checkable) handleCheck(item.key)
          else if (!item.isLeaf) handleExpand(item.key)
          break
        }
        case '*': {
          e.preventDefault()
          expandAll()
          break
        }
        case 'F2': {
          e.preventDefault()
          if (currentIndex === -1) break
          const item = flatNodes[currentIndex]
          if (isNodeEditable(item.node)) {
            handleEditStart(item.key)
          }
          break
        }
      }
    },
    [
      keyboard,
      disabled,
      editingKey,
      flatNodes,
      focusedKey,
      treeState.expandedKeys,
      handleExpand,
      handleCheck,
      handleSelect,
      expandAll,
      setFocusedKey,
      checkable,
      selectable,
      scrollToFocused,
      isNodeEditable,
      handleEditStart,
    ],
  )

  // ═══════════════════════════════════════════
  // VIRTUAL SCROLL (handlers + memoized slices)
  // ═══════════════════════════════════════════
  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop)
    }
  }, [])

  const useVirtual = virtual && height !== undefined && flatNodes.length > 50

  // Larger overscan keeps rows mounted during fast scroll. `+ overscan*2` so
  // the visible window has padding both above and below the viewport.
  const VIRTUAL_OVERSCAN = 5

  const visibleSlice = useMemo(() => {
    if (!useVirtual || !height) {
      return { nodes: flatNodes, startIndex: 0 }
    }
    const rawStart = Math.floor(scrollTop / itemHeight)
    const startIndex = Math.max(0, rawStart - VIRTUAL_OVERSCAN)
    const visibleCount = Math.ceil(height / itemHeight) + VIRTUAL_OVERSCAN * 2
    const endIndex = Math.min(flatNodes.length, startIndex + visibleCount)
    return { nodes: flatNodes.slice(startIndex, endIndex), startIndex }
  }, [flatNodes, useVirtual, height, scrollTop, itemHeight])

  const visibleNodes = visibleSlice.nodes
  const virtualOffset = visibleSlice.startIndex * itemHeight

  const totalHeight = flatNodes.length * itemHeight
  const virtualBottomPad = Math.max(
    0,
    totalHeight - virtualOffset - visibleNodes.length * itemHeight,
  )

  // scrollToKey prop
  useEffect(() => {
    if (scrollToKey !== undefined) {
      const index = flatNodes.findIndex((item) => item.key === scrollToKey)
      if (index !== -1) {
        scrollToFocused(scrollToKey)
        setFocusedKey(scrollToKey)
      }
    }
  }, [scrollToKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // ═══════════════════════════════════════════
  // TOOLBAR HANDLERS
  // ═══════════════════════════════════════════
  const handleExpandAll = useCallback(() => {
    expandAll()
    if (onExpand) onExpand(tree.getState().expandedKeys, { expanded: true, node: treeData[0] })
  }, [expandAll, onExpand, tree, treeData])

  const handleCollapseAll = useCallback(() => {
    collapseAll()
    if (onExpand) onExpand([], { expanded: false, node: treeData[0] })
  }, [collapseAll, onExpand, treeData])

  const handleCheckAll = useCallback(() => {
    const allKeys = tree.getAllKeys()
    setCheckedKeys(allKeys)
    if (onCheck) {
      const allNodes = allKeys
        .map((k: TreeKey) => tree.getNode(k))
        .filter(Boolean) as TreeNodeData[]
      onCheck(allKeys, {
        checked: true,
        node: allNodes[0],
        checkedNodes: allNodes,
        halfCheckedKeys: [],
      })
    }
  }, [tree, setCheckedKeys, onCheck])

  const handleUncheckAll = useCallback(() => {
    setCheckedKeys([])
    if (onCheck) {
      onCheck([], { checked: false, node: treeData[0], checkedNodes: [], halfCheckedKeys: [] })
    }
  }, [setCheckedKeys, onCheck, treeData])

  // ═══════════════════════════════════════════
  // RENDER HELPERS
  // ═══════════════════════════════════════════
  const siblingsMap = useMemo(() => {
    if (!isShowLine) return null
    const map = new Map<TreeKey, { isLast: boolean; parentIsLast: boolean[] }>()
    function walk(list: TreeNodeData[], depth: number, parentIsLast: boolean[]) {
      for (let i = 0; i < list.length; i++) {
        const node = list[i]
        const key = node.key
        const isLast = i === list.length - 1
        map.set(key, { isLast, parentIsLast: [...parentIsLast] })
        const children = node.children
        if (children && children.length > 0) {
          walk(children, depth + 1, [...parentIsLast, isLast])
        }
      }
    }
    walk(treeData, 0, [])
    return map
  }, [treeData, isShowLine])

  const renderNode = (item: {
    node: TreeNodeData
    key: TreeKey
    depth: number
    isLeaf: boolean
    parentKey?: TreeKey | null
  }) => {
    const lineInfo = siblingsMap?.get(item.key)
    return (
      <TreeNodeRow
        key={item.key}
        node={item.node}
        nodeKey={item.key}
        depth={item.depth}
        isLeaf={item.isLeaf}
        indentSize={indentSize}
        expanded={treeState.expandedKeys.includes(item.key)}
        checked={treeState.checkedKeys.includes(item.key)}
        halfChecked={treeState.halfCheckedKeys.includes(item.key)}
        selected={treeState.selectedKeys.includes(item.key)}
        loading={treeState.loadingKeys.includes(item.key)}
        disabled={disabled || !!item.node.disabled}
        focused={focusedKey === item.key}
        checkable={checkable}
        selectable={selectable}
        showLine={isShowLine}
        showLeafIcon={showLineConfig.showLeafIcon ?? false}
        showIcon={showIcon || directory}
        blockNode={blockNode}
        directory={directory}
        animated={animated}
        globalIcon={globalIcon}
        nodeIcon={
          item.node.icon as
            | React.ReactNode
            | ((props: { expanded: boolean; selected: boolean }) => React.ReactNode)
            | undefined
        }
        switcherIcon={switcherIcon}
        draggable={isDraggable(item.node)}
        dropPosition={dropKey === item.key ? dropPosition : null}
        dragKey={dragKey}
        t={t}
        onExpand={handleExpand}
        onCheck={handleCheck}
        onSelect={handleSelect}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDragEnd={handleDragEnd}
        onDrop={handleDrop}
        onRightClick={onRightClick ? handleRightClick : undefined}
        onLoadData={loadData ? handleLoadData : undefined}
        nodeClassName={item.node.className as string | undefined}
        nodeStyle={item.node.style as React.CSSProperties | undefined}
        // New features
        titleRender={titleRender}
        searchValue={highlightSearch ? searchValue : ''}
        editable={isNodeEditable(item.node)}
        editing={editingKey === item.key}
        onEditStart={handleEditStart}
        onEditConfirm={handleEditConfirm}
        onEditCancel={handleEditCancelInternal}
        actions={actions}
        status={nodeStatus?.(item.node) ?? 'default'}
        lineIsLast={lineInfo?.isLast ?? false}
        lineParentIsLast={lineInfo?.parentIsLast ?? []}
        onFocusNode={setFocusedKey}
      />
    )
  }

  // ═══════════════════════════════════════════
  // UNSTYLED RENDER
  // ═══════════════════════════════════════════
  if (unstyled) {
    return (
      <div
        ref={treeRef}
        className={className}
        style={style}
        role="tree"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {flatNodes.map((item) => renderNode(item))}
      </div>
    )
  }

  // ═══════════════════════════════════════════
  // STYLED RENDER
  // ═══════════════════════════════════════════
  const wrapperCls = [
    'sg-tree',
    isShowLine ? 'sg-tree-show-line' : '',
    blockNode ? 'sg-tree-block-node' : '',
    directory ? 'sg-tree-directory' : '',
    disabled ? 'sg-tree-disabled' : '',
    animated ? 'sg-tree-animated' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const renderSearch = () => {
    if (!showSearch) return null
    return (
      <div className="sg-tree-search">
        <input
          className="sg-tree-search-input"
          type="text"
          value={searchValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder={t.searchPlaceholder}
          aria-label={t.searchPlaceholder}
        />
        {searchValue && (
          <button
            className="sg-tree-search-clear"
            onClick={() => handleSearchChange('')}
            aria-label={t.clearSearch}
            type="button"
          >
            ×
          </button>
        )}
      </div>
    )
  }

  const renderToolbar = () => {
    if (!showToolbar) return null
    return (
      <div className="sg-tree-toolbar">
        <div className="sg-tree-toolbar-actions">
          <button
            className="sg-tree-toolbar-btn"
            onClick={handleExpandAll}
            title={t.expandAllText}
            type="button"
          >
            ⊞
          </button>
          <button
            className="sg-tree-toolbar-btn"
            onClick={handleCollapseAll}
            title={t.collapseAllText}
            type="button"
          >
            ⊟
          </button>
          {checkable && (
            <>
              <span className="sg-tree-toolbar-divider" />
              <button
                className="sg-tree-toolbar-btn"
                onClick={handleCheckAll}
                title={t.checkAllText}
                type="button"
              >
                ☑
              </button>
              <button
                className="sg-tree-toolbar-btn"
                onClick={handleUncheckAll}
                title={t.uncheckAllText}
                type="button"
              >
                ☐
              </button>
            </>
          )}
        </div>
        {toolbarExtra && <div className="sg-tree-toolbar-extra">{toolbarExtra}</div>}
      </div>
    )
  }

  const renderNodes = (list: typeof visibleNodes) => list.map((item) => renderNode(item))

  if (flatNodes.length === 0) {
    return (
      <div className={wrapperCls} style={style} role="tree">
        {renderSearch()}
        {renderToolbar()}
        <div className="sg-tree-empty">{t.emptyText}</div>
      </div>
    )
  }

  if (useVirtual && height) {
    return (
      <div className={wrapperCls} style={style}>
        {renderSearch()}
        {renderToolbar()}
        <div
          ref={containerRef}
          className="sg-tree-virtual-container"
          style={{ height, overflow: 'auto' }}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          role="tree"
          tabIndex={0}
        >
          <div
            style={{
              paddingTop: virtualOffset,
              paddingBottom: virtualBottomPad,
              boxSizing: 'border-box',
            }}
          >
            {renderNodes(visibleNodes)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={treeRef}
      className={wrapperCls}
      style={style}
      role="tree"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {renderSearch()}
      {renderToolbar()}
      {renderNodes(visibleNodes)}
    </div>
  )
}
