<script setup lang="ts">
import { computed, getCurrentInstance, onBeforeUnmount, ref, toRef, watch } from 'vue'
import { useFocusTrap } from '../../composables/useFocusTrap'
import { useConfig } from './ConfigProvider.vue'
import SgButton from './Button.vue'
import SgTransition from './Transition.vue'

let uid = 0
function genId() {
  return `sg-modal-${++uid}`
}

export interface ModalProps {
  /** When `true`, the modal is visible. */
  open: boolean
  /** Optional heading text; used for the accessible name when set. */
  title?: string
  /** Optional footer override (default: OK/Cancel pair when `okHandler`). */
  footer?: 'default' | 'none'
  /** Dialog width as a CSS length or number (pixels). @default 520 */
  width?: number | string
  /** When provided, default footer with OK button is enabled. */
  okHandler?: () => void | Promise<void>
  /** Label for the default OK button. */
  okText?: string
  /** Label for the default Cancel button. */
  cancelText?: string
  /** Visual type of the default OK button. @default 'primary' */
  okType?: 'primary' | 'default' | 'dashed' | 'text'
  /** Shows the OK button in loading state and disables interactions. */
  confirmLoading?: boolean
  /** Strips built-in styles when true. */
  unstyled?: boolean
}

const props = withDefaults(defineProps<ModalProps>(), {
  width: 520,
  okType: 'primary',
  confirmLoading: false,
})

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'ok'): void
}>()

defineSlots<{
  default(props: Record<string, never>): unknown
  footer(props: Record<string, never>): unknown
}>()

const instance = getCurrentInstance()
const hasFooterSlot = computed<boolean>(
  () => !!(instance?.slots as Record<string, unknown> | undefined)?.footer,
)
const cfg = useConfig()
const okText = computed(() => props.okText ?? cfg.value.locale?.modal?.okText ?? 'OK')
const cancelText = computed(
  () => props.cancelText ?? cfg.value.locale?.modal?.cancelText ?? 'Cancel',
)
const closeAriaLabel = computed(() => cfg.value.locale?.modal?.closeAriaLabel ?? 'Close')

const id = genId()
const titleId = `${id}-title`
const bodyId = `${id}-body`

const trapRef = useFocusTrap(toRef(props, 'open'))

// `<Teleport>` moves the dialog to `<body>`, so CSS variables scoped on a
// wrapping element no longer cascade into it (React renders the modal inline,
// so it gets them for free). Keep a hidden marker at the natural (scoped)
// location, read its computed `--sg-*` variables on open and pin them onto the
// teleported mask so per-instance token overrides survive the portal.
const scopeRef = ref<HTMLElement | null>(null)
const scopedVars = ref<Record<string, string>>({})

function getScopedCssVars(scope: HTMLElement | null): Record<string, string> {
  if (!scope || typeof window === 'undefined') return {}
  const computedStyle = window.getComputedStyle(scope)
  const vars: Record<string, string> = {}
  for (let i = 0; i < computedStyle.length; i += 1) {
    const name = computedStyle.item(i)
    if (name.startsWith('--sg-')) {
      vars[name] = computedStyle.getPropertyValue(name)
    }
  }
  return vars
}

// Width is forwarded through the `--sg-modal-width` CSS variable (read by
// `.sg-modal` in modal.css) instead of an inline `width`, so it matches the
// React adapter and stays overridable via the same token.
const widthStyle = computed(() => ({
  '--sg-modal-width': typeof props.width === 'number' ? `${props.width}px` : props.width,
}))

function onClose() {
  emit('close')
}

function onOk() {
  emit('ok')
  props.okHandler?.()
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') onClose()
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      scopedVars.value = getScopedCssVars(scopeRef.value)
    } else {
      document.removeEventListener('keydown', handleKeyDown)
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeyDown)
})

const showDefaultFooter = computed<boolean>(
  () => props.footer !== 'none' && !hasFooterSlot.value && !!props.okHandler,
)
const hasCustomFooter = computed<boolean>(() => hasFooterSlot.value && props.footer !== 'none')
</script>

<template>
  <span ref="scopeRef" hidden />
  <Teleport to="body">
    <template v-if="unstyled">
      <div
        v-if="open"
        ref="trapRef"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="title ? titleId : undefined"
        :aria-describedby="bodyId"
      >
        <div v-if="title" :id="titleId">{{ title }}</div>
        <div :id="bodyId"><slot /></div>
        <div v-if="hasCustomFooter">
          <slot name="footer" />
        </div>
        <div v-else-if="showDefaultFooter">
          <SgButton :unstyled="true" @click="onClose">{{ cancelText }}</SgButton>
          <SgButton :unstyled="true" @click="onOk">{{ okText }}</SgButton>
        </div>
        <button type="button" :aria-label="closeAriaLabel" @click="onClose">x</button>
      </div>
    </template>
    <template v-else>
      <SgTransition :visible="open" name="sg-fade" :unmount-on-exit="true">
        <div class="sg-modal-mask" :style="scopedVars" @click="onClose">
          <SgTransition :visible="open" name="sg-zoom" :unmount-on-exit="true">
            <div
              ref="trapRef"
              class="sg-modal"
              :style="widthStyle"
              role="dialog"
              aria-modal="true"
              :aria-labelledby="title ? titleId : undefined"
              :aria-describedby="bodyId"
              @click.stop
            >
              <div class="sg-modal-header">
                <div v-if="title" class="sg-modal-title" :id="titleId">
                  {{ title }}
                </div>
                <SgButton
                  type="text"
                  class="sg-modal-close"
                  :aria-label="closeAriaLabel"
                  @click="onClose"
                >
                  ×
                </SgButton>
              </div>
              <div class="sg-modal-body" :id="bodyId">
                <slot />
              </div>
              <div v-if="hasCustomFooter" class="sg-modal-footer">
                <slot name="footer" />
              </div>
              <div v-else-if="showDefaultFooter" class="sg-modal-footer">
                <SgButton :disabled="confirmLoading" @click="onClose">{{ cancelText }}</SgButton>
                <SgButton :type="okType" :loading="confirmLoading" @click="onOk">
                  {{ okText }}
                </SgButton>
              </div>
            </div>
          </SgTransition>
        </div>
      </SgTransition>
    </template>
  </Teleport>
</template>
