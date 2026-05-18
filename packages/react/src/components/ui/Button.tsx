import React from 'react'
import { Spin } from './Spin'
import { useConfig } from '../ConfigProvider'
import type { BaseComponentProps, InteractiveProps, SizableProps } from '../../types'

/** Props for the Button component. */
export interface ButtonProps extends BaseComponentProps, InteractiveProps, SizableProps {
  /** Visual style variant. @default 'default' */
  type?: 'default' | 'primary' | 'dashed' | 'text' | 'link'
  /** Native HTML button type attribute. @default 'button' */
  htmlType?: 'button' | 'submit' | 'reset'
  /**
   * Visually flags a destructive action. Combines with `type` (e.g. a
   * `danger` `primary` button is solid red, a `danger` `text` is red text).
   * Adds the `sg-button-danger` modifier class.
   * @default false
   */
  danger?: boolean
  /** Stretches the button to fill its parent container. @default false */
  block?: boolean
  /** Click event handler. */
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  /** Button content. */
  children?: React.ReactNode
}

/** General-purpose button with multiple visual variants, sizes, and loading state. */
export function Button({
  type = 'default',
  size: sizeProp,
  disabled: disabledProp,
  loading,
  htmlType = 'button',
  danger = false,
  block = false,
  onClick,
  children,
  className,
  style,
  unstyled,
}: ButtonProps) {
  const config = useConfig()
  const size = sizeProp ?? config.size ?? 'middle'
  const disabled = disabledProp ?? config.disabled ?? false

  const classes = unstyled
    ? className ?? ''
    : [
        'sg-button',
        `sg-button-${type}`,
        `sg-button-${size}`,
        danger ? 'sg-button-danger' : '',
        block ? 'sg-button-block' : '',
        loading ? 'sg-button-loading' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')

  return (
    <button
      type={htmlType}
      className={classes}
      style={style}
      disabled={disabled || loading}
      aria-disabled={disabled || loading}
      aria-busy={loading}
      onClick={onClick}
    >
      {loading && <Spin size="small" unstyled={unstyled} />}
      {children}
    </button>
  )
}
