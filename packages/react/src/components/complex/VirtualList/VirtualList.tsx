import React, { forwardRef, useImperativeHandle } from 'react'
import { useVirtualScroll } from '../../../hooks/useVirtualScroll'
import type { VirtualItem } from '@skygraph/core'

/** Props for the virtualized fixed-height item list. */
export interface VirtualListProps<T = unknown> {
  /** Full dataset; only visible indices are rendered. */
  data: T[]
  /** Fixed row height or per-index height resolver in pixels. */
  itemHeight: number | ((index: number) => number)
  /** Extra rows rendered above and below the viewport. */
  overscan?: number
  /** Renders one item with absolute positioning styles applied by the list. */
  renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode
  /** Scrolling container class name. */
  className?: string
  /** Scrolling container inline style. */
  style?: React.CSSProperties
  /** Stable React key for each item; defaults to row index. */
  itemKey?: (item: T, index: number) => React.Key
}

/** Imperative API for `VirtualList`. */
export interface VirtualListRef {
  /**
   * Scrolls so the item at `index` is visible.
   * @param align - Where to place the item in the viewport.
   */
  scrollToIndex: (index: number, align?: 'start' | 'center' | 'end') => void
}

function VirtualListInner<T>(
  props: VirtualListProps<T>,
  ref: React.ForwardedRef<VirtualListRef>,
) {
  const {
    data,
    itemHeight,
    overscan,
    renderItem,
    className,
    style,
    itemKey,
  } = props

  const { range, containerRef, scrollToIndex } = useVirtualScroll({
    itemCount: data.length,
    itemHeight,
    overscan,
  })

  useImperativeHandle(ref, () => ({ scrollToIndex }), [scrollToIndex])

  return (
    <div
      ref={containerRef as React.RefObject<HTMLDivElement>}
      className={className}
      style={{
        overflow: 'auto',
        position: 'relative',
        ...style,
      }}
    >
      <div style={{ height: range.totalHeight, position: 'relative' }}>
        {range.visibleItems.map((vi: VirtualItem) => {
          const item = data[vi.index]
          const key = itemKey ? itemKey(item, vi.index) : vi.index
          const itemStyle: React.CSSProperties = {
            position: 'absolute',
            top: vi.offsetTop,
            left: 0,
            right: 0,
            height: vi.height,
          }
          return (
            <React.Fragment key={key}>
              {renderItem(item, vi.index, itemStyle)}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Virtualized scroll container: mounts row content only for items near the viewport.
 * Forwards a ref with `scrollToIndex` for programmatic scrolling.
 */
export const VirtualList = forwardRef(VirtualListInner) as <T>(
  props: VirtualListProps<T> & { ref?: React.Ref<VirtualListRef> },
) => React.ReactElement
