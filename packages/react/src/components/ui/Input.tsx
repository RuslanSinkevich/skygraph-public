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
  onChange,
  onBlur,
  onFocus,
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

  const wrapperClasses = unstyled
    ? className ?? ''
    : [
        'sg-input-wrapper',
        `sg-input-wrapper-${size}`,
        loading ? 'sg-input-wrapper-loading' : '',
        readOnly ? 'sg-input-wrapper-readonly' : '',
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
      ]
        .filter(Boolean)
        .join(' ')

  return (
    <span className={wrapperClasses} style={style}>
      <input
        id={id}
        type={type}
        className={inputClasses}
        value={value}
        defaultValue={defaultValue}
        placeholder={placeholder}
        disabled={disabled || loading}
        readOnly={readOnly}
        aria-invalid={ariaInvalid}
        aria-required={ariaRequired}
        aria-readonly={readOnly || undefined}
        aria-describedby={ariaDescribedBy}
        onChange={(e) => onChange?.(e.target.value)}
        onBlur={onBlur}
        onFocus={onFocus}
      />
      {loading && <Spin size="small" unstyled={unstyled} />}
    </span>
  )
}
