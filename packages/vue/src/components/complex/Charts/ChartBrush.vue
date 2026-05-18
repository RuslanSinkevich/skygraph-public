<script lang="ts">
/**
 * Brushing overlay — Vue port of React's `ChartBrush`.
 *
 * Drag inside the plot area to pick a `[from, to]` range in category-index
 * space. Double-click to reset to `null`. Owns transient drag-state but
 * publishes the final range through `update:range` (v-model compatible) and
 * the `change` event — parent decides whether to use controlled (`range`
 * prop) or uncontrolled mode.
 *
 * DOM and `sg-chart-brush-*` classes match the React adapter 1:1.
 *
 * Note: types + `resolveBrushConfig` live in this regular `<script>` block so
 * they can be re-exported alongside the SFC default export — Vue's
 * `<script setup>` forbids runtime ES exports.
 */

/** Selection range expressed as inclusive category indices. */
export interface ChartBrushRange {
  /** Start index — always `<= to`. */
  from: number
  /** End index — always `>= from`. */
  to: number
}

/**
 * Brushing config object — same shape as React, accepted by chart wrappers
 * via their `brush` prop.
 */
export interface ChartBrushConfig {
  /** Controlled range. `null` means nothing is selected. */
  range?: ChartBrushRange | null
  /** Initial range in uncontrolled mode. */
  defaultRange?: ChartBrushRange | null
  /** Fires on `pointerup` after drag and on dblclick (reset → `null`). */
  onRangeChange?: (range: ChartBrushRange | null) => void
  /** Selection fill colour. */
  fill?: string
  /** Disable interactions while still rendering the controlled range. */
  disabled?: boolean
}

/** Resolve a `brush` prop into a `ChartBrushConfig | null`. */
export function resolveBrushConfig(
  brush: boolean | ChartBrushConfig | undefined,
): ChartBrushConfig | null {
  if (brush == null || brush === false) return null
  if (brush === true) return {}
  return brush
}

export interface ChartBrushProps {
  /** Plot left edge in SVG user-space. */
  plotX: number
  /** Plot top edge in SVG user-space. */
  plotY: number
  /** Plot width. */
  plotW: number
  /** Plot height. */
  plotH: number
  /** Number of categories along X — used to map `x → index`. */
  categoryCount: number
  /** Current selection (controlled). `null` means nothing is selected. */
  range: ChartBrushRange | null
  /** Drop the default `sg-chart-brush-*` class names. */
  unstyled?: boolean
  /** Selection fill colour. */
  fill?: string
  /** Disable interactions while still rendering the visual. */
  disabled?: boolean
}
</script>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CSSProperties } from 'vue'

const props = defineProps<ChartBrushProps>()

const emit = defineEmits<{
  /** Emitted with the new range on pointerup or `null` on dblclick reset. */
  (e: 'update:range', range: ChartBrushRange | null): void
  /** Mirror of `update:range` for callers that prefer a non-v-model name. */
  (e: 'change', range: ChartBrushRange | null): void
}>()

const DEFAULT_FILL = 'var(--sg-color-primary)'

const drag = ref<{ startIdx: number; endIdx: number } | null>(null)
const overlayRef = ref<SVGRectElement | null>(null)

const cls = (suffix: string) => (props.unstyled ? undefined : `sg-chart-brush-${suffix}`)

function xToCategoryIndex(localX: number, plotX: number, plotW: number, count: number): number {
  if (count <= 0) return 0
  if (count === 1) return 0
  if (!Number.isFinite(localX) || !Number.isFinite(plotW) || plotW <= 0) return 0
  const step = plotW / (count - 1)
  if (step <= 0 || !Number.isFinite(step)) return 0
  const raw = Math.round((localX - plotX) / step)
  if (!Number.isFinite(raw)) return 0
  return Math.max(0, Math.min(count - 1, raw))
}

function categoryIndexToX(idx: number, plotX: number, plotW: number, count: number): number {
  if (count <= 1) return plotX
  const step = plotW / (count - 1)
  return plotX + idx * step
}

function clientToCategoryIndex(clientX: number): number | null {
  const overlay = overlayRef.value
  const svg = overlay?.ownerSVGElement
  if (!svg) return null
  const r = svg.getBoundingClientRect()
  if (!r.width || !Number.isFinite(r.width)) return null
  // jsdom doesn't reliably implement `svg.viewBox.baseVal`; read the raw
  // attribute and fall back to 600 (our standard SVG-chart viewBox width).
  let viewW = 600
  try {
    const vb = svg.viewBox?.baseVal
    if (vb && vb.width > 0) viewW = vb.width
    else {
      const attr = svg.getAttribute('viewBox')
      if (attr) {
        const parts = attr.trim().split(/\s+/)
        const w = Number.parseFloat(parts[2] ?? '')
        if (Number.isFinite(w) && w > 0) viewW = w
      }
    }
  } catch {
    // ignore — keep 600.
  }
  const localX = ((clientX - r.left) / r.width) * viewW
  return xToCategoryIndex(localX, props.plotX, props.plotW, props.categoryCount)
}

function safeSetCapture(el: SVGRectElement, id: number) {
  try {
    el.setPointerCapture?.(id)
  } catch {
    // jsdom / older browsers — ignored.
  }
}

function safeReleaseCapture(el: SVGRectElement, id: number) {
  try {
    el.releasePointerCapture?.(id)
  } catch {
    // ignore
  }
}

function publish(next: ChartBrushRange | null) {
  emit('update:range', next)
  emit('change', next)
}

function handlePointerDown(e: PointerEvent) {
  if (props.disabled || props.categoryCount === 0) return
  const idx = clientToCategoryIndex(e.clientX)
  if (idx === null) return
  e.preventDefault()
  safeSetCapture(e.currentTarget as SVGRectElement, e.pointerId)
  drag.value = { startIdx: idx, endIdx: idx }
}

function handlePointerMove(e: PointerEvent) {
  if (!drag.value) return
  const idx = clientToCategoryIndex(e.clientX)
  if (idx === null) return
  drag.value = { ...drag.value, endIdx: idx }
}

function handlePointerUp(e: PointerEvent) {
  if (!drag.value) return
  safeReleaseCapture(e.currentTarget as SVGRectElement, e.pointerId)
  const idx = clientToCategoryIndex(e.clientX)
  const finalEnd = idx ?? drag.value.endIdx
  const from = Math.min(drag.value.startIdx, finalEnd)
  const to = Math.max(drag.value.startIdx, finalEnd)
  publish({ from, to })
  drag.value = null
}

function handlePointerCancel(e: PointerEvent) {
  if (!drag.value) return
  safeReleaseCapture(e.currentTarget as SVGRectElement, e.pointerId)
  drag.value = null
}

function handleDoubleClick(e: MouseEvent) {
  if (props.disabled) return
  e.preventDefault()
  publish(null)
}

const liveSelection = computed<ChartBrushRange | null>(() => {
  if (drag.value) {
    const from = Math.min(drag.value.startIdx, drag.value.endIdx)
    const to = Math.max(drag.value.startIdx, drag.value.endIdx)
    return { from, to }
  }
  if (props.range) {
    const from = Math.min(props.range.from, props.range.to)
    const to = Math.max(props.range.from, props.range.to)
    return {
      from: Math.max(0, Math.min(props.categoryCount - 1, from)),
      to: Math.max(0, Math.min(props.categoryCount - 1, to)),
    }
  }
  return null
})

const selectionRect = computed(() => {
  const sel = liveSelection.value
  if (!sel) return null
  const x1 = categoryIndexToX(sel.from, props.plotX, props.plotW, props.categoryCount)
  const x2 = categoryIndexToX(sel.to, props.plotX, props.plotW, props.categoryCount)
  const left = Math.min(x1, x2)
  const right = Math.max(x1, x2)
  // 2px minimum width — keeps a single-point selection visible.
  const w = Math.max(2, right - left)
  return { left, w }
})

const fillColor = computed(() => props.fill ?? DEFAULT_FILL)
const overlayStyle = computed<CSSProperties>(() =>
  props.disabled ? { cursor: 'not-allowed' } : { cursor: 'crosshair' },
)
</script>

<template>
  <g :class="props.unstyled ? undefined : 'sg-chart-brush'" data-sg-chart-brush="">
    <rect
      ref="overlayRef"
      :class="cls('overlay')"
      data-sg-chart-brush-overlay=""
      :x="props.plotX"
      :y="props.plotY"
      :width="Math.max(0, props.plotW)"
      :height="Math.max(0, props.plotH)"
      fill="transparent"
      :style="overlayStyle"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointercancel="handlePointerCancel"
      @dblclick="handleDoubleClick"
    />
    <rect
      v-if="selectionRect"
      :class="cls('selection')"
      data-sg-chart-brush-selection=""
      :x="selectionRect.left"
      :y="props.plotY"
      :width="selectionRect.w"
      :height="Math.max(0, props.plotH)"
      :fill="fillColor"
      :fill-opacity="0.15"
      :stroke="fillColor"
      :stroke-opacity="0.5"
      :stroke-width="1"
      pointer-events="none"
    />
  </g>
</template>
