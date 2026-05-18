import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import type { SchemaEditorStore } from './useSchemaEditor'
import type { EditorField } from './types'
import type { AutoFieldOption, FieldType } from '../AutoField/AutoField'
import { useConfig } from '../../ConfigProvider'

export interface SchemaFormEditorInspectorProps {
  store: SchemaEditorStore
  className?: string
  style?: CSSProperties
}

const TYPES_WITH_OPTIONS: FieldType[] = ['select', 'radio', 'multiselect']
const TYPES_WITH_NUMERIC_RANGE: FieldType[] = ['number', 'slider', 'rate']
const TYPES_WITH_LENGTH_RANGE: FieldType[] = ['string', 'textarea', 'password', 'email', 'url']

export function SchemaFormEditorInspector({
  store,
  className,
  style,
}: SchemaFormEditorInspectorProps) {
  const { state, updateField } = store

  const selected = useMemo<EditorField | null>(() => {
    const id = state.selectedId
    if (!id) return null
    return state.schema.fields.find((f) => f.id === id) ?? null
  }, [state.selectedId, state.schema.fields])

  if (!selected) {
    return (
      <div
        className={['sg-sfe-inspector', className].filter(Boolean).join(' ')}
        style={style}
        data-testid="sfe-inspector"
      >
        <div className="sg-sfe-inspector-empty" data-testid="sfe-inspector-empty">
          Select a field on the canvas to edit its properties.
        </div>
      </div>
    )
  }

  const isOptionsType = TYPES_WITH_OPTIONS.includes(selected.type)
  const isNumericType = TYPES_WITH_NUMERIC_RANGE.includes(selected.type)
  const isLengthType = TYPES_WITH_LENGTH_RANGE.includes(selected.type)
  const isBooleanType = selected.type === 'boolean' || selected.type === 'switch'

  function patch(p: Partial<EditorField>) {
    updateField(selected!.id, p)
  }

  return (
    <div
      className={['sg-sfe-inspector', className].filter(Boolean).join(' ')}
      style={style}
      data-testid="sfe-inspector"
    >
      <div className="sg-sfe-inspector-title">Field properties</div>

      <Row label="Name">
        <input
          className="sg-sfe-inspector-input"
          data-testid="sfe-inspector-name"
          value={selected.name}
          onChange={(e) => patch({ name: e.target.value })}
        />
      </Row>

      <Row label="Label">
        <input
          className="sg-sfe-inspector-input"
          data-testid="sfe-inspector-label"
          value={selected.label}
          onChange={(e) => patch({ label: e.target.value })}
        />
      </Row>

      <Row label="Type">
        <input
          className="sg-sfe-inspector-input"
          data-testid="sfe-inspector-type"
          value={selected.type}
          readOnly
          aria-readonly="true"
        />
      </Row>

      <Row label="Required">
        <label className="sg-sfe-inspector-checkbox">
          <input
            type="checkbox"
            data-testid="sfe-inspector-required"
            checked={!!selected.required}
            onChange={(e) => patch({ required: e.target.checked })}
          />
          <span>Make this field required</span>
        </label>
      </Row>

      <Row label="Placeholder">
        <input
          className="sg-sfe-inspector-input"
          data-testid="sfe-inspector-placeholder"
          value={selected.placeholder ?? ''}
          onChange={(e) => patch({ placeholder: e.target.value || undefined })}
        />
      </Row>

      <Row label="Help text">
        <input
          className="sg-sfe-inspector-input"
          data-testid="sfe-inspector-help"
          value={selected.helpText ?? ''}
          onChange={(e) => patch({ helpText: e.target.value || undefined })}
        />
      </Row>

      <Row label="Default">
        <input
          className="sg-sfe-inspector-input"
          data-testid="sfe-inspector-default"
          value={
            selected.defaultValue === undefined
              ? ''
              : isBooleanType
                ? String(selected.defaultValue)
                : String(selected.defaultValue)
          }
          onChange={(e) => {
            const raw = e.target.value
            if (raw === '') return patch({ defaultValue: undefined })
            if (isBooleanType) return patch({ defaultValue: raw === 'true' })
            if (isNumericType) {
              const n = Number(raw)
              return patch({ defaultValue: Number.isFinite(n) ? n : raw })
            }
            patch({ defaultValue: raw })
          }}
        />
      </Row>

      {(isLengthType || isNumericType) && (
        <Row label={isLengthType ? 'Min length' : 'Min'}>
          <input
            className="sg-sfe-inspector-input"
            data-testid="sfe-inspector-min"
            type="number"
            value={selected.min ?? ''}
            onChange={(e) => {
              const raw = e.target.value
              patch({ min: raw === '' ? undefined : Number(raw) })
            }}
          />
        </Row>
      )}

      {(isLengthType || isNumericType) && (
        <Row label={isLengthType ? 'Max length' : 'Max'}>
          <input
            className="sg-sfe-inspector-input"
            data-testid="sfe-inspector-max"
            type="number"
            value={selected.max ?? ''}
            onChange={(e) => {
              const raw = e.target.value
              patch({ max: raw === '' ? undefined : Number(raw) })
            }}
          />
        </Row>
      )}

      {isLengthType && (
        <Row label="Pattern (RegExp)">
          <input
            className="sg-sfe-inspector-input"
            data-testid="sfe-inspector-pattern"
            value={selected.pattern ?? ''}
            placeholder="^[A-Z].*"
            onChange={(e) => patch({ pattern: e.target.value || undefined })}
          />
        </Row>
      )}

      {isOptionsType && (
        <OptionsEditor
          options={selected.options ?? []}
          onChange={(options) => patch({ options })}
        />
      )}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="sg-sfe-inspector-row" data-testid="sfe-inspector-row">
      <label className="sg-sfe-inspector-row-label">{label}</label>
      <div className="sg-sfe-inspector-row-control">{children}</div>
    </div>
  )
}

function OptionsEditor({
  options,
  onChange,
}: {
  options: AutoFieldOption[]
  onChange: (next: AutoFieldOption[]) => void
}) {
  const sfeLocale = useConfig().locale?.schemaFormEditor
  function update(idx: number, patch: Partial<AutoFieldOption>) {
    const copy = options.map((o) => ({ ...o }))
    copy[idx] = { ...copy[idx]!, ...patch }
    onChange(copy)
  }
  function remove(idx: number) {
    const copy = options.slice()
    copy.splice(idx, 1)
    onChange(copy)
  }
  function add() {
    const next: AutoFieldOption = {
      value: `option${options.length + 1}`,
      label: `Option ${options.length + 1}`,
    }
    onChange([...options, next])
  }

  return (
    <div className="sg-sfe-inspector-options" data-testid="sfe-inspector-options">
      <div className="sg-sfe-inspector-row-label">Options</div>
      {options.map((opt, idx) => (
        <div key={idx} className="sg-sfe-inspector-option">
          <input
            className="sg-sfe-inspector-input"
            data-testid="sfe-inspector-option-label"
            value={opt.label}
            placeholder={sfeLocale?.optionLabelPlaceholder ?? 'Label'}
            onChange={(e) => update(idx, { label: e.target.value })}
          />
          <input
            className="sg-sfe-inspector-input"
            data-testid="sfe-inspector-option-value"
            value={String(opt.value)}
            placeholder={sfeLocale?.optionValuePlaceholder ?? 'Value'}
            onChange={(e) => update(idx, { value: e.target.value })}
          />
          <button
            type="button"
            className="sg-sfe-inspector-option-remove"
            aria-label={sfeLocale?.removeOption ?? 'Remove option'}
            onClick={() => remove(idx)}
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        className="sg-sfe-inspector-option-add"
        onClick={add}
        data-testid="sfe-inspector-option-add"
      >
        + Add option
      </button>
    </div>
  )
}
