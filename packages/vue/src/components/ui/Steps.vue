<script setup lang="ts">
import { computed, getCurrentInstance, useSlots } from 'vue'
import { useConfigWithDefaults } from './ConfigProvider.vue'
import type { SizeType } from '../../types'

export interface StepItem {
  /** Primary step title. */
  title: string
  /** Optional secondary text below the title. */
  description?: string
  /** Custom icon glyph (emoji / unicode / short label). Pass `icon` slot for rich content. */
  icon?: string
  /** Overrides auto-derived status from `current` index. */
  status?: 'wait' | 'process' | 'finish' | 'error'
}

export interface StepsProps {
  /** Zero-based index of the active (in-progress) step. */
  current: number
  /** Steps in display order. */
  items: StepItem[]
  /** Stack direction. @default 'horizontal' */
  direction?: 'horizontal' | 'vertical'
  /** Component size variant. */
  size?: SizeType
  /** Visual variant. @default 'default' */
  type?: 'default' | 'navigation'
  /** Force-enable / disable click-to-change. When omitted, inferred from
   *  the presence of a `change` listener (matches React's `onChange` semantics). */
  clickable?: boolean
  /** Strips built-in styles when true. */
  unstyled?: boolean
}

const props = withDefaults(defineProps<StepsProps>(), {
  direction: 'horizontal',
  type: 'default',
  clickable: undefined,
})

const emit = defineEmits<{
  (e: 'change', current: number): void
}>()

defineSlots<{
  icon(props: { item: StepItem; index: number; status: string }): unknown
}>()

const slots = useSlots()
const hasIconSlot = computed(() => !!slots.icon)

const { resolvedSize } = useConfigWithDefaults({ size: undefined }, {})
const realSize = computed<SizeType>(() => props.size ?? resolvedSize.value)
const stepsSize = computed(() => (realSize.value === 'small' ? 'small' : 'default'))

const instance = getCurrentInstance()
const hasOnChange = computed(() => {
  if (props.clickable !== undefined) return props.clickable
  const vp = instance?.vnode?.props
  return !!(vp && (vp.onChange || vp['onChange']))
})

function resolveStatus(index: number, override?: StepItem['status']): string {
  if (override) return override
  if (index < props.current) return 'finish'
  if (index === props.current) return 'process'
  return 'wait'
}

const rootClasses = computed(() =>
  [
    'sg-steps',
    `sg-steps-${props.direction}`,
    `sg-steps-${stepsSize.value}`,
    props.type === 'navigation' ? 'sg-steps-navigation' : '',
  ]
    .filter(Boolean)
    .join(' '),
)

function itemClasses(status: string, clickable: boolean) {
  return ['sg-steps-item', `sg-steps-item-${status}`, clickable ? 'sg-steps-item-clickable' : '']
    .filter(Boolean)
    .join(' ')
}

function emitChange(i: number) {
  if (!hasOnChange.value) return
  emit('change', i)
}
</script>

<template>
  <div v-if="unstyled">
    <div
      v-for="(item, i) in items"
      :key="i"
      :data-status="resolveStatus(i, item.status)"
      @click="emitChange(i)"
    >
      <span>
        <slot name="icon" :item="item" :index="i" :status="resolveStatus(i, item.status)">
          {{ item.icon ?? (resolveStatus(i, item.status) === 'finish' ? '✓' : i + 1) }}
        </slot>
      </span>
      <span>{{ item.title }}</span>
      <span v-if="item.description">{{ item.description }}</span>
    </div>
  </div>
  <div v-else :class="rootClasses" role="list">
    <div
      v-for="(item, i) in items"
      :key="i"
      :class="itemClasses(resolveStatus(i, item.status), hasOnChange)"
      :aria-current="resolveStatus(i, item.status) === 'process' ? 'step' : undefined"
      @click="emitChange(i)"
    >
      <div class="sg-steps-item-container">
        <div class="sg-steps-item-icon">
          <span v-if="hasIconSlot || item.icon" class="sg-steps-icon-custom">
            <slot name="icon" :item="item" :index="i" :status="resolveStatus(i, item.status)">{{
              item.icon
            }}</slot>
          </span>
          <span v-else class="sg-steps-icon">
            <svg
              v-if="resolveStatus(i, item.status) === 'finish'"
              viewBox="64 64 896 896"
              width="1em"
              height="1em"
              fill="currentColor"
            >
              <path
                d="M912 190h-69.9c-9.8 0-19.1 4.5-25.1 12.2L404.7 724.5 207 474a32 32 0 00-25.1-12.2H112c-6.7 0-10.4 7.7-6.3 12.9l273.9 347c12.8 16.2 37.4 16.2 50.3 0l488.4-618.9c4.1-5.1.4-12.8-6.3-12.8z"
              />
            </svg>
            <svg
              v-else-if="resolveStatus(i, item.status) === 'error'"
              viewBox="64 64 896 896"
              width="1em"
              height="1em"
              fill="currentColor"
            >
              <path
                d="M563.8 512l262.5-312.9c4.4-5.2.7-13.1-6.1-13.1h-79.8c-4.7 0-9.2 2.1-12.3 5.7L512 449.8 295.9 191.7c-3-3.6-7.5-5.7-12.3-5.7H203.8c-6.8 0-10.5 7.9-6.1 13.1L460.2 512 197.7 824.9A7.95 7.95 0 00203.8 838h79.8c4.7 0 9.2-2.1 12.3-5.7L512 574.1l216.1 258.1c3 3.6 7.5 5.7 12.3 5.7h79.8c6.8 0 10.5-7.9 6.1-13.1L563.8 512z"
              />
            </svg>
            <template v-else>{{ i + 1 }}</template>
          </span>
        </div>
        <div class="sg-steps-item-content">
          <div class="sg-steps-item-title">
            {{ item.title }}
            <span
              v-if="direction === 'horizontal' && i < items.length - 1"
              class="sg-steps-item-tail"
            />
          </div>
          <div v-if="item.description" class="sg-steps-item-description">
            {{ item.description }}
          </div>
        </div>
      </div>
      <div
        v-if="direction === 'vertical' && i < items.length - 1"
        class="sg-steps-item-tail-vertical"
      />
    </div>
  </div>
</template>
