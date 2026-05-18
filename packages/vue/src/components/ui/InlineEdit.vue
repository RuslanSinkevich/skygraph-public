<script setup lang="ts">
import { computed, nextTick, ref, useSlots, watch } from 'vue'
import type { CSSProperties } from 'vue'
import type { SizeType } from '../../types'
import type { InlineEditLocale } from '../../types'
import { useConfig, useConfigWithDefaults } from './ConfigProvider.vue'

export interface InlineEditProps {
  modelValue?: string
  value?: string
  defaultValue?: string
  placeholder?: string
  showButtons?: boolean
  saveOnBlur?: boolean
  saveOnEnter?: boolean
  size?: SizeType
  disabled?: boolean
  loading?: boolean
  unstyled?: boolean
  style?: CSSProperties
}

const props = withDefaults(defineProps<InlineEditProps>(), {
  defaultValue: '',
  placeholder: '',
  showButtons: true,
  saveOnBlur: true,
  saveOnEnter: true,
})

const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void
  (e: 'save', v: string): void
  (e: 'cancel'): void
}>()

defineSlots<{
  view(props: { value: string; startEditing: () => void }): unknown
}>()

const { resolvedSize, resolvedDisabled } = useConfigWithDefaults(props, {})
const cfg = useConfig()

const lp = computed<InlineEditLocale>(() => ({
  placeholder: 'Click to edit…',
  save: 'Save',
  cancel: 'Cancel',
  ...cfg.value.locale?.inlineEdit,
}))

const placeholderEff = computed(() => props.placeholder || lp.value.placeholder!)

const editing = ref(false)
const internal = ref(props.defaultValue)
const draft = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

const slots = useSlots()
const hasViewSlot = computed(() => Boolean(slots.view))

const current = computed(() => props.modelValue ?? props.value ?? internal.value)

watch(editing, (ed) => {
  if (ed) {
    draft.value = current.value
    nextTick(() => inputRef.value?.focus())
  }
})

function startEditing() {
  if (resolvedDisabled.value || props.loading) return
  editing.value = true
}

function save() {
  editing.value = false
  internal.value = draft.value
  emit('update:modelValue', draft.value)
  emit('save', draft.value)
}

function cancel() {
  editing.value = false
  draft.value = current.value
  emit('cancel')
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && props.saveOnEnter) {
    e.preventDefault()
    save()
  } else if (e.key === 'Escape') {
    cancel()
  }
}

const viewClasses = computed(() =>
  [
    'sg-inline-edit-view',
    `sg-inline-edit-view-${resolvedSize.value}`,
    !current.value ? 'sg-inline-edit-view-placeholder' : '',
    resolvedDisabled.value ? 'sg-inline-edit-view-disabled' : '',
  ]
    .filter(Boolean)
    .join(' '),
)

function onViewKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ' ') startEditing()
}

function onBlurUnstyled() {
  if (props.saveOnBlur) save()
}

function onBlurStyled() {
  if (props.saveOnBlur && !props.showButtons) save()
}
</script>

<template>
  <template v-if="!editing">
    <slot v-if="hasViewSlot" name="view" :value="current" :start-editing="startEditing" />
    <span
      v-else-if="unstyled"
      :style="{ ...style, cursor: resolvedDisabled ? 'default' : 'pointer' }"
      @click="startEditing"
      >{{ current || placeholderEff }}</span
    >
    <span
      v-else
      :class="viewClasses"
      :style="style"
      role="button"
      :tabindex="resolvedDisabled ? -1 : 0"
      @click="startEditing"
      @keydown="onViewKeydown"
    >
      {{ current || placeholderEff }}
      <span v-if="!resolvedDisabled" class="sg-inline-edit-pencil">✎</span>
    </span>
  </template>
  <span v-else-if="unstyled" :style="style">
    <input
      ref="inputRef"
      :value="draft"
      @input="draft = ($event.target as HTMLInputElement).value"
      @keydown="onKeydown"
      @blur="onBlurUnstyled"
    />
    <template v-if="showButtons">
      <button type="button" @click="save">✓</button>
      <button type="button" @click="cancel">✕</button>
    </template>
  </span>
  <span
    v-else
    :class="['sg-inline-edit', `sg-inline-edit-${resolvedSize}`].filter(Boolean).join(' ')"
    :style="style"
  >
    <input
      ref="inputRef"
      :class="`sg-input sg-input-${resolvedSize} sg-inline-edit-input`"
      :value="draft"
      @input="draft = ($event.target as HTMLInputElement).value"
      @keydown="onKeydown"
      @blur="onBlurStyled"
    />
    <span v-if="showButtons" class="sg-inline-edit-actions">
      <button
        type="button"
        class="sg-inline-edit-btn sg-inline-edit-btn-save"
        :aria-label="lp.save"
        @click="save"
      >
        ✓
      </button>
      <button
        type="button"
        class="sg-inline-edit-btn sg-inline-edit-btn-cancel"
        :aria-label="lp.cancel"
        @click="cancel"
      >
        ✕
      </button>
    </span>
  </span>
</template>
