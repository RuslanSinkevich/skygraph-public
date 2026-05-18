import type { GroupRow, TableLocale } from './types'

/** Props for the synthetic group header row. */
export interface TableGroupRowProps {
  /** Group metadata (key, value, count, aggregates). */
  group: GroupRow
  /** Field used to derive the group, displayed in the title. */
  groupBy?: string
  /** Number of grid columns the group row should span. */
  totalCols: number
  /** Resolved table locale strings. */
  t: Required<TableLocale>
  /** Toggle expand / collapse for this group key. */
  onToggle: (groupKey: string) => void
}

/**
 * Group header row rendered above each set of grouped data rows.
 * Spans the entire row, shows expand/collapse affordance, group title,
 * row count, and aggregate values when configured.
 */
export function TableGroupRow({ group, groupBy, totalCols, t, onToggle }: TableGroupRowProps) {
  return (
    <div
      className="sg-table-group-row"
      role="row"
      style={{ display: 'contents' }}
    >
      <div
        className="sg-table-td sg-table-group-cell"
        role="cell"
        style={{ gridColumn: `1 / ${totalCols + 1}` }}
        onClick={() => onToggle(group.groupKey)}
      >
        <button
          type="button"
          className={`sg-table-expand-btn${group.expanded ? ' sg-table-expand-open' : ''}`}
          aria-label={group.expanded ? t.groupCollapse : t.groupExpand}
          aria-expanded={group.expanded}
          onClick={(e) => {
            e.stopPropagation()
            onToggle(group.groupKey)
          }}
        >
          {t.expandIcon}
        </button>
        <span className="sg-table-group-title">
          {groupBy ? `${groupBy}: ` : null}
          <strong>{String(group.groupValue)}</strong>
        </span>
        <span className="sg-table-group-count">({group.count})</span>
        {Object.keys(group.aggregates).length > 0 && (
          <span className="sg-table-group-aggregates">
            {Object.entries(group.aggregates).map(([key, val]) => (
              <span key={key} className="sg-table-group-agg-item">
                {key}: {String(val)}
              </span>
            ))}
          </span>
        )}
      </div>
    </div>
  )
}
