<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { SizeType } from '../../types'
import { useConfigWithDefaults } from './ConfigProvider.vue'

export interface MentionOption {
  value: string
  label?: string
  disabled?: boolean
}

export interface MentionsProps {
  /** v-model binding (Vue idiom). */
  modelValue?: string
  /** Compat alias. */
  value?: string
  /** Initial value when uncontrolled. */
  defaultValue?: string
  /** Placeholder text. */
  placeholder?: string
  /** Mention prefix character(s). */
  prefix?: string | string[]
  /** Number of textarea rows. */
  rows?: number
  /** Mention suggestion options. */
  options?: MentionOption[]
  /** Vertical position of the suggestion dropdown relative to the field. */
  placement?: 'top' | 'bottom'
  /** Disables interaction. */
  disabled?: boolean
  /** Component size. */
  size?: SizeType
  /** Strips built-in styling. */
  unstyled?: boolean
}

const props = withDefaults(defineProps<MentionsProps>(), {
  prefix: '@',
  rows: 3,
  options: () => [],
  placement: 'bottom',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
  (e: 'search', text: string, prefix: string): void
  (e: 'select', option: MentionOption, prefix: string): void
}>()

const { resolvedSize, resolvedDisabled } = useConfigWithDefaults(props, {})

const internal = ref<string>(props.modelValue ?? props.value ?? props.defaultValue ?? '')
watch(
  () => props.modelValue ?? props.value,
  (v) => {
    if (v !== undefined) internal.value = v
  },
)
const current = computed(() => props.modelValue ?? props.value ?? internal.value)

const showSuggest = ref(false)
const search = ref('')
const activePrefix = ref('')
const startIndex = ref(0)
const activeIndex = ref(0)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const dropdownRef = ref<HTMLDivElement | null>(null)

const prefixes = computed(() => (Array.isArray(props.prefix) ? props.prefix : [props.prefix]))

function handleInput(e: Event) {
  const target = e.target as HTMLTextAreaElement
  const v = target.value
  internal.value = v
  emit('update:modelValue', v)
  emit('change', v)

  const pos = target.selectionStart ?? v.length
  const before = v.slice(0, pos)

  for (const p of prefixes.value) {
    const idx = before.lastIndexOf(p)
    if (idx >= 0) {
      const charBefore = idx > 0 ? before[idx - 1] : ' '
      if (charBefore === ' ' || charBefore === '\n' || idx === 0) {
        const between = before.slice(idx + p.length)
        if (!between.includes(' ')) {
          activePrefix.value = p
          search.value = between
          startIndex.value = idx
          showSuggest.value = true
          activeIndex.value = 0
          emit('search', between, p)
          return
        }
      }
    }
  }
  showSuggest.value = false
}

const filteredOptions = computed(() =>
  props.options.filter(
    (o) => !search.value || (o.label ?? o.value).toLowerCase().includes(search.value.toLowerCase()),
  ),
)

function selectOption(opt: MentionOption) {
  if (opt.disabled) return
  const v = current.value
  const before = v.slice(0, startIndex.value)
  const after = v.slice(startIndex.value + activePrefix.value.length + search.value.length)
  const insertText = `${activePrefix.value}${opt.value} `
  const newValue = before + insertText + after
  internal.value = newValue
  emit('update:modelValue', newValue)
  emit('change', newValue)
  emit('select', opt, activePrefix.value)
  showSuggest.value = false
  void nextTick(() => {
    if (textareaRef.value) {
      const newPos = before.length + insertText.length
      textareaRef.value.focus()
      textareaRef.value.setSelectionRange(newPos, newPos)
    }
  })
}

function handleKeyDown(e: KeyboardEvent) {
  if (!showSuggest.value || filteredOptions.value.length === 0) return
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    activeIndex.value = (activeIndex.value + 1) % filteredOptions.value.length
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeIndex.value =
      (activeIndex.value - 1 + filteredOptions.value.length) % filteredOptions.value.length
  } else if (e.key === 'Enter') {
    e.preventDefault()
    selectOption(filteredOptions.value[activeIndex.value])
  } else if (e.key === 'Escape') {
    showSuggest.value = false
  }
}

function onClickOutside(e: MouseEvent) {
  if (
    dropdownRef.value &&
    !dropdownRef.value.contains(e.target as Node) &&
    textareaRef.value &&
    !textareaRef.value.contains(e.target as Node)
  ) {
    showSuggest.value = false
  }
}

onMounted(() => {
  document.addEventListener('mousedown', onClickOutside)
})
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onClickOutside)
})

const wrapperCls = computed(() =>
  props.unstyled
    ? ''
    : [
        'sg-mentions',
        `sg-mentions-${resolvedSize.value}`,
        resolvedDisabled.value ? 'sg-mentions-disabled' : '',
      ]
        .filter(Boolean)
        .join(' '),
)
</script>

<template>
  <div :class="wrapperCls">
    <textarea
      ref="textareaRef"
      :class="unstyled ? '' : 'sg-input sg-textarea'"
      :value="current"
      :placeholder="placeholder"
      :rows="rows"
      :disabled="resolvedDisabled"
      @input="handleInput"
      @keydown="handleKeyDown"
    />
    <div
      v-if="showSuggest && filteredOptions.length"
      ref="dropdownRef"
      :class="unstyled ? '' : `sg-mentions-dropdown sg-mentions-dropdown-${placement}`"
      role="listbox"
    >
      <div
        v-for="(opt, i) in filteredOptions"
        :key="opt.value"
        :class="
          unstyled
            ? ''
            : [
                'sg-mentions-option',
                i === activeIndex ? 'sg-mentions-option-active' : '',
                opt.disabled ? 'sg-mentions-option-disabled' : '',
              ]
                .filter(Boolean)
                .join(' ')
        "
        role="option"
        :aria-selected="i === activeIndex"
        @mousedown.prevent="selectOption(opt)"
        @mouseenter="activeIndex = i"
      >
        {{ opt.label ?? opt.value }}
      </div>
    </div>
  </div>
</template>
