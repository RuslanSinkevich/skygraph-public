import type { FieldType } from '../SchemaForm/AutoField.vue'

export interface PaletteItem {
  type: FieldType
  label: string
  hint?: string
  glyph?: string
}

export const DEFAULT_PALETTE_ITEMS: PaletteItem[] = [
  { type: 'string', label: 'Input', hint: 'Single-line text', glyph: 'T' },
  { type: 'textarea', label: 'Textarea', hint: 'Multi-line text', glyph: '¶' },
  { type: 'number', label: 'Number', hint: 'Numeric input', glyph: '#' },
  { type: 'select', label: 'Select', hint: 'Dropdown choice', glyph: '▾' },
  { type: 'radio', label: 'Radio', hint: 'Single choice', glyph: '◉' },
  { type: 'boolean', label: 'Checkbox', hint: 'Boolean toggle', glyph: '☐' },
  { type: 'switch', label: 'Switch', hint: 'On / off toggle', glyph: '⌨' },
  { type: 'date', label: 'Date', hint: 'Calendar picker', glyph: '📅' },
  { type: 'time', label: 'Time', hint: 'Clock picker', glyph: '🕒' },
  { type: 'slider', label: 'Slider', hint: 'Numeric range', glyph: '═' },
  { type: 'rate', label: 'Rate', hint: 'Star rating', glyph: '★' },
  { type: 'color', label: 'Color', hint: 'Color picker', glyph: '◐' },
  { type: 'email', label: 'Email', hint: 'Email input', glyph: '@' },
  { type: 'url', label: 'URL', hint: 'Link input', glyph: '↗' },
  { type: 'password', label: 'Password', hint: 'Masked input', glyph: '✱' },
  { type: 'file', label: 'File', hint: 'File upload', glyph: '⇪' },
]

export const PALETTE_DATA_TYPE = 'application/x-sg-sfe-palette-type'
