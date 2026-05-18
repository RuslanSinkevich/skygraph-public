import { Fragment, useMemo, type CSSProperties } from 'react'
import type { EventTimelineProps, TimelineEvent, TimelineGroupBy } from './types'
import { useConfig } from '../../ConfigProvider'

function toMs(v: Date | number): number {
  return v instanceof Date ? v.getTime() : v
}

function bucketKey(timeMs: number, groupBy: TimelineGroupBy): string {
  const d = new Date(timeMs)
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth() + 1
  const day = d.getUTCDate()
  switch (groupBy) {
    case 'day':
      return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    case 'month':
      return `${y}-${String(m).padStart(2, '0')}`
    case 'year':
      return `${y}`
  }
}

function bucketLabel(timeMs: number, groupBy: TimelineGroupBy): string {
  const d = new Date(timeMs)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  switch (groupBy) {
    case 'day':
      return `${day}.${m}.${y}`
    case 'month':
      return `${m}.${y}`
    case 'year':
      return `${y}`
  }
}

interface Group {
  key: string
  label: string
  events: TimelineEvent[]
}

/**
 * Event-driven timeline: renders a sorted list of `TimelineEvent`s with an
 * optional grouping divider (`day | month | year`) and a horizontal /
 * vertical orientation.
 *
 * Distinct from `Timeline` (the simpler step-based UI primitive in
 * `components/ui/Timeline.tsx`) — this one is for chronological event
 * streams where each item has a `Date`.
 */
export function EventTimeline({
  events,
  orientation = 'vertical',
  groupBy,
  renderMarker,
  renderEvent,
  unstyled = false,
  className,
  style,
}: EventTimelineProps) {
  const timelineLocale = useConfig().locale?.timeline
  const sorted = useMemo(() => {
    return [...events].sort((a, b) => toMs(a.date) - toMs(b.date))
  }, [events])

  const groups = useMemo<Group[]>(() => {
    if (!groupBy) {
      return [{ key: 'all', label: '', events: sorted }]
    }
    const out: Group[] = []
    let current: Group | null = null
    for (const ev of sorted) {
      const key = bucketKey(toMs(ev.date), groupBy)
      if (!current || current.key !== key) {
        current = {
          key,
          label: bucketLabel(toMs(ev.date), groupBy),
          events: [],
        }
        out.push(current)
      }
      current.events.push(ev)
    }
    return out
  }, [sorted, groupBy])

  const wrapperClass = unstyled
    ? className
    : ['sg-event-timeline', `sg-event-timeline-${orientation}`, className].filter(Boolean).join(' ')

  const wrapperStyle: CSSProperties = {
    display: 'flex',
    flexDirection: orientation === 'horizontal' ? 'row' : 'column',
    ...style,
  }

  return (
    <div
      className={wrapperClass}
      style={wrapperStyle}
      role="list"
      aria-label={timelineLocale?.ariaLabel ?? 'Timeline'}
      data-orientation={orientation}
      data-group-by={groupBy ?? 'none'}
    >
      {groups.map((group) => (
        <Fragment key={group.key}>
          {groupBy && (
            <div
              className={unstyled ? undefined : 'sg-event-timeline-group'}
              data-group-key={group.key}
            >
              {group.label}
            </div>
          )}
          {group.events.map((ev) => {
            const marker = renderMarker ? (
              renderMarker(ev)
            ) : (
              <span
                className={unstyled ? undefined : 'sg-event-timeline-dot'}
                style={ev.color ? { background: ev.color } : undefined}
                aria-hidden="true"
              />
            )
            const body = renderEvent ? (
              renderEvent(ev)
            ) : (
              <>
                <div className={unstyled ? undefined : 'sg-event-timeline-title'}>{ev.title}</div>
                {ev.description !== undefined && (
                  <div className={unstyled ? undefined : 'sg-event-timeline-description'}>
                    {ev.description}
                  </div>
                )}
              </>
            )
            return (
              <div
                key={ev.id}
                className={unstyled ? undefined : 'sg-event-timeline-item'}
                role="listitem"
                data-event-id={ev.id}
                data-event-time={toMs(ev.date)}
              >
                <div className={unstyled ? undefined : 'sg-event-timeline-marker'}>{marker}</div>
                <div className={unstyled ? undefined : 'sg-event-timeline-content'}>{body}</div>
              </div>
            )
          })}
        </Fragment>
      ))}
    </div>
  )
}
