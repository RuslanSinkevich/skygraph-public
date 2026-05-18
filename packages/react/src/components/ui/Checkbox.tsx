import React from 'react'
import { useConfig } from '../ConfigProvider'
import type { BaseComponentProps, InteractiveProps } from '../../types'
import { Spin } from './Spin'

/** Props for the Checkbox component. */
export interface CheckboxProps extends BaseComponentProps, InteractiveProps {
  /** Controlled checked state. */
  checked?: boolean
  /** Uncontrolled initial checked state. */
  defaultChecked?: boolean
  /** Renders the native checkbox in indeterminate state. */
  indeterminate?: boolean
  /** Called when the checked state changes. */
  onChange?: (checked: boolean) => void
  /** Label content beside the control. */
  children?: React.ReactNode
}

/** Labeled checkbox with indeterminate support and optional loading state. */
export function Checkbox({
  checked,
  defaultChecked,
  disabled: disabledProp,
  loading,
  indeterminate,
  onChange,
  children,
  className,
  style,
  unstyled,
}: CheckboxProps) {
  const config = useConfig()
  const disabled = disabledProp ?? config.disabled ?? false

  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate ?? false
    }
  }, [indeterminate])

  const wrapperClass = unstyled
    ? className ?? ''
    : [
        'sg-checkbox',
        disabled || loading ? 'sg-checkbox-disabled' : '',
        loading ? 'sg-checkbox-loading' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')

  return (
    <label className={wrapperClass} style={style}>
      <input
        ref={inputRef}
        type="checkbox"
        aria-checked={checked}
        className={unstyled ? '' : 'sg-checkbox-input'}
        checked={checked}
        defaultChecked={defaultChecked}
        disabled={disabled || loading}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      {children && (
        <span className={unstyled ? '' : 'sg-checkbox-label'}>{children}</span>
      )}
      {loading && <Spin size="small" unstyled={unstyled} />}
    </label>
  )
}
