<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import SgSchemaForm from '../SchemaForm/SchemaForm.vue'
import SgSchemaFormEditorPalette from './SchemaFormEditorPalette.vue'
import SgSchemaFormEditorCanvas from './SchemaFormEditorCanvas.vue'
import SgSchemaFormEditorInspector from './SchemaFormEditorInspector.vue'
import SgSchemaFormEditorSchemaView from './SchemaFormEditorSchemaView.vue'
import { useSchemaEditor, type SchemaEditorStore } from './useSchemaEditor'
import { editorSchemaToJsonSchema, createFieldFromPaletteType } from './adapters/jsonSchema'
import { useConfig } from '../../ui/ConfigProvider.vue'
import type { PaletteItem } from './palette'
import type { EditorSchema } from './types'

export interface SchemaFormEditorProps {
  initialSchema?: EditorSchema
  store?: SchemaEditorStore
  paletteItems?: PaletteItem[]
  emptyText?: string
  hideSchemaView?: boolean
}

const props = defineProps<SchemaFormEditorProps>()

const emit = defineEmits<{
  (e: 'change', schema: EditorSchema): void
}>()

const internalStore = useSchemaEditor({
  initialSchema: props.initialSchema,
  onChange: (schema) => emit('change', schema),
})
const store = computed(() => props.store ?? internalStore)

const bottomTab = ref<'preview' | 'schema'>('preview')

const cfg = useConfig()
const undoLabel = computed(() => cfg.value.locale?.schemaFormEditor?.undo ?? 'Undo')
const redoLabel = computed(() => cfg.value.locale?.schemaFormEditor?.redo ?? 'Redo')

function handlePaletteActivate(type: ReturnType<typeof createFieldFromPaletteType>['type']) {
  const existingNames = store.value.state.value.schema.fields.map((f) => f.name)
  store.value.addField(createFieldFromPaletteType(type, existingNames))
}

function onKey(e: KeyboardEvent) {
  const target = e.target as HTMLElement | null
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
  const ctrl = e.ctrlKey || e.metaKey
  if (!ctrl) return
  const k = e.key.toLowerCase()
  if (k === 'z' && !e.shiftKey) {
    e.preventDefault()
    store.value.undo()
  } else if ((k === 'z' && e.shiftKey) || k === 'y') {
    e.preventDefault()
    store.value.redo()
  }
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

const previewSchema = computed(() => editorSchemaToJsonSchema(store.value.state.value.schema))
const previewFields = computed(() => store.value.state.value.schema.fields)
const previewKey = computed(() =>
  previewFields.value.map((f) => `${f.id}:${f.name}:${f.type}`).join('|'),
)
</script>

<template>
  <div class="sg-sfe" data-testid="schema-form-editor">
    <div class="sg-sfe-toolbar" data-testid="sfe-toolbar">
      <span class="sg-sfe-toolbar-title">Schema Form Editor</span>
      <span style="flex: 1" />
      <button
        type="button"
        class="sg-sfe-toolbar-btn"
        data-testid="sfe-undo"
        :aria-label="undoLabel"
        :disabled="!store.state.value.canUndo"
        @click="store.undo()"
      >
        {{ undoLabel }}
      </button>
      <button
        type="button"
        class="sg-sfe-toolbar-btn"
        data-testid="sfe-redo"
        :aria-label="redoLabel"
        :disabled="!store.state.value.canRedo"
        @click="store.redo()"
      >
        {{ redoLabel }}
      </button>
    </div>

    <div class="sg-sfe-body">
      <SgSchemaFormEditorPalette :items="paletteItems" @item-activate="handlePaletteActivate" />
      <div class="sg-sfe-center">
        <SgSchemaFormEditorCanvas :store="store" :empty-text="emptyText" />
        <div v-if="!hideSchemaView" class="sg-sfe-bottom" data-testid="sfe-bottom">
          <div class="sg-sfe-tabs">
            <button
              type="button"
              :class="['sg-sfe-tab', bottomTab === 'preview' ? 'sg-sfe-tab-active' : '']"
              data-testid="sfe-tab-preview"
              @click="bottomTab = 'preview'"
            >
              Preview
            </button>
            <button
              type="button"
              :class="['sg-sfe-tab', bottomTab === 'schema' ? 'sg-sfe-tab-active' : '']"
              data-testid="sfe-tab-schema"
              @click="bottomTab = 'schema'"
            >
              Schema
            </button>
          </div>
          <template v-if="bottomTab === 'preview'">
            <div
              v-if="previewFields.length === 0"
              class="sg-sfe-preview-empty"
              data-testid="sfe-preview-empty"
            >
              Drop fields onto the canvas to see a live preview.
            </div>
            <div v-else class="sg-sfe-preview" data-testid="sfe-preview">
              <SgSchemaForm :key="previewKey" :schema="previewSchema" layout="vertical">
                <span />
              </SgSchemaForm>
            </div>
          </template>
          <SgSchemaFormEditorSchemaView v-else :store="store" />
        </div>
      </div>
      <SgSchemaFormEditorInspector :store="store" />
    </div>
  </div>
</template>
