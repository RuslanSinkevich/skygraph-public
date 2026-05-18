import React from 'react'
import { useConfig } from '../ConfigProvider'
import type { BaseComponentProps, SizableProps } from '../../types'

/** Props for the Tag component (label with optional close control). */
export interface TagProps extends BaseComponentProps, SizableProps {
  /** Preset semantic color or any CSS color string for custom tags. @default 'default' */
  color?: 'default' | 'success' | 'error' | 'warning' | 'processing' | string
  /** Shows a close control when true. */
  closable?: boolean
  /** Called when the close control is activated. */
  onClose?: () => void
  /** Whether to show a border around the tag. @default true */
  bordered?: boolean
  /** Tag label content. */
  children: React.ReactNode
}

const presetColors = new Set(['default', 'success', 'error', 'warning', 'processing'])

/**
 * Inline label tag with optional preset colors and closable behavior.
 */
export function Tag({
  color = 'default',
  closable,
  onClose,
  bordered = true,
  children,
  className,
  style,
  unstyled,
}: TagProps) {
  const closeAriaLabel = useConfig().locale?.tag?.closeAriaLabel ?? 'Close'
  if (unstyled) {
    return (
      <span className={className} style={style}>
        {children}
        {closable && (
          <span onClick={onClose} role="button">
            ×
          </span>
        )}
      </span>
    )
  }

  const isPreset = presetColors.has(color)
  const classes = [
    'sg-tag',
    isPreset ? `sg-tag-${color}` : '',
    bordered ? '' : 'sg-tag-borderless',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const customStyle: React.CSSProperties = isPreset
    ? { ...style }
    : { ...style, background: color, borderColor: color, color: '#fff' }

  return (
    <span className={classes} style={customStyle}>
      {children}
      {closable && (
        <span
          className="sg-tag-close"
          onClick={(e) => {
            e.stopPropagation()
            onClose?.()
          }}
          role="button"
          aria-label={closeAriaLabel}
        >
          ×
        </span>
      )}
    </span>
  )
}
