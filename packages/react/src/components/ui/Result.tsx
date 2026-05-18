import React from 'react'
import type { BaseComponentProps } from '../../types'

/** Props for the Result feedback page (status, title, and optional actions). */
export interface ResultProps extends BaseComponentProps {
  /** Outcome type controlling default icon and styling. */
  status: 'success' | 'error' | 'info' | 'warning' | '404' | '403' | '500'
  /** Primary heading for the result. */
  title: React.ReactNode
  /** Secondary explanatory text below the title. */
  subTitle?: React.ReactNode
  /** Replaces the default icon for the given `status`. */
  icon?: React.ReactNode
  /** Actions or buttons shown below the titles (e.g. primary CTA). */
  extra?: React.ReactNode
  /** Additional body content below `extra`. */
  children?: React.ReactNode
}

const icons: Record<string, React.ReactNode> = {
  success: (
    <svg viewBox="64 64 896 896" width="72" height="72" fill="currentColor">
      <path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm193.5 301.7l-210.6 292a31.8 31.8 0 01-51.7 0L318.5 484.9c-3.8-5.3 0-12.7 6.5-12.7h46.9c10.2 0 19.9 4.9 25.9 13.3l71.2 98.8 157.2-218c6-8.3 15.6-13.3 25.9-13.3H699c6.5 0 10.3 7.4 6.5 12.7z" />
    </svg>
  ),
  error: (
    <svg viewBox="64 64 896 896" width="72" height="72" fill="currentColor">
      <path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm165.4 618.2l-66-.3L512 563.4l-99.3 118.4-66.1.3c-4.4 0-8-3.5-8-8 0-1.9.7-3.7 1.9-5.2l130.1-155L340.5 359a8.32 8.32 0 01-1.9-5.2c0-4.4 3.6-8 8-8l66.1.3L512 464.6l99.3-118.4 66-.3c4.4 0 8 3.5 8 8 0 1.9-.7 3.7-1.9 5.2L553.5 514l130 155c1.2 1.5 1.9 3.3 1.9 5.2 0 4.4-3.6 8-8 8z" />
    </svg>
  ),
  info: (
    <svg viewBox="64 64 896 896" width="72" height="72" fill="currentColor">
      <path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm32 664c0 4.4-3.6 8-8 8h-48c-4.4 0-8-3.6-8-8V456c0-4.4 3.6-8 8-8h48c4.4 0 8 3.6 8 8v272zm-32-344a48.01 48.01 0 010-96 48.01 48.01 0 010 96z" />
    </svg>
  ),
  warning: (
    <svg viewBox="64 64 896 896" width="72" height="72" fill="currentColor">
      <path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm-32 232c0-4.4 3.6-8 8-8h48c4.4 0 8 3.6 8 8v272c0 4.4-3.6 8-8 8h-48c-4.4 0-8-3.6-8-8V296zm32 440a48.01 48.01 0 010-96 48.01 48.01 0 010 96z" />
    </svg>
  ),
  '404': (
    <svg viewBox="0 0 252 294" width="252" height="294" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill="currentColor" fontSize="80" fontWeight="bold" opacity="0.25">404</text>
    </svg>
  ),
  '403': (
    <svg viewBox="0 0 252 294" width="252" height="294" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill="currentColor" fontSize="80" fontWeight="bold" opacity="0.25">403</text>
    </svg>
  ),
  '500': (
    <svg viewBox="0 0 252 294" width="252" height="294" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill="currentColor" fontSize="80" fontWeight="bold" opacity="0.25">500</text>
    </svg>
  ),
}

const statusColorMap: Record<string, string> = {
  success: 'var(--sg-color-success)',
  error: 'var(--sg-color-error)',
  info: 'var(--sg-color-primary)',
  warning: 'var(--sg-color-warning)',
  '404': 'var(--sg-color-text-tertiary)',
  '403': 'var(--sg-color-text-tertiary)',
  '500': 'var(--sg-color-text-tertiary)',
}

/**
 * Full-page or section result layout with preset icons for common HTTP and feedback states.
 */
export function Result({
  status,
  title,
  subTitle,
  icon,
  extra,
  children,
  className,
  style,
  unstyled,
}: ResultProps) {
  const resolvedIcon = icon ?? icons[status]

  if (unstyled) {
    return (
      <div className={className} style={style} role="status" aria-live="polite">
        <div>{resolvedIcon}</div>
        <div>{title}</div>
        {subTitle && <div>{subTitle}</div>}
        {extra && <div>{extra}</div>}
        {children}
      </div>
    )
  }

  return (
    <div
      className={['sg-result', `sg-result-${status}`, className].filter(Boolean).join(' ')}
      style={style}
      role="status"
      aria-live="polite"
    >
      <div className="sg-result-icon" style={{ color: statusColorMap[status] }}>
        {resolvedIcon}
      </div>
      <div className="sg-result-title">{title}</div>
      {subTitle && <div className="sg-result-subtitle">{subTitle}</div>}
      {extra && <div className="sg-result-extra">{extra}</div>}
      {children && <div className="sg-result-content">{children}</div>}
    </div>
  )
}
