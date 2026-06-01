import {
  useCallback,
  useMemo,
  useRef,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { pointsToPath } from '@skygraph/core'
import type { GanttProps, GanttRange, GanttScale, GanttTask } from './types'
import { useConfig } from '../../ConfigProvider'

const DAY = 86_400_000
const STEP_MS: Record<GanttScale, number> = {
  day: DAY,
  week: 7 * DAY,
  month: 30 * DAY,
  quarter: 90 * DAY,
}

function toMs(v: Date | number): number {
  return v instanceof Date ? v.getTime() : v
}

function alignDown(t: number, step: number): number {
  return Math.floor(t / step) * step
}

function alignUp(t: number, step: number): number {
  return Math.ceil(t / step) * step
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

function formatTick(timeMs: number, scale: GanttScale, columnWidth: number): string {
  const d = new Date(timeMs)
  switch (scale) {
    case 'day': {
      const dd = String(d.getUTCDate()).padStart(2, '0')
      // `DD.MM` needs ~32px to render cleanly; below that drop the month
      // and show day-of-month only, plus prepend the month at every 1st
      // so the user still has a calendar anchor.
      if (columnWidth < 32) {
        if (d.getUTCDate() === 1) {
          const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
          return `${dd}.${mm}`
        }
        return dd
      }
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
      return `${dd}.${mm}`
    }
    case 'week': {
      const dd = String(d.getUTCDate()).padStart(2, '0')
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
      return `W ${dd}.${mm}`
    }
    case 'month': {
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
      return `${mm}.${d.getUTCFullYear()}`
    }
    case 'quarter': {
      const q = Math.floor(d.getUTCMonth() / 3) + 1
      return `Q${q} ${d.getUTCFullYear()}`
    }
  }
}

interface Resolved {
  rangeStart: number
  rangeEnd: number
  step: number
  totalWidth: number
  pxPerMs: number
  rows: Array<{ key: string; label: string }>
  rowOf: (task: GanttTask) => number
}

function deriveRange(tasks: readonly GanttTask[], step: number): GanttRange {
  if (tasks.length === 0) {
    const now = Date.now()
    return { from: new Date(alignDown(now, step)), to: new Date(alignUp(now + step, step)) }
  }
  let lo = Infinity
  let hi = -Infinity
  for (const t of tasks) {
    const s = toMs(t.start)
    const e = toMs(t.end)
    if (s < lo) lo = s
    if (e > hi) hi = e
  }
  return {
    from: new Date(alignDown(lo - step, step)),
    to: new Date(alignUp(hi + step, step)),
  }
}

/**
 * Gantt chart: tasks-as-bars over a discrete time axis with optional
 * resource lanes and dependency arrows.
 *
 * v1 capabilities:
 *   - `scale` of `day | week | month | quarter` — drives header ticks AND
 *     the drag/resize snap step (1 column = 1 step).
 *   - `draggable` — left-click on a bar moves it horizontally; `start` /
 *     `end` are emitted via `onTaskChange` once per snap.
 *   - `resizable` — drag the right edge of a bar to extend `end` only.
 *   - `dependencies` — orthogonal arrows from upstream task end to dependent
 *     task start, routed via `routeOrthogonal` from `@skygraph/core`.
 *   - `resources` — when provided, every task pinned to a lane via
 *     `resourceId`; otherwise one task per row.
 *
 * Out-of-scope (planned for v2): hierarchy collapse, milestones, baselines,
 * critical-path highlighting, calendar-aware month/quarter widths.
 */
export function Gantt({
  tasks,
  resources,
  scale = 'day',
  range,
  rowHeight = 32,
  columnWidth = 40,
  sidebarWidth = 200,
  onTaskChange,
  draggable = false,
  resizable = false,
  unstyled = false,
  className,
  style,
}: GanttProps) {
  const ganttLocale = useConfig().locale?.gantt
  const onChangeRef = useRef(onTaskChange)
  onChangeRef.current = onTaskChange

  const resolved = useMemo<Resolved>(() => {
    const step = STEP_MS[scale]
    const r = range ?? deriveRange(tasks, step)
    const rangeStart = r.from.getTime()
    const rangeEnd = r.to.getTime()
    const pxPerMs = columnWidth / step
    const totalWidth = (rangeEnd - rangeStart) * pxPerMs

    let rows: Array<{ key: string; label: string }>
    let rowOf: (task: GanttTask) => number
    if (resources && resources.length > 0) {
      rows = resources.map((r) => ({ key: r.id, label: r.name }))
      const idx = new Map(resources.map((r, i) => [r.id, i]))
      rowOf = (t) => (t.resourceId ? (idx.get(t.resourceId) ?? 0) : 0)
    } else {
      rows = tasks.map((t) => ({ key: t.id, label: t.name }))
      const idx = new Map(tasks.map((t, i) => [t.id, i]))
      rowOf = (t) => idx.get(t.id) ?? 0
    }

    return { rangeStart, rangeEnd, step, totalWidth, pxPerMs, rows, rowOf }
  }, [tasks, resources, scale, range, columnWidth])

  const ticks = useMemo(() => {
    const out: Array<{ x: number; label: string; time: number }> = []
    for (let t = resolved.rangeStart; t < resolved.rangeEnd; t += resolved.step) {
      out.push({
        x: (t - resolved.rangeStart) * resolved.pxPerMs,
        label: formatTick(t, scale, columnWidth),
        time: t,
      })
    }
    return out
  }, [resolved, scale, columnWidth])

  const taskRects = useMemo(() => {
    return tasks.map((task) => {
      const startMs = toMs(task.start)
      const endMs = toMs(task.end)
      const x = (startMs - resolved.rangeStart) * resolved.pxPerMs
      const w = Math.max(2, (endMs - startMs) * resolved.pxPerMs)
      const row = resolved.rowOf(task)
      const y = row * rowHeight
      return { task, x, y, w, h: rowHeight, row }
    })
  }, [tasks, resolved, rowHeight])

  const taskRectById = useMemo(() => {
    const m = new Map<string, (typeof taskRects)[number]>()
    for (const r of taskRects) m.set(r.task.id, r)
    return m
  }, [taskRects])

  // Gantt-specific dependency routing — `routeOrthogonal` from core picks
  // the nearest side of each rect, which gives "bottom-of-source" /
  // "top-of-target" exits on dependencies between adjacent rows. That
  // looks unnatural in a Gantt: the convention is ALWAYS source-right →
  // target-left, regardless of geometry. So we build the path by hand:
  //
  //   • Forward dep (target starts strictly after source ends): 3-bend Z
  //     — right stub from source, vertical to target's row, horizontal
  //     into target's left edge.
  //   • Backward / overlapping dep (target's left edge sits at or before
  //     source's right edge): 5-bend U detour under the source row, so
  //     the link doesn't run inside either bar.
  const dependencyPaths = useMemo(() => {
    const out: Array<{ id: string; d: string }> = []
    // Exit stub from the source's right edge; the entry stub before the
    // target is intentionally longer (`APPROACH`) so the final horizontal
    // segment is unmistakably "into the target" and the arrowhead has
    // room to read even at small zoom levels.
    const STUB = 8
    const APPROACH = 18
    for (const r of taskRects) {
      const deps = r.task.dependencies
      if (!deps || deps.length === 0) continue
      for (const depId of deps) {
        const src = taskRectById.get(depId)
        if (!src) continue
        const sx = src.x + src.w
        const sy = src.y + src.h / 2
        const tx = r.x
        const ey = r.y + r.h / 2

        let points: ReadonlyArray<readonly [number, number]>
        if (tx >= sx + STUB + APPROACH) {
          // Forward Z — bend right after the source so the long final
          // horizontal lives at the target's row, with at least
          // `APPROACH` px of clean run into the target's left edge.
          const bendX = sx + STUB
          points = [
            [sx, sy],
            [bendX, sy],
            [bendX, ey],
            [tx, ey],
          ]
        } else {
          // U detour for backward / overlapping deps. Horizontal runs
          // along the row boundary just below the source so the link
          // sits in the row-gap gutter instead of slicing through the
          // next bar; entry segment is `APPROACH` wide for legibility.
          const detourY = src.y + src.h
          points = [
            [sx, sy],
            [sx + STUB, sy],
            [sx + STUB, detourY],
            [tx - APPROACH, detourY],
            [tx - APPROACH, ey],
            [tx, ey],
          ]
        }
        out.push({ id: `${depId}->${r.task.id}`, d: pointsToPath(points) })
      }
    }
    return out
  }, [taskRects, taskRectById])

  // ─── Drag / resize plumbing ─────────────────────────────────────────────
  const dragRef = useRef<{
    kind: 'move' | 'resize'
    taskId: string
    startClientX: number
    origStart: number
    origEnd: number
    lastStart: number
    lastEnd: number
  } | null>(null)

  const startInteraction = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>, task: GanttTask, kind: 'move' | 'resize') => {
      if (e.button !== 0) return
      if (kind === 'move' && !draggable) return
      if (kind === 'resize' && !resizable) return
      if (!onChangeRef.current) return
      e.preventDefault()
      e.stopPropagation()

      const origStart = toMs(task.start)
      const origEnd = toMs(task.end)
      const step = resolved.step
      const pxPerMs = resolved.pxPerMs

      dragRef.current = {
        kind,
        taskId: task.id,
        startClientX: e.clientX,
        origStart,
        origEnd,
        lastStart: origStart,
        lastEnd: origEnd,
      }

      function onMove(ev: MouseEvent) {
        const d = dragRef.current
        if (!d) return
        const dxPx = ev.clientX - d.startClientX
        const dxMs = dxPx / pxPerMs
        // Snap to nearest step.
        const snappedDx = Math.round(dxMs / step) * step
        let nextStart = d.origStart
        let nextEnd = d.origEnd
        if (d.kind === 'move') {
          nextStart = d.origStart + snappedDx
          nextEnd = d.origEnd + snappedDx
        } else {
          nextEnd = Math.max(d.origStart + step, d.origEnd + snappedDx)
        }
        if (nextStart === d.lastStart && nextEnd === d.lastEnd) return
        d.lastStart = nextStart
        d.lastEnd = nextEnd
        const cb = onChangeRef.current
        if (cb) {
          cb({
            ...task,
            start: nextStart,
            end: nextEnd,
          })
        }
      }

      function onUp() {
        dragRef.current = null
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }

      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    },
    [draggable, resizable, resolved],
  )

  // ─── Render ─────────────────────────────────────────────────────────────
  const wrapperClass = unstyled ? className : ['sg-gantt', className].filter(Boolean).join(' ')

  const headerHeight = rowHeight
  const gridHeight = resolved.rows.length * rowHeight
  // Reserve vertical space for the horizontal scrollbar that lives inside
  // `.sg-gantt-main` (overflow-x: auto). Without this padding the
  // scrollbar's ~14px eats into the last row's bars.
  const SCROLLBAR_RESERVE = 14
  const totalHeight = gridHeight + headerHeight + SCROLLBAR_RESERVE

  // `minmax(0, 1fr)` is required so the main track can shrink below the
  // intrinsic width of its child (`width: totalWidth`, often thousands of
  // pixels) — otherwise the grid swells past the parent and the chart
  // bleeds outside its container. The actual horizontal scrolling lives
  // on `.sg-gantt-main` below, which keeps the sidebar pinned while the
  // bars area scrolls.
  const wrapperStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `${sidebarWidth}px minmax(0, 1fr)`,
    width: '100%',
    overflow: 'hidden',
    height: totalHeight,
    ...style,
  }

  return (
    <div
      className={wrapperClass}
      style={wrapperStyle}
      role="region"
      aria-label={ganttLocale?.ariaLabel ?? 'Gantt chart'}
      data-scale={scale}
    >
      {/* Sidebar (task / resource list) */}
      <div className={unstyled ? undefined : 'sg-gantt-sidebar'} style={{ width: sidebarWidth }}>
        <div
          className={unstyled ? undefined : 'sg-gantt-sidebar-header'}
          style={{ height: headerHeight }}
        />
        {resolved.rows.map((row, i) => (
          <div
            key={row.key}
            className={unstyled ? undefined : 'sg-gantt-sidebar-row'}
            style={{ height: rowHeight }}
            data-row-index={i}
            data-row-key={row.key}
          >
            {row.label}
          </div>
        ))}
      </div>

      {/* Main: header + grid + bars (horizontal scroll lives here so the
       * sidebar stays pinned while bars scroll). */}
      <div
        className={unstyled ? undefined : 'sg-gantt-main'}
        style={{ position: 'relative', overflowX: 'auto', overflowY: 'hidden', minWidth: 0 }}
      >
        <div style={{ position: 'relative', width: resolved.totalWidth, minWidth: '100%' }}>
          <div
            className={unstyled ? undefined : 'sg-gantt-header'}
            style={{ position: 'relative', height: headerHeight, width: resolved.totalWidth }}
          >
            {ticks.map((t) => (
              <div
                key={t.time}
                className={unstyled ? undefined : 'sg-gantt-tick'}
                style={{
                  position: 'absolute',
                  left: t.x,
                  top: 0,
                  width: columnWidth,
                  height: headerHeight,
                }}
                data-tick-time={t.time}
              >
                {t.label}
              </div>
            ))}
          </div>

          <div
            className={unstyled ? undefined : 'sg-gantt-grid'}
            style={{
              position: 'relative',
              width: resolved.totalWidth,
              height: gridHeight,
            }}
          >
            {/* Row backgrounds */}
            {resolved.rows.map((row, i) => (
              <div
                key={row.key}
                className={unstyled ? undefined : 'sg-gantt-row'}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: i * rowHeight,
                  width: resolved.totalWidth,
                  height: rowHeight,
                }}
                data-row-index={i}
              />
            ))}

            {/* Bars */}
            {taskRects.map(({ task, x, y, w, h }) => {
              const barClass = unstyled
                ? undefined
                : [
                    'sg-gantt-bar',
                    draggable ? 'sg-gantt-bar-draggable' : '',
                    resizable ? 'sg-gantt-bar-resizable' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')
              const progress = clamp(task.progress ?? 0, 0, 1)
              return (
                <div
                  key={task.id}
                  className={barClass}
                  style={{
                    position: 'absolute',
                    left: x,
                    top: y + 4,
                    width: w,
                    height: h - 8,
                    background: task.color,
                    cursor: draggable ? 'grab' : undefined,
                    userSelect: draggable || resizable ? 'none' : undefined,
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={task.name}
                  data-task-id={task.id}
                  data-row-index={resolved.rowOf(task)}
                  onMouseDown={draggable ? (e) => startInteraction(e, task, 'move') : undefined}
                >
                  {progress > 0 && (
                    <div
                      className={unstyled ? undefined : 'sg-gantt-bar-progress'}
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: `${progress * 100}%`,
                      }}
                      data-progress={progress}
                    />
                  )}
                  <span
                    className={unstyled ? undefined : 'sg-gantt-bar-label'}
                    style={{ position: 'relative', zIndex: 1 }}
                  >
                    {task.name}
                  </span>
                  {resizable && (
                    <div
                      className={unstyled ? undefined : 'sg-gantt-bar-resize'}
                      role="button"
                      aria-label={ganttLocale?.resizeTask ?? 'Resize task'}
                      tabIndex={-1}
                      data-role="resize-handle"
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: 6,
                        cursor: 'ew-resize',
                      }}
                      onMouseDown={(e) => startInteraction(e, task, 'resize')}
                    />
                  )}
                </div>
              )
            })}

            {/* Dependency arrows — rendered AFTER bars so the arrowhead is
             * never covered by the target bar. `pointer-events: none` lets
             * pointer events fall through to bars beneath the SVG layer. */}
            {dependencyPaths.length > 0 && (
              <svg
                className={unstyled ? undefined : 'sg-gantt-deps'}
                width={resolved.totalWidth}
                height={gridHeight}
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  overflow: 'visible',
                }}
                aria-hidden="true"
              >
                <defs>
                  <marker
                    id="sg-gantt-arrow"
                    viewBox="0 0 10 10"
                    refX="10"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
                  </marker>
                </defs>
                {dependencyPaths.map((p) => (
                  <path
                    key={p.id}
                    d={p.d}
                    className={unstyled ? undefined : 'sg-gantt-dep'}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    markerEnd="url(#sg-gantt-arrow)"
                    data-dep-id={p.id}
                  />
                ))}
              </svg>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
