<script setup lang="ts">
import { computed } from 'vue'
import { useConfigWithDefaults } from './ConfigProvider.vue'
import type { SizeType } from '../../types'

export interface DescriptionsItem {
  /** Optional stable key. */
  key?: string
  /** Field label. */
  label: string
  /** Value content. */
  value: string
  /** Column span (max `column`). */
  span?: number
}

export interface DescriptionsProps {
  /** Optional heading. */
  title?: string
  /** Rows built from these items. */
  items: DescriptionsItem[]
  /** Renders bordered table. */
  bordered?: boolean
  /** Number of columns per row. @default 3 */
  column?: number
  /** Horizontal or vertical layout. @default 'horizontal' */
  layout?: 'horizontal' | 'vertical'
  /** Append ":" after labels. @default true */
  colon?: boolean
  /** Component size variant. */
  size?: SizeType
  /** Strips built-in styles when true. */
  unstyled?: boolean
}

const props = withDefaults(defineProps<DescriptionsProps>(), {
  bordered: false,
  column: 3,
  layout: 'horizontal',
  colon: true,
})

const { resolvedSize } = useConfigWithDefaults({ size: undefined }, {})
const realSize = computed<SizeType>(() => props.size ?? resolvedSize.value)
const descSize = computed(() => (realSize.value === 'small' ? 'small' : 'default'))

function buildRows(items: DescriptionsItem[], column: number): DescriptionsItem[][] {
  const rows: DescriptionsItem[][] = []
  let currentRow: DescriptionsItem[] = []
  let usedSpan = 0
  for (const item of items) {
    const span = Math.min(item.span ?? 1, column)
    if (usedSpan + span > column) {
      rows.push(currentRow)
      currentRow = []
      usedSpan = 0
    }
    currentRow.push(item)
    usedSpan += span
    if (usedSpan >= column) {
      rows.push(currentRow)
      currentRow = []
      usedSpan = 0
    }
  }
  if (currentRow.length > 0) rows.push(currentRow)
  return rows
}

const rows = computed(() => buildRows(props.items, props.column))

const rootClasses = computed(() =>
  [
    'sg-descriptions',
    `sg-descriptions-${descSize.value}`,
    props.bordered ? 'sg-descriptions-bordered' : '',
  ]
    .filter(Boolean)
    .join(' '),
)
</script>

<template>
  <div v-if="unstyled" role="list">
    <div v-if="title">{{ title }}</div>
    <table>
      <tbody>
        <tr v-for="(row, ri) in rows" :key="ri">
          <template v-for="(item, ci) in row" :key="item.key ?? ci">
            <th>{{ item.label }}{{ colon ? ':' : '' }}</th>
            <td :colspan="item.span">{{ item.value }}</td>
          </template>
        </tr>
      </tbody>
    </table>
  </div>
  <div v-else :class="rootClasses" role="list">
    <div v-if="title" class="sg-descriptions-title">{{ title }}</div>
    <table class="sg-descriptions-table">
      <tbody>
        <template v-for="(row, ri) in rows" :key="ri">
          <template v-if="layout === 'vertical'">
            <tr class="sg-descriptions-row">
              <th
                v-for="(item, ci) in row"
                :key="`label-${item.key ?? ci}`"
                class="sg-descriptions-item-label"
                :colspan="item.span ?? 1"
              >
                {{ item.label }}
                <span v-if="colon" class="sg-descriptions-colon">:</span>
              </th>
            </tr>
            <tr class="sg-descriptions-row">
              <td
                v-for="(item, ci) in row"
                :key="`value-${item.key ?? ci}`"
                class="sg-descriptions-item-content"
                :colspan="item.span ?? 1"
              >
                {{ item.value }}
              </td>
            </tr>
          </template>
          <tr v-else class="sg-descriptions-row">
            <template v-for="(item, ci) in row" :key="item.key ?? ci">
              <th class="sg-descriptions-item-label">
                {{ item.label }}
                <span v-if="colon" class="sg-descriptions-colon">:</span>
              </th>
              <td
                class="sg-descriptions-item-content"
                :colspan="item.span ?? 1"
              >
                {{ item.value }}
              </td>
            </template>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>
