<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CSSProperties } from 'vue'
import type { SizeType } from '../../types'
import type { SearchInputLocale } from '../../types'
import { useConfig, useConfigWithDefaults } from './ConfigProvider.vue'
import SgSpin from './Spin.vue'

export interface SearchInputProps {
  modelValue?: string
  value?: string
  defaultValue?: string
  placeholder?: string
  allowClear?: boolean
  enterButton?: boolean | string
  size?: SizeType
  disabled?: boolean
  loading?: boolean
  unstyled?: boolean
  style?: CSSProperties
}

const props = withDefaults(defineProps<SearchInputProps>(), {
  allowClear: true,
})

const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void
  (e: 'change', v: string): void
  (e: 'search', v: string): void
  (e: 'focus', ev: FocusEvent): void
  (e: 'blur', ev: FocusEvent): void
}>()

const { resolvedSize, resolvedDisabled } = useConfigWithDefaults(props, {})
const cfg = useConfig()

const lp = computed<SearchInputLocale>(() => ({
  placeholder: 'Search…',
  clear: 'Clear',
  search: 'Search',
  ...cfg.value.locale?.searchInput,
}))

const internal = ref(props.defaultValue ?? '')
const inputRef = ref<HTMLInputElement | null>(null)

const current = computed(() => props.modelValue ?? props.value ?? internal.value)

const placeholderEff = computed(() => props.placeholder ?? lp.value.placeholder!)

function handleChange(v: string) {
  internal.value = v
  emit('update:modelValue', v)
  emit('change', v)
}

function handleSearch() {
  if (resolvedDisabled.value || props.loading) return
  emit('search', current.value)
}

function handleClear() {
  handleChange('')
  emit('search', '')
  inputRef.value?.focus()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') handleSearch()
}

const wrapperClasses = computed(() =>
  props.unstyled
    ? ''
    : [
        'sg-search-input',
        `sg-search-input-${resolvedSize.value}`,
        props.enterButton ? 'sg-search-input-with-button' : '',
        props.loading ? 'sg-search-input-loading' : '',
        resolvedDisabled.value ? 'sg-search-input-disabled' : '',
      ]
        .filter(Boolean)
        .join(' '),
)

const disabledEff = computed(() => resolvedDisabled.value || !!props.loading)
</script>

<template>
  <span v-if="!unstyled" :class="wrapperClasses" :style="style">
    <span class="sg-search-input-icon">⌕</span>
    <input
      ref="inputRef"
      type="text"
      :class="`sg-input sg-input-${resolvedSize} sg-search-input-field`"
      :value="current"
      :placeholder="placeholderEff"
      :disabled="disabledEff"
      @input="handleChange(($event.target as HTMLInputElement).value)"
      @keydown="onKeydown"
      @focus="emit('focus', $event)"
      @blur="emit('blur', $event)"
    />
    <SgSpin v-if="loading" size="small" />
    <button
      v-if="allowClear && current && !loading"
      type="button"
      class="sg-search-input-clear"
      tabindex="-1"
      :aria-label="lp.clear"
      @click="handleClear"
    >
      ×
    </button>
    <button
      v-if="enterButton"
      type="button"
      class="sg-search-input-btn"
      :disabled="disabledEff"
      @click="handleSearch"
    >
      {{ typeof enterButton === 'string' ? enterButton : '⌕' }}
    </button>
  </span>
  <span v-else :style="style">
    <input
      ref="inputRef"
      type="search"
      :value="current"
      :placeholder="placeholderEff"
      :disabled="disabledEff"
      @input="handleChange(($event.target as HTMLInputElement).value)"
      @keydown="onKeydown"
      @focus="emit('focus', $event)"
      @blur="emit('blur', $event)"
    />
    <button v-if="enterButton" type="button" :disabled="disabledEff" @click="handleSearch">
      {{ typeof enterButton === 'string' ? enterButton : lp.search }}
    </button>
  </span>
</template>
