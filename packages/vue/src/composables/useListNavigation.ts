import { ref, isRef, type Ref, type ComputedRef } from 'vue'

export interface ListNavigationOptions {
  itemCount: number | Ref<number> | ComputedRef<number>
  loop?: boolean
  onSelect?: (index: number) => void
  typeaheadTimeout?: number
}

export interface UseListNavigationReturn {
  activeIndex: Ref<number>
  setActiveIndex: (index: number) => void
  setItemRef: (index: number) => (el: HTMLElement | null) => void
  setLabels: (labels: string[]) => void
  handleKeyDown: (e: KeyboardEvent) => void
}

/**
 * Vue 3 composable parallel to React's `useListNavigation`.
 *
 * Adds full keyboard navigation to a list-like structure: arrow / Home / End
 * navigation, Enter / Space activation, Escape to clear, and typeahead jump.
 */
export function useListNavigation(options: ListNavigationOptions): UseListNavigationReturn {
  const { itemCount, loop = true, onSelect, typeaheadTimeout = 500 } = options
  const activeIndex = ref(-1)
  const items: (HTMLElement | null)[] = []
  const labels: string[] = []
  let typeahead = ''
  let typeaheadTimer: ReturnType<typeof setTimeout> | undefined

  const getCount = () => (isRef(itemCount) ? itemCount.value : itemCount)

  const setItemRef = (index: number) => (el: HTMLElement | null) => {
    items[index] = el
  }

  const setLabels = (next: string[]) => {
    labels.length = 0
    labels.push(...next)
  }

  const focusItem = (index: number) => {
    const count = getCount()
    if (index < 0 || index >= count) return
    activeIndex.value = index
    items[index]?.focus()
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    const count = getCount()
    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault()
        let next = activeIndex.value + 1
        if (next >= count) next = loop ? 0 : count - 1
        focusItem(next)
        break
      }
      case 'ArrowUp': {
        e.preventDefault()
        let prev = activeIndex.value - 1
        if (prev < 0) prev = loop ? count - 1 : 0
        focusItem(prev)
        break
      }
      case 'Home': {
        e.preventDefault()
        focusItem(0)
        break
      }
      case 'End': {
        e.preventDefault()
        focusItem(count - 1)
        break
      }
      case 'Enter':
      case ' ': {
        e.preventDefault()
        if (activeIndex.value >= 0) {
          onSelect?.(activeIndex.value)
        }
        break
      }
      case 'Escape': {
        e.preventDefault()
        activeIndex.value = -1
        break
      }
      default: {
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
          if (typeaheadTimer) clearTimeout(typeaheadTimer)
          typeahead += e.key.toLowerCase()
          typeaheadTimer = setTimeout(() => {
            typeahead = ''
          }, typeaheadTimeout)

          const query = typeahead
          const startIndex = activeIndex.value >= 0 ? activeIndex.value + 1 : 0
          for (let i = 0; i < count; i++) {
            const idx = (startIndex + i) % count
            const label = labels[idx]?.toLowerCase() ?? ''
            if (label.startsWith(query)) {
              focusItem(idx)
              break
            }
          }
        }
      }
    }
  }

  return {
    activeIndex,
    setActiveIndex: focusItem,
    setItemRef,
    setLabels,
    handleKeyDown,
  }
}
