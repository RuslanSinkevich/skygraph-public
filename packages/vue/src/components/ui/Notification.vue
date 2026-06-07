<script lang="ts">
import { computed, defineComponent, onBeforeUnmount, onMounted, ref, h, type PropType } from 'vue'
import SgTransition from './Transition.vue'
import { useConfig } from './ConfigProvider.vue'

/** Visual variant for notification styling and icon. */
export type NotificationType = 'success' | 'error' | 'warning' | 'info'

/** Options passed to `notification.open` and shorthand helpers. */
export interface NotificationConfig {
  type?: NotificationType
  message: string
  description?: string
  duration?: number
  key?: string
  onClose?: () => void
  placement?: 'topRight' | 'topLeft' | 'bottomRight' | 'bottomLeft'
}

interface NotificationItem extends NotificationConfig {
  id: string
}

type Listener = (items: NotificationItem[]) => void

const listeners = new Set<Listener>()
let items: NotificationItem[] = []
let counter = 0

function notifyAll() {
  const snapshot = [...items]
  for (const fn of [...listeners]) fn(snapshot)
}

function addNotification(config: NotificationConfig) {
  const id = config.key ?? `sg-notif-${++counter}`
  const item: NotificationItem = { ...config, id }
  items = [...items, item]
  notifyAll()
  const duration = config.duration ?? 4500
  if (duration > 0) {
    setTimeout(() => removeNotification(id), duration)
  }
}

function removeNotification(id: string) {
  items = items.filter((i) => i.id !== id)
  notifyAll()
}

/** Imperative notification API. Mirrors React `notification` singleton. */
export const notification = {
  open: (config: NotificationConfig) => addNotification(config),
  success: (message: string, description?: string) =>
    addNotification({ type: 'success', message, description }),
  error: (message: string, description?: string) =>
    addNotification({ type: 'error', message, description }),
  warning: (message: string, description?: string) =>
    addNotification({ type: 'warning', message, description }),
  info: (message: string, description?: string) =>
    addNotification({ type: 'info', message, description }),
  destroy: () => {
    items = []
    notifyAll()
  },
}

/** Composable returning the same `notification` singleton. */
export function useNotification() {
  return notification
}

const TYPE_ICONS: Record<NotificationType, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
}

export interface NotificationContainerProps {
  /** Which corner this container listens to. @default 'topRight' */
  placement?: 'topRight' | 'topLeft' | 'bottomRight' | 'bottomLeft'
  /** Strips built-in styles when true. */
  unstyled?: boolean
}

/**
 * Subscribes to the global notification store and renders matching toasts.
 */
const NotificationContainer = defineComponent({
  name: 'SgNotificationContainer',
  props: {
    placement: {
      type: String as PropType<'topRight' | 'topLeft' | 'bottomRight' | 'bottomLeft'>,
      default: 'topRight',
    },
    unstyled: { type: Boolean, default: false },
  },
  setup(props) {
    const list = ref<NotificationItem[]>([])
    const listener: Listener = (next) => {
      list.value = next
    }

    onMounted(() => {
      listeners.add(listener)
      list.value = [...items]
    })
    onBeforeUnmount(() => {
      listeners.delete(listener)
    })

    const filtered = computed(() =>
      list.value.filter((i) => (i.placement ?? 'topRight') === props.placement),
    )

    const containerClass = computed(() =>
      props.unstyled ? undefined : `sg-notification-container sg-notification-${props.placement}`,
    )

    const cfg = useConfig()
    const closeAriaLabel = computed(() => cfg.value.locale?.notification?.closeAriaLabel ?? 'Close')

    const close = (item: NotificationItem) => {
      removeNotification(item.id)
      item.onClose?.()
    }

    return () => {
      if (filtered.value.length === 0) return null
      return h(
        'div',
        { class: containerClass.value },
        filtered.value.map((item) => {
          const type = item.type ?? 'info'
          const transitionName = props.placement.includes('Right')
            ? 'sg-slide-right'
            : 'sg-slide-left'

          const card = props.unstyled
            ? h('div', { role: 'alert' }, [
                h('span', TYPE_ICONS[type]),
                h('span', item.message),
                item.description ? h('div', item.description) : null,
                h(
                  'button',
                  {
                    type: 'button',
                    'aria-label': closeAriaLabel.value,
                    onClick: () => close(item),
                  },
                  '×',
                ),
              ])
            : h(
                'div',
                {
                  class: `sg-notification sg-notification-${type}`,
                  role: 'alert',
                },
                [
                  h('div', { class: 'sg-notification-icon' }, TYPE_ICONS[type]),
                  h('div', { class: 'sg-notification-content' }, [
                    h('div', { class: 'sg-notification-message' }, item.message),
                    item.description
                      ? h('div', { class: 'sg-notification-description' }, item.description)
                      : null,
                  ]),
                  h(
                    'button',
                    {
                      class: 'sg-notification-close',
                      type: 'button',
                      'aria-label': closeAriaLabel.value,
                      onClick: () => close(item),
                    },
                    '×',
                  ),
                ],
              )

          return h(
            SgTransition,
            {
              key: item.id,
              visible: true,
              name: transitionName,
              unmountOnExit: false,
            },
            { default: () => h('div', card) },
          )
        }),
      )
    }
  },
})

export { NotificationContainer }
export default NotificationContainer
</script>
