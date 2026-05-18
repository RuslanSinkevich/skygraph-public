import React from 'react'
import { createPortal } from 'react-dom'
import { Checkbox } from '../../ui/Checkbox'
import { Input } from '../../ui/Input'
import { Button } from '../../ui/Button'
import { Select } from '../../ui/Select'
import type {
  AdvancedFilter,
  FilterDropdownProps,
  FilterOperator,
  TableColumn,
  TableLocale,
} from './types'

/** Column filter UI state from table state hook. */
interface FilterState {
  /** Selected filter values keyed by column. */
  activeFilters: Record<string, unknown[]>
  /** Filter-list search strings keyed by column. */
  filterSearchText: Record<string, string>
  /** Column key with an open filter popover. */
  openFilterDropdown: string | null
  /** Active advanced filters keyed by column. */
  advancedFilters: Record<string, AdvancedFilter>
  /** Anchor элемент (FilterTrigger), используется для позиционирования portal. */
  filterAnchor: HTMLElement | null
}

/** Callbacks that mutate filter UI state. */
interface FilterActions {
  /** Opens or closes a column filter popover. */
  setOpenFilterDropdown: (key: string | null) => void
  /** Сохраняет DOM-элемент-якорь для портального позиционирования popover'а. */
  setFilterAnchor: (el: HTMLElement | null) => void
  /** Toggles a preset filter value. */
  handleFilterToggle: (colKey: string, value: unknown, multiple: boolean) => void
  /** Confirms the current filter selection. */
  handleFilterConfirm: (colKey: string) => void
  /** Clears active filters for a column. */
  handleFilterReset: (colKey: string) => void
  /** Closes the filter popover. */
  handleFilterClose: (colKey: string) => void
  /** Updates search-mode filter text. */
  handleSearchFilterChange: (colKey: string, text: string) => void
  /** Updates filter list search text. */
  setFilterSearchText: React.Dispatch<React.SetStateAction<Record<string, string>>>
  /** Builds props for custom filter dropdown renderers. */
  getFilterDropdownProps: (col: TableColumn) => FilterDropdownProps
  /** Sets / clears the advanced filter for a column. */
  setAdvancedFilter: (colKey: string, filter: AdvancedFilter | null) => void
}

/** Shared props for filter trigger and dropdown content. */
interface FilterTriggerProps {
  /** Target column. */
  col: TableColumn
  /** Resolved table locale. */
  t: Required<TableLocale>
  /** Filter popover state. */
  state: FilterState
  /** Filter state mutators. */
  actions: FilterActions
  /**
   * Ref on the dropdown for outside-click detection. Typed as nullable so
   * `useRef<HTMLDivElement>(null)` callers compile under
   * `strictNullChecks` / `useDefineForClassFields` without `as` casts.
   */
  filterRef: React.RefObject<HTMLDivElement | null>
}

/** Default operators offered for textual columns. */
const TEXT_OPS: FilterOperator[] = [
  'eq',
  'neq',
  'contains',
  'startsWith',
  'endsWith',
  'in',
  'notIn',
  'isEmpty',
  'isNotEmpty',
]

/** Default operators offered for numeric columns. */
const NUMBER_OPS: FilterOperator[] = [
  'eq',
  'neq',
  'lt',
  'lte',
  'gt',
  'gte',
  'between',
  'in',
  'notIn',
  'isEmpty',
  'isNotEmpty',
]

/** Operators that don't need a value input. */
const NO_VALUE_OPS = new Set<FilterOperator>(['isEmpty', 'isNotEmpty'])

/** Filter icon in the header; toggles the column filter popover. */
export function FilterTrigger({ col, t, state, actions }: FilterTriggerProps) {
  const hasFilter =
    col.filterDropdown ||
    col.filterMode === 'search' ||
    col.filterMode === 'advanced' ||
    (col.filters && col.filters.length > 0)
  if (!hasFilter) return null

  const filtered =
    col.filterMode === 'advanced'
      ? state.advancedFilters[col.key] != null
      : (state.activeFilters[col.key]?.length ?? 0) > 0
  const iconNode = col.filterIcon
    ? typeof col.filterIcon === 'function'
      ? col.filterIcon(filtered)
      : col.filterIcon
    : col.filterMode === 'search'
      ? t.searchIcon
      : t.filterIcon

  return (
    <span
      className={`sg-table-filter-trigger${filtered ? ' sg-table-filter-active' : ''}`}
      onClick={(e) => {
        e.stopPropagation()
        const isOpen = state.openFilterDropdown === col.key
        if (isOpen) {
          actions.setOpenFilterDropdown(null)
          actions.setFilterAnchor(null)
        } else {
          actions.setFilterAnchor(e.currentTarget)
          actions.setOpenFilterDropdown(col.key)
        }
      }}
    >
      {iconNode}
    </span>
  )
}

/**
 * Обёртка над `createPortal`, которая позиционирует children как `position: fixed`
 * у нижнего края `anchor`. Пересчитывает координаты на scroll/resize.
 * Без портала advanced-фильтр клипается scroll-контейнером таблицы.
 */
function FilterPortal({
  anchor,
  children,
}: {
  anchor: HTMLElement | null
  children: React.ReactNode
}) {
  const [coords, setCoords] = React.useState<{ top: number; left: number } | null>(null)

  React.useLayoutEffect(() => {
    if (!anchor) return
    const update = () => {
      const r = anchor.getBoundingClientRect()
      setCoords({ top: r.bottom + 4, left: r.left })
    }
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [anchor])

  if (!anchor || !coords || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="sg-table-filter-portal"
      style={{ position: 'fixed', top: coords.top, left: coords.left, zIndex: 1100 }}
    >
      {children}
    </div>,
    document.body,
  )
}

/** Filter popover body: custom dropdown, search field, advanced builder, or preset checklist. */
export function FilterDropdownContent({ col, t, state, actions, filterRef }: FilterTriggerProps) {
  if (state.openFilterDropdown !== col.key) return null

  if (col.filterDropdown) {
    const props = actions.getFilterDropdownProps(col)
    const content =
      typeof col.filterDropdown === 'function' ? col.filterDropdown(props) : col.filterDropdown
    return (
      <FilterPortal anchor={state.filterAnchor}>
        <div
          className="sg-table-filter-dropdown"
          ref={filterRef}
          onClick={(e) => e.stopPropagation()}
        >
          {content}
        </div>
      </FilterPortal>
    )
  }

  if (col.filterMode === 'advanced') {
    return (
      <FilterPortal anchor={state.filterAnchor}>
        <AdvancedFilterPanel
          col={col}
          t={t}
          state={state}
          actions={actions}
          filterRef={filterRef}
        />
      </FilterPortal>
    )
  }

  if (col.filterMode === 'search') {
    const searchVal = (state.activeFilters[col.key]?.[0] as string) ?? ''
    return (
      <FilterPortal anchor={state.filterAnchor}>
        <div
          className="sg-table-filter-dropdown sg-table-filter-search-mode"
          ref={filterRef}
          onClick={(e) => e.stopPropagation()}
        >
          <Input
            placeholder={`${t.searchPlaceholder.replace('...', '')} ${typeof col.title === 'string' ? col.title : ''}...`}
            size="small"
            value={searchVal}
            onChange={(v) => actions.handleSearchFilterChange(col.key, v)}
          />
          <div className="sg-table-filter-actions">
            <Button
              size="small"
              onClick={() => {
                actions.handleFilterReset(col.key)
                actions.handleFilterClose(col.key)
              }}
            >
              {t.filterReset}
            </Button>
            <Button
              size="small"
              type="primary"
              onClick={() => actions.handleFilterConfirm(col.key)}
            >
              {t.filterConfirm}
            </Button>
          </div>
        </div>
      </FilterPortal>
    )
  }

  if (!col.filters || col.filters.length === 0) return null

  const multiple = col.filterMultiple !== false
  const currentVals = state.activeFilters[col.key] ?? []
  const searchTxt = state.filterSearchText[col.key] ?? ''

  let visibleFilters = col.filters
  if (col.filterSearch && searchTxt) {
    visibleFilters = col.filters.filter((f) => {
      if (typeof col.filterSearch === 'function') {
        return col.filterSearch(searchTxt, f)
      }
      return f.text.toLowerCase().includes(searchTxt.toLowerCase())
    })
  }

  return (
    <FilterPortal anchor={state.filterAnchor}>
      <div
        className="sg-table-filter-dropdown"
        ref={filterRef}
        onClick={(e) => e.stopPropagation()}
      >
        {col.filterSearch !== undefined && col.filterSearch !== false && (
          <div className="sg-table-filter-search">
            <Input
              placeholder={t.filterSearchPlaceholder}
              size="small"
              value={searchTxt}
              onChange={(v) => actions.setFilterSearchText((prev) => ({ ...prev, [col.key]: v }))}
            />
          </div>
        )}
        <div className="sg-table-filter-list">
          {visibleFilters.map((f) => {
            const checked = currentVals.includes(f.value)
            return (
              <label key={String(f.value)} className="sg-table-filter-item">
                {multiple ? (
                  <Checkbox
                    checked={checked}
                    onChange={() => actions.handleFilterToggle(col.key, f.value, true)}
                  />
                ) : (
                  <input
                    type="radio"
                    checked={checked}
                    onChange={() => actions.handleFilterToggle(col.key, f.value, false)}
                  />
                )}
                <span>{f.text}</span>
              </label>
            )
          })}
          {visibleFilters.length === 0 && (
            <div className="sg-table-filter-empty">{t.filterEmptyText}</div>
          )}
        </div>
        <div className="sg-table-filter-actions">
          <Button
            size="small"
            onClick={() => {
              actions.handleFilterReset(col.key)
              actions.handleFilterClose(col.key)
            }}
          >
            {t.filterReset}
          </Button>
          <Button size="small" type="primary" onClick={() => actions.handleFilterConfirm(col.key)}>
            {t.filterConfirm}
          </Button>
        </div>
      </div>
    </FilterPortal>
  )
}

/**
 * Расширенный фильтр: пользователь выбирает оператор и значение.
 * Управляет локальным черновиком (`draftOp`/`draftValue`) и применяет
 * результат через `actions.setAdvancedFilter` по нажатию на «OK».
 */
function AdvancedFilterPanel({ col, t, state, actions, filterRef }: FilterTriggerProps) {
  const isNumeric = col.advancedFilterType === 'number'
  const defaultOps = isNumeric ? NUMBER_OPS : TEXT_OPS
  const ops = col.advancedFilterOperators ?? defaultOps

  const current = state.advancedFilters[col.key]
  const [draftOp, setDraftOp] = React.useState<FilterOperator>(current?.op ?? ops[0])
  const [draftValue, setDraftValue] = React.useState<string>(() => formatDraftValue(current?.value))
  const [draftValue2, setDraftValue2] = React.useState<string>(() => {
    const v = current?.value
    if (Array.isArray(v) && v.length === 2) return String(v[1] ?? '')
    return ''
  })

  React.useEffect(() => {
    if (current) {
      setDraftOp(current.op)
      setDraftValue(formatDraftValue(current.value))
      if (Array.isArray(current.value) && current.value.length === 2) {
        setDraftValue2(String(current.value[1] ?? ''))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.openFilterDropdown])

  const reset = () => {
    setDraftOp(ops[0])
    setDraftValue('')
    setDraftValue2('')
    actions.setAdvancedFilter(col.key, null)
    actions.handleFilterClose(col.key)
  }

  const confirm = () => {
    if (NO_VALUE_OPS.has(draftOp)) {
      actions.setAdvancedFilter(col.key, { op: draftOp })
    } else if (draftOp === 'between') {
      const a = parseValue(draftValue, isNumeric)
      const b = parseValue(draftValue2, isNumeric)
      actions.setAdvancedFilter(col.key, { op: 'between', value: [a, b] })
    } else if (draftOp === 'in' || draftOp === 'notIn') {
      const list = draftValue
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .map((s) => parseValue(s, isNumeric))
      actions.setAdvancedFilter(col.key, { op: draftOp, value: list })
    } else {
      actions.setAdvancedFilter(col.key, {
        op: draftOp,
        value: parseValue(draftValue, isNumeric),
      })
    }
    actions.setOpenFilterDropdown(null)
  }

  const showValueInput = !NO_VALUE_OPS.has(draftOp)
  const showSecondInput = draftOp === 'between'
  const isValueRequired = showValueInput
  const valueIsEmpty = isValueRequired && draftValue.trim() === ''
  const secondValueIsEmpty = showSecondInput && draftValue2.trim() === ''
  const confirmDisabled = valueIsEmpty || secondValueIsEmpty

  return (
    <div
      className="sg-table-filter-dropdown sg-table-filter-advanced-mode"
      ref={filterRef}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="sg-table-filter-advanced-row">
        <Select
          size="small"
          value={draftOp}
          onChange={(v) => setDraftOp(v as FilterOperator)}
          options={ops.map((op) => ({ label: operatorLabel(op, t), value: op }))}
          aria-label="Filter operator"
        />
      </div>
      {showValueInput && (
        <div className="sg-table-filter-advanced-row">
          <Input
            size="small"
            type={
              isNumeric && draftOp !== 'in' && draftOp !== 'notIn' && draftOp !== 'between'
                ? 'number'
                : 'text'
            }
            value={draftValue}
            onChange={setDraftValue}
            placeholder={
              draftOp === 'in' || draftOp === 'notIn'
                ? t.filterAdvancedInPlaceholder
                : t.filterAdvancedValuePlaceholder
            }
          />
        </div>
      )}
      {showSecondInput && (
        <div className="sg-table-filter-advanced-row">
          <Input
            size="small"
            type={isNumeric ? 'number' : 'text'}
            value={draftValue2}
            onChange={setDraftValue2}
            placeholder={t.filterAdvancedBetweenMaxPlaceholder}
          />
        </div>
      )}
      <div className="sg-table-filter-actions">
        <Button size="small" onClick={reset}>
          {t.filterReset}
        </Button>
        <Button size="small" type="primary" disabled={confirmDisabled} onClick={confirm}>
          {t.filterConfirm}
        </Button>
      </div>
    </div>
  )
}

function formatDraftValue(value: unknown): string {
  if (value == null) return ''
  if (Array.isArray(value)) return value.map((v) => String(v ?? '')).join(', ')
  return String(value)
}

function parseValue(raw: string, numeric: boolean): unknown {
  const trimmed = raw.trim()
  if (trimmed === '') return ''
  if (numeric) {
    const n = Number(trimmed)
    return Number.isNaN(n) ? trimmed : n
  }
  return trimmed
}

function operatorLabel(op: FilterOperator, t: Required<TableLocale>): string {
  const map: Record<FilterOperator, string> = {
    eq: t.filterOpEq,
    neq: t.filterOpNeq,
    lt: t.filterOpLt,
    lte: t.filterOpLte,
    gt: t.filterOpGt,
    gte: t.filterOpGte,
    between: t.filterOpBetween,
    in: t.filterOpIn,
    notIn: t.filterOpNotIn,
    contains: t.filterOpContains,
    startsWith: t.filterOpStartsWith,
    endsWith: t.filterOpEndsWith,
    isEmpty: t.filterOpIsEmpty,
    isNotEmpty: t.filterOpIsNotEmpty,
  }
  return map[op]
}
