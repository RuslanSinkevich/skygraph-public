import { useState, useRef, useCallback, useId } from 'react'
import { useConfig } from '../ConfigProvider'
import type { BaseComponentProps, InteractiveProps, SizableProps } from '../../types'

/** Props for the multi-cell PIN or OTP code input. */
export interface PinInputProps extends BaseComponentProps, InteractiveProps, SizableProps {
  /** Number of character cells. @default 6 */
  length?: number
  /** Controlled combined string value (padded/truncated to `length`). */
  value?: string
  /** Initial combined string when uncontrolled. @default '' */
  defaultValue?: string
  /** Use password masking for each cell. @default false */
  mask?: boolean
  /** Allowed character set per cell. @default 'numeric' */
  type?: 'numeric' | 'alphanumeric'
  /** Placeholder shown in empty styled cells. @default '○' */
  placeholder?: string
  /** Focus the first cell on mount. @default false */
  autoFocus?: boolean
  /** Fired once all cells are filled (non-space characters). */
  onComplete?: (value: string) => void
  /** Fired on every change with the trimmed combined value. */
  onChange?: (value: string) => void
  /** Accessible name for the input group. @default 'PIN input' */
  'aria-label'?: string
}

/**
 * Fixed-length segmented input for PINs or one-time codes, with paste and arrow-key navigation.
 */
export function PinInput({
  length = 6,
  value,
  defaultValue = '',
  mask = false,
  type = 'numeric',
  placeholder = '○',
  autoFocus = false,
  size: sizeProp,
  disabled: disabledProp,
  loading,
  onComplete,
  onChange,
  className,
  style,
  unstyled,
  'aria-label': ariaLabel = 'PIN input',
}: PinInputProps) {
  const config = useConfig()
  const size = sizeProp ?? config.size ?? 'middle'
  const disabled = disabledProp ?? config.disabled ?? false
  const id = useId()

  const pad = (s: string) => s.padEnd(length, '').slice(0, length)
  const [internal, setInternal] = useState(() => pad(defaultValue))
  const current = value !== undefined ? pad(value) : internal
  const refs = useRef<(HTMLInputElement | null)[]>([])

  const pattern = type === 'numeric' ? /^\d$/ : /^[a-zA-Z0-9]$/

  const update = useCallback(
    (next: string) => {
      setInternal(next)
      onChange?.(next.replace(/\s/g, ''))
      const trimmed = next.replace(/\s/g, '')
      if (trimmed.length === length) onComplete?.(trimmed)
    },
    [onChange, onComplete, length],
  )

  const focusAt = (i: number) => {
    if (i >= 0 && i < length) refs.current[i]?.focus()
  }

  const handleChange = (index: number, char: string) => {
    if (!pattern.test(char)) return
    const arr = current.split('')
    arr[index] = char
    update(arr.join(''))
    focusAt(index + 1)
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      const arr = current.split('')
      if (arr[index] !== ' ') {
        arr[index] = ' '
        update(arr.join(''))
      } else {
        focusAt(index - 1)
      }
    } else if (e.key === 'ArrowLeft') {
      focusAt(index - 1)
    } else if (e.key === 'ArrowRight') {
      focusAt(index + 1)
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').slice(0, length)
    const arr = current.split('')
    let cursor = 0
    for (const ch of pasted) {
      if (pattern.test(ch) && cursor < length) {
        arr[cursor] = ch
        cursor++
      }
    }
    update(arr.join(''))
    focusAt(Math.min(cursor, length - 1))
  }

  if (unstyled) {
    return (
      <div className={className} style={style} role="group" aria-label={ariaLabel}>
        {Array.from({ length }, (_, i) => (
          <input
            key={`${id}-${i}`}
            ref={(el) => {
              refs.current[i] = el
            }}
            type={mask ? 'password' : 'text'}
            inputMode={type === 'numeric' ? 'numeric' : 'text'}
            maxLength={1}
            value={current[i] === ' ' ? '' : current[i]}
            disabled={disabled || loading}
            autoFocus={autoFocus && i === 0}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.target.select()}
          />
        ))}
      </div>
    )
  }

  const wrapperClasses = [
    'sg-pin-input',
    `sg-pin-input-${size}`,
    disabled ? 'sg-pin-input-disabled' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={wrapperClasses} style={style} role="group" aria-label={ariaLabel}>
      {Array.from({ length }, (_, i) => {
        const filled = current[i] !== ' ' && current[i] !== undefined
        return (
          <input
            key={`${id}-${i}`}
            ref={(el) => {
              refs.current[i] = el
            }}
            className={[
              'sg-pin-input-cell',
              `sg-pin-input-cell-${size}`,
              filled ? 'sg-pin-input-cell-filled' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            type={mask ? 'password' : 'text'}
            inputMode={type === 'numeric' ? 'numeric' : 'text'}
            maxLength={1}
            placeholder={placeholder}
            value={current[i] === ' ' ? '' : current[i]}
            disabled={disabled || loading}
            autoFocus={autoFocus && i === 0}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.target.select()}
          />
        )
      })}
    </div>
  )
}
