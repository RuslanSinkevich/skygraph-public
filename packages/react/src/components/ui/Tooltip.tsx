import React, { useState, useRef, useId, cloneElement, isValidElement } from 'react'
import { Transition } from './Transition'
import type { BaseComponentProps } from '../../types'

/** Props for the Tooltip component. */
export interface TooltipProps extends BaseComponentProps {
  /** Content shown in the tooltip on hover. */
  title: React.ReactNode
  /** Tooltip position relative to the trigger. @default 'top' */
  placement?: 'top' | 'bottom' | 'left' | 'right'
  /** Single React element that receives hover / focus handlers as the trigger. */
  children: React.ReactElement
}

type TriggerProps = {
  'aria-describedby'?: string
  onFocus?: (e: React.FocusEvent) => void
  onBlur?: (e: React.FocusEvent) => void
}

/**
 * Shows floating help text on hover or keyboard focus, with optional placement and fade transition.
 * The `aria-describedby` link is forwarded to the trigger element so assistive tech reads it on focus.
 */
export function Tooltip({
  title,
  placement = 'top',
  children,
  className,
  unstyled,
}: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const tooltipId = useId()

  const triggerWithAria = isValidElement(children)
    ? cloneElement(children as React.ReactElement<TriggerProps>, {
        'aria-describedby': visible
          ? [(children.props as TriggerProps)['aria-describedby'], tooltipId].filter(Boolean).join(' ')
          : (children.props as TriggerProps)['aria-describedby'],
        onFocus: (e: React.FocusEvent) => {
          setVisible(true)
          ;(children.props as TriggerProps).onFocus?.(e)
        },
        onBlur: (e: React.FocusEvent) => {
          setVisible(false)
          ;(children.props as TriggerProps).onBlur?.(e)
        },
      })
    : children

  if (unstyled) {
    return (
      <div
        className={className}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        style={{ position: 'relative', display: 'inline-block' }}
      >
        {triggerWithAria}
        {visible && <div id={tooltipId} role="tooltip">{title}</div>}
      </div>
    )
  }

  return (
    <div
      className={['sg-tooltip-wrapper', className].filter(Boolean).join(' ')}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      ref={ref}
    >
      {triggerWithAria}
      <Transition visible={visible} name="sg-fade" unmountOnExit>
        <div id={tooltipId} role="tooltip" className={`sg-tooltip sg-tooltip-${placement}`}>
          <div className="sg-tooltip-content">{title}</div>
          <div className="sg-tooltip-arrow" />
        </div>
      </Transition>
    </div>
  )
}
