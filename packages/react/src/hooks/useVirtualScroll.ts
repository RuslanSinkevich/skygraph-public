import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { createVirtual } from '@skygraph/core'
import type { VirtualEngine, VirtualRange } from '@skygraph/core'

export interface UseVirtualScrollOptions {
  itemCount: number
  itemHeight: number | ((index: number) => number)
  overscan?: number
}

export interface UseVirtualScrollReturn {
  range: VirtualRange
  containerRef: React.RefObject<HTMLElement | null>
  scrollToIndex: (index: number, align?: 'start' | 'center' | 'end') => void
  engine: VirtualEngine
}

export function useVirtualScroll(options: UseVirtualScrollOptions): UseVirtualScrollReturn {
  const containerRef = useRef<HTMLElement | null>(null)
  const engineRef = useRef<VirtualEngine | null>(null)

  if (!engineRef.current) {
    engineRef.current = createVirtual({
      itemCount: options.itemCount,
      itemHeight: options.itemHeight,
      overscan: options.overscan,
    })
  }

  const engine = engineRef.current

  useEffect(() => {
    engine.setItemCount(options.itemCount)
  }, [engine, options.itemCount])

  useEffect(() => {
    engine.setItemHeight(options.itemHeight)
  }, [engine, options.itemHeight])

  const [range, setRange] = useState<VirtualRange>(() =>
    engine.getRange(0, 0),
  )

  const recalc = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    setRange(engine.getRange(el.scrollTop, el.clientHeight))
  }, [engine])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    recalc()

    el.addEventListener('scroll', recalc, { passive: true })
    const ro = new ResizeObserver(recalc)
    ro.observe(el)

    return () => {
      el.removeEventListener('scroll', recalc)
      ro.disconnect()
    }
  }, [recalc])

  useEffect(() => {
    recalc()
  }, [options.itemCount, recalc])

  const scrollToIndex = useCallback(
    (index: number, align: 'start' | 'center' | 'end' = 'start') => {
      const el = containerRef.current
      if (!el) return
      el.scrollTop = engine.scrollToIndex(index, el.clientHeight, align)
    },
    [engine],
  )

  return useMemo(
    () => ({ range, containerRef, scrollToIndex, engine }),
    [range, scrollToIndex, engine],
  )
}
