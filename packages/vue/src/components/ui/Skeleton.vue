<script setup lang="ts">
import { computed } from 'vue'
import { useConfig } from './ConfigProvider.vue'

export interface SkeletonAvatar {
  size?: number
  shape?: 'circle' | 'square'
}

export interface SkeletonTitle {
  width?: number | string
}

export interface SkeletonParagraph {
  rows?: number
  width?: Array<number | string>
}

export interface SkeletonProps {
  /** Enables a shimmering animation. @default false */
  active?: boolean
  /** Shows an avatar block; pass an object for `size` and `shape`. */
  avatar?: boolean | SkeletonAvatar
  /** Shows a title bar; pass an object for custom `width`. @default true */
  title?: boolean | SkeletonTitle
  /** Shows paragraph lines; pass an object for `rows` and per-line `width`. @default true */
  paragraph?: boolean | SkeletonParagraph
  /** When false, renders default slot instead of the skeleton. @default true */
  loading?: boolean
  /** Strips built-in styles when true. */
  unstyled?: boolean
}

const props = withDefaults(defineProps<SkeletonProps>(), {
  active: false,
  title: true,
  paragraph: true,
  loading: true,
})

defineSlots<{
  default(props: Record<string, never>): unknown
}>()

const avatarSize = computed(() =>
  typeof props.avatar === 'object' ? (props.avatar.size ?? 40) : 40,
)
const avatarShape = computed(() =>
  typeof props.avatar === 'object' ? (props.avatar.shape ?? 'circle') : 'circle',
)
const titleWidth = computed<string | number>(() =>
  typeof props.title === 'object' ? (props.title.width ?? '38%') : '38%',
)
const rows = computed(() => (typeof props.paragraph === 'object' ? (props.paragraph.rows ?? 3) : 3))
const rowWidths = computed(() =>
  typeof props.paragraph === 'object' ? props.paragraph.width : undefined,
)

function getRowWidth(index: number, total: number): string | number {
  const widths = rowWidths.value
  if (widths && widths[index] !== undefined) return widths[index]
  if (index === total - 1) return '61%'
  return '100%'
}

function toCss(w: string | number): string {
  return typeof w === 'number' ? `${w}px` : w
}

const cfg = useConfig()
const loadingLabel = computed(() => cfg.value.locale?.skeleton?.loading ?? 'Loading')

const rootClasses = computed(() =>
  [
    'sg-skeleton',
    props.active ? 'sg-skeleton-active' : '',
    props.avatar ? 'sg-skeleton-with-avatar' : '',
  ]
    .filter(Boolean)
    .join(' '),
)
</script>

<template>
  <slot v-if="!loading" />
  <div v-else-if="unstyled" aria-busy="true" :aria-label="loadingLabel">
    <div v-if="avatar" :style="{ width: `${avatarSize}px`, height: `${avatarSize}px` }" />
    <div>
      <div v-if="title" :style="{ width: toCss(titleWidth), height: '16px' }" />
      <template v-if="paragraph">
        <div
          v-for="i in rows"
          :key="i"
          :style="{ width: toCss(getRowWidth(i - 1, rows)), height: '16px' }"
        />
      </template>
    </div>
  </div>
  <div v-else :class="rootClasses" aria-busy="true" :aria-label="loadingLabel">
    <div v-if="avatar" class="sg-skeleton-header">
      <span
        :class="['sg-skeleton-avatar', `sg-skeleton-avatar-${avatarShape}`]"
        :style="{ width: `${avatarSize}px`, height: `${avatarSize}px` }"
      />
    </div>
    <div class="sg-skeleton-content">
      <div v-if="title" class="sg-skeleton-title" :style="{ width: toCss(titleWidth) }" />
      <ul v-if="paragraph" class="sg-skeleton-paragraph">
        <li v-for="i in rows" :key="i" :style="{ width: toCss(getRowWidth(i - 1, rows)) }" />
      </ul>
    </div>
  </div>
</template>
