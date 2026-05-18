import { useState, useRef, useEffect, type ReactNode } from 'react'
import { useConfig } from '../ConfigProvider'
import type { BaseComponentProps, SizableProps } from '../../types'

/** Single collapsible section: header, body, and optional metadata. */
export interface CollapseItem {
  /** Unique key used for selection state and toggling. */
  key: string
  /** Header content shown in the panel trigger. */
  label: ReactNode
  /** Body content revealed when the panel is expanded. */
  children: ReactNode
  /** Optional content rendered beside the header (e.g. actions). */
  extra?: ReactNode
  /** When `false`, hides the expand/collapse arrow. */
  showArrow?: boolean
  /** When `true`, the panel cannot be toggled. */
  disabled?: boolean
}

/** Props for the vertical accordion-style collapse list. */
export interface CollapseProps extends BaseComponentProps, SizableProps {
  /** Panels to render, each with a stable `key`. */
  items: CollapseItem[]
  /** Controlled open keys; when set, overrides internal state. */
  activeKey?: string | string[]
  /** Initial open keys when uncontrolled. */
  defaultActiveKey?: string | string[]
  /** Called after the open set changes (controlled or uncontrolled). */
  onChange?: (activeKey: string[]) => void
  /** When `true`, only one panel may be open at a time. @default false */
  accordion?: boolean
  /** When `true`, draws a border around the collapse container. @default true */
  bordered?: boolean
  /** Placement of the expand icon relative to the header text. @default 'start' */
  expandIconPosition?: 'start' | 'end'
  /** Transparent style without panel background borders. @default false */
  ghost?: boolean
}

function toArray(val?: string | string[]): string[] {
  if (val === undefined) return []
  return Array.isArray(val) ? val : [val]
}

/**
 * Renders an expandable list of panels with optional accordion mode and styled or unstyled markup.
 */
export function Collapse({
  items,
  activeKey,
  defaultActiveKey,
  onChange,
  accordion = false,
  bordered = true,
  expandIconPosition = 'start',
  ghost = false,
  size: sizeProp,
  className,
  style,
  unstyled,
}: CollapseProps) {
  const config = useConfig()
  const size = sizeProp ?? config.size ?? 'middle'

  const [internalActive, setInternalActive] = useState<string[]>(
    toArray(activeKey ?? defaultActiveKey),
  )
  const currentActive = activeKey !== undefined ? toArray(activeKey) : internalActive

  const toggle = (key: string) => {
    let next: string[]
    if (accordion) {
      next = currentActive.includes(key) ? [] : [key]
    } else {
      next = currentActive.includes(key)
        ? currentActive.filter((k) => k !== key)
        : [...currentActive, key]
    }
    setInternalActive(next)
    onChange?.(next)
  }

  if (unstyled) {
    return (
      <div className={className} style={style}>
        {items.map((item) => {
          const isActive = currentActive.includes(item.key)
          return (
            <div key={item.key}>
              <button
                disabled={item.disabled}
                aria-expanded={isActive}
                onClick={() => !item.disabled && toggle(item.key)}
              >
                {item.label}
                {item.extra}
              </button>
              {isActive && <div>{item.children}</div>}
            </div>
          )
        })}
      </div>
    )
  }

  const rootClasses = [
    'sg-collapse',
    bordered ? 'sg-collapse-bordered' : '',
    ghost ? 'sg-collapse-ghost' : '',
    `sg-collapse-${size}`,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={rootClasses} style={style}>
      {items.map((item) => {
        const isActive = currentActive.includes(item.key)
        const showArrow = item.showArrow !== false
        return (
          <CollapsePanel
            key={item.key}
            item={item}
            isActive={isActive}
            showArrow={showArrow}
            expandIconPosition={expandIconPosition}
            onToggle={() => !item.disabled && toggle(item.key)}
          />
        )
      })}
    </div>
  )
}

function CollapsePanel({
  item,
  isActive,
  showArrow,
  expandIconPosition,
  onToggle,
}: {
  item: CollapseItem
  isActive: boolean
  showArrow: boolean
  expandIconPosition: 'start' | 'end'
  onToggle: () => void
}) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number | undefined>(undefined)
  const firstRender = useRef(true)

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      if (isActive && contentRef.current) {
        setHeight(contentRef.current.scrollHeight)
      }
      return
    }
    if (!contentRef.current) return
    if (isActive) {
      setHeight(contentRef.current.scrollHeight)
    } else {
      setHeight(contentRef.current.scrollHeight)
      requestAnimationFrame(() => {
        setHeight(0)
      })
    }
  }, [isActive])

  const handleTransitionEnd = () => {
    if (isActive && contentRef.current) {
      setHeight(undefined)
    }
  }

  const panelClasses = [
    'sg-collapse-panel',
    isActive ? 'sg-collapse-panel-active' : '',
    item.disabled ? 'sg-collapse-panel-disabled' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const arrow = showArrow ? (
    <span
      className={['sg-collapse-arrow', isActive ? 'sg-collapse-arrow-open' : '']
        .filter(Boolean)
        .join(' ')}
    />
  ) : null

  return (
    <div className={panelClasses}>
      <div
        className="sg-collapse-header"
        role="button"
        tabIndex={item.disabled ? -1 : 0}
        aria-expanded={isActive}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onToggle()
          }
        }}
      >
        {expandIconPosition === 'start' && arrow}
        <span className="sg-collapse-header-text">{item.label}</span>
        {expandIconPosition === 'end' && arrow}
        {item.extra && <span className="sg-collapse-extra">{item.extra}</span>}
      </div>
      <div
        ref={contentRef}
        className="sg-collapse-content"
        style={{
          ['--sg-collapse-content-max-height' as string]:
            height !== undefined ? `${height}px` : isActive ? 'none' : '0px',
        }}
        onTransitionEnd={handleTransitionEnd}
      >
        <div className="sg-collapse-content-inner">{item.children}</div>
      </div>
    </div>
  )
}
