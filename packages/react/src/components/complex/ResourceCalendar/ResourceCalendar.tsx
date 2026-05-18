import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { detectConflicts, isAvailable } from '@skygraph/core'
import type { CalendarConflict as Conflict } from '@skygraph/core'
import type { Assignment, CalendarScale, Resource, ResourceCalendarProps } from './types'
import { useConfig } from '../../ConfigProvider'

const DAY = 86_400_000
const STEP_MS: Record<CalendarScale, number> = {
  day: DAY,
  week: 7 * DAY,
  month: 30 * DAY,
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

function formatTick(timeMs: number, scale: CalendarScale): string {
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
  }
}

function deriveRange(assignments: readonly Assignment[], step: number): { from: Date; to: Date } {
  if (assignments.length === 0) {
    const now = Date.now()
    return {
      from: new Date(alignDown(now, step)),
      to: new Date(alignUp(now + step * 4, step)),
    }
  }
  let lo = Infinity
  let hi = -Infinity
  for (const a of assignments) {
    const s = toMs(a.start)
    const e = toMs(a.end)
    if (s < lo) lo = s
    if (e > hi) hi = e
  }
  return {
    from: new Date(alignDown(lo - step, step)),
    to: new Date(alignUp(hi + step, step)),
  }
}

/**
 * Resource Calendar — shifts / bookings per resource lane with
 * automatic conflict detection.
 *
 * v1 capabilities:
 *   - `scale` of `day | week | month` — drives header ticks AND
 *     drag/resize snap (1 column = 1 step).
 *   - `draggable` — drag a block to move it horizontally; both `start`
 *     and `end` shift by the snapped delta. Lane (resource) is
 *     preserved — vertical lane changes are out of scope for v1.
 *   - `resizable` — drag the left/right edge to resize that side
 *     independently. Minimum width clamped to one `scale` step.
 *   - Conflict overlay — assignments participating in any conflict
 *     get the `sg-rcal-assignment-conflict` modifier (red border /
 *     hatched background). `onConflict` fires after every change with
 *     the freshly detected `Conflict[]`.
 *   - `availability-off` background bands appear on slots that fall
 *     outside the configured `rules`.
 *
 * Out-of-scope (planned for v2): cross-lane drag, multi-day all-day
 * blocks, recurrence, exception dates, calendar-aware month widths.
 */
export function ResourceCalendar({
  resources,
  assignments,
  rules,
  scale = 'week',
  range,
  columnWidth = 120,
  rowHeight = 56,
  sidebarWidth = 200,
  draggable = false,
  resizable = false,
  onAssignmentChange,
  onConflict,
  unstyled = false,
  className,
  style,
}: ResourceCalendarProps) {
  const resourceCalendarLocale = useConfig().locale?.resourceCalendar
  const onChangeRef = useRef(onAssignmentChange)
  onChangeRef.current = onAssignmentChange
  const onConflictRef = useRef(onConflict)
  onConflictRef.current = onConflict

  // Local "ghost" overlay during a drag so React state doesn't have to
  // round-trip through the consumer for each mousemove. The ghost is
  // cleared on mouseup; the canonical update is what `onAssignmentChange`
  // produces.
  const [ghost, setGhost] = useState<Assignment | null>(null)

  const step = STEP_MS[scale]
  const resolvedRange = useMemo(
    () => range ?? deriveRange(assignments, step),
    [range, assignments, step],
  )
  const rangeStart = resolvedRange.from.getTime()
  const rangeEnd = resolvedRange.to.getTime()
  const pxPerMs = columnWidth / step
  const totalWidth = (rangeEnd - rangeStart) * pxPerMs

  const ticks = useMemo(() => {
    const out: Array<{ x: number; label: string; time: number }> = []
    for (let t = rangeStart; t < rangeEnd; t += step) {
      out.push({
        x: (t - rangeStart) * pxPerMs,
        label: formatTick(t, scale),
        time: t,
      })
    }
    return out
  }, [rangeStart, rangeEnd, step, pxPerMs, scale])

  const rowIndexById = useMemo(() => {
    const m = new Map<string, number>()
    resources.forEach((r, i) => m.set(r.id, i))
    return m
  }, [resources])

  const normalizedAssignments = useMemo<Assignment[]>(() => {
    return assignments.map((a) => {
      if (ghost && ghost.id === a.id) return ghost
      return a
    })
  }, [assignments, ghost])

  const conflicts = useMemo<Conflict[]>(() => {
    return detectConflicts(
      {
        resources: resources.map((r) => ({
          id: r.id,
          name: r.name,
          color: r.color,
          capacityPerSlot: r.capacityPerSlot,
          meta: r.meta,
        })),
        assignments: normalizedAssignments.map((a) => ({
          id: a.id,
          resourceId: a.resourceId,
          start: toMs(a.start),
          end: toMs(a.end),
          title: a.title,
          status: a.status,
          meta: a.meta,
        })),
      },
      { scale, rules: rules ?? [] },
    )
  }, [resources, normalizedAssignments, scale, rules])

  const conflictingIds = useMemo(() => {
    const s = new Set<string>()
    for (const c of conflicts) for (const id of c.assignmentIds) s.add(id)
    return s
  }, [conflicts])

  // Fire onConflict whenever the conflict set actually changes. Using a
  // stable key (sorted ids per conflict) avoids spurious calls when
  // detection re-runs but produces the same set.
  const conflictKey = useMemo(
    () =>
      conflicts
        .map((c) => `${c.reason}:${c.assignmentIds.join(',')}`)
        .sort()
        .join('|'),
    [conflicts],
  )
  const lastKeyRef = useRef<string>('')
  useEffect(() => {
    if (lastKeyRef.current === conflictKey) return
    lastKeyRef.current = conflictKey
    onConflictRef.current?.(conflicts)
  }, [conflictKey, conflicts])

  // Compute the screen rectangles for each assignment.
  const assignmentRects = useMemo(() => {
    return normalizedAssignments
      .map((a) => {
        const row = rowIndexById.get(a.resourceId)
        if (row === undefined) return null
        const startMs = toMs(a.start)
        const endMs = toMs(a.end)
        const x = (startMs - rangeStart) * pxPerMs
        const w = Math.max(2, (endMs - startMs) * pxPerMs)
        const y = row * rowHeight
        return { assignment: a, x, y, w, h: rowHeight, row }
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
  }, [normalizedAssignments, rowIndexById, rangeStart, pxPerMs, rowHeight])

  // Per-row availability bands — pre-compute slot windows where the
  // resource is unavailable. Drawn as background stripes behind the
  // assignment blocks. We bucket slots so non-uniform consecutive
  // unavailable slots merge into one block visually.
  const availabilityBands = useMemo(() => {
    if (!rules || rules.length === 0)
      return [] as Array<{
        key: string
        x: number
        y: number
        w: number
        h: number
      }>
    const out: Array<{ key: string; x: number; y: number; w: number; h: number }> = []
    for (const r of resources) {
      const row = rowIndexById.get(r.id)
      if (row === undefined) continue
      const y = row * rowHeight
      let bandStart: number | null = null
      for (let t = rangeStart; t < rangeEnd; t += step) {
        const ok = isAvailable(
          { id: r.id, name: r.name, color: r.color, capacityPerSlot: r.capacityPerSlot },
          { start: t, end: t + step },
          rules,
        )
        if (!ok) {
          if (bandStart === null) bandStart = t
        } else if (bandStart !== null) {
          out.push({
            key: `${r.id}-${bandStart}`,
            x: (bandStart - rangeStart) * pxPerMs,
            y,
            w: (t - bandStart) * pxPerMs,
            h: rowHeight,
          })
          bandStart = null
        }
      }
      if (bandStart !== null) {
        out.push({
          key: `${r.id}-${bandStart}`,
          x: (bandStart - rangeStart) * pxPerMs,
          y,
          w: (rangeEnd - bandStart) * pxPerMs,
          h: rowHeight,
        })
      }
    }
    return out
  }, [rules, resources, rowIndexById, rangeStart, rangeEnd, step, pxPerMs, rowHeight])

  // ─── Drag / resize plumbing ─────────────────────────────────────────────
  const dragRef = useRef<{
    kind: 'move' | 'resize-start' | 'resize-end'
    assignmentId: string
    startClientX: number
    origStart: number
    origEnd: number
    lastStart: number
    lastEnd: number
  } | null>(null)

  const startInteraction = useCallback(
    (
      e: ReactMouseEvent<HTMLDivElement>,
      assignment: Assignment,
      kind: 'move' | 'resize-start' | 'resize-end',
    ) => {
      if (e.button !== 0) return
      if (kind === 'move' && !draggable) return
      if (kind !== 'move' && !resizable) return
      e.preventDefault()
      e.stopPropagation()

      const origStart = toMs(assignment.start)
      const origEnd = toMs(assignment.end)

      dragRef.current = {
        kind,
        assignmentId: assignment.id,
        startClientX: e.clientX,
        origStart,
        origEnd,
        lastStart: origStart,
        lastEnd: origEnd,
      }
      setGhost({ ...assignment, start: origStart, end: origEnd })

      function emit(nextStart: number, nextEnd: number) {
        const cb = onChangeRef.current
        if (!cb) return
        cb({
          ...assignment,
          start: nextStart,
          end: nextEnd,
        })
      }

      function onMove(ev: MouseEvent) {
        const d = dragRef.current
        if (!d) return
        const dxPx = ev.clientX - d.startClientX
        const dxMs = dxPx / pxPerMs
        const snappedDx = Math.round(dxMs / step) * step
        let nextStart = d.origStart
        let nextEnd = d.origEnd
        if (d.kind === 'move') {
          nextStart = d.origStart + snappedDx
          nextEnd = d.origEnd + snappedDx
        } else if (d.kind === 'resize-end') {
          nextEnd = Math.max(d.origStart + step, d.origEnd + snappedDx)
        } else {
          nextStart = Math.min(d.origEnd - step, d.origStart + snappedDx)
        }
        if (nextStart === d.lastStart && nextEnd === d.lastEnd) return
        d.lastStart = nextStart
        d.lastEnd = nextEnd
        setGhost({ ...assignment, start: nextStart, end: nextEnd })
        emit(nextStart, nextEnd)
      }

      function onUp() {
        dragRef.current = null
        setGhost(null)
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }

      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    },
    [draggable, resizable, pxPerMs, step],
  )

  const onAssignmentKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>, assignment: Assignment) => {
      if (!draggable && !resizable) return
      const cb = onChangeRef.current
      if (!cb) return
      const startMs = toMs(assignment.start)
      const endMs = toMs(assignment.end)
      // ArrowLeft / ArrowRight = move ±1 step (when draggable).
      // Shift+ArrowLeft / ArrowRight = resize end ±1 step (when resizable).
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const dir = e.key === 'ArrowLeft' ? -1 : 1
        e.preventDefault()
        if (e.shiftKey && resizable) {
          const nextEnd = Math.max(startMs + step, endMs + dir * step)
          cb({ ...assignment, start: startMs, end: nextEnd })
        } else if (draggable) {
          cb({
            ...assignment,
            start: startMs + dir * step,
            end: endMs + dir * step,
          })
        }
      }
    },
    [draggable, resizable, step],
  )

  // ─── Render ─────────────────────────────────────────────────────────────
  const wrapperClass = unstyled ? className : ['sg-rcal', className].filter(Boolean).join(' ')

  const headerHeight = Math.max(28, Math.round(rowHeight * 0.6))
  const gridHeight = resources.length * rowHeight
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
      aria-label={resourceCalendarLocale?.ariaLabel ?? 'Resource calendar'}
      data-scale={scale}
    >
      {/* Sidebar (resource list) */}
      <div className={unstyled ? undefined : 'sg-rcal-sidebar'} style={{ width: sidebarWidth }}>
        <div
          className={unstyled ? undefined : 'sg-rcal-sidebar-header'}
          style={{ height: headerHeight }}
        />
        {resources.map((r, i) => (
          <div
            key={r.id}
            className={unstyled ? undefined : 'sg-rcal-sidebar-row'}
            style={{ height: rowHeight }}
            role="row"
            aria-label={
              resourceCalendarLocale?.resource
                ? resourceCalendarLocale.resource(r.name)
                : `Resource ${r.name}`
            }
            data-row-index={i}
            data-resource-id={r.id}
          >
            <span
              className={unstyled ? undefined : 'sg-rcal-sidebar-marker'}
              style={r.color ? { background: r.color } : undefined}
              data-role="marker"
              aria-hidden="true"
            />
            <span className={unstyled ? undefined : 'sg-rcal-sidebar-name'}>{r.name}</span>
            {r.capacityPerSlot !== undefined && (
              <span
                className={unstyled ? undefined : 'sg-rcal-sidebar-capacity'}
                aria-label={
                  resourceCalendarLocale?.capacity
                    ? resourceCalendarLocale.capacity(r.capacityPerSlot)
                    : `capacity ${r.capacityPerSlot} per slot`
                }
              >
                ×{r.capacityPerSlot}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Main: header + grid + assignments */}
      <div
        className={unstyled ? undefined : 'sg-rcal-main'}
        style={{ position: 'relative', width: totalWidth, minWidth: '100%' }}
      >
        <div
          className={unstyled ? undefined : 'sg-rcal-header'}
          style={{ position: 'relative', height: headerHeight, width: totalWidth }}
        >
          {ticks.map((t) => (
            <div
              key={t.time}
              className={unstyled ? undefined : 'sg-rcal-tick'}
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
          className={unstyled ? undefined : 'sg-rcal-grid'}
          style={{
            position: 'relative',
            width: totalWidth,
            height: gridHeight,
          }}
          data-conflict-count={conflicts.length}
        >
          {/* Row backgrounds */}
          {resources.map((r, i) => (
            <div
              key={r.id}
              className={unstyled ? undefined : 'sg-rcal-row'}
              style={{
                position: 'absolute',
                left: 0,
                top: i * rowHeight,
                width: totalWidth,
                height: rowHeight,
              }}
              data-row-index={i}
              data-resource-id={r.id}
            >
              {/* Vertical slot dividers */}
              {ticks.map((t) => (
                <div
                  key={t.time}
                  className={unstyled ? undefined : 'sg-rcal-slot'}
                  style={{
                    position: 'absolute',
                    left: t.x,
                    top: 0,
                    width: columnWidth,
                    height: rowHeight,
                  }}
                  data-slot-time={t.time}
                />
              ))}
            </div>
          ))}

          {/* Availability bands (off-window) */}
          {availabilityBands.map((b) => (
            <div
              key={b.key}
              className={unstyled ? undefined : 'sg-rcal-availability-off'}
              style={{
                position: 'absolute',
                left: b.x,
                top: b.y,
                width: b.w,
                height: b.h,
                pointerEvents: 'none',
              }}
              data-role="availability-off"
              aria-hidden="true"
            />
          ))}

          {/* Assignment blocks */}
          {assignmentRects.map(({ assignment, x, y, w, h }) => {
            const status = conflictingIds.has(assignment.id)
              ? 'conflict'
              : (assignment.status ?? 'tentative')
            const blockClass = unstyled
              ? undefined
              : [
                  'sg-rcal-assignment',
                  `sg-rcal-assignment-${status}`,
                  draggable ? 'sg-rcal-assignment-draggable' : '',
                  resizable ? 'sg-rcal-assignment-resizable' : '',
                ]
                  .filter(Boolean)
                  .join(' ')
            const colorOverride =
              status !== 'conflict'
                ? resources.find((r) => r.id === assignment.resourceId)?.color
                : undefined
            return (
              <div
                key={assignment.id}
                className={blockClass}
                style={{
                  position: 'absolute',
                  left: x,
                  top: y + 4,
                  width: w,
                  height: h - 8,
                  background: colorOverride,
                  cursor: draggable ? 'grab' : undefined,
                  userSelect: draggable || resizable ? 'none' : undefined,
                }}
                role="button"
                tabIndex={0}
                aria-label={`${assignment.title}${status === 'conflict' ? (resourceCalendarLocale?.conflictSuffix ?? ' (conflict)') : ''}`}
                data-assignment-id={assignment.id}
                data-status={status}
                data-resource-id={assignment.resourceId}
                onMouseDown={draggable ? (e) => startInteraction(e, assignment, 'move') : undefined}
                onKeyDown={(e) => onAssignmentKeyDown(e, assignment)}
              >
                {resizable && (
                  <div
                    className={unstyled ? undefined : 'sg-rcal-assignment-resize-start'}
                    role="button"
                    aria-label={resourceCalendarLocale?.resizeStart ?? 'Resize start'}
                    tabIndex={-1}
                    data-role="resize-handle-start"
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: 6,
                      cursor: 'ew-resize',
                    }}
                    onMouseDown={(e) => startInteraction(e, assignment, 'resize-start')}
                  />
                )}
                <span
                  className={unstyled ? undefined : 'sg-rcal-assignment-title'}
                  style={{ position: 'relative', zIndex: 1 }}
                >
                  {assignment.title}
                </span>
                {resizable && (
                  <div
                    className={unstyled ? undefined : 'sg-rcal-assignment-resize-end'}
                    role="button"
                    aria-label={resourceCalendarLocale?.resizeEnd ?? 'Resize end'}
                    tabIndex={-1}
                    data-role="resize-handle-end"
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: 6,
                      cursor: 'ew-resize',
                    }}
                    onMouseDown={(e) => startInteraction(e, assignment, 'resize-end')}
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

// `Resource` is part of the local domain; explicitly used here so the
// helper lives next to its only consumer (rendering).
export type { Resource }
