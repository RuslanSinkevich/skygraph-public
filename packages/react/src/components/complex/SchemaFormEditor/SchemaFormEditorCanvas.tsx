import { useCallback, useMemo, useRef, useState } from 'react'
import type { CSSProperties, DragEvent } from 'react'
import type { Rule } from '@skygraph/core'
import { Form } from '../Form'
import { Field } from '../Field'
import { AutoField } from '../AutoField/AutoField'
import { useForm } from '../../../hooks/useForm'
import { editorSchemaToJsonSchema, createFieldFromPaletteType } from './adapters/jsonSchema'
import { jsonSchemaToRules, jsonSchemaToDefaults } from '../../../adapters/jsonSchemaAdapter'
import { PALETTE_DATA_TYPE } from './SchemaFormEditorPalette'
import type { SchemaEditorStore } from './useSchemaEditor'
import type { EditorField } from './types'
import type { FieldType } from '../AutoField/AutoField'
import { useConfig } from '../../ConfigProvider'

export interface SchemaFormEditorCanvasProps {
  store: SchemaEditorStore
  /** Empty-state CTA text. */
  emptyText?: string
  /** Wrapper className (additive). */
  className?: string
  /** Wrapper inline style. */
  style?: CSSProperties
}

export function SchemaFormEditorCanvas({
  store,
  emptyText = 'Drop a field here',
  className,
  style,
}: SchemaFormEditorCanvasProps) {
  const {
    state,
    addField,
    removeField,
    moveFieldUp,
    moveFieldDown,
    duplicateField,
    moveField,
    setSelectedId,
  } = store
  const fields = state.schema.fields
  const isEmpty = fields.length === 0

  const jsonSchema = useMemo(() => editorSchemaToJsonSchema(state.schema), [state.schema])
  const rulesMap = useMemo(() => jsonSchemaToRules(jsonSchema), [jsonSchema])
  const defaults = useMemo(() => jsonSchemaToDefaults(jsonSchema), [jsonSchema])

  // Re-key the form whenever the schema fingerprint changes so the underlying
  // FormEngine rebuilds its defaults — otherwise newly-added fields would not
  // pick up their `defaultValue`.
  const formKey = useMemo(
    () =>
      fields.map((f) => `${f.id}:${f.name}:${f.type}:${String(f.defaultValue ?? '')}`).join('|'),
    [fields],
  )

  const [dropIndicator, setDropIndicator] = useState<number | null>(null)
  const dragRef = useRef<{ id: string } | null>(null)

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    if (
      e.dataTransfer.types.includes(PALETTE_DATA_TYPE) ||
      e.dataTransfer.types.includes('text/plain') ||
      dragRef.current !== null
    ) {
      e.preventDefault()
      e.dataTransfer.dropEffect = dragRef.current ? 'move' : 'copy'
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>, beforeIndex: number) {
    e.preventDefault()
    e.stopPropagation()
    setDropIndicator(null)

    // Re-order existing field
    if (dragRef.current) {
      const id = dragRef.current.id
      const fromIdx = fields.findIndex((f) => f.id === id)
      dragRef.current = null
      if (fromIdx === -1) return
      let target = beforeIndex
      if (target > fromIdx) target -= 1
      if (target === fromIdx) return
      moveField(id, target)
      return
    }

    // Drop a new field from the palette
    let type: FieldType | null = null
    const fromPalette = e.dataTransfer.getData(PALETTE_DATA_TYPE)
    if (fromPalette) {
      type = fromPalette as FieldType
    } else {
      const txt = e.dataTransfer.getData('text/plain')
      if (txt) type = txt as FieldType
    }
    if (!type) return

    const existingNames = fields.map((f) => f.name)
    const newField = createFieldFromPaletteType(type, existingNames)
    addField(newField, beforeIndex)
  }

  const handleEmptyClick = useCallback(() => setSelectedId(null), [setSelectedId])

  return (
    <div
      className={['sg-sfe-canvas', className].filter(Boolean).join(' ')}
      style={style}
      data-testid="sfe-canvas"
      data-empty={isEmpty ? 'true' : 'false'}
      onDragOver={handleDragOver}
      onDrop={(e) => handleDrop(e, fields.length)}
    >
      {isEmpty && (
        <div
          className="sg-sfe-canvas-empty"
          data-testid="sfe-canvas-empty"
          onClick={handleEmptyClick}
        >
          {emptyText}
        </div>
      )}

      {!isEmpty && (
        <CanvasForm
          key={formKey}
          fields={fields}
          rulesMap={rulesMap}
          defaults={defaults}
          selectedId={state.selectedId}
          dropIndicator={dropIndicator}
          onSelect={setSelectedId}
          onRemove={removeField}
          onDuplicate={duplicateField}
          onMoveUp={moveFieldUp}
          onMoveDown={moveFieldDown}
          onFieldDragStart={(id) => {
            dragRef.current = { id }
          }}
          onFieldDragEnd={() => {
            dragRef.current = null
            setDropIndicator(null)
          }}
          onFieldDrop={handleDrop}
          onIndicator={setDropIndicator}
        />
      )}
    </div>
  )
}

interface CanvasFormProps {
  fields: EditorField[]
  rulesMap: Record<string, Rule[]>
  defaults: Record<string, unknown>
  selectedId: string | null
  dropIndicator: number | null
  onSelect: (id: string | null) => void
  onRemove: (id: string) => void
  onDuplicate: (id: string) => void
  onMoveUp: (id: string) => void
  onMoveDown: (id: string) => void
  onFieldDragStart: (id: string) => void
  onFieldDragEnd: () => void
  onFieldDrop: (e: DragEvent<HTMLDivElement>, beforeIndex: number) => void
  onIndicator: (i: number | null) => void
}

function CanvasForm({
  fields,
  rulesMap,
  defaults,
  selectedId,
  dropIndicator,
  onSelect,
  onRemove,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onFieldDragStart,
  onFieldDragEnd,
  onFieldDrop,
  onIndicator,
}: CanvasFormProps) {
  const form = useForm({ defaultValues: defaults })

  return (
    <Form form={form} layout="vertical" className="sg-sfe-canvas-form">
      {fields.map((field, idx) => (
        <FieldOverlay
          key={field.id}
          index={idx}
          field={field}
          isSelected={field.id === selectedId}
          isLast={idx === fields.length - 1}
          showIndicator={dropIndicator === idx}
          rules={rulesMap[field.name]}
          onSelect={onSelect}
          onRemove={onRemove}
          onDuplicate={onDuplicate}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onFieldDragStart={onFieldDragStart}
          onFieldDragEnd={onFieldDragEnd}
          onFieldDrop={onFieldDrop}
          onIndicator={onIndicator}
        />
      ))}
      {dropIndicator === fields.length && (
        <div className="sg-sfe-canvas-drop-indicator" data-testid="sfe-drop-indicator" />
      )}
    </Form>
  )
}

interface FieldOverlayProps {
  index: number
  field: EditorField
  isSelected: boolean
  isLast: boolean
  showIndicator: boolean
  rules: Rule[] | undefined
  onSelect: (id: string | null) => void
  onRemove: (id: string) => void
  onDuplicate: (id: string) => void
  onMoveUp: (id: string) => void
  onMoveDown: (id: string) => void
  onFieldDragStart: (id: string) => void
  onFieldDragEnd: () => void
  onFieldDrop: (e: DragEvent<HTMLDivElement>, beforeIndex: number) => void
  onIndicator: (i: number | null) => void
}

function FieldOverlay({
  index,
  field,
  isSelected,
  showIndicator,
  rules,
  onSelect,
  onRemove,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onFieldDragStart,
  onFieldDragEnd,
  onFieldDrop,
  onIndicator,
}: FieldOverlayProps) {
  const sfeLocale = useConfig().locale?.schemaFormEditor
  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    onIndicator(index)
  }

  function handleDragLeave() {
    onIndicator(null)
  }

  return (
    <>
      {showIndicator && (
        <div className="sg-sfe-canvas-drop-indicator" data-testid="sfe-drop-indicator" />
      )}
      <div
        className={['sg-sfe-canvas-field', isSelected ? 'sg-sfe-canvas-field-selected' : '']
          .filter(Boolean)
          .join(' ')}
        data-testid="sfe-canvas-field"
        data-field-id={field.id}
        data-field-name={field.name}
        draggable
        onClick={(e) => {
          e.stopPropagation()
          onSelect(field.id)
        }}
        onDragStart={(e) => {
          e.stopPropagation()
          e.dataTransfer.effectAllowed = 'move'
          e.dataTransfer.setData('text/plain', field.id)
          onFieldDragStart(field.id)
        }}
        onDragEnd={onFieldDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={(e) => onFieldDrop(e, index)}
      >
        {isSelected && (
          <div
            className="sg-sfe-canvas-field-toolbar"
            data-testid="sfe-field-toolbar"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="sg-sfe-canvas-field-toolbar-btn"
              data-testid="sfe-action-up"
              aria-label={sfeLocale?.moveFieldUp ?? 'Move field up'}
              onClick={() => onMoveUp(field.id)}
            >
              ↑
            </button>
            <button
              type="button"
              className="sg-sfe-canvas-field-toolbar-btn"
              data-testid="sfe-action-down"
              aria-label={sfeLocale?.moveFieldDown ?? 'Move field down'}
              onClick={() => onMoveDown(field.id)}
            >
              ↓
            </button>
            <button
              type="button"
              className="sg-sfe-canvas-field-toolbar-btn"
              data-testid="sfe-action-duplicate"
              aria-label={sfeLocale?.duplicateField ?? 'Duplicate field'}
              onClick={() => onDuplicate(field.id)}
            >
              ⎘
            </button>
            <button
              type="button"
              className="sg-sfe-canvas-field-toolbar-btn sg-sfe-canvas-field-toolbar-btn-danger"
              data-testid="sfe-action-delete"
              aria-label={sfeLocale?.deleteField ?? 'Delete field'}
              onClick={() => onRemove(field.id)}
            >
              ×
            </button>
          </div>
        )}
        <div className="sg-sfe-canvas-field-inner">
          <Field name={field.name} label={field.label} rules={rules}>
            {() => (
              <AutoField
                name={field.name}
                type={field.type}
                options={field.options}
                placeholder={field.placeholder}
                min={field.min}
                max={field.max}
              />
            )}
          </Field>
          {field.helpText && <span className="sg-sfe-canvas-field-help">{field.helpText}</span>}
        </div>
      </div>
    </>
  )
}
