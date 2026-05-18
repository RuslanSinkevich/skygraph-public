import React, { useState, useRef, useEffect } from 'react'
import { Spin } from './Spin'
import { useConfig } from '../ConfigProvider'
import type { BaseComponentProps, InteractiveProps, SizableProps } from '../../types'

/** Suggestion row shown in the AutoComplete dropdown. */
export interface AutoCompleteOption {
  /** Text shown in the list; also used for client-side filtering. */
  label: string
  /** Value written to the input when the row is chosen. */
  value: string
}

/** Props for text input with filtered suggestions and optional callbacks. */
export interface AutoCompleteProps extends BaseComponentProps, InteractiveProps, SizableProps {
  /** Controlled input value. */
  value?: string
  /** Initial value when uncontrolled. */
  defaultValue?: string
  /** Suggestion list; filtered by label against current input. */
  options: AutoCompleteOption[]
  /** Input placeholder text. */
  placeholder?: string
  /** Called when the typed value changes. */
  onChange?: (value: string) => void
  /** Called on each change with the current query string. */
  onSearch?: (query: string) => void
  /** Called when a suggestion is picked from the list. */
  onSelect?: (value: string, option: AutoCompleteOption) => void
  /** Called when the input loses focus. */
  onBlur?: () => void
}

/**
 * Text field with a dropdown of options filtered as the user types.
 * Opens the list on focus and filters by option label (case-insensitive).
 */
export function AutoComplete({
  value,
  defaultValue,
  options,
  placeholder,
  disabled: disabledProp,
  loading,
  size: sizeProp,
  onChange,
  onSearch,
  onSelect,
  onBlur,
  className,
  style,
  unstyled,
}: AutoCompleteProps) {
  const config = useConfig()
  const size = sizeProp ?? config.size ?? 'middle'
  const disabled = disabledProp ?? config.disabled ?? false

  const [internalValue, setInternalValue] = useState(value ?? defaultValue ?? '')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const currentValue = value ?? internalValue

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(currentValue.toLowerCase())
  )

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setInternalValue(v)
    onChange?.(v)
    onSearch?.(v)
    setOpen(true)
  }

  const handleSelect = (opt: AutoCompleteOption) => {
    setInternalValue(opt.value)
    onChange?.(opt.value)
    onSelect?.(opt.value, opt)
    setOpen(false)
  }

  const wrapperClass = unstyled
    ? className ?? ''
    : ['sg-autocomplete', `sg-autocomplete-${size}`, loading ? 'sg-autocomplete-loading' : '', className]
        .filter(Boolean)
        .join(' ')

  return (
    <div className={wrapperClass} ref={ref} style={style}>
      <span className={unstyled ? '' : 'sg-input-wrapper'}>
        <input
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open && filtered.length > 0}
          className={unstyled ? '' : `sg-input sg-input-${size}`}
          value={currentValue}
          placeholder={placeholder}
          disabled={disabled || loading}
          onChange={handleChange}
          onFocus={() => setOpen(true)}
          onBlur={onBlur}
        />
        {loading && <Spin size="small" unstyled={unstyled} />}
      </span>
      {open && filtered.length > 0 && (
        <div className={unstyled ? '' : 'sg-autocomplete-dropdown'}>
          {filtered.map((opt) => (
            <div
              key={opt.value}
              className={unstyled ? '' : 'sg-autocomplete-option'}
              onMouseDown={() => handleSelect(opt)}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
