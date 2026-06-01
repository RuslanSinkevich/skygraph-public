<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useConfig } from './ConfigProvider.vue'

export interface ColorPickerProps {
  /** v-model binding (Vue idiom). */
  modelValue?: string
  /** Compat alias for `modelValue`. */
  value?: string
  /** Initial value when uncontrolled. */
  defaultValue?: string
  /** Optional preset swatches grouped by label. */
  presets?: Array<{ label: string; colors: string[] }>
  /** When true, show formatted text beside the swatch. */
  showText?: boolean
  /** Output format. */
  format?: 'hex' | 'rgb'
  /** Trigger interaction. */
  trigger?: 'click' | 'hover'
  /** Controlled open state of the picker panel. */
  open?: boolean
  /** Disables interaction. */
  disabled?: boolean
  /** Size token. */
  size?: 'small' | 'middle' | 'large'
  /** Strips built-in styling. */
  unstyled?: boolean
}

const props = withDefaults(defineProps<ColorPickerProps>(), {
  format: 'hex',
  trigger: 'click',
  size: 'middle',
  disabled: false,
  open: undefined,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
  (e: 'openChange', open: boolean): void
}>()

const cfg = useConfig()
const pickColorLabel = computed(() => cfg.value.locale?.colorPicker?.pickColor ?? 'Pick color')

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

function formatColor(hex: string, fmt: 'hex' | 'rgb'): string {
  if (fmt === 'rgb') {
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
  const m = trimmed.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i)
  if (m) {
    const r = Math.min(255, parseInt(m[1]))
    const g = Math.min(255, parseInt(m[2]))
    const b = Math.min(255, parseInt(m[3]))
    return rgbToHex(r, g, b)
  }
  return null
}

const DEFAULT_COLOR = '#1677ff'

const internal = ref<string>(
  (props.modelValue ?? props.value ?? props.defaultValue ?? DEFAULT_COLOR).toLowerCase(),
)

watch(
  () => props.modelValue ?? props.value,
  (v) => {
    if (v !== undefined) internal.value = v.toLowerCase()
  },
)

const current = computed(() => (props.modelValue ?? props.value ?? internal.value).toLowerCase())
const internalOpen = ref(false)
const isOpen = computed(() => props.open ?? internalOpen.value)

const wrapperRef = ref<HTMLDivElement | null>(null)
const satPanelRef = ref<HTMLDivElement | null>(null)
const hueBarRef = ref<HTMLDivElement | null>(null)
const textInput = ref(formatColor(current.value, props.format))

const hsv = ref<HSV>(
  ((): HSV => {
    const [r, g, b] = hexToRgb(current.value)
    return rgbToHsv(r, g, b)
  })(),
)

watch(current, (v) => {
  textInput.value = formatColor(v, props.format)
  const [r, g, b] = hexToRgb(v)
  hsv.value = rgbToHsv(r, g, b)
})

watch(
  () => props.format,
  (f) => {
    textInput.value = formatColor(current.value, f)
  },
)

let hoverTimer: ReturnType<typeof setTimeout> | undefined

function setOpenState(v: boolean) {
  internalOpen.value = v
  emit('openChange', v)
}

function emitChange(hex: string) {
  internal.value = hex
  textInput.value = formatColor(hex, props.format)
  const out = formatColor(hex, props.format)
  emit('update:modelValue', out)
  emit('change', out)
}

function handleTriggerClick() {
  if (props.disabled || props.trigger !== 'click') return
  setOpenState(!isOpen.value)
}

function handleMouseEnter() {
  if (props.disabled || props.trigger !== 'hover') return
  if (hoverTimer) clearTimeout(hoverTimer)
  setOpenState(true)
}

function handleMouseLeave() {
  if (props.trigger !== 'hover') return
  hoverTimer = setTimeout(() => setOpenState(false), 200)
}

function handleTextInput(e: Event) {
  const val = (e.target as HTMLInputElement).value
  textInput.value = val
  const parsed = parseColor(val)
  if (parsed) {
    const [r, g, b] = hexToRgb(parsed)
    hsv.value = rgbToHsv(r, g, b)
    emitChange(parsed)
  }
}

function handlePresetClick(c: string) {
  const parsed = parseColor(c)
  if (!parsed) return
  const [r, g, b] = hexToRgb(parsed)
  hsv.value = rgbToHsv(r, g, b)
  emitChange(parsed)
}

let dragging: 'sat' | 'hue' | null = null

function updateSat(e: PointerEvent) {
  if (!satPanelRef.value) return
  const rect = satPanelRef.value.getBoundingClientRect()
  const s = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  const v = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height))
  const next = { ...hsv.value, s, v }
  hsv.value = next
  emitChange(hsvToHex(next.h, next.s, next.v))
}

function updateHue(e: PointerEvent) {
  if (!hueBarRef.value) return
  const rect = hueBarRef.value.getBoundingClientRect()
  const h = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  const next = { ...hsv.value, h }
  hsv.value = next
  emitChange(hsvToHex(next.h, next.s, next.v))
}

function handleSatPointerDown(e: PointerEvent) {
  e.preventDefault()
  dragging = 'sat'
  ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  updateSat(e)
}

function handleSatPointerMove(e: PointerEvent) {
  if (dragging !== 'sat') return
  updateSat(e)
}

function handleHuePointerDown(e: PointerEvent) {
  e.preventDefault()
  dragging = 'hue'
  ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  updateHue(e)
}

function handleHuePointerMove(e: PointerEvent) {
  if (dragging !== 'hue') return
  updateHue(e)
}

function handlePointerUp() {
  dragging = null
}

function handleOutside(e: MouseEvent) {
  if (!isOpen.value) return
  if (wrapperRef.value && !wrapperRef.value.contains(e.target as Node)) {
    setOpenState(false)
  }
}

function handleKeyDown(e: KeyboardEvent) {
  if (!isOpen.value) return
  if (e.key === 'Escape') setOpenState(false)
}

onMounted(() => {
  document.addEventListener('mousedown', handleOutside)
  document.addEventListener('keydown', handleKeyDown)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleOutside)
  document.removeEventListener('keydown', handleKeyDown)
  if (hoverTimer) clearTimeout(hoverTimer)
})

const wrapperClass = computed(() =>
  props.unstyled
    ? ''
    : [
        'sg-colorpicker-wrapper',
        `sg-colorpicker-${props.size}`,
        props.disabled ? 'sg-colorpicker-disabled' : '',
      ]
        .filter(Boolean)
        .join(' '),
)

const hueColor = computed(() => hsvToHex(hsv.value.h, 1, 1))
const satBackground = computed(
  () =>
    `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueColor.value})`,
)
</script>

<template>
  <div
    ref="wrapperRef"
    :class="wrapperClass"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <button
      type="button"
      class="sg-colorpicker-trigger"
      :disabled="disabled"
      aria-haspopup="dialog"
      :aria-expanded="isOpen"
      :aria-label="pickColorLabel"
      @click="handleTriggerClick"
    >
      <span class="sg-colorpicker-swatch" :style="{ background: current }" />
      <span v-if="showText" class="sg-colorpicker-text">{{ formatColor(current, format) }}</span>
    </button>
    <div
      v-if="isOpen"
      class="sg-colorpicker-dropdown"
      @mouseenter="handleMouseEnter"
      @mouseleave="handleMouseLeave"
    >
      <div
        ref="satPanelRef"
        class="sg-colorpicker-saturation"
        :style="{ background: satBackground }"
        @pointerdown="handleSatPointerDown"
        @pointermove="handleSatPointerMove"
        @pointerup="handlePointerUp"
      >
        <div
          class="sg-colorpicker-cursor"
          :style="{
            left: `${hsv.s * 100}%`,
            top: `${(1 - hsv.v) * 100}%`,
            background: current,
          }"
        />
      </div>
      <div
        ref="hueBarRef"
        class="sg-colorpicker-hue"
        @pointerdown="handleHuePointerDown"
        @pointermove="handleHuePointerMove"
        @pointerup="handlePointerUp"
      >
        <div class="sg-colorpicker-hue-cursor" :style="{ left: `${hsv.h * 100}%` }" />
      </div>
      <div class="sg-colorpicker-input-row">
        <span class="sg-colorpicker-preview" :style="{ background: current }" />
        <input
          class="sg-colorpicker-input"
          :value="textInput"
          spellcheck="false"
          @input="handleTextInput"
        />
      </div>
      <div v-for="group in presets ?? []" :key="group.label" class="sg-colorpicker-preset-group">
        <div class="sg-colorpicker-preset-label">{{ group.label }}</div>
        <div class="sg-colorpicker-preset-grid">
          <button
            v-for="c in group.colors"
            :key="c"
            type="button"
            class="sg-colorpicker-preset-color"
            :style="{ background: c }"
            :title="c"
            @click="handlePresetClick(c)"
          />
        </div>
      </div>
    </div>
  </div>
</template>
