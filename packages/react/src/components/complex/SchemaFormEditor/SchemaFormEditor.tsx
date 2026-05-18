import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { useSchemaEditor } from './useSchemaEditor'
import type { SchemaEditorStore, UseSchemaEditorOptions } from './useSchemaEditor'
import { SchemaFormEditorPalette } from './SchemaFormEditorPalette'
import type { PaletteItem } from './SchemaFormEditorPalette'
import { SchemaFormEditorCanvas } from './SchemaFormEditorCanvas'
import { SchemaFormEditorInspector } from './SchemaFormEditorInspector'
import { SchemaFormEditorSchemaView } from './SchemaFormEditorSchemaView'
import { createFieldFromPaletteType, editorSchemaToJsonSchema } from './adapters/jsonSchema'
import { SchemaForm } from '../SchemaForm'
import type { EditorSchema } from './types'
import { useConfig } from '../../ConfigProvider'

export interface SchemaFormEditorProps {
  /** Initial schema (uncontrolled). Use `setSchema` from a custom store for controlled use. */
  initialSchema?: EditorSchema
  /**
   * Externally-managed editor store. When provided, `initialSchema`,
   * `onChange` are ignored and the consumer drives the editor directly.
   */
  store?: SchemaEditorStore
  /** Override the default palette catalogue. */
  paletteItems?: PaletteItem[]
  /** Fires after every successful mutation with the new schema. */
  onChange?: (schema: EditorSchema) => void
  /** Empty-state CTA. */
  emptyText?: string
  /** Wrapper className (additive). */
  className?: string
  /** Wrapper inline style. */
  style?: CSSProperties
  /** Hide the bottom Preview / Schema toggle. Default is to show it. */
  hideSchemaView?: boolean
}

export function SchemaFormEditor({
  initialSchema,
  store: externalStore,
  paletteItems,
  onChange,
  emptyText,
  className,
  style,
  hideSchemaView,
}: SchemaFormEditorProps) {
  const sfeLocale = useConfig().locale?.schemaFormEditor
  const internalOptions: UseSchemaEditorOptions = { initialSchema, onChange }
  const internalStore = useSchemaEditor(internalOptions)
  const store = externalStore ?? internalStore
  const [bottomTab, setBottomTab] = useState<'preview' | 'schema'>('preview')

  // Allow Ctrl/Cmd + Z / Shift+Z keyboard shortcuts when the editor has focus.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
      const ctrl = e.ctrlKey || e.metaKey
      if (!ctrl) return
      const k = e.key.toLowerCase()
      if (k === 'z' && !e.shiftKey) {
        e.preventDefault()
        store.undo()
      } else if ((k === 'z' && e.shiftKey) || k === 'y') {
        e.preventDefault()
        store.redo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [store])

  return (
    <div
      className={['sg-sfe', className].filter(Boolean).join(' ')}
      style={style}
      data-testid="schema-form-editor"
    >
      <div className="sg-sfe-toolbar" data-testid="sfe-toolbar">
        <span className="sg-sfe-toolbar-title">Schema Form Editor</span>
        <span style={{ flex: 1 }} />
        <button
          type="button"
          className="sg-sfe-toolbar-btn"
          data-testid="sfe-undo"
          aria-label={sfeLocale?.undo ?? 'Undo'}
          disabled={!store.state.canUndo}
          onClick={() => store.undo()}
        >
          Undo
        </button>
        <button
          type="button"
          className="sg-sfe-toolbar-btn"
          data-testid="sfe-redo"
          aria-label={sfeLocale?.redo ?? 'Redo'}
          disabled={!store.state.canRedo}
          onClick={() => store.redo()}
        >
          Redo
        </button>
      </div>

      <div className="sg-sfe-body">
        <SchemaFormEditorPalette
          items={paletteItems}
          onItemActivate={(type) => {
            const existingNames = store.state.schema.fields.map((f) => f.name)
            store.addField(createFieldFromPaletteType(type, existingNames))
          }}
        />
        <div className="sg-sfe-center">
          <SchemaFormEditorCanvas store={store} emptyText={emptyText} />
          {!hideSchemaView && (
            <div className="sg-sfe-bottom" data-testid="sfe-bottom">
              <div className="sg-sfe-tabs">
                <button
                  type="button"
                  className={['sg-sfe-tab', bottomTab === 'preview' ? 'sg-sfe-tab-active' : '']
                    .filter(Boolean)
                    .join(' ')}
                  data-testid="sfe-tab-preview"
                  onClick={() => setBottomTab('preview')}
                >
                  Preview
                </button>
                <button
                  type="button"
                  className={['sg-sfe-tab', bottomTab === 'schema' ? 'sg-sfe-tab-active' : '']
                    .filter(Boolean)
                    .join(' ')}
                  data-testid="sfe-tab-schema"
                  onClick={() => setBottomTab('schema')}
                >
                  Schema
                </button>
              </div>
              {bottomTab === 'preview' ? (
                <PreviewPane store={store} />
              ) : (
                <SchemaFormEditorSchemaView store={store} />
              )}
            </div>
          )}
        </div>
        <SchemaFormEditorInspector store={store} />
      </div>
    </div>
  )
}

function PreviewPane({ store }: { store: SchemaEditorStore }) {
  const fields = store.state.schema.fields
  const jsonSchema = useMemo(
    () => editorSchemaToJsonSchema(store.state.schema),
    [store.state.schema],
  )
  // Re-key the form when the schema fingerprint changes so defaults are picked
  // up after every mutation in the editor.
  const formKey = useMemo(
    () => fields.map((f) => `${f.id}:${f.name}:${f.type}`).join('|'),
    [fields],
  )

  if (fields.length === 0) {
    return (
      <div className="sg-sfe-preview-empty" data-testid="sfe-preview-empty">
        Drop fields onto the canvas to see a live preview.
      </div>
    )
  }

  return (
    <div className="sg-sfe-preview" data-testid="sfe-preview">
      <SchemaForm key={formKey} schema={jsonSchema} layout="vertical">
        <span />
      </SchemaForm>
    </div>
  )
}
