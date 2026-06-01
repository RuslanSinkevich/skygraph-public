import { describe, it, expect } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import {
  SgSchemaFormEditor,
  SgSchemaFormEditorPalette,
  SgSchemaFormEditorCanvas,
  SgSchemaFormEditorInspector,
  SgSchemaFormEditorSchemaView,
  useSchemaEditor,
  jsonSchemaToEditorSchema,
  editorSchemaToJsonSchema,
  createEmptyEditorSchema,
  createFieldFromPaletteType,
  DEFAULT_PALETTE_ITEMS,
} from '../../components/complex/SchemaFormEditor'

describe('SchemaFormEditor adapter helpers', () => {
  it('createEmptyEditorSchema returns empty fields array', () => {
    const s = createEmptyEditorSchema()
    expect(s.fields).toEqual([])
  })

  it('createFieldFromPaletteType picks unique name', () => {
    const f = createFieldFromPaletteType('string', ['field1'])
    expect(f.name).not.toBe('field1')
  })

  it('createFieldFromPaletteType seeds options for select', () => {
    const f = createFieldFromPaletteType('select', [])
    expect(f.options?.length).toBe(2)
  })

  it('jsonSchemaToEditorSchema converts properties to fields', () => {
    const editor = jsonSchemaToEditorSchema({
      type: 'object',
      properties: {
        name: { type: 'string', title: 'Name' },
        age: { type: 'number' },
      },
      required: ['name'],
    })
    expect(editor.fields).toHaveLength(2)
    expect(editor.fields[0].name).toBe('name')
    expect(editor.fields[0].required).toBe(true)
    expect(editor.fields[1].type).toBe('number')
  })

  it('editorSchemaToJsonSchema round-trips simple shape', () => {
    const editor = jsonSchemaToEditorSchema({
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email' },
      },
      required: ['email'],
    })
    const out = editorSchemaToJsonSchema(editor)
    expect(out.type).toBe('object')
    expect(out.properties?.email.type).toBe('string')
    expect(out.properties?.email.format).toBe('email')
    expect(out.required).toContain('email')
  })

  it('editorSchemaToJsonSchema attaches enum from options', () => {
    const editor = createEmptyEditorSchema()
    editor.fields.push(createFieldFromPaletteType('select', []))
    const out = editorSchemaToJsonSchema(editor)
    const prop = Object.values(out.properties ?? {})[0]
    expect(prop?.enum?.length).toBe(2)
  })
})

describe('useSchemaEditor', () => {
  function harness<T>(setup: () => T) {
    let api!: T
    const Comp = defineComponent({
      setup() {
        api = setup()
        return () => h('div')
      },
    })
    const wrapper = mount(Comp)
    return { wrapper, api: () => api }
  }

  it('starts with empty schema by default', () => {
    const { api } = harness(() => useSchemaEditor())
    expect(api().state.value.schema.fields).toEqual([])
  })

  it('addField appends to fields and selects it', () => {
    const { api } = harness(() => useSchemaEditor())
    const f = createFieldFromPaletteType('string', [])
    api().addField(f)
    expect(api().state.value.schema.fields).toHaveLength(1)
    expect(api().state.value.selectedId).toBe(f.id)
  })

  it('removeField deletes a field by id', () => {
    const { api } = harness(() => useSchemaEditor())
    const f = createFieldFromPaletteType('string', [])
    api().addField(f)
    api().removeField(f.id)
    expect(api().state.value.schema.fields).toEqual([])
  })

  it('updateField patches fields by id', () => {
    const { api } = harness(() => useSchemaEditor())
    const f = createFieldFromPaletteType('string', [])
    api().addField(f)
    api().updateField(f.id, { label: 'New Label' })
    expect(api().state.value.schema.fields[0].label).toBe('New Label')
  })

  it('moveField reorders entries', () => {
    const { api } = harness(() => useSchemaEditor())
    const a = createFieldFromPaletteType('string', [])
    const b = createFieldFromPaletteType('string', [a.name])
    api().addField(a)
    api().addField(b)
    api().moveField(a.id, 1)
    expect(api().state.value.schema.fields[0].id).toBe(b.id)
    expect(api().state.value.schema.fields[1].id).toBe(a.id)
  })

  it('moveFieldUp / moveFieldDown work at boundaries', () => {
    const { api } = harness(() => useSchemaEditor())
    const a = createFieldFromPaletteType('string', [])
    const b = createFieldFromPaletteType('string', [a.name])
    api().addField(a)
    api().addField(b)
    api().moveFieldDown(a.id)
    expect(api().state.value.schema.fields[1].id).toBe(a.id)
    api().moveFieldUp(a.id)
    expect(api().state.value.schema.fields[0].id).toBe(a.id)
  })

  it('duplicateField creates a copy with a unique name', () => {
    const { api } = harness(() => useSchemaEditor())
    const f = createFieldFromPaletteType('string', [])
    api().addField(f)
    api().duplicateField(f.id)
    expect(api().state.value.schema.fields).toHaveLength(2)
    expect(api().state.value.schema.fields[1].name).not.toBe(f.name)
  })

  it('undo/redo restore prior state', () => {
    const { api } = harness(() => useSchemaEditor())
    const f = createFieldFromPaletteType('string', [])
    api().addField(f)
    api().undo()
    expect(api().state.value.schema.fields).toEqual([])
    api().redo()
    expect(api().state.value.schema.fields).toHaveLength(1)
  })

  it('canUndo/canRedo flags update with stack changes', () => {
    const { api } = harness(() => useSchemaEditor())
    expect(api().state.value.canUndo).toBe(false)
    api().addField(createFieldFromPaletteType('string', []))
    expect(api().state.value.canUndo).toBe(true)
    api().undo()
    expect(api().state.value.canRedo).toBe(true)
  })

  it('setSchema replaces the entire schema and clears selection', () => {
    const { api } = harness(() => useSchemaEditor())
    api().setSchema({ fields: [], title: 'New' })
    expect(api().state.value.schema.title).toBe('New')
    expect(api().state.value.selectedId).toBeNull()
  })
})

describe('SgSchemaFormEditorPalette', () => {
  it('renders default palette items', () => {
    const w = mount(SgSchemaFormEditorPalette)
    expect(w.findAll('.sg-sfe-palette-item').length).toBe(DEFAULT_PALETTE_ITEMS.length)
  })

  it('emits item-activate on click', async () => {
    const w = mount(SgSchemaFormEditorPalette)
    await w.find('.sg-sfe-palette-item').trigger('click')
    expect(w.emitted('itemActivate')).toBeTruthy()
  })

  it('emits item-activate on Enter keydown', async () => {
    const w = mount(SgSchemaFormEditorPalette)
    await w.find('.sg-sfe-palette-item').trigger('keydown', { key: 'Enter' })
    expect(w.emitted('itemActivate')).toBeTruthy()
  })

  it('respects custom palette items', () => {
    const items = [{ type: 'string' as const, label: 'Custom' }]
    const w = mount(SgSchemaFormEditorPalette, { props: { items } })
    expect(w.findAll('.sg-sfe-palette-item').length).toBe(1)
    expect(w.text()).toContain('Custom')
  })
})

describe('SgSchemaFormEditorCanvas', () => {
  function setup() {
    let api!: ReturnType<typeof useSchemaEditor>
    const Comp = defineComponent({
      components: { SgSchemaFormEditorCanvas },
      setup() {
        api = useSchemaEditor()
        return { store: api }
      },
      template: `<SgSchemaFormEditorCanvas :store="store" />`,
    })
    const wrapper = mount(Comp)
    return { wrapper, api: () => api }
  }

  it('renders empty placeholder when no fields', () => {
    const { wrapper } = setup()
    expect(wrapper.text().toLowerCase()).toContain('drop')
  })

  it('renders one item per field', async () => {
    const { wrapper, api } = setup()
    api().addField(createFieldFromPaletteType('string', []))
    api().addField(createFieldFromPaletteType('number', ['field1']))
    await flushPromises()
    expect(wrapper.findAll('[data-testid="sfe-canvas-field"], .sg-sfe-canvas-field').length).toBeGreaterThan(0)
  })
})

describe('SgSchemaFormEditorInspector', () => {
  function setup() {
    let api!: ReturnType<typeof useSchemaEditor>
    const Comp = defineComponent({
      components: { SgSchemaFormEditorInspector },
      setup() {
        api = useSchemaEditor()
        return { store: api }
      },
      template: `<SgSchemaFormEditorInspector :store="store" />`,
    })
    const wrapper = mount(Comp)
    return { wrapper, api: () => api }
  }

  it('shows empty placeholder when no field is selected', () => {
    const { wrapper } = setup()
    expect(wrapper.text().toLowerCase()).toContain('select')
  })

  it('renders inspector form when a field is selected', async () => {
    const { wrapper, api } = setup()
    const f = createFieldFromPaletteType('string', [])
    api().addField(f)
    api().setSelectedId(f.id)
    await flushPromises()
    expect(wrapper.findAll('input').length).toBeGreaterThan(0)
  })
})

describe('SgSchemaFormEditorSchemaView', () => {
  function setup() {
    let api!: ReturnType<typeof useSchemaEditor>
    const Comp = defineComponent({
      components: { SgSchemaFormEditorSchemaView },
      setup() {
        api = useSchemaEditor()
        return { store: api }
      },
      template: `<SgSchemaFormEditorSchemaView :store="store" />`,
    })
    const wrapper = mount(Comp)
    return { wrapper, api: () => api }
  }

  it('renders a code block', () => {
    const { wrapper } = setup()
    expect(wrapper.find('pre, code').exists()).toBe(true)
  })

  it('updates JSON when a field is added', async () => {
    const { wrapper, api } = setup()
    api().addField(createFieldFromPaletteType('string', []))
    await flushPromises()
    expect(wrapper.text()).toContain('properties')
  })
})

describe('SgSchemaFormEditor (full)', () => {
  it('mounts and renders palette + canvas + inspector', () => {
    const w = mount(SgSchemaFormEditor)
    expect(w.find('[data-testid="schema-form-editor"]').exists()).toBe(true)
    expect(w.find('[data-testid="sfe-palette"]').exists()).toBe(true)
  })

  it('renders toolbar with undo/redo buttons', () => {
    const w = mount(SgSchemaFormEditor)
    expect(w.find('[data-testid="sfe-undo"]').exists()).toBe(true)
    expect(w.find('[data-testid="sfe-redo"]').exists()).toBe(true)
  })

  it('emits change when a palette item is activated', async () => {
    const w = mount(SgSchemaFormEditor)
    await w.find('.sg-sfe-palette-item').trigger('click')
    expect(w.emitted('change')).toBeTruthy()
  })

  it('hides schema view when hideSchemaView is true', () => {
    const w = mount(SgSchemaFormEditor, { props: { hideSchemaView: true } })
    expect(w.find('[data-testid="sfe-bottom"]').exists()).toBe(false)
  })

  it('switches preview/schema bottom tabs', async () => {
    const w = mount(SgSchemaFormEditor)
    await w.find('[data-testid="sfe-tab-schema"]').trigger('click')
    expect(w.find('[data-testid="sfe-tab-schema"]').classes()).toContain('sg-sfe-tab-active')
  })
})
