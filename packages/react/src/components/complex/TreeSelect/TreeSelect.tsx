import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Tree } from '../Tree'
import { useConfig } from '../../ConfigProvider'
import type { TreeSelectProps, TreeKey, TreeNodeData } from './types'

function toArray(val: TreeKey | TreeKey[] | undefined): TreeKey[] {
  if (val === undefined) return []
  return Array.isArray(val) ? val : [val]
}

function collectAllKeys(nodes: TreeNodeData[]): TreeKey[] {
  const keys: TreeKey[] = []
  const walk = (list: TreeNodeData[]) => {
    for (const n of list) {
      keys.push(n.key)
      if (n.children) walk(n.children)
    }
  }
  walk(nodes)
  return keys
}

function findNode(nodes: TreeNodeData[], key: TreeKey): TreeNodeData | undefined {
  for (const n of nodes) {
    if (n.key === key) return n
    if (n.children) {
      const found = findNode(n.children, key)
      if (found) return found
    }
  }
  return undefined
}

function getNodeLabel(node: TreeNodeData | undefined): React.ReactNode {
  if (!node) return ''
  return node.title ?? String(node.key)
}

function filterTreeKeepMatches(
  nodes: TreeNodeData[],
  predicate: (node: TreeNodeData) => boolean,
): TreeNodeData[] {
  const result: TreeNodeData[] = []
  for (const node of nodes) {
    const childResult = node.children ? filterTreeKeepMatches(node.children, predicate) : []
    if (predicate(node) || childResult.length > 0) {
      result.push({
        ...node,
        children: childResult.length > 0 ? childResult : undefined,
      })
    }
  }
  return result
}

function getParentKeys(nodes: TreeNodeData[], targetKey: TreeKey): TreeKey[] {
  const parents: TreeKey[] = []
  const walk = (list: TreeNodeData[], path: TreeKey[]): boolean => {
    for (const n of list) {
      if (n.key === targetKey) {
        parents.push(...path)
        return true
      }
      if (n.children && walk(n.children, [...path, n.key])) return true
    }
    return false
  }
  walk(nodes, [])
  return parents
}

function applyStrategy(
  checkedKeys: TreeKey[],
  treeData: TreeNodeData[],
  strategy: 'SHOW_ALL' | 'SHOW_PARENT' | 'SHOW_CHILD',
): TreeKey[] {
  if (strategy === 'SHOW_ALL') return checkedKeys

  const checkedSet = new Set(checkedKeys)

  if (strategy === 'SHOW_CHILD') {
    return checkedKeys.filter((key) => {
      const node = findNode(treeData, key)
      return !node?.children || node.children.length === 0
    })
  }

  if (strategy === 'SHOW_PARENT') {
    return checkedKeys.filter((key) => {
      const parentKeys = getParentKeys(treeData, key)
      return !parentKeys.some((pk) => checkedSet.has(pk))
    })
  }

  return checkedKeys
}

/**
 * Dropdown that embeds `Tree` for single or multiple selection, optional checkboxes, and search.
 * Manages open state, filtering, and tag display for multi-value modes.
 */
export function TreeSelect(props: TreeSelectProps) {
  const {
    treeData,
    value: controlledValue,
    defaultValue,
    onChange,
    fieldNames,
    multiple = false,
    treeCheckable = false,
    treeCheckStrictly = false,
    treeDefaultExpandAll = false,
    treeDefaultExpandedKeys,
    showSearch = false,
    filterTreeNode,
    placeholder = 'Please select',
    allowClear = false,
    disabled = false,
    size = 'middle',
    maxTagCount,
    dropdownStyle,
    treeLine = false,
    showCheckedStrategy = 'SHOW_ALL',
    onSearch,
    className,
    style,
    unstyled,
  } = props

  const treeSelectLocale = useConfig().locale?.treeSelect
  const searchPlaceholder = treeSelectLocale?.searchPlaceholder ?? 'Search...'
  const noMatchesText = treeSelectLocale?.noMatches ?? 'No matches'

  const isMultiple = multiple || treeCheckable

  const [internalValue, setInternalValue] = useState<TreeKey[]>(() =>
    toArray(controlledValue ?? defaultValue),
  )
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const wrapperRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const currentValue = useMemo(
    () => toArray(controlledValue ?? internalValue),
    [controlledValue, internalValue],
  )

  useEffect(() => {
    if (controlledValue !== undefined) {
      setInternalValue(toArray(controlledValue))
    }
  }, [controlledValue])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearchValue('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (open && showSearch && searchRef.current) {
      searchRef.current.focus()
    }
  }, [open, showSearch])

  const defaultFilter = useCallback((input: string, node: TreeNodeData): boolean => {
    const title = String(node.title ?? node.key).toLowerCase()
    return title.includes(input.toLowerCase())
  }, [])

  const filterFn = filterTreeNode ?? defaultFilter

  const filteredTreeData = useMemo(() => {
    if (!searchValue) return treeData
    return filterTreeKeepMatches(treeData, (node) => filterFn(searchValue, node))
  }, [treeData, searchValue, filterFn])

  const filteredExpandedKeys = useMemo(() => {
    if (!searchValue) return undefined
    return collectAllKeys(filteredTreeData)
  }, [searchValue, filteredTreeData])

  const fireChange = useCallback(
    (keys: TreeKey[], triggerNode: TreeNodeData) => {
      setInternalValue(keys)
      const labels = keys.map((k) => getNodeLabel(findNode(treeData, k)))
      if (onChange) {
        const result = isMultiple ? keys : keys[0]
        onChange(result as TreeKey & TreeKey[], labels, { triggerNode })
      }
    },
    [treeData, onChange, isMultiple],
  )

  const handleTreeSelect = useCallback(
    (
      _selectedKeys: TreeKey[],
      info: { selected: boolean; node: TreeNodeData; selectedNodes: TreeNodeData[] },
    ) => {
      if (treeCheckable) return
      const node = info.node
      if (isMultiple) {
        const newKeys = info.selected
          ? [...currentValue, node.key]
          : currentValue.filter((k) => k !== node.key)
        fireChange(newKeys, node)
      } else {
        fireChange([node.key], node)
        setOpen(false)
        setSearchValue('')
      }
    },
    [treeCheckable, isMultiple, currentValue, fireChange],
  )

  const handleTreeCheck = useCallback(
    (
      checkedKeys: TreeKey[],
      info: {
        checked: boolean
        node: TreeNodeData
        checkedNodes: TreeNodeData[]
        halfCheckedKeys: TreeKey[]
      },
    ) => {
      const displayed = applyStrategy(checkedKeys, treeData, showCheckedStrategy)
      fireChange(displayed, info.node)
    },
    [treeData, showCheckedStrategy, fireChange],
  )

  const handleRemoveTag = useCallback(
    (key: TreeKey, e: React.MouseEvent) => {
      e.stopPropagation()
      if (disabled) return
      const node = findNode(treeData, key) ?? ({ key } as TreeNodeData)
      const newKeys = currentValue.filter((k) => k !== key)
      fireChange(newKeys, node)
    },
    [disabled, treeData, currentValue, fireChange],
  )

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (disabled) return
      const node = treeData[0] ?? ({ key: '' } as TreeNodeData)
      fireChange([], node)
      setSearchValue('')
    },
    [disabled, treeData, fireChange],
  )

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value
      setSearchValue(val)
      onSearch?.(val)
    },
    [onSearch],
  )

  const handleTriggerClick = useCallback(() => {
    if (disabled) return
    setOpen((prev) => !prev)
  }, [disabled])

  const displayedValues = useMemo(() => {
    if (!isMultiple) return currentValue
    return applyStrategy(currentValue, treeData, showCheckedStrategy)
  }, [isMultiple, currentValue, treeData, showCheckedStrategy])

  const treeCheckedKeys = useMemo(() => {
    if (!treeCheckable) return undefined
    return currentValue
  }, [treeCheckable, currentValue])

  const treeSelectedKeys = useMemo(() => {
    if (treeCheckable) return undefined
    return currentValue
  }, [treeCheckable, currentValue])

  // Unstyled render
  if (unstyled) {
    return (
      <div ref={wrapperRef} className={className} style={style}>
        <div onClick={handleTriggerClick}>
          {displayedValues.length === 0 && <span>{placeholder}</span>}
          {!isMultiple && displayedValues.length > 0 && (
            <span>{getNodeLabel(findNode(treeData, displayedValues[0]))}</span>
          )}
          {isMultiple &&
            displayedValues.map((key) => (
              <span key={String(key)}>
                {getNodeLabel(findNode(treeData, key))}
                <span onClick={(e) => handleRemoveTag(key, e)}>&times;</span>
              </span>
            ))}
        </div>
        {open && (
          <div>
            {showSearch && (
              <input
                ref={searchRef}
                value={searchValue}
                onChange={handleSearchChange}
                placeholder={searchPlaceholder}
              />
            )}
            <Tree
              treeData={filteredTreeData}
              fieldNames={fieldNames}
              checkable={treeCheckable}
              checkStrictly={treeCheckStrictly}
              checkedKeys={treeCheckedKeys}
              selectedKeys={treeSelectedKeys}
              multiple={isMultiple}
              defaultExpandAll={treeDefaultExpandAll}
              defaultExpandedKeys={treeDefaultExpandedKeys}
              expandedKeys={filteredExpandedKeys}
              showLine={treeLine}
              onSelect={handleTreeSelect}
              onCheck={handleTreeCheck}
              unstyled
            />
          </div>
        )}
      </div>
    )
  }

  // Styled render
  const wrapperCls = [
    'sg-treeselect',
    `sg-treeselect-${size}`,
    open ? 'sg-treeselect-open' : '',
    disabled ? 'sg-treeselect-disabled' : '',
    isMultiple ? 'sg-treeselect-multiple' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const visibleTags =
    maxTagCount !== undefined && isMultiple
      ? displayedValues.slice(0, maxTagCount)
      : displayedValues

  const hiddenCount =
    maxTagCount !== undefined && isMultiple ? Math.max(0, displayedValues.length - maxTagCount) : 0

  return (
    <div className={wrapperCls} style={style} ref={wrapperRef}>
      <div className="sg-treeselect-selector" onClick={handleTriggerClick}>
        <div className="sg-treeselect-selection-wrap">
          {displayedValues.length === 0 && !searchValue && (
            <span className="sg-treeselect-placeholder">{placeholder}</span>
          )}

          {!isMultiple && displayedValues.length > 0 && !searchValue && (
            <span className="sg-treeselect-selection-item">
              {getNodeLabel(findNode(treeData, displayedValues[0]))}
            </span>
          )}

          {isMultiple &&
            visibleTags.map((key) => (
              <span key={String(key)} className="sg-treeselect-tag">
                <span className="sg-treeselect-tag-label">
                  {getNodeLabel(findNode(treeData, key))}
                </span>
                <span className="sg-treeselect-tag-close" onClick={(e) => handleRemoveTag(key, e)}>
                  &times;
                </span>
              </span>
            ))}

          {hiddenCount > 0 && (
            <span className="sg-treeselect-tag sg-treeselect-tag-rest">+{hiddenCount}...</span>
          )}

          {showSearch && open && (
            <input
              ref={searchRef}
              className="sg-treeselect-search-input"
              value={searchValue}
              onChange={handleSearchChange}
              placeholder={displayedValues.length === 0 ? '' : ''}
            />
          )}
        </div>

        <div className="sg-treeselect-actions">
          {allowClear && displayedValues.length > 0 && (
            <span className="sg-treeselect-clear" onClick={handleClear}>
              &times;
            </span>
          )}
          <span className="sg-treeselect-arrow">{open ? '\u25B2' : '\u25BC'}</span>
        </div>
      </div>

      {open && (
        <div className="sg-treeselect-dropdown" style={dropdownStyle}>
          {filteredTreeData.length === 0 ? (
            <div className="sg-treeselect-empty">{noMatchesText}</div>
          ) : (
            <Tree
              treeData={filteredTreeData}
              fieldNames={fieldNames}
              checkable={treeCheckable}
              checkStrictly={treeCheckStrictly}
              checkedKeys={treeCheckedKeys}
              selectedKeys={treeSelectedKeys}
              multiple={isMultiple}
              defaultExpandAll={treeDefaultExpandAll}
              defaultExpandedKeys={treeDefaultExpandedKeys}
              expandedKeys={filteredExpandedKeys}
              showLine={treeLine}
              onSelect={handleTreeSelect}
              onCheck={handleTreeCheck}
            />
          )}
        </div>
      )}
    </div>
  )
}
