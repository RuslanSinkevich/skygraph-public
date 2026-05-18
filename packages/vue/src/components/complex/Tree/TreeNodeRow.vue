<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import type { TreeKey, TreeNodeData, TreeLocale, TreeNodeAction, TreeNodeStatus } from './types'

interface TreeNodeRowProps {
  node: TreeNodeData
  nodeKey: TreeKey
  depth: number
  isLeaf: boolean
  indentSize: number

  expanded: boolean
  checked: boolean
  halfChecked: boolean
  selected: boolean
  loading: boolean
  disabled: boolean
  focused: boolean

  checkable: boolean
  selectable: boolean
  blockNode: boolean
  directory: boolean
  animated: boolean

  draggable: boolean
  dropPosition: -1 | 0 | 1 | null
  dragKey: TreeKey | null

  searchValue: string

  t: Required<TreeLocale>

  status?: TreeNodeStatus
  actions?: TreeNodeAction[]
  editable?: boolean

  unstyled?: boolean
}

const props = defineProps<TreeNodeRowProps>()

const emit = defineEmits<{
  (e: 'expand', key: TreeKey): void
  (e: 'check', key: TreeKey): void
  (e: 'select', key: TreeKey): void
  (e: 'dragStart', evt: DragEvent, key: TreeKey): void
  (e: 'dragOver', evt: DragEvent, key: TreeKey): void
  (e: 'dragLeave', evt: DragEvent, key: TreeKey): void
  (e: 'dragEnd', evt: DragEvent, key: TreeKey): void
  (e: 'drop', evt: DragEvent, key: TreeKey): void
  (e: 'rightClick', evt: MouseEvent, node: TreeNodeData): void
  (e: 'loadData', node: TreeNodeData): void
  (e: 'focusNode', key: TreeKey | null): void
  (e: 'edit', key: TreeKey, value: string, oldValue: string): void
  (e: 'editCancel', key: TreeKey): void
}>()

const rowEl = ref<HTMLDivElement | null>(null)

watch(
  () => props.focused,
  async (f) => {
    if (f && rowEl.value) {
      await nextTick()
      rowEl.value.scrollIntoView?.({ block: 'nearest' })
    }
  },
)

function handleSwitcherClick(e: MouseEvent) {
  e.stopPropagation()
  if (props.isLeaf) return
  if (!props.expanded && props.loading) return
  emit('expand', props.nodeKey)
  if (!props.expanded && !props.isLeaf) {
    emit('loadData', props.node)
  }
}

function handleCheckChange(e: Event) {
  e.stopPropagation()
  if (props.disabled || props.node.disableCheckbox) return
  emit('check', props.nodeKey)
}

function handleSelect() {
  if (props.disabled || props.node.selectable === false) return
  if (!props.selectable) return
  emit('select', props.nodeKey)
  if (props.directory && !props.isLeaf) {
    emit('expand', props.nodeKey)
  }
}

function handleClick() {
  emit('focusNode', props.nodeKey)
  handleSelect()
}

function handleContextMenu(e: MouseEvent) {
  e.preventDefault()
  emit('rightClick', e, props.node)
}

const titleText = computed(() => String(props.node.title ?? props.nodeKey))

const highlight = computed<{ before: string; match: string; after: string } | null>(() => {
  const sv = props.searchValue
  if (!sv) return null
  const text = titleText.value
  const idx = text.toLowerCase().indexOf(sv.toLowerCase())
  if (idx === -1) return null
  return {
    before: text.slice(0, idx),
    match: text.slice(idx, idx + sv.length),
    after: text.slice(idx + sv.length),
  }
})

const isDragging = computed(() => props.dragKey === props.nodeKey)
const isEditing = ref(false)
const editInput = ref<HTMLInputElement | null>(null)
const editingText = ref('')

const visibleActions = computed(() =>
  (props.actions ?? []).filter((a) => (a.visible ? a.visible(props.node) : true)),
)
const statusClass = computed(() =>
  props.status && props.status !== 'default' ? `sg-tree-node-status-${props.status}` : '',
)

const rowClass = computed(() => {
  if (props.unstyled) return ''
  return [
    'sg-tree-node',
    props.selected ? 'sg-tree-node-selected' : '',
    props.disabled ? 'sg-tree-node-disabled' : '',
    props.isLeaf ? 'sg-tree-node-leaf' : '',
    props.expanded ? 'sg-tree-node-expanded' : '',
    props.draggable ? 'sg-tree-node-draggable' : '',
    isDragging.value ? 'sg-tree-node-dragging' : '',
    props.dropPosition === 0 ? 'sg-tree-node-drop-inner' : '',
    props.dropPosition === -1 ? 'sg-tree-node-drop-before' : '',
    props.dropPosition === 1 ? 'sg-tree-node-drop-after' : '',
    props.blockNode ? 'sg-tree-node-block' : '',
    props.directory ? 'sg-tree-node-directory' : '',
    props.focused ? 'sg-tree-node-focused' : '',
    isEditing.value ? 'sg-tree-node-editing' : '',
    statusClass.value,
  ]
    .filter(Boolean)
    .join(' ')
})

function startEdit() {
  if (!props.editable || props.disabled) return
  editingText.value = titleText.value
  isEditing.value = true
  nextTick(() => {
    editInput.value?.focus()
    editInput.value?.select()
  })
}

function commitEdit() {
  if (!isEditing.value) return
  const next = editingText.value.trim()
  const prev = titleText.value
  isEditing.value = false
  if (next && next !== prev) {
    emit('edit', props.nodeKey, next, prev)
  }
}

function cancelEdit() {
  if (!isEditing.value) return
  isEditing.value = false
  emit('editCancel', props.nodeKey)
}

function handleEditKey(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    commitEdit()
  } else if (e.key === 'Escape') {
    e.preventDefault()
    cancelEdit()
  }
}

function actionDisabled(action: TreeNodeAction): boolean {
  if (typeof action.disabled === 'function') return !!action.disabled(props.node)
  return !!action.disabled
}

function handleActionClick(e: MouseEvent, action: TreeNodeAction) {
  e.stopPropagation()
  if (actionDisabled(action)) return
  action.onClick(props.node, props.nodeKey)
}

function onDragStart(e: DragEvent) {
  if (!props.draggable) return
  emit('dragStart', e, props.nodeKey)
}

function onDragOver(e: DragEvent) {
  if (!props.draggable) return
  e.preventDefault()
  emit('dragOver', e, props.nodeKey)
}

function onDragLeave(e: DragEvent) {
  if (!props.draggable) return
  emit('dragLeave', e, props.nodeKey)
}

function onDragEnd(e: DragEvent) {
  if (!props.draggable) return
  emit('dragEnd', e, props.nodeKey)
}

function onDrop(e: DragEvent) {
  if (!props.draggable) return
  e.preventDefault()
  emit('drop', e, props.nodeKey)
}

const ariaExpanded = computed<boolean | undefined>(() =>
  props.isLeaf ? undefined : props.expanded,
)
const ariaChecked = computed<boolean | undefined>(() =>
  props.checkable ? props.checked : undefined,
)

const indentPx = computed(() => `${props.depth * props.indentSize}px`)
</script>

<template>
  <div
    ref="rowEl"
    :class="rowClass || undefined"
    :style="{ paddingLeft: indentPx }"
    role="treeitem"
    :aria-expanded="ariaExpanded"
    :aria-selected="selected"
    :aria-checked="ariaChecked"
    :aria-level="depth + 1"
    :data-key="nodeKey"
    :draggable="draggable"
    @dragstart="onDragStart"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @dragend="onDragEnd"
    @drop="onDrop"
    @contextmenu="handleContextMenu"
    @click="handleClick"
  >
    <span
      v-if="!isLeaf"
      :class="
        [
          'sg-tree-switcher',
          expanded ? 'sg-tree-switcher-open' : 'sg-tree-switcher-close',
          loading ? 'sg-tree-switcher-loading' : '',
        ]
          .filter(Boolean)
          .join(' ')
      "
      @click="handleSwitcherClick"
    >
      <svg
        v-if="!loading"
        :class="
          ['sg-tree-switcher-arrow', expanded ? 'sg-tree-switcher-arrow-open' : '']
            .filter(Boolean)
            .join(' ')
        "
        width="10"
        height="10"
        viewBox="0 0 10 10"
        fill="none"
      >
        <path
          d="M3 2L7 5L3 8"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <span v-else class="sg-spin sg-spin-small" aria-hidden="true" />
    </span>
    <span v-else class="sg-tree-switcher sg-tree-switcher-noop" />

    <input
      v-if="checkable && node.checkable !== false"
      type="checkbox"
      class="sg-tree-checkbox sg-checkbox-input"
      :checked="checked"
      :disabled="disabled || node.disableCheckbox"
      :data-indeterminate="halfChecked || undefined"
      @click.stop
      @change="handleCheckChange"
    />

    <span v-if="directory" class="sg-tree-icon">{{ expanded ? '📂' : '📁' }}</span>

    <span
      v-if="!isEditing"
      :class="
        ['sg-tree-title', selectable ? 'sg-tree-title-selectable' : ''].filter(Boolean).join(' ')
      "
      @dblclick="startEdit"
    >
      <template v-if="highlight">
        {{ highlight.before }}<span class="sg-tree-highlight">{{ highlight.match }}</span
        >{{ highlight.after }}
      </template>
      <template v-else>{{ titleText }}</template>
    </span>
    <input
      v-else
      ref="editInput"
      v-model="editingText"
      class="sg-tree-edit-input"
      type="text"
      @click.stop
      @keydown.stop="handleEditKey"
      @blur="commitEdit"
    />

    <span v-if="visibleActions.length > 0" class="sg-tree-actions" @click.stop>
      <button
        v-for="action in visibleActions"
        :key="action.key"
        type="button"
        :class="
          [
            'sg-tree-action-btn',
            action.danger ? 'sg-tree-action-danger' : '',
            actionDisabled(action) ? 'sg-tree-action-disabled' : '',
          ]
            .filter(Boolean)
            .join(' ')
        "
        :title="action.title"
        :aria-label="action.title"
        :disabled="actionDisabled(action)"
        @click="handleActionClick($event, action)"
      >
        {{ action.icon }}
      </button>
    </span>
  </div>
</template>
