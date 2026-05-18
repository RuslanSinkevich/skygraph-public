<script setup lang="ts">
import { computed, ref, watch, onMounted, useTemplateRef } from 'vue'
import { useTree } from '../../../composables/useTree'
import TreeNodeRow from './TreeNodeRow.vue'
import {
  DEFAULT_INDENT,
  DEFAULT_TREE_LOCALE,
  NODE_HEIGHT,
  type TreeProps,
  type TreeKey,
  type TreeNodeData,
  type ExpandInfo,
  type CheckInfo,
  type SelectInfo,
  type DragInfo,
  type DropInfo,
} from './types'

const props = withDefaults(defineProps<TreeProps>(), {
  checkable: false,
  checkStrictly: false,
  selectable: true,
  multiple: false,
  defaultExpandAll: false,
  autoExpandParent: false,
  draggable: false,
  blockNode: false,
  virtual: true,
  disabled: false,
  indentSize: DEFAULT_INDENT,
  directory: false,
  showSearch: false,
  defaultSearchValue: '',
  highlightSearch: true,
  keyboard: true,
  showToolbar: false,
  animated: true,
  autoFocus: false,
  unstyled: false,
})

const emit = defineEmits<{
  (e: 'check', keys: TreeKey[], info: CheckInfo): void
  (e: 'select', keys: TreeKey[], info: SelectInfo): void
  (e: 'expand', keys: TreeKey[], info: ExpandInfo): void
  (e: 'search', value: string): void
  (e: 'dragStart', info: DragInfo): void
  (e: 'dragOver', info: DragInfo): void
  (e: 'dragLeave', info: DragInfo): void
  (e: 'dragEnd', info: DragInfo): void
  (e: 'drop', info: DropInfo): void
  (e: 'rightClick', info: { event: MouseEvent; node: TreeNodeData }): void
  (e: 'focus', key: TreeKey): void
  (e: 'update:expandedKeys', keys: TreeKey[]): void
  (e: 'update:checkedKeys', keys: TreeKey[]): void
  (e: 'update:selectedKeys', keys: TreeKey[]): void
  (e: 'update:searchValue', value: string): void
  (e: 'edit', info: import('./types').EditInfo): void
  (e: 'editCancel', key: TreeKey): void
}>()

const localeFull = computed(() => ({ ...DEFAULT_TREE_LOCALE, ...props.locale }))

const {
  tree,
  treeState,
  flatNodes,
  toggleExpand,
  setExpandedKeys,
  expandAll,
  collapseAll,
  toggleCheck,
  setCheckedKeys,
  select: selectKey,
  setSelectedKeys,
  markLoading,
  markLoaded,
  moveNode,
  filterNodes,
  refresh,
} = useTree({
  data: props.treeData,
  fieldNames: props.fieldNames,
  checkStrictly: props.checkStrictly,
  defaultExpandAll: props.defaultExpandAll,
  defaultExpandedKeys: props.defaultExpandedKeys,
  defaultCheckedKeys: props.defaultCheckedKeys,
  defaultSelectedKeys: props.defaultSelectedKeys,
})

// Keep tree data in sync with prop changes
watch(
  () => props.treeData,
  (next, prev) => {
    if (next === prev) return
    tree.setData(next)
    refresh()
  },
)

watch(
  () => props.expandedKeys,
  (next) => {
    if (next !== undefined) setExpandedKeys(next)
  },
)
watch(
  () => props.checkedKeys,
  (next) => {
    if (next !== undefined) setCheckedKeys(next)
  },
)
watch(
  () => props.selectedKeys,
  (next) => {
    if (next !== undefined) setSelectedKeys(next)
  },
)

const internalSearchValue = ref(props.defaultSearchValue)
const searchValue = computed(() => props.searchValue ?? internalSearchValue.value)

function applySearch(value: string) {
  if (props.searchValue === undefined) {
    internalSearchValue.value = value
  }
  emit('search', value)
  emit('update:searchValue', value)

  if (!value) {
    filterNodes(null)
    return
  }
  const predicate = props.filterTreeNode
    ? (node: TreeNodeData) => props.filterTreeNode!(node, value)
    : (node: TreeNodeData) => {
        const title = String(node.title ?? '')
        return title.toLowerCase().includes(value.toLowerCase())
      }
  filterNodes(predicate)

  if (props.autoExpandParent) {
    const filtered = tree.getFilteredKeys()
    if (filtered) setExpandedKeys(filtered)
  }
}

watch(
  () => props.searchValue,
  (next) => {
    if (next !== undefined && next !== internalSearchValue.value) {
      applySearch(next)
    }
  },
)

const focusedKeyInternal = ref<TreeKey | null>(null)
const focusedKey = computed(() => focusedKeyInternal.value)

function setFocusedKey(key: TreeKey | null) {
  focusedKeyInternal.value = key
  if (key !== null) emit('focus', key)
}

onMounted(() => {
  if (props.autoFocus && flatNodes.value.length > 0 && focusedKeyInternal.value === null) {
    setFocusedKey(flatNodes.value[0].key)
  }
})

const dragKey = ref<TreeKey | null>(null)
const dropKey = ref<TreeKey | null>(null)
const dropPosition = ref<-1 | 0 | 1>(0)

function handleExpand(key: TreeKey) {
  toggleExpand(key)
  const node = tree.getNode(key)
  if (!node) return
  const newKeys = tree.getState().expandedKeys
  emit('expand', newKeys, { expanded: newKeys.includes(key), node })
  emit('update:expandedKeys', newKeys)
}

function handleCheck(key: TreeKey) {
  toggleCheck(key)
  const node = tree.getNode(key)
  if (!node) return
  const state = tree.getState()
  const checkedNodes = state.checkedKeys
    .map((ck) => tree.getNode(ck))
    .filter(Boolean) as TreeNodeData[]
  emit('check', state.checkedKeys, {
    checked: state.checkedKeys.includes(key),
    node,
    checkedNodes,
    halfCheckedKeys: state.halfCheckedKeys,
  })
  emit('update:checkedKeys', state.checkedKeys)
}

function handleSelect(key: TreeKey) {
  selectKey(key, props.multiple)
  const node = tree.getNode(key)
  if (!node) return
  const state = tree.getState()
  const selectedNodes = state.selectedKeys
    .map((sk) => tree.getNode(sk))
    .filter(Boolean) as TreeNodeData[]
  emit('select', state.selectedKeys, {
    selected: state.selectedKeys.includes(key),
    node,
    selectedNodes,
  })
  emit('update:selectedKeys', state.selectedKeys)
}

function handleLoadData(node: TreeNodeData) {
  if (!props.loadData) return
  const key = node.key
  if (treeState.value.loadedKeys.includes(key) || treeState.value.loadingKeys.includes(key)) return
  markLoading(key)
  void props.loadData(node).then(() => {
    markLoaded(key)
  })
}

function handleDragStart(e: DragEvent, key: TreeKey) {
  dragKey.value = key
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
  const node = tree.getNode(key)
  if (node) emit('dragStart', { event: e, node })
}

function handleDragOver(e: DragEvent, key: TreeKey) {
  e.preventDefault()
  dropKey.value = key
  const target = e.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const y = e.clientY - rect.top
  const h = rect.height
  let pos: -1 | 0 | 1 = 0
  if (y < h * 0.25) pos = -1
  else if (y > h * 0.75) pos = 1
  dropPosition.value = pos
  const node = tree.getNode(key)
  if (node) emit('dragOver', { event: e, node })
}

function handleDragLeave(e: DragEvent, key: TreeKey) {
  dropKey.value = null
  const node = tree.getNode(key)
  if (node) emit('dragLeave', { event: e, node })
}

function handleDragEnd(e: DragEvent, key: TreeKey) {
  dragKey.value = null
  dropKey.value = null
  const node = tree.getNode(key)
  if (node) emit('dragEnd', { event: e, node })
}

function handleDrop(e: DragEvent, key: TreeKey) {
  e.preventDefault()
  if (dragKey.value === null || dragKey.value === key) {
    dragKey.value = null
    dropKey.value = null
    return
  }
  const dragNode = tree.getNode(dragKey.value)
  const dropNode = tree.getNode(key)
  if (!dragNode || !dropNode) return

  if (
    props.allowDrop &&
    !props.allowDrop({ dragNode, dropNode, dropPosition: dropPosition.value })
  ) {
    dragKey.value = null
    dropKey.value = null
    return
  }

  moveNode(dragKey.value, key, dropPosition.value)
  emit('drop', { event: e, node: dropNode, dragNode, dropPosition: dropPosition.value })

  dragKey.value = null
  dropKey.value = null
}

function handleRightClick(evt: MouseEvent, node: TreeNodeData) {
  emit('rightClick', { event: evt, node })
}

function isDraggable(node: TreeNodeData): boolean {
  if (typeof props.draggable === 'function') return props.draggable(node)
  return !!props.draggable
}

function isEditable(node: TreeNodeData): boolean {
  if (typeof props.editable === 'function') return props.editable(node)
  return !!props.editable
}

function nodeStatusFor(node: TreeNodeData): import('./types').TreeNodeStatus | undefined {
  return props.nodeStatus ? props.nodeStatus(node) : undefined
}

function handleEdit(key: TreeKey, value: string, oldValue: string) {
  const node = tree.getNode(key)
  if (!node) return
  emit('edit', { key, node, value, oldValue })
}

function handleEditCancel(key: TreeKey) {
  emit('editCancel', key)
}

const containerRef = useTemplateRef<HTMLDivElement>('containerEl')
const treeRef = useTemplateRef<HTMLDivElement>('treeEl')
const scrollTop = ref(0)
const itemHeight = NODE_HEIGHT

function scrollToFocused(key: TreeKey) {
  const index = flatNodes.value.findIndex((item) => item.key === key)
  if (index === -1) return
  const el = containerRef.value ?? treeRef.value
  if (!el) return
  const targetTop = index * itemHeight
  const { scrollTop: st, clientHeight: ch } = el
  if (targetTop < st) {
    el.scrollTop = targetTop
  } else if (targetTop + itemHeight > st + ch) {
    el.scrollTop = targetTop + itemHeight - ch
  }
}

function focusNode(index: number) {
  if (index >= 0 && index < flatNodes.value.length) {
    const key = flatNodes.value[index].key
    setFocusedKey(key)
    scrollToFocused(key)
  }
}

function handleKeyDown(e: KeyboardEvent) {
  if (!props.keyboard || props.disabled) return
  const flat = flatNodes.value
  const currentIndex = flat.findIndex((item) => item.key === focusedKey.value)
  if (currentIndex === -1 && flat.length === 0) return

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      focusNode(currentIndex === -1 ? 0 : Math.min(currentIndex + 1, flat.length - 1))
      break
    case 'ArrowUp':
      e.preventDefault()
      focusNode(currentIndex === -1 ? 0 : Math.max(currentIndex - 1, 0))
      break
    case 'ArrowRight': {
      e.preventDefault()
      if (currentIndex === -1) break
      const item = flat[currentIndex]
      if (!item.isLeaf && !treeState.value.expandedKeys.includes(item.key)) {
        handleExpand(item.key)
      } else if (!item.isLeaf && treeState.value.expandedKeys.includes(item.key)) {
        focusNode(currentIndex + 1)
      }
      break
    }
    case 'ArrowLeft': {
      e.preventDefault()
      if (currentIndex === -1) break
      const item = flat[currentIndex]
      if (!item.isLeaf && treeState.value.expandedKeys.includes(item.key)) {
        handleExpand(item.key)
      } else if (item.parentKey !== null && item.parentKey !== undefined) {
        const parentIndex = flat.findIndex((n) => n.key === item.parentKey)
        if (parentIndex !== -1) focusNode(parentIndex)
      }
      break
    }
    case 'Home':
      e.preventDefault()
      focusNode(0)
      break
    case 'End':
      e.preventDefault()
      focusNode(flat.length - 1)
      break
    case 'Enter': {
      e.preventDefault()
      if (currentIndex === -1) break
      const item = flat[currentIndex]
      if (props.selectable) handleSelect(item.key)
      break
    }
    case ' ': {
      e.preventDefault()
      if (currentIndex === -1) break
      const item = flat[currentIndex]
      if (props.checkable) handleCheck(item.key)
      else if (!item.isLeaf) handleExpand(item.key)
      break
    }
    case '*':
      e.preventDefault()
      expandAll()
      break
  }
}

function handleScroll() {
  if (containerRef.value) {
    scrollTop.value = containerRef.value.scrollTop
  }
}

const useVirtual = computed(
  () => props.virtual && props.height !== undefined && flatNodes.value.length > 50,
)

const VIRTUAL_OVERSCAN = 5

const visibleSlice = computed<{ nodes: typeof flatNodes.value; startIndex: number }>(() => {
  if (!useVirtual.value || !props.height) {
    return { nodes: flatNodes.value, startIndex: 0 }
  }
  const rawStart = Math.floor(scrollTop.value / itemHeight)
  const startIndex = Math.max(0, rawStart - VIRTUAL_OVERSCAN)
  const visibleCount = Math.ceil(props.height / itemHeight) + VIRTUAL_OVERSCAN * 2
  const endIndex = Math.min(flatNodes.value.length, startIndex + visibleCount)
  return { nodes: flatNodes.value.slice(startIndex, endIndex), startIndex }
})

const virtualOffset = computed(() => visibleSlice.value.startIndex * itemHeight)
const totalHeight = computed(() => flatNodes.value.length * itemHeight)
const virtualBottomPad = computed(() =>
  Math.max(
    0,
    totalHeight.value - virtualOffset.value - visibleSlice.value.nodes.length * itemHeight,
  ),
)

watch(
  () => props.scrollToKey,
  (key) => {
    if (key === undefined) return
    const exists = flatNodes.value.findIndex((item) => item.key === key)
    if (exists !== -1) {
      scrollToFocused(key)
      setFocusedKey(key)
    }
  },
)

function handleExpandAll() {
  expandAll()
  emit('expand', tree.getState().expandedKeys, {
    expanded: true,
    node: props.treeData[0],
  })
}

function handleCollapseAll() {
  collapseAll()
  emit('expand', [], { expanded: false, node: props.treeData[0] })
}

function handleCheckAll() {
  const keys = tree.getAllKeys()
  setCheckedKeys(keys)
  const nodes = keys.map((k) => tree.getNode(k)).filter(Boolean) as TreeNodeData[]
  emit('check', keys, { checked: true, node: nodes[0], checkedNodes: nodes, halfCheckedKeys: [] })
}

function handleUncheckAll() {
  setCheckedKeys([])
  emit('check', [], {
    checked: false,
    node: props.treeData[0],
    checkedNodes: [],
    halfCheckedKeys: [],
  })
}

const wrapperClass = computed(() => {
  if (props.unstyled) return ''
  return [
    'sg-tree',
    props.blockNode ? 'sg-tree-block-node' : '',
    props.directory ? 'sg-tree-directory' : '',
    props.disabled ? 'sg-tree-disabled' : '',
    props.animated ? 'sg-tree-animated' : '',
    props.showLine ? 'sg-tree-show-line' : '',
  ]
    .filter(Boolean)
    .join(' ')
})

defineExpose({
  expandAll: handleExpandAll,
  collapseAll: handleCollapseAll,
  checkAll: handleCheckAll,
  uncheckAll: handleUncheckAll,
  scrollToKey: scrollToFocused,
})
</script>

<template>
  <div :class="wrapperClass || undefined" role="tree">
    <div v-if="showSearch" class="sg-tree-search">
      <input
        class="sg-tree-search-input"
        type="text"
        :value="searchValue"
        :placeholder="localeFull.searchPlaceholder"
        :aria-label="localeFull.searchPlaceholder"
        @input="(e: Event) => applySearch((e.target as HTMLInputElement).value)"
      />
      <button
        v-if="searchValue"
        type="button"
        class="sg-tree-search-clear"
        aria-label="Clear search"
        @click="applySearch('')"
      >
        ×
      </button>
    </div>

    <div v-if="showToolbar" class="sg-tree-toolbar">
      <div class="sg-tree-toolbar-actions">
        <button
          type="button"
          class="sg-tree-toolbar-btn"
          :title="localeFull.expandAllText"
          @click="handleExpandAll"
        >
          ⊞
        </button>
        <button
          type="button"
          class="sg-tree-toolbar-btn"
          :title="localeFull.collapseAllText"
          @click="handleCollapseAll"
        >
          ⊟
        </button>
        <template v-if="checkable">
          <span class="sg-tree-toolbar-divider" />
          <button
            type="button"
            class="sg-tree-toolbar-btn"
            :title="localeFull.checkAllText"
            @click="handleCheckAll"
          >
            ☑
          </button>
          <button
            type="button"
            class="sg-tree-toolbar-btn"
            :title="localeFull.uncheckAllText"
            @click="handleUncheckAll"
          >
            ☐
          </button>
        </template>
      </div>
    </div>

    <div v-if="flatNodes.length === 0" class="sg-tree-empty">{{ localeFull.emptyText }}</div>

    <div
      v-else-if="useVirtual && height"
      ref="containerEl"
      class="sg-tree-virtual-container"
      :style="{ height: `${height}px`, overflow: 'auto' }"
      tabindex="0"
      role="tree"
      @scroll="handleScroll"
      @keydown="handleKeyDown"
    >
      <div
        :style="{
          paddingTop: `${virtualOffset}px`,
          paddingBottom: `${virtualBottomPad}px`,
          boxSizing: 'border-box',
        }"
      >
        <TreeNodeRow
          v-for="item in visibleSlice.nodes"
          :key="item.key"
          :node="item.node"
          :node-key="item.key"
          :depth="item.depth"
          :is-leaf="item.isLeaf"
          :indent-size="indentSize"
          :expanded="treeState.expandedKeys.includes(item.key)"
          :checked="treeState.checkedKeys.includes(item.key)"
          :half-checked="treeState.halfCheckedKeys.includes(item.key)"
          :selected="treeState.selectedKeys.includes(item.key)"
          :loading="treeState.loadingKeys.includes(item.key)"
          :disabled="disabled || !!item.node.disabled"
          :focused="focusedKey === item.key"
          :checkable="checkable"
          :selectable="selectable"
          :block-node="blockNode"
          :directory="directory"
          :animated="animated"
          :draggable="isDraggable(item.node)"
          :drop-position="dropKey === item.key ? dropPosition : null"
          :drag-key="dragKey"
          :search-value="highlightSearch ? searchValue : ''"
          :t="localeFull"
          :status="nodeStatusFor(item.node)"
          :actions="actions"
          :editable="isEditable(item.node)"
          :unstyled="unstyled"
          @expand="handleExpand"
          @check="handleCheck"
          @select="handleSelect"
          @drag-start="handleDragStart"
          @drag-over="handleDragOver"
          @drag-leave="handleDragLeave"
          @drag-end="handleDragEnd"
          @drop="handleDrop"
          @right-click="handleRightClick"
          @load-data="handleLoadData"
          @focus-node="setFocusedKey"
          @edit="handleEdit"
          @edit-cancel="handleEditCancel"
        />
      </div>
    </div>

    <div v-else ref="treeEl" tabindex="0" role="tree" @keydown="handleKeyDown">
      <TreeNodeRow
        v-for="item in flatNodes"
        :key="item.key"
        :node="item.node"
        :node-key="item.key"
        :depth="item.depth"
        :is-leaf="item.isLeaf"
        :indent-size="indentSize"
        :expanded="treeState.expandedKeys.includes(item.key)"
        :checked="treeState.checkedKeys.includes(item.key)"
        :half-checked="treeState.halfCheckedKeys.includes(item.key)"
        :selected="treeState.selectedKeys.includes(item.key)"
        :loading="treeState.loadingKeys.includes(item.key)"
        :disabled="disabled || !!item.node.disabled"
        :focused="focusedKey === item.key"
        :checkable="checkable"
        :selectable="selectable"
        :block-node="blockNode"
        :directory="directory"
        :animated="animated"
        :draggable="isDraggable(item.node)"
        :drop-position="dropKey === item.key ? dropPosition : null"
        :drag-key="dragKey"
        :search-value="highlightSearch ? searchValue : ''"
        :t="localeFull"
        :status="nodeStatusFor(item.node)"
        :actions="actions"
        :editable="isEditable(item.node)"
        :unstyled="unstyled"
        @expand="handleExpand"
        @check="handleCheck"
        @select="handleSelect"
        @drag-start="handleDragStart"
        @drag-over="handleDragOver"
        @drag-leave="handleDragLeave"
        @drag-end="handleDragEnd"
        @drop="handleDrop"
        @right-click="handleRightClick"
        @load-data="handleLoadData"
        @focus-node="setFocusedKey"
        @edit="handleEdit"
        @edit-cancel="handleEditCancel"
      />
    </div>
  </div>
</template>
