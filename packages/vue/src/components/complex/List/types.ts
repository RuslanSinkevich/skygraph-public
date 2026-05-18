/**
 * Slot names for `SgList`. Mirrors React `ListSlot`.
 */
export type ListSlot = 'root' | 'header' | 'footer' | 'items' | 'item' | 'empty' | 'pagination'

export type ListClassNames = Partial<Record<ListSlot, string>>
export type ListStyles = Partial<Record<ListSlot, Record<string, string | number>>>

export interface ListPaginationConfig {
  current?: number
  pageSize?: number
  total?: number
  onChange?: (page: number, pageSize: number) => void
}

export interface ListGridConfig {
  gutter?: number
  column?: number
  xs?: number
  sm?: number
  md?: number
  lg?: number
}

export interface ListVirtualConfig {
  itemHeight: number
  height: number
  overscan?: number
}

export interface ListLocale {
  emptyText?: string
}

export interface ListProps<T = unknown> {
  /** Items to render. */
  dataSource: T[]
  /** Content above the list body (use `header` slot for VNode content). */
  header?: string
  /** Content below the list body (use `footer` slot for VNode content). */
  footer?: string
  /** Wraps the list in a loading state. @default false */
  loading?: boolean
  /** Pagination config or `false` to disable. */
  pagination?: false | ListPaginationConfig
  /** CSS grid layout for items. */
  grid?: ListGridConfig
  /** List density preset. @default 'default' */
  size?: 'small' | 'default' | 'large'
  /** Shows dividers between items when `true`. @default true */
  split?: boolean
  /** Outlines the list container when `true`. @default false */
  bordered?: boolean
  /** Localized strings for the list chrome. */
  locale?: ListLocale
  /** Renders without Skygraph list styles. */
  unstyled?: boolean
  /** Virtualizes rendering for large lists. Fixed item height required. */
  virtual?: ListVirtualConfig
  /** Enables click-to-select items. */
  selectable?: boolean
  /** Controlled selected item indices. */
  selectedKeys?: number[]
  /** Default selected indices. */
  defaultSelectedKeys?: number[]
  /** Multi-select (hold Ctrl/Cmd). @default false */
  multiSelect?: boolean
  /** Enables drag-and-drop reorder. */
  draggable?: boolean
  /** Row hover highlight. @default true */
  hoverable?: boolean
  /** Row class name (static or per-item). */
  rowClassName?: string | ((item: T, index: number) => string)
  /** Public class names per slot. */
  classNames?: ListClassNames
  /** Public inline styles per slot. */
  styles?: ListStyles
}
