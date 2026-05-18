import React, { useState } from 'react'
import { useConfig } from '../ConfigProvider'
import type { BaseComponentProps, InteractiveProps, SizableProps } from '../../types'

export type SegmentedOption =
  | string
  | { label: React.ReactNode; value: string; icon?: React.ReactNode; disabled?: boolean }

/** Props for a horizontal group of mutually exclusive segment choices. */
export interface SegmentedProps extends BaseComponentProps, InteractiveProps, SizableProps {
  /** Segment definitions as strings or objects with label, value, and optional icon. */
  options: SegmentedOption[]
  /** Controlled selected segment value. */
  value?: string
  /** Initial value when uncontrolled; falls back to first option value if unset. */
  defaultValue?: string
  /** Called when the user selects a segment. */
  onChange?: (value: string) => void
  /** When true, the control stretches to the full width of its container. */
  block?: boolean
}

function normalizeOption(opt: SegmentedOption) {
  if (typeof opt === 'string') return { label: opt, value: opt }
  return opt
}

/**
 * Segmented control (radio group) for picking one of several options.
 * Renders as styled pills or, when unstyled, as native radio inputs.
 */
export function Segmented({
  options,
  value,
  defaultValue,
  onChange,
  block,
  size: sizeProp,
  disabled: disabledProp,
  className,
  style,
  unstyled,
}: SegmentedProps) {
  const config = useConfig()
  const size = sizeProp ?? config.size ?? 'middle'
  const disabled = disabledProp ?? config.disabled ?? false

  const normalized = options.map(normalizeOption)
  const [internalValue, setInternalValue] = useState(
    value ?? defaultValue ?? normalized[0]?.value ?? ''
  )
  const currentValue = value ?? internalValue

  const handleSelect = (val: string, optDisabled?: boolean) => {
    if (disabled || optDisabled) return
    setInternalValue(val)
    onChange?.(val)
  }

  if (unstyled) {
    return (
      <div className={className} style={style} role="radiogroup">
        {normalized.map((opt) => (
          <label key={opt.value}>
            <input
              type="radio"
              name="sg-segmented"
              value={opt.value}
              checked={opt.value === currentValue}
              disabled={disabled || opt.disabled}
              onChange={() => handleSelect(opt.value, opt.disabled)}
            />
            {opt.icon}
            {opt.label}
          </label>
        ))}
      </div>
    )
  }

  return (
    <div
      className={[
        'sg-segmented',
        `sg-segmented-${size}`,
        block ? 'sg-segmented-block' : '',
        disabled ? 'sg-segmented-disabled' : '',
        className,
      ].filter(Boolean).join(' ')}
      style={style}
      role="radiogroup"
    >
      {normalized.map((opt) => (
        <div
          key={opt.value}
          role="radio"
          aria-checked={opt.value === currentValue}
          className={[
            'sg-segmented-item',
            opt.value === currentValue ? 'sg-segmented-item-selected' : '',
            opt.disabled ? 'sg-segmented-item-disabled' : '',
          ].filter(Boolean).join(' ')}
          onClick={() => handleSelect(opt.value, opt.disabled)}
        >
          {opt.icon && <span className="sg-segmented-item-icon">{opt.icon}</span>}
          <span className="sg-segmented-item-label">{opt.label}</span>
        </div>
      ))}
    </div>
  )
}
