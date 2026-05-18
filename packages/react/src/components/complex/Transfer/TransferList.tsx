import React from 'react'
import { Checkbox } from '../../ui/Checkbox'
import { Input } from '../../ui/Input'
import { Pagination } from '../../ui/Pagination'
import type { TransferItem, TransferListProps } from './types'

function cls(...parts: (string | false | undefined | null)[]): string {
  return parts.filter(Boolean).join(' ')
}

const DEFAULT_PAGE_SIZE = 10

/**
 * Single-column checklist with optional search, select-all, pagination, drag-reorder, and footer.
 * Used as the source and target panes of `Transfer`.
 */
export function TransferList({
  items,
  selectedKeys,
  onSelect,
  title,
  render,
  showSearch,
  filterOption,
  searchPlaceholder,
  showSelectAll = true,
  disabled,
  pagination,
  locale,
  direction,
  unstyled,
  footer,
  sortable,
  onSort,
  onSearch,
  listHeight,
  listClassName,
}: TransferListProps) {
  const [searchValue, setSearchValue] = React.useState('')
  const [currentPage, setCurrentPage] = React.useState(1)
  const [dragKey, setDragKey] = React.useState<string | null>(null)
  const [dropKey, setDropKey] = React.useState<string | null>(null)

  const filteredItems = React.useMemo(() => {
    if (!searchValue) return items
    const filter = filterOption ?? ((input: string, item: TransferItem) =>
      item.title.toLowerCase().includes(input.toLowerCase())
    )
    return items.filter(item => filter(searchValue, item))
  }, [items, searchValue, filterOption])

  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchValue])

  const handleSearchChange = React.useCallback((value: string) => {
    setSearchValue(value)
    onSearch?.(direction, value)
  }, [onSearch, direction])

  const pageSize = pagination
    ? (typeof pagination === 'object' ? pagination.pageSize ?? DEFAULT_PAGE_SIZE : DEFAULT_PAGE_SIZE)
    : filteredItems.length

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)

  const visibleItems = React.useMemo(() => {
    if (!pagination) return filteredItems
    const start = (safePage - 1) * pageSize
    return filteredItems.slice(start, start + pageSize)
  }, [filteredItems, pagination, safePage, pageSize])

  const enabledItems = filteredItems.filter(i => !i.disabled)
  const allChecked = enabledItems.length > 0 && enabledItems.every(i => selectedKeys.includes(i.key))
  const someChecked = enabledItems.some(i => selectedKeys.includes(i.key))
  const indeterminate = someChecked && !allChecked

  const handleSelectAll = (checked: boolean) => {
    if (disabled) return
    if (checked) {
      const enabledKeys = enabledItems.map(i => i.key)
      const merged = Array.from(new Set([...selectedKeys, ...enabledKeys]))
      onSelect(merged)
    } else {
      const enabledKeySet = new Set(enabledItems.map(i => i.key))
      onSelect(selectedKeys.filter(k => !enabledKeySet.has(k)))
    }
  }

  const handleItemCheck = (key: string, checked: boolean) => {
    if (disabled) return
    if (checked) {
      onSelect([...selectedKeys, key])
    } else {
      onSelect(selectedKeys.filter(k => k !== key))
    }
  }

  const handleDragStart = React.useCallback((e: React.DragEvent, key: string) => {
    if (!sortable || disabled) return
    setDragKey(key)
    e.dataTransfer.effectAllowed = 'move'
  }, [sortable, disabled])

  const handleDragOver = React.useCallback((e: React.DragEvent, key: string) => {
    if (!sortable || !dragKey) return
    e.preventDefault()
    setDropKey(key)
  }, [sortable, dragKey])

  const handleDrop = React.useCallback((e: React.DragEvent, key: string) => {
    e.preventDefault()
    if (!sortable || !dragKey || dragKey === key) {
      setDragKey(null)
      setDropKey(null)
      return
    }
    const keys = items.map(i => i.key)
    const fromIdx = keys.indexOf(dragKey)
    const toIdx = keys.indexOf(key)
    if (fromIdx === -1 || toIdx === -1) return
    const next = [...keys]
    const [moved] = next.splice(fromIdx, 1)
    next.splice(toIdx, 0, moved)
    onSort?.(direction, next)
    setDragKey(null)
    setDropKey(null)
  }, [sortable, dragKey, items, direction, onSort])

  const handleDragEnd = React.useCallback(() => {
    setDragKey(null)
    setDropKey(null)
  }, [])

  const selectedCount = items.filter(i => selectedKeys.includes(i.key)).length
  const unitLabel = items.length === 1 ? locale.itemUnit : locale.itemsUnit
  const countText = selectedCount > 0
    ? `${selectedCount}/${items.length} ${unitLabel}`
    : `${items.length} ${unitLabel}`

  const resolvedListClassName = typeof listClassName === 'function' ? listClassName(direction) : (listClassName ?? '')

  if (unstyled) {
    return (
      <div data-direction={direction}>
        {title && <div>{title}</div>}
        {showSelectAll && (
          <Checkbox
            unstyled
            checked={allChecked}
            indeterminate={indeterminate}
            disabled={disabled || enabledItems.length === 0}
            onChange={handleSelectAll}
          >
            {allChecked ? locale.deselectAll : locale.selectAll}
          </Checkbox>
        )}
        <span>{countText}</span>
        {showSearch && (
          <Input
            unstyled
            value={searchValue}
            placeholder={searchPlaceholder ?? locale.searchPlaceholder}
            onChange={handleSearchChange}
          />
        )}
        {visibleItems.length === 0 ? (
          <div>{locale.notFoundContent}</div>
        ) : (
          <ul>
            {visibleItems.map(item => (
              <li
                key={item.key}
                draggable={sortable && !disabled && !item.disabled}
                onDragStart={(e) => handleDragStart(e, item.key)}
                onDragOver={(e) => handleDragOver(e, item.key)}
                onDrop={(e) => handleDrop(e, item.key)}
                onDragEnd={handleDragEnd}
              >
                <Checkbox
                  unstyled
                  checked={selectedKeys.includes(item.key)}
                  disabled={disabled || item.disabled}
                  onChange={checked => handleItemCheck(item.key, checked)}
                >
                  {render ? render(item) : item.title}
                </Checkbox>
              </li>
            ))}
          </ul>
        )}
        {pagination && filteredItems.length > pageSize && (
          <Pagination
            unstyled
            current={safePage}
            total={filteredItems.length}
            pageSize={pageSize}
            onChange={setCurrentPage}
            simple
          />
        )}
        {footer}
      </div>
    )
  }

  return (
    <div className={cls('sg-transfer-list', disabled && 'sg-transfer-list-disabled', resolvedListClassName)}>
      <div className="sg-transfer-list-header">
        {showSelectAll && (
          <Checkbox
            checked={allChecked}
            indeterminate={indeterminate}
            disabled={disabled || enabledItems.length === 0}
            onChange={handleSelectAll}
          />
        )}
        <span className="sg-transfer-list-header-count">{countText}</span>
        {title && <span className="sg-transfer-list-header-title">{title}</span>}
      </div>

      {showSearch && (
        <div className="sg-transfer-list-search">
          <Input
            size="small"
            value={searchValue}
            placeholder={searchPlaceholder ?? locale.searchPlaceholder}
            onChange={handleSearchChange}
          />
        </div>
      )}

      <div
        className="sg-transfer-list-body"
        style={listHeight ? { height: listHeight, overflow: 'auto' } : undefined}
      >
        {visibleItems.length === 0 ? (
          <div className="sg-transfer-list-empty">{locale.notFoundContent}</div>
        ) : (
          <ul className="sg-transfer-list-content">
            {visibleItems.map(item => {
              const isDragging = dragKey === item.key
              const isDropTarget = dropKey === item.key && dragKey !== item.key

              return (
                <li
                  key={item.key}
                  className={cls(
                    'sg-transfer-list-item',
                    selectedKeys.includes(item.key) && 'sg-transfer-list-item-selected',
                    (disabled || item.disabled) && 'sg-transfer-list-item-disabled',
                    isDragging && 'sg-transfer-list-item-dragging',
                    isDropTarget && 'sg-transfer-list-item-drop-target',
                  )}
                  draggable={sortable && !disabled && !item.disabled}
                  onDragStart={(e) => handleDragStart(e, item.key)}
                  onDragOver={(e) => handleDragOver(e, item.key)}
                  onDrop={(e) => handleDrop(e, item.key)}
                  onDragEnd={handleDragEnd}
                  onDragLeave={() => setDropKey(null)}
                >
                  {sortable && !disabled && !item.disabled && (
                    <span className="sg-transfer-list-item-drag-handle">⠿</span>
                  )}
                  <Checkbox
                    checked={selectedKeys.includes(item.key)}
                    disabled={disabled || item.disabled}
                    onChange={checked => handleItemCheck(item.key, checked)}
                  >
                    <span className="sg-transfer-list-item-text">
                      {render ? render(item) : item.title}
                    </span>
                  </Checkbox>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {pagination && filteredItems.length > pageSize && (
        <div className="sg-transfer-list-pagination">
          <Pagination
            current={safePage}
            total={filteredItems.length}
            pageSize={pageSize}
            onChange={setCurrentPage}
            simple
          />
        </div>
      )}

      {footer && (
        <div className="sg-transfer-list-footer">{footer}</div>
      )}
    </div>
  )
}
