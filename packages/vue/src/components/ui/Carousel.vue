<script lang="ts">
import {
  Comment,
  Fragment,
  Text,
  computed,
  defineComponent,
  h,
  onBeforeUnmount,
  ref,
  watch,
  type PropType,
  type VNode,
} from 'vue'

export interface CarouselProps {
  /** Auto-advance slides on an interval. @default false */
  autoplay?: boolean
  /** Interval in ms between autoplay steps. @default 3000 */
  autoplaySpeed?: number
  /** Show dot navigation. @default true */
  dots?: boolean
  /** Where dots are placed. @default 'bottom' */
  dotPosition?: 'top' | 'bottom' | 'left' | 'right'
  /** Slide transition. @default 'slide' */
  effect?: 'slide' | 'fade'
  /** Strips built-in styles when true. */
  unstyled?: boolean
}

function flatten(nodes: VNode[]): VNode[] {
  const out: VNode[] = []
  for (const node of nodes) {
    if (node.type === Comment) continue
    if (node.type === Text) continue
    if (node.type === Fragment && Array.isArray(node.children)) {
      out.push(...flatten(node.children as VNode[]))
      continue
    }
    out.push(node)
  }
  return out
}

export default defineComponent({
  name: 'SgCarousel',
  props: {
    autoplay: { type: Boolean, default: false },
    autoplaySpeed: { type: Number, default: 3000 },
    dots: { type: Boolean, default: true },
    dotPosition: {
      type: String as PropType<'top' | 'bottom' | 'left' | 'right'>,
      default: 'bottom',
    },
    effect: {
      type: String as PropType<'slide' | 'fade'>,
      default: 'slide',
    },
    unstyled: { type: Boolean, default: false },
  },
  setup(props, { slots }) {
    const current = ref(0)
    const slideCount = ref(0)
    let timer: ReturnType<typeof setInterval> | undefined

    function goTo(index: number, total: number) {
      if (total === 0) {
        current.value = 0
        return
      }
      current.value = ((index % total) + total) % total
    }

    function startAutoplay() {
      if (timer) clearInterval(timer)
      const total = slideCount.value
      if (!props.autoplay || total <= 1) return
      timer = setInterval(() => goTo(current.value + 1, total), props.autoplaySpeed)
    }

    watch(
      () => [props.autoplay, props.autoplaySpeed, slideCount.value] as const,
      () => startAutoplay(),
    )

    onBeforeUnmount(() => {
      if (timer) clearInterval(timer)
    })

    const isVertical = computed(
      () => props.dotPosition === 'left' || props.dotPosition === 'right',
    )

    return () => {
      const raw = slots.default?.() ?? []
      const slides = flatten(raw)
      const count = slides.length
      if (slideCount.value !== count) {
        slideCount.value = count
      }
      if (current.value >= count && count > 0) {
        current.value = count - 1
      }

      if (props.unstyled) {
        return h('div', null, [
          slides[current.value] ? h('div', null, [slides[current.value]]) : null,
          props.dots
            ? h(
                'div',
                null,
                slides.map((_, i) =>
                  h(
                    'button',
                    {
                      key: i,
                      type: 'button',
                      'aria-current': i === current.value,
                      onClick: () => goTo(i, count),
                    },
                    String(i + 1),
                  ),
                ),
              )
            : null,
        ])
      }

      const rootClasses = [
        'sg-carousel',
        `sg-carousel-dots-${props.dotPosition}`,
        isVertical.value ? 'sg-carousel-vertical' : '',
      ]
        .filter(Boolean)
        .join(' ')

      return h('div', { class: rootClasses }, [
        h('div', { class: 'sg-carousel-container' }, [
          h(
            'div',
            { class: 'sg-carousel-track' },
            slides.map((slide, i) =>
              h(
                'div',
                {
                  key: i,
                  class: [
                    'sg-carousel-slide',
                    i === current.value ? 'sg-carousel-slide-active' : '',
                    `sg-carousel-effect-${props.effect}`,
                  ],
                  style:
                    props.effect === 'slide'
                      ? { transform: `translateX(${(i - current.value) * 100}%)` }
                      : undefined,
                  'aria-hidden': i !== current.value,
                },
                [slide],
              ),
            ),
          ),
        ]),
        props.dots && count > 1
          ? h(
              'div',
              {
                class: ['sg-carousel-dots', isVertical.value ? 'sg-carousel-dots-vertical' : ''],
              },
              slides.map((_, i) =>
                h('button', {
                  key: i,
                  type: 'button',
                  class: [
                    'sg-carousel-dot',
                    i === current.value ? 'sg-carousel-dot-active' : '',
                  ],
                  'aria-label': `Slide ${i + 1}`,
                  onClick: () => goTo(i, count),
                }),
              ),
            )
          : null,
      ])
    }
  },
})
</script>
