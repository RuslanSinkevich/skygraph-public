<script setup lang="ts">
import { computed, defineComponent, h, useSlots } from 'vue'

export interface ResultProps {
  /** Outcome type controlling default icon and styling. */
  status: 'success' | 'error' | 'info' | 'warning' | '404' | '403' | '500'
  /** Primary heading for the result. */
  title: string
  /** Secondary explanatory text below the title. */
  subTitle?: string
  /** Strips built-in styles when true. */
  unstyled?: boolean
}

const props = defineProps<ResultProps>()

defineSlots<{
  default(props: Record<string, never>): unknown
  icon(props: Record<string, never>): unknown
  extra(props: Record<string, never>): unknown
}>()

const slots = useSlots()
const hasCustomIcon = computed(() => Boolean(slots.icon))
const hasExtra = computed(() => Boolean(slots.extra))
const hasChildren = computed(() => Boolean(slots.default))

const STATUS_COLOR: Record<string, string> = {
  success: 'var(--sg-color-success)',
  error: 'var(--sg-color-error)',
  info: 'var(--sg-color-primary)',
  warning: 'var(--sg-color-warning)',
  '404': 'var(--sg-color-text-tertiary)',
  '403': 'var(--sg-color-text-tertiary)',
  '500': 'var(--sg-color-text-tertiary)',
}

const iconColor = computed(() => STATUS_COLOR[props.status])
const rootClasses = computed(() => `sg-result sg-result-${props.status}`)

const DefaultIcon = defineComponent({
  name: 'SgResultDefaultIcon',
  props: { status: { type: String, required: true } },
  setup(p) {
    return () => {
      const status = p.status
      const common = {
        viewBox: '64 64 896 896',
        width: '72',
        height: '72',
        fill: 'currentColor',
      }
      if (status === 'success') {
        return h('svg', common, [
          h('path', {
            d: 'M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm193.5 301.7l-210.6 292a31.8 31.8 0 01-51.7 0L318.5 484.9c-3.8-5.3 0-12.7 6.5-12.7h46.9c10.2 0 19.9 4.9 25.9 13.3l71.2 98.8 157.2-218c6-8.3 15.6-13.3 25.9-13.3H699c6.5 0 10.3 7.4 6.5 12.7z',
          }),
        ])
      }
      if (status === 'error') {
        return h('svg', common, [
          h('path', {
            d: 'M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm165.4 618.2l-66-.3L512 563.4l-99.3 118.4-66.1.3c-4.4 0-8-3.5-8-8 0-1.9.7-3.7 1.9-5.2l130.1-155L340.5 359a8.32 8.32 0 01-1.9-5.2c0-4.4 3.6-8 8-8l66.1.3L512 464.6l99.3-118.4 66-.3c4.4 0 8 3.5 8 8 0 1.9-.7 3.7-1.9 5.2L553.5 514l130 155c1.2 1.5 1.9 3.3 1.9 5.2 0 4.4-3.6 8-8 8z',
          }),
        ])
      }
      if (status === 'info') {
        return h('svg', common, [
          h('path', {
            d: 'M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm32 664c0 4.4-3.6 8-8 8h-48c-4.4 0-8-3.6-8-8V456c0-4.4 3.6-8 8-8h48c4.4 0 8 3.6 8 8v272zm-32-344a48.01 48.01 0 010-96 48.01 48.01 0 010 96z',
          }),
        ])
      }
      if (status === 'warning') {
        return h('svg', common, [
          h('path', {
            d: 'M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm-32 232c0-4.4 3.6-8 8-8h48c4.4 0 8 3.6 8 8v272c0 4.4-3.6 8-8 8h-48c-4.4 0-8-3.6-8-8V296zm32 440a48.01 48.01 0 010-96 48.01 48.01 0 010 96z',
          }),
        ])
      }
      return h(
        'svg',
        {
          viewBox: '0 0 252 294',
          width: '252',
          height: '294',
          fill: 'none',
          xmlns: 'http://www.w3.org/2000/svg',
        },
        [
          h(
            'text',
            {
              x: '50%',
              y: '50%',
              'dominant-baseline': 'middle',
              'text-anchor': 'middle',
              fill: 'currentColor',
              'font-size': '80',
              'font-weight': 'bold',
              opacity: '0.25',
            },
            status,
          ),
        ],
      )
    }
  },
})
</script>

<template>
  <div v-if="unstyled" role="status" aria-live="polite">
    <div>
      <slot v-if="hasCustomIcon" name="icon" />
      <DefaultIcon v-else :status="status" />
    </div>
    <div>{{ title }}</div>
    <div v-if="subTitle">{{ subTitle }}</div>
    <div v-if="hasExtra"><slot name="extra" /></div>
    <slot />
  </div>
  <div
    v-else
    :class="rootClasses"
    role="status"
    aria-live="polite"
  >
    <div class="sg-result-icon" :style="{ color: iconColor }">
      <slot v-if="hasCustomIcon" name="icon" />
      <DefaultIcon v-else :status="status" />
    </div>
    <div class="sg-result-title">{{ title }}</div>
    <div v-if="subTitle" class="sg-result-subtitle">{{ subTitle }}</div>
    <div v-if="hasExtra" class="sg-result-extra"><slot name="extra" /></div>
    <div v-if="hasChildren" class="sg-result-content"><slot /></div>
  </div>
</template>
