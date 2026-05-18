import { ref, isRef, type Ref, type ComputedRef } from 'vue'

export interface RovingTabIndexOptions {
  orientation?: 'vertical' | 'horizontal' | 'both'
  loop?: boolean
}

export interface RovingItemProps {
  /**
   * Vue template-ref callback. Accepts the wider `Element | ComponentPublic
   * Instance | null` shape Vue's runtime passes to ref-fn callbacks; we cast
   * down to `HTMLElement` internally.
   */
  ref: (el: unknown) => void
  tabindex: 0 | -1
  onFocus: () => void
  onKeydown: (e: KeyboardEvent) => void
}

export interface UseRovingTabIndexReturn {
  activeIndex: Ref<number>
  setActiveIndex: (index: number) => void
  getItemProps: (index: number) => RovingItemProps
  handleKeyDown: (e: KeyboardEvent) => void
}

/**
 * Vue 3 composable parallel to React's `useRovingTabIndex`.
 *
 * Implements roving tabindex pattern over a fixed-size collection of items:
 * one item has `tabindex="0"`, the rest have `tabindex="-1"`. Arrow keys move
 * focus and the active index. `getItemProps(index)` returns the props to spread
 * on each item (ref, tabindex, onFocus, onKeydown).
 */
export function useRovingTabIndex(
  itemCount: number | Ref<number> | ComputedRef<number>,
  options: RovingTabIndexOptions = {},
): UseRovingTabIndexReturn {
  const { orientation = 'vertical', loop = true } = options
  const activeIndex = ref(0)
  const items: (HTMLElement | null)[] = []

  const getCount = () => (isRef(itemCount) ? itemCount.value : itemCount)

  const setItemRef = (index: number) => (el: unknown) => {
    items[index] = el as HTMLElement | null
  }

  const focusItem = (index: number) => {
    activeIndex.value = index
    items[index]?.focus()
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    const count = getCount()
    let nextIndex = activeIndex.value

    const isNext =
      (orientation !== 'horizontal' && e.key === 'ArrowDown') ||
      (orientation !== 'vertical' && e.key === 'ArrowRight')

    const isPrev =
      (orientation !== 'horizontal' && e.key === 'ArrowUp') ||
      (orientation !== 'vertical' && e.key === 'ArrowLeft')

    if (isNext) {
      e.preventDefault()
      nextIndex = activeIndex.value + 1
      if (nextIndex >= count) {
        nextIndex = loop ? 0 : count - 1
      }
    } else if (isPrev) {
      e.preventDefault()
      nextIndex = activeIndex.value - 1
      if (nextIndex < 0) {
        nextIndex = loop ? count - 1 : 0
      }
    } else if (e.key === 'Home') {
      e.preventDefault()
      nextIndex = 0
    } else if (e.key === 'End') {
      e.preventDefault()
      nextIndex = count - 1
    } else {
      return
    }

    focusItem(nextIndex)
  }

  const getItemProps = (index: number): RovingItemProps => ({
    ref: setItemRef(index),
    tabindex: index === activeIndex.value ? 0 : -1,
    onFocus: () => {
      activeIndex.value = index
    },
    onKeydown: handleKeyDown,
  })

  return {
    activeIndex,
    setActiveIndex: focusItem,
    getItemProps,
    handleKeyDown,
  }
}
