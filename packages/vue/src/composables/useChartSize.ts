import { ref, watchEffect, onScopeDispose, type Ref } from 'vue'

/** Measured DOM size in CSS pixels. */
export interface ChartSize {
  width: number
  height: number
}

/**
 * Vue 3 composable parallel to React's `useChartSize`.
 *
 * Tracks a target element's size via `ResizeObserver`, returning a reactive
 * `ChartSize`. Falls back to the supplied size in SSR / jsdom or before the
 * first RO callback. Rounds output to whole pixels to avoid sub-pixel
 * resize-loops at fractional zoom levels.
 */
export function useChartSize(
  target: Ref<Element | null>,
  fallback: ChartSize,
): { size: Ref<ChartSize> } {
  const size = ref<ChartSize>({ ...fallback })
  let lastApplied: ChartSize = { ...fallback }
  let ro: ResizeObserver | null = null
  let observedEl: Element | null = null

  const apply = (w: number, h: number) => {
    if (!Number.isFinite(w) || !Number.isFinite(h)) return
    if (w <= 0 || h <= 0) return
    const next: ChartSize = { width: Math.round(w), height: Math.round(h) }
    if (lastApplied.width === next.width && lastApplied.height === next.height) return
    lastApplied = next
    size.value = next
  }

  const detach = () => {
    if (ro) {
      ro.disconnect()
      ro = null
    }
    observedEl = null
  }

  const attach = (el: Element | null) => {
    if (observedEl === el) return
    detach()
    if (!el) return
    observedEl = el

    if (typeof ResizeObserver === 'undefined') {
      const r = el.getBoundingClientRect()
      apply(r.width, r.height)
      return
    }

    ro = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const cr = entry.contentRect
      apply(cr.width, cr.height)
    })

    const r = el.getBoundingClientRect()
    apply(r.width, r.height)
    ro.observe(el)
  }

  watchEffect(() => {
    attach(target.value)
  })

  onScopeDispose(() => detach())

  return { size }
}
