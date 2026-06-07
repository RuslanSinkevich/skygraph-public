<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import SgButton from './Button.vue'
import SgInput from './Input.vue'
import SgCheckbox from './Checkbox.vue'
import SgPagination from './Pagination.vue'

export interface TransferItem {
  key: string
  title: string
  description?: string
  disabled?: boolean
}

export interface TransferLocale {
  itemUnit?: string
  itemsUnit?: string
  searchPlaceholder?: string
  notFoundContent?: string
  selectAll?: string
  deselectAll?: string
}

const DEFAULT_LOCALE: Required<TransferLocale> = {
  itemUnit: 'item',
  itemsUnit: 'items',
  searchPlaceholder: 'Search here',
  notFoundContent: 'Not Found',
  selectAll: 'Select all',
  deselectAll: 'Deselect all',
}

export interface TransferProps {
  /** Source data set. */
  dataSource: TransferItem[]
  /** v-model: keys present in the right-hand pane. */
  modelValue?: string[]
  /** Compat alias for `modelValue`. */
  targetKeys?: string[]
  /** Initial target keys when uncontrolled. */
  defaultTargetKeys?: string[]
  /** Show search input on each pane. */
  showSearch?: boolean
  /**
   * Custom search predicate. When omitted, a case-insensitive title substring
   * match is used. Mirrors the React `filterOption` prop.
   */
  filterOption?: (inputValue: string, item: TransferItem) => boolean
  /** Search input placeholder (overrides locale). */
  searchPlaceholder?: string
  /** Pane titles, [left, right]. */
  titles?: [string, string]
  /** Disables interaction. */
  disabled?: boolean
  /** One-way mode (only left → right). */
  oneWay?: boolean
  /** Show select-all checkbox in the panel header. */
  showSelectAll?: boolean
  /** Shows the `selected/total items` count line. @default true */
  showCount?: boolean
  /** Enable client pagination. */
  pagination?: boolean | { pageSize?: number }
  /** Fixed list body height (px). */
  listHeight?: number
  /** Locale overrides. */
  locale?: TransferLocale
  /** Strips built-in styling. */
  unstyled?: boolean
}

const props = withDefaults(defineProps<TransferProps>(), {
  showSearch: false,
  titles: () => ['Source', 'Target'],
  disabled: false,
  oneWay: false,
  showSelectAll: true,
  showCount: true,
})

const emit = defineEmits<{
  (e: 'update:modelValue', keys: string[]): void
  (e: 'change', keys: string[], direction: 'left' | 'right', moveKeys: string[]): void
  (e: 'selectChange', leftKeys: string[], rightKeys: string[]): void
  (e: 'search', direction: 'left' | 'right', value: string): void
}>()

defineSlots<{
  item(props: { item: TransferItem; side: 'left' | 'right' }): unknown
}>()

const mergedLocale = computed<Required<TransferLocale>>(() => ({
  ...DEFAULT_LOCALE,
  ...(props.locale ?? {}),
}))

const resolvedSearchPlaceholder = computed(
  () => props.searchPlaceholder ?? mergedLocale.value.searchPlaceholder,
)

const internal = ref<string[]>(
  props.modelValue ?? props.targetKeys ?? props.defaultTargetKeys ?? [],
)
watch(
  () => props.modelValue ?? props.targetKeys,
  (v) => {
    if (v !== undefined) internal.value = v
  },
)
const targets = computed(() => props.modelValue ?? props.targetKeys ?? internal.value)

const leftSelected = ref<string[]>([])
const rightSelected = ref<string[]>([])
const leftSearch = ref('')
const rightSearch = ref('')
const leftPage = ref(1)
const rightPage = ref(1)

watch(leftSearch, () => {
  leftPage.value = 1
})
watch(rightSearch, () => {
  rightPage.value = 1
})

const sourceItems = computed(() => props.dataSource.filter((i) => !targets.value.includes(i.key)))
const targetItems = computed(() => props.dataSource.filter((i) => targets.value.includes(i.key)))

function filterItems(items: TransferItem[], q: string): TransferItem[] {
  if (!q) return items
  if (props.filterOption) {
    return items.filter((item) => props.filterOption!(q, item))
  }
  const v = q.toLowerCase()
  return items.filter((i) => i.title.toLowerCase().includes(v))
}

const filteredLeft = computed(() => filterItems(sourceItems.value, leftSearch.value))
const filteredRight = computed(() => filterItems(targetItems.value, rightSearch.value))

function resolvePageSize(): number {
  if (!props.pagination) return Infinity
  if (typeof props.pagination === 'object' && props.pagination.pageSize) {
    return props.pagination.pageSize
  }
  return 10
}

const pageSize = computed(() => resolvePageSize())

function pageSlice(items: TransferItem[], page: number): TransferItem[] {
  if (!props.pagination) return items
  const total = Math.max(1, Math.ceil(items.length / pageSize.value))
  const safe = Math.min(page, total)
  const start = (safe - 1) * pageSize.value
  return items.slice(start, start + pageSize.value)
}

const visibleLeft = computed(() => pageSlice(filteredLeft.value, leftPage.value))
const visibleRight = computed(() => pageSlice(filteredRight.value, rightPage.value))

function countText(items: TransferItem[], selected: string[]): string {
  const count = items.filter((i) => selected.includes(i.key)).length
  const unit = items.length === 1 ? mergedLocale.value.itemUnit : mergedLocale.value.itemsUnit
  return count > 0 ? `${count}/${items.length} ${unit}` : `${items.length} ${unit}`
}

function enabledKeys(items: TransferItem[]): string[] {
  return items.filter((i) => !i.disabled && !props.disabled).map((i) => i.key)
}

function allChecked(items: TransferItem[], selected: string[]): boolean {
  const enabled = enabledKeys(items)
  return enabled.length > 0 && enabled.every((k) => selected.includes(k))
}

function indeterminate(items: TransferItem[], selected: string[]): boolean {
  const enabled = enabledKeys(items)
  const some = enabled.some((k) => selected.includes(k))
  return some && !allChecked(items, selected)
}

function toggleItem(item: TransferItem, side: 'left' | 'right') {
  if (props.disabled || item.disabled) return
  const list = side === 'left' ? leftSelected : rightSelected
  const set = new Set(list.value)
  if (set.has(item.key)) set.delete(item.key)
  else set.add(item.key)
  list.value = Array.from(set)
  emit('selectChange', leftSelected.value, rightSelected.value)
}

function toggleAll(side: 'left' | 'right', checked: boolean) {
  if (props.disabled) return
  const items = side === 'left' ? filteredLeft.value : filteredRight.value
  const list = side === 'left' ? leftSelected : rightSelected
  const enabled = enabledKeys(items)
  if (checked) {
    list.value = Array.from(new Set([...list.value, ...enabled]))
  } else {
    const drop = new Set(enabled)
    list.value = list.value.filter((k) => !drop.has(k))
  }
  emit('selectChange', leftSelected.value, rightSelected.value)
}

function moveRight() {
  const moveKeys = leftSelected.value.filter((k) => {
    const item = props.dataSource.find((i) => i.key === k)
    return item && !item.disabled
  })
  if (moveKeys.length === 0) return
  const next = [...targets.value, ...moveKeys]
  internal.value = next
  emit('update:modelValue', next)
  emit('change', next, 'right', moveKeys)
  leftSelected.value = []
  emit('selectChange', [], rightSelected.value)
}

function moveLeft() {
  if (props.oneWay) return
  const moveKeys = rightSelected.value.filter((k) => {
    const item = props.dataSource.find((i) => i.key === k)
    return item && !item.disabled
  })
  if (moveKeys.length === 0) return
  const moveSet = new Set(moveKeys)
  const next = targets.value.filter((k) => !moveSet.has(k))
  internal.value = next
  emit('update:modelValue', next)
  emit('change', next, 'left', moveKeys)
  rightSelected.value = []
  emit('selectChange', leftSelected.value, [])
}

const canMoveRight = computed(() =>
  leftSelected.value.some((k) => {
    const item = props.dataSource.find((i) => i.key === k)
    return item && !item.disabled
  }),
)
const canMoveLeft = computed(
  () =>
    !props.oneWay &&
    rightSelected.value.some((k) => {
      const item = props.dataSource.find((i) => i.key === k)
      return item && !item.disabled
    }),
)

function onLeftSearch(v: string) {
  leftSearch.value = v
  emit('search', 'left', v)
}
function onRightSearch(v: string) {
  rightSearch.value = v
  emit('search', 'right', v)
}

const wrapperCls = computed(() =>
  props.unstyled
    ? ''
    : ['sg-transfer', props.disabled ? 'sg-transfer-disabled' : ''].filter(Boolean).join(' '),
)

function itemCls(item: TransferItem, selected: string[]): string {
  if (props.unstyled) return ''
  return [
    'sg-transfer-list-item',
    selected.includes(item.key) ? 'sg-transfer-list-item-selected' : '',
    props.disabled || item.disabled ? 'sg-transfer-list-item-disabled' : '',
  ]
    .filter(Boolean)
    .join(' ')
}
</script>

<template>
  <div :class="wrapperCls">
    <!-- Source list -->
    <div :class="unstyled ? '' : 'sg-transfer-list'">
      <div :class="unstyled ? '' : 'sg-transfer-list-header'">
        <SgCheckbox
          v-if="showSelectAll"
          :checked="allChecked(filteredLeft, leftSelected)"
          :indeterminate="indeterminate(filteredLeft, leftSelected)"
          :disabled="disabled || enabledKeys(filteredLeft).length === 0"
          @change="(v: boolean) => toggleAll('left', v)"
        />
        <span v-if="showCount" :class="unstyled ? '' : 'sg-transfer-list-header-count'">
          {{ countText(filteredLeft, leftSelected) }}
        </span>
        <span v-if="titles[0]" :class="unstyled ? '' : 'sg-transfer-list-header-title'">
          {{ titles[0] }}
        </span>
      </div>
      <div v-if="showSearch" :class="unstyled ? '' : 'sg-transfer-list-search'">
        <SgInput
          size="small"
          :model-value="leftSearch"
          :placeholder="resolvedSearchPlaceholder"
          allow-clear
          @update:model-value="onLeftSearch"
        />
      </div>
      <div
        :class="unstyled ? '' : 'sg-transfer-list-body'"
        :style="listHeight ? { height: `${listHeight}px`, overflow: 'auto' } : undefined"
      >
        <div v-if="visibleLeft.length === 0" :class="unstyled ? '' : 'sg-transfer-list-empty'">
          {{ mergedLocale.notFoundContent }}
        </div>
        <ul v-else :class="unstyled ? '' : 'sg-transfer-list-content'">
          <li
            v-for="item in visibleLeft"
            :key="item.key"
            :class="itemCls(item, leftSelected)"
            @click="toggleItem(item, 'left')"
          >
            <SgCheckbox
              :checked="leftSelected.includes(item.key)"
              :disabled="disabled || item.disabled"
              @click.stop
              @change="() => toggleItem(item, 'left')"
            >
              <span :class="unstyled ? '' : 'sg-transfer-list-item-text'">
                <slot name="item" :item="item" side="left">{{ item.title }}</slot>
              </span>
            </SgCheckbox>
          </li>
        </ul>
      </div>
      <div
        v-if="pagination && filteredLeft.length > pageSize"
        :class="unstyled ? '' : 'sg-transfer-list-pagination'"
      >
        <SgPagination
          :current="leftPage"
          :total="filteredLeft.length"
          :page-size="pageSize"
          simple
          @change="(p: number) => (leftPage = p)"
        />
      </div>
    </div>

    <!-- Operations -->
    <div :class="unstyled ? '' : 'sg-transfer-operations'">
      <SgButton type="primary" size="small" :disabled="disabled || !canMoveRight" @click="moveRight"
        >&rsaquo;</SgButton
      >
      <SgButton
        v-if="!oneWay"
        type="primary"
        size="small"
        :disabled="disabled || !canMoveLeft"
        @click="moveLeft"
        >&lsaquo;</SgButton
      >
    </div>

    <!-- Target list -->
    <div :class="unstyled ? '' : 'sg-transfer-list'">
      <div :class="unstyled ? '' : 'sg-transfer-list-header'">
        <SgCheckbox
          v-if="showSelectAll"
          :checked="allChecked(filteredRight, rightSelected)"
          :indeterminate="indeterminate(filteredRight, rightSelected)"
          :disabled="disabled || enabledKeys(filteredRight).length === 0"
          @change="(v: boolean) => toggleAll('right', v)"
        />
        <span v-if="showCount" :class="unstyled ? '' : 'sg-transfer-list-header-count'">
          {{ countText(filteredRight, rightSelected) }}
        </span>
        <span v-if="titles[1]" :class="unstyled ? '' : 'sg-transfer-list-header-title'">
          {{ titles[1] }}
        </span>
      </div>
      <div v-if="showSearch" :class="unstyled ? '' : 'sg-transfer-list-search'">
        <SgInput
          size="small"
          :model-value="rightSearch"
          :placeholder="resolvedSearchPlaceholder"
          allow-clear
          @update:model-value="onRightSearch"
        />
      </div>
      <div
        :class="unstyled ? '' : 'sg-transfer-list-body'"
        :style="listHeight ? { height: `${listHeight}px`, overflow: 'auto' } : undefined"
      >
        <div v-if="visibleRight.length === 0" :class="unstyled ? '' : 'sg-transfer-list-empty'">
          {{ mergedLocale.notFoundContent }}
        </div>
        <ul v-else :class="unstyled ? '' : 'sg-transfer-list-content'">
          <li
            v-for="item in visibleRight"
            :key="item.key"
            :class="itemCls(item, rightSelected)"
            @click="toggleItem(item, 'right')"
          >
            <SgCheckbox
              :checked="rightSelected.includes(item.key)"
              :disabled="disabled || item.disabled"
              @click.stop
              @change="() => toggleItem(item, 'right')"
            >
              <span :class="unstyled ? '' : 'sg-transfer-list-item-text'">
                <slot name="item" :item="item" side="right">{{ item.title }}</slot>
              </span>
            </SgCheckbox>
          </li>
        </ul>
      </div>
      <div
        v-if="pagination && filteredRight.length > pageSize"
        :class="unstyled ? '' : 'sg-transfer-list-pagination'"
      >
        <SgPagination
          :current="rightPage"
          :total="filteredRight.length"
          :page-size="pageSize"
          simple
          @change="(p: number) => (rightPage = p)"
        />
      </div>
    </div>
  </div>
</template>
