import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useConfig } from '../ConfigProvider'
import type { BaseComponentProps, InteractiveProps, SizableProps } from '../../types'

/** One mention candidate in the suggestion list. */
export interface MentionOption {
  /** Text inserted after the trigger prefix when the row is chosen. */
  value: string
  /** Optional display string; defaults to value when omitted. */
  label?: string
}

/** Props for a textarea that shows mention suggestions after a prefix. */
export interface MentionsProps extends BaseComponentProps, InteractiveProps, SizableProps {
  /** Controlled textarea value. */
  value?: string
  /** Initial value when uncontrolled. */
  defaultValue?: string
  /** Called when the textarea content changes. */
  onChange?: (value: string) => void
  /** Character(s) that start a mention (e.g. @ or #). */
  prefix?: string | string[]
  /** Suggestion list filtered by the text after the active prefix. */
  options?: MentionOption[]
  /** Vertical position of the suggestion dropdown relative to the field. */
  placement?: 'top' | 'bottom'
  /** Called with the current query and matched prefix while typing a mention. */
  onSearch?: (text: string, prefix: string) => void
  /** Called when a suggestion is inserted into the text. */
  onSelect?: (option: MentionOption, prefix: string) => void
  /** Textarea placeholder. */
  placeholder?: string
  /** Visible height of the textarea in rows. */
  rows?: number
}

interface MentionState {
  active: boolean
  prefix: string
  query: string
  startIndex: number
}

/**
 * Textarea with @-style mentions: shows a filtered list after a configured prefix.
 * Supports keyboard navigation (arrows, Enter, Escape) when the list is open.
 *
 * @default defaultValue - `''`
 * @default prefix - `'@'`
 * @default options - `[]`
 * @default placement - `'bottom'`
 * @default rows - `3`
 */
export function Mentions({
  value,
  defaultValue = '',
  onChange,
  prefix: prefixConfig = '@',
  options = [],
  placement = 'bottom',
  onSearch,
  onSelect,
  placeholder,
  rows = 3,
  disabled: disabledProp,
  size: sizeProp,
  className,
  style,
  unstyled,
}: MentionsProps) {
  const config = useConfig()
  const disabled = disabledProp ?? config.disabled
  const size = sizeProp ?? config.size ?? 'middle'

  const prefixes = useMemo(
    () => (Array.isArray(prefixConfig) ? prefixConfig : [prefixConfig]),
    [prefixConfig],
  )

  const [internalValue, setInternalValue] = useState(value ?? defaultValue)
  const currentValue = value ?? internalValue
  const [mentionState, setMentionState] = useState<MentionState | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const filteredOptions = useMemo(() => {
    if (!mentionState) return []
    const q = mentionState.query.toLowerCase()
    return options.filter((opt) => {
      const label = (opt.label ?? opt.value).toLowerCase()
      return label.includes(q)
    })
  }, [options, mentionState])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setInternalValue(newValue)
    onChange?.(newValue)

    const cursorPos = e.target.selectionStart ?? 0
    const textBeforeCursor = newValue.slice(0, cursorPos)

    let foundMention: MentionState | null = null
    for (const p of prefixes) {
      const lastPrefixIdx = textBeforeCursor.lastIndexOf(p)
      if (lastPrefixIdx >= 0) {
        const charBefore = lastPrefixIdx > 0 ? textBeforeCursor[lastPrefixIdx - 1] : ' '
        if (charBefore === ' ' || charBefore === '\n' || lastPrefixIdx === 0) {
          const query = textBeforeCursor.slice(lastPrefixIdx + p.length)
          if (!query.includes(' ')) {
            foundMention = { active: true, prefix: p, query, startIndex: lastPrefixIdx }
            break
          }
        }
      }
    }

    if (foundMention) {
      setMentionState(foundMention)
      setActiveIndex(0)
      onSearch?.(foundMention.query, foundMention.prefix)
    } else {
      setMentionState(null)
    }
  }, [onChange, prefixes, onSearch])

  const insertMention = useCallback((option: MentionOption) => {
    if (!mentionState || !textareaRef.current) return
    const textarea = textareaRef.current
    const before = currentValue.slice(0, mentionState.startIndex)
    const after = currentValue.slice(mentionState.startIndex + mentionState.prefix.length + mentionState.query.length)
    const insertText = `${mentionState.prefix}${option.value} `
    const newValue = before + insertText + after

    setInternalValue(newValue)
    onChange?.(newValue)
    onSelect?.(option, mentionState.prefix)
    setMentionState(null)

    requestAnimationFrame(() => {
      const pos = before.length + insertText.length
      textarea.focus()
      textarea.setSelectionRange(pos, pos)
    })
  }, [mentionState, currentValue, onChange, onSelect])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!mentionState || filteredOptions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % filteredOptions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i - 1 + filteredOptions.length) % filteredOptions.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      insertMention(filteredOptions[activeIndex])
    } else if (e.key === 'Escape') {
      setMentionState(null)
    }
  }, [mentionState, filteredOptions, activeIndex, insertMention])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          textareaRef.current && !textareaRef.current.contains(e.target as Node)) {
        setMentionState(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const wrapperClass = unstyled
    ? className ?? ''
    : ['sg-mentions', `sg-mentions-${size}`, disabled ? 'sg-mentions-disabled' : '', className].filter(Boolean).join(' ')

  return (
    <div className={wrapperClass} style={{ ...style, position: 'relative' }}>
      <textarea
        ref={textareaRef}
        className={unstyled ? '' : 'sg-input sg-textarea'}
        value={currentValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
      />
      {mentionState && filteredOptions.length > 0 && (
        <div
          ref={dropdownRef}
          className={unstyled ? '' : `sg-mentions-dropdown sg-mentions-dropdown-${placement}`}
          role="listbox"
        >
          {filteredOptions.map((opt, i) => (
            <div
              key={opt.value}
              className={unstyled ? '' : [
                'sg-mentions-option',
                i === activeIndex ? 'sg-mentions-option-active' : '',
              ].filter(Boolean).join(' ')}
              role="option"
              aria-selected={i === activeIndex}
              onClick={() => insertMention(opt)}
              onMouseEnter={() => setActiveIndex(i)}
            >
              {opt.label ?? opt.value}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
