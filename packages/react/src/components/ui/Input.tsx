import React from 'react'
import { useConfig } from '../ConfigProvider'
import type { BaseComponentProps, InteractiveProps, SizableProps } from '../../types'
import { Spin } from './Spin'

/** Props for the Input component. */
export interface InputProps extends BaseComponentProps, InteractiveProps, SizableProps {
  /** Controlled input value. */
  value?: string
  /** Uncontrolled initial value. */
  defaultValue?: string
  /** Placeholder text when the field is empty. */
  placeholder?: string
  /** Native HTML input type. @default 'text' */
  type?: 'text' | 'email' | 'password' | 'number'
  /**
   * Marks the field as read-only. The value is selectable and submitted
   * but cannot be edited. Sets the HTML `readonly` attribute,
   * `aria-readonly="true"`, and adds the `sg-input-readonly` modifier class.
   * @default false
   */
  readOnly?: boolean
  /** DOM id forwarded to the underlying `<input>`. */
  id?: string
  /**
   * When true, renders a clear (×) button while the field has a value.
   * Disabled and read-only fields hide the button. @default false
   */
  allowClear?: boolean
  /**
   * Validation status badge. Adds `sg-input-wrapper-status-{status}` and
   * `sg-input-status-{status}` modifier classes and sets `aria-invalid` when
   * `error`.
   */
  status?: 'error' | 'warning'
  /** Optional content rendered before the `<input>` (e.g. icon). */
  prefix?: React.ReactNode
  /** Optional content rendered after the `<input>` (e.g. icon, unit). */
  suffix?: React.ReactNode
  /** Exposes invalid state to assistive technologies. */
  'aria-invalid'?: boolean | 'false' | 'true' | 'grammar' | 'spelling'
  /** Marks the field as required for assistive technologies. */
  'aria-required'?: boolean | 'false' | 'true'
  /** Connects the input to description / error nodes for assistive technologies. */
  'aria-describedby'?: string
  /** Called when the text value changes. */
  onChange?: (value: string) => void
  /** Called when the input loses focus. */
  onBlur?: () => void
  /** Called when the input gains focus. */
  onFocus?: () => void
  /** Called when the user activates the built-in clear button. */
  onClear?: () => void
}

/** Single-line text input with optional loading indicator and configurable HTML type. */
export function Input({
  value,
  defaultValue,
  placeholder,
  type = 'text',
  readOnly = false,
  size: sizeProp,
  disabled: disabledProp,
  loading,
  allowClear = false,
  status,
  prefix,
  suffix,
  onChange,
  onBlur,
  onFocus,
  onClear,
  'aria-invalid': ariaInvalid,
  'aria-required': ariaRequired,
  'aria-describedby': ariaDescribedBy,
  id,
  className,
  style,
  unstyled,
}: InputProps) {
  const config = useConfig()
  const size = sizeProp ?? config.size ?? 'middle'
  const disabled = disabledProp ?? config.disabled ?? false

  const [internalValue, setInternalValue] = React.useState<string>(defaultValue ?? '')
  const currentValue = value ?? internalValue
  const isControlled = value !== undefined

  const wrapperClasses = unstyled
    ? (className ?? '')
    : [
        'sg-input-wrapper',
        `sg-input-wrapper-${size}`,
        loading ? 'sg-input-wrapper-loading' : '',
        readOnly ? 'sg-input-wrapper-readonly' : '',
        status ? `sg-input-wrapper-status-${status}` : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')

  const inputClasses = unstyled
    ? ''
    : [
        'sg-input',
        `sg-input-${size}`,
        readOnly ? 'sg-input-readonly' : '',
        status ? `sg-input-status-${status}` : '',
      ]
        .filter(Boolean)
        .join(' ')

  const clearLabel = config.locale?.input?.clear ?? 'Clear'
  const showClear = allowClear && !disabled && !readOnly && !loading && currentValue !== ''

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isControlled) setInternalValue(e.target.value)
    onChange?.(e.target.value)
  }

  const handleClear = () => {
    if (!isControlled) setInternalValue('')
    onChange?.('')
    onClear?.()
  }

  const resolvedAriaInvalid = ariaInvalid ?? (status === 'error' ? true : undefined)

  return (
    <span className={wrapperClasses} style={style}>
      {prefix && <span className="sg-input-prefix">{prefix}</span>}
      <input
        id={id}
        type={type}
        className={inputClasses}
        value={currentValue}
        placeholder={placeholder}
        disabled={disabled || loading}
        readOnly={readOnly}
        aria-invalid={resolvedAriaInvalid}
        aria-required={ariaRequired}
        aria-readonly={readOnly || undefined}
        aria-describedby={ariaDescribedBy}
        onChange={handleChange}
        onBlur={onBlur}
        onFocus={onFocus}
      />
      {showClear && (
        <button
          type="button"
          className="sg-input-clear"
          aria-label={clearLabel}
          onClick={handleClear}
        >
          ×
        </button>
      )}
      {loading && <Spin size="small" unstyled={unstyled} />}
      {suffix && <span className="sg-input-suffix">{suffix}</span>}
    </span>
  )
}
