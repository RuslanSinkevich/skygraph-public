<script setup lang="ts">
import { computed } from 'vue'
import { editorSchemaToJsonSchema } from './adapters/jsonSchema'
import { useConfig } from '../../ui/ConfigProvider.vue'
import type { SchemaEditorStore } from './useSchemaEditor'

export interface SchemaFormEditorSchemaViewProps {
  store: SchemaEditorStore
  mode?: 'json' | 'ts'
}

const props = withDefaults(defineProps<SchemaFormEditorSchemaViewProps>(), {
  mode: 'json',
})

const text = computed(() => {
  const schema = editorSchemaToJsonSchema(props.store.state.value.schema)
  if (props.mode === 'ts') return `const schema = ${JSON.stringify(schema, null, 2)} as const`
  return JSON.stringify(schema, null, 2)
})

const cfg = useConfig()
const schemaViewLabel = computed(
  () => cfg.value.locale?.schemaFormEditor?.schemaView ?? 'Generated JSON Schema',
)
</script>

<template>
  <pre
    class="sg-sfe-schema-view"
    data-testid="sfe-schema-view"
    :aria-label="schemaViewLabel"
  ><code>{{ text }}</code></pre>
</template>
