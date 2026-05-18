import {
  useCallback,
  useMemo,
  useRef,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { routeOrthogonal, pointsToPath } from '@skygraph/core'
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

function formatTick(timeMs: number, scale: GanttScale): string {
  const d = new Date(timeMs)
  switch (scale) {
    case 'day': {
      const dd = String(d.getUTCDate()).padStart(2, '0')
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
        label: formatTick(t, scale),
        time: t,
      })
    }
    return out
  }, [resolved, scale])

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

  const dependencyPaths = useMemo(() => {
    const out: Array<{ id: string; d: string }> = []
    for (const r of taskRects) {
      const deps = r.task.dependencies
      if (!deps || deps.length === 0) continue
      for (const depId of deps) {
        const src = taskRectById.get(depId)
        if (!src) continue
        // Arrow from source END → dependent START.
        const startPt: readonly [number, number] = [src.x + src.w, src.y + src.h / 2]
        const endPt: readonly [number, number] = [r.x, r.y + r.h / 2]
        const points = routeOrthogonal(startPt, endPt, {
          preferred: 'hv',
        })
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
  const totalHeight = gridHeight + headerHeight

  const wrapperStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `${sidebarWidth}px 1fr`,
    width: '100%',
    overflow: 'auto',
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

      {/* Main: header + grid + bars */}
      <div
        className={unstyled ? undefined : 'sg-gantt-main'}
        style={{ position: 'relative', width: resolved.totalWidth, minWidth: '100%' }}
      >
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

          {/* Dependency arrows */}
          {dependencyPaths.length > 0 && (
            <svg
              className={unstyled ? undefined : 'sg-gantt-deps'}
              width={resolved.totalWidth}
              height={gridHeight}
              style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}
              aria-hidden="true"
            >
              <defs>
                <marker
                  id="sg-gantt-arrow"
                  viewBox="0 0 10 10"
                  refX="8"
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
        </div>
      </div>
    </div>
  )
}
