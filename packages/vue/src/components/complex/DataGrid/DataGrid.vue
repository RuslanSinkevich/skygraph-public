<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useVirtualScroll } from '../../../composables/useVirtualScroll'
import { useConfig } from '../../ui/ConfigProvider.vue'
import type {
  CellPosition,
  CellValue,
  DataGridColumn,
  DataGridProps,
  DataGridSummaryRow,
} from './types'

type Row = Record<string, unknown>

const props = withDefaults(defineProps<DataGridProps<Row>>(), {
  rowHeight: 36,
  headerHeight: 40,
  width: '100%',
  height: 400,
  striped: false,
  highlightOnHover: true,
  rowSelection: false,
  showRowNumber: false,
  overscan: 5,
  loading: false,
  emptyText: 'No data',
})

const cfg = useConfig()
const selectAllRowsLabel = computed(
  () => cfg.value.locale?.dataGrid?.selectAllRows ?? 'Select all rows',
)
const selectRowLabel = computed(() => cfg.value.locale?.dataGrid?.selectRow ?? 'Select row')

const emit = defineEmits<{
  (e: 'cell-edit', payload: { rowIndex: number; columnKey: string; value: CellValue }): void
  (e: 'sort', payload: { column: string; direction: 'asc' | 'desc' }): void
  (e: 'row-click', payload: { row: Row; rowIndex: number }): void
  (e: 'row-double-click', payload: { row: Row; rowIndex: number }): void
  (e: 'selected-rows-change', payload: Set<string | number>): void
}>()

const SELECTION_COL_WIDTH = 40
const ROW_NUMBER_COL_WIDTH = 48

const orderedColumns = computed(() => {
  const left = props.columns.filter((c) => c.frozen === 'left')
  const middle = props.columns.filter((c) => !c.frozen)
  const right = props.columns.filter((c) => c.frozen === 'right')
  return [...left, ...middle, ...right]
})

const totalContentHeight = computed(() => props.data.length * props.rowHeight)

const itemCount = computed(() => props.data.length)
const itemHeight = computed(() => props.rowHeight)
const overscan = computed(() => props.overscan ?? 5)
const { range, containerRef, scrollToIndex } = useVirtualScroll({
  itemCount,
  itemHeight,
  overscan,
})

const activeCell = ref<CellPosition | null>(null)
const editingCell = ref<CellPosition | null>(null)
const draftValue = ref<CellValue>(null)

const internalSelected = ref<Set<string | number>>(new Set(props.selectedRows ?? []))
watch(
  () => props.selectedRows,
  (next) => {
    internalSelected.value = new Set(next ?? [])
  },
)

const visibleRows = computed(() => {
  const items = range.value.visibleItems
  return items.map((vi) => ({
    row: props.data[vi.index] as Row,
    index: vi.index,
    offsetTop: vi.offsetTop,
    height: vi.height,
  }))
})

const resolveRowKey = (row: Row, index: number): string | number => {
  if (typeof props.rowKey === 'function') return props.rowKey(row, index)
  const v = row[props.rowKey as string]
  return (v as string | number) ?? index
}

const resolveCellValue = (row: Row, col: DataGridColumn<Row>): CellValue => {
  if (col.formula) return col.formula(row)
  return row[col.key] as CellValue
}

const isEditableCell = (col: DataGridColumn<Row>, row: Row, rowIndex: number): boolean => {
  if (typeof col.editable === 'function') return col.editable(row, rowIndex)
  return Boolean(col.editable)
}

const handleHeaderClick = (col: DataGridColumn<Row>) => {
  if (!col.sortable) return
  const nextDir: 'asc' | 'desc' =
    props.sortColumn === col.key && props.sortDirection === 'asc' ? 'desc' : 'asc'
  emit('sort', { column: col.key, direction: nextDir })
}

const handleCellClick = (rowIndex: number, colIndex: number) => {
  activeCell.value = { row: rowIndex, col: colIndex }
}

const handleCellDoubleClick = (
  rowIndex: number,
  colIndex: number,
  col: DataGridColumn<Row>,
  row: Row,
) => {
  if (!isEditableCell(col, row, rowIndex)) return
  editingCell.value = { row: rowIndex, col: colIndex }
  draftValue.value = resolveCellValue(row, col)
}

const commitEdit = () => {
  const cell = editingCell.value
  if (!cell) return
  const col = orderedColumns.value[cell.col]
  emit('cell-edit', { rowIndex: cell.row, columnKey: col.key, value: draftValue.value })
  editingCell.value = null
}

const cancelEdit = () => {
  editingCell.value = null
}

const handleEditorKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') commitEdit()
  else if (e.key === 'Escape') cancelEdit()
}

const handleRowClick = (row: Row, rowIndex: number) => {
  emit('row-click', { row, rowIndex })
}
const handleRowDblClick = (row: Row, rowIndex: number) => {
  emit('row-double-click', { row, rowIndex })
}

const toggleRowSelection = (row: Row, rowIndex: number) => {
  const key = resolveRowKey(row, rowIndex)
  const next = new Set(internalSelected.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  internalSelected.value = next
  emit('selected-rows-change', next)
}

const allSelected = computed(() => {
  if (props.data.length === 0) return false
  return props.data.every((row, i) => internalSelected.value.has(resolveRowKey(row, i)))
})

const toggleSelectAll = () => {
  if (allSelected.value) {
    internalSelected.value = new Set()
  } else {
    internalSelected.value = new Set(props.data.map((row, i) => resolveRowKey(row, i)))
  }
  emit('selected-rows-change', internalSelected.value)
}

const summaryRows = computed<DataGridSummaryRow<Row>[]>(() => props.summaryRows ?? [])

defineExpose({
  scrollToRow: scrollToIndex,
  getActiveCell: () => activeCell.value,
  setActiveCell: (pos: CellPosition | null) => {
    activeCell.value = pos
  },
})
</script>

<template>
  <div
    :class="['sg-datagrid', props.className]"
    :style="{
      width: typeof props.width === 'number' ? `${props.width}px` : props.width,
      height: typeof props.height === 'number' ? `${props.height}px` : props.height,
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }"
  >
    <div
      class="sg-datagrid-header"
      :style="{ height: `${props.headerHeight}px`, display: 'flex', flexShrink: 0 }"
    >
      <div
        v-if="props.rowSelection"
        class="sg-datagrid-header-cell sg-datagrid-selection-cell"
        :style="{ width: `${SELECTION_COL_WIDTH}px`, flexShrink: 0 }"
      >
        <input
          type="checkbox"
          :checked="allSelected"
          :aria-label="selectAllRowsLabel"
          @change="toggleSelectAll"
        />
      </div>
      <div
        v-if="props.showRowNumber"
        class="sg-datagrid-header-cell sg-datagrid-row-number-cell"
        :style="{ width: `${ROW_NUMBER_COL_WIDTH}px`, flexShrink: 0 }"
      >
        #
      </div>
      <div
        v-for="(col, ci) in orderedColumns"
        :key="col.key"
        :class="[
          'sg-datagrid-header-cell',
          col.headerClassName,
          col.sortable && 'sg-datagrid-header-cell--sortable',
          props.sortColumn === col.key &&
            props.sortDirection === 'asc' &&
            'sg-datagrid-header-cell--asc',
          props.sortColumn === col.key &&
            props.sortDirection === 'desc' &&
            'sg-datagrid-header-cell--desc',
        ]"
        :style="{
          width: col.width ? `${col.width}px` : '120px',
          minWidth: col.minWidth ? `${col.minWidth}px` : undefined,
          maxWidth: col.maxWidth ? `${col.maxWidth}px` : undefined,
          textAlign: col.align ?? 'left',
        }"
        :data-col-index="ci"
        @click="handleHeaderClick(col)"
      >
        <span>{{ col.title ?? col.key }}</span>
        <span
          v-if="col.sortable && props.sortColumn === col.key"
          class="sg-datagrid-header-cell-sort-indicator"
        >
          {{ props.sortDirection === 'asc' ? '▲' : '▼' }}
        </span>
      </div>
    </div>

    <div
      v-if="props.loading"
      class="sg-datagrid-loading"
      :style="{
        position: 'absolute',
        inset: 0,
        background: 'rgba(255,255,255,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
      }"
    >
      <span>Loading…</span>
    </div>

    <div
      v-if="!props.loading && props.data.length === 0"
      class="sg-datagrid-empty"
      :style="{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }"
    >
      {{ props.emptyText }}
    </div>

    <div
      v-show="props.data.length > 0"
      ref="containerRef"
      class="sg-datagrid-body"
      :style="{ flex: 1, overflowY: 'auto', overflowX: 'auto' }"
    >
      <div :style="{ height: `${totalContentHeight}px`, position: 'relative' }">
        <div
          v-for="entry in visibleRows"
          :key="resolveRowKey(entry.row, entry.index)"
          class="sg-datagrid-row"
          :class="[
            props.striped &&
              (entry.index % 2 === 0 ? 'sg-datagrid-row--even' : 'sg-datagrid-row--odd'),
            props.highlightOnHover && 'sg-datagrid-row--hoverable',
            internalSelected.has(resolveRowKey(entry.row, entry.index)) &&
              'sg-datagrid-row--selected',
          ]"
          :style="{
            position: 'absolute',
            top: `${entry.offsetTop}px`,
            left: 0,
            right: 0,
            height: `${entry.height}px`,
            display: 'flex',
          }"
          :data-row-index="entry.index"
          @click="handleRowClick(entry.row, entry.index)"
          @dblclick="handleRowDblClick(entry.row, entry.index)"
        >
          <div
            v-if="props.rowSelection"
            class="sg-datagrid-cell sg-datagrid-selection-cell"
            :style="{ width: `${SELECTION_COL_WIDTH}px`, flexShrink: 0 }"
          >
            <input
              type="checkbox"
              :checked="internalSelected.has(resolveRowKey(entry.row, entry.index))"
              :aria-label="selectRowLabel"
              @click.stop
              @change="toggleRowSelection(entry.row, entry.index)"
            />
          </div>
          <div
            v-if="props.showRowNumber"
            class="sg-datagrid-cell sg-datagrid-row-number-cell"
            :style="{ width: `${ROW_NUMBER_COL_WIDTH}px`, flexShrink: 0 }"
          >
            {{ entry.index + 1 }}
          </div>
          <div
            v-for="(col, ci) in orderedColumns"
            :key="col.key"
            :class="[
              'sg-datagrid-cell',
              col.className,
              activeCell &&
                activeCell.row === entry.index &&
                activeCell.col === ci &&
                'sg-datagrid-cell--active',
              editingCell &&
                editingCell.row === entry.index &&
                editingCell.col === ci &&
                'sg-datagrid-cell--editing',
            ]"
            :style="{
              width: col.width ? `${col.width}px` : '120px',
              minWidth: col.minWidth ? `${col.minWidth}px` : undefined,
              maxWidth: col.maxWidth ? `${col.maxWidth}px` : undefined,
              textAlign: col.align ?? 'left',
            }"
            :data-row-index="entry.index"
            :data-col-index="ci"
            :data-col-key="col.key"
            @click.stop="handleCellClick(entry.index, ci)"
            @dblclick.stop="handleCellDoubleClick(entry.index, ci, col, entry.row)"
          >
            <input
              v-if="editingCell && editingCell.row === entry.index && editingCell.col === ci"
              :value="draftValue == null ? '' : String(draftValue)"
              autofocus
              :style="{
                width: '100%',
                height: '100%',
                border: 'none',
                outline: 'none',
                padding: '0 8px',
                background: 'transparent',
                font: 'inherit',
              }"
              @input="(e) => (draftValue = (e.target as HTMLInputElement).value)"
              @blur="commitEdit"
              @keydown="handleEditorKeydown"
            />
            <span v-else>{{ resolveCellValue(entry.row, col) ?? '' }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="summaryRows.length > 0" class="sg-datagrid-summary">
      <div
        v-for="(s, si) in summaryRows"
        :key="si"
        class="sg-datagrid-summary-row"
        :class="s.className"
        :style="{ display: 'flex' }"
      >
        <div
          v-if="props.rowSelection"
          class="sg-datagrid-summary-cell"
          :style="{ width: `${SELECTION_COL_WIDTH}px`, flexShrink: 0 }"
        />
        <div
          v-if="props.showRowNumber"
          class="sg-datagrid-summary-cell"
          :style="{ width: `${ROW_NUMBER_COL_WIDTH}px`, flexShrink: 0 }"
        />
        <div
          v-for="col in orderedColumns"
          :key="col.key"
          class="sg-datagrid-summary-cell"
          :style="{
            width: col.width ? `${col.width}px` : '120px',
            textAlign: col.align ?? 'left',
          }"
        >
          {{ s.render(col.key, props.data) ?? '' }}
        </div>
      </div>
    </div>
  </div>
</template>
