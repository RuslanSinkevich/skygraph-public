import type React from 'react'

/** Available component size variants. */
export type SizeType = 'small' | 'middle' | 'large'

/** Common props shared by all Skygraph components. */
export interface BaseComponentProps {
  /** Additional CSS class name. */
  className?: string
  /** Inline CSS styles. */
  style?: React.CSSProperties
  /** When `true`, all built-in styles are stripped — the component renders bare semantic HTML. */
  unstyled?: boolean
}

/** Props for components that support disabled / loading states. */
export interface InteractiveProps {
  /** Disables the component, preventing user interaction. */
  disabled?: boolean
  /** Shows a loading indicator and disables the component. */
  loading?: boolean
}

/** Props for components that support sizing. */
export interface SizableProps {
  /** Component size variant. */
  size?: SizeType
}
