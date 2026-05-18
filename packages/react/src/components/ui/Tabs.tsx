import React, { useState } from 'react'
import { Spin } from './Spin'
import { useConfig } from '../ConfigProvider'
import type { BaseComponentProps, SizableProps } from '../../types'

/** Configuration for one tab: label, panel content, and optional states. */
export interface TabItem {
  /** Unique key used for selection and ARIA. */
  key: string
  /** Tab label in the tab list. */
  label: React.ReactNode
  /** Panel body shown when this tab is active. */
  children: React.ReactNode
  /** When true, the tab cannot be activated. */
  disabled?: boolean
  /** When true, shows a spinner and blocks activation until cleared. */
  loading?: boolean
}

/** Props for the tab list and associated single visible panel. */
export interface TabsProps extends BaseComponentProps, SizableProps {
  /**
   * Visual chrome: `card` — bordered strip with the active tab attached to the
   * panel (classic desktop tabs). `line` — minimal underline indicator only.
   * @default 'card'
   */
  type?: 'line' | 'card'
  /** Tab definitions including labels and panel content. */
  items: TabItem[]
  /** Controlled active tab key. */
  activeKey?: string
  /** Initial active tab when `activeKey` is not controlled. */
  defaultActiveKey?: string
  /** Called when the active tab changes after user interaction. */
  onChange?: (key: string) => void
}

/**
 * Tabbed interface with keyboard navigation between tabs and one visible panel.
 * Resolves initial active key from props, then first item, when uncontrolled.
 */
export function Tabs({
  type: typeProp,
  items,
  activeKey,
  defaultActiveKey,
  onChange,
  size: sizeProp,
  className,
  style,
  unstyled,
}: TabsProps) {
  const config = useConfig()
  const size = sizeProp ?? config.size ?? 'middle'
  const type = typeProp ?? 'card'
  const [internalKey, setInternalKey] = useState(
    activeKey ?? defaultActiveKey ?? items[0]?.key ?? ''
  )
  const currentKey = activeKey ?? internalKey
  const activeItem = items.find((i) => i.key === currentKey)

  const handleClick = (key: string, disabled?: boolean, loading?: boolean) => {
    if (disabled || loading) return
    setInternalKey(key)
    onChange?.(key)
  }

  if (unstyled) {
    return (
      <div className={className} style={style}>
        <div role="tablist">
          {items.map((item) => (
            <button
              key={item.key}
              role="tab"
              aria-selected={item.key === currentKey}
              disabled={item.disabled || item.loading}
              onClick={() => handleClick(item.key, item.disabled, item.loading)}
            >
              {item.label}
              {item.loading && <Spin size="small" unstyled />}
            </button>
          ))}
        </div>
        <div role="tabpanel">{activeItem?.children}</div>
      </div>
    )
  }

  return (
    <div
      className={[
        'sg-tabs',
        `sg-tabs-${size}`,
        type === 'line' ? 'sg-tabs-line' : 'sg-tabs-card',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
    >
      <div className="sg-tabs-nav" role="tablist">
        {items.map((item) => (
          <div
            key={item.key}
            role="tab"
            aria-selected={item.key === currentKey}
            className={[
              'sg-tabs-tab',
              item.key === currentKey ? 'sg-tabs-tab-active' : '',
              item.disabled ? 'sg-tabs-tab-disabled' : '',
              item.loading ? 'sg-tabs-tab-loading' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            tabIndex={item.key === currentKey ? 0 : -1}
            onClick={() => handleClick(item.key, item.disabled, item.loading)}
            onKeyDown={(e) => {
              const enabledItems = items.filter((i) => !i.disabled && !i.loading)
              if (enabledItems.length === 0) return
              const curIdx = enabledItems.findIndex((i) => i.key === item.key)
              if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault()
                const next = enabledItems[(curIdx + 1) % enabledItems.length]
                if (next) handleClick(next.key)
              } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault()
                const prev = enabledItems[(curIdx - 1 + enabledItems.length) % enabledItems.length]
                if (prev) handleClick(prev.key)
              } else if (e.key === 'Home') {
                e.preventDefault()
                handleClick(enabledItems[0].key)
              } else if (e.key === 'End') {
                e.preventDefault()
                handleClick(enabledItems[enabledItems.length - 1].key)
              }
            }}
          >
            {item.label}
            {item.loading && <Spin size="small" unstyled={unstyled} />}
          </div>
        ))}
      </div>
      <div className="sg-tabs-content" role="tabpanel">
        {activeItem?.children}
      </div>
    </div>
  )
}
