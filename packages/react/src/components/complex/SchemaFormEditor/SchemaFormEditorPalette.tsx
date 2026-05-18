import type { CSSProperties, DragEvent } from 'react'
import type { FieldType } from '../AutoField/AutoField'

export interface PaletteItem {
  /** SkyGraph field type — passed through `dataTransfer` on drop. */
  type: FieldType
  /** Display label in the palette. */
  label: string
  /** One-line description shown under the label. */
  hint?: string
  /** Single-character glyph (rendered as plain text — no emoji). */
  glyph?: string
}

/**
 * Default catalogue rendered when the consumer doesn't pass `items`. The list
 * is intentionally flat (no categorisation) so the v1 editor stays focused.
 */
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

/**
 * Mime-type used by the palette → canvas drag transfer. Kept narrow so
 * external drops (e.g. files into the page) do not collide.
 */
export const PALETTE_DATA_TYPE = 'application/x-sg-sfe-palette-type'

export interface SchemaFormEditorPaletteProps {
  /** Override the default catalogue. */
  items?: PaletteItem[]
  /** Wrapper className (additive). */
  className?: string
  /** Wrapper inline style. */
  style?: CSSProperties
  /**
   * Optional fallback callback when the host environment does not support
   * HTML5 drag-and-drop (e.g. some test runners). The canvas listens for
   * `onClick` on palette items to add a field at the end as a graceful
   * degradation.
   */
  onItemActivate?: (type: FieldType) => void
}

export function SchemaFormEditorPalette({
  items = DEFAULT_PALETTE_ITEMS,
  className,
  style,
  onItemActivate,
}: SchemaFormEditorPaletteProps) {
  function handleDragStart(type: FieldType) {
    return (e: DragEvent<HTMLDivElement>) => {
      e.dataTransfer.setData(PALETTE_DATA_TYPE, type)
      e.dataTransfer.setData('text/plain', type)
      e.dataTransfer.effectAllowed = 'copy'
    }
  }

  return (
    <div
      className={['sg-sfe-palette', className].filter(Boolean).join(' ')}
      style={style}
      data-testid="sfe-palette"
    >
      <div className="sg-sfe-palette-title">Fields</div>
      <div className="sg-sfe-palette-list">
        {items.map((item) => (
          <div
            key={item.type}
            className="sg-sfe-palette-item"
            data-palette-type={item.type}
            draggable
            tabIndex={0}
            role="button"
            onDragStart={handleDragStart(item.type)}
            onClick={() => onItemActivate?.(item.type)}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && onItemActivate) {
                e.preventDefault()
                onItemActivate(item.type)
              }
            }}
          >
            <span className="sg-sfe-palette-item-glyph" aria-hidden="true">
              {item.glyph ?? '·'}
            </span>
            <span className="sg-sfe-palette-item-body">
              <span className="sg-sfe-palette-item-label">{item.label}</span>
              {item.hint && (
                <span className="sg-sfe-palette-item-hint">{item.hint}</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
