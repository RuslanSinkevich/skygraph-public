import { useState, useRef, useEffect, useId } from 'react'
import { useConfig } from '../ConfigProvider'
import { Transition } from './Transition'
import type { BaseComponentProps, InteractiveProps, SizableProps } from '../../types'
import { Spin } from './Spin'

/** Single selectable entry in a Select dropdown or native option list. */
export interface SelectOption {
  /** Display text for the option. */
  label: string
  /** Value submitted with the form and returned by onChange. */
  value: string | number
  /** When true, the option cannot be selected. */
  disabled?: boolean
  /** When true, shows a loading state for the option. */
  loading?: boolean
}

/** Props shared by single and multiple modes. */
interface SelectPropsBase extends BaseComponentProps, InteractiveProps, SizableProps {
  /** Options shown in the dropdown or native select. */
  options: SelectOption[]
  /** Text shown when nothing is selected. */
  placeholder?: string
  /** Called when the control loses focus. */
  onBlur?: () => void
  /**
   * Accessible name for the control. Required for the styled (non-`unstyled`)
   * variant when there is no surrounding `<label htmlFor=...>` — the styled
   * trigger is a `<div role="combobox">` and a parent `<label>` cannot
   * associate. WCAG 4.1.2 expects a name for every interactive control;
   * provide either `'aria-label'` or `'aria-labelledby'`.
   *
   * In the `unstyled` variant the underlying native `<select>` is fully
   * labelable, so this prop is purely informational there.
   */
  'aria-label'?: string
  /** Id(s) of the element(s) that describe this control. Mirrors `aria-label`. */
  'aria-labelledby'?: string
}

/** Single-select variant. `value` is one option value. */
export interface SelectPropsSingle extends SelectPropsBase {
  /** When false/omitted, the component is single-select. */
  multiple?: false
  /** Controlled selected value. */
  value?: string | number
  /** Initial value when uncontrolled. */
  defaultValue?: string | number
  /** Called when the selection changes. */
  onChange?: (value: string | number) => void
}

/**
 * Multiple-select variant. `value` is an array. Selecting an option
 * toggles its presence in the array; the dropdown stays open while picking.
 */
export interface SelectPropsMultiple extends SelectPropsBase {
  /** Enables multi-select mode. Render shows chips per selected option. */
  multiple: true
  /** Controlled selected values. */
  value?: (string | number)[]
  /** Initial selection when uncontrolled. */
  defaultValue?: (string | number)[]
  /** Called when the selection set changes. */
  onChange?: (values: (string | number)[]) => void
}

/** Props for the Select combobox; supports styled or native unstyled rendering. */
export type SelectProps = SelectPropsSingle | SelectPropsMultiple

/**
 * Dropdown or native select for choosing one option (default) or many
 * options when `multiple` is set. Keyboard and click-outside behavior apply
 * in the styled (non-unstyled) mode.
 *
 * @default placeholder - `'Select...'`
 */
export function Select(props: SelectProps) {
  const {
    options,
    placeholder = 'Select...',
    disabled: disabledProp,
    loading,
    size: sizeProp,
    onBlur,
    className,
    style,
    unstyled,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
  } = props

  const isMultiple = props.multiple === true
  const config = useConfig()
  const size = sizeProp ?? config.size ?? 'middle'
  const disabled = disabledProp ?? config.disabled ?? false

  const initialSingle = isMultiple
    ? undefined
    : (props.value ?? props.defaultValue)
  const initialMultiple: (string | number)[] = isMultiple
    ? (props.value ?? props.defaultValue ?? [])
    : []

  const [internalSingle, setInternalSingle] = useState<string | number | undefined>(initialSingle)
  const [internalMultiple, setInternalMultiple] = useState<(string | number)[]>(initialMultiple)
  const [open, setOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const ref = useRef<HTMLDivElement>(null)
  const listboxId = useId()

  const currentSingle = isMultiple
    ? undefined
    : ((props.value ?? internalSingle) as string | number | undefined)
  const currentMultiple: (string | number)[] = isMultiple
    ? ((props.value ?? internalMultiple) as (string | number)[])
    : []

  const selectedOption = isMultiple
    ? undefined
    : options.find((o) => o.value === currentSingle)
  const selectedOptions = isMultiple
    ? options.filter((o) => currentMultiple.includes(o.value))
    : []

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!open) setFocusedIndex(-1)
  }, [open])

  const emitSingle = (val: string | number) => {
    setInternalSingle(val)
    if (!isMultiple) props.onChange?.(val)
  }

  const emitMultiple = (vals: (string | number)[]) => {
    setInternalMultiple(vals)
    if (isMultiple) props.onChange?.(vals)
  }

  const handleSelect = (opt: SelectOption) => {
    if (opt.disabled || opt.loading) return
    if (isMultiple) {
      const exists = currentMultiple.includes(opt.value)
      const next = exists
        ? currentMultiple.filter((v) => v !== opt.value)
        : [...currentMultiple, opt.value]
      emitMultiple(next)
    } else {
      emitSingle(opt.value)
      setOpen(false)
    }
  }

  const handleRemoveTag = (val: string | number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (disabled || loading) return
    emitMultiple(currentMultiple.filter((v) => v !== val))
  }

  if (unstyled) {
    if (isMultiple) {
      return (
        <select
          className={className}
          style={style}
          multiple
          value={currentMultiple.map(String)}
          disabled={disabled || loading}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          onChange={(e) => {
            const picked = Array.from(e.target.selectedOptions).map((o) => {
              const v = o.value
              const numVal = Number(v)
              return options.some((opt) => opt.value === numVal) ? numVal : v
            })
            emitMultiple(picked)
          }}
          onBlur={onBlur}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
      )
    }
    return (
      <select
        className={className}
        style={style}
        value={currentSingle as string}
        disabled={disabled || loading}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        onChange={(e) => {
          const v = e.target.value
          const numVal = Number(v)
          const finalVal = options.some((o) => o.value === numVal) ? numVal : v
          emitSingle(finalVal)
        }}
        onBlur={onBlur}
      >
        {!selectedOption && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
    )
  }

  const wrapperClass = [
    'sg-select',
    `sg-select-${size}`,
    isMultiple ? 'sg-select-multiple' : '',
    open ? 'sg-select-open' : '',
    disabled || loading ? 'sg-select-disabled' : '',
    loading ? 'sg-select-loading' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const isOptionSelected = (opt: SelectOption) =>
    isMultiple ? currentMultiple.includes(opt.value) : opt.value === currentSingle

  const renderTrigger = () => {
    if (isMultiple) {
      if (selectedOptions.length === 0) {
        return <span className="sg-select-placeholder">{placeholder}</span>
      }
      return (
        <span className="sg-select-tags">
          {selectedOptions.map((opt) => (
            <span key={opt.value} className="sg-select-tag">
              <span className="sg-select-tag-label">{opt.label}</span>
              <button
                type="button"
                className="sg-select-tag-remove"
                aria-label={`Remove ${opt.label}`}
                tabIndex={-1}
                onClick={(e) => handleRemoveTag(opt.value, e)}
              >
                ×
              </button>
            </span>
          ))}
        </span>
      )
    }
    return (
      <span
        className={
          selectedOption ? 'sg-select-selection-item' : 'sg-select-placeholder'
        }
      >
        {selectedOption?.label ?? placeholder}
      </span>
    )
  }

  return (
    <div className={wrapperClass} ref={ref} style={style} onBlur={onBlur}>
      <div
        className="sg-select-selector"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-multiselectable={isMultiple || undefined}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-disabled={disabled || loading || undefined}
        tabIndex={disabled || loading ? -1 : 0}
        onClick={() => !disabled && !loading && setOpen(!open)}
        onKeyDown={(e) => {
          if (disabled || loading) return
          switch (e.key) {
            case 'Enter':
            case ' ':
              e.preventDefault()
              if (open && focusedIndex >= 0) {
                handleSelect(options[focusedIndex])
              } else {
                setOpen(!open)
              }
              break
            case 'Escape':
              e.preventDefault()
              setOpen(false)
              break
            case 'ArrowDown':
              e.preventDefault()
              if (!open) setOpen(true)
              else setFocusedIndex((i) => (i + 1) % options.length)
              break
            case 'ArrowUp':
              e.preventDefault()
              if (!open) setOpen(true)
              else
                setFocusedIndex(
                  (i) => (i - 1 + options.length) % options.length,
                )
              break
            case 'Backspace':
              if (isMultiple && currentMultiple.length > 0) {
                emitMultiple(currentMultiple.slice(0, -1))
              }
              break
          }
        }}
      >
        {renderTrigger()}
        {loading ? (
          <Spin size="small" unstyled={unstyled} />
        ) : (
          <span className="sg-select-arrow">{open ? '\u25B2' : '\u25BC'}</span>
        )}
      </div>
      <Transition visible={open} name="sg-slide-up" unmountOnExit>
        <div className="sg-select-dropdown" role="listbox" id={listboxId} aria-multiselectable={isMultiple || undefined}>
          {options.map((opt, idx) => (
            <div
              key={opt.value}
              role="option"
              aria-selected={isOptionSelected(opt)}
              className={[
                'sg-select-option',
                isOptionSelected(opt) ? 'sg-select-option-selected' : '',
                idx === focusedIndex ? 'sg-select-option-focused' : '',
                opt.disabled || opt.loading ? 'sg-select-option-disabled' : '',
                opt.loading ? 'sg-select-option-loading' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => handleSelect(opt)}
            >
              <span>{opt.label}</span>
              {opt.loading && <Spin size="small" unstyled={unstyled} />}
            </div>
          ))}
        </div>
      </Transition>
    </div>
  )
}
