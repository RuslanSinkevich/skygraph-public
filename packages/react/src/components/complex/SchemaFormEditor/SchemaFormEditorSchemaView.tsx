import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import { editorSchemaToJsonSchema } from './adapters/jsonSchema'
import type { SchemaEditorStore } from './useSchemaEditor'
import { useConfig } from '../../ConfigProvider'

export interface SchemaFormEditorSchemaViewProps {
  store: SchemaEditorStore
  className?: string
  style?: CSSProperties
  /** Output mode — formatted JSON or a TypeScript-friendly literal. */
  mode?: 'json' | 'ts'
}

export function SchemaFormEditorSchemaView({
  store,
  className,
  style,
  mode = 'json',
}: SchemaFormEditorSchemaViewProps) {
  const sfeLocale = useConfig().locale?.schemaFormEditor
  const text = useMemo(() => {
    const schema = editorSchemaToJsonSchema(store.state.schema)
    if (mode === 'ts') return `const schema = ${JSON.stringify(schema, null, 2)} as const`
    return JSON.stringify(schema, null, 2)
  }, [store.state.schema, mode])

  return (
    <pre
      className={['sg-sfe-schema-view', className].filter(Boolean).join(' ')}
      style={style}
      data-testid="sfe-schema-view"
      aria-label={sfeLocale?.schemaView ?? 'Generated JSON Schema'}
    >
      <code>{text}</code>
    </pre>
  )
}
