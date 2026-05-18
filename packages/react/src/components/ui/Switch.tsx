import React from 'react'
import { useConfig } from '../ConfigProvider'
import type { BaseComponentProps, InteractiveProps, SizableProps } from '../../types'
import { Spin } from './Spin'

/** Props for the Switch component. */
export interface SwitchProps extends BaseComponentProps, InteractiveProps, SizableProps {
  /** Controlled on state. */
  checked?: boolean
  /** Uncontrolled initial on state. */
  defaultChecked?: boolean
  /** Called when the switch is toggled. */
  onChange?: (checked: boolean) => void
  /** Content shown while the switch is on. */
  checkedChildren?: React.ReactNode
  /** Content shown while the switch is off. */
  unCheckedChildren?: React.ReactNode
}

/** Toggle switch with optional on/off slot content and loading state. */
export function Switch({
  checked,
  defaultChecked,
  disabled: disabledProp,
  loading,
  size: sizeProp,
  onChange,
  checkedChildren,
  unCheckedChildren,
  className,
  style,
  unstyled,
}: SwitchProps) {
  const config = useConfig()
  const disabled = disabledProp ?? config.disabled ?? false
  const resolvedSize = sizeProp ?? config.size ?? 'middle'
  const switchSizeClass = resolvedSize === 'small' ? 'small' : 'default'

  const [internalChecked, setInternalChecked] = React.useState(
    checked ?? defaultChecked ?? false
  )
  const isChecked = checked ?? internalChecked

  const handleClick = () => {
    if (disabled || loading) return
    const next = !isChecked
    setInternalChecked(next)
    onChange?.(next)
  }

  if (unstyled) {
    return (
      <button
        role="switch"
        aria-checked={isChecked}
        disabled={disabled || loading}
        onClick={handleClick}
        className={className}
        style={style}
      >
        {loading && <Spin size="small" unstyled />}
        {isChecked ? checkedChildren : unCheckedChildren}
      </button>
    )
  }

  const classes = [
    'sg-switch',
    `sg-switch-${switchSizeClass}`,
    isChecked ? 'sg-switch-checked' : '',
    disabled || loading ? 'sg-switch-disabled' : '',
    loading ? 'sg-switch-loading' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      role="switch"
      aria-checked={isChecked}
      disabled={disabled || loading}
      onClick={handleClick}
      className={classes}
      style={style}
    >
      <span className="sg-switch-inner">
        {loading ? (
          <Spin size="small" unstyled={unstyled} />
        ) : (
          isChecked ? checkedChildren : unCheckedChildren
        )}
      </span>
      <span className="sg-switch-handle" />
    </button>
  )
}
