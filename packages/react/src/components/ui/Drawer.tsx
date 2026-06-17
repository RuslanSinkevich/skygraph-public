import React, { useEffect, useCallback, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './Button'
import { Transition } from './Transition'
import { useConfig } from '../ConfigProvider'
import { useFocusTrap } from '../../hooks/a11y/useFocusTrap'
import type { BaseComponentProps } from '../../types'

/** Props for the slide-in drawer panel. */
export interface DrawerProps extends BaseComponentProps {
  /** When `true`, the drawer is visible. */
  open: boolean
  /** Called when the drawer should close (Escape, mask, or close button). */
  onClose: () => void
  /** Optional header content next to the close control. */
  title?: React.ReactNode
  /** Main drawer body content. */
  children?: React.ReactNode
  /** Optional footer region (e.g. actions). */
  footer?: React.ReactNode
  /** Edge from which the panel enters. @default 'right' */
  placement?: 'left' | 'right' | 'top' | 'bottom'
  /** Width for left/right placement (CSS length or pixels). @default 378 */
  width?: number | string
  /** Height for top/bottom placement (CSS length or pixels). @default 378 */
  height?: number | string
  /** When `true`, shows a header close button. @default true */
  closable?: boolean
  /** When `true`, renders a dimmed mask behind the panel. @default true */
  mask?: boolean
  /** When `true`, clicking the mask calls `onClose`. @default true */
  maskClosable?: boolean
}

const PLACEMENT_TRANSITION: Record<string, string> = {
  left: 'sg-slide-left',
  right: 'sg-slide-right',
  top: 'sg-slide-down',
  bottom: 'sg-slide-up',
}

function getScopedCssVars(scope: HTMLElement | null): React.CSSProperties {
  if (!scope || typeof window === 'undefined') return {}

  const computed = window.getComputedStyle(scope)
  const vars: Record<string, string> = {}

  for (let i = 0; i < computed.length; i += 1) {
    const name = computed.item(i)
    if (name.startsWith('--sg-')) {
      vars[name] = computed.getPropertyValue(name)
    }
  }

  return vars as React.CSSProperties
}

/**
 * Side panel drawer with optional mask, placement transitions, and focus trap.
 * Horizontal placement uses `width`; vertical uses `height`.
 */
export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
  placement = 'right',
  width = 378,
  height = 378,
  closable = true,
  mask = true,
  maskClosable = true,
  className,
  style,
  unstyled,
}: DrawerProps) {
  const uid = useId()
  const titleId = `${uid}-title`
  const bodyId = `${uid}-body`
  const trapRef = useFocusTrap(open)
  const scopeRef = useRef<HTMLSpanElement | null>(null)
  const { locale } = useConfig()
  const closeAriaLabel = locale?.drawer?.closeAriaLabel ?? 'Close'

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

  const isHorizontal = placement === 'left' || placement === 'right'
  const sizeStyle: React.CSSProperties = isHorizontal
    ? { width, height: '100%' }
    : { height, width: '100%' }

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
        {footer && <div>{footer}</div>}
        {closable && (
          <button onClick={onClose} aria-label={closeAriaLabel}>
            ×
          </button>
        )}
      </div>
    )
  }

  const transitionName = PLACEMENT_TRANSITION[placement] ?? 'sg-slide-right'
  const portalTarget = typeof document !== 'undefined' ? document.body : null

  const drawer = (
    <Transition visible={open} name="sg-fade" unmountOnExit duration={300}>
      <div className="sg-drawer-root" style={getScopedCssVars(scopeRef.current)}>
        {mask && <div className="sg-drawer-mask" onClick={maskClosable ? onClose : undefined} />}
        <Transition visible={open} name={transitionName} unmountOnExit duration={300}>
          <div
            ref={trapRef}
            className={['sg-drawer', `sg-drawer-${placement}`, className].filter(Boolean).join(' ')}
            style={{ ...sizeStyle, ...style }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-describedby={children ? bodyId : undefined}
          >
            {(title || closable) && (
              <div className="sg-drawer-header">
                {title && (
                  <div className="sg-drawer-title" id={titleId}>
                    {title}
                  </div>
                )}
                {closable && (
                  <Button
                    type="text"
                    className="sg-drawer-close"
                    onClick={onClose}
                    aria-label={closeAriaLabel}
                  >
                    &times;
                  </Button>
                )}
              </div>
            )}
            <div className="sg-drawer-body" id={bodyId}>
              {children}
            </div>
            {footer && <div className="sg-drawer-footer">{footer}</div>}
          </div>
        </Transition>
      </div>
    </Transition>
  )

  return (
    <>
      <span ref={scopeRef} hidden />
      {portalTarget ? createPortal(drawer, portalTarget) : drawer}
    </>
  )
}
