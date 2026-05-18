import React from 'react'
import { Spin } from '../../ui/Spin'
import { Pagination } from '../../ui/Pagination'
import { Empty } from '../../ui/Empty'
import type { ListProps, ListItemProps, ListItemMetaProps } from './types'

function cls(...parts: (string | false | undefined | null)[]): string {
  return parts.filter(Boolean).join(' ')
}

function ListItemMeta({ avatar, title, description }: ListItemMetaProps) {
  return (
    <div className="sg-list-item-meta">
      {avatar && <div className="sg-list-item-meta-avatar">{avatar}</div>}
      <div className="sg-list-item-meta-content">
        {title && <h4 className="sg-list-item-meta-title">{title}</h4>}
        {description && <div className="sg-list-item-meta-description">{description}</div>}
      </div>
    </div>
  )
}

function ListItemComponent({ children, actions, extra, className, style }: ListItemProps) {
  return (
    <div className={cls('sg-list-item', className)} style={style}>
      <div className="sg-list-item-main">
        <div className="sg-list-item-content">{children}</div>
        {actions && actions.length > 0 && (
          <ul className="sg-list-item-actions">
            {actions.map((action, i) => (
              <li key={i} className="sg-list-item-action">
                {action}
              </li>
            ))}
          </ul>
        )}
      </div>
      {extra && <div className="sg-list-item-extra">{extra}</div>}
    </div>
  )
}

type ListItemType = typeof ListItemComponent & { Meta: typeof ListItemMeta }

const Item = ListItemComponent as ListItemType
Item.Meta = ListItemMeta

function ListInner<T = any>({
  dataSource,
  renderItem,
  header,
  footer,
  loading = false,
  loadMore,
  pagination,
  grid,
  size = 'default',
  split = true,
  bordered = false,
  locale,
  className,
  style,
  unstyled,
  virtual,
  selectable,
  selectedKeys: controlledSelectedKeys,
  defaultSelectedKeys,
  onSelectionChange,
  multiSelect = false,
  draggable,
  onReorder,
  hoverable = true,
  onItemClick,
  rowClassName,
  classNames: slotCls,
  styles: slotSty,
}: ListProps<T>) {
  const sCls = slotCls ?? {}
  const sSty = slotSty ?? {}
  const [internalPage, setInternalPage] = React.useState(1)
  const [internalSelectedKeys, setInternalSelectedKeys] = React.useState<number[]>(
    () => defaultSelectedKeys ?? [],
  )
  const [dragIndex, setDragIndex] = React.useState<number | null>(null)
  const [dropIndex, setDropIndex] = React.useState<number | null>(null)
  const [scrollTop, setScrollTop] = React.useState(0)
  const virtualRef = React.useRef<HTMLDivElement>(null)

  const selectedKeys = controlledSelectedKeys ?? internalSelectedKeys

  const pageSize = pagination ? (pagination.pageSize ?? 10) : dataSource.length
  const currentPage = pagination ? (pagination.current ?? internalPage) : 1
  const total = pagination ? (pagination.total ?? dataSource.length) : dataSource.length

  const paginatedData = React.useMemo(() => {
    if (!pagination) return dataSource
    const start = (currentPage - 1) * pageSize
    return dataSource.slice(start, start + pageSize)
  }, [dataSource, pagination, currentPage, pageSize])

  const handlePageChange = (page: number) => {
    setInternalPage(page)
    if (pagination) {
      pagination.onChange?.(page, pageSize)
    }
  }

  const handleItemClick = React.useCallback(
    (item: T, index: number, e: React.MouseEvent) => {
      onItemClick?.(item, index)

      if (!selectable) return

      let next: number[]
      if (multiSelect && (e.ctrlKey || e.metaKey)) {
        if (selectedKeys.includes(index)) {
          next = selectedKeys.filter((k) => k !== index)
        } else {
          next = [...selectedKeys, index]
        }
      } else {
        next = selectedKeys.includes(index) ? [] : [index]
      }

      setInternalSelectedKeys(next)
      onSelectionChange?.(
        next,
        next.map((k) => dataSource[k]),
      )
    },
    [selectable, multiSelect, selectedKeys, dataSource, onItemClick, onSelectionChange],
  )

  const handleDragStart = React.useCallback(
    (e: React.DragEvent, index: number) => {
      if (!draggable) return
      setDragIndex(index)
      e.dataTransfer.effectAllowed = 'move'
    },
    [draggable],
  )

  const handleDragOver = React.useCallback(
    (e: React.DragEvent, index: number) => {
      if (!draggable || dragIndex === null) return
      e.preventDefault()
      setDropIndex(index)
    },
    [draggable, dragIndex],
  )

  const handleDrop = React.useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault()
      if (dragIndex === null || dragIndex === index) {
        setDragIndex(null)
        setDropIndex(null)
        return
      }
      onReorder?.(dragIndex, index)
      setDragIndex(null)
      setDropIndex(null)
    },
    [dragIndex, onReorder],
  )

  const handleDragEnd = React.useCallback(() => {
    setDragIndex(null)
    setDropIndex(null)
  }, [])

  const handleVirtualScroll = React.useCallback(() => {
    if (virtualRef.current) {
      setScrollTop(virtualRef.current.scrollTop)
    }
  }, [])

  const emptyText = locale?.emptyText ?? 'No Data'

  const gridStyle = React.useMemo((): React.CSSProperties | undefined => {
    if (!grid) return undefined
    const cols = grid.column ?? 1
    // Базовое значение кладём в отдельную переменную, чтобы media-override на
    // корне (`--sg-list-grid-columns`) мог перебить её через наследование CSS-переменных
    // и не пришлось использовать `!important`.
    return {
      ['--sg-list-grid-base-columns' as string]: `repeat(${cols}, 1fr)`,
      gap: grid.gutter ? `${grid.gutter}px` : undefined,
    } as React.CSSProperties
  }, [grid])

  const gridResponsiveClass = React.useMemo(() => {
    if (!grid) return ''
    const parts: string[] = []
    if (grid.xs) parts.push(`sg-list-grid-xs-${grid.xs}`)
    if (grid.sm) parts.push(`sg-list-grid-sm-${grid.sm}`)
    if (grid.md) parts.push(`sg-list-grid-md-${grid.md}`)
    if (grid.lg) parts.push(`sg-list-grid-lg-${grid.lg}`)
    return parts.join(' ')
  }, [grid])

  const renderItemWrapper = React.useCallback(
    (item: T, index: number, extraStyle?: React.CSSProperties) => {
      const isSelected = selectable && selectedKeys.includes(index)
      const isDragging = dragIndex === index
      const isDropTarget = dropIndex === index && dragIndex !== index
      const extraCls =
        typeof rowClassName === 'function' ? rowClassName(item, index) : (rowClassName ?? '')

      const itemCls = cls(
        'sg-list-item',
        selectable && 'sg-list-item-selectable',
        isSelected && 'sg-list-item-selected',
        hoverable && 'sg-list-item-hoverable',
        isDragging && 'sg-list-item-dragging',
        isDropTarget && 'sg-list-item-drop-target',
        sCls.item,
        extraCls,
      )

      return (
        <div
          key={index}
          className={itemCls || undefined}
          style={extraStyle ? { ...sSty.item, ...extraStyle } : sSty.item}
          onClick={(e) => handleItemClick(item, index, e)}
          draggable={draggable}
          onDragStart={(e) => handleDragStart(e, index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDrop={(e) => handleDrop(e, index)}
          onDragEnd={handleDragEnd}
          onDragLeave={() => setDropIndex(null)}
        >
          {draggable && <span className="sg-list-drag-handle">⠿</span>}
          {renderItem(item, index)}
        </div>
      )
    },
    [
      selectable,
      selectedKeys,
      hoverable,
      dragIndex,
      dropIndex,
      draggable,
      rowClassName,
      handleItemClick,
      handleDragStart,
      handleDragOver,
      handleDrop,
      handleDragEnd,
      renderItem,
      sCls.item,
      sSty.item,
    ],
  )

  /**
   * Virtual scroll rendering.
   *
   * Каждая видимая строка позиционируется абсолютно на своём `top = index * itemHeight`
   * с фиксированной высотой `itemHeight`. Это даёт стабильную верстку независимо
   * от внутренних паддингов `.sg-list-item` и от того, оборачивает ли пользователь
   * содержимое в `<List.Item>` или возвращает голый `<div>`.
   *
   * Старый рендер (поток items внутри одного `position: absolute` блока) ломался,
   * когда фактическая высота строки не совпадала с `itemHeight` — overscan вылезал
   * за scroll-область, scroll-позиция не сходилась.
   */
  const renderVirtualList = React.useCallback(() => {
    if (!virtual) return null
    const { itemHeight, height, overscan = 5 } = virtual
    const totalHeight = paginatedData.length * itemHeight
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const visibleCount = Math.ceil(height / itemHeight) + overscan * 2
    const endIndex = Math.min(paginatedData.length, startIndex + visibleCount)

    return (
      <div
        ref={virtualRef}
        className="sg-list-virtual-container"
        style={{ height, overflow: 'auto', position: 'relative' }}
        onScroll={handleVirtualScroll}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          {paginatedData.slice(startIndex, endIndex).map((item, i) => {
            const realIndex = startIndex + i
            return renderItemWrapper(item, realIndex, {
              position: 'absolute',
              top: realIndex * itemHeight,
              left: 0,
              right: 0,
              height: itemHeight,
              boxSizing: 'border-box',
              alignItems: 'center',
            })
          })}
        </div>
      </div>
    )
  }, [virtual, paginatedData, scrollTop, handleVirtualScroll, renderItemWrapper])

  if (unstyled) {
    return (
      <div className={className} style={style}>
        {header}
        {loading ? (
          <Spin unstyled />
        ) : paginatedData.length === 0 ? (
          <div>{emptyText}</div>
        ) : virtual ? (
          renderVirtualList()
        ) : (
          <div className={grid ? 'sg-list-items' : undefined} style={gridStyle}>
            {paginatedData.map((item, i) => renderItemWrapper(item, i))}
          </div>
        )}
        {loadMore}
        {pagination && (
          <Pagination
            unstyled
            current={currentPage}
            total={total}
            pageSize={pageSize}
            onChange={handlePageChange}
          />
        )}
        {footer}
      </div>
    )
  }

  const wrapperClass = cls(
    'sg-list',
    `sg-list-${size}`,
    split && 'sg-list-split',
    bordered && 'sg-list-bordered',
    loading && 'sg-list-loading',
    grid && 'sg-list-grid',
    selectable && 'sg-list-selectable',
    draggable && 'sg-list-draggable',
    virtual && 'sg-list-virtual',
    gridResponsiveClass,
    sCls.root,
    className,
  )

  return (
    <div className={wrapperClass} style={{ ...sSty.root, ...style }}>
      {header && (
        <div className={cls('sg-list-header', sCls.header)} style={sSty.header}>
          {header}
        </div>
      )}

      <Spin spinning={loading}>
        {paginatedData.length === 0 ? (
          <div className={cls('sg-list-empty', sCls.empty)} style={sSty.empty}>
            <Empty description={emptyText} />
          </div>
        ) : virtual ? (
          renderVirtualList()
        ) : (
          <div className={cls('sg-list-items', sCls.items)} style={{ ...gridStyle, ...sSty.items }}>
            {paginatedData.map((item, i) => renderItemWrapper(item, i))}
          </div>
        )}
      </Spin>

      {loadMore && <div className="sg-list-load-more">{loadMore}</div>}

      {pagination && (
        <div className={cls('sg-list-pagination', sCls.pagination)} style={sSty.pagination}>
          <Pagination
            current={currentPage}
            total={total}
            pageSize={pageSize}
            onChange={handlePageChange}
          />
        </div>
      )}

      {footer && (
        <div className={cls('sg-list-footer', sCls.footer)} style={sSty.footer}>
          {footer}
        </div>
      )}
    </div>
  )
}

type ListType = typeof ListInner & { Item: ListItemType }

/**
 * Renders a vertical or grid list with optional header, footer, pagination, loading,
 * virtual scroll, selection, and drag-and-drop reorder.
 * Use `List.Item` and `List.Item.Meta` for structured rows.
 */
export const List = ListInner as ListType
;(List as any).Item = Item
