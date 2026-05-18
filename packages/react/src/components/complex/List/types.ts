import type React from 'react'
import type { SlotClassNames, SlotStyles } from '../../../types'

/**
 * Имена слотов `List`. Полный список и описания — `docs/styling-contract.md` §4.2.
 */
export type ListSlot =
  | 'root'
  | 'header'
  | 'footer'
  | 'items'
  | 'item'
  | 'empty'
  | 'pagination'

export type ListClassNames = SlotClassNames<ListSlot>
export type ListStyles = SlotStyles<ListSlot>

/** Props for a generic list with optional pagination, grid layout, and loading state. */
export interface ListProps<T = any> {
  /** Items to render. */
  dataSource: T[]
  /** Renders one item; `index` reflects order in the current page when paginated. */
  renderItem: (item: T, index: number) => React.ReactNode
  /** Content above the list body. */
  header?: React.ReactNode
  /** Content below the list body. */
  footer?: React.ReactNode
  /**
   * Wraps the list in a loading state.
   * @default false
   */
  loading?: boolean
  /** "Load more" action area below items. */
  loadMore?: React.ReactNode
  /** Client pagination config, or `false` to disable. */
  pagination?: false | {
    /** Current page (controlled). */
    current?: number
    /** Items per page. */
    pageSize?: number
    /** Total items for the pager; defaults to `dataSource.length`. */
    total?: number
    /** Fired when the page changes. */
    onChange?: (page: number, pageSize: number) => void
  }
  /** CSS grid layout for items. */
  grid?: {
    /** Gap between grid cells in pixels. */
    gutter?: number
    /** Column count in the grid. */
    column?: number
    /** Columns at extra-small breakpoint. */
    xs?: number
    /** Columns at small breakpoint. */
    sm?: number
    /** Columns at medium breakpoint. */
    md?: number
    /** Columns at large breakpoint. */
    lg?: number
  }
  /**
   * List density preset.
   * @default 'default'
   */
  size?: 'small' | 'default' | 'large'
  /**
   * Shows dividers between items when `true`.
   * @default true
   */
  split?: boolean
  /**
   * Outlines the list container when `true`.
   * @default false
   */
  bordered?: boolean
  /** Localized strings for the list chrome. */
  locale?: {
    /** Message when `dataSource` is empty. */
    emptyText?: React.ReactNode
  }
  /** Root class name. */
  className?: string
  /** Root inline styles. */
  style?: React.CSSProperties
  /** Renders without Skygraph list styles. */
  unstyled?: boolean

  /** Virtualizes rendering for large lists. Fixed item height required. */
  virtual?: {
    /** Fixed item height in pixels. */
    itemHeight: number
    /** Fixed container height in pixels. */
    height: number
    /** Extra items above/below viewport. @default 5 */
    overscan?: number
  }

  /** Enables click-to-select items. */
  selectable?: boolean
  /** Controlled selected item indices. */
  selectedKeys?: number[]
  /** Default selected indices. */
  defaultSelectedKeys?: number[]
  /** Fires when selection changes. */
  onSelectionChange?: (keys: number[], items: T[]) => void
  /** Multi-select (hold Ctrl/Cmd). @default false */
  multiSelect?: boolean

  /** Enables drag-and-drop reorder. */
  draggable?: boolean
  /** Fires after items are reordered via drag. */
  onReorder?: (fromIndex: number, toIndex: number) => void

  /** Row hover highlight. @default true */
  hoverable?: boolean

  /** Row click handler. */
  onItemClick?: (item: T, index: number) => void

  /** Row class name (static or per-item). */
  rowClassName?: string | ((item: T, index: number) => string)

  /** Публичные классы по слотам. См. `docs/styling-contract.md` §4.2. */
  classNames?: ListClassNames
  /** Публичные стили по слотам. См. `docs/styling-contract.md` §4.2. */
  styles?: ListStyles
}

/** Props for `List.Item` row layout. */
export interface ListItemProps {
  /** Main cell content. */
  children?: React.ReactNode
  /** Inline actions rendered after the main content. */
  actions?: React.ReactNode[]
  /** Secondary column aligned to the end of the row. */
  extra?: React.ReactNode
  /** Class name on the item root. */
  className?: string
  /** Inline styles on the item root. */
  style?: React.CSSProperties
}

/** Props for `List.Item.Meta` avatar/title/description block. */
export interface ListItemMetaProps {
  /** Leading visual (e.g. avatar). */
  avatar?: React.ReactNode
  /** Primary line. */
  title?: React.ReactNode
  /** Secondary line under the title. */
  description?: React.ReactNode
}
