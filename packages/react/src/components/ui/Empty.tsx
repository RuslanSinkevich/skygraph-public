import React from 'react'
import { useConfig } from '../ConfigProvider'
import type { BaseComponentProps } from '../../types'

/** Props for the Empty state component. */
export interface EmptyProps extends BaseComponentProps {
  /** Illustration or icon above the description; uses built-in art when omitted. */
  image?: React.ReactNode
  /** Message below the image; defaults to "No Data" when undefined, hidden when null. */
  description?: React.ReactNode
  /** Optional footer actions or supplementary content. */
  children?: React.ReactNode
}

const DefaultImage = () => (
  <svg width="64" height="41" viewBox="0 0 64 41" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" fillRule="evenodd" transform="translate(0 1)">
      <ellipse cx="32" cy="33" rx="32" ry="7" fill="currentColor" opacity="0.08" />
      <g fillRule="nonzero" stroke="currentColor" strokeOpacity="0.25">
        <path d="M55 12.76L44.854 1.258C44.367.474 43.656 0 42.907 0H21.093c-.749 0-1.46.474-1.947 1.257L9 12.761V22h46v-9.24z" />
        <path
          d="M41.613 15.931c0-1.605.994-2.93 2.227-2.931H55v18.137C55 33.26 53.68 35 52.05 35H11.95C10.32 35 9 33.259 9 31.137V13h11.16c1.233 0 2.227 1.323 2.227 2.928v.022c0 1.605 1.005 2.901 2.237 2.901h14.752c1.232 0 2.237-1.308 2.237-2.913v-.007z"
          fill="currentColor"
          opacity="0.08"
        />
      </g>
    </g>
  </svg>
)

/**
 * Presents a no-data state with optional image, description, and footer slot.
 */
export function Empty({
  image,
  description,
  children,
  className,
  style,
  unstyled,
}: EmptyProps) {
  const localeDefault = useConfig().locale?.empty?.description ?? 'No Data'
  const desc = description === undefined ? localeDefault : description

  if (unstyled) {
    return (
      <div className={className} style={style} role="status">
        <div>{image ?? <DefaultImage />}</div>
        {desc !== null && <p>{desc}</p>}
        {children}
      </div>
    )
  }

  return (
    <div className={['sg-empty', className].filter(Boolean).join(' ')} style={style} role="status">
      <div className="sg-empty-image">{image ?? <DefaultImage />}</div>
      {desc !== null && <p className="sg-empty-description">{desc}</p>}
      {children && <div className="sg-empty-footer">{children}</div>}
    </div>
  )
}
