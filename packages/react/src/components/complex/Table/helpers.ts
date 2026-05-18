import type React from 'react'
import type { RowId } from '@skygraph/core'
import type { TableColumn, HeaderCell, FlatRow, CellSpan, AggregateType, GroupRow } from './types'

/** Returns leaf columns in visual order, flattening grouped definitions. */
export function flattenLeafColumns(cols: TableColumn[]): TableColumn[] {
  const result: TableColumn[] = []
  for (const col of cols) {
    if (col.children && col.children.length > 0) {
      result.push(...flattenLeafColumns(col.children))
    } else {
      result.push(col)
    }
  }
  return result
}

/** Builds a row-major grid of header cells for grouped columns. */
export function buildHeaderRows(cols: TableColumn[]): HeaderCell[][] {
  function getDepth(c: TableColumn): number {
    if (!c.children || c.children.length === 0) return 1
    return 1 + Math.max(...c.children.map(getDepth))
  }

  const maxDepth = cols.length > 0 ? Math.max(...cols.map(getDepth)) : 1

  function getLeafCount(c: TableColumn): number {
    if (!c.children || c.children.length === 0) return 1
    return c.children.reduce((sum, ch) => sum + getLeafCount(ch), 0)
  }

  const rows: HeaderCell[][] = Array.from({ length: maxDepth }, () => [])

  function fill(list: TableColumn[], depth: number) {
    for (const c of list) {
      if (c.children && c.children.length > 0) {
        rows[depth].push({ col: c, colSpan: getLeafCount(c), rowSpan: 1 })
        fill(c.children, depth + 1)
      } else {
        rows[depth].push({ col: c, colSpan: 1, rowSpan: maxDepth - depth })
      }
    }
  }

  fill(cols, 0)
  return rows
}

/** Flattens nested row data into visible rows respecting `expandedSet`. */
export function flattenTreeRows(
  rows: Array<{ id: RowId; data: Record<string, unknown> }>,
  childrenKey: string,
  expandedSet: Set<RowId>,
  depth = 0,
): FlatRow[] {
  const result: FlatRow[] = []
  for (const row of rows) {
    const children = row.data[childrenKey] as Array<{ id: RowId; data: Record<string, unknown> }> | undefined
    const hasChildren = Array.isArray(children) && children.length > 0
    result.push({ id: row.id, data: row.data, depth, hasChildren })
    if (hasChildren && expandedSet.has(row.id)) {
      result.push(...flattenTreeRows(children!, childrenKey, expandedSet, depth + 1))
    }
  }
  return result
}

/** Returns every row id that has nested children (for expand-all). */
export function collectAllTreeIds(
  rows: Array<{ id: RowId; data: Record<string, unknown> }>,
  childrenKey: string,
): RowId[] {
  const ids: RowId[] = []
  for (const row of rows) {
    const children = row.data[childrenKey] as Array<{ id: RowId; data: Record<string, unknown> }> | undefined
    if (Array.isArray(children) && children.length > 0) {
      ids.push(row.id)
      ids.push(...collectAllTreeIds(children, childrenKey))
    }
  }
  return ids
}

/** Maps `${rowId}:${colKey}` to rowspan/colspan from `column.onCell`. */
export function computeSpanMap(
  columns: TableColumn[],
  flatRows: FlatRow[],
): Map<string, CellSpan> {
  const map = new Map<string, CellSpan>()
  const hasOnCell = columns.some((c) => c.onCell)
  if (!hasOnCell) return map
  flatRows.forEach((row, rowIndex) => {
    for (const col of columns) {
      if (col.onCell) {
        const span = col.onCell(row.data, rowIndex)
        if (span && (span.rowSpan !== undefined || span.colSpan !== undefined)) {
          map.set(`${row.id}:${col.key}`, span)
        }
      }
    }
  })
  return map
}

/** Keys of cells that should not render because they are covered by spans. */
export function computeHiddenCells(
  columns: TableColumn[],
  flatRows: FlatRow[],
  spanMap: Map<string, CellSpan>,
): Set<string> {
  const hidden = new Set<string>()
  const hasOnCell = columns.some((c) => c.onCell)
  if (!hasOnCell) return hidden
  flatRows.forEach((row, rowIndex) => {
    for (let ci = 0; ci < columns.length; ci++) {
      const key = `${row.id}:${columns[ci].key}`
      const span = spanMap.get(key)
      if (!span) continue
      if (span.rowSpan === 0 || span.colSpan === 0) {
        hidden.add(key)
        continue
      }
      const rs = span.rowSpan ?? 1
      const cs = span.colSpan ?? 1
      for (let dr = 0; dr < rs; dr++) {
        for (let dc = 0; dc < cs; dc++) {
          if (dr === 0 && dc === 0) continue
          const targetRow = flatRows[rowIndex + dr]
          const targetCol = columns[ci + dc]
          if (targetRow && targetCol) {
            hidden.add(`${targetRow.id}:${targetCol.key}`)
          }
        }
      }
    }
  })
  return hidden
}

/** Computes sticky left/right, alignment, and ellipsis styles for a column. */
export function getFixedStyle(
  col: TableColumn,
  fixedLeftOffsets: Record<string, number>,
  fixedRightOffsets: Record<string, number>,
  isHeader?: boolean,
): React.CSSProperties {
  const s: React.CSSProperties = {}
  if (col.align) s.textAlign = col.align
  if (col.ellipsis) {
    s.overflow = 'hidden'
    s.textOverflow = 'ellipsis'
    s.whiteSpace = 'nowrap'
  }
  if (col.fixed === 'left') {
    s.position = 'sticky'
    s.left = fixedLeftOffsets[col.key]
    s.zIndex = isHeader ? 4 : 2
  }
  if (col.fixed === 'right') {
    s.position = 'sticky'
    s.right = fixedRightOffsets[col.key]
    s.zIndex = isHeader ? 4 : 2
  }
  return s
}

/** Reduces numeric column values with a built-in aggregate type. */
export function computeAggregate(
  values: unknown[],
  type: AggregateType,
): number | string {
  const nums = values.map(Number).filter((n) => !isNaN(n))
  if (nums.length === 0) return type === 'count' ? values.length : '-'

  switch (type) {
    case 'sum':
      return Math.round(nums.reduce((a, b) => a + b, 0) * 100) / 100
    case 'avg':
      return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100
    case 'count':
      return values.length
    case 'min':
      return Math.min(...nums)
    case 'max':
      return Math.max(...nums)
  }
}

/** Inserts group header rows and optional child rows for one group-by field. */
export function groupByColumn(
  flatRows: FlatRow[],
  groupByKey: string,
  columns: TableColumn[],
  expandedGroups: Set<string>,
): FlatRow[] {
  const groups = new Map<string, FlatRow[]>()
  const groupOrder: string[] = []

  for (const row of flatRows) {
    const val = String(row.data[groupByKey] ?? 'Other')
    if (!groups.has(val)) {
      groups.set(val, [])
      groupOrder.push(val)
    }
    groups.get(val)!.push(row)
  }

  const result: FlatRow[] = []
  for (const gKey of groupOrder) {
    const rows = groups.get(gKey)!
    const expanded = expandedGroups.has(gKey)

    const aggregates: Record<string, React.ReactNode> = {}
    for (const col of columns) {
      if (col.aggregate) {
        const values = rows.map((r) => r.data[col.key])
        if (typeof col.aggregate === 'function') {
          aggregates[col.key] = col.aggregate(values)
        } else {
          aggregates[col.key] = computeAggregate(values, col.aggregate)
        }
      }
    }

    const groupRow: GroupRow = {
      __isGroup: true,
      groupKey: gKey,
      groupValue: gKey,
      count: rows.length,
      expanded,
      aggregates,
    }

    result.push({
      id: `__group_${gKey}` as RowId,
      data: {},
      depth: 0,
      hasChildren: false,
      __groupRow: groupRow,
    })

    if (expanded) {
      result.push(...rows)
    }
  }
  return result
}

/** Splits rows into top-pinned, middle, and bottom-pinned lists. */
export function separatePinnedRows(
  flatRows: FlatRow[],
  topIds?: RowId[],
  bottomIds?: RowId[],
): { top: FlatRow[]; middle: FlatRow[]; bottom: FlatRow[] } {
  const topSet = new Set(topIds ?? [])
  const bottomSet = new Set(bottomIds ?? [])

  const top: FlatRow[] = []
  const middle: FlatRow[] = []
  const bottom: FlatRow[] = []

  for (const row of flatRows) {
    if (topSet.has(row.id)) top.push(row)
    else if (bottomSet.has(row.id)) bottom.push(row)
    else middle.push(row)
  }

  if (topIds) {
    top.sort((a, b) => topIds.indexOf(a.id) - topIds.indexOf(b.id))
  }
  if (bottomIds) {
    bottom.sort((a, b) => bottomIds.indexOf(a.id) - bottomIds.indexOf(b.id))
  }

  return { top, middle, bottom }
}

/** Footer aggregate values per column, or null when no aggregates configured. */
export function computeColumnAggregates(
  columns: TableColumn[],
  flatRows: FlatRow[],
): Record<string, React.ReactNode> | null {
  const hasAny = columns.some((c) => c.aggregate)
  if (!hasAny) return null

  const result: Record<string, React.ReactNode> = {}
  for (const col of columns) {
    if (!col.aggregate) continue
    const values = flatRows.filter((r) => !r.__groupRow).map((r) => r.data[col.key])
    if (typeof col.aggregate === 'function') {
      result[col.key] = col.aggregate(values)
    } else {
      result[col.key] = computeAggregate(values, col.aggregate)
    }
  }
  return result
}
