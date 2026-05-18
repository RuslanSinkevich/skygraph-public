import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import type { CalendarProps, CalendarEvent } from './types'
import { DEFAULT_MONTH_NAMES, DEFAULT_DAY_NAMES } from './types'
import { useConfig } from '../../ConfigProvider'

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

function isToday(date: Date): boolean {
  return isSameDay(date, new Date())
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

function isBetween(date: Date, start: Date, end: Date): boolean {
  const t = date.getTime()
  const s = Math.min(start.getTime(), end.getTime())
  const e = Math.max(start.getTime(), end.getTime())
  return t >= s && t <= e
}

function isRangeStart(date: Date, start: Date | null, end: Date | null): boolean {
  if (!start) return false
  if (!end) return isSameDay(date, start)
  const s = start.getTime() <= end.getTime() ? start : end
  return isSameDay(date, s)
}

function isRangeEnd(date: Date, start: Date | null, end: Date | null): boolean {
  if (!start || !end) return false
  const e = start.getTime() <= end.getTime() ? end : start
  return isSameDay(date, e)
}

interface DayCell {
  date: Date
  day: number
  inMonth: boolean
}

function getMonthGrid(year: number, month: number, weekStartDay: number): DayCell[][] {
  const daysInMonth = getDaysInMonth(year, month)
  const firstDayRaw = new Date(year, month, 1).getDay()
  const firstDay = (firstDayRaw - weekStartDay + 7) % 7
  const prevMonthDays = getDaysInMonth(year, month - 1)

  const cells: DayCell[] = []

  for (let i = firstDay - 1; i >= 0; i--) {
    const day = prevMonthDays - i
    cells.push({
      date: new Date(year, month - 1, day),
      day,
      inMonth: false,
    })
  }

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({
      date: new Date(year, month, day),
      day,
      inMonth: true,
    })
  }

  const remaining = 42 - cells.length
  for (let day = 1; day <= remaining; day++) {
    cells.push({
      date: new Date(year, month + 1, day),
      day,
      inMonth: false,
    })
  }

  const weeks: DayCell[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7))
  }
  return weeks
}

function getEventsForDate(events: CalendarEvent[] | undefined, date: Date): CalendarEvent[] {
  if (!events) return []
  return events.filter((ev) => isSameDay(ev.date, date))
}

/**
 * Month/year calendar with panel navigation, week numbers, range/multi selection,
 * event markers, keyboard navigation, and fullscreen or compact layout.
 */
export function Calendar(props: CalendarProps) {
  const {
    value: controlledValue,
    defaultValue,
    onChange,
    onPanelChange,
    onSelect,
    mode: controlledMode,
    fullscreen = true,
    headerRender,
    cellRender,
    disabledDate,
    locale,
    className,
    style,
    unstyled,
    showWeekNumber,
    weekStartDay = 0,
    rangeSelection,
    rangeValue: controlledRangeValue,
    defaultRangeValue,
    onRangeChange,
    multipleSelection,
    multipleValue: controlledMultipleValue,
    defaultMultipleValue,
    onMultipleChange,
    events,
    maxEvents = 3,
    keyboard = true,
  } = props

  const ctxCalendarLocale = useConfig().locale?.calendar
  const monthNames = locale?.monthNames ?? ctxCalendarLocale?.monthNames ?? DEFAULT_MONTH_NAMES
  const baseDayNames = locale?.dayNames ?? ctxCalendarLocale?.dayNames ?? DEFAULT_DAY_NAMES
  const todayLabel = locale?.today ?? ctxCalendarLocale?.today ?? 'Today'
  const weekLabel = locale?.week ?? ctxCalendarLocale?.week ?? 'W'
  const prevYearLabel = ctxCalendarLocale?.prevYear ?? 'Previous year'
  const nextYearLabel = ctxCalendarLocale?.nextYear ?? 'Next year'
  const prevMonthLabel = ctxCalendarLocale?.prevMonth ?? 'Previous month'
  const nextMonthLabel = ctxCalendarLocale?.nextMonth ?? 'Next month'

  const dayNames = useMemo(() => {
    if (weekStartDay === 0) return baseDayNames
    return [...baseDayNames.slice(weekStartDay), ...baseDayNames.slice(0, weekStartDay)]
  }, [baseDayNames, weekStartDay])

  const [internalValue, setInternalValue] = useState<Date>(
    () => controlledValue ?? defaultValue ?? new Date(),
  )
  const [internalMode, setInternalMode] = useState<'month' | 'year'>(controlledMode ?? 'month')

  const [panelDate, setPanelDate] = useState<Date>(
    () => controlledValue ?? defaultValue ?? new Date(),
  )

  // Range selection state
  const [internalRange, setInternalRange] = useState<[Date | null, Date | null]>(
    () => controlledRangeValue ?? defaultRangeValue ?? [null, null],
  )
  const [rangeHover, setRangeHover] = useState<Date | null>(null)
  const rangeClickCount = useRef(0)

  const currentRange = controlledRangeValue ?? internalRange

  // Multiple selection state
  const [internalMultiple, setInternalMultiple] = useState<Date[]>(
    () => controlledMultipleValue ?? defaultMultipleValue ?? [],
  )
  const currentMultiple = controlledMultipleValue ?? internalMultiple

  // Keyboard focused date
  const [focusedDate, setFocusedDate] = useState<Date | null>(null)
  const calendarRef = useRef<HTMLDivElement>(null)

  const currentValue = controlledValue ?? internalValue
  const currentMode = controlledMode ?? internalMode

  useEffect(() => {
    if (controlledValue) {
      setInternalValue(controlledValue)
      setPanelDate(controlledValue)
    }
  }, [controlledValue])

  useEffect(() => {
    if (controlledMode !== undefined) {
      setInternalMode(controlledMode)
    }
  }, [controlledMode])

  const panelYear = panelDate.getFullYear()
  const panelMonth = panelDate.getMonth()

  const weeks = useMemo(
    () => getMonthGrid(panelYear, panelMonth, weekStartDay),
    [panelYear, panelMonth, weekStartDay],
  )

  const handleDateSelect = useCallback(
    (date: Date) => {
      if (disabledDate?.(date)) return

      if (rangeSelection) {
        const clickNum = rangeClickCount.current
        if (clickNum === 0) {
          const newRange: [Date | null, Date | null] = [date, null]
          setInternalRange(newRange)
          onRangeChange?.(newRange)
          rangeClickCount.current = 1
        } else {
          const start = currentRange[0]!
          const newRange: [Date | null, Date | null] =
            start.getTime() <= date.getTime() ? [start, date] : [date, start]
          setInternalRange(newRange)
          onRangeChange?.(newRange)
          rangeClickCount.current = 0
          setRangeHover(null)
        }
        return
      }

      if (multipleSelection) {
        const exists = currentMultiple.findIndex((d) => isSameDay(d, date))
        let next: Date[]
        if (exists >= 0) {
          next = currentMultiple.filter((_, i) => i !== exists)
        } else {
          next = [...currentMultiple, date]
        }
        setInternalMultiple(next)
        onMultipleChange?.(next)
        return
      }

      setInternalValue(date)
      setPanelDate(date)
      onSelect?.(date)
      onChange?.(date)
    },
    [
      disabledDate,
      onSelect,
      onChange,
      rangeSelection,
      currentRange,
      onRangeChange,
      multipleSelection,
      currentMultiple,
      onMultipleChange,
    ],
  )

  const handleMonthSelect = useCallback(
    (month: number) => {
      const newDate = new Date(panelYear, month, 1)
      setPanelDate(newDate)
      setInternalValue(newDate)
      onSelect?.(newDate)
      onChange?.(newDate)
      setInternalMode('month')
      onPanelChange?.(newDate, 'month')
    },
    [panelYear, onSelect, onChange, onPanelChange],
  )

  const handlePrevMonth = useCallback(() => {
    const d = new Date(panelYear, panelMonth - 1, 1)
    setPanelDate(d)
    onPanelChange?.(d, currentMode)
  }, [panelYear, panelMonth, currentMode, onPanelChange])

  const handleNextMonth = useCallback(() => {
    const d = new Date(panelYear, panelMonth + 1, 1)
    setPanelDate(d)
    onPanelChange?.(d, currentMode)
  }, [panelYear, panelMonth, currentMode, onPanelChange])

  const handlePrevYear = useCallback(() => {
    const d = new Date(panelYear - 1, panelMonth, 1)
    setPanelDate(d)
    onPanelChange?.(d, currentMode)
  }, [panelYear, panelMonth, currentMode, onPanelChange])

  const handleNextYear = useCallback(() => {
    const d = new Date(panelYear + 1, panelMonth, 1)
    setPanelDate(d)
    onPanelChange?.(d, currentMode)
  }, [panelYear, panelMonth, currentMode, onPanelChange])

  const handleModeChange = useCallback(
    (mode: 'month' | 'year') => {
      setInternalMode(mode)
      onPanelChange?.(panelDate, mode)
    },
    [panelDate, onPanelChange],
  )

  const handlePanelDateChange = useCallback(
    (date: Date) => {
      setPanelDate(date)
      onPanelChange?.(date, currentMode)
    },
    [currentMode, onPanelChange],
  )

  const handleToday = useCallback(() => {
    const today = new Date()
    handleDateSelect(today)
  }, [handleDateSelect])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!keyboard || currentMode !== 'month') return

      const focused = focusedDate ?? currentValue
      let next: Date | null = null

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          next = new Date(focused.getFullYear(), focused.getMonth(), focused.getDate() - 1)
          break
        case 'ArrowRight':
          e.preventDefault()
          next = new Date(focused.getFullYear(), focused.getMonth(), focused.getDate() + 1)
          break
        case 'ArrowUp':
          e.preventDefault()
          next = new Date(focused.getFullYear(), focused.getMonth(), focused.getDate() - 7)
          break
        case 'ArrowDown':
          e.preventDefault()
          next = new Date(focused.getFullYear(), focused.getMonth(), focused.getDate() + 7)
          break
        case 'Home':
          e.preventDefault()
          next = new Date(focused.getFullYear(), focused.getMonth(), 1)
          break
        case 'End':
          e.preventDefault()
          next = new Date(focused.getFullYear(), focused.getMonth() + 1, 0)
          break
        case 'PageUp':
          e.preventDefault()
          if (e.shiftKey) {
            next = new Date(focused.getFullYear() - 1, focused.getMonth(), focused.getDate())
          } else {
            next = new Date(focused.getFullYear(), focused.getMonth() - 1, focused.getDate())
          }
          break
        case 'PageDown':
          e.preventDefault()
          if (e.shiftKey) {
            next = new Date(focused.getFullYear() + 1, focused.getMonth(), focused.getDate())
          } else {
            next = new Date(focused.getFullYear(), focused.getMonth() + 1, focused.getDate())
          }
          break
        case 'Enter':
        case ' ':
          e.preventDefault()
          handleDateSelect(focused)
          return
      }

      if (next) {
        setFocusedDate(next)
        if (next.getMonth() !== panelMonth || next.getFullYear() !== panelYear) {
          setPanelDate(next)
          onPanelChange?.(next, currentMode)
        }
      }
    },
    [
      keyboard,
      currentMode,
      focusedDate,
      currentValue,
      panelMonth,
      panelYear,
      handleDateSelect,
      onPanelChange,
    ],
  )

  const yearOptions = useMemo(() => {
    const years: number[] = []
    for (let y = panelYear - 10; y <= panelYear + 10; y++) {
      years.push(y)
    }
    return years
  }, [panelYear])

  const isDateInRange = useCallback(
    (date: Date): boolean => {
      if (!rangeSelection) return false
      const [start, end] = currentRange
      if (start && end) return isBetween(date, start, end)
      if (start && rangeHover) return isBetween(date, start, rangeHover)
      return false
    },
    [rangeSelection, currentRange, rangeHover],
  )

  const isDateMultiSelected = useCallback(
    (date: Date): boolean => {
      if (!multipleSelection) return false
      return currentMultiple.some((d) => isSameDay(d, date))
    },
    [multipleSelection, currentMultiple],
  )

  // Unstyled render
  if (unstyled) {
    return (
      <div
        className={className}
        style={style}
        ref={calendarRef}
        tabIndex={keyboard ? 0 : undefined}
        onKeyDown={handleKeyDown}
      >
        {headerRender ? (
          headerRender({
            value: panelDate,
            type: currentMode,
            onChange: handlePanelDateChange,
            onTypeChange: handleModeChange,
          })
        ) : (
          <div>
            <button onClick={handlePrevYear}>&laquo;</button>
            {currentMode === 'month' && <button onClick={handlePrevMonth}>&lsaquo;</button>}
            <span>
              {monthNames[panelMonth]} {panelYear}
            </span>
            {currentMode === 'month' && <button onClick={handleNextMonth}>&rsaquo;</button>}
            <button onClick={handleNextYear}>&raquo;</button>
            <button onClick={() => handleModeChange(currentMode === 'month' ? 'year' : 'month')}>
              {currentMode === 'month' ? 'Year' : 'Month'}
            </button>
          </div>
        )}

        {currentMode === 'month' ? (
          <table>
            <thead>
              <tr>
                {showWeekNumber && <th>{weekLabel}</th>}
                {dayNames.map((d) => (
                  <th key={d}>{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week, wi) => (
                <tr key={wi}>
                  {showWeekNumber && <td>{getISOWeekNumber(week[0].date)}</td>}
                  {week.map((cell) => (
                    <td key={cell.date.toISOString()} onClick={() => handleDateSelect(cell.date)}>
                      {cell.day}
                      {cellRender?.(cell.date, { type: 'date' })}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div>
            {monthNames.map((name, i) => (
              <div key={i} onClick={() => handleMonthSelect(i)}>
                {name}
                {cellRender?.(new Date(panelYear, i, 1), { type: 'month' })}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Styled render
  const wrapperCls = [
    'sg-calendar',
    fullscreen ? 'sg-calendar-fullscreen' : 'sg-calendar-mini',
    rangeSelection ? 'sg-calendar-range' : '',
    multipleSelection ? 'sg-calendar-multiple' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const renderHeader = () => {
    if (headerRender) {
      return headerRender({
        value: panelDate,
        type: currentMode,
        onChange: handlePanelDateChange,
        onTypeChange: handleModeChange,
      })
    }

    return (
      <div className="sg-calendar-header">
        <div className="sg-calendar-header-left">
          <button
            className="sg-calendar-nav-btn"
            onClick={handlePrevYear}
            title={prevYearLabel}
            aria-label={prevYearLabel}
          >
            &laquo;
          </button>
          {currentMode === 'month' && (
            <button
              className="sg-calendar-nav-btn"
              onClick={handlePrevMonth}
              title={prevMonthLabel}
              aria-label={prevMonthLabel}
            >
              &lsaquo;
            </button>
          )}
        </div>

        <div className="sg-calendar-header-center">
          <select
            className="sg-calendar-month-select"
            value={panelMonth}
            onChange={(e) => {
              const d = new Date(panelYear, Number(e.target.value), 1)
              setPanelDate(d)
              onPanelChange?.(d, currentMode)
            }}
          >
            {monthNames.map((name, i) => (
              <option key={i} value={i}>
                {name}
              </option>
            ))}
          </select>

          <select
            className="sg-calendar-year-select"
            value={panelYear}
            onChange={(e) => {
              const d = new Date(Number(e.target.value), panelMonth, 1)
              setPanelDate(d)
              onPanelChange?.(d, currentMode)
            }}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <div className="sg-calendar-mode-switch">
            <button
              className={`sg-calendar-mode-btn ${currentMode === 'month' ? 'sg-calendar-mode-btn-active' : ''}`}
              onClick={() => handleModeChange('month')}
            >
              Month
            </button>
            <button
              className={`sg-calendar-mode-btn ${currentMode === 'year' ? 'sg-calendar-mode-btn-active' : ''}`}
              onClick={() => handleModeChange('year')}
            >
              Year
            </button>
          </div>
        </div>

        <div className="sg-calendar-header-right">
          {currentMode === 'month' && (
            <button
              className="sg-calendar-nav-btn"
              onClick={handleNextMonth}
              title={nextMonthLabel}
              aria-label={nextMonthLabel}
            >
              &rsaquo;
            </button>
          )}
          <button
            className="sg-calendar-nav-btn"
            onClick={handleNextYear}
            title={nextYearLabel}
            aria-label={nextYearLabel}
          >
            &raquo;
          </button>
        </div>
      </div>
    )
  }

  const renderMonthView = () => (
    <table className="sg-calendar-table">
      <thead>
        <tr>
          {showWeekNumber && <th className="sg-calendar-week-header">{weekLabel}</th>}
          {dayNames.map((d) => (
            <th key={d} className="sg-calendar-day-header">
              {d}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {weeks.map((week, wi) => (
          <tr key={wi} className="sg-calendar-week-row">
            {showWeekNumber && (
              <td className="sg-calendar-week-number">{getISOWeekNumber(week[0].date)}</td>
            )}
            {week.map((cell) => {
              const isDisabled = disabledDate?.(cell.date)
              const isSelected =
                !rangeSelection && !multipleSelection && isSameDay(cell.date, currentValue)
              const isTodayCell = isToday(cell.date)
              const isFocused = focusedDate ? isSameDay(cell.date, focusedDate) : false
              const inRange = isDateInRange(cell.date)
              const isMultiSel = isDateMultiSelected(cell.date)
              const isStart =
                rangeSelection && isRangeStart(cell.date, currentRange[0], currentRange[1])
              const isEnd =
                rangeSelection && isRangeEnd(cell.date, currentRange[0], currentRange[1])
              const dateEvents = getEventsForDate(events, cell.date)

              const cellCls = [
                'sg-calendar-cell',
                cell.inMonth ? '' : 'sg-calendar-cell-outside',
                isSelected ? 'sg-calendar-cell-selected' : '',
                isTodayCell ? 'sg-calendar-cell-today' : '',
                isDisabled ? 'sg-calendar-cell-disabled' : '',
                isFocused ? 'sg-calendar-cell-focused' : '',
                inRange ? 'sg-calendar-cell-in-range' : '',
                isStart ? 'sg-calendar-cell-range-start' : '',
                isEnd ? 'sg-calendar-cell-range-end' : '',
                isMultiSel ? 'sg-calendar-cell-multi-selected' : '',
              ]
                .filter(Boolean)
                .join(' ')

              return (
                <td
                  key={cell.date.toISOString()}
                  className={cellCls}
                  onClick={() => !isDisabled && handleDateSelect(cell.date)}
                  onMouseEnter={() => {
                    if (rangeSelection && rangeClickCount.current === 1) {
                      setRangeHover(cell.date)
                    }
                  }}
                >
                  <div className="sg-calendar-cell-inner">
                    <span className="sg-calendar-cell-date">{cell.day}</span>
                    {dateEvents.length > 0 && (
                      <div className="sg-calendar-cell-events">
                        {dateEvents.slice(0, maxEvents).map((ev, ei) => (
                          <span
                            key={ev.key ?? ei}
                            className="sg-calendar-event-dot"
                            style={{ backgroundColor: ev.color ?? 'var(--sg-primary, #1677ff)' }}
                            title={ev.title}
                          />
                        ))}
                        {dateEvents.length > maxEvents && (
                          <span className="sg-calendar-event-more">
                            +{dateEvents.length - maxEvents}
                          </span>
                        )}
                      </div>
                    )}
                    {cellRender && (
                      <div className="sg-calendar-cell-content">
                        {cellRender(cell.date, { type: 'date' })}
                      </div>
                    )}
                  </div>
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )

  const renderYearView = () => (
    <div className="sg-calendar-month-grid">
      {monthNames.map((name, i) => {
        const monthDate = new Date(panelYear, i, 1)
        const isCurrentMonth = isSameMonth(monthDate, currentValue)
        const isThisMonth = isSameMonth(monthDate, new Date())

        const cellCls = [
          'sg-calendar-month-cell',
          isCurrentMonth ? 'sg-calendar-month-cell-selected' : '',
          isThisMonth ? 'sg-calendar-month-cell-current' : '',
        ]
          .filter(Boolean)
          .join(' ')

        return (
          <div key={i} className={cellCls} onClick={() => handleMonthSelect(i)}>
            <div className="sg-calendar-month-cell-inner">
              <span className="sg-calendar-month-cell-name">{name}</span>
              {cellRender && (
                <div className="sg-calendar-month-cell-content">
                  {cellRender(monthDate, { type: 'month' })}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )

  return (
    <div
      ref={calendarRef}
      className={wrapperCls}
      style={style}
      tabIndex={keyboard ? 0 : undefined}
      onKeyDown={handleKeyDown}
    >
      {renderHeader()}
      <div className="sg-calendar-body">
        {currentMode === 'month' ? renderMonthView() : renderYearView()}
      </div>
      {fullscreen && (
        <div className="sg-calendar-footer">
          <button className="sg-calendar-today-btn" onClick={handleToday}>
            {todayLabel}
          </button>
          {rangeSelection && currentRange[0] && currentRange[1] && (
            <button
              className="sg-calendar-clear-btn"
              onClick={() => {
                setInternalRange([null, null])
                onRangeChange?.([null, null])
                rangeClickCount.current = 0
              }}
            >
              Clear Range
            </button>
          )}
          {multipleSelection && currentMultiple.length > 0 && (
            <span className="sg-calendar-selection-count">{currentMultiple.length} selected</span>
          )}
        </div>
      )}
    </div>
  )
}
