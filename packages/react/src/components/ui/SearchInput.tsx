import { useState, useRef } from 'react'
import { useConfig } from '../ConfigProvider'
import type { BaseComponentProps, InteractiveProps, SizableProps } from '../../types'
import { Spin } from './Spin'

/** Props for the search field with optional clear and submit affordances. */
export interface SearchInputProps extends BaseComponentProps, InteractiveProps, SizableProps {
  /** Controlled query string. */
  value?: string
  /** Initial query when uncontrolled. */
  defaultValue?: string
  /** Input placeholder. @default 'Search...' */
  placeholder?: string
  /** Show a clear control when there is text and not loading. @default true */
  allowClear?: boolean
  /** Add a submit button; use a string for custom button label. */
  enterButton?: boolean | string
  /** Called when the user submits (Enter or button click). */
  onSearch?: (value: string) => void
  /** Called when the query text changes. */
  onChange?: (value: string) => void
  /** Called when the input loses focus. */
  onBlur?: () => void
  /** Called when the input gains focus. */
  onFocus?: () => void
}

/**
 * Search box with icon, optional clear button, loading spinner, and optional enter-to-search button.
 */
export function SearchInput({
  value,
  defaultValue,
  placeholder = 'Search...',
  allowClear = true,
  enterButton,
  size: sizeProp,
  disabled: disabledProp,
  loading,
  onSearch,
  onChange,
  onBlur,
  onFocus,
  className,
  style,
  unstyled,
}: SearchInputProps) {
  const config = useConfig()
  const size = sizeProp ?? config.size ?? 'middle'
  const disabled = disabledProp ?? config.disabled ?? false
  const [internal, setInternal] = useState(defaultValue ?? '')
  const current = value ?? internal
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = (v: string) => {
    setInternal(v)
    onChange?.(v)
  }

  const handleSearch = () => {
    if (!disabled && !loading) onSearch?.(current)
  }

  const handleClear = () => {
    setInternal('')
    onChange?.('')
    onSearch?.('')
    inputRef.current?.focus()
  }

  if (unstyled) {
    return (
      <span className={className} style={style}>
        <input
          ref={inputRef}
          type="search"
          value={current}
          placeholder={placeholder}
          disabled={disabled || loading}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          onBlur={onBlur}
          onFocus={onFocus}
        />
        {enterButton && (
          <button type="button" onClick={handleSearch} disabled={disabled || loading}>
            {typeof enterButton === 'string' ? enterButton : 'Search'}
          </button>
        )}
      </span>
    )
  }

  const wrapperClasses = [
    'sg-search-input',
    `sg-search-input-${size}`,
    enterButton ? 'sg-search-input-with-button' : '',
    loading ? 'sg-search-input-loading' : '',
    disabled ? 'sg-search-input-disabled' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <span className={wrapperClasses} style={style}>
      <span className="sg-search-input-icon">⌕</span>
      <input
        ref={inputRef}
        type="text"
        className={`sg-input sg-input-${size} sg-search-input-field`}
        value={current}
        placeholder={placeholder}
        disabled={disabled || loading}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        onBlur={onBlur}
        onFocus={onFocus}
      />
      {loading && <Spin size="small" />}
      {allowClear && current && !loading && (
        <button
          type="button"
          className="sg-search-input-clear"
          onClick={handleClear}
          tabIndex={-1}
          aria-label={config.locale?.searchInput?.clear ?? 'Clear'}
        >
          ×
        </button>
      )}
      {enterButton && (
        <button
          type="button"
          className="sg-search-input-btn"
          onClick={handleSearch}
          disabled={disabled || loading}
        >
          {typeof enterButton === 'string' ? enterButton : '⌕'}
        </button>
      )}
    </span>
  )
}
