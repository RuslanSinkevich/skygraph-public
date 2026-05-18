import React, { useEffect, useRef, useState } from 'react'

/** One entry in a table context menu. */
export interface ContextMenuItem {
  /** Unique key among siblings. */
  key: string
  /** Primary label. */
  label: React.ReactNode
  /** Optional leading icon. */
  icon?: React.ReactNode
  /** Destructive styling. */
  danger?: boolean
  /** Disables click handling. */
  disabled?: boolean
  /** Renders a separator instead of a row. */
  divider?: boolean
  /** Invoked on item activate. */
  onClick?: () => void
  /** Nested submenu items. */
  children?: ContextMenuItem[]
}

/** Open context menu position and items. */
export interface ContextMenuState {
  /** Viewport X in pixels. */
  x: number
  /** Viewport Y in pixels. */
  y: number
  /** Root menu items. */
  items: ContextMenuItem[]
}

/** Props for the floating context menu overlay. */
interface ContextMenuProps {
  /** Current menu state, or null when closed. */
  state: ContextMenuState | null
  /** Closes the menu on outside interaction. */
  onClose: () => void
}

/**
 * Fixed-position menu for header/cell context actions.
 * Closes on outside click, Escape, or window scroll.
 */
export function ContextMenu({ state, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [subMenu, setSubMenu] = useState<{ key: string; x: number; y: number; items: ContextMenuItem[] } | null>(null)

  useEffect(() => {
    if (!state) return
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const handleScroll = () => onClose()

    document.addEventListener('mousedown', handle)
    document.addEventListener('keydown', handleKey)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handle)
      document.removeEventListener('keydown', handleKey)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [state, onClose])

  if (!state) return null

  // Runtime-only positioning: coordinates come from the click event and the
  // submenu hangs off the parent's right edge. Every other visual property
  // lives in `packages/styles/components/context-menu.css`.
  const rootStyle: React.CSSProperties = {
    position: 'fixed',
    top: state.y,
    left: state.x,
  }
  const submenuStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: '100%',
  }

  const itemClass = (item: ContextMenuItem) => {
    const classes = ['sg-context-menu-item']
    if (item.danger) classes.push('sg-context-menu-item--danger')
    if (item.disabled) classes.push('sg-context-menu-item--disabled')
    return classes.join(' ')
  }

  const renderItems = (items: ContextMenuItem[], isSubmenu = false) => (
    <div
      ref={isSubmenu ? undefined : ref}
      className="sg-context-menu"
      style={isSubmenu ? submenuStyle : rootStyle}
      role="menu"
    >
      {items.map((item) => {
        if (item.divider) {
          return <div key={item.key} className="sg-context-menu-divider" />
        }

        return (
          <div
            key={item.key}
            className={itemClass(item)}
            role="menuitem"
            onClick={() => {
              if (item.disabled) return
              item.onClick?.()
              if (!item.children) onClose()
            }}
            onMouseEnter={(e) => {
              if (item.children) {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                setSubMenu({ key: item.key, x: rect.right, y: rect.top, items: item.children })
              } else {
                setSubMenu(null)
              }
            }}
          >
            {item.icon && <span className="sg-context-menu-icon">{item.icon}</span>}
            <span className="sg-context-menu-label">{item.label}</span>
            {item.children && <span className="sg-context-menu-submenu-arrow">›</span>}
            {subMenu?.key === item.key && item.children && renderItems(item.children, true)}
          </div>
        )
      })}
    </div>
  )

  return renderItems(state.items)
}
