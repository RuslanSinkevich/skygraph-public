<script lang="ts">
import {
  computed,
  defineComponent,
  h,
  onBeforeUnmount,
  ref,
  type Component,
  type PropType,
  type VNode,
  type VNodeChild,
} from 'vue'

export interface MenuItem {
  /** Unique key for selection and open-state tracking. */
  key: string
  /**
   * Visible label. Accepts string for the common case and any `VNodeChild`
   * (created via `h()` or `<component :is>`) when rich content is needed
   * (e.g. keyboard shortcuts, badges). Paritet с React: `label: ReactNode`.
   */
  label: string | VNodeChild
  /**
   * Optional leading icon. Accepts any VNode (e.g. created with `h()` or `<component :is>`).
   * Aligns left of the label and inherits the item colour state.
   */
  icon?: VNodeChild
  /** When true, the item cannot be activated. */
  disabled?: boolean
  /** When true, styles the item as a destructive action. */
  danger?: boolean
  /** Nested items for a submenu. */
  children?: MenuItem[]
  /** Renders as a titled group or a non-interactive divider. */
  type?: 'group' | 'divider'
}

function collectNavigable(
  items: MenuItem[],
  openKeys: string[],
  mode: 'vertical' | 'horizontal' | 'inline',
  out: MenuItem[] = [],
): MenuItem[] {
  for (const item of items) {
    if (item.type === 'divider') continue
    if (item.type === 'group') {
      if (item.children) collectNavigable(item.children, openKeys, mode, out)
      continue
    }
    if (item.disabled) continue
    out.push(item)
    if (mode === 'inline' && item.children?.length && openKeys.includes(item.key)) {
      collectNavigable(item.children, openKeys, mode, out)
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

function findParentKey(
  items: MenuItem[],
  key: string,
  parent: string | null = null,
): string | null {
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

interface MenuItemRendererProps {
  item: MenuItem
  mode: 'vertical' | 'horizontal' | 'inline'
  selectedKeys: string[]
  openKeys: string[]
  activeKey: string
  inlineCollapsed: boolean
  depth: number
  unstyled: boolean
  onSelect: (key: string) => void
  onToggleOpen: (key: string) => void
  onFocusKey: (key: string) => void
}

const StyledMenuItem: Component = defineComponent({
  name: 'SgMenuItemStyled',
  props: {
    item: { type: Object as PropType<MenuItem>, required: true },
    mode: { type: String as PropType<MenuItemRendererProps['mode']>, required: true },
    selectedKeys: { type: Array as PropType<string[]>, required: true },
    openKeys: { type: Array as PropType<string[]>, required: true },
    activeKey: { type: String, required: true },
    inlineCollapsed: { type: Boolean, default: false },
    depth: { type: Number, required: true },
    unstyled: { type: Boolean, default: false },
    onSelect: { type: Function as PropType<(key: string) => void>, required: true },
    onToggleOpen: {
      type: Function as PropType<(key: string) => void>,
      required: true,
    },
    onFocusKey: { type: Function as PropType<(key: string) => void>, required: true },
  },
  setup(p): () => VNode {
    const hoverOpen = ref(false)
    let timer: ReturnType<typeof setTimeout> | undefined
    onBeforeUnmount(() => timer && clearTimeout(timer))

    const hasChildren = computed(() => !!(p.item.children && p.item.children.length > 0))
    const isSelected = computed(() => p.selectedKeys.includes(p.item.key))
    const isInlineOpen = computed(() => p.openKeys.includes(p.item.key))
    const showPopover = computed(() => p.mode !== 'inline' && hasChildren.value)
    const showInlineSub = computed(() => p.mode === 'inline' && hasChildren.value)

    const itemClasses = computed(() =>
      [
        'sg-menu-item',
        isSelected.value && !hasChildren.value ? 'sg-menu-item-selected' : '',
        p.item.disabled ? 'sg-menu-item-disabled' : '',
        p.item.danger ? 'sg-menu-item-danger' : '',
        hasChildren.value ? 'sg-menu-submenu' : '',
      ]
        .filter(Boolean)
        .join(' '),
    )

    const wrapperClasses = computed(() =>
      [
        hasChildren.value ? 'sg-menu-submenu-wrapper' : '',
        showPopover.value && hoverOpen.value ? 'sg-menu-submenu-open' : '',
      ]
        .filter(Boolean)
        .join(' '),
    )

    const paddingLeft = computed(() => {
      return p.mode === 'inline' && !p.inlineCollapsed ? `${24 + p.depth * 24}px` : undefined
    })

    function handleMouseEnter() {
      if (!showPopover.value || p.item.disabled) return
      if (timer) clearTimeout(timer)
      hoverOpen.value = true
    }

    function handleMouseLeave() {
      if (!showPopover.value) return
      timer = setTimeout(() => (hoverOpen.value = false), 150)
    }

    function handleClick() {
      if (p.item.disabled) return
      if (showInlineSub.value) {
        p.onToggleOpen(p.item.key)
        return
      }
      if (!hasChildren.value) p.onSelect(p.item.key)
    }

    return () => {
      if (p.item.type === 'divider') {
        return h('li', { class: 'sg-menu-divider', role: 'separator' })
      }
      if (p.item.type === 'group') {
        return h('li', { class: 'sg-menu-group', role: 'group' }, [
          h('div', { class: 'sg-menu-group-title' }, p.item.label as VNode | VNode[] | string),
          h(
            'ul',
            { class: 'sg-menu-group-list', role: 'menu' },
            (p.item.children ?? []).map((child) =>
              h(StyledMenuItem, {
                key: child.key,
                item: child,
                mode: p.mode,
                selectedKeys: p.selectedKeys,
                openKeys: p.openKeys,
                activeKey: p.activeKey,
                inlineCollapsed: p.inlineCollapsed,
                depth: p.depth,
                unstyled: p.unstyled,
                onSelect: p.onSelect,
                onToggleOpen: p.onToggleOpen,
                onFocusKey: p.onFocusKey,
              }),
            ),
          ),
        ])
      }

      const children: VNode[] = []

      if (p.item.label !== undefined) {
        const itemEl = h(
          'div',
          {
            role: 'menuitem',
            'data-menu-key': p.item.key,
            tabindex: p.activeKey === p.item.key ? 0 : -1,
            'aria-selected': isSelected.value,
            'aria-disabled': p.item.disabled || undefined,
            'aria-haspopup': hasChildren.value ? 'menu' : undefined,
            'aria-expanded': hasChildren.value
              ? showPopover.value
                ? hoverOpen.value
                : isInlineOpen.value
              : undefined,
            class: itemClasses.value,
            style: { paddingLeft: paddingLeft.value },
            onClick: handleClick,
            onFocus: () => p.onFocusKey(p.item.key),
          },
          [
            p.item.icon != null
              ? h(
                  'span',
                  { class: 'sg-menu-item-icon', 'aria-hidden': 'true' },
                  // Native HTML elements treat the third arg as children
                  // directly — passing the `{ default }` slot object only
                  // works for components.
                  p.item.icon as VNode | VNode[] | string,
                )
              : // When collapsed to the icon rail an item without an icon would
                // otherwise render blank — fall back to the first letter of the
                // (string) label so the rail stays scannable.
                p.inlineCollapsed && p.depth === 0 && typeof p.item.label === 'string'
                ? h(
                    'span',
                    {
                      class: 'sg-menu-item-icon sg-menu-item-icon-fallback',
                      'aria-hidden': 'true',
                    },
                    (p.item.label as string).trim().charAt(0).toUpperCase(),
                  )
                : null,
            !(p.inlineCollapsed && p.depth === 0)
              ? h('span', { class: 'sg-menu-item-label' }, p.item.label as VNode | VNode[] | string)
              : null,
            hasChildren.value
              ? h('span', {
                  class: [
                    'sg-menu-submenu-arrow',
                    (showPopover.value ? hoverOpen.value : isInlineOpen.value)
                      ? 'sg-menu-submenu-arrow-open'
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' '),
                })
              : null,
          ],
        )
        children.push(itemEl)
      }

      if (showInlineSub.value) {
        children.push(
          h(
            'ul',
            {
              class: ['sg-menu-inline-sub', isInlineOpen.value ? 'sg-menu-inline-sub-open' : '']
                .filter(Boolean)
                .join(' '),
              role: 'menu',
            },
            (p.item.children ?? []).map((child) =>
              h(StyledMenuItem, {
                key: child.key,
                item: child,
                mode: p.mode,
                selectedKeys: p.selectedKeys,
                openKeys: p.openKeys,
                activeKey: p.activeKey,
                inlineCollapsed: p.inlineCollapsed,
                depth: p.depth + 1,
                unstyled: p.unstyled,
                onSelect: p.onSelect,
                onToggleOpen: p.onToggleOpen,
                onFocusKey: p.onFocusKey,
              }),
            ),
          ),
        )
      }

      if (showPopover.value && hoverOpen.value) {
        children.push(
          h(
            'ul',
            { class: 'sg-menu-popup', role: 'menu' },
            (p.item.children ?? []).map((child) =>
              h(StyledMenuItem, {
                key: child.key,
                item: child,
                mode: p.mode,
                selectedKeys: p.selectedKeys,
                openKeys: p.openKeys,
                activeKey: p.activeKey,
                inlineCollapsed: false,
                depth: 0,
                unstyled: p.unstyled,
                onSelect: p.onSelect,
                onToggleOpen: p.onToggleOpen,
                onFocusKey: p.onFocusKey,
              }),
            ),
          ),
        )
      }

      return h(
        'li',
        {
          class: wrapperClasses.value,
          onMouseenter: handleMouseEnter,
          onMouseleave: handleMouseLeave,
        },
        children,
      )
    }
  },
})

export default defineComponent({
  name: 'SgMenu',
  props: {
    items: { type: Array as PropType<MenuItem[]>, required: true },
    mode: {
      type: String as PropType<'vertical' | 'horizontal' | 'inline'>,
      default: 'vertical',
    },
    selectedKeys: { type: Array as PropType<string[] | undefined>, default: undefined },
    defaultSelectedKeys: { type: Array as PropType<string[]>, default: () => [] },
    openKeys: { type: Array as PropType<string[] | undefined>, default: undefined },
    defaultOpenKeys: { type: Array as PropType<string[]>, default: () => [] },
    inlineCollapsed: { type: Boolean, default: false },
    theme: { type: String as PropType<'light' | 'dark'>, default: 'light' },
    unstyled: { type: Boolean, default: false },
  },
  emits: ['select', 'openChange'],
  setup(props, { emit }) {
    const internalSelected = ref<string[]>(props.selectedKeys ?? props.defaultSelectedKeys)
    const internalOpen = ref<string[]>(props.openKeys ?? props.defaultOpenKeys)

    const currentSelected = computed(() => props.selectedKeys ?? internalSelected.value)
    const currentOpen = computed(() => props.openKeys ?? internalOpen.value)

    const navigable = computed(() => collectNavigable(props.items, currentOpen.value, props.mode))

    const initialActive =
      currentSelected.value.find((k) => navigable.value.some((n) => n.key === k)) ??
      navigable.value[0]?.key ??
      ''
    const activeKey = ref(initialActive)

    function handleSelect(key: string) {
      const next = [key]
      internalSelected.value = next
      activeKey.value = key
      emit('select', { key, selectedKeys: next })
    }

    function toggleOpen(key: string) {
      const next = currentOpen.value.includes(key)
        ? currentOpen.value.filter((k) => k !== key)
        : [...currentOpen.value, key]
      internalOpen.value = next
      emit('openChange', next)
    }

    const rootRef = ref<HTMLUListElement | null>(null)

    function focusKey(key: string) {
      activeKey.value = key
      const el = rootRef.value?.querySelector<HTMLElement>(`[data-menu-key="${CSS.escape(key)}"]`)
      el?.focus()
    }

    function moveBy(delta: 1 | -1) {
      const list = navigable.value
      if (list.length === 0) return
      const idx = list.findIndex((n) => n.key === activeKey.value)
      const base = idx < 0 ? (delta === 1 ? -1 : 0) : idx
      const next = (base + delta + list.length) % list.length
      focusKey(list[next].key)
    }

    function isInlineParentOf(parentKey: string, childKey: string) {
      const parent = findByKey(props.items, parentKey)
      if (!parent?.children) return false
      return parent.children.some((c) => c.key === childKey)
    }

    function handleKeyDown(e: KeyboardEvent) {
      const list = navigable.value
      if (list.length === 0) return
      const horizontal = props.mode === 'horizontal'
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
          focusKey(list[0].key)
          break
        case 'End':
          e.preventDefault()
          focusKey(list[list.length - 1].key)
          break
        case 'Enter':
        case ' ': {
          const current = findByKey(props.items, activeKey.value)
          if (!current || current.disabled) return
          e.preventDefault()
          if (current.children?.length) {
            if (props.mode === 'inline') toggleOpen(current.key)
          } else {
            handleSelect(current.key)
          }
          break
        }
        case 'ArrowRight': {
          if (horizontal) return
          const current = findByKey(props.items, activeKey.value)
          if (props.mode === 'inline' && current?.children?.length) {
            e.preventDefault()
            if (!currentOpen.value.includes(current.key)) toggleOpen(current.key)
            else {
              const first = current.children.find((c) => !c.disabled && c.type !== 'divider')
              if (first) focusKey(first.key)
            }
          }
          break
        }
        case 'ArrowLeft': {
          if (horizontal) return
          const current = findByKey(props.items, activeKey.value)
          if (!current) return
          if (
            props.mode === 'inline' &&
            current.children?.length &&
            currentOpen.value.includes(current.key)
          ) {
            e.preventDefault()
            toggleOpen(current.key)
            return
          }
          const parent = findParentKey(props.items, activeKey.value)
          if (parent && isInlineParentOf(parent, activeKey.value) && props.mode === 'inline') {
            e.preventDefault()
            focusKey(parent)
          }
          break
        }
        case 'Escape': {
          const current = findByKey(props.items, activeKey.value)
          const parent = findParentKey(props.items, activeKey.value)
          if (parent && props.mode === 'inline' && currentOpen.value.includes(parent)) {
            e.preventDefault()
            toggleOpen(parent)
            focusKey(parent)
          } else if (
            current?.children?.length &&
            props.mode === 'inline' &&
            currentOpen.value.includes(current.key)
          ) {
            e.preventDefault()
            toggleOpen(current.key)
          }
          break
        }
      }
    }

    return () => {
      const rootClasses = props.unstyled
        ? undefined
        : [
            'sg-menu',
            `sg-menu-${props.mode}`,
            `sg-menu-${props.theme}`,
            props.inlineCollapsed ? 'sg-menu-collapsed' : '',
          ]
            .filter(Boolean)
            .join(' ')

      return h(
        'ul',
        {
          ref: rootRef,
          role: 'menu',
          'aria-orientation': props.mode === 'horizontal' ? 'horizontal' : 'vertical',
          class: rootClasses,
          onKeydown: handleKeyDown,
        },
        props.items.map((item) =>
          h(StyledMenuItem, {
            key: item.key,
            item,
            mode: props.mode,
            selectedKeys: currentSelected.value,
            openKeys: currentOpen.value,
            activeKey: activeKey.value,
            inlineCollapsed: props.inlineCollapsed,
            depth: 0,
            unstyled: props.unstyled,
            onSelect: handleSelect,
            onToggleOpen: toggleOpen,
            onFocusKey: (k: string) => (activeKey.value = k),
          }),
        ),
      )
    }
  },
})
</script>
