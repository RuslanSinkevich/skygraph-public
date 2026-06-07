<script setup lang="ts">
import { computed, defineComponent, h, useSlots } from 'vue'
import { useConfig } from './ConfigProvider.vue'

export interface EmptyProps {
  /**
   * Description text below the image. Pass `null` to hide. Defaults to "No Data"
   * (or `locale.empty.description` if provided).
   */
  description?: string | null
  /** Strips built-in styles when true. */
  unstyled?: boolean
}

const props = defineProps<EmptyProps>()

defineSlots<{
  default(props: Record<string, never>): unknown
  image(props: Record<string, never>): unknown
  description(props: Record<string, never>): unknown
}>()

const slots = useSlots()
const cfg = useConfig()

const description = computed(() => {
  if (props.description === null) return null
  if (props.description !== undefined) return props.description
  return cfg.value.locale?.empty?.description ?? 'No Data'
})

const hasChildren = computed(() => Boolean(slots.default))
const hasCustomImage = computed(() => Boolean(slots.image))
const hasCustomDescription = computed(() => Boolean(slots.description))
const showDescription = computed(
  () => hasCustomDescription.value || (props.description !== null && description.value !== null),
)

// Global `ConfigProvider.renderEmpty` overrides the default art when the
// caller did not customize the Empty content explicitly.
const useCustomEmpty = computed(
  () =>
    Boolean(cfg.value.renderEmpty) &&
    props.description === undefined &&
    !slots.image &&
    !slots.description &&
    !slots.default,
)
const CustomEmpty = defineComponent({
  name: 'SgEmptyCustom',
  setup() {
    return () => cfg.value.renderEmpty?.('Empty')
  },
})

const DefaultEmptyImage = defineComponent({
  name: 'SgEmptyDefaultImage',
  setup() {
    return () =>
      h(
        'svg',
        {
          width: '64',
          height: '41',
          viewBox: '0 0 64 41',
          xmlns: 'http://www.w3.org/2000/svg',
        },
        [
          h('g', { fill: 'none', 'fill-rule': 'evenodd', transform: 'translate(0 1)' }, [
            h('ellipse', {
              cx: '32',
              cy: '33',
              rx: '32',
              ry: '7',
              fill: 'currentColor',
              opacity: '0.08',
            }),
            h(
              'g',
              {
                'fill-rule': 'nonzero',
                stroke: 'currentColor',
                'stroke-opacity': '0.25',
              },
              [
                h('path', {
                  d: 'M55 12.76L44.854 1.258C44.367.474 43.656 0 42.907 0H21.093c-.749 0-1.46.474-1.947 1.257L9 12.761V22h46v-9.24z',
                }),
                h('path', {
                  d: 'M41.613 15.931c0-1.605.994-2.93 2.227-2.931H55v18.137C55 33.26 53.68 35 52.05 35H11.95C10.32 35 9 33.259 9 31.137V13h11.16c1.233 0 2.227 1.323 2.227 2.928v.022c0 1.605 1.005 2.901 2.237 2.901h14.752c1.232 0 2.237-1.308 2.237-2.913v-.007z',
                  fill: 'currentColor',
                  opacity: '0.08',
                }),
              ],
            ),
          ]),
        ],
      )
  },
})
</script>

<template>
  <CustomEmpty v-if="useCustomEmpty" />
  <div v-else-if="unstyled" role="status">
    <div>
      <slot v-if="hasCustomImage" name="image" />
      <DefaultEmptyImage v-else />
    </div>
    <p v-if="showDescription">
      <slot name="description">{{ description }}</slot>
    </p>
    <slot />
  </div>
  <div v-else class="sg-empty" role="status">
    <div class="sg-empty-image">
      <slot v-if="hasCustomImage" name="image" />
      <DefaultEmptyImage v-else />
    </div>
    <p v-if="showDescription" class="sg-empty-description">
      <slot name="description">{{ description }}</slot>
    </p>
    <div v-if="hasChildren" class="sg-empty-footer"><slot /></div>
  </div>
</template>
