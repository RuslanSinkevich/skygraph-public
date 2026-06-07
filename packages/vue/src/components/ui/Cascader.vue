<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type CSSProperties } from 'vue'
import { useConfig } from './ConfigProvider.vue'

/** One node in a cascader tree; children define the next column. */
export interface CascaderOption {
  /** Stable value included in the selected path. */
  value: string | number
  /** Display label for the option row. */
  label: string
  /** Nested options for the next level. */
  children?: CascaderOption[]
  /** When `true`, the option cannot be chosen. */
  disabled?: boolean
  /** When `false`, children may load asynchronously (see `loadData`). */
  isLeaf?: boolean
}

export type CascaderSearchFilter = (inputValue: string, path: CascaderOption[]) => boolean

export interface CascaderProps {
  /** Cascader option tree. */
  options: CascaderOption[]
  /** v-model binding (Vue idiom) — array of values from root to leaf. */
  modelValue?: (string | number)[]
  /** Compat alias for `modelValue`. */
  value?: (string | number)[]
  /** Initial value when uncontrolled. */
  defaultValue?: (string | number)[]
  /** Placeholder text. */
  placeholder?: string
  /** Disables interaction. */
  disabled?: boolean
  /** Show clear control. */
  allowClear?: boolean
  /** Enable search, or pass `{ filter }` for a custom path matcher. */
  showSearch?: boolean | { filter?: CascaderSearchFilter }
  /** Trigger that expands a sub-menu. */
  expandTrigger?: 'click' | 'hover'
  /** Allow selecting any non-leaf option. */
  changeOnSelect?: boolean
  /** Custom display formatter for the single-select trigger. */
  displayRender?: (labels: string[], selectedOptions: CascaderOption[]) => string
  /** Allow several leaf paths as removable tags. */
  multiple?: boolean
  /** Maximum tags shown before a "+N" summary in `multiple` mode. */
  maxTagCount?: number
  /** Load children for a node when `isLeaf: false` and `children` is empty. */
  loadData?: (selectedOptions: CascaderOption[]) => void
  /** Inline styles applied to the dropdown panel (parity with React). */
  dropdownStyle?: CSSProperties
  /** Strips built-in styling. */
  unstyled?: boolean
  /** Size token. */
  size?: 'small' | 'middle' | 'large'
}

const props = withDefaults(defineProps<CascaderProps>(), {
  placeholder: 'Please select',
  disabled: false,
  allowClear: true,
  showSearch: false,
  expandTrigger: 'click',
  changeOnSelect: false,
  multiple: false,
  size: 'middle',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: (string | number)[]): void
  (e: 'change', value: (string | number)[], selectedOptions: CascaderOption[]): void
}>()

const cfg = useConfig()
const clearLabel = computed(() => cfg.value.locale?.cascader?.clear ?? 'Clear')
const removeTagLabel = computed(() => cfg.value.locale?.cascader?.removeTag ?? 'Remove')

function arraysEqual(a: (string | number)[], b: (string | number)[]): boolean {
  if (a.length !== b.length) return false
  return a.every((v, i) => v === b[i])
}

function findOption(opts: CascaderOption[], value: string | number): CascaderOption | undefined {
  return opts.find((o) => o.value === value)
}

function findPath(opts: CascaderOption[], values: (string | number)[]): CascaderOption[] {
  const path: CascaderOption[] = []
  let current = opts
  for (const v of values) {
    const found = findOption(current, v)
    if (!found) break
    path.push(found)
    current = found.children ?? []
  }
  return path
}

function collectAllPaths(
  opts: CascaderOption[],
  leafOnly: boolean,
): { path: CascaderOption[]; values: (string | number)[] }[] {
  const result: { path: CascaderOption[]; values: (string | number)[] }[] = []
  const walk = (level: CascaderOption[], current: CascaderOption[]) => {
    for (const opt of level) {
      if (opt.disabled) continue
      const nextPath = [...current, opt]
      const isLeaf = opt.isLeaf !== false && (!opt.children || opt.children.length === 0)
      if (!leafOnly || isLeaf) {
        result.push({ path: nextPath, values: nextPath.map((o) => o.value) })
      }
      if (opt.children && opt.children.length > 0) walk(opt.children, nextPath)
    }
  }
  walk(opts, [])
  return result
}

function defaultSearchFilter(input: string, path: CascaderOption[]): boolean {
  const lower = input.toLowerCase()
  return path.some((opt) => opt.label.toLowerCase().includes(lower))
}

const internal = ref<(string | number)[]>(
  props.modelValue ?? props.value ?? props.defaultValue ?? [],
)
watch(
  () => props.modelValue ?? props.value,
  (v) => {
    if (v !== undefined) internal.value = v
  },
)
const current = computed(() => props.modelValue ?? props.value ?? internal.value)

const multiValues = ref<(string | number)[][]>(
  props.multiple && (props.modelValue ?? props.value ?? props.defaultValue ?? []).length > 0
    ? [props.modelValue ?? props.value ?? props.defaultValue ?? []]
    : [],
)

const isOpen = ref(false)
const activeColumns = ref<CascaderOption[][]>([props.options])
const activeValues = ref<(string | number)[]>([])
const searchText = ref('')
const loadingValues = ref<Set<string | number>>(new Set())
const wrapperRef = ref<HTMLDivElement | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)

function rebuildColumns(vals: (string | number)[]) {
  const cols: CascaderOption[][] = [props.options]
  let opts: CascaderOption[] = props.options
  const active: (string | number)[] = []
  for (const v of vals) {
    const found = findOption(opts, v)
    if (!found) break
    active.push(v)
    if (found.children && found.children.length > 0) {
      cols.push(found.children)
      opts = found.children
    } else {
      break
    }
  }
  activeColumns.value = cols
  activeValues.value = active
}

watch(isOpen, async (open) => {
  if (!open) return
  rebuildColumns(current.value)
  if (props.showSearch) {
    await nextTick()
    searchInputRef.value?.focus()
  }
})

watch(
  () => props.options,
  () => {
    rebuildColumns(activeValues.value)
  },
)

function commit(values: (string | number)[]) {
  internal.value = values
  emit('update:modelValue', values)
  emit('change', values, findPath(props.options, values))
}

function handleSelect(opt: CascaderOption, colIndex: number) {
  if (opt.disabled) return
  const newActive = [...activeValues.value.slice(0, colIndex), opt.value]
  activeValues.value = newActive
  const newCols = [...activeColumns.value.slice(0, colIndex + 1)]
  if (opt.children && opt.children.length > 0) newCols.push(opt.children)
  activeColumns.value = newCols

  const isLeaf = opt.isLeaf !== false && (!opt.children || opt.children.length === 0)

  if (props.loadData && opt.isLeaf === false && (!opt.children || opt.children.length === 0)) {
    const path = findPath(props.options, newActive)
    loadingValues.value = new Set([...loadingValues.value, opt.value])
    props.loadData(path)
    setTimeout(() => {
      const next = new Set(loadingValues.value)
      next.delete(opt.value)
      loadingValues.value = next
      rebuildColumns(newActive)
    }, 0)
  }

  if (props.multiple) {
    if (isLeaf) {
      const path = findPath(props.options, newActive)
      const exists = multiValues.value.some((mv) => arraysEqual(mv, newActive))
      if (exists) {
        multiValues.value = multiValues.value.filter((mv) => !arraysEqual(mv, newActive))
      } else {
        multiValues.value = [...multiValues.value, newActive]
      }
      emit('change', newActive, path)
    }
    return
  }

  if (isLeaf || props.changeOnSelect) {
    commit(newActive)
    if (isLeaf) {
      isOpen.value = false
      searchText.value = ''
    }
  }
}

function handleHover(opt: CascaderOption, colIndex: number) {
  if (props.expandTrigger !== 'hover' || opt.disabled) return
  const newActive = [...activeValues.value.slice(0, colIndex), opt.value]
  activeValues.value = newActive
  const newCols = [...activeColumns.value.slice(0, colIndex + 1)]
  if (opt.children && opt.children.length > 0) newCols.push(opt.children)
  activeColumns.value = newCols
}

function handleClear(e: MouseEvent) {
  e.stopPropagation()
  if (props.disabled) return
  if (props.multiple) multiValues.value = []
  commit([])
  searchText.value = ''
}

function handleRemoveTag(index: number, e: MouseEvent) {
  e.stopPropagation()
  if (props.disabled) return
  multiValues.value = multiValues.value.filter((_, i) => i !== index)
}

function handleTriggerClick() {
  if (props.disabled) return
  isOpen.value = !isOpen.value
}

function handleOutside(e: MouseEvent) {
  if (wrapperRef.value && !wrapperRef.value.contains(e.target as Node)) {
    isOpen.value = false
    searchText.value = ''
  }
}

onMounted(() => document.addEventListener('mousedown', handleOutside))
onBeforeUnmount(() => document.removeEventListener('mousedown', handleOutside))

const searchFilter = computed<CascaderSearchFilter | null>(() => {
  if (!props.showSearch) return null
  if (typeof props.showSearch === 'object' && props.showSearch.filter) {
    return props.showSearch.filter
  }
  return defaultSearchFilter
})

const searchResults = computed(() => {
  if (!searchText.value || !searchFilter.value) return null
  const all = collectAllPaths(props.options, !props.changeOnSelect)
  return all.filter(({ path }) => searchFilter.value!(searchText.value, path))
})

function handleSearchSelect(values: (string | number)[], path: CascaderOption[]) {
  if (props.multiple) {
    const exists = multiValues.value.some((mv) => arraysEqual(mv, values))
    if (exists) {
      multiValues.value = multiValues.value.filter((mv) => !arraysEqual(mv, values))
    } else {
      multiValues.value = [...multiValues.value, values]
    }
    emit('change', values, path)
  } else {
    commit(values)
    isOpen.value = false
    searchText.value = ''
  }
}

const displayLabel = computed(() => {
  if (props.multiple) return ''
  if (current.value.length === 0) return ''
  const path = findPath(props.options, current.value)
  if (path.length === 0) return ''
  const labels = path.map((o) => o.label)
  if (props.displayRender) return props.displayRender(labels, path)
  return labels.join(' / ')
})

function isMultiChecked(values: (string | number)[]) {
  return multiValues.value.some((mv) => arraysEqual(mv, values))
}

const visibleMulti = computed(() =>
  props.maxTagCount !== undefined && props.multiple
    ? multiValues.value.slice(0, props.maxTagCount)
    : multiValues.value,
)

const hiddenCount = computed(() =>
  props.maxTagCount !== undefined && props.multiple
    ? Math.max(0, multiValues.value.length - props.maxTagCount)
    : 0,
)

const wrapperCls = computed(() =>
  props.unstyled
    ? ''
    : [
        'sg-cascader',
        `sg-cascader-${props.size}`,
        isOpen.value ? 'sg-cascader-open' : '',
        props.disabled ? 'sg-cascader-disabled' : '',
        props.multiple ? 'sg-cascader-multiple' : '',
      ]
        .filter(Boolean)
        .join(' '),
)

function pathLabel(values: (string | number)[]) {
  return findPath(props.options, values)
    .map((o) => o.label)
    .join(' / ')
}
</script>

<template>
  <div ref="wrapperRef" :class="wrapperCls">
    <div
      class="sg-cascader-selector"
      role="combobox"
      :aria-expanded="isOpen"
      :aria-disabled="disabled"
      tabindex="0"
      @click="handleTriggerClick"
    >
      <div class="sg-cascader-selection-wrap">
        <span v-if="!multiple && !displayLabel && !searchText" class="sg-cascader-placeholder">
          {{ placeholder }}
        </span>
        <span v-if="!multiple && displayLabel && !searchText" class="sg-cascader-selection-item">
          {{ displayLabel }}
        </span>
        <span
          v-if="multiple && multiValues.length === 0 && !searchText"
          class="sg-cascader-placeholder"
        >
          {{ placeholder }}
        </span>
        <template v-if="multiple">
          <span v-for="(mv, i) in visibleMulti" :key="mv.join('-') + i" class="sg-cascader-tag">
            <span class="sg-cascader-tag-label">{{ pathLabel(mv) }}</span>
            <span
              class="sg-cascader-tag-close"
              role="button"
              :aria-label="removeTagLabel"
              @click="handleRemoveTag(i, $event)"
              >×</span
            >
          </span>
          <span v-if="hiddenCount > 0" class="sg-cascader-tag sg-cascader-tag-rest">
            +{{ hiddenCount }}...
          </span>
        </template>
        <input
          v-if="showSearch && isOpen"
          ref="searchInputRef"
          v-model="searchText"
          class="sg-cascader-search-input"
          :placeholder="placeholder"
        />
      </div>
      <div class="sg-cascader-actions">
        <span
          v-if="allowClear && (current.length > 0 || multiValues.length > 0)"
          class="sg-cascader-clear"
          role="button"
          :aria-label="clearLabel"
          @click="handleClear"
          >×</span
        >
        <span class="sg-cascader-arrow">{{ isOpen ? '▲' : '▼' }}</span>
      </div>
    </div>
    <div v-if="isOpen" class="sg-cascader-dropdown" :style="dropdownStyle">
      <template v-if="searchResults">
        <div class="sg-cascader-search-list">
          <div
            v-for="{ path, values } in searchResults"
            :key="values.join('-')"
            :class="[
              'sg-cascader-search-item',
              multiple && isMultiChecked(values) ? 'sg-cascader-search-item-checked' : '',
            ]"
            @click="handleSearchSelect(values, path)"
          >
            <span
              v-if="multiple"
              :class="[
                'sg-cascader-search-check',
                isMultiChecked(values) ? 'sg-cascader-search-check-active' : '',
              ]"
              >{{ isMultiChecked(values) ? '✓' : '' }}</span
            >
            <span class="sg-cascader-search-label">
              <template v-for="(opt, i) in path" :key="opt.value">
                <span v-if="i > 0" class="sg-cascader-search-separator"> / </span>
                <span>{{ opt.label }}</span>
              </template>
            </span>
          </div>
          <div v-if="searchResults.length === 0" class="sg-cascader-empty">No matches</div>
        </div>
      </template>
      <template v-else>
        <div class="sg-cascader-columns">
          <ul
            v-for="(col, ci) in activeColumns"
            :key="ci"
            class="sg-cascader-column sg-cascader-menu"
          >
            <li
              v-for="opt in col"
              :key="String(opt.value)"
              :class="[
                'sg-cascader-option sg-cascader-menu-item',
                activeValues[ci] === opt.value
                  ? 'sg-cascader-option-active sg-cascader-menu-item-active'
                  : '',
                opt.disabled ? 'sg-cascader-option-disabled sg-cascader-menu-item-disabled' : '',
                loadingValues.has(opt.value) ? 'sg-cascader-option-loading' : '',
              ]"
              @click="handleSelect(opt, ci)"
              @mouseenter="handleHover(opt, ci)"
            >
              <span
                v-if="multiple"
                :class="[
                  'sg-cascader-option-check',
                  multiValues.some((mv) => mv[ci] === opt.value && mv.length === ci + 1)
                    ? 'sg-cascader-option-check-active'
                    : '',
                ]"
                >{{
                  multiValues.some((mv) => mv[ci] === opt.value && mv.length === ci + 1) ? '✓' : ''
                }}</span
              >
              <span class="sg-cascader-option-label">{{ opt.label }}</span>
              <span
                v-if="loadingValues.has(opt.value)"
                class="sg-cascader-option-expand sg-cascader-option-spinner"
                aria-hidden="true"
                >⟳</span
              >
              <span
                v-else-if="opt.children?.length || opt.isLeaf === false"
                class="sg-cascader-option-expand sg-cascader-menu-item-expand"
                aria-hidden="true"
                >›</span
              >
            </li>
          </ul>
        </div>
      </template>
    </div>
  </div>
</template>
