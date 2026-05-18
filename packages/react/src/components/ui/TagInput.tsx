import { useState, useRef, useId } from 'react'
import { useConfig } from '../ConfigProvider'
import type { BaseComponentProps, InteractiveProps, SizableProps } from '../../types'

/** Props for the token/tag chip input. */
export interface TagInputProps extends BaseComponentProps, InteractiveProps, SizableProps {
  /** Controlled list of tags. */
  value?: string[]
  /** Initial tags when uncontrolled. @default [] */
  defaultValue?: string[]
  /** Shown when there are no tags. @default 'Add tag...' */
  placeholder?: string
  /** Maximum number of tags allowed. */
  maxTags?: number
  /** Allow the same tag text more than once. @default false */
  allowDuplicates?: boolean
  /** Show remove controls on tags. @default true */
  removable?: boolean
  /** Visual variant for tag chips. @default 'default' */
  tagColor?: 'default' | 'success' | 'error' | 'warning' | 'processing'
  /** Called when the tag list changes. */
  onChange?: (tags: string[]) => void
  /** Called when the text field loses focus (pending text is committed as a tag). */
  onBlur?: () => void
  /** Called when the text field gains focus. */
  onFocus?: () => void
}

/**
 * Multi-value input where entries become removable tags (Enter/comma, paste, backspace to remove last).
 */
export function TagInput({
  value,
  defaultValue = [],
  placeholder = 'Add tag...',
  maxTags,
  allowDuplicates = false,
  removable = true,
  tagColor = 'default',
  size: sizeProp,
  disabled: disabledProp,
  loading,
  onChange,
  onBlur,
  onFocus,
  className,
  style,
  unstyled,
}: TagInputProps) {
  const config = useConfig()
  const size = sizeProp ?? config.size ?? 'middle'
  const disabled = disabledProp ?? config.disabled ?? false
  const removeTagLabel = config.locale?.tagInput?.removeTag ?? ((tag: string) => `Remove ${tag}`)
  const [internalTags, setInternalTags] = useState<string[]>(defaultValue)
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const id = useId()
  const tags = value ?? internalTags

  const updateTags = (next: string[]) => {
    setInternalTags(next)
    onChange?.(next)
  }

  const addTag = (raw: string) => {
    const tag = raw.trim()
    if (!tag) return
    if (maxTags && tags.length >= maxTags) return
    if (!allowDuplicates && tags.includes(tag)) return
    updateTags([...tags, tag])
    setInputValue('')
  }

  const removeTag = (index: number) => {
    updateTags(tags.filter((_, i) => i !== index))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(inputValue)
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1)
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text')
    const pasted = text
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    const next = [...tags]
    for (const t of pasted) {
      if (maxTags && next.length >= maxTags) break
      if (!allowDuplicates && next.includes(t)) continue
      next.push(t)
    }
    updateTags(next)
  }

  if (unstyled) {
    return (
      <div className={className} style={style}>
        {tags.map((tag, i) => (
          <span key={`${id}-${i}`}>
            {tag}
            {removable && (
              <button type="button" onClick={() => removeTag(i)}>
                ×
              </button>
            )}
          </span>
        ))}
        <input
          ref={inputRef}
          value={inputValue}
          placeholder={tags.length === 0 ? placeholder : ''}
          disabled={disabled || loading}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={onBlur}
          onFocus={onFocus}
        />
      </div>
    )
  }

  const wrapperClasses = [
    'sg-tag-input',
    `sg-tag-input-${size}`,
    disabled ? 'sg-tag-input-disabled' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const tagColorClass = tagColor !== 'default' ? `sg-tag-${tagColor}` : ''

  return (
    <div className={wrapperClasses} style={style} onClick={() => inputRef.current?.focus()}>
      {tags.map((tag, i) => (
        <span key={`${id}-${i}`} className={`sg-tag ${tagColorClass}`}>
          {tag}
          {removable && !disabled && (
            <span
              className="sg-tag-close"
              onClick={(e) => {
                e.stopPropagation()
                removeTag(i)
              }}
              role="button"
              aria-label={removeTagLabel(tag)}
            >
              ×
            </span>
          )}
        </span>
      ))}
      <input
        ref={inputRef}
        className="sg-tag-input-field"
        value={inputValue}
        placeholder={tags.length === 0 ? placeholder : ''}
        disabled={disabled || loading}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={() => {
          if (inputValue.trim()) addTag(inputValue)
          onBlur?.()
        }}
        onFocus={onFocus}
      />
      {maxTags && (
        <span className="sg-tag-input-count">
          {tags.length}/{maxTags}
        </span>
      )}
    </div>
  )
}
