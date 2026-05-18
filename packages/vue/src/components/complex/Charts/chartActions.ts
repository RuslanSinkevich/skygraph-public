/**
 * Chart-action types + default action factory — Vue side.
 *
 * Mirrors `defaultChartActions` / `ChartAction` from the React adapter.
 * Icons cross the boundary as Vue VNodes (built via `h(...)`) instead of
 * `ReactNode`; everything else (ids, labels, click contracts) is identical.
 */
import { h, type VNode } from 'vue'
import { downloadSvg, downloadSvgAsPng } from './download'
import { printElement } from '../../../utils/print'

/**
 * Context handed to `ChartAction.onClick`. Identical to React's
 * `ChartActionContext`.
 */
export interface ChartActionContext {
  /** Current SVG element of the chart. */
  svg: SVGSVGElement
  /** Base file name without extension (used for print / SVG / PNG). */
  fileName?: string
  /** Reset the active brush — only set when the chart has brush enabled. */
  brushReset?: () => void
  /** Toggle the legend — userland-provided. */
  toggleLegend?: () => void
}

/**
 * Declarative description of one toolbar button. The Vue equivalent of
 * `ReactNode` for the icon is a `VNode` (or any component-like value
 * accepted by `<component :is>`).
 */
export interface ChartAction {
  /** Unique id (lands in `data-sg-action`). */
  id: string
  /** Icon — Vue VNode (typically built with `h('svg', ...)`). */
  icon: VNode
  /** `aria-label` / `title`. */
  label: string
  /** Click handler — receives the action context. */
  onClick: (ctx: ChartActionContext) => void
  /** Hide the button without removing it from the array. */
  hidden?: boolean
}

/**
 * Accepted shapes for the chart-level `actions` prop:
 *
 * - `false` / `undefined` — no toolbar is rendered.
 * - `true` — the default set is used (`print` + SVG + PNG + `resetBrush`
 *   when brush is active).
 * - `ChartAction[]` — caller-supplied set.
 */
export type ChartActionsProp = boolean | readonly ChartAction[]

/**
 * Inline-SVG icon factory matching React's `IconStroke`. 16×16,
 * `currentColor`, 1.5px stroke, no fill.
 */
function iconStroke(d: string, extra?: VNode | VNode[]): VNode {
  const children: (VNode | VNode[])[] = [h('path', { d })]
  if (extra) children.push(extra)
  return h(
    'svg',
    {
      width: 16,
      height: 16,
      viewBox: '0 0 16 16',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': 1.5,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'aria-hidden': 'true',
    },
    children,
  )
}

const PRINT_ICON = (): VNode =>
  iconStroke('M4 6V2.5h8V6', [
    h('rect', { x: 3, y: 6, width: 10, height: 6, rx: 1 }),
    h('path', { d: 'M4.5 10h7v3.5h-7z' }),
  ])

const SVG_ICON = (): VNode =>
  iconStroke('M3 8.5v3.25A1.25 1.25 0 0 0 4.25 13h7.5A1.25 1.25 0 0 0 13 11.75V8.5', [
    h('path', { d: 'M8 2.5v7' }),
    h('path', { d: 'M5 6.5l3 3 3-3' }),
  ])

const PNG_ICON = (): VNode =>
  iconStroke('M2.5 3.5h11v9h-11z', [
    h('circle', { cx: 5.5, cy: 6.5, r: 0.9 }),
    h('path', { d: 'M2.5 11l3-3 2.5 2.5L10.5 8l3 3' }),
  ])

const RESET_ICON = (): VNode => iconStroke('M3 8a5 5 0 1 0 1.5-3.5', h('path', { d: 'M3 3v3h3' }))

/**
 * Default toolbar actions (sugar for `actions={true}`). Same id / label
 * choice as React.
 */
export function defaultChartActions(opts: {
  /** Forwarded to `printElement` as `fileName`. */
  fileName?: string
  /** Adds the `resetBrush` button if provided. */
  brushReset?: () => void
}): ChartAction[] {
  const list: ChartAction[] = [
    {
      id: 'print',
      label: 'Print',
      icon: PRINT_ICON(),
      onClick: ({ svg }) => {
        printElement(svg, opts.fileName ? { fileName: opts.fileName } : {})
      },
    },
    {
      id: 'downloadSvg',
      label: 'Download SVG',
      icon: SVG_ICON(),
      onClick: ({ svg, fileName }) => {
        downloadSvg(svg, `${fileName ?? 'chart'}.svg`)
      },
    },
    {
      id: 'downloadPng',
      label: 'Download PNG',
      icon: PNG_ICON(),
      onClick: ({ svg, fileName }) => {
        // Swallow decoding errors — the user simply gets no file; throwing
        // here would crash the chart.
        downloadSvgAsPng(svg, `${fileName ?? 'chart'}.png`).catch(() => {})
      },
    },
  ]
  if (opts.brushReset) {
    list.push({
      id: 'resetBrush',
      label: 'Reset zoom',
      icon: RESET_ICON(),
      onClick: ({ brushReset }) => brushReset?.(),
    })
  }
  return list
}

/**
 * Resolve the chart-level `actions` prop:
 *
 * - `false` / `undefined` → `null` (toolbar must not render)
 * - `true` → the default set (with optional `resetBrush` when `opts.brushReset` is set)
 * - `ChartAction[]` → returned as-is
 */
export function resolveChartActions(
  actions: ChartActionsProp | undefined,
  opts: { fileName?: string; brushReset?: () => void },
): readonly ChartAction[] | null {
  if (!actions) return null
  if (actions === true) return defaultChartActions(opts)
  return actions
}
