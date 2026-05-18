import { useState, useRef, useEffect } from 'react'
import { useConfig } from '../ConfigProvider'
import type { BaseComponentProps, InteractiveProps, SizableProps } from '../../types'

/** Props for the inline text editor (view vs edit modes). */
export interface InlineEditProps extends BaseComponentProps, InteractiveProps, SizableProps {
  /** Controlled text value. */
  value?: string
  /** Initial value when uncontrolled. @default '' */
  defaultValue?: string
  /** Placeholder when the value is empty in view mode. @default 'Click to edit...' */
  placeholder?: string
  /** Whether to show save/cancel controls in edit mode. @default true */
  showButtons?: boolean
  /** Save draft when the input loses focus. @default true */
  saveOnBlur?: boolean
  /** Save draft when Enter is pressed. @default true */
  saveOnEnter?: boolean
  /** Called after a successful save with the new string. */
  onSave?: (value: string) => void
  /** Called when editing is cancelled. */
  onCancel?: () => void
  /** Custom view renderer; receives current value and a function to enter edit mode. */
  renderView?: (value: string, startEditing: () => void) => React.ReactNode
}

/**
 * Inline field that switches between a read-only view and an editable input.
 * Supports keyboard shortcuts (Enter to save, Escape to cancel).
 */
export function InlineEdit({
  value,
  defaultValue = '',
  placeholder = 'Click to edit...',
  showButtons = true,
  saveOnBlur = true,
  saveOnEnter = true,
  size: sizeProp,
  disabled: disabledProp,
  loading,
  onSave,
  onCancel,
  renderView,
  className,
  style,
  unstyled,
}: InlineEditProps) {
  const config = useConfig()
  const size = sizeProp ?? config.size ?? 'middle'
  const disabled = disabledProp ?? config.disabled ?? false
  const [editing, setEditing] = useState(false)
  const [internal, setInternal] = useState(defaultValue)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const current = value ?? internal

  useEffect(() => {
    if (editing) {
      setDraft(current)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [editing, current])

  const startEditing = () => {
    if (disabled || loading) return
    setEditing(true)
  }

  const save = () => {
    setEditing(false)
    setInternal(draft)
    onSave?.(draft)
  }

  const cancel = () => {
    setEditing(false)
    setDraft(current)
    onCancel?.()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && saveOnEnter) {
      e.preventDefault()
      save()
    } else if (e.key === 'Escape') {
      cancel()
    }
  }

  if (!editing) {
    if (renderView) {
      return <>{renderView(current, startEditing)}</>
    }

    if (unstyled) {
      return (
        <span
          className={className}
          style={{ ...style, cursor: disabled ? 'default' : 'pointer' }}
          onClick={startEditing}
        >
          {current || placeholder}
        </span>
      )
    }

    return (
      <span
        className={[
          'sg-inline-edit-view',
          `sg-inline-edit-view-${size}`,
          !current ? 'sg-inline-edit-view-placeholder' : '',
          disabled ? 'sg-inline-edit-view-disabled' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        style={style}
        onClick={startEditing}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') startEditing()
        }}
      >
        {current || placeholder}
        {!disabled && <span className="sg-inline-edit-pencil">✎</span>}
      </span>
    )
  }

  if (unstyled) {
    return (
      <span className={className} style={style}>
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={saveOnBlur ? save : undefined}
        />
        {showButtons && (
          <>
            <button type="button" onClick={save}>
              ✓
            </button>
            <button type="button" onClick={cancel}>
              ✕
            </button>
          </>
        )}
      </span>
    )
  }

  return (
    <span
      className={['sg-inline-edit', `sg-inline-edit-${size}`, className].filter(Boolean).join(' ')}
      style={style}
    >
      <input
        ref={inputRef}
        className={`sg-input sg-input-${size} sg-inline-edit-input`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={saveOnBlur && !showButtons ? save : undefined}
      />
      {showButtons && (
        <span className="sg-inline-edit-actions">
          <button
            type="button"
            className="sg-inline-edit-btn sg-inline-edit-btn-save"
            onClick={save}
            aria-label={config.locale?.inlineEdit?.save ?? 'Save'}
          >
            ✓
          </button>
          <button
            type="button"
            className="sg-inline-edit-btn sg-inline-edit-btn-cancel"
            onClick={cancel}
            aria-label={config.locale?.inlineEdit?.cancel ?? 'Cancel'}
          >
            ✕
          </button>
        </span>
      )}
    </span>
  )
}
