import React, { useState, useRef, useEffect, useCallback, type ReactNode } from 'react'
import { useConfig } from '../ConfigProvider'
import type { BaseComponentProps, InteractiveProps, SizableProps } from '../../types'

/** Props for a color swatch trigger with saturation/hue panel and optional presets. */
export interface ColorPickerProps extends BaseComponentProps, InteractiveProps, SizableProps {
  /** Controlled color as hex (#rrggbb) or rgb(...) string matching parse rules. */
  value?: string
  /** Initial color when uncontrolled. */
  defaultValue?: string
  /** Called when the color changes; receives string in the active format prop. */
  onChange?: (color: string) => void
  /** Optional grouped preset swatches (label + color strings). */
  presets?: Array<{ label: string; colors: string[] }>
  /** When true, show formatted text; when a function, render custom node beside swatch. */
  showText?: boolean | ((color: string) => ReactNode)
  /** String format used for display and onChange payload. */
  format?: 'hex' | 'rgb'
  /** Whether the panel opens on click or on hover (with a short leave delay). */
  trigger?: 'click' | 'hover'
  /** Controlled open state of the picker panel. */
  open?: boolean
  /** Called when the panel opens or closes. */
  onOpenChange?: (open: boolean) => void
  /**
   * Accessible name for the trigger button. The trigger only shows a color
   * swatch (and optional `showText`), so without a programmatic name axe
   * `button-name` flags the control. Provide either `aria-label` or
   * `aria-labelledby`; if `showText` renders text, that text is enough.
   */
  'aria-label'?: string
  /** Id(s) of the element(s) that label the trigger. Mirrors `aria-label`. */
  'aria-labelledby'?: string
}

/* ---- Color math helpers ---- */

interface HSV {
  h: number
  s: number
  v: number
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  const full =
    clean.length === 3 ? clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2] : clean
  const num = parseInt(full, 16)
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')
}

function rgbToHsv(r: number, g: number, b: number): HSV {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  const s = max === 0 ? 0 : d / max
  const v = max
  if (d !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }
  return { h, s, v }
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  let r = 0,
    g = 0,
    b = 0
  const i = Math.floor(h * 6)
  const f = h * 6 - i
  const p = v * (1 - s)
  const q = v * (1 - f * s)
  const t = v * (1 - (1 - f) * s)
  switch (i % 6) {
    case 0:
      r = v
      g = t
      b = p
      break
    case 1:
      r = q
      g = v
      b = p
      break
    case 2:
      r = p
      g = v
      b = t
      break
    case 3:
      r = p
      g = q
      b = v
      break
    case 4:
      r = t
      g = p
      b = v
      break
    case 5:
      r = v
      g = p
      b = q
      break
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)]
}

function hsvToHex(h: number, s: number, v: number): string {
  const [r, g, b] = hsvToRgb(h, s, v)
  return rgbToHex(r, g, b)
}

function formatColor(hex: string, format: 'hex' | 'rgb'): string {
  if (format === 'rgb') {
    const [r, g, b] = hexToRgb(hex)
    return `rgb(${r}, ${g}, ${b})`
  }
  return hex
}

function parseColor(input: string): string | null {
  const trimmed = input.trim()
  if (/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(trimmed)) {
    const clean = trimmed.replace('#', '')
    const full =
      clean.length === 3
        ? '#' + clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2]
        : trimmed
    return full.toLowerCase()
  }
  const rgbMatch = trimmed.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i)
  if (rgbMatch) {
    const [, rs, gs, bs] = rgbMatch
    const r = Math.min(255, parseInt(rs))
    const g = Math.min(255, parseInt(gs))
    const b = Math.min(255, parseInt(bs))
    return rgbToHex(r, g, b)
  }
  return null
}

const DEFAULT_COLOR = '#1677ff'

/* ---- Component ---- */

/**
 * Color picker with saturation/value square, hue strip, text input, and optional presets.
 * Supports click or hover trigger and controlled or internal open state.
 *
 * @default format - `'hex'`
 * @default trigger - `'click'`
 */
export function ColorPicker({
  value,
  defaultValue,
  onChange,
  presets,
  showText,
  size: sizeProp,
  disabled: disabledProp,
  format = 'hex',
  trigger = 'click',
  open: controlledOpen,
  onOpenChange,
  className,
  style,
  unstyled,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
}: ColorPickerProps) {
  const config = useConfig()
  const size = sizeProp ?? config.size ?? 'middle'
  const disabled = disabledProp ?? config.disabled ?? false
  const pickColorLabel = config.locale?.colorPicker?.pickColor ?? 'Pick color'

  const [internalColor, setInternalColor] = useState(value ?? defaultValue ?? DEFAULT_COLOR)
  const currentHex = (value ?? internalColor).toLowerCase()

  const [hsv, setHsv] = useState<HSV>(() => {
    const [r, g, b] = hexToRgb(currentHex)
    return rgbToHsv(r, g, b)
  })

  const [internalOpen, setInternalOpen] = useState(false)
  const isOpen = controlledOpen ?? internalOpen
  const [textInput, setTextInput] = useState(formatColor(currentHex, format))

  const wrapperRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const satPanelRef = useRef<HTMLDivElement>(null)
  const hueBarRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef<'sat' | 'hue' | null>(null)

  useEffect(() => {
    if (value) {
      const [r, g, b] = hexToRgb(value)
      setHsv(rgbToHsv(r, g, b))
      setTextInput(formatColor(value, format))
    }
  }, [value, format])

  const emitChange = useCallback(
    (hex: string) => {
      setInternalColor(hex)
      setTextInput(formatColor(hex, format))
      onChange?.(formatColor(hex, format))
    },
    [format, onChange],
  )

  const setOpenState = (v: boolean) => {
    setInternalOpen(v)
    onOpenChange?.(v)
  }

  /* Close on outside click */
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpenState(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  /* Trigger handlers */
  const handleTriggerClick = () => {
    if (disabled || trigger !== 'click') return
    setOpenState(!isOpen)
  }

  const handleMouseEnter = () => {
    if (disabled || trigger !== 'hover') return
    clearTimeout(timerRef.current)
    setOpenState(true)
  }

  const handleMouseLeave = () => {
    if (trigger !== 'hover') return
    timerRef.current = setTimeout(() => setOpenState(false), 200)
  }

  /* Saturation/Brightness panel drag */
  const handleSatPointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    draggingRef.current = 'sat'
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    updateSat(e.nativeEvent)
  }

  const handleSatPointerMove = (e: React.PointerEvent) => {
    if (draggingRef.current !== 'sat') return
    updateSat(e.nativeEvent)
  }

  const handleSatPointerUp = () => {
    draggingRef.current = null
  }

  const updateSat = (e: PointerEvent) => {
    if (!satPanelRef.current) return
    const rect = satPanelRef.current.getBoundingClientRect()
    const s = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const v = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height))
    const next = { ...hsv, s, v }
    setHsv(next)
    emitChange(hsvToHex(next.h, next.s, next.v))
  }

  /* Hue bar drag */
  const handleHuePointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    draggingRef.current = 'hue'
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    updateHue(e.nativeEvent)
  }

  const handleHuePointerMove = (e: React.PointerEvent) => {
    if (draggingRef.current !== 'hue') return
    updateHue(e.nativeEvent)
  }

  const handleHuePointerUp = () => {
    draggingRef.current = null
  }

  const updateHue = (e: PointerEvent) => {
    if (!hueBarRef.current) return
    const rect = hueBarRef.current.getBoundingClientRect()
    const h = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const next = { ...hsv, h }
    setHsv(next)
    emitChange(hsvToHex(next.h, next.s, next.v))
  }

  /* Text input */
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setTextInput(val)
    const parsed = parseColor(val)
    if (parsed) {
      const [r, g, b] = hexToRgb(parsed)
      setHsv(rgbToHsv(r, g, b))
      emitChange(parsed)
    }
  }

  /* Preset click */
  const handlePresetClick = (color: string) => {
    const parsed = parseColor(color)
    if (!parsed) return
    const [r, g, b] = hexToRgb(parsed)
    setHsv(rgbToHsv(r, g, b))
    emitChange(parsed)
  }

  /* Render text next to swatch */
  const renderText = () => {
    if (!showText) return null
    if (typeof showText === 'function') return showText(formatColor(currentHex, format))
    return (
      <span className={unstyled ? undefined : 'sg-colorpicker-text'}>
        {formatColor(currentHex, format)}
      </span>
    )
  }

  const hueColor = hsvToHex(hsv.h, 1, 1)

  if (unstyled) {
    return (
      <div
        ref={wrapperRef}
        className={className}
        style={{ ...style, position: 'relative', display: 'inline-block' }}
      >
        <button
          type="button"
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-label={ariaLabel ?? pickColorLabel}
          aria-labelledby={ariaLabelledBy}
          onClick={handleTriggerClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <span
            style={{ display: 'inline-block', width: 16, height: 16, background: currentHex }}
          />
          {renderText()}
        </button>
        {isOpen && (
          <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            <div
              ref={satPanelRef}
              style={{
                width: 200,
                height: 150,
                position: 'relative',
                background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueColor})`,
              }}
              onPointerDown={handleSatPointerDown}
              onPointerMove={handleSatPointerMove}
              onPointerUp={handleSatPointerUp}
            />
            <div
              ref={hueBarRef}
              style={{
                width: 200,
                height: 12,
                background:
                  'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)',
              }}
              onPointerDown={handleHuePointerDown}
              onPointerMove={handleHuePointerMove}
              onPointerUp={handleHuePointerUp}
            />
            <input value={textInput} onChange={handleTextChange} />
            {presets?.map((group) => (
              <div key={group.label}>
                <div>{group.label}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {group.colors.map((c) => (
                    <button
                      key={c}
                      style={{ width: 16, height: 16, background: c }}
                      onClick={() => handlePresetClick(c)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const sizeClass = `sg-colorpicker-${size}`

  return (
    <div
      ref={wrapperRef}
      className={[
        'sg-colorpicker-wrapper',
        sizeClass,
        disabled ? 'sg-colorpicker-disabled' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Trigger */}
      <button
        type="button"
        className="sg-colorpicker-trigger"
        onClick={handleTriggerClick}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={ariaLabel ?? pickColorLabel}
        aria-labelledby={ariaLabelledBy}
      >
        <span className="sg-colorpicker-swatch" style={{ background: currentHex }} />
        {renderText()}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="sg-colorpicker-dropdown"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Saturation / Brightness panel */}
          <div
            ref={satPanelRef}
            className="sg-colorpicker-saturation"
            style={{
              background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueColor})`,
            }}
            onPointerDown={handleSatPointerDown}
            onPointerMove={handleSatPointerMove}
            onPointerUp={handleSatPointerUp}
          >
            <div
              className="sg-colorpicker-cursor"
              style={{
                left: `${hsv.s * 100}%`,
                top: `${(1 - hsv.v) * 100}%`,
                background: currentHex,
              }}
            />
          </div>

          {/* Hue bar */}
          <div
            ref={hueBarRef}
            className="sg-colorpicker-hue"
            onPointerDown={handleHuePointerDown}
            onPointerMove={handleHuePointerMove}
            onPointerUp={handleHuePointerUp}
          >
            <div className="sg-colorpicker-hue-cursor" style={{ left: `${hsv.h * 100}%` }} />
          </div>

          {/* Color preview + text input */}
          <div className="sg-colorpicker-input-row">
            <span className="sg-colorpicker-preview" style={{ background: currentHex }} />
            <input
              className="sg-colorpicker-input"
              value={textInput}
              onChange={handleTextChange}
              spellCheck={false}
            />
          </div>

          {/* Presets */}
          {presets?.map((group) => (
            <div className="sg-colorpicker-preset-group" key={group.label}>
              <div className="sg-colorpicker-preset-label">{group.label}</div>
              <div className="sg-colorpicker-preset-grid">
                {group.colors.map((c) => (
                  <button
                    key={c}
                    className="sg-colorpicker-preset-color"
                    style={{ background: c }}
                    onClick={() => handlePresetClick(c)}
                    title={c}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
