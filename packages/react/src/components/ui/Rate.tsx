import React from 'react'
import { useConfig } from '../ConfigProvider'
import type { BaseComponentProps, InteractiveProps } from '../../types'

/** Props for the Rate component. */
export interface RateProps extends BaseComponentProps, InteractiveProps {
  /** Controlled rating value. */
  value?: number
  /** Uncontrolled initial rating. @default 0 */
  defaultValue?: number
  /** Number of rating symbols. @default 5 */
  count?: number
  /** Allows selecting half steps between stars. */
  allowHalf?: boolean
  /** Custom node rendered for each rating symbol. @default '★' */
  character?: React.ReactNode
  /** Called when the rating value changes. */
  onChange?: (value: number) => void
}

/** Star-style rating with hover preview, half steps, and keyboard adjustment. */
export function Rate({
  value,
  defaultValue = 0,
  count = 5,
  disabled: disabledProp,
  allowHalf,
  character = '★',
  onChange,
  className,
  style,
  unstyled,
}: RateProps) {
  const config = useConfig()
  const disabled = disabledProp ?? config.disabled
  const rateLocale = config.locale?.rate
  const ariaLabel = rateLocale?.ariaLabel ?? 'Rating'
  const starLabel = rateLocale?.star ?? ((n: number) => `${n} star${n > 1 ? 's' : ''}`)

  const [internalValue, setInternalValue] = React.useState(value ?? defaultValue)
  const [hoverValue, setHoverValue] = React.useState<number | null>(null)
  const currentValue = value ?? internalValue
  const displayValue = hoverValue ?? currentValue

  const handleClick = (starValue: number) => {
    if (disabled) return
    const next = currentValue === starValue ? 0 : starValue
    setInternalValue(next)
    onChange?.(next)
  }

  const handleStarClick = (starIndex: number, clientX: number, rect: DOMRect) => {
    if (disabled) return
    if (!allowHalf) {
      handleClick(starIndex)
      return
    }
    const isLeftHalf = clientX - rect.left < rect.width / 2
    handleClick(isLeftHalf ? starIndex - 0.5 : starIndex)
  }

  const handleStarHover = (starIndex: number, clientX: number, rect: DOMRect) => {
    if (disabled) return
    if (!allowHalf) {
      setHoverValue(starIndex)
      return
    }
    const isLeftHalf = clientX - rect.left < rect.width / 2
    setHoverValue(isLeftHalf ? starIndex - 0.5 : starIndex)
  }

  const handleKeyDown = (e: React.KeyboardEvent, _starIndex: number) => {
    if (disabled) return
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault()
      const next = Math.min(count, allowHalf ? currentValue + 0.5 : currentValue + 1)
      handleClick(next)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault()
      const next = Math.max(0, allowHalf ? currentValue - 0.5 : currentValue - 1)
      handleClick(next)
    }
  }

  const wrapperClass = unstyled
    ? (className ?? '')
    : ['sg-rate', disabled ? 'sg-rate-disabled' : '', className].filter(Boolean).join(' ')

  return (
    <div className={wrapperClass} style={style} role="radiogroup" aria-label={ariaLabel}>
      {Array.from({ length: count }, (_, i) => {
        const starIndex = i + 1
        const isFull = displayValue >= starIndex
        const isHalf = allowHalf && displayValue >= starIndex - 0.5 && displayValue < starIndex

        return (
          <span
            key={i}
            className={
              unstyled
                ? ''
                : [
                    'sg-rate-star',
                    isFull ? 'sg-rate-star-full' : '',
                    isHalf ? 'sg-rate-star-half' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')
            }
            role="radio"
            aria-checked={isFull}
            aria-label={starLabel(starIndex)}
            tabIndex={disabled ? -1 : 0}
            onClick={(e) =>
              handleStarClick(starIndex, e.clientX, e.currentTarget.getBoundingClientRect())
            }
            onKeyDown={(e) => handleKeyDown(e, starIndex)}
            onMouseMove={(e) =>
              handleStarHover(starIndex, e.clientX, e.currentTarget.getBoundingClientRect())
            }
            onMouseLeave={() => !disabled && setHoverValue(null)}
          >
            {character}
          </span>
        )
      })}
    </div>
  )
}
