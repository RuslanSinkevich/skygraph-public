<script setup lang="ts">
import { computed } from 'vue'
import type { SchemaEditorStore } from './useSchemaEditor'
import type { EditorField } from './types'
import type { AutoFieldOption, FieldType } from '../SchemaForm/AutoField.vue'

export interface SchemaFormEditorInspectorProps {
  store: SchemaEditorStore
}

const props = defineProps<SchemaFormEditorInspectorProps>()

const TYPES_WITH_OPTIONS: FieldType[] = ['select', 'radio', 'multiselect']
const TYPES_WITH_NUMERIC_RANGE: FieldType[] = ['number', 'slider', 'rate']
const TYPES_WITH_LENGTH_RANGE: FieldType[] = ['string', 'textarea', 'password', 'email', 'url']

const selected = computed<EditorField | null>(() => {
  const id = props.store.state.value.selectedId
  if (!id) return null
  return props.store.state.value.schema.fields.find((f) => f.id === id) ?? null
})

const isOptionsType = computed(() => selected.value && TYPES_WITH_OPTIONS.includes(selected.value.type))
const isNumericType = computed(() => selected.value && TYPES_WITH_NUMERIC_RANGE.includes(selected.value.type))
const isLengthType = computed(() => selected.value && TYPES_WITH_LENGTH_RANGE.includes(selected.value.type))
const isBooleanType = computed(
  () => selected.value && (selected.value.type === 'boolean' || selected.value.type === 'switch'),
)

function patch(p: Partial<EditorField>) {
  if (!selected.value) return
  props.store.updateField(selected.value.id, p)
}

function defaultDisplay(): string {
  if (!selected.value || selected.value.defaultValue === undefined) return ''
  return String(selected.value.defaultValue)
}

function handleDefaultInput(raw: string) {
  if (raw === '') return patch({ defaultValue: undefined })
  if (isBooleanType.value) return patch({ defaultValue: raw === 'true' })
  if (isNumericType.value) {
    const n = Number(raw)
    return patch({ defaultValue: Number.isFinite(n) ? n : raw })
  }
  patch({ defaultValue: raw })
}

function updateOption(idx: number, p: Partial<AutoFieldOption>) {
  if (!selected.value) return
  const copy = (selected.value.options ?? []).map((o) => ({ ...o }))
  copy[idx] = { ...copy[idx]!, ...p }
  patch({ options: copy })
}

function removeOption(idx: number) {
  if (!selected.value) return
  const copy = (selected.value.options ?? []).slice()
  copy.splice(idx, 1)
  patch({ options: copy })
}

function addOption() {
  if (!selected.value) return
  const list = selected.value.options ?? []
  const next: AutoFieldOption = {
    value: `option${list.length + 1}`,
    label: `Option ${list.length + 1}`,
  }
  patch({ options: [...list, next] })
}
</script>

<template>
  <div class="sg-sfe-inspector" data-testid="sfe-inspector">
    <div v-if="!selected" class="sg-sfe-inspector-empty" data-testid="sfe-inspector-empty">
      Select a field on the canvas to edit its properties.
    </div>
    <template v-else>
      <div class="sg-sfe-inspector-title">Field properties</div>

      <div class="sg-sfe-inspector-row" data-testid="sfe-inspector-row">
        <label class="sg-sfe-inspector-row-label">Name</label>
        <div class="sg-sfe-inspector-row-control">
          <input
            class="sg-sfe-inspector-input"
            data-testid="sfe-inspector-name"
            :value="selected.name"
            @input="(e) => patch({ name: (e.target as HTMLInputElement).value })"
          />
        </div>
      </div>

      <div class="sg-sfe-inspector-row" data-testid="sfe-inspector-row">
        <label class="sg-sfe-inspector-row-label">Label</label>
        <div class="sg-sfe-inspector-row-control">
          <input
            class="sg-sfe-inspector-input"
            data-testid="sfe-inspector-label"
            :value="selected.label"
            @input="(e) => patch({ label: (e.target as HTMLInputElement).value })"
          />
        </div>
      </div>

      <div class="sg-sfe-inspector-row" data-testid="sfe-inspector-row">
        <label class="sg-sfe-inspector-row-label">Type</label>
        <div class="sg-sfe-inspector-row-control">
          <input
            class="sg-sfe-inspector-input"
            data-testid="sfe-inspector-type"
            :value="selected.type"
            readonly
            aria-readonly="true"
          />
        </div>
      </div>

      <div class="sg-sfe-inspector-row" data-testid="sfe-inspector-row">
        <label class="sg-sfe-inspector-row-label">Required</label>
        <div class="sg-sfe-inspector-row-control">
          <label class="sg-sfe-inspector-checkbox">
            <input
              type="checkbox"
              data-testid="sfe-inspector-required"
              :checked="!!selected.required"
              @change="(e) => patch({ required: (e.target as HTMLInputElement).checked })"
            />
            <span>Make this field required</span>
          </label>
        </div>
      </div>

      <div class="sg-sfe-inspector-row" data-testid="sfe-inspector-row">
        <label class="sg-sfe-inspector-row-label">Placeholder</label>
        <div class="sg-sfe-inspector-row-control">
          <input
            class="sg-sfe-inspector-input"
            data-testid="sfe-inspector-placeholder"
            :value="selected.placeholder ?? ''"
            @input="(e) => {
              const val = (e.target as HTMLInputElement).value
              patch({ placeholder: val || undefined })
            }"
          />
        </div>
      </div>

      <div class="sg-sfe-inspector-row" data-testid="sfe-inspector-row">
        <label class="sg-sfe-inspector-row-label">Help text</label>
        <div class="sg-sfe-inspector-row-control">
          <input
            class="sg-sfe-inspector-input"
            data-testid="sfe-inspector-help"
            :value="selected.helpText ?? ''"
            @input="(e) => {
              const val = (e.target as HTMLInputElement).value
              patch({ helpText: val || undefined })
            }"
          />
        </div>
      </div>

      <div class="sg-sfe-inspector-row" data-testid="sfe-inspector-row">
        <label class="sg-sfe-inspector-row-label">Default</label>
        <div class="sg-sfe-inspector-row-control">
          <input
            class="sg-sfe-inspector-input"
            data-testid="sfe-inspector-default"
            :value="defaultDisplay()"
            @input="(e) => handleDefaultInput((e.target as HTMLInputElement).value)"
          />
        </div>
      </div>

      <div v-if="isLengthType || isNumericType" class="sg-sfe-inspector-row" data-testid="sfe-inspector-row">
        <label class="sg-sfe-inspector-row-label">{{ isLengthType ? 'Min length' : 'Min' }}</label>
        <div class="sg-sfe-inspector-row-control">
          <input
            class="sg-sfe-inspector-input"
            data-testid="sfe-inspector-min"
            type="number"
            :value="selected.min ?? ''"
            @input="(e) => {
              const raw = (e.target as HTMLInputElement).value
              patch({ min: raw === '' ? undefined : Number(raw) })
            }"
          />
        </div>
      </div>

      <div v-if="isLengthType || isNumericType" class="sg-sfe-inspector-row" data-testid="sfe-inspector-row">
        <label class="sg-sfe-inspector-row-label">{{ isLengthType ? 'Max length' : 'Max' }}</label>
        <div class="sg-sfe-inspector-row-control">
          <input
            class="sg-sfe-inspector-input"
            data-testid="sfe-inspector-max"
            type="number"
            :value="selected.max ?? ''"
            @input="(e) => {
              const raw = (e.target as HTMLInputElement).value
              patch({ max: raw === '' ? undefined : Number(raw) })
            }"
          />
        </div>
      </div>

      <div v-if="isLengthType" class="sg-sfe-inspector-row" data-testid="sfe-inspector-row">
        <label class="sg-sfe-inspector-row-label">Pattern (RegExp)</label>
        <div class="sg-sfe-inspector-row-control">
          <input
            class="sg-sfe-inspector-input"
            data-testid="sfe-inspector-pattern"
            :value="selected.pattern ?? ''"
            placeholder="^[A-Z].*"
            @input="(e) => {
              const val = (e.target as HTMLInputElement).value
              patch({ pattern: val || undefined })
            }"
          />
        </div>
      </div>

      <div v-if="isOptionsType" class="sg-sfe-inspector-options" data-testid="sfe-inspector-options">
        <div class="sg-sfe-inspector-row-label">Options</div>
        <div
          v-for="(opt, idx) in (selected.options ?? [])"
          :key="idx"
          class="sg-sfe-inspector-option"
        >
          <input
            class="sg-sfe-inspector-input"
            data-testid="sfe-inspector-option-label"
            :value="opt.label"
            placeholder="Label"
            @input="(e) => updateOption(idx, { label: (e.target as HTMLInputElement).value })"
          />
          <input
            class="sg-sfe-inspector-input"
            data-testid="sfe-inspector-option-value"
            :value="String(opt.value)"
            placeholder="Value"
            @input="(e) => updateOption(idx, { value: (e.target as HTMLInputElement).value })"
          />
          <button
            type="button"
            class="sg-sfe-inspector-option-remove"
            aria-label="Remove option"
            @click="removeOption(idx)"
          >×</button>
        </div>
        <button
          type="button"
          class="sg-sfe-inspector-option-add"
          data-testid="sfe-inspector-option-add"
          @click="addOption"
        >+ Add option</button>
      </div>
    </template>
  </div>
</template>
