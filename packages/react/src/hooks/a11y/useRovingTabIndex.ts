import { useState, useCallback, useRef } from 'react'

export interface RovingTabIndexOptions {
  orientation?: 'vertical' | 'horizontal' | 'both'
  loop?: boolean
}

export function useRovingTabIndex(
  itemCount: number,
  options: RovingTabIndexOptions = {},
) {
  const { orientation = 'vertical', loop = true } = options
  const [activeIndex, setActiveIndex] = useState(0)
  const itemsRef = useRef<(HTMLElement | null)[]>([])

  const setItemRef = useCallback(
    (index: number) => (el: HTMLElement | null) => {
      itemsRef.current[index] = el
    },
    [],
  )

  const focusItem = useCallback(
    (index: number) => {
      setActiveIndex(index)
      itemsRef.current[index]?.focus()
    },
    [],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      let nextIndex = activeIndex

      const isNext =
        (orientation !== 'horizontal' && e.key === 'ArrowDown') ||
        (orientation !== 'vertical' && e.key === 'ArrowRight')

      const isPrev =
        (orientation !== 'horizontal' && e.key === 'ArrowUp') ||
        (orientation !== 'vertical' && e.key === 'ArrowLeft')

      if (isNext) {
        e.preventDefault()
        nextIndex = activeIndex + 1
        if (nextIndex >= itemCount) {
          nextIndex = loop ? 0 : itemCount - 1
        }
      } else if (isPrev) {
        e.preventDefault()
        nextIndex = activeIndex - 1
        if (nextIndex < 0) {
          nextIndex = loop ? itemCount - 1 : 0
        }
      } else if (e.key === 'Home') {
        e.preventDefault()
        nextIndex = 0
      } else if (e.key === 'End') {
        e.preventDefault()
        nextIndex = itemCount - 1
      } else {
        return
      }

      focusItem(nextIndex)
    },
    [activeIndex, itemCount, orientation, loop, focusItem],
  )

  const getItemProps = useCallback(
    (index: number) => ({
      ref: setItemRef(index),
      tabIndex: index === activeIndex ? 0 : -1,
      onFocus: () => setActiveIndex(index),
      onKeyDown: handleKeyDown,
    }),
    [activeIndex, setItemRef, handleKeyDown],
  )

  return {
    activeIndex,
    setActiveIndex: focusItem,
    getItemProps,
    handleKeyDown,
  }
}
