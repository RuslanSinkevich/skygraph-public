<script setup lang="ts">
import { computed, useSlots } from 'vue'
import type { CSSProperties } from 'vue'
import type { SizeType } from '../../types'
import { useConfigWithDefaults } from './ConfigProvider.vue'

export interface InputGroupProps {
  compact?: boolean
  size?: SizeType
  unstyled?: boolean
  style?: CSSProperties
}

const props = withDefaults(defineProps<InputGroupProps>(), {
  compact: true,
})

defineSlots<{
  before(props: Record<string, never>): unknown
  default(props: Record<string, never>): unknown
  after(props: Record<string, never>): unknown
}>()

const { resolvedSize } = useConfigWithDefaults(props, {})

const slots = useSlots()
const hasBefore = computed(() => Boolean(slots.before))
const hasAfter = computed(() => Boolean(slots.after))

const classes = computed(() =>
  props.unstyled
    ? ''
    : [
        'sg-input-group',
        `sg-input-group-${resolvedSize.value}`,
        props.compact ? 'sg-input-group-compact' : '',
      ]
        .filter(Boolean)
        .join(' '),
)
</script>

<template>
  <span v-if="!unstyled" :class="classes" :style="style">
    <span v-if="hasBefore" class="sg-input-group-addon"><slot name="before" /></span>
    <slot />
    <span v-if="hasAfter" class="sg-input-group-addon"><slot name="after" /></span>
  </span>
  <span v-else :style="style">
    <slot name="before" />
    <slot />
    <slot name="after" />
  </span>
</template>
