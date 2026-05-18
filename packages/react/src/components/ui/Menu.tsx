import { useState, useRef, useEffect, useCallback, type ReactNode, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { BaseComponentProps, SizableProps } from '../../types'

function collectNavigableItems(
  items: MenuItem[],
  openKeys: string[],
  mode: 'vertical' | 'horizontal' | 'inline',
  out: MenuItem[] = [],
): MenuItem[] {
  for (const item of items) {
    if (item.type === 'divider') continue
    if (item.type === 'group') {
      if (item.children) collectNavigableItems(item.children, openKeys, mode, out)
      continue
    }
    if (item.disabled) continue
    out.push(item)
    if (mode === 'inline' && item.children?.length && openKeys.includes(item.key)) {
      collectNavigableItems(item.children, openKeys, mode, out)
    }
  }
  return out
}

function findByKey(items: MenuItem[], key: string): MenuItem | null {
  for (const item of items) {
    if (item.key === key && item.type !== 'divider' && item.type !== 'group') return item
    if (item.children) {
      const found = findByKey(item.children, key)
      if (found) return found
    }
  }
  return null
}

function findParentKey(items: MenuItem[], key: string, parent: string | null = null): string | null {
  for (const item of items) {
    if (item.key === key) return parent
    if (item.children) {
      const nextParent = item.type === 'group' ? parent : item.key
      const found = findParentKey(item.children, key, nextParent)
      if (found !== null) return found
    }
  }
  return null
}

/** Single menu entry: leaf item, submenu, group heading, or divider. */
export interface MenuItem {
  /** Unique key for selection and open-state tracking. */
  key: string
  /** Visible label or custom node. */
  label: ReactNode
  /** Optional icon shown before the label. */
  icon?: ReactNode
  /** When true, the item cannot be activated. */
  disabled?: boolean
  /** When true, styles the item as a destructive action. */
  danger?: boolean
  /** Nested items for a submenu; omit for a leaf. */
  children?: MenuItem[]
  /** Renders as a titled group or a non-interactive divider. */
  type?: 'group' | 'divider'
}

/** Props for the hierarchical menu with optional inline, horizontal, or vertical layout. */
export interface MenuProps extends BaseComponentProps, SizableProps {
  /** Top-level menu items (may include groups and nested submenus). */
  items: MenuItem[]
  /** Layout and interaction mode for the root menu. @default 'vertical' */
  mode?: 'vertical' | 'horizontal' | 'inline'
  /** Controlled list of selected item keys. */
  selectedKeys?: string[]
  /** Initial selected keys when `selectedKeys` is not set. @default [] */
  defaultSelectedKeys?: string[]
  /** Controlled list of keys for expanded inline submenus. */
  openKeys?: string[]
  /** Initial open submenu keys when `openKeys` is not set. @default [] */
  defaultOpenKeys?: string[]
  /** Called after the user selects a leaf item. */
  onSelect?: (info: { key: string; selectedKeys: string[] }) => void
  /** Called when inline submenu expand/collapse state changes. */
  onOpenChange?: (openKeys: string[]) => void
  /** Collapses inline mode to icons only at the root level. @default false */
  inlineCollapsed?: boolean
  /** Built-in color scheme for styled menus. @default 'light' */
  theme?: 'light' | 'dark'
}

/**
 * Renders an accessible menu tree with support for groups, dividers, and nested submenus.
 * Supports controlled or uncontrolled selection and open keys.
 */
export function Menu({
  items,
  mode = 'vertical',
  selectedKeys,
  defaultSelectedKeys = [],
  openKeys,
  defaultOpenKeys = [],
  onSelect,
  onOpenChange,
  inlineCollapsed = false,
  theme = 'light',
  className,
  style,
  unstyled,
}: MenuProps) {
  const [internalSelected, setInternalSelected] = useState<string[]>(
    selectedKeys ?? defaultSelectedKeys
  )
  const [internalOpen, setInternalOpen] = useState<string[]>(
    openKeys ?? defaultOpenKeys
  )
  const rootRef = useRef<HTMLUListElement>(null)

  const currentSelected = selectedKeys ?? internalSelected
  const currentOpen = openKeys ?? internalOpen

  const navigable = collectNavigableItems(items, currentOpen, mode)
  const initialActive =
    currentSelected.find((k) => navigable.some((n) => n.key === k)) ??
    navigable[0]?.key ??
    ''
  const [activeKey, setActiveKey] = useState(initialActive)

  useEffect(() => {
    if (!activeKey || !navigable.some((n) => n.key === activeKey)) {
      setActiveKey(navigable[0]?.key ?? '')
    }
  }, [activeKey, navigable])

  const handleSelect = (key: string) => {
    const next = [key]
    setInternalSelected(next)
    setActiveKey(key)
    onSelect?.({ key, selectedKeys: next })
  }

  const toggleOpen = (key: string) => {
    const next = currentOpen.includes(key)
      ? currentOpen.filter((k) => k !== key)
      : [...currentOpen, key]
    setInternalOpen(next)
    onOpenChange?.(next)
  }

  const focusKey = useCallback((key: string) => {
    setActiveKey(key)
    const el = rootRef.current?.querySelector<HTMLElement>(
      `[data-menu-key="${CSS.escape(key)}"]`,
    )
    el?.focus()
  }, [])

  const moveBy = useCallback(
    (delta: 1 | -1) => {
      if (navigable.length === 0) return
      const idx = navigable.findIndex((n) => n.key === activeKey)
      const base = idx < 0 ? (delta === 1 ? -1 : 0) : idx
      const next = (base + delta + navigable.length) % navigable.length
      focusKey(navigable[next].key)
    },
    [navigable, activeKey, focusKey],
  )

  const isInlineParentOf = (parentKey: string, childKey: string): boolean => {
    const parent = findByKey(items, parentKey)
    if (!parent?.children) return false
    return parent.children.some((c) => c.key === childKey)
  }

  const handleRootKeyDown = (e: ReactKeyboardEvent<HTMLUListElement>) => {
    if (navigable.length === 0) return
    const horizontal = mode === 'horizontal'
    const primaryNext = horizontal ? 'ArrowRight' : 'ArrowDown'
    const primaryPrev = horizontal ? 'ArrowLeft' : 'ArrowUp'

    switch (e.key) {
      case primaryNext:
        e.preventDefault()
        moveBy(1)
        break
      case primaryPrev:
        e.preventDefault()
        moveBy(-1)
        break
      case 'Home':
        e.preventDefault()
        focusKey(navigable[0].key)
        break
      case 'End':
        e.preventDefault()
        focusKey(navigable[navigable.length - 1].key)
        break
      case 'Enter':
      case ' ': {
        const current = findByKey(items, activeKey)
        if (!current || current.disabled) return
        e.preventDefault()
        if (current.children?.length) {
          if (mode === 'inline') toggleOpen(current.key)
        } else {
          handleSelect(current.key)
        }
        break
      }
      case 'ArrowRight': {
        if (horizontal) return
        const current = findByKey(items, activeKey)
        if (mode === 'inline' && current?.children?.length) {
          e.preventDefault()
          if (!currentOpen.includes(current.key)) toggleOpen(current.key)
          else {
            const first = current.children.find((c) => !c.disabled && c.type !== 'divider')
            if (first) focusKey(first.key)
          }
        }
        break
      }
      case 'ArrowLeft': {
        if (horizontal) return
        const current = findByKey(items, activeKey)
        if (!current) return
        if (mode === 'inline' && current.children?.length && currentOpen.includes(current.key)) {
          e.preventDefault()
          toggleOpen(current.key)
          return
        }
        const parent = findParentKey(items, activeKey)
        if (parent && isInlineParentOf(parent, activeKey) && mode === 'inline') {
          e.preventDefault()
          focusKey(parent)
        }
        break
      }
      case 'Escape': {
        const current = findByKey(items, activeKey)
        const parent = findParentKey(items, activeKey)
        if (parent && mode === 'inline' && currentOpen.includes(parent)) {
          e.preventDefault()
          toggleOpen(parent)
          focusKey(parent)
        } else if (current?.children?.length && mode === 'inline' && currentOpen.includes(current.key)) {
          e.preventDefault()
          toggleOpen(current.key)
        }
        break
      }
    }
  }

  if (unstyled) {
    return (
      <ul
        ref={rootRef}
        role="menu"
        aria-orientation={mode === 'horizontal' ? 'horizontal' : 'vertical'}
        className={className}
        style={style}
        onKeyDown={handleRootKeyDown}
      >
        {items.map((item) => (
          <UnstyledMenuItem
            key={item.key}
            item={item}
            selectedKeys={currentSelected}
            openKeys={currentOpen}
            activeKey={activeKey}
            onSelect={handleSelect}
            onToggleOpen={toggleOpen}
            onFocusKey={setActiveKey}
          />
        ))}
      </ul>
    )
  }

  const rootClasses = [
    'sg-menu',
    `sg-menu-${mode}`,
    `sg-menu-${theme}`,
    inlineCollapsed ? 'sg-menu-collapsed' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <ul
      ref={rootRef}
      role="menu"
      aria-orientation={mode === 'horizontal' ? 'horizontal' : 'vertical'}
      className={rootClasses}
      style={style}
      onKeyDown={handleRootKeyDown}
    >
      {items.map((item) => (
        <StyledMenuItem
          key={item.key}
          item={item}
          mode={mode}
          selectedKeys={currentSelected}
          openKeys={currentOpen}
          activeKey={activeKey}
          onSelect={handleSelect}
          onToggleOpen={toggleOpen}
          onFocusKey={setActiveKey}
          inlineCollapsed={inlineCollapsed}
          depth={0}
        />
      ))}
    </ul>
  )
}

/* ---- Unstyled (headless) ---- */

function UnstyledMenuItem({
  item,
  selectedKeys,
  openKeys,
  activeKey,
  onSelect,
  onToggleOpen,
  onFocusKey,
}: {
  item: MenuItem
  selectedKeys: string[]
  openKeys: string[]
  activeKey: string
  onSelect: (key: string) => void
  onToggleOpen: (key: string) => void
  onFocusKey: (key: string) => void
}) {
  if (item.type === 'divider') return <li role="separator" />
  if (item.type === 'group') {
    return (
      <li role="group">
        <span>{item.label}</span>
        <ul role="menu">
          {item.children?.map((child) => (
            <UnstyledMenuItem
              key={child.key}
              item={child}
              selectedKeys={selectedKeys}
              openKeys={openKeys}
              activeKey={activeKey}
              onSelect={onSelect}
              onToggleOpen={onToggleOpen}
              onFocusKey={onFocusKey}
            />
          ))}
        </ul>
      </li>
    )
  }
  if (item.children?.length) {
    const isOpen = openKeys.includes(item.key)
    const isActive = activeKey === item.key
    return (
      <li>
        <button
          data-menu-key={item.key}
          disabled={item.disabled}
          aria-expanded={isOpen}
          aria-haspopup="menu"
          tabIndex={isActive ? 0 : -1}
          onClick={() => onToggleOpen(item.key)}
          onFocus={() => onFocusKey(item.key)}
        >
          {item.icon}
          {item.label}
        </button>
        {isOpen && (
          <ul role="menu">
            {item.children.map((child) => (
              <UnstyledMenuItem
                key={child.key}
                item={child}
                selectedKeys={selectedKeys}
                openKeys={openKeys}
                activeKey={activeKey}
                onSelect={onSelect}
                onToggleOpen={onToggleOpen}
                onFocusKey={onFocusKey}
              />
            ))}
          </ul>
        )}
      </li>
    )
  }
  const isActive = activeKey === item.key
  return (
    <li
      role="menuitem"
      data-menu-key={item.key}
      tabIndex={isActive ? 0 : -1}
      aria-selected={selectedKeys.includes(item.key)}
      aria-disabled={item.disabled || undefined}
      onClick={() => !item.disabled && onSelect(item.key)}
      onFocus={() => onFocusKey(item.key)}
    >
      {item.icon}
      {item.label}
    </li>
  )
}

/* ---- Styled ---- */

function StyledMenuItem({
  item,
  mode,
  selectedKeys,
  openKeys,
  activeKey,
  onSelect,
  onToggleOpen,
  onFocusKey,
  inlineCollapsed,
  depth,
}: {
  item: MenuItem
  mode: 'vertical' | 'horizontal' | 'inline'
  selectedKeys: string[]
  openKeys: string[]
  activeKey: string
  onSelect: (key: string) => void
  onToggleOpen: (key: string) => void
  onFocusKey: (key: string) => void
  inlineCollapsed: boolean
  depth: number
}) {
  const popoverRef = useRef<HTMLLIElement>(null)
  const [hoverOpen, setHoverOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    return () => clearTimeout(timerRef.current)
  }, [])

  if (item.type === 'divider') {
    return <li className="sg-menu-divider" role="separator" />
  }

  if (item.type === 'group') {
    return (
      <li className="sg-menu-group" role="group">
        <div className="sg-menu-group-title">{item.label}</div>
        <ul className="sg-menu-group-list" role="menu">
          {item.children?.map((child) => (
            <StyledMenuItem
              key={child.key}
              item={child}
              mode={mode}
              selectedKeys={selectedKeys}
              openKeys={openKeys}
              activeKey={activeKey}
              onSelect={onSelect}
              onToggleOpen={onToggleOpen}
              onFocusKey={onFocusKey}
              inlineCollapsed={inlineCollapsed}
              depth={depth}
            />
          ))}
        </ul>
      </li>
    )
  }

  const hasChildren = !!(item.children && item.children.length > 0)
  const isSelected = selectedKeys.includes(item.key)
  const isInlineOpen = openKeys.includes(item.key)
  const showPopover = mode !== 'inline' && hasChildren
  const showInlineSub = mode === 'inline' && hasChildren

  const itemClasses = [
    'sg-menu-item',
    isSelected && !hasChildren ? 'sg-menu-item-selected' : '',
    item.disabled ? 'sg-menu-item-disabled' : '',
    item.danger ? 'sg-menu-item-danger' : '',
    hasChildren ? 'sg-menu-submenu' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const handleMouseEnter = () => {
    if (!showPopover || item.disabled) return
    clearTimeout(timerRef.current)
    setHoverOpen(true)
  }

  const handleMouseLeave = () => {
    if (!showPopover) return
    timerRef.current = setTimeout(() => setHoverOpen(false), 150)
  }

  const handleItemClick = () => {
    if (item.disabled) return
    if (showInlineSub) {
      onToggleOpen(item.key)
      return
    }
    if (!hasChildren) {
      onSelect(item.key)
    }
  }

  const paddingLeft =
    mode === 'inline' && !inlineCollapsed ? `${24 + depth * 24}px` : undefined

  return (
    <li
      ref={popoverRef}
      className={[
        hasChildren ? 'sg-menu-submenu-wrapper' : '',
        showPopover && hoverOpen ? 'sg-menu-submenu-open' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        role="menuitem"
        data-menu-key={item.key}
        tabIndex={activeKey === item.key ? 0 : -1}
        aria-selected={isSelected}
        aria-disabled={item.disabled || undefined}
        aria-haspopup={hasChildren ? 'menu' : undefined}
        aria-expanded={hasChildren ? (showPopover ? hoverOpen : isInlineOpen) : undefined}
        className={itemClasses}
        style={{ paddingLeft }}
        onClick={handleItemClick}
        onFocus={() => onFocusKey(item.key)}
      >
        {item.icon && <span className="sg-menu-item-icon">{item.icon}</span>}
        {!(inlineCollapsed && depth === 0) && (
          <span className="sg-menu-item-label">{item.label}</span>
        )}
        {hasChildren && (
          <span
            className={[
              'sg-menu-submenu-arrow',
              (showPopover ? hoverOpen : isInlineOpen)
                ? 'sg-menu-submenu-arrow-open'
                : '',
            ]
              .filter(Boolean)
              .join(' ')}
          />
        )}
      </div>

      {/* Inline submenu */}
      {showInlineSub && (
        <ul
          className={[
            'sg-menu-inline-sub',
            isInlineOpen ? 'sg-menu-inline-sub-open' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          role="menu"
        >
          {item.children!.map((child) => (
            <StyledMenuItem
              key={child.key}
              item={child}
              mode={mode}
              selectedKeys={selectedKeys}
              openKeys={openKeys}
              activeKey={activeKey}
              onSelect={onSelect}
              onToggleOpen={onToggleOpen}
              onFocusKey={onFocusKey}
              inlineCollapsed={inlineCollapsed}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}

      {/* Popover submenu (vertical / horizontal) */}
      {showPopover && hoverOpen && (
        <ul className="sg-menu-popup" role="menu">
          {item.children!.map((child) => (
            <StyledMenuItem
              key={child.key}
              item={child}
              mode={mode}
              selectedKeys={selectedKeys}
              openKeys={openKeys}
              activeKey={activeKey}
              onSelect={onSelect}
              onToggleOpen={onToggleOpen}
              onFocusKey={onFocusKey}
              inlineCollapsed={false}
              depth={0}
            />
          ))}
        </ul>
      )}
    </li>
  )
}
