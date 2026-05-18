import React from 'react'
import { useConfig } from '../ConfigProvider'
import type { BaseComponentProps } from '../../types'

/** One segment in the breadcrumb trail. */
export interface BreadcrumbItem {
  /** Segment label or custom content. */
  title: React.ReactNode
  /** When set, the segment renders as a link with this URL. */
  href?: string
  /** Invoked on click; prevents navigation when `href` is also set. */
  onClick?: () => void
}

/** Props for the breadcrumb navigation list. */
export interface BreadcrumbProps extends BaseComponentProps {
  /** Ordered trail from root to current location. */
  items: BreadcrumbItem[]
  /** Node rendered between segments. @default '/' */
  separator?: React.ReactNode
}

/** Renders a breadcrumb trail with optional links, custom separators, and current-page styling. */
export function Breadcrumb({
  items,
  separator = '/',
  className,
  style,
  unstyled,
}: BreadcrumbProps) {
  const ariaLabel = useConfig().locale?.breadcrumb?.ariaLabel ?? 'Breadcrumb'
  if (unstyled) {
    return (
      <nav className={className} style={style} aria-label={ariaLabel}>
        {items.map((item, i) => (
          <span key={i}>
            {item.href ? <a href={item.href}>{item.title}</a> : item.title}
            {i < items.length - 1 && <span>{separator}</span>}
          </span>
        ))}
      </nav>
    )
  }

  return (
    <nav
      className={['sg-breadcrumb', className].filter(Boolean).join(' ')}
      style={style}
      aria-label={ariaLabel}
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        return (
          <React.Fragment key={i}>
            {item.href || item.onClick ? (
              <a
                className="sg-breadcrumb-link"
                href={item.href}
                onClick={(e) => {
                  if (item.onClick) {
                    e.preventDefault()
                    item.onClick()
                  }
                }}
              >
                {item.title}
              </a>
            ) : (
              <span className={isLast ? 'sg-breadcrumb-current' : 'sg-breadcrumb-link'}>
                {item.title}
              </span>
            )}
            {!isLast && <span className="sg-breadcrumb-separator">{separator}</span>}
          </React.Fragment>
        )
      })}
    </nav>
  )
}
