<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CSSProperties } from 'vue'
import type { SizeType } from '../../types'
import type { PinInputLocale } from '../../types'
import { useConfig, useConfigWithDefaults } from './ConfigProvider.vue'

export interface PinInputProps {
  length?: number
  modelValue?: string
  value?: string
  defaultValue?: string
  mask?: boolean
  type?: 'numeric' | 'alphanumeric'
  placeholder?: string
  autoFocus?: boolean
  size?: SizeType
  disabled?: boolean
  loading?: boolean
  unstyled?: boolean
  style?: CSSProperties
  'aria-label'?: string
}

const props = withDefaults(defineProps<PinInputProps>(), {
  length: 6,
  mask: false,
  type: 'numeric',
  placeholder: '○',
  autoFocus: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void
  (e: 'change', v: string): void
  (e: 'complete', v: string): void
}>()

const { resolvedSize, resolvedDisabled } = useConfigWithDefaults(props, {})
const cfg = useConfig()

const lp = computed<PinInputLocale>(() => ({
  ariaLabel: 'PIN input',
  ...cfg.value.locale?.pinInput,
}))

const len = computed(() => props.length)

function padCompact(s: string): string {
  const compact = s.replace(/\s/g, '').slice(0, len.value)
  const chars = compact.split('')
  while (chars.length < len.value) chars.push(' ')
  return chars.join('')
}

function ensureCells(s: string): string[] {
  const a = s.split('')
  while (a.length < len.value) a.push(' ')
  return a.slice(0, len.value)
}

const isControlled = computed(() => props.modelValue !== undefined || props.value !== undefined)

const internal = ref(padCompact(props.defaultValue ?? ''))

const current = computed(() => {
  if (isControlled.value) {
    return padCompact(String(props.modelValue ?? props.value ?? ''))
  }
  return internal.value
})

const pattern = computed(() => (props.type === 'numeric' ? /^\d$/ : /^[a-zA-Z0-9]$/))

/**
 * Imperative-only DOM ref bag. Plain array (not `ref`) because the cells are
 * never read from a render or computed — they are only used to invoke
 * `.focus()`. Wrapping the bag in `ref` previously caused Vue to detect a
 * mutation during render (each `bindRef` set `cellRefs.value`) and threw the
 * "Maximum recursive updates exceeded" warning. See
 * `docs/_streams/decisions/T-Vue-Cleanup.md`.
 */
const cellRefs: (HTMLInputElement | null)[] = []

function bindRef(el: unknown, i: number) {
  cellRefs[i] = (el as HTMLInputElement) ?? null
}

function focusAt(i: number) {
  if (i >= 0 && i < len.value) cellRefs[i]?.focus()
}

function commit(joined: string) {
  const j = ensureCells(joined).join('')
  if (!isControlled.value) internal.value = j
  const trimmed = j.replace(/\s/g, '')
  emit('update:modelValue', trimmed)
  emit('change', trimmed)
  if (trimmed.length === len.value) emit('complete', trimmed)
}

function handleChange(index: number, char: string) {
  if (!pattern.value.test(char)) return
  const arr = ensureCells(current.value)
  arr[index] = char
  commit(arr.join(''))
  focusAt(index + 1)
}

function handleKeyDown(index: number, e: KeyboardEvent) {
  if (e.key === 'Backspace') {
    e.preventDefault()
    const arr = ensureCells(current.value)
    if (arr[index] !== ' ') {
      arr[index] = ' '
      commit(arr.join(''))
    } else {
      focusAt(index - 1)
    }
  } else if (e.key === 'ArrowLeft') {
    focusAt(index - 1)
  } else if (e.key === 'ArrowRight') {
    focusAt(index + 1)
  }
}

function handlePaste(e: ClipboardEvent) {
  e.preventDefault()
  const pasted = (e.clipboardData?.getData('text') ?? '').slice(0, len.value)
  const arr = ensureCells(current.value)
  let cursor = 0
  for (const ch of pasted) {
    if (pattern.value.test(ch) && cursor < len.value) {
      arr[cursor] = ch
      cursor++
    }
  }
  commit(arr.join(''))
  focusAt(Math.min(cursor, len.value - 1))
}

function cellDisplay(i: number): string {
  const c = current.value[i]
  return c === ' ' || c === undefined ? '' : c
}

const wrapperClasses = computed(() =>
  props.unstyled
    ? ''
    : [
        'sg-pin-input',
        `sg-pin-input-${resolvedSize.value}`,
        resolvedDisabled.value ? 'sg-pin-input-disabled' : '',
      ]
        .filter(Boolean)
        .join(' '),
)

const disabledEff = computed(() => resolvedDisabled.value || !!props.loading)

const ariaLabelEff = computed(() => props['aria-label'] ?? lp.value.ariaLabel!)

/** Template iterator: 0 .. length-1 */
const indices = computed(() => Array.from({ length: len.value }, (_, i) => i))
</script>

<template>
  <div
    :class="unstyled ? '' : wrapperClasses"
    :style="style"
    role="group"
    :aria-label="ariaLabelEff"
  >
    <template v-for="i in indices" :key="i">
      <input
        v-if="unstyled"
        :ref="(el) => bindRef(el, i)"
        :type="mask ? 'password' : 'text'"
        :inputmode="type === 'numeric' ? 'numeric' : 'text'"
        maxlength="1"
        :value="cellDisplay(i)"
        :disabled="disabledEff"
        :autofocus="autoFocus && i === 0"
        @input="handleChange(i, ($event.target as HTMLInputElement).value)"
        @keydown="handleKeyDown(i, $event)"
        @paste="handlePaste"
        @focus="($event.target as HTMLInputElement).select()"
      />
      <input
        v-else
        :ref="(el) => bindRef(el, i)"
        :class="
          [
            'sg-pin-input-cell',
            `sg-pin-input-cell-${resolvedSize}`,
            cellDisplay(i) ? 'sg-pin-input-cell-filled' : '',
          ]
            .filter(Boolean)
            .join(' ')
        "
        :type="mask ? 'password' : 'text'"
        :inputmode="type === 'numeric' ? 'numeric' : 'text'"
        maxlength="1"
        :placeholder="placeholder"
        :value="cellDisplay(i)"
        :disabled="disabledEff"
        :autofocus="autoFocus && i === 0"
        @input="handleChange(i, ($event.target as HTMLInputElement).value)"
        @keydown="handleKeyDown(i, $event)"
        @paste="handlePaste"
        @focus="($event.target as HTMLInputElement).select()"
      />
    </template>
  </div>
</template>
