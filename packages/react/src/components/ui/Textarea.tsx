import React from 'react'
import { Spin } from './Spin'
import { useConfig } from '../ConfigProvider'
import type { BaseComponentProps, InteractiveProps, SizableProps } from '../../types'

/** Props for the multiline text field with optional character count and loading overlay. */
export interface TextareaProps extends BaseComponentProps, InteractiveProps, SizableProps {
  /** Controlled value; when omitted, uses internal state seeded by `defaultValue`. */
  value?: string
  /** Initial value when uncontrolled. */
  defaultValue?: string
  /** Placeholder shown when empty. */
  placeholder?: string
  /** Visible row count on the native textarea. @default 4 */
  rows?: number
  /** Hard cap on input length enforced in the change handler. */
  maxLength?: number
  /** Shows current length (and `maxLength` when set) beside the field in styled mode. */
  showCount?: boolean
  /** DOM id forwarded to the underlying `<textarea>`. */
  id?: string
  /** Exposes invalid state to assistive technologies. */
  'aria-invalid'?: boolean | 'false' | 'true' | 'grammar' | 'spelling'
  /** Connects the textarea to description / error nodes for assistive technologies. */
  'aria-describedby'?: string
  /** Marks the field as required for assistive technologies. */
  'aria-required'?: boolean | 'false' | 'true'
  /** Emits the full string on each change. */
  onChange?: (value: string) => void
  /** Passed through to the textarea blur event. */
  onBlur?: () => void
  /** Passed through to the textarea focus event. */
  onFocus?: () => void
}

/**
 * Styled textarea with configurable rows, optional character count, and loading state from shared interactive props.
 */
export function Textarea({
  value,
  defaultValue,
  placeholder,
  rows = 4,
  maxLength,
  showCount,
  disabled: disabledProp,
  loading,
  size: sizeProp,
  onChange,
  onBlur,
  onFocus,
  id,
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
  'aria-required': ariaRequired,
  className,
  style,
  unstyled,
}: TextareaProps) {
  const config = useConfig()
  const disabled = disabledProp ?? config.disabled
  const size = sizeProp ?? config.size ?? 'middle'

  const [internalValue, setInternalValue] = React.useState(value ?? defaultValue ?? '')
  const currentValue = value ?? internalValue

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value
    if (maxLength && v.length > maxLength) return
    setInternalValue(v)
    onChange?.(v)
  }

  const wrapperClass = unstyled
    ? className ?? ''
    : ['sg-textarea-wrapper', `sg-textarea-${size}`, loading ? 'sg-textarea-wrapper-loading' : '', className]
        .filter(Boolean)
        .join(' ')

  return (
    <div className={wrapperClass} style={style}>
      <textarea
        id={id}
        className={unstyled ? '' : 'sg-input sg-textarea'}
        value={currentValue}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled || loading}
        aria-disabled={disabled || loading}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        aria-required={ariaRequired}
        onChange={handleChange}
        onBlur={onBlur}
        onFocus={onFocus}
      />
      {loading && <Spin size="small" unstyled={unstyled} />}
      {showCount && !unstyled && (
        <span className="sg-textarea-count">
          {currentValue.length}{maxLength ? ` / ${maxLength}` : ''}
        </span>
      )}
    </div>
  )
}
