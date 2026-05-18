import React, { useMemo } from 'react'
import { useFormContext } from '../FormContext'
import { useConfig } from '../../ConfigProvider'
import type { BaseComponentProps, InteractiveProps } from '../../../types'

/** Supported input kinds for form field rendering and inference. */
export type FieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'email'
  | 'url'
  | 'date'
  | 'time'
  | 'textarea'
  | 'select'
  | 'multiselect'
  | 'password'
  | 'color'
  | 'slider'
  | 'rate'
  | 'file'
  | 'switch'
  | 'radio'

/** Single choice label/value pair for select, multiselect, or radio fields. */
export interface AutoFieldOption {
  /** Display text for the option. */
  label: string
  /** Stored value when the option is selected. */
  value: string | number
}

/** Props for a form field that picks its control from field name, value shape, and `type`. */
export interface AutoFieldProps extends BaseComponentProps, InteractiveProps {
  /** Form field key used with `useFormContext`. */
  name: string
  /** Caption shown above the control (or inline for checkbox/switch). */
  label?: React.ReactNode
  /** Forces a control type; otherwise inferred from value and `options`. */
  type?: FieldType
  /** Options for select, multiselect, or radio types. */
  options?: AutoFieldOption[]
  /** Placeholder or empty-option label where applicable. */
  placeholder?: string
  /** Minimum numeric or range value. */
  min?: number
  /** Maximum numeric, range, or star rating count. */
  max?: number
  /** Step for number inputs and range sliders. */
  step?: number
  /** `accept` attribute for file inputs. */
  accept?: string
  /** Allows multiple files when type is `file`. */
  multiple?: boolean
}

/**
 * Renders an appropriate input for a form field based on `type`, options, and current value.
 * Reads and writes through `FormContext` using `name`.
 */
export function AutoField(props: AutoFieldProps) {
  const {
    name,
    label,
    type: forcedType,
    options,
    placeholder,
    disabled: disabledProp,
    className,
    style,
    min,
    max,
    step,
    accept,
    multiple,
  } = props
  const config = useConfig()
  const disabled = disabledProp ?? config.disabled
  const { form } = useFormContext()

  const value = form.getValue(name)
  const meta = form.getFieldState(name)

  const inferredType = useMemo((): FieldType => {
    if (forcedType) return forcedType
    if (options && options.length > 0) return 'select'
    if (typeof value === 'boolean') return 'boolean'
    if (typeof value === 'number') return 'number'
    if (typeof value === 'string') {
      if (value.includes('@')) return 'email'
      if (value.startsWith('http')) return 'url'
    }
    return 'string'
  }, [forcedType, options, value])

  const handleChange = (newValue: unknown) => {
    form.setValue(name, newValue)
  }

  const errorId = `${name}-error`
  const hasErrors = meta.errors.length > 0
  const hasWarnings = meta.warnings.length > 0

  const wrapperStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    ...style,
  }

  const inputStyle: React.CSSProperties = {
    padding: '6px 12px',
    border: `1px solid ${hasErrors ? 'var(--sg-error, #ff4d4f)' : hasWarnings ? 'var(--sg-warning, #faad14)' : 'var(--sg-border, #d9d9d9)'}`,
    borderRadius: 'var(--sg-radius, 6px)',
    fontSize: 14,
    outline: 'none',
    background: disabled ? 'var(--sg-bg-disabled, #f5f5f5)' : 'var(--sg-bg, #fff)',
  }

  function renderInput() {
    switch (inferredType) {
      case 'boolean':
      case 'switch':
        return (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => handleChange(e.target.checked)}
              disabled={disabled}
              role={inferredType === 'switch' ? 'switch' : undefined}
            />
            {label}
          </label>
        )

      case 'number':
        return (
          <input
            type="number"
            value={value == null ? '' : String(value)}
            onChange={(e) => handleChange(e.target.value === '' ? null : Number(e.target.value))}
            onBlur={() => form.onFieldBlur(name)}
            placeholder={placeholder}
            disabled={disabled}
            min={min}
            max={max}
            step={step}
            style={inputStyle}
            aria-invalid={hasErrors}
            aria-describedby={hasErrors ? errorId : undefined}
          />
        )

      case 'textarea':
        return (
          <textarea
            value={value == null ? '' : String(value)}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={() => form.onFieldBlur(name)}
            placeholder={placeholder}
            disabled={disabled}
            style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
            aria-invalid={hasErrors}
            aria-describedby={hasErrors ? errorId : undefined}
          />
        )

      case 'select':
        return (
          <select
            value={value == null ? '' : String(value)}
            onChange={(e) => handleChange(e.target.value)}
            disabled={disabled}
            style={inputStyle}
            aria-invalid={hasErrors}
            aria-describedby={hasErrors ? errorId : undefined}
          >
            <option value="">{placeholder ?? '-- Select --'}</option>
            {options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )

      case 'multiselect':
        return (
          <select
            multiple
            value={Array.isArray(value) ? value.map(String) : []}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, (o) => o.value)
              handleChange(selected)
            }}
            disabled={disabled}
            style={{ ...inputStyle, minHeight: 80 }}
            aria-invalid={hasErrors}
            aria-describedby={hasErrors ? errorId : undefined}
          >
            {options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )

      case 'radio':
        return (
          <div role="radiogroup" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {options?.map((opt) => (
              <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name={name}
                  value={opt.value}
                  checked={value === opt.value}
                  onChange={() => handleChange(opt.value)}
                  disabled={disabled}
                />
                {opt.label}
              </label>
            ))}
          </div>
        )

      case 'date':
        return (
          <input
            type="date"
            value={value == null ? '' : String(value)}
            onChange={(e) => handleChange(e.target.value)}
            disabled={disabled}
            style={inputStyle}
            aria-invalid={hasErrors}
            aria-describedby={hasErrors ? errorId : undefined}
          />
        )

      case 'time':
        return (
          <input
            type="time"
            value={value == null ? '' : String(value)}
            onChange={(e) => handleChange(e.target.value)}
            disabled={disabled}
            style={inputStyle}
            aria-invalid={hasErrors}
            aria-describedby={hasErrors ? errorId : undefined}
          />
        )

      case 'password':
        return (
          <input
            type="password"
            value={value == null ? '' : String(value)}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={() => form.onFieldBlur(name)}
            placeholder={placeholder}
            disabled={disabled}
            style={inputStyle}
            aria-invalid={hasErrors}
            aria-describedby={hasErrors ? errorId : undefined}
          />
        )

      case 'color':
        return (
          <input
            type="color"
            value={value == null ? '#000000' : String(value)}
            onChange={(e) => handleChange(e.target.value)}
            disabled={disabled}
            style={{ ...inputStyle, padding: 2, width: 48, height: 32 }}
          />
        )

      case 'slider':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="range"
              value={value == null ? (min ?? 0) : Number(value)}
              onChange={(e) => handleChange(Number(e.target.value))}
              min={min ?? 0}
              max={max ?? 100}
              step={step ?? 1}
              disabled={disabled}
              style={{ flex: 1 }}
            />
            <span style={{ minWidth: 32, textAlign: 'right', fontSize: 14 }}>
              {String(value ?? min ?? 0)}
            </span>
          </div>
        )

      case 'rate': {
        const maxStars = max ?? 5
        const currentRate = typeof value === 'number' ? value : 0
        return (
          <div style={{ display: 'flex', gap: 2 }}>
            {Array.from({ length: maxStars }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => !disabled && handleChange(i + 1)}
                disabled={disabled}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: disabled ? 'default' : 'pointer',
                  fontSize: 20,
                  color: i < currentRate ? 'var(--sg-warning, #faad14)' : 'var(--sg-border, #d9d9d9)',
                  padding: 0,
                }}
                aria-label={`${i + 1} star${i !== 0 ? 's' : ''}`}
              >
                ★
              </button>
            ))}
          </div>
        )
      }

      case 'file':
        return (
          <input
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={(e) => {
              const files = e.target.files
              if (files) handleChange(multiple ? Array.from(files) : files[0] ?? null)
            }}
            disabled={disabled}
            style={inputStyle}
          />
        )

      case 'email':
      case 'url':
      case 'string':
      default:
        return (
          <input
            type={inferredType === 'email' ? 'email' : inferredType === 'url' ? 'url' : 'text'}
            value={value == null ? '' : String(value)}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={() => form.onFieldBlur(name)}
            placeholder={placeholder}
            disabled={disabled}
            style={inputStyle}
            aria-invalid={hasErrors}
            aria-describedby={hasErrors ? errorId : undefined}
          />
        )
    }
  }

  return (
    <div className={`sg-autofield ${className ?? ''}`} style={wrapperStyle}>
      {inferredType !== 'boolean' && inferredType !== 'switch' && label && (
        <label style={{ fontWeight: 500, fontSize: 14 }}>{label}</label>
      )}
      {renderInput()}
      {hasErrors && (
        <span id={errorId} role="alert" style={{ color: 'var(--sg-error, #ff4d4f)', fontSize: 12 }}>
          {meta.errors.join('; ')}
        </span>
      )}
      {hasWarnings && !hasErrors && (
        <span style={{ color: 'var(--sg-warning, #faad14)', fontSize: 12 }}>
          {meta.warnings.join('; ')}
        </span>
      )}
    </div>
  )
}
