import React from 'react'
import { useConfig } from '../ConfigProvider'
import type { BaseComponentProps, SizeType } from '../../types'

/** Props for the Avatar component (image, icon, or text fallback). */
export interface AvatarProps extends BaseComponentProps {
  /** Image URL when displaying a photo avatar. */
  src?: string
  /** Alt text for the image when `src` is set. */
  alt?: string
  /** Accessible name for the avatar when there is no visible text. */
  'aria-label'?: string
  /** Width/height in px (number) or preset size token. */
  size?: SizeType | number
  /** Outer shape of the avatar. @default 'circle' */
  shape?: 'circle' | 'square'
  /** Icon node shown when `src` is omitted. */
  icon?: React.ReactNode
  /** Text or initials shown when neither `src` nor `icon` is set. */
  children?: React.ReactNode
}

const sizeMap: Record<string, number> = {
  small: 24,
  default: 32,
  large: 40,
}

/**
 * Renders a user avatar from an image URL, icon, or text content.
 */
export function Avatar({
  src,
  alt,
  'aria-label': ariaLabel,
  size: sizeProp,
  shape = 'circle',
  icon,
  children,
  className,
  style,
  unstyled,
}: AvatarProps) {
  const config = useConfig()
  const size = sizeProp ?? config.size ?? 'middle'
  const avatarSize = typeof size === 'number' ? size : (size === 'middle' ? 'default' : size)
  const px = typeof size === 'number' ? size : sizeMap[avatarSize]
  const fontSize = Math.round(px * 0.45)

  if (unstyled) {
    return (
      <span className={className} style={style} role="img" aria-label={ariaLabel}>
        {src ? <img src={src} alt={alt} /> : icon ?? children}
      </span>
    )
  }

  const classes = [
    'sg-avatar',
    `sg-avatar-${shape}`,
    typeof size === 'string' ? `sg-avatar-${avatarSize}` : '',
    className,
  ].filter(Boolean).join(' ')

  const sizeStyle: React.CSSProperties = {
    width: px,
    height: px,
    lineHeight: `${px}px`,
    fontSize: src ? undefined : fontSize,
    ...style,
  }

  return (
    <span className={classes} style={sizeStyle} role="img" aria-label={ariaLabel}>
      {src ? (
        <img className="sg-avatar-image" src={src} alt={alt} />
      ) : icon ? (
        <span className="sg-avatar-icon">{icon}</span>
      ) : (
        <span className="sg-avatar-text">{children}</span>
      )}
    </span>
  )
}
