<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useFocusTrap } from '../../composables/useFocusTrap'
import { useConfig } from './ConfigProvider.vue'
import SgButton from './Button.vue'
import SgTransition from './Transition.vue'

let uid = 0
function genId() {
  return `sg-popconfirm-${++uid}`
}

export interface PopconfirmProps {
  /** Main confirmation question or summary. */
  title: string
  /** Optional supporting text below the title. */
  description?: string
  /** Label for the confirm action button. @default 'Yes' */
  okText?: string
  /** Label for the cancel action button. @default 'No' */
  cancelText?: string
  /** Popover position relative to the trigger. @default 'top' */
  placement?: 'top' | 'bottom' | 'left' | 'right'
  /** When `true`, the trigger does not open the popconfirm. */
  disabled?: boolean
  /** Strips built-in styles when true. */
  unstyled?: boolean
}

const props = withDefaults(defineProps<PopconfirmProps>(), {
  placement: 'top',
  disabled: false,
})

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

defineSlots<{
  default(props: Record<string, never>): unknown
}>()

const cfg = useConfig()
const okText = computed(
  () => props.okText ?? cfg.value.locale?.popconfirm?.okText ?? 'Yes',
)
const cancelText = computed(
  () => props.cancelText ?? cfg.value.locale?.popconfirm?.cancelText ?? 'No',
)

const open = ref(false)
const wrapperRef = ref<HTMLElement | null>(null)
const trapRef = useFocusTrap(open)
const popconfirmId = genId()

function handleTrigger() {
  if (!props.disabled) open.value = !open.value
}

function handleConfirm() {
  open.value = false
  emit('confirm')
}

function handleCancel() {
  open.value = false
  emit('cancel')
}

function handleDocumentClick(e: MouseEvent) {
  if (wrapperRef.value && !wrapperRef.value.contains(e.target as Node)) {
    open.value = false
  }
}

watch(
  open,
  (next) => {
    if (next) document.addEventListener('mousedown', handleDocumentClick)
    else document.removeEventListener('mousedown', handleDocumentClick)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleDocumentClick)
})

const popoverClasses = computed(
  () => `sg-popconfirm sg-popconfirm-${props.placement}`,
)
</script>

<template>
  <div
    ref="wrapperRef"
    :class="unstyled ? '' : 'sg-popconfirm-wrapper'"
    :style="unstyled ? { position: 'relative', display: 'inline-block' } : undefined"
  >
    <div
      :aria-describedby="open ? popconfirmId : undefined"
      style="display: inline-block"
      @click="handleTrigger"
    >
      <slot />
    </div>
    <template v-if="unstyled">
      <div v-if="open" :id="popconfirmId" role="alertdialog">
        <div>{{ title }}</div>
        <div v-if="description">{{ description }}</div>
        <button type="button" @click="handleCancel">{{ cancelText }}</button>
        <button type="button" @click="handleConfirm">{{ okText }}</button>
      </div>
    </template>
    <template v-else>
      <SgTransition :visible="open" name="sg-fade">
        <div
          ref="trapRef"
          :id="popconfirmId"
          role="alertdialog"
          :class="popoverClasses"
        >
          <div class="sg-popconfirm-arrow" />
          <div class="sg-popconfirm-inner">
            <div class="sg-popconfirm-title">
              <span class="sg-popconfirm-icon">⚠</span>
              {{ title }}
            </div>
            <div v-if="description" class="sg-popconfirm-description">
              {{ description }}
            </div>
            <div class="sg-popconfirm-buttons">
              <SgButton size="small" @click="handleCancel">{{ cancelText }}</SgButton>
              <SgButton size="small" type="primary" @click="handleConfirm">{{ okText }}</SgButton>
            </div>
          </div>
        </div>
      </SgTransition>
    </template>
  </div>
</template>
