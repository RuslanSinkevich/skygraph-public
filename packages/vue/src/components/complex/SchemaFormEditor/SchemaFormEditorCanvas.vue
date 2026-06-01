<script setup lang="ts">
import { computed, ref } from 'vue'
import SgForm from '../Form/Form.vue'
import SgField from '../Form/Field.vue'
import SgAutoField from '../SchemaForm/AutoField.vue'
import { useForm } from '../../../composables/useForm'
import { editorSchemaToJsonSchema, createFieldFromPaletteType } from './adapters/jsonSchema'
import { jsonSchemaToRules, jsonSchemaToDefaults } from '../../../adapters/jsonSchemaAdapter'
import { useConfig } from '../../ui/ConfigProvider.vue'
import { PALETTE_DATA_TYPE } from './palette'
import type { SchemaEditorStore } from './useSchemaEditor'
import type { FieldType } from '../SchemaForm/AutoField.vue'

export interface SchemaFormEditorCanvasProps {
  store: SchemaEditorStore
  emptyText?: string
}

const props = withDefaults(defineProps<SchemaFormEditorCanvasProps>(), {
  emptyText: 'Drop a field here',
})

const fields = computed(() => props.store.state.value.schema.fields)
const isEmpty = computed(() => fields.value.length === 0)

const jsonSchema = computed(() => editorSchemaToJsonSchema(props.store.state.value.schema))
const rulesMap = computed(() => jsonSchemaToRules(jsonSchema.value))
const defaults = computed(() => jsonSchemaToDefaults(jsonSchema.value))

const dropIndicator = ref<number | null>(null)
const draggingId = ref<string | null>(null)

const cfg = useConfig()
const moveUpLabel = computed(
  () => cfg.value.locale?.schemaFormEditor?.moveFieldUp ?? 'Move field up',
)
const moveDownLabel = computed(
  () => cfg.value.locale?.schemaFormEditor?.moveFieldDown ?? 'Move field down',
)
const duplicateLabel = computed(
  () => cfg.value.locale?.schemaFormEditor?.duplicateField ?? 'Duplicate field',
)
const deleteLabel = computed(
  () => cfg.value.locale?.schemaFormEditor?.deleteField ?? 'Delete field',
)

const form = useForm({ defaultValues: defaults.value })

function handleDragOver(e: DragEvent) {
  if (
    e.dataTransfer?.types.includes(PALETTE_DATA_TYPE) ||
    e.dataTransfer?.types.includes('text/plain') ||
    draggingId.value !== null
  ) {
    e.preventDefault()
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = draggingId.value ? 'move' : 'copy'
    }
  }
}

function handleDrop(e: DragEvent, beforeIndex: number) {
  e.preventDefault()
  e.stopPropagation()
  dropIndicator.value = null

  if (draggingId.value) {
    const id = draggingId.value
    const fromIdx = fields.value.findIndex((f) => f.id === id)
    draggingId.value = null
    if (fromIdx === -1) return
    let target = beforeIndex
    if (target > fromIdx) target -= 1
    if (target === fromIdx) return
    props.store.moveField(id, target)
    return
  }

  let type: FieldType | null = null
  const fromPalette = e.dataTransfer?.getData(PALETTE_DATA_TYPE)
  if (fromPalette) {
    type = fromPalette as FieldType
  } else {
    const txt = e.dataTransfer?.getData('text/plain')
    if (txt) type = txt as FieldType
  }
  if (!type) return

  const existingNames = fields.value.map((f) => f.name)
  const newField = createFieldFromPaletteType(type, existingNames)
  props.store.addField(newField, beforeIndex)
}

function handleEmptyClick() {
  props.store.setSelectedId(null)
}

function handleFieldClick(id: string, e: MouseEvent) {
  e.stopPropagation()
  props.store.setSelectedId(id)
}

function handleFieldDragStart(id: string, e: DragEvent) {
  e.stopPropagation()
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
  }
  draggingId.value = id
}

function handleFieldDragEnd() {
  draggingId.value = null
  dropIndicator.value = null
}

function handleFieldDragOver(index: number, e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  dropIndicator.value = index
}

function handleFieldDragLeave() {
  dropIndicator.value = null
}
</script>

<template>
  <div
    class="sg-sfe-canvas"
    data-testid="sfe-canvas"
    :data-empty="isEmpty ? 'true' : 'false'"
    @dragover="handleDragOver"
    @drop="(e) => handleDrop(e, fields.length)"
  >
    <div
      v-if="isEmpty"
      class="sg-sfe-canvas-empty"
      data-testid="sfe-canvas-empty"
      @click="handleEmptyClick"
    >
      {{ emptyText }}
    </div>
    <SgForm v-else :form="form" layout="vertical" class="sg-sfe-canvas-form">
      <template v-for="(field, idx) in fields" :key="field.id">
        <div
          v-if="dropIndicator === idx"
          class="sg-sfe-canvas-drop-indicator"
          data-testid="sfe-drop-indicator"
        />
        <div
          :class="[
            'sg-sfe-canvas-field',
            field.id === store.state.value.selectedId ? 'sg-sfe-canvas-field-selected' : '',
          ]"
          data-testid="sfe-canvas-field"
          :data-field-id="field.id"
          :data-field-name="field.name"
          draggable="true"
          @click="(e) => handleFieldClick(field.id, e)"
          @dragstart="(e) => handleFieldDragStart(field.id, e)"
          @dragend="handleFieldDragEnd"
          @dragover="(e) => handleFieldDragOver(idx, e)"
          @dragleave="handleFieldDragLeave"
          @drop="(e) => handleDrop(e, idx)"
        >
          <div
            v-if="field.id === store.state.value.selectedId"
            class="sg-sfe-canvas-field-toolbar"
            data-testid="sfe-field-toolbar"
            @click.stop
          >
            <button
              type="button"
              class="sg-sfe-canvas-field-toolbar-btn"
              data-testid="sfe-action-up"
              :aria-label="moveUpLabel"
              @click="store.moveFieldUp(field.id)"
            >
              ↑
            </button>
            <button
              type="button"
              class="sg-sfe-canvas-field-toolbar-btn"
              data-testid="sfe-action-down"
              :aria-label="moveDownLabel"
              @click="store.moveFieldDown(field.id)"
            >
              ↓
            </button>
            <button
              type="button"
              class="sg-sfe-canvas-field-toolbar-btn"
              data-testid="sfe-action-duplicate"
              :aria-label="duplicateLabel"
              @click="store.duplicateField(field.id)"
            >
              ⎘
            </button>
            <button
              type="button"
              class="sg-sfe-canvas-field-toolbar-btn sg-sfe-canvas-field-toolbar-btn-danger"
              data-testid="sfe-action-delete"
              :aria-label="deleteLabel"
              @click="store.removeField(field.id)"
            >
              ×
            </button>
          </div>
          <div class="sg-sfe-canvas-field-inner">
            <SgField :name="field.name" :label="field.label" :rules="rulesMap[field.name]">
              <template #default>
                <SgAutoField
                  :name="field.name"
                  :type="field.type"
                  :options="field.options"
                  :placeholder="field.placeholder"
                  :min="field.min"
                  :max="field.max"
                />
              </template>
            </SgField>
            <span v-if="field.helpText" class="sg-sfe-canvas-field-help">{{ field.helpText }}</span>
          </div>
        </div>
      </template>
      <div
        v-if="dropIndicator === fields.length"
        class="sg-sfe-canvas-drop-indicator"
        data-testid="sfe-drop-indicator"
      />
    </SgForm>
  </div>
</template>
