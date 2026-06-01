import React from 'react'
import { useConfig } from '../ConfigProvider'
import type { BaseComponentProps, InteractiveProps } from '../../types'
import { Spin } from './Spin'

/** One selectable option in a radio group. */
export interface RadioOption {
  /** Visible label for the option. */
  label: string
  /** Value emitted when this option is selected. */
  value: string | number
  /** Disables this option regardless of group-level disabled state. */
  disabled?: boolean
}

/** Props for the RadioGroup component. */
export interface RadioGroupProps extends BaseComponentProps, InteractiveProps {
  /** Controlled selected value. */
  value?: string | number
  /** Uncontrolled initial selected value. */
  defaultValue?: string | number
  /** Options rendered as radio controls. */
  options: RadioOption[]
  /** Stacks options horizontally or vertically. @default 'horizontal' */
  direction?: 'horizontal' | 'vertical'
  /** Called when the selected value changes. */
  onChange?: (value: string | number) => void
}

/** Mutually exclusive radio options in a horizontal or vertical group. */
export function RadioGroup({
  value,
  defaultValue,
  options,
  direction = 'horizontal',
  disabled: disabledProp,
  loading,
  onChange,
  className,
  style,
  unstyled,
}: RadioGroupProps) {
  const config = useConfig()
  const disabled = disabledProp ?? config.disabled ?? false

  const [internalValue, setInternalValue] = React.useState(value ?? defaultValue)
  const currentValue = value ?? internalValue

  const groupClass = unstyled
    ? (className ?? '')
    : [
        'sg-radio-group',
        `sg-radio-group-${direction}`,
        loading ? 'sg-radio-group-loading' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')

  return (
    <div className={groupClass} role="radiogroup" style={style}>
      {options.map((opt) => (
        <label
          key={opt.value}
          className={
            unstyled
              ? ''
              : [
                  'sg-radio',
                  currentValue === opt.value ? 'sg-radio-checked' : '',
                  opt.disabled || disabled || loading ? 'sg-radio-disabled' : '',
                ]
                  .filter(Boolean)
                  .join(' ')
          }
        >
          <input
            type="radio"
            role="radio"
            aria-checked={currentValue === opt.value}
            className={unstyled ? '' : 'sg-radio-input'}
            checked={currentValue === opt.value}
            disabled={opt.disabled || disabled || loading}
            onChange={() => {
              setInternalValue(opt.value)
              onChange?.(opt.value)
            }}
          />
          {!unstyled && <span className="sg-radio-box" aria-hidden="true" />}
          <span className={unstyled ? '' : 'sg-radio-label'}>{opt.label}</span>
          {loading && currentValue === opt.value && <Spin size="small" unstyled={unstyled} />}
        </label>
      ))}
    </div>
  )
}
