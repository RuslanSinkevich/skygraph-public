import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useConfig } from '../../ConfigProvider'
import type { CascaderProps, CascaderOption } from './types'

function getOptionLabel(opt: CascaderOption): string {
  if (typeof opt.label === 'string') return opt.label
  if (typeof opt.label === 'number') return String(opt.label)
  return String(opt.value)
}

function findPath(options: CascaderOption[], values: (string | number)[]): CascaderOption[] {
  const path: CascaderOption[] = []
  let current = options
  for (const val of values) {
    const found = current.find((o) => o.value === val)
    if (!found) break
    path.push(found)
    current = found.children ?? []
  }
  return path
}

function collectAllPaths(
  options: CascaderOption[],
  leafOnly: boolean,
): { path: CascaderOption[]; values: (string | number)[] }[] {
  const result: { path: CascaderOption[]; values: (string | number)[] }[] = []
  const walk = (opts: CascaderOption[], current: CascaderOption[]) => {
    for (const opt of opts) {
      if (opt.disabled) continue
      const nextPath = [...current, opt]
      const isLeaf = opt.isLeaf !== false && (!opt.children || opt.children.length === 0)
      if (!leafOnly || isLeaf) {
        result.push({ path: nextPath, values: nextPath.map((o) => o.value) })
      }
      if (opt.children && opt.children.length > 0) {
        walk(opt.children, nextPath)
      }
    }
  }
  walk(options, [])
  return result
}

function defaultSearchFilter(input: string, path: CascaderOption[]): boolean {
  const lowerInput = input.toLowerCase()
  return path.some((opt) => getOptionLabel(opt).toLowerCase().includes(lowerInput))
}

function arraysEqual(a: (string | number)[], b: (string | number)[]): boolean {
  if (a.length !== b.length) return false
  return a.every((v, i) => v === b[i])
}

/**
 * Hierarchical picker with columns, optional multi-select, search, and lazy-loaded branches.
 */
export function Cascader(props: CascaderProps) {
  const {
    options,
    value: controlledValue,
    defaultValue,
    onChange,
    placeholder = 'Please select',
    allowClear = false,
    disabled = false,
    size = 'middle',
    multiple = false,
    showSearch = false,
    expandTrigger = 'click',
    changeOnSelect = false,
    displayRender,
    loadData,
    maxTagCount,
    dropdownStyle,
    className,
    style,
    unstyled,
  } = props

  const cascaderLocale = useConfig().locale?.cascader
  const searchPlaceholder = cascaderLocale?.searchPlaceholder ?? 'Search...'
  const noMatchesText = cascaderLocale?.noMatches ?? 'No matches'

  const [internalValue, setInternalValue] = useState<(string | number)[]>(
    () => controlledValue ?? defaultValue ?? [],
  )
  const [multiValues, setMultiValues] = useState<(string | number)[][]>(() => {
    if (!multiple) return []
    if (controlledValue && controlledValue.length > 0) return [controlledValue]
    if (defaultValue && defaultValue.length > 0) return [defaultValue]
    return []
  })
  const [open, setOpen] = useState(false)
  const [activeColumns, setActiveColumns] = useState<CascaderOption[][]>([options])
  const [activeValues, setActiveValues] = useState<(string | number)[]>([])
  const [searchValue, setSearchValue] = useState('')
  const [loadingValues, setLoadingValues] = useState<Set<string | number>>(new Set())
  const wrapperRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const currentValue = controlledValue ?? internalValue

  useEffect(() => {
    if (controlledValue !== undefined) {
      setInternalValue(controlledValue)
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
    if (open) {
      rebuildColumns(currentValue)
      if (showSearch && searchRef.current) {
        searchRef.current.focus()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const rebuildColumns = useCallback(
    (vals: (string | number)[]) => {
      const cols: CascaderOption[][] = [options]
      let current = options
      const active: (string | number)[] = []
      for (const val of vals) {
        const found = current.find((o) => o.value === val)
        if (!found) break
        active.push(val)
        if (found.children && found.children.length > 0) {
          cols.push(found.children)
          current = found.children
        } else {
          break
        }
      }
      setActiveColumns(cols)
      setActiveValues(active)
    },
    [options],
  )

  const fireChange = useCallback(
    (values: (string | number)[], path: CascaderOption[]) => {
      setInternalValue(values)
      onChange?.(values, path)
    },
    [onChange],
  )

  const handleOptionClick = useCallback(
    (opt: CascaderOption, colIndex: number) => {
      if (opt.disabled) return

      const newActiveValues = [...activeValues.slice(0, colIndex), opt.value]
      setActiveValues(newActiveValues)

      const newColumns = [...activeColumns.slice(0, colIndex + 1)]
      if (opt.children && opt.children.length > 0) {
        newColumns.push(opt.children)
      }
      setActiveColumns(newColumns)

      const isLeaf = opt.isLeaf !== false && (!opt.children || opt.children.length === 0)

      if (loadData && !isLeaf && (!opt.children || opt.children.length === 0) && !opt.isLeaf) {
        const path = findPath(options, newActiveValues)
        setLoadingValues((prev) => new Set(prev).add(opt.value))
        loadData(path)
        setTimeout(() => {
          setLoadingValues((prev) => {
            const next = new Set(prev)
            next.delete(opt.value)
            return next
          })
          rebuildColumns(newActiveValues)
        }, 0)
      }

      if (multiple) {
        if (isLeaf) {
          const path = findPath(options, newActiveValues)
          const exists = multiValues.some((mv) => arraysEqual(mv, newActiveValues))
          if (exists) {
            const newMulti = multiValues.filter((mv) => !arraysEqual(mv, newActiveValues))
            setMultiValues(newMulti)
            onChange?.(newActiveValues, path)
          } else {
            const newMulti = [...multiValues, newActiveValues]
            setMultiValues(newMulti)
            onChange?.(newActiveValues, path)
          }
        }
        return
      }

      if (isLeaf || changeOnSelect) {
        const path = findPath(options, newActiveValues)
        fireChange(newActiveValues, path)
        if (isLeaf) {
          setOpen(false)
          setSearchValue('')
        }
      }
    },
    [
      activeValues,
      activeColumns,
      options,
      multiple,
      multiValues,
      changeOnSelect,
      loadData,
      fireChange,
      rebuildColumns,
      onChange,
    ],
  )

  const handleOptionHover = useCallback(
    (opt: CascaderOption, colIndex: number) => {
      if (expandTrigger !== 'hover' || opt.disabled) return
      const newActiveValues = [...activeValues.slice(0, colIndex), opt.value]
      setActiveValues(newActiveValues)

      const newColumns = [...activeColumns.slice(0, colIndex + 1)]
      if (opt.children && opt.children.length > 0) {
        newColumns.push(opt.children)
      }
      setActiveColumns(newColumns)
    },
    [expandTrigger, activeValues, activeColumns],
  )

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (disabled) return
      if (multiple) {
        setMultiValues([])
      }
      fireChange([], [])
      setSearchValue('')
    },
    [disabled, multiple, fireChange],
  )

  const handleRemoveMulti = useCallback(
    (index: number, e: React.MouseEvent) => {
      e.stopPropagation()
      if (disabled) return
      const newMulti = multiValues.filter((_, i) => i !== index)
      setMultiValues(newMulti)
    },
    [disabled, multiValues],
  )

  const handleTriggerClick = useCallback(() => {
    if (disabled) return
    setOpen((prev) => !prev)
  }, [disabled])

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value)
  }, [])

  const searchFilter = useMemo(() => {
    if (!showSearch) return null
    if (typeof showSearch === 'object' && showSearch.filter) return showSearch.filter
    return defaultSearchFilter
  }, [showSearch])

  const searchResults = useMemo(() => {
    if (!searchValue || !searchFilter) return null
    const allPaths = collectAllPaths(options, !changeOnSelect)
    return allPaths.filter(({ path }) => searchFilter(searchValue, path))
  }, [searchValue, searchFilter, options, changeOnSelect])

  const handleSearchSelect = useCallback(
    (values: (string | number)[], path: CascaderOption[]) => {
      if (multiple) {
        const exists = multiValues.some((mv) => arraysEqual(mv, values))
        if (exists) {
          setMultiValues(multiValues.filter((mv) => !arraysEqual(mv, values)))
        } else {
          setMultiValues([...multiValues, values])
        }
        onChange?.(values, path)
      } else {
        fireChange(values, path)
        setOpen(false)
        setSearchValue('')
      }
    },
    [multiple, multiValues, fireChange, onChange],
  )

  const getDisplayText = useCallback((): React.ReactNode => {
    if (multiple) return null
    if (currentValue.length === 0) return null
    const path = findPath(options, currentValue)
    if (path.length === 0) return null
    const labels = path.map(getOptionLabel)
    if (displayRender) return displayRender(labels, path)
    return labels.join(' / ')
  }, [multiple, currentValue, options, displayRender])

  const displayText = getDisplayText()

  const isMultiChecked = useCallback(
    (values: (string | number)[]): boolean => {
      return multiValues.some((mv) => arraysEqual(mv, values))
    },
    [multiValues],
  )

  // Unstyled render
  if (unstyled) {
    return (
      <div ref={wrapperRef} className={className} style={style}>
        <div onClick={handleTriggerClick}>
          {!multiple && !displayText && <span>{placeholder}</span>}
          {!multiple && displayText && <span>{displayText}</span>}
          {multiple && multiValues.length === 0 && <span>{placeholder}</span>}
          {multiple &&
            multiValues.map((mv, i) => {
              const path = findPath(options, mv)
              return (
                <span key={i}>
                  {path.map(getOptionLabel).join(' / ')}
                  <span onClick={(e) => handleRemoveMulti(i, e)}>&times;</span>
                </span>
              )
            })}
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
            {searchResults ? (
              <div>
                {searchResults.map(({ path, values }) => (
                  <div key={values.join('-')} onClick={() => handleSearchSelect(values, path)}>
                    {path.map(getOptionLabel).join(' / ')}
                  </div>
                ))}
                {searchResults.length === 0 && <div>{noMatchesText}</div>}
              </div>
            ) : (
              <div style={{ display: 'flex' }}>
                {activeColumns.map((col, colIndex) => (
                  <div key={colIndex}>
                    {col.map((opt) => (
                      <div
                        key={opt.value}
                        onClick={() => handleOptionClick(opt, colIndex)}
                        onMouseEnter={() => handleOptionHover(opt, colIndex)}
                      >
                        {opt.label}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Styled render
  const wrapperCls = [
    'sg-cascader',
    `sg-cascader-${size}`,
    open ? 'sg-cascader-open' : '',
    disabled ? 'sg-cascader-disabled' : '',
    multiple ? 'sg-cascader-multiple' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const visibleMulti =
    maxTagCount !== undefined && multiple ? multiValues.slice(0, maxTagCount) : multiValues

  const hiddenCount =
    maxTagCount !== undefined && multiple ? Math.max(0, multiValues.length - maxTagCount) : 0

  return (
    <div className={wrapperCls} style={style} ref={wrapperRef}>
      <div className="sg-cascader-selector" onClick={handleTriggerClick}>
        <div className="sg-cascader-selection-wrap">
          {!multiple && !displayText && !searchValue && (
            <span className="sg-cascader-placeholder">{placeholder}</span>
          )}

          {!multiple && displayText && !searchValue && (
            <span className="sg-cascader-selection-item">{displayText}</span>
          )}

          {multiple && multiValues.length === 0 && !searchValue && (
            <span className="sg-cascader-placeholder">{placeholder}</span>
          )}

          {multiple &&
            visibleMulti.map((mv, i) => {
              const path = findPath(options, mv)
              return (
                <span key={i} className="sg-cascader-tag">
                  <span className="sg-cascader-tag-label">
                    {path.map(getOptionLabel).join(' / ')}
                  </span>
                  <span className="sg-cascader-tag-close" onClick={(e) => handleRemoveMulti(i, e)}>
                    &times;
                  </span>
                </span>
              )
            })}

          {hiddenCount > 0 && (
            <span className="sg-cascader-tag sg-cascader-tag-rest">+{hiddenCount}...</span>
          )}

          {showSearch && open && (
            <input
              ref={searchRef}
              className="sg-cascader-search-input"
              value={searchValue}
              onChange={handleSearchChange}
              placeholder={searchPlaceholder}
            />
          )}
        </div>

        <div className="sg-cascader-actions">
          {allowClear && (currentValue.length > 0 || multiValues.length > 0) && (
            <span className="sg-cascader-clear" onClick={handleClear}>
              &times;
            </span>
          )}
          <span className="sg-cascader-arrow">{open ? '\u25B2' : '\u25BC'}</span>
        </div>
      </div>

      {open && (
        <div className="sg-cascader-dropdown" style={dropdownStyle}>
          {searchResults ? (
            <div className="sg-cascader-search-list">
              {searchResults.map(({ path, values }) => {
                const checked = multiple && isMultiChecked(values)
                return (
                  <div
                    key={values.join('-')}
                    className={[
                      'sg-cascader-search-item',
                      checked ? 'sg-cascader-search-item-checked' : '',
                      !multiple && arraysEqual(values, currentValue)
                        ? 'sg-cascader-search-item-active'
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => handleSearchSelect(values, path)}
                  >
                    {multiple && (
                      <span
                        className={`sg-cascader-search-check ${checked ? 'sg-cascader-search-check-active' : ''}`}
                      >
                        {checked ? '✓' : ''}
                      </span>
                    )}
                    <span className="sg-cascader-search-label">
                      {path.map((opt, i) => (
                        <React.Fragment key={opt.value}>
                          {i > 0 && <span className="sg-cascader-search-separator"> / </span>}
                          <span>{getOptionLabel(opt)}</span>
                        </React.Fragment>
                      ))}
                    </span>
                  </div>
                )
              })}
              {searchResults.length === 0 && (
                <div className="sg-cascader-empty">{noMatchesText}</div>
              )}
            </div>
          ) : (
            <div className="sg-cascader-columns">
              {activeColumns.map((col, colIndex) => (
                <div key={colIndex} className="sg-cascader-column">
                  {col.map((opt) => {
                    const isActive = activeValues[colIndex] === opt.value
                    const hasChildren = opt.children && opt.children.length > 0
                    const isLoading = loadingValues.has(opt.value)
                    const isChecked =
                      multiple &&
                      multiValues.some(
                        (mv) => mv[colIndex] === opt.value && mv.length === colIndex + 1,
                      )

                    return (
                      <div
                        key={opt.value}
                        className={[
                          'sg-cascader-option',
                          isActive ? 'sg-cascader-option-active' : '',
                          opt.disabled ? 'sg-cascader-option-disabled' : '',
                          isLoading ? 'sg-cascader-option-loading' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => handleOptionClick(opt, colIndex)}
                        onMouseEnter={() => handleOptionHover(opt, colIndex)}
                      >
                        {multiple && (
                          <span
                            className={`sg-cascader-option-check ${isChecked ? 'sg-cascader-option-check-active' : ''}`}
                          >
                            {isChecked ? '✓' : ''}
                          </span>
                        )}
                        <span className="sg-cascader-option-label">{opt.label}</span>
                        {hasChildren && !isLoading && (
                          <span className="sg-cascader-option-expand">▸</span>
                        )}
                        {isLoading && (
                          <span className="sg-cascader-option-expand sg-cascader-option-spinner">
                            ⟳
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
