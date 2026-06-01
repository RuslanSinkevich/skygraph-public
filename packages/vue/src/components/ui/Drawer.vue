<script setup lang="ts">
import { computed, getCurrentInstance, onBeforeUnmount, toRef, watch } from 'vue'
import { useFocusTrap } from '../../composables/useFocusTrap'
import { useConfig } from './ConfigProvider.vue'
import SgButton from './Button.vue'
import SgTransition from './Transition.vue'

let uid = 0
function genId() {
  return `sg-drawer-${++uid}`
}

export interface DrawerProps {
  /** When `true`, the drawer is visible. */
  open: boolean
  /** Optional header text. */
  title?: string
  /** Edge from which the panel enters. @default 'right' */
  placement?: 'left' | 'right' | 'top' | 'bottom'
  /** Width for left/right placement (CSS length or pixels). @default 378 */
  width?: number | string
  /** Height for top/bottom placement. @default 378 */
  height?: number | string
  /** When `true`, shows a header close button. @default true */
  closable?: boolean
  /** When `true`, renders a dimmed mask behind the panel. @default true */
  mask?: boolean
  /** When `true`, clicking the mask emits `close`. @default true */
  maskClosable?: boolean
  /** Strips built-in styles when true. */
  unstyled?: boolean
}

const props = withDefaults(defineProps<DrawerProps>(), {
  placement: 'right',
  width: 378,
  height: 378,
  closable: true,
  mask: true,
  maskClosable: true,
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

defineSlots<{
  default(props: Record<string, never>): unknown
  footer(props: Record<string, never>): unknown
}>()

const PLACEMENT_TRANSITION: Record<string, string> = {
  left: 'sg-slide-left',
  right: 'sg-slide-right',
  top: 'sg-slide-down',
  bottom: 'sg-slide-up',
}

const id = genId()
const titleId = `${id}-title`
const bodyId = `${id}-body`
const trapRef = useFocusTrap(toRef(props, 'open'))

const isHorizontal = computed(() => props.placement === 'left' || props.placement === 'right')

const sizeStyle = computed(() => {
  const w = typeof props.width === 'number' ? `${props.width}px` : props.width
  const h = typeof props.height === 'number' ? `${props.height}px` : props.height
  return isHorizontal.value ? { width: w, height: '100%' } : { width: '100%', height: h }
})

const transitionName = computed(() => PLACEMENT_TRANSITION[props.placement] ?? 'sg-slide-right')

function onClose() {
  emit('close')
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') onClose()
}

watch(
  () => props.open,
  (open) => {
    if (open) document.addEventListener('keydown', handleKeyDown)
    else document.removeEventListener('keydown', handleKeyDown)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeyDown)
})

const drawerClasses = computed(() => ['sg-drawer', `sg-drawer-${props.placement}`].join(' '))

const instance = getCurrentInstance()
const hasFooterSlot = computed<boolean>(
  () => !!(instance?.slots as Record<string, unknown> | undefined)?.footer,
)

const cfg = useConfig()
const closeAriaLabel = computed(() => cfg.value.locale?.drawer?.closeAriaLabel ?? 'Close')
</script>

<template>
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
        <div v-if="hasFooterSlot">
          <slot name="footer" />
        </div>
        <button v-if="closable" type="button" :aria-label="closeAriaLabel" @click="onClose">
          ×
        </button>
      </div>
    </template>
    <template v-else>
      <SgTransition :visible="open" name="sg-fade" :duration="300">
        <div class="sg-drawer-root">
          <div v-if="mask" class="sg-drawer-mask" @click="maskClosable ? onClose() : undefined" />
          <SgTransition :visible="open" :name="transitionName" :duration="300">
            <div
              ref="trapRef"
              :class="drawerClasses"
              :style="sizeStyle"
              role="dialog"
              aria-modal="true"
              :aria-labelledby="title ? titleId : undefined"
              :aria-describedby="bodyId"
            >
              <div v-if="title || closable" class="sg-drawer-header">
                <div v-if="title" class="sg-drawer-title" :id="titleId">
                  {{ title }}
                </div>
                <SgButton
                  v-if="closable"
                  type="text"
                  class="sg-drawer-close"
                  :aria-label="closeAriaLabel"
                  @click="onClose"
                >
                  ×
                </SgButton>
              </div>
              <div class="sg-drawer-body" :id="bodyId">
                <slot />
              </div>
              <div v-if="hasFooterSlot" class="sg-drawer-footer">
                <slot name="footer" />
              </div>
            </div>
          </SgTransition>
        </div>
      </SgTransition>
    </template>
  </Teleport>
</template>
