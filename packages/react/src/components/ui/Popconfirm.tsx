import React, { useState, useRef, useEffect, useId } from 'react'
import { Button } from './Button'
import { Transition } from './Transition'
import { useFocusTrap } from '../../hooks/a11y/useFocusTrap'
import { useConfig } from '../ConfigProvider'
import type { BaseComponentProps } from '../../types'

/** Props for the confirmation bubble anchored to a trigger element. */
export interface PopconfirmProps extends BaseComponentProps {
  /** Main confirmation question or summary. */
  title: React.ReactNode
  /** Optional supporting text below the title. */
  description?: React.ReactNode
  /** Called when the user confirms. */
  onConfirm?: () => void
  /** Called when the user cancels or dismisses without confirming. */
  onCancel?: () => void
  /** Label for the confirm action button. @default 'Yes' */
  okText?: string
  /** Label for the cancel action button. @default 'No' */
  cancelText?: string
  /** Popover position relative to the trigger. @default 'top' */
  placement?: 'top' | 'bottom' | 'left' | 'right'
  /** Single React element that opens the popconfirm on click. */
  children: React.ReactElement
  /** When `true`, the trigger does not open the popconfirm. */
  disabled?: boolean
}

/**
 * Lightweight confirm dialog on click: wraps a trigger and shows OK/Cancel.
 * Closes on outside click or after confirm/cancel.
 */
export function Popconfirm({
  title,
  description,
  onConfirm,
  onCancel,
  okText: okTextProp,
  cancelText: cancelTextProp,
  placement = 'top',
  children,
  disabled,
  className,
  unstyled,
}: PopconfirmProps) {
  const popconfirmLocale = useConfig().locale?.popconfirm
  const okText = okTextProp ?? popconfirmLocale?.okText ?? 'Yes'
  const cancelText = cancelTextProp ?? popconfirmLocale?.cancelText ?? 'No'
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const trapRef = useFocusTrap(open)
  const popconfirmId = useId()

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const handleTrigger = () => {
    if (!disabled) setOpen(!open)
  }

  const handleConfirm = () => {
    setOpen(false)
    onConfirm?.()
  }

  const handleCancel = () => {
    setOpen(false)
    onCancel?.()
  }

  if (unstyled) {
    return (
      <div ref={ref} className={className} style={{ position: 'relative', display: 'inline-block' }}>
        <div onClick={handleTrigger} aria-describedby={open ? popconfirmId : undefined}>{children}</div>
        {open && (
          <div id={popconfirmId} role="alertdialog">
            <div>{title}</div>
            {description && <div>{description}</div>}
            <button onClick={handleCancel}>{cancelText}</button>
            <button onClick={handleConfirm}>{okText}</button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      ref={ref}
      className={['sg-popconfirm-wrapper', className].filter(Boolean).join(' ')}
    >
      <div onClick={handleTrigger} aria-describedby={open ? popconfirmId : undefined}>{children}</div>
        <Transition visible={open} name="sg-fade" unmountOnExit>
          <div id={popconfirmId} role="alertdialog" ref={trapRef} className={`sg-popconfirm sg-popconfirm-${placement}`}>
          <div className="sg-popconfirm-arrow" />
          <div className="sg-popconfirm-inner">
            <div className="sg-popconfirm-title">
              <span className="sg-popconfirm-icon">⚠</span>
              {title}
            </div>
            {description && (
              <div className="sg-popconfirm-description">{description}</div>
            )}
            <div className="sg-popconfirm-buttons">
              <Button size="small" onClick={handleCancel}>{cancelText}</Button>
              <Button size="small" type="primary" onClick={handleConfirm}>{okText}</Button>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  )
}
