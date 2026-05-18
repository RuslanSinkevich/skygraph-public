/**
 * Dashboard types — simplified Vue port.
 *
 * Trims `actions` menu and editor specifics. Layout shape (CSS-grid x/y/w/h)
 * matches React.
 *
 * NOTE: We intentionally type `style` as a loose record instead of Vue's
 * `CSSProperties` because importing `csstype` here surfaces the
 * `TS2742: inferred type cannot be named without a reference to
 * '.pnpm/csstype@.../node_modules/csstype'` error when downstream consumers
 * type-check against this package. The looser shape is structurally
 * compatible with `CSSProperties` for the call sites we care about.
 */

export type DashboardStyle = Record<string, string | number | undefined>

export interface DashboardWidget {
  id: string
  title?: string
  x: number
  y: number
  w?: number
  h?: number
  className?: string
  style?: DashboardStyle
}

export interface DashboardProps {
  widgets: readonly DashboardWidget[]
  /** Number of columns in the grid. @default 12 */
  columns?: number
  /** Row height in pixels. @default 80 */
  rowHeight?: number
  /** Gap between widgets in pixels. @default 8 */
  gap?: number
  className?: string
  style?: DashboardStyle
  unstyled?: boolean
}

export interface DashboardEditorProps extends DashboardProps {
  /** Allow drag-to-move on widget headers. @default true */
  draggable?: boolean
  /** Allow resize via SE-corner handle. @default true */
  resizable?: boolean
  /** Min column span. @default 1 */
  minW?: number
  /** Min row span. @default 1 */
  minH?: number
}

export interface DashboardExpose {
  print: (opts?: { fileName?: string }) => void
}
