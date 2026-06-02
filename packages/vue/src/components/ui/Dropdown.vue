<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch, type PropType } from 'vue'
import { useConfigWithDefaults } from './ConfigProvider.vue'
import SgTransition from './Transition.vue'

let uid = 0
function genId() {
  return `sg-dropdown-${++uid}`
}

export interface DropdownItem {
  /** Unique key passed when activated. */
  key: string
  /** Visible menu row content. */
  label: string
  /** When true, the row cannot be selected. */
  disabled?: boolean
  /** When true, styles the row as destructive. */
  danger?: boolean
  /** When true, renders a separator instead of a selectable row. */
  divider?: boolean
}

export interface DropdownProps {
  items: DropdownItem[]
  trigger?: 'click' | 'hover'
  placement?: 'bottomLeft' | 'bottomRight' | 'topLeft' | 'topRight'
  disabled?: boolean
  unstyled?: boolean
}

const props = defineProps({
  items: {
    type: Array as PropType<DropdownItem[]>,
    required: true,
  },
  trigger: {
    type: String as PropType<'click' | 'hover'>,
    default: 'hover',
  },
  placement: {
    type: String as PropType<'bottomLeft' | 'bottomRight' | 'topLeft' | 'topRight'>,
    default: 'bottomLeft',
  },
  disabled: { type: Boolean, default: undefined },
  unstyled: { type: Boolean, default: false },
})

const emit = defineEmits<{
  (e: 'select', key: string): void
}>()

defineSlots<{
  default(props: Record<string, never>): unknown
  /** Custom row renderer (replaces `item.label` rendering). */
  item(props: { item: DropdownItem; index: number; focused: boolean }): unknown
}>()

const { resolvedDisabled } = useConfigWithDefaults({ disabled: undefined }, {})
const disabled = computed(() => props.disabled ?? resolvedDisabled.value)

const open = ref(false)
const focusedIndex = ref(-1)
const wrapperRef = ref<HTMLElement | null>(null)
let timer: ReturnType<typeof setTimeout> | undefined

const menuId = genId()

function getNextMenuIndex(current: number, direction: 1 | -1) {
  const items = props.items
  let next = current
  for (let i = 0; i < items.length; i++) {
    next = (next + direction + items.length) % items.length
    if (!items[next].divider && !items[next].disabled) return next
  }
  return current
}

function handleMouseEnter() {
  if (props.trigger !== 'hover' || disabled.value) return
  if (timer) clearTimeout(timer)
  open.value = true
}

function handleMouseLeave() {
  if (props.trigger !== 'hover') return
  timer = setTimeout(() => (open.value = false), 100)
}

function handleClick() {
  if (props.trigger !== 'click' || disabled.value) return
  open.value = !open.value
}

function handleSelect(item: DropdownItem) {
  if (item.disabled) return
  open.value = false
  emit('select', item.key)
}

function handleKeyDown(e: KeyboardEvent) {
  if (disabled.value) return
  switch (e.key) {
    case 'Enter':
    case ' ':
      e.preventDefault()
      if (open.value && focusedIndex.value >= 0 && !props.items[focusedIndex.value].divider) {
        handleSelect(props.items[focusedIndex.value])
      } else {
        open.value = !open.value
      }
      break
    case 'Escape':
      e.preventDefault()
      open.value = false
      break
    case 'ArrowDown':
      e.preventDefault()
      if (!open.value) {
        open.value = true
        focusedIndex.value = getNextMenuIndex(-1, 1)
      } else {
        focusedIndex.value = getNextMenuIndex(focusedIndex.value, 1)
      }
      break
    case 'ArrowUp':
      e.preventDefault()
      if (!open.value) {
        open.value = true
        focusedIndex.value = getNextMenuIndex(props.items.length, -1)
      } else {
        focusedIndex.value = getNextMenuIndex(focusedIndex.value, -1)
      }
      break
    case 'Home':
      if (open.value) {
        e.preventDefault()
        focusedIndex.value = getNextMenuIndex(-1, 1)
      }
      break
    case 'End':
      if (open.value) {
        e.preventDefault()
        focusedIndex.value = getNextMenuIndex(props.items.length, -1)
      }
      break
  }
}

function handleDocumentClick(e: MouseEvent) {
  if (wrapperRef.value && !wrapperRef.value.contains(e.target as Node)) {
    open.value = false
  }
}

watch(
  open,
  (next) => {
    if (next) {
      document.addEventListener('mousedown', handleDocumentClick)
    } else {
      focusedIndex.value = -1
      document.removeEventListener('mousedown', handleDocumentClick)
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleDocumentClick)
  if (timer) clearTimeout(timer)
})

const menuClasses = computed(() => `sg-dropdown sg-dropdown-${props.placement}`)
</script>

<template>
  <div v-if="unstyled" ref="wrapperRef" style="position: relative; display: inline-block">
    <div @click="handleClick" @mouseenter="handleMouseEnter" @mouseleave="handleMouseLeave">
      <slot />
    </div>
    <div v-if="open" @mouseenter="handleMouseEnter" @mouseleave="handleMouseLeave">
      <template v-for="(item, idx) in items" :key="item.key">
        <hr v-if="item.divider" />
        <div v-else @click="handleSelect(item)">
          <slot name="item" :item="item" :index="idx" :focused="idx === focusedIndex">
            {{ item.label }}
          </slot>
        </div>
      </template>
    </div>
  </div>
  <div
    v-else
    ref="wrapperRef"
    class="sg-dropdown-wrapper"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <div
      class="sg-dropdown-trigger"
      :aria-expanded="open"
      aria-haspopup="menu"
      :aria-controls="menuId"
      :tabindex="disabled ? -1 : 0"
      @click="handleClick"
      @keydown="handleKeyDown"
    >
      <slot />
    </div>
    <SgTransition :visible="open" name="sg-slide-up">
      <div
        :class="menuClasses"
        role="menu"
        :id="menuId"
        @mouseenter="handleMouseEnter"
        @mouseleave="handleMouseLeave"
      >
        <template v-for="(item, idx) in items" :key="item.key">
          <div v-if="item.divider" class="sg-dropdown-divider" role="separator" />
          <div
            v-else
            role="menuitem"
            :class="[
              'sg-dropdown-item',
              item.disabled ? 'sg-dropdown-item-disabled' : '',
              item.danger ? 'sg-dropdown-item-danger' : '',
              idx === focusedIndex ? 'sg-dropdown-item-focused' : '',
            ]"
            @click="handleSelect(item)"
          >
            <slot name="item" :item="item" :index="idx" :focused="idx === focusedIndex">
              {{ item.label }}
            </slot>
          </div>
        </template>
      </div>
    </SgTransition>
  </div>
</template>
