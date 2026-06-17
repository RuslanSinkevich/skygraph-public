import React, { useState, useEffect, useRef } from 'react'
import { Transition } from './Transition'
import { useConfig } from '../ConfigProvider'
import type { BaseComponentProps } from '../../types'

/** Visual variant for notification styling and icon. */
export type NotificationType = 'success' | 'error' | 'warning' | 'info'

/** Options passed to `notification.open` and shorthand helpers. */
export interface NotificationConfig {
  /** Notification style variant; defaults to `info` when omitted in the card. */
  type?: NotificationType
  /** Primary line of text (title). */
  message: React.ReactNode
  /** Optional secondary detail below the message. */
  description?: React.ReactNode
  /** Auto-dismiss delay in ms; `0` disables auto-close. */
  duration?: number
  /** Stable id for deduplication; a generated id is used if omitted. */
  key?: string
  /** Called after the notification is removed (manual or auto). */
  onClose?: () => void
  /** Corner stack this toast belongs to; must match a mounted container. */
  placement?: 'topRight' | 'topLeft' | 'bottomRight' | 'bottomLeft'
  /** Extra class on the toast root — useful for scoped theming. */
  className?: string
  /** Inline style on the toast root; accepts CSS custom properties for per-toast token overrides. */
  style?: React.CSSProperties
}

interface NotificationItem extends NotificationConfig {
  id: string
}

type Listener = (items: NotificationItem[]) => void

const listeners = new Set<Listener>()
let items: NotificationItem[] = []
let counter = 0

function notify(all: Listener[]) {
  for (const fn of all) fn([...items])
}

function addNotification(config: NotificationConfig) {
  const id = config.key ?? `sg-notif-${++counter}`
  const item: NotificationItem = { ...config, id }
  items = [...items, item]
  notify([...listeners])

  const duration = config.duration ?? 4500
  if (duration > 0) {
    setTimeout(() => removeNotification(id), duration)
  }
}

function removeNotification(id: string) {
  items = items.filter((i) => i.id !== id)
  notify([...listeners])
}

export const notification = {
  open: (config: NotificationConfig) => addNotification(config),
  success: (message: React.ReactNode, description?: React.ReactNode) =>
    addNotification({ type: 'success', message, description }),
  error: (message: React.ReactNode, description?: React.ReactNode) =>
    addNotification({ type: 'error', message, description }),
  warning: (message: React.ReactNode, description?: React.ReactNode) =>
    addNotification({ type: 'warning', message, description }),
  info: (message: React.ReactNode, description?: React.ReactNode) =>
    addNotification({ type: 'info', message, description }),
  destroy: () => {
    items = []
    notify([...listeners])
  },
}

const typeIcons: Record<NotificationType, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
}

/** Props for the region that renders toasts for one corner placement. */
export interface NotificationContainerProps extends BaseComponentProps {
  /** Which corner this container listens to; filters incoming notifications. @default 'topRight' */
  placement?: 'topRight' | 'topLeft' | 'bottomRight' | 'bottomLeft'
}

/**
 * Subscribes to the global notification store and renders matching toasts.
 * Mount one instance per `placement` you use (typically in app root).
 */
export function NotificationContainer({
  placement = 'topRight',
  unstyled,
}: NotificationContainerProps) {
  const [list, setList] = useState<NotificationItem[]>([])
  const listenerRef = useRef<Listener | undefined>(undefined)

  useEffect(() => {
    const fn: Listener = (newItems) => setList(newItems)
    listenerRef.current = fn
    listeners.add(fn)
    return () => {
      listeners.delete(fn)
    }
  }, [])

  const filtered = list.filter((i) => (i.placement ?? 'topRight') === placement)

  if (filtered.length === 0) return null

  const containerClass = unstyled
    ? undefined
    : `sg-notification-container sg-notification-${placement}`

  return (
    <div className={containerClass}>
      {filtered.map((item) => (
        <Transition
          key={item.id}
          visible={true}
          name={placement.includes('Right') ? 'sg-slide-right' : 'sg-slide-left'}
          unmountOnExit={false}
        >
          <div>
            <NotificationCard
              item={item}
              onClose={() => {
                removeNotification(item.id)
                item.onClose?.()
              }}
              unstyled={unstyled}
            />
          </div>
        </Transition>
      ))}
    </div>
  )
}

function NotificationCard({
  item,
  onClose,
  unstyled,
}: {
  item: NotificationItem
  onClose: () => void
  unstyled?: boolean
}) {
  const type = item.type ?? 'info'
  const closeAriaLabel = useConfig().locale?.notification?.closeAriaLabel ?? 'Close'

  if (unstyled) {
    return (
      <div role="alert" className={item.className} style={item.style}>
        <span>{typeIcons[type]}</span>
        <span>{item.message}</span>
        {item.description && <div>{item.description}</div>}
        <button onClick={onClose} aria-label={closeAriaLabel}>
          ×
        </button>
      </div>
    )
  }

  return (
    <div
      className={['sg-notification', `sg-notification-${type}`, item.className]
        .filter(Boolean)
        .join(' ')}
      style={item.style}
      role="alert"
    >
      <div className="sg-notification-icon">{typeIcons[type]}</div>
      <div className="sg-notification-content">
        <div className="sg-notification-message">{item.message}</div>
        {item.description && <div className="sg-notification-description">{item.description}</div>}
      </div>
      <button className="sg-notification-close" onClick={onClose} aria-label={closeAriaLabel}>
        ×
      </button>
    </div>
  )
}
