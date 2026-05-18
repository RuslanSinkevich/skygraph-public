<script lang="ts">
import {
  Comment,
  Fragment,
  Text,
  cloneVNode,
  computed,
  defineComponent,
  onBeforeUnmount,
  ref,
  watch,
  type PropType,
  type VNode,
} from 'vue'

export interface TransitionProps {
  /** When `true`, runs enter; when `false`, runs leave (and may unmount). */
  visible: boolean
  /** Base class name prefix for default enter/leave classes. @default 'sg-fade' */
  name?: string
  /** Animation length in ms before idle phase and after callbacks. @default 200 */
  duration?: number
  /** Custom initial class for the enter frame (with `-enter-active`). */
  enterFrom?: string
  /** Custom final class for the enter-active frame. */
  enterTo?: string
  /** Custom initial class for the leave frame (with `-leave-active`). */
  leaveFrom?: string
  /** Custom final class for the leave-active frame. */
  leaveTo?: string
  /** When `true`, removes the child from the tree after leave. @default true */
  unmountOnExit?: boolean
}

type Phase = 'idle' | 'enter' | 'enter-active' | 'leave' | 'leave-active'

function findFirstElement(nodes: VNode[]): VNode | null {
  for (const node of nodes) {
    if (node.type === Comment || node.type === Text) continue
    if (node.type === Fragment && Array.isArray(node.children)) {
      const inner = findFirstElement(node.children as VNode[])
      if (inner) return inner
      continue
    }
    return node
  }
  return null
}

/**
 * Class-based enter/leave animation that mirrors the React `Transition` contract.
 * Clones the single child VNode and merges generated transition classes into it.
 */
export default defineComponent({
  name: 'SgTransition',
  props: {
    visible: { type: Boolean, required: true },
    name: { type: String, default: 'sg-fade' },
    duration: { type: Number, default: 200 },
    enterFrom: { type: String, default: undefined },
    enterTo: { type: String, default: undefined },
    leaveFrom: { type: String, default: undefined },
    leaveTo: { type: String, default: undefined },
    unmountOnExit: { type: Boolean, default: true },
    onAfterEnter: { type: Function as PropType<() => void>, default: undefined },
    onAfterLeave: { type: Function as PropType<() => void>, default: undefined },
  },
  emits: ['afterEnter', 'afterLeave'],
  setup(props, { slots, emit }) {
    const mounted = ref(props.visible)
    const phase = ref<Phase>('idle')
    let timer: ReturnType<typeof setTimeout> | undefined

    const enterClasses = computed(() => {
      if (props.enterFrom && props.enterTo) {
        return {
          from: props.enterFrom,
          active: `${props.name}-enter-active`,
          to: props.enterTo,
        }
      }
      return {
        from: `${props.name}-enter-from`,
        active: `${props.name}-enter-active`,
        to: `${props.name}-enter-to`,
      }
    })

    const leaveClasses = computed(() => {
      if (props.leaveFrom && props.leaveTo) {
        return {
          from: props.leaveFrom,
          active: `${props.name}-leave-active`,
          to: props.leaveTo,
        }
      }
      return {
        from: `${props.name}-leave-from`,
        active: `${props.name}-leave-active`,
        to: `${props.name}-leave-to`,
      }
    })

    watch(
      () => props.visible,
      (next, prev) => {
        if (next === prev) return
        if (timer) clearTimeout(timer)

        if (next) {
          mounted.value = true
          phase.value = 'enter'
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              phase.value = 'enter-active'
            })
          })
          timer = setTimeout(() => {
            phase.value = 'idle'
            emit('afterEnter')
            props.onAfterEnter?.()
          }, props.duration)
        } else {
          phase.value = 'leave'
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              phase.value = 'leave-active'
            })
          })
          timer = setTimeout(() => {
            phase.value = 'idle'
            if (props.unmountOnExit) mounted.value = false
            emit('afterLeave')
            props.onAfterLeave?.()
          }, props.duration)
        }
      },
    )

    onBeforeUnmount(() => {
      if (timer) clearTimeout(timer)
    })

    const transitionClass = computed(() => {
      switch (phase.value) {
        case 'enter':
          return `${enterClasses.value.from} ${enterClasses.value.active}`
        case 'enter-active':
          return `${enterClasses.value.to} ${enterClasses.value.active}`
        case 'leave':
          return `${leaveClasses.value.from} ${leaveClasses.value.active}`
        case 'leave-active':
          return `${leaveClasses.value.to} ${leaveClasses.value.active}`
        default:
          return ''
      }
    })

    return () => {
      if (!mounted.value && props.unmountOnExit) return null
      const children = slots.default?.() ?? []
      const first = findFirstElement(children)
      if (!first) return null
      const cls = transitionClass.value
      if (!cls) return cloneVNode(first)
      return cloneVNode(first, { class: cls })
    }
  },
})
</script>
