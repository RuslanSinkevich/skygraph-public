<script setup lang="ts">
/**
 * Floating chart-toolbar overlay — Vue port of React's `ChartHoverToolbar`.
 *
 * Same visual contract: positioned at the chart's top-right, animated by
 * the parent through `data-sg-toolbar="visible|hidden"`. The wrapper has
 * `pointer-events: none`, buttons re-enable `pointer-events: auto`.
 *
 * Action icons cross the framework boundary as Vue VNodes / functional
 * components instead of `ReactNode`. The default factory `defaultChartActions`
 * (below) returns the same set of actions (`print`, `downloadSvg`,
 * `downloadPng`, optional `resetBrush`) using `h(...)` for the icons —
 * see `decisions/T-Vue-Charts.md` D1.
 */
import { computed, type CSSProperties } from 'vue'
import { useConfig } from '../../ui/ConfigProvider.vue'
import type { ChartAction } from './chartActions'

export interface ChartHoverToolbarProps {
  /** Whether the toolbar is currently visible (parent toggles on hover/focus). */
  visible: boolean
  /** Buttons to render. */
  actions: readonly ChartAction[]
  /** Base file name (no extension) for export / print actions. */
  fileName?: string
  /** Returns the chart's current `<svg>` element (called per click). */
  getSvg: () => SVGSVGElement | null
  /** Reset the chart's brush (only set when brush is active). */
  brushReset?: () => void
  /** Toggle the chart legend (userland decides when to provide it). */
  toggleLegend?: () => void
  /** Drop the default `sg-chart-toolbar*` classes. */
  unstyled?: boolean
  /** Optional inline style on the wrapper. */
  style?: CSSProperties
}

const props = defineProps<ChartHoverToolbarProps>()

const visibleActions = computed(() => props.actions.filter((a) => !a.hidden))

const cfg = useConfig()
const actionsLabel = computed(() => cfg.value.locale?.charts?.actions ?? 'Chart actions')

function onButtonClick(a: ChartAction, e: MouseEvent) {
  e.stopPropagation()
  const svg = props.getSvg()
  if (!svg) return
  a.onClick({
    svg,
    fileName: props.fileName,
    brushReset: props.brushReset,
    toggleLegend: props.toggleLegend,
  })
}
</script>

<template>
  <div
    v-if="visibleActions.length > 0"
    :class="props.unstyled ? undefined : 'sg-chart-toolbar'"
    :style="props.style"
    data-sg-chart-toolbar=""
    :data-sg-toolbar="props.visible ? 'visible' : 'hidden'"
    role="toolbar"
    :aria-label="actionsLabel"
    :aria-hidden="props.visible ? undefined : true"
  >
    <button
      v-for="a in visibleActions"
      :key="a.id"
      type="button"
      :class="props.unstyled ? undefined : 'sg-chart-toolbar-button'"
      :data-sg-action="a.id"
      :aria-label="a.label"
      :title="a.label"
      :tabindex="props.visible ? 0 : -1"
      @click="(e) => onButtonClick(a, e)"
    >
      <component :is="a.icon" />
    </button>
  </div>
</template>
