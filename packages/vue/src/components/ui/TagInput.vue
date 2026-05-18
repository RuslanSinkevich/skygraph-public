<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CSSProperties } from 'vue'
import type { SizeType } from '../../types'
import type { TagInputLocale } from '../../types'
import { useConfig, useConfigWithDefaults } from './ConfigProvider.vue'

export interface TagInputProps {
  modelValue?: string[]
  value?: string[]
  defaultValue?: string[]
  placeholder?: string
  maxTags?: number
  allowDuplicates?: boolean
  removable?: boolean
  tagColor?: 'default' | 'success' | 'error' | 'warning' | 'processing'
  size?: SizeType
  disabled?: boolean
  loading?: boolean
  unstyled?: boolean
  style?: CSSProperties
}

const props = withDefaults(defineProps<TagInputProps>(), {
  defaultValue: () => [],
  allowDuplicates: false,
  removable: true,
  tagColor: 'default',
})

const emit = defineEmits<{
  (e: 'update:modelValue', v: string[]): void
  (e: 'change', v: string[]): void
  (e: 'focus', ev: FocusEvent): void
  (e: 'blur', ev: FocusEvent): void
}>()

const { resolvedSize, resolvedDisabled } = useConfigWithDefaults(props, {})
const cfg = useConfig()

const lp = computed<TagInputLocale>(() => ({
  placeholder: 'Add tag…',
  removeTag: 'Remove',
  ...cfg.value.locale?.tagInput,
}))

const internalTags = ref<string[]>([...props.defaultValue])
const inputValue = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

const tags = computed(() => props.modelValue ?? props.value ?? internalTags.value)

const placeholderEff = computed(() => props.placeholder ?? lp.value.placeholder!)

function updateTags(next: string[]) {
  internalTags.value = next
  emit('update:modelValue', next)
  emit('change', next)
}

function addTag(raw: string) {
  const tag = raw.trim()
  if (!tag) return
  if (props.maxTags && tags.value.length >= props.maxTags) return
  if (!props.allowDuplicates && tags.value.includes(tag)) return
  updateTags([...tags.value, tag])
  inputValue.value = ''
}

function removeTag(index: number) {
  updateTags(tags.value.filter((_, i) => i !== index))
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault()
    addTag(inputValue.value)
  } else if (e.key === 'Backspace' && !inputValue.value && tags.value.length > 0) {
    removeTag(tags.value.length - 1)
  }
}

function onPaste(e: ClipboardEvent) {
  e.preventDefault()
  const text = e.clipboardData?.getData('text') ?? ''
  const pasted = text
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  const next = [...tags.value]
  for (const t of pasted) {
    if (props.maxTags && next.length >= props.maxTags) break
    if (!props.allowDuplicates && next.includes(t)) continue
    next.push(t)
  }
  updateTags(next)
}

function onWrapperClick() {
  inputRef.value?.focus()
}

function onInputBlur(e: FocusEvent) {
  if (inputValue.value.trim()) addTag(inputValue.value)
  emit('blur', e)
}

const wrapperClasses = computed(() =>
  props.unstyled
    ? ''
    : [
        'sg-tag-input',
        `sg-tag-input-${resolvedSize.value}`,
        resolvedDisabled.value ? 'sg-tag-input-disabled' : '',
      ]
        .filter(Boolean)
        .join(' '),
)

const tagColorClass = computed(() =>
  props.tagColor !== 'default' ? `sg-tag-${props.tagColor}` : '',
)

const disabledEff = computed(() => resolvedDisabled.value || !!props.loading)
</script>

<template>
  <div v-if="!unstyled" :class="wrapperClasses" :style="style" @click="onWrapperClick">
    <span
      v-for="(tag, i) in tags"
      :key="`${tag}-${i}`"
      :class="['sg-tag', tagColorClass].filter(Boolean).join(' ')"
    >
      {{ tag }}
      <span
        v-if="removable && !resolvedDisabled"
        class="sg-tag-close"
        role="button"
        :aria-label="`${lp.removeTag} ${tag}`"
        @click.stop="removeTag(i)"
        >×</span
      >
    </span>
    <input
      ref="inputRef"
      class="sg-tag-input-field"
      :value="inputValue"
      :placeholder="tags.length === 0 ? placeholderEff : ''"
      :disabled="disabledEff"
      @input="inputValue = ($event.target as HTMLInputElement).value"
      @keydown="onKeydown"
      @paste="onPaste"
      @focus="emit('focus', $event)"
      @blur="onInputBlur"
    />
    <span v-if="maxTags" class="sg-tag-input-count">{{ tags.length }}/{{ maxTags }}</span>
  </div>
  <div v-else :style="style">
    <span v-for="(tag, i) in tags" :key="`${tag}-${i}`">
      {{ tag }}
      <button v-if="removable" type="button" @click="removeTag(i)">×</button>
    </span>
    <input
      ref="inputRef"
      v-model="inputValue"
      :placeholder="tags.length === 0 ? placeholderEff : ''"
      :disabled="disabledEff"
      @keydown="onKeydown"
      @paste="onPaste"
      @focus="emit('focus', $event)"
      @blur="onInputBlur"
    />
  </div>
</template>
