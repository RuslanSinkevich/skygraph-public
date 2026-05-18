import { ref, watch, isRef, onMounted, onScopeDispose, type Ref } from 'vue'
import { createVirtual } from '@skygraph/core'
import type { VirtualEngine, VirtualRange } from '@skygraph/core'

export interface UseVirtualScrollOptions {
  itemCount: number | Ref<number>
  itemHeight: number | ((index: number) => number) | Ref<number | ((index: number) => number)>
  overscan?: number | Ref<number>
}

export interface UseVirtualScrollReturn {
  range: Ref<VirtualRange>
  containerRef: Ref<HTMLElement | null>
  scrollToIndex: (index: number, align?: 'start' | 'center' | 'end') => void
  engine: VirtualEngine
}

function unwrap<T>(v: T | Ref<T>): T {
  return isRef(v) ? (v.value as T) : (v as T)
}

/**
 * Vue 3 composable parallel to React's `useVirtualScroll`.
 *
 * Wraps a `VirtualEngine` and tracks the visible row range as the container scrolls.
 * `containerRef` should be bound to the scrolling element via `:ref`.
 */
export function useVirtualScroll(options: UseVirtualScrollOptions): UseVirtualScrollReturn {
  const initialItemCount = unwrap(options.itemCount)
  const initialItemHeight = unwrap(options.itemHeight)
  const initialOverscan = options.overscan !== undefined ? unwrap(options.overscan) : undefined

  const engine = createVirtual({
    itemCount: initialItemCount,
    itemHeight: initialItemHeight,
    overscan: initialOverscan,
  })

  const containerRef = ref<HTMLElement | null>(null)
  const range = ref<VirtualRange>(engine.getRange(0, 0))

  const recalc = () => {
    const el = containerRef.value
    if (!el) {
      range.value = engine.getRange(0, 0)
      return
    }
    range.value = engine.getRange(el.scrollTop, el.clientHeight)
  }

  const scrollToIndex = (index: number, align: 'start' | 'center' | 'end' = 'start') => {
    const el = containerRef.value
    if (!el) return
    el.scrollTop = engine.scrollToIndex(index, el.clientHeight, align)
  }

  watch(
    () => unwrap(options.itemCount),
    (count) => {
      engine.setItemCount(count)
      recalc()
    },
  )

  watch(
    () => unwrap(options.itemHeight),
    (h) => {
      engine.setItemHeight(h)
      recalc()
    },
  )

  let ro: ResizeObserver | null = null
  let scrollHandler: (() => void) | null = null
  let attachedEl: HTMLElement | null = null

  const attach = (el: HTMLElement | null) => {
    if (attachedEl === el) return
    if (attachedEl) {
      if (scrollHandler) attachedEl.removeEventListener('scroll', scrollHandler)
      ro?.disconnect()
      ro = null
    }
    attachedEl = el
    if (!el) return
    scrollHandler = () => recalc()
    el.addEventListener('scroll', scrollHandler, { passive: true })
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => recalc())
      ro.observe(el)
    }
    recalc()
  }

  watch(containerRef, (el) => attach(el), { flush: 'post' })

  onMounted(() => {
    attach(containerRef.value)
  })

  onScopeDispose(() => {
    attach(null)
  })

  return { range, containerRef, scrollToIndex, engine }
}
