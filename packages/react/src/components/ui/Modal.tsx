import React, { useEffect, useCallback, useId } from 'react'
import { Button } from './Button'
import { Transition } from './Transition'
import { useFocusTrap } from '../../hooks/a11y/useFocusTrap'
import { useConfig } from '../ConfigProvider'
import type { BaseComponentProps } from '../../types'

/** Props for the modal dialog overlay. */
export interface ModalProps extends BaseComponentProps {
  /** When `true`, the modal is visible. */
  open: boolean
  /** Called when the modal should close (Escape, mask click, or close control). */
  onClose: () => void
  /** Optional heading text; used for the accessible name when set. */
  title?: string
  /** Main dialog body content. */
  children?: React.ReactNode
  /**
   * Footer region below the body. Omit to render the default OK / Cancel pair
   * (enabled when `onOk` is provided). Pass `null` to hide the footer entirely.
   */
  footer?: React.ReactNode
  /** Dialog width as a CSS length or number (pixels). @default 520 */
  width?: number | string
  /** Called when the default OK button is clicked. Enables the default footer. */
  onOk?: () => void | Promise<void>
  /** Label for the default OK button. Falls back to `locale.modal.okText` → `OK`. */
  okText?: string
  /** Label for the default Cancel button. Falls back to `locale.modal.cancelText` → `Cancel`. */
  cancelText?: string
  /** Visual type of the default OK button. @default 'primary' */
  okType?: 'primary' | 'default' | 'dashed' | 'text'
  /** Shows the OK button in loading state and disables interactions. */
  confirmLoading?: boolean
}

/**
 * Modal dialog with mask, optional title/footer, focus trap, and Escape to close.
 * Renders a bare structure when `unstyled` is set.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 520,
  onOk,
  okText: okTextProp,
  cancelText: cancelTextProp,
  okType = 'primary',
  confirmLoading,
  className,
  unstyled,
}: ModalProps) {
  const uid = useId()
  const titleId = `${uid}-title`
  const bodyId = `${uid}-body`
  const trapRef = useFocusTrap(open)
  const modalLocale = useConfig().locale?.modal
  const okText = okTextProp ?? modalLocale?.okText ?? 'OK'
  const cancelText = cancelTextProp ?? modalLocale?.cancelText ?? 'Cancel'
  const closeAriaLabel = modalLocale?.closeAriaLabel ?? 'Close'

  const defaultFooter =
    footer === null ? null : footer === undefined && onOk ? (
      <>
        <Button onClick={onClose} disabled={confirmLoading}>
          {cancelText}
        </Button>
        <Button type={okType} loading={confirmLoading} onClick={() => onOk()}>
          {okText}
        </Button>
      </>
    ) : (
      footer
    )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose],
  )

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, handleKeyDown])

  if (unstyled) {
    if (!open) return null
    return (
      <div
        ref={trapRef}
        className={className}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={children ? bodyId : undefined}
      >
        {title && <div id={titleId}>{title}</div>}
        <div id={bodyId}>{children}</div>
        {defaultFooter && <div>{defaultFooter}</div>}
        <Button type="text" onClick={onClose} unstyled aria-label={closeAriaLabel}>
          x
        </Button>
      </div>
    )
  }

  return (
    <Transition visible={open} name="sg-fade" unmountOnExit>
      <div className="sg-modal-mask" onClick={onClose}>
        <Transition visible={open} name="sg-zoom" unmountOnExit>
          <div
            ref={trapRef}
            className={['sg-modal', className].filter(Boolean).join(' ')}
            style={{
              ['--sg-modal-width' as string]: typeof width === 'number' ? `${width}px` : width,
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-describedby={children ? bodyId : undefined}
          >
            <div className="sg-modal-header">
              {title && (
                <div className="sg-modal-title" id={titleId}>
                  {title}
                </div>
              )}
              <Button
                type="text"
                className="sg-modal-close"
                onClick={onClose}
                aria-label={closeAriaLabel}
              >
                &times;
              </Button>
            </div>
            <div className="sg-modal-body" id={bodyId}>
              {children}
            </div>
            {defaultFooter && <div className="sg-modal-footer">{defaultFooter}</div>}
          </div>
        </Transition>
      </div>
    </Transition>
  )
}
