import { describe, it, expect } from 'vitest'
import { render, act, renderHook, fireEvent } from '@testing-library/react'
import {
  SchemaFormEditor,
  SchemaFormEditorPalette,
  DEFAULT_PALETTE_ITEMS,
  PALETTE_DATA_TYPE,
  useSchemaEditor,
  jsonSchemaToEditorSchema,
  editorSchemaToJsonSchema,
  createFieldFromPaletteType,
} from '../index'
import type { EditorSchema, JSONSchema } from '../index'

const sampleSchema: EditorSchema = {
  fields: [
    { id: 'a', name: 'name', label: 'Name', type: 'string', required: true },
    { id: 'b', name: 'age', label: 'Age', type: 'number', min: 0, max: 150 },
    { id: 'c', name: 'role', label: 'Role', type: 'select', options: [
      { value: 'admin', label: 'Admin' },
      { value: 'user', label: 'User' },
    ] },
  ],
}

function makeDataTransfer(payload: Record<string, string>): DataTransfer {
  const types = Object.keys(payload)
  return {
    types,
    getData: (k: string) => payload[k] ?? '',
    setData: () => {
      /* noop */
    },
    dropEffect: 'copy',
    effectAllowed: 'all',
    files: [] as unknown as FileList,
    items: [] as unknown as DataTransferItemList,
    clearData: () => {
      /* noop */
    },
    setDragImage: () => {
      /* noop */
    },
  } as unknown as DataTransfer
}

describe('SchemaFormEditorPalette', () => {
  it('renders all default palette items (10+)', () => {
    expect(DEFAULT_PALETTE_ITEMS.length).toBeGreaterThanOrEqual(10)
    const { container } = render(<SchemaFormEditorPalette />)
    const items = container.querySelectorAll('[data-palette-type]')
    expect(items.length).toBe(DEFAULT_PALETTE_ITEMS.length)
  })

  it('every palette item is draggable', () => {
    const { container } = render(<SchemaFormEditorPalette />)
    const items = Array.from(
      container.querySelectorAll<HTMLElement>('[data-palette-type]'),
    )
    for (const el of items) {
      expect(el.getAttribute('draggable')).toBe('true')
    }
  })

  it('clicking a palette item calls onItemActivate (keyboard fallback)', () => {
    let triggered: string | null = null
    const { container } = render(
      <SchemaFormEditorPalette onItemActivate={(t) => (triggered = t)} />,
    )
    const item = container.querySelector('[data-palette-type="number"]') as HTMLElement
    fireEvent.click(item)
    expect(triggered).toBe('number')
  })
})

describe('useSchemaEditor — store API', () => {
  it('starts with an empty schema by default', () => {
    const { result } = renderHook(() => useSchemaEditor())
    expect(result.current.state.schema.fields.length).toBe(0)
    expect(result.current.state.canUndo).toBe(false)
    expect(result.current.state.canRedo).toBe(false)
  })

  it('addField appends a field and selects it', () => {
    const { result } = renderHook(() => useSchemaEditor())
    act(() => {
      result.current.addField(createFieldFromPaletteType('string', []))
    })
    expect(result.current.state.schema.fields.length).toBe(1)
    expect(result.current.state.selectedId).toBe(result.current.state.schema.fields[0]!.id)
  })

  it('updateField patches name / label / required', () => {
    const { result } = renderHook(() => useSchemaEditor({ initialSchema: sampleSchema }))
    act(() => {
      result.current.updateField('a', { name: 'fullName', label: 'Full Name', required: false })
    })
    const updated = result.current.state.schema.fields.find((f) => f.id === 'a')!
    expect(updated.name).toBe('fullName')
    expect(updated.label).toBe('Full Name')
    expect(updated.required).toBe(false)
  })

  it('moveFieldUp / moveFieldDown reorder fields', () => {
    const { result } = renderHook(() => useSchemaEditor({ initialSchema: sampleSchema }))
    act(() => {
      result.current.moveFieldDown('a')
    })
    expect(result.current.state.schema.fields.map((f) => f.id)).toEqual(['b', 'a', 'c'])
    act(() => {
      result.current.moveFieldUp('c')
    })
    expect(result.current.state.schema.fields.map((f) => f.id)).toEqual(['b', 'c', 'a'])
  })

  it('removeField deletes a field and clears selection', () => {
    const { result } = renderHook(() => useSchemaEditor({ initialSchema: sampleSchema }))
    act(() => {
      result.current.setSelectedId('b')
    })
    act(() => {
      result.current.removeField('b')
    })
    expect(result.current.state.schema.fields.find((f) => f.id === 'b')).toBeUndefined()
    expect(result.current.state.selectedId).toBeNull()
  })

  it('duplicateField clones with a unique name and id', () => {
    const { result } = renderHook(() => useSchemaEditor({ initialSchema: sampleSchema }))
    act(() => {
      result.current.duplicateField('a')
    })
    const fields = result.current.state.schema.fields
    expect(fields.length).toBe(4)
    const names = fields.map((f) => f.name)
    expect(new Set(names).size).toBe(names.length)
    expect(names).toContain('name_copy')
  })

  it('undo / redo round-trip an addition', () => {
    const { result } = renderHook(() => useSchemaEditor())
    act(() => {
      result.current.addField(createFieldFromPaletteType('string', []))
    })
    expect(result.current.state.schema.fields.length).toBe(1)
    expect(result.current.state.canUndo).toBe(true)
    act(() => {
      result.current.undo()
    })
    expect(result.current.state.schema.fields.length).toBe(0)
    expect(result.current.state.canRedo).toBe(true)
    act(() => {
      result.current.redo()
    })
    expect(result.current.state.schema.fields.length).toBe(1)
  })

  it('setSchema replaces the entire schema and clears selection', () => {
    const { result } = renderHook(() => useSchemaEditor())
    act(() => {
      result.current.setSchema(sampleSchema)
    })
    expect(result.current.state.schema.fields.length).toBe(3)
    expect(result.current.state.selectedId).toBeNull()
  })

  it('onChange fires after every successful mutation', () => {
    const calls: number[] = []
    const { result } = renderHook(() =>
      useSchemaEditor({ onChange: (s) => calls.push(s.fields.length) }),
    )
    act(() => {
      result.current.addField(createFieldFromPaletteType('number', []))
    })
    act(() => {
      result.current.addField(createFieldFromPaletteType('string', ['field1']))
    })
    expect(calls).toEqual([1, 2])
  })
})

describe('jsonSchema adapter', () => {
  it('round-trips a schema (json → editor → json) preserving field count + required', () => {
    const json: JSONSchema = {
      type: 'object',
      properties: {
        name: { type: 'string', title: 'Name', minLength: 2 },
        age: { type: 'number', minimum: 0 },
      },
      required: ['name'],
    }
    const editor = jsonSchemaToEditorSchema(json)
    expect(editor.fields.length).toBe(2)
    const back = editorSchemaToJsonSchema(editor)
    expect(Object.keys(back.properties ?? {})).toEqual(['name', 'age'])
    expect(back.required).toEqual(['name'])
  })
})

describe('SchemaFormEditor — wiring', () => {
  it('renders the palette, canvas, and inspector', () => {
    const { container, getByTestId } = render(<SchemaFormEditor />)
    expect(getByTestId('sfe-palette')).toBeDefined()
    expect(getByTestId('sfe-canvas')).toBeDefined()
    expect(getByTestId('sfe-inspector')).toBeDefined()
    expect(container.querySelector('.sg-sfe')).not.toBeNull()
  })

  it('shows the empty CTA when there are no fields', () => {
    const { getByTestId } = render(<SchemaFormEditor emptyText="Drop a field here" />)
    const empty = getByTestId('sfe-canvas-empty')
    expect(empty.textContent).toContain('Drop a field here')
  })

  it('inspector is empty until a field is selected', () => {
    const { getByTestId, queryByTestId } = render(
      <SchemaFormEditor initialSchema={sampleSchema} />,
    )
    expect(getByTestId('sfe-inspector-empty')).toBeDefined()
    // Click the first canvas field
    const fieldEl = document.querySelector('[data-field-id="a"]') as HTMLElement
    expect(fieldEl).not.toBeNull()
    fireEvent.click(fieldEl)
    expect(queryByTestId('sfe-inspector-empty')).toBeNull()
    expect(getByTestId('sfe-inspector-name')).toBeDefined()
  })

  it('selecting a field shows the toolbar with edit / move / delete actions', () => {
    const { getByTestId } = render(<SchemaFormEditor initialSchema={sampleSchema} />)
    const fieldEl = document.querySelector('[data-field-id="b"]') as HTMLElement
    fireEvent.click(fieldEl)
    expect(getByTestId('sfe-action-up')).toBeDefined()
    expect(getByTestId('sfe-action-down')).toBeDefined()
    expect(getByTestId('sfe-action-duplicate')).toBeDefined()
    expect(getByTestId('sfe-action-delete')).toBeDefined()
  })

  it('updating the inspector "name" propagates to the canvas', () => {
    const { getByTestId } = render(<SchemaFormEditor initialSchema={sampleSchema} />)
    const fieldEl = document.querySelector('[data-field-id="a"]') as HTMLElement
    fireEvent.click(fieldEl)
    const nameInput = getByTestId('sfe-inspector-name') as HTMLInputElement
    fireEvent.change(nameInput, { target: { value: 'fullName' } })
    expect(document.querySelector('[data-field-id="a"]')!.getAttribute('data-field-name')).toBe(
      'fullName',
    )
  })

  it('updating the inspector "required" updates the schema', () => {
    let lastSchema: EditorSchema | null = null
    const { getByTestId } = render(
      <SchemaFormEditor
        initialSchema={sampleSchema}
        onChange={(s) => (lastSchema = s)}
      />,
    )
    const fieldEl = document.querySelector('[data-field-id="b"]') as HTMLElement
    fireEvent.click(fieldEl)
    const required = getByTestId('sfe-inspector-required') as HTMLInputElement
    fireEvent.click(required)
    const updated = lastSchema!.fields.find((f) => f.id === 'b')!
    expect(updated.required).toBe(true)
  })

  it('clicking move-up reorders fields on the canvas', () => {
    const { getByTestId } = render(<SchemaFormEditor initialSchema={sampleSchema} />)
    fireEvent.click(document.querySelector('[data-field-id="b"]') as HTMLElement)
    fireEvent.click(getByTestId('sfe-action-up'))
    const ids = Array.from(document.querySelectorAll('[data-field-id]')).map((el) =>
      el.getAttribute('data-field-id'),
    )
    expect(ids).toEqual(['b', 'a', 'c'])
  })

  it('clicking move-down reorders fields on the canvas', () => {
    const { getByTestId } = render(<SchemaFormEditor initialSchema={sampleSchema} />)
    fireEvent.click(document.querySelector('[data-field-id="b"]') as HTMLElement)
    fireEvent.click(getByTestId('sfe-action-down'))
    const ids = Array.from(document.querySelectorAll('[data-field-id]')).map((el) =>
      el.getAttribute('data-field-id'),
    )
    expect(ids).toEqual(['a', 'c', 'b'])
  })

  it('delete action removes the selected field', () => {
    const { getByTestId } = render(<SchemaFormEditor initialSchema={sampleSchema} />)
    fireEvent.click(document.querySelector('[data-field-id="b"]') as HTMLElement)
    fireEvent.click(getByTestId('sfe-action-delete'))
    expect(document.querySelector('[data-field-id="b"]')).toBeNull()
    expect(document.querySelectorAll('[data-field-id]').length).toBe(2)
  })

  it('duplicate action adds a copy after the selected field', () => {
    const { getByTestId } = render(<SchemaFormEditor initialSchema={sampleSchema} />)
    fireEvent.click(document.querySelector('[data-field-id="a"]') as HTMLElement)
    fireEvent.click(getByTestId('sfe-action-duplicate'))
    expect(document.querySelectorAll('[data-field-id]').length).toBe(4)
  })

  it('toolbar undo / redo cycles a delete', () => {
    const { getByTestId } = render(<SchemaFormEditor initialSchema={sampleSchema} />)
    fireEvent.click(document.querySelector('[data-field-id="b"]') as HTMLElement)
    fireEvent.click(getByTestId('sfe-action-delete'))
    expect(document.querySelector('[data-field-id="b"]')).toBeNull()
    fireEvent.click(getByTestId('sfe-undo'))
    expect(document.querySelector('[data-field-id="b"]')).not.toBeNull()
    fireEvent.click(getByTestId('sfe-redo'))
    expect(document.querySelector('[data-field-id="b"]')).toBeNull()
  })

  it('drop from palette mime type onto the canvas adds a new field', () => {
    const { getByTestId } = render(<SchemaFormEditor />)
    const canvas = getByTestId('sfe-canvas')
    const dt = makeDataTransfer({ [PALETTE_DATA_TYPE]: 'number' })
    fireEvent.dragOver(canvas, { dataTransfer: dt })
    fireEvent.drop(canvas, { dataTransfer: dt })
    expect(document.querySelectorAll('[data-field-id]').length).toBe(1)
    const fieldName = document.querySelector('[data-field-id]')!.getAttribute('data-field-name')
    expect(fieldName).toBeTruthy()
  })

  it('schema view tab renders the current JSON Schema', () => {
    const { getByTestId } = render(<SchemaFormEditor initialSchema={sampleSchema} />)
    fireEvent.click(getByTestId('sfe-tab-schema'))
    const view = getByTestId('sfe-schema-view')
    expect(view.textContent).toContain('"properties"')
    expect(view.textContent).toContain('"name"')
  })

  it('importing a schema via setSchema renders the new fields', () => {
    function Harness() {
      const store = useSchemaEditor()
      return (
        <div>
          <button data-testid="harness-import" onClick={() => store.setSchema(sampleSchema)}>
            import
          </button>
          <SchemaFormEditor store={store} />
        </div>
      )
    }
    const { getByTestId } = render(<Harness />)
    expect(document.querySelectorAll('[data-field-id]').length).toBe(0)
    fireEvent.click(getByTestId('harness-import'))
    expect(document.querySelectorAll('[data-field-id]').length).toBe(3)
    expect(document.querySelector('[data-field-id="a"]')).not.toBeNull()
  })
})
