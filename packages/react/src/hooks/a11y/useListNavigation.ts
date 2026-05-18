import { useState, useCallback, useRef } from 'react'

export interface ListNavigationOptions {
  itemCount: number
  loop?: boolean
  onSelect?: (index: number) => void
  typeaheadTimeout?: number
}

export function useListNavigation(options: ListNavigationOptions) {
  const { itemCount, loop = true, onSelect, typeaheadTimeout = 500 } = options
  const [activeIndex, setActiveIndex] = useState(-1)
  const itemsRef = useRef<(HTMLElement | null)[]>([])
  const typeaheadRef = useRef('')
  const typeaheadTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const labelsRef = useRef<string[]>([])

  const setItemRef = useCallback(
    (index: number) => (el: HTMLElement | null) => {
      itemsRef.current[index] = el
    },
    [],
  )

  const setLabels = useCallback((labels: string[]) => {
    labelsRef.current = labels
  }, [])

  const focusItem = useCallback((index: number) => {
    if (index < 0 || index >= itemCount) return
    setActiveIndex(index)
    itemsRef.current[index]?.focus()
  }, [itemCount])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault()
          let next = activeIndex + 1
          if (next >= itemCount) next = loop ? 0 : itemCount - 1
          focusItem(next)
          break
        }
        case 'ArrowUp': {
          e.preventDefault()
          let prev = activeIndex - 1
          if (prev < 0) prev = loop ? itemCount - 1 : 0
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
          focusItem(itemCount - 1)
          break
        }
        case 'Enter':
        case ' ': {
          e.preventDefault()
          if (activeIndex >= 0) {
            onSelect?.(activeIndex)
          }
          break
        }
        case 'Escape': {
          e.preventDefault()
          setActiveIndex(-1)
          break
        }
        default: {
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
            clearTimeout(typeaheadTimerRef.current)
            typeaheadRef.current += e.key.toLowerCase()
            typeaheadTimerRef.current = setTimeout(() => {
              typeaheadRef.current = ''
            }, typeaheadTimeout)

            const query = typeaheadRef.current
            const startIndex = activeIndex >= 0 ? activeIndex + 1 : 0
            for (let i = 0; i < itemCount; i++) {
              const idx = (startIndex + i) % itemCount
              const label = labelsRef.current[idx]?.toLowerCase() ?? ''
              if (label.startsWith(query)) {
                focusItem(idx)
                break
              }
            }
          }
        }
      }
    },
    [activeIndex, itemCount, loop, onSelect, focusItem, typeaheadTimeout],
  )

  return {
    activeIndex,
    setActiveIndex: focusItem,
    setItemRef,
    setLabels,
    handleKeyDown,
  }
}
