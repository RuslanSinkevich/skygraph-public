import { useState } from 'react'
import { useConfig } from '../ConfigProvider'
import type { BaseComponentProps, InteractiveProps, SizableProps } from '../../types'
import { Spin } from './Spin'

/** Estimated password strength tier used for the strength meter. */
export type PasswordStrength = 'weak' | 'medium' | 'strong' | 'very-strong'

/** Props for the password input with optional visibility toggle and strength UI. */
export interface InputPasswordProps extends BaseComponentProps, InteractiveProps, SizableProps {
  /** Controlled password value. */
  value?: string
  /** Initial value when uncontrolled. */
  defaultValue?: string
  /** Input placeholder text. */
  placeholder?: string
  /** Show a control to reveal or hide the password. @default true */
  visibilityToggle?: boolean
  /** Show a strength bar and label when the field has text. @default false */
  showStrength?: boolean
  /** Custom labels for each {@link PasswordStrength} tier (merged with defaults). */
  strengthLabels?: Record<PasswordStrength, string>
  /** Called when the password text changes. */
  onChange?: (value: string) => void
  /** Called when the input loses focus. */
  onBlur?: () => void
  /** Called when the input gains focus. */
  onFocus?: () => void
  /** Exposes validation state to assistive tech. */
  'aria-invalid'?: boolean | 'false' | 'true' | 'grammar' | 'spelling'
  /** Marks the field as required for assistive tech. */
  'aria-required'?: boolean | 'false' | 'true'
}

function getStrength(password: string): PasswordStrength {
  if (!password || password.length < 4) return 'weak'
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++
  if (score <= 1) return 'weak'
  if (score <= 2) return 'medium'
  if (score <= 3) return 'strong'
  return 'very-strong'
}

const defaultStrengthLabels: Record<PasswordStrength, string> = {
  weak: 'Weak',
  medium: 'Medium',
  strong: 'Strong',
  'very-strong': 'Very strong',
}

/**
 * Password field with optional show/hide toggle, loading state, and strength indicator.
 */
export function InputPassword({
  value,
  defaultValue,
  placeholder,
  visibilityToggle = true,
  showStrength = false,
  strengthLabels,
  size: sizeProp,
  disabled: disabledProp,
  loading,
  onChange,
  onBlur,
  onFocus,
  'aria-invalid': ariaInvalid,
  'aria-required': ariaRequired,
  className,
  style,
  unstyled,
}: InputPasswordProps) {
  const config = useConfig()
  const size = sizeProp ?? config.size ?? 'middle'
  const disabled = disabledProp ?? config.disabled ?? false
  const [visible, setVisible] = useState(false)
  const [internal, setInternal] = useState(defaultValue ?? '')
  const current = value ?? internal
  const labels = { ...defaultStrengthLabels, ...strengthLabels }

  const handleChange = (v: string) => {
    setInternal(v)
    onChange?.(v)
  }

  const strength = getStrength(current)

  if (unstyled) {
    return (
      <span className={className} style={style}>
        <input
          type={visible ? 'text' : 'password'}
          value={current}
          placeholder={placeholder}
          disabled={disabled || loading}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={onBlur}
          onFocus={onFocus}
        />
        {visibilityToggle && (
          <button type="button" onClick={() => setVisible(!visible)}>
            {visible ? 'Hide' : 'Show'}
          </button>
        )}
      </span>
    )
  }

  const wrapperClasses = [
    'sg-input-password-wrapper',
    `sg-input-password-wrapper-${size}`,
    loading ? 'sg-input-wrapper-loading' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const inputClasses = ['sg-input', 'sg-input-password', `sg-input-${size}`]
    .filter(Boolean)
    .join(' ')

  return (
    <div style={style}>
      <span className={wrapperClasses}>
        <input
          type={visible ? 'text' : 'password'}
          className={inputClasses}
          value={current}
          placeholder={placeholder}
          disabled={disabled || loading}
          aria-invalid={ariaInvalid}
          aria-required={ariaRequired}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={onBlur}
          onFocus={onFocus}
        />
        {loading && <Spin size="small" />}
        {visibilityToggle && !loading && (
          <button
            type="button"
            className="sg-input-password-toggle"
            onClick={() => setVisible(!visible)}
            tabIndex={-1}
            aria-label={
              visible
                ? (config.locale?.inputPassword?.hidePassword ?? 'Hide password')
                : (config.locale?.inputPassword?.showPassword ?? 'Show password')
            }
          >
            {visible ? '◉' : '○'}
          </button>
        )}
      </span>
      {showStrength && current.length > 0 && (
        <div className="sg-input-password-strength">
          <div className="sg-input-password-strength-bar">
            <span
              className={`sg-input-password-strength-fill sg-input-password-strength-${strength}`}
            />
          </div>
          <span
            className={`sg-input-password-strength-label sg-input-password-strength-${strength}`}
          >
            {labels[strength]}
          </span>
        </div>
      )}
    </div>
  )
}
