<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import SgTree from '../complex/Tree/Tree.vue'
import type { TreeKey, TreeNodeData, TreeFieldNames } from '@skygraph/core'

export type { TreeKey, TreeNodeData, TreeFieldNames }

/** Back-compat alias — older Vue demos used the `value`/`label` shape. */
export type TreeSelectNode = TreeNodeData

export type TreeSelectStrategy = 'SHOW_ALL' | 'SHOW_PARENT' | 'SHOW_CHILD'

export interface TreeSelectProps {
  /** Tree nodes to show in the dropdown (`key`/`title` shape — matches React). */
  treeData: TreeNodeData[]
  /** Controlled selected key(s). */
  modelValue?: TreeKey | TreeKey[]
  /** Alias for `modelValue` (mirrors React's `value` prop). */
  value?: TreeKey | TreeKey[]
  /** Initial selected key(s) when uncontrolled. */
  defaultValue?: TreeKey | TreeKey[]
  /** Field-name overrides forwarded to the inner Tree. */
  fieldNames?: TreeFieldNames
  /** Allows selecting multiple leaves without checkboxes. */
  multiple?: boolean
  /** Renders checkboxes on every node with cascade selection. */
  treeCheckable?: boolean
  /** Independent parent/child checks when checkable. */
  treeCheckStrictly?: boolean
  /** Expands every parent on first render. */
  treeDefaultExpandAll?: boolean
  /** Initial expanded keys (overrides `treeDefaultExpandAll`). */
  treeDefaultExpandedKeys?: TreeKey[]
  /** @deprecated Compat alias for `treeDefaultExpandedKeys`. */
  defaultExpandedKeys?: TreeKey[]
  /** Shows search field inside the dropdown. */
  showSearch?: boolean
  /** Optional filter predicate. */
  filterTreeNode?: (inputValue: string, treeNode: TreeNodeData) => boolean
  /** Trigger placeholder. */
  placeholder?: string
  /** Shows clear button. */
  allowClear?: boolean
  /** Disables interaction. */
  disabled?: boolean
  /** Selector size token. */
  size?: 'small' | 'middle' | 'large'
  /** Collapses multiple tags to a “+N” rest indicator. */
  maxTagCount?: number
  /** Inline style on the dropdown panel. */
  dropdownStyle?: Record<string, string | number>
  /** Enables guide lines on the inner Tree. */
  treeLine?: boolean
  /** Which checked keys are surfaced to the trigger when checkable. */
  showCheckedStrategy?: TreeSelectStrategy
  /** Root wrapper class name (additive). */
  className?: string
  /** Strips Skygraph CSS. */
  unstyled?: boolean
}

const props = withDefaults(defineProps<TreeSelectProps>(), {
  multiple: false,
  treeCheckable: false,
  treeCheckStrictly: false,
  treeDefaultExpandAll: false,
  showSearch: false,
  placeholder: 'Please select',
  allowClear: false,
  disabled: false,
  size: 'middle',
  treeLine: false,
  showCheckedStrategy: 'SHOW_ALL',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: TreeKey | TreeKey[]): void
  (
    e: 'change',
    value: TreeKey | TreeKey[],
    label: string[],
    extra: { triggerNode: TreeNodeData },
  ): void
  (e: 'search', value: string): void
}>()

function toArray(val: TreeKey | TreeKey[] | undefined): TreeKey[] {
  if (val === undefined || val === '' || val === null) return []
  return Array.isArray(val) ? val : [val]
}

function findNode(nodes: TreeNodeData[], key: TreeKey): TreeNodeData | undefined {
  for (const n of nodes) {
    if (n.key === key) return n
    if (n.children) {
      const found = findNode(n.children, key)
      if (found) return found
    }
  }
  return undefined
}

function getNodeLabel(node: TreeNodeData | undefined): string {
  if (!node) return ''
  return typeof node.title === 'string' ? node.title : String(node.key)
}

function collectAllKeys(nodes: TreeNodeData[]): TreeKey[] {
  const keys: TreeKey[] = []
  const walk = (list: TreeNodeData[]) => {
    for (const n of list) {
      keys.push(n.key)
      if (n.children) walk(n.children)
    }
  }
  walk(nodes)
  return keys
}

function collectAllParentKeys(nodes: TreeNodeData[]): TreeKey[] {
  const keys: TreeKey[] = []
  const walk = (list: TreeNodeData[]) => {
    for (const n of list) {
      if (n.children && n.children.length > 0) {
        keys.push(n.key)
        walk(n.children)
      }
    }
  }
  walk(nodes)
  return keys
}

function filterTreeKeepMatches(
  nodes: TreeNodeData[],
  predicate: (node: TreeNodeData) => boolean,
): TreeNodeData[] {
  const result: TreeNodeData[] = []
  for (const node of nodes) {
    const childResult = node.children ? filterTreeKeepMatches(node.children, predicate) : []
    if (predicate(node) || childResult.length > 0) {
      result.push({
        ...node,
        children: childResult.length > 0 ? childResult : undefined,
      })
    }
  }
  return result
}

function getParentKeys(nodes: TreeNodeData[], targetKey: TreeKey): TreeKey[] {
  const parents: TreeKey[] = []
  const walk = (list: TreeNodeData[], path: TreeKey[]): boolean => {
    for (const n of list) {
      if (n.key === targetKey) {
        parents.push(...path)
        return true
      }
      if (n.children && walk(n.children, [...path, n.key])) return true
    }
    return false
  }
  walk(nodes, [])
  return parents
}

function applyStrategy(
  checkedKeys: TreeKey[],
  treeData: TreeNodeData[],
  strategy: TreeSelectStrategy,
): TreeKey[] {
  if (strategy === 'SHOW_ALL') return checkedKeys
  const checkedSet = new Set(checkedKeys)
  if (strategy === 'SHOW_CHILD') {
    return checkedKeys.filter((key) => {
      const node = findNode(treeData, key)
      return !node?.children || node.children.length === 0
    })
  }
  if (strategy === 'SHOW_PARENT') {
    return checkedKeys.filter((key) => {
      const parents = getParentKeys(treeData, key)
      return !parents.some((pk) => checkedSet.has(pk))
    })
  }
  return checkedKeys
}

const isMultiple = computed(() => props.multiple || props.treeCheckable)

const incoming = computed<TreeKey | TreeKey[] | undefined>(() => props.modelValue ?? props.value)

const internal = ref<TreeKey[]>(toArray(incoming.value ?? props.defaultValue))

watch(incoming, (v) => {
  if (v !== undefined) internal.value = toArray(v)
})

const currentValue = computed<TreeKey[]>(() =>
  incoming.value !== undefined ? toArray(incoming.value) : internal.value,
)

const open = ref(false)
const searchValue = ref('')
const wrapperRef = useTemplateRef<HTMLDivElement>('wrapperRef')
const searchRef = useTemplateRef<HTMLInputElement>('searchRef')

const defaultFilter = (input: string, node: TreeNodeData): boolean => {
  const title = (typeof node.title === 'string' ? node.title : String(node.key)).toLowerCase()
  return title.includes(input.toLowerCase())
}

const filterFn = computed(() => props.filterTreeNode ?? defaultFilter)

const filteredTreeData = computed<TreeNodeData[]>(() =>
  searchValue.value
    ? filterTreeKeepMatches(props.treeData, (n) => filterFn.value(searchValue.value, n))
    : props.treeData,
)

const filteredExpandedKeys = computed<TreeKey[] | undefined>(() =>
  searchValue.value ? collectAllKeys(filteredTreeData.value) : undefined,
)

const initialExpandedKeys = computed<TreeKey[] | undefined>(() => {
  if (props.treeDefaultExpandedKeys && props.treeDefaultExpandedKeys.length > 0)
    return props.treeDefaultExpandedKeys
  if (props.defaultExpandedKeys && props.defaultExpandedKeys.length > 0)
    return props.defaultExpandedKeys
  if (props.treeDefaultExpandAll) return collectAllParentKeys(props.treeData)
  return undefined
})

const treeCheckedKeys = computed<TreeKey[] | undefined>(() =>
  props.treeCheckable ? currentValue.value : undefined,
)

const treeSelectedKeys = computed<TreeKey[] | undefined>(() =>
  props.treeCheckable ? undefined : currentValue.value,
)

const displayedValues = computed<TreeKey[]>(() => {
  if (!isMultiple.value) return currentValue.value
  return applyStrategy(currentValue.value, props.treeData, props.showCheckedStrategy)
})

const visibleTags = computed(() =>
  props.maxTagCount !== undefined && isMultiple.value
    ? displayedValues.value.slice(0, props.maxTagCount)
    : displayedValues.value,
)

const hiddenCount = computed(() =>
  props.maxTagCount !== undefined && isMultiple.value
    ? Math.max(0, displayedValues.value.length - props.maxTagCount)
    : 0,
)

function fireChange(keys: TreeKey[], triggerNode: TreeNodeData) {
  internal.value = keys
  const labels = keys.map((k) => getNodeLabel(findNode(props.treeData, k)))
  const next: TreeKey | TreeKey[] = isMultiple.value ? keys : (keys[0] ?? '')
  emit('update:modelValue', next)
  emit('change', next, labels, { triggerNode })
}

function handleTreeSelect(
  _keys: TreeKey[],
  info: { selected: boolean; node: TreeNodeData; selectedNodes: TreeNodeData[] },
) {
  if (props.treeCheckable) return
  const node = info.node
  if (isMultiple.value) {
    const newKeys = info.selected
      ? [...currentValue.value, node.key]
      : currentValue.value.filter((k) => k !== node.key)
    fireChange(newKeys, node)
  } else {
    fireChange([node.key], node)
    open.value = false
    searchValue.value = ''
  }
}

function handleTreeCheck(
  checkedKeys: TreeKey[],
  info: {
    checked: boolean
    node: TreeNodeData
    checkedNodes: TreeNodeData[]
    halfCheckedKeys: TreeKey[]
  },
) {
  const displayed = applyStrategy(checkedKeys, props.treeData, props.showCheckedStrategy)
  fireChange(displayed, info.node)
}

function handleRemoveTag(key: TreeKey, e: MouseEvent) {
  e.stopPropagation()
  if (props.disabled) return
  const node = findNode(props.treeData, key) ?? ({ key } as TreeNodeData)
  const newKeys = currentValue.value.filter((k) => k !== key)
  fireChange(newKeys, node)
}

function handleClear(e: MouseEvent) {
  e.stopPropagation()
  if (props.disabled) return
  const node = props.treeData[0] ?? ({ key: '' } as TreeNodeData)
  fireChange([], node)
  searchValue.value = ''
}

function handleSearchInput(e: Event) {
  const v = (e.target as HTMLInputElement).value
  searchValue.value = v
  emit('search', v)
}

function handleTriggerClick() {
  if (props.disabled) return
  open.value = !open.value
}

function handleOutside(e: MouseEvent) {
  if (!wrapperRef.value) return
  if (!wrapperRef.value.contains(e.target as Node)) {
    open.value = false
    searchValue.value = ''
  }
}

onMounted(() => document.addEventListener('mousedown', handleOutside))
onBeforeUnmount(() => document.removeEventListener('mousedown', handleOutside))

watch(open, (next) => {
  if (next && props.showSearch) {
    void nextTick(() => searchRef.value?.focus())
  }
})

const wrapperCls = computed(() => {
  if (props.unstyled) return props.className ?? ''
  return [
    'sg-treeselect',
    `sg-treeselect-${props.size}`,
    open.value ? 'sg-treeselect-open' : '',
    props.disabled ? 'sg-treeselect-disabled' : '',
    isMultiple.value ? 'sg-treeselect-multiple' : '',
    props.className,
  ]
    .filter(Boolean)
    .join(' ')
})

function labelFor(key: TreeKey): string {
  return getNodeLabel(findNode(props.treeData, key))
}
</script>

<template>
  <div ref="wrapperRef" :class="wrapperCls">
    <template v-if="unstyled">
      <div @click="handleTriggerClick">
        <span v-if="displayedValues.length === 0">{{ placeholder }}</span>
        <span v-else-if="!isMultiple">{{ labelFor(displayedValues[0]) }}</span>
        <template v-else>
          <span v-for="key in displayedValues" :key="String(key)">
            {{ labelFor(key) }}
            <span @click="(e) => handleRemoveTag(key, e)">&times;</span>
          </span>
        </template>
      </div>
      <div v-if="open">
        <input
          v-if="showSearch"
          ref="searchRef"
          :value="searchValue"
          :placeholder="placeholder"
          @input="handleSearchInput"
        />
        <SgTree
          :tree-data="filteredTreeData"
          :field-names="fieldNames"
          :checkable="treeCheckable"
          :check-strictly="treeCheckStrictly"
          :checked-keys="treeCheckedKeys"
          :selected-keys="treeSelectedKeys"
          :multiple="isMultiple"
          :default-expand-all="treeDefaultExpandAll && !initialExpandedKeys"
          :default-expanded-keys="initialExpandedKeys"
          :expanded-keys="filteredExpandedKeys"
          :show-line="treeLine"
          unstyled
          @select="handleTreeSelect"
          @check="handleTreeCheck"
        />
      </div>
    </template>

    <template v-else>
      <div class="sg-treeselect-selector" @click="handleTriggerClick">
        <div class="sg-treeselect-selection-wrap">
          <span
            v-if="displayedValues.length === 0 && !searchValue"
            class="sg-treeselect-placeholder"
            >{{ placeholder }}</span
          >

          <span
            v-if="!isMultiple && displayedValues.length > 0 && !searchValue"
            class="sg-treeselect-selection-item"
            >{{ labelFor(displayedValues[0]) }}</span
          >

          <template v-if="isMultiple">
            <span v-for="key in visibleTags" :key="String(key)" class="sg-treeselect-tag">
              <span class="sg-treeselect-tag-label">{{ labelFor(key) }}</span>
              <span class="sg-treeselect-tag-close" @click="(e) => handleRemoveTag(key, e)"
                >&times;</span
              >
            </span>
          </template>

          <span v-if="hiddenCount > 0" class="sg-treeselect-tag sg-treeselect-tag-rest"
            >+{{ hiddenCount }}...</span
          >

          <input
            v-if="showSearch && open"
            ref="searchRef"
            class="sg-treeselect-search-input"
            :value="searchValue"
            @input="handleSearchInput"
          />
        </div>

        <div class="sg-treeselect-actions">
          <span
            v-if="allowClear && displayedValues.length > 0"
            class="sg-treeselect-clear"
            @click="handleClear"
            >&times;</span
          >
          <span class="sg-treeselect-arrow">{{ open ? '\u25B2' : '\u25BC' }}</span>
        </div>
      </div>

      <div v-if="open" class="sg-treeselect-dropdown" :style="dropdownStyle">
        <div v-if="filteredTreeData.length === 0" class="sg-treeselect-empty">No matches</div>
        <SgTree
          v-else
          :tree-data="filteredTreeData"
          :field-names="fieldNames"
          :checkable="treeCheckable"
          :check-strictly="treeCheckStrictly"
          :checked-keys="treeCheckedKeys"
          :selected-keys="treeSelectedKeys"
          :multiple="isMultiple"
          :default-expand-all="treeDefaultExpandAll && !initialExpandedKeys"
          :default-expanded-keys="initialExpandedKeys"
          :expanded-keys="filteredExpandedKeys"
          :show-line="treeLine"
          @select="handleTreeSelect"
          @check="handleTreeCheck"
        />
      </div>
    </template>
  </div>
</template>
