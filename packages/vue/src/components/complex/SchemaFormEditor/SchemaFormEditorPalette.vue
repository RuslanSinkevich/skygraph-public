<script setup lang="ts">
import type { FieldType } from '../SchemaForm/AutoField.vue'
import { DEFAULT_PALETTE_ITEMS, PALETTE_DATA_TYPE, type PaletteItem } from './palette'

export interface SchemaFormEditorPaletteProps {
  items?: PaletteItem[]
}

const props = withDefaults(defineProps<SchemaFormEditorPaletteProps>(), {
  items: () => DEFAULT_PALETTE_ITEMS,
})

const emit = defineEmits<{
  (e: 'itemActivate', type: FieldType): void
}>()

function handleDragStart(type: FieldType, e: DragEvent) {
  if (e.dataTransfer) {
    e.dataTransfer.setData(PALETTE_DATA_TYPE, type)
    e.dataTransfer.setData('text/plain', type)
    e.dataTransfer.effectAllowed = 'copy'
  }
}

function handleClick(type: FieldType) {
  emit('itemActivate', type)
}

function handleKeyDown(type: FieldType, e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    emit('itemActivate', type)
  }
}
</script>

<template>
  <div class="sg-sfe-palette" data-testid="sfe-palette">
    <div class="sg-sfe-palette-title">Fields</div>
    <div class="sg-sfe-palette-list">
      <div
        v-for="item in props.items"
        :key="item.type"
        class="sg-sfe-palette-item"
        :data-palette-type="item.type"
        draggable="true"
        tabindex="0"
        role="button"
        @dragstart="(e) => handleDragStart(item.type, e)"
        @click="handleClick(item.type)"
        @keydown="(e) => handleKeyDown(item.type, e)"
      >
        <span class="sg-sfe-palette-item-glyph" aria-hidden="true">{{ item.glyph ?? '·' }}</span>
        <span class="sg-sfe-palette-item-body">
          <span class="sg-sfe-palette-item-label">{{ item.label }}</span>
          <span v-if="item.hint" class="sg-sfe-palette-item-hint">{{ item.hint }}</span>
        </span>
      </div>
    </div>
  </div>
</template>
