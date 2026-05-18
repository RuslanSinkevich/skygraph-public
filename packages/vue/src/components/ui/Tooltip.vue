<script setup lang="ts">
import { ref } from 'vue'
import SgTransition from './Transition.vue'

let uid = 0
function genId() {
  return `sg-tooltip-${++uid}`
}

export interface TooltipProps {
  /**
   * Plain-text content shown in the tooltip.
   * For rich content, use the `title` slot instead — when present, the slot
   * takes precedence and may render any VNodes.
   */
  title?: string
  /** Tooltip position relative to the trigger. @default 'top' */
  placement?: 'top' | 'bottom' | 'left' | 'right'
  /** Strips built-in styles when true. */
  unstyled?: boolean
}

withDefaults(defineProps<TooltipProps>(), {
  placement: 'top',
  title: '',
})

defineSlots<{
  default(props: Record<string, never>): unknown
  title(props: Record<string, never>): unknown
}>()

const visible = ref(false)
const tooltipId = genId()

function show() {
  visible.value = true
}

function hide() {
  visible.value = false
}
</script>

<template>
  <span
    v-if="unstyled"
    :class="undefined"
    style="position: relative; display: inline-block"
    @mouseenter="show"
    @mouseleave="hide"
  >
    <span
      :aria-describedby="visible ? tooltipId : undefined"
      style="display: inline-block"
      @focusin="show"
      @focusout="hide"
    >
      <slot />
    </span>
    <span v-if="visible" :id="tooltipId" role="tooltip">
      <slot name="title">{{ title }}</slot>
    </span>
  </span>
  <span
    v-else
    class="sg-tooltip-wrapper"
    :aria-describedby="visible ? tooltipId : undefined"
    @mouseenter="show"
    @mouseleave="hide"
  >
    <span style="display: inline-block" @focusin="show" @focusout="hide">
      <slot />
    </span>
    <SgTransition :visible="visible" name="sg-fade">
      <span :id="tooltipId" role="tooltip" :class="`sg-tooltip sg-tooltip-${placement}`">
        <span class="sg-tooltip-content">
          <slot name="title">{{ title }}</slot>
        </span>
        <span class="sg-tooltip-arrow" />
      </span>
    </SgTransition>
  </span>
</template>
