import { ref, watch, onMounted, onScopeDispose, type Ref } from 'vue'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(', ')

function isHidden(el: HTMLElement): boolean {
  if (el.hasAttribute('aria-hidden') && el.getAttribute('aria-hidden') === 'true') return true
  if (el.hasAttribute('hidden')) return true
  // `offsetParent === null` is unreliable in headless DOM environments
  // (jsdom) where layout is never computed. Walk the tree and look only for
  // explicit display/visibility states which jsdom does honour.
  let cur: HTMLElement | null = el
  while (cur) {
    const style = (cur.ownerDocument?.defaultView ?? globalThis).getComputedStyle?.(cur)
    if (style && (style.display === 'none' || style.visibility === 'hidden')) return true
    cur = cur.parentElement
  }
  return false
}

function queryFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !isHidden(el),
  )
}

/**
 * Vue 3 composable parallel to React's `useFocusTrap`.
 *
 * Returns a template ref to bind to a container element. While `active.value`
 * is `true`, Tab/Shift+Tab cycle focus inside the container, and focus is
 * restored to the previously-focused element when the trap deactivates.
 */
export function useFocusTrap(active: Ref<boolean> | (() => boolean)) {
  const containerRef = ref<HTMLElement | null>(null)

  let previousFocus: HTMLElement | null = null
  let attachedEl: HTMLElement | null = null

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return
    const container = attachedEl
    if (!container) return

    const list = queryFocusable(container)
    if (list.length === 0) {
      e.preventDefault()
      container.focus()
      return
    }

    const first = list[0]
    const last = list[list.length - 1]
    const activeEl = document.activeElement as HTMLElement | null

    if (e.shiftKey) {
      if (activeEl === first || !container.contains(activeEl)) {
        e.preventDefault()
        last.focus()
      }
    } else {
      if (activeEl === last || !container.contains(activeEl)) {
        e.preventDefault()
        first.focus()
      }
    }
  }

  const detach = () => {
    if (!attachedEl) return
    attachedEl.removeEventListener('keydown', handleKeyDown)
    attachedEl = null
    if (previousFocus && typeof previousFocus.focus === 'function') {
      previousFocus.focus()
      previousFocus = null
    }
  }

  const attach = (el: HTMLElement) => {
    if (attachedEl === el) return
    detach()
    attachedEl = el
    previousFocus = document.activeElement as HTMLElement | null
    el.addEventListener('keydown', handleKeyDown)

    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => {
        const focusable = queryFocusable(el)
        if (focusable.length > 0) {
          focusable[0].focus()
        } else {
          if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1')
          el.focus()
        }
      })
    }
  }

  const isActive = () => (typeof active === 'function' ? active() : active.value)

  const sync = () => {
    if (isActive() && containerRef.value) {
      attach(containerRef.value)
    } else {
      detach()
    }
  }

  // Use `flush: 'sync'` so the listener attaches the moment the template ref
  // resolves to a DOM element. With `flush: 'post'` the watch defers until
  // the next render flush, which can be after a synchronous keydown dispatch
  // in tests and miss the event entirely. `onMounted` provides a backup hook
  // for cases where the ref is bound before the watcher tracks it.
  watch([containerRef, () => isActive()], sync, { flush: 'sync' })
  onMounted(sync)

  onScopeDispose(() => {
    detach()
  })

  return containerRef
}
