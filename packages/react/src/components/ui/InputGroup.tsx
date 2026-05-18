import React from 'react'
import { useConfig } from '../ConfigProvider'
import type { BaseComponentProps, SizableProps } from '../../types'

/** Props for grouping an input with optional prefix and suffix addons. */
export interface InputGroupProps extends BaseComponentProps, SizableProps {
  /** Tight visual spacing between addons and the control. @default true */
  compact?: boolean
  /** Content rendered before the main child (e.g. icon or select). */
  before?: React.ReactNode
  /** Content rendered after the main child. */
  after?: React.ReactNode
  /** Primary control (typically an input). */
  children: React.ReactNode
}

/** Horizontally composes a control with optional leading and trailing slots. */
export function InputGroup({
  compact = true,
  before,
  after,
  size: sizeProp,
  children,
  className,
  style,
  unstyled,
}: InputGroupProps) {
  const config = useConfig()
  const size = sizeProp ?? config.size ?? 'middle'

  if (unstyled) {
    return (
      <span className={className} style={style}>
        {before}
        {children}
        {after}
      </span>
    )
  }

  const classes = [
    'sg-input-group',
    `sg-input-group-${size}`,
    compact ? 'sg-input-group-compact' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <span className={classes} style={style}>
      {before && <span className="sg-input-group-addon">{before}</span>}
      {children}
      {after && <span className="sg-input-group-addon">{after}</span>}
    </span>
  )
}
