import type React from 'react'

/** One row in a transfer list. */
export interface TransferItem {
  /** Stable unique key. */
  key: string
  /** Primary label text. */
  title: string
  /** Secondary description line. */
  description?: string
  /** Disables selection and move for this item. */
  disabled?: boolean
}

/** Props for the `Transfer` shuttle component. */
export interface TransferProps {
  /** Full item list; membership in `targetKeys` determines the right column. */
  dataSource: TransferItem[]
  /** Keys currently placed in the target (right) list. */
  targetKeys: string[]
  /** Fires after items move left or right. */
  onChange?: (targetKeys: string[], direction: 'left' | 'right', moveKeys: string[]) => void
  /** Controlled selected keys in both lists combined. */
  selectedKeys?: string[]
  /** Fires when selection changes in either list. */
  onSelectChange?: (sourceSelectedKeys: string[], targetSelectedKeys: string[]) => void
  /** Titles for source and target column headers. */
  titles?: [React.ReactNode, React.ReactNode]
  /** Custom render for a list row body. */
  render?: (item: TransferItem) => React.ReactNode
  /** @default false */
  showSearch?: boolean
  /** Predicate for search filtering; defaults to title substring match. */
  filterOption?: (inputValue: string, item: TransferItem) => boolean
  /** Search input placeholder override. */
  searchPlaceholder?: string
  /** @default true */
  showSelectAll?: boolean
  /** @default false */
  disabled?: boolean
  /** When true, hides the move-to-left control. */
  oneWay?: boolean
  /** Enables client pagination for long lists. */
  pagination?: boolean | { pageSize?: number }
  /** Localized labels for list chrome. */
  locale?: {
    /** Singular unit label in counts. */
    itemUnit?: string
    /** Plural unit label in counts. */
    itemsUnit?: string
    /** Default search placeholder. */
    searchPlaceholder?: string
    /** Empty filtered list content. */
    notFoundContent?: React.ReactNode
    /** Select-all checkbox label. */
    selectAll?: string
    /** Deselect-all checkbox label. */
    deselectAll?: string
  }
  /** Root element class name. */
  className?: string
  /** Root element inline style. */
  style?: React.CSSProperties
  /** Renders semantic structure without Skygraph list styles. */
  unstyled?: boolean

  /** Footer content for each panel [source, target]. */
  footer?: [React.ReactNode, React.ReactNode] | ((props: { direction: 'left' | 'right' }) => React.ReactNode)
  /** Custom operations area between the lists. */
  operations?: [React.ReactNode, React.ReactNode]
  /** Style for operations area. */
  operationsStyle?: React.CSSProperties
  /** Enables drag-and-drop reorder within each list. */
  sortable?: boolean
  /** Fires when items are reordered via drag in a list. */
  onSort?: (direction: 'left' | 'right', keys: string[]) => void
  /** Shows item count per list. @default true */
  showCount?: boolean
  /** Called when search value changes in either list. */
  onSearch?: (direction: 'left' | 'right', value: string) => void
  /** Fixed height for the list body. */
  listHeight?: number
  /** Custom class per list. */
  listClassName?: string | ((direction: 'left' | 'right') => string)
}

/** Props for one column list inside `Transfer`. */
export interface TransferListProps {
  /** Items shown in this column after filtering. */
  items: TransferItem[]
  /** Keys selected in this column. */
  selectedKeys: string[]
  /** Replaces selection for this column. */
  onSelect: (keys: string[]) => void
  /** Column header title node. */
  title?: React.ReactNode
  /** Custom item body render. */
  render?: (item: TransferItem) => React.ReactNode
  /** Shows filter input above the list. */
  showSearch?: boolean
  /** Custom search filter predicate. */
  filterOption?: (inputValue: string, item: TransferItem) => boolean
  /** Search input placeholder. */
  searchPlaceholder?: string
  /** @default true */
  showSelectAll?: boolean
  /** Disables all interactions in the list. */
  disabled?: boolean
  /** Client pagination config or boolean to use defaults. */
  pagination?: boolean | { pageSize?: number }
  /** Resolved strings for counts and actions. */
  locale: Required<TransferLocale>
  /** Which transfer side this list represents. */
  direction: 'left' | 'right'
  /** Unstyled list rendering. */
  unstyled?: boolean
  /** Footer content. */
  footer?: React.ReactNode
  /** Enables drag-and-drop reorder. */
  sortable?: boolean
  /** Fires when items are reordered via drag. */
  onSort?: (direction: 'left' | 'right', keys: string[]) => void
  /** Called when search changes. */
  onSearch?: (direction: 'left' | 'right', value: string) => void
  /** Fixed height for the list body. */
  listHeight?: number
  /** Custom class for the list. */
  listClassName?: string | ((direction: 'left' | 'right') => string)
}

/** Optional strings merged into `DEFAULT_TRANSFER_LOCALE`. */
export interface TransferLocale {
  /** Singular item unit label. */
  itemUnit?: string
  /** Plural items unit label. */
  itemsUnit?: string
  /** Search field placeholder. */
  searchPlaceholder?: string
  /** Empty state when filter matches nothing. */
  notFoundContent?: React.ReactNode
  /** Select-all control label. */
  selectAll?: string
  /** Deselect-all control label. */
  deselectAll?: string
}

export const DEFAULT_TRANSFER_LOCALE: Required<TransferLocale> = {
  itemUnit: 'item',
  itemsUnit: 'items',
  searchPlaceholder: 'Search here',
  notFoundContent: 'Not Found',
  selectAll: 'Select all',
  deselectAll: 'Deselect all',
}
