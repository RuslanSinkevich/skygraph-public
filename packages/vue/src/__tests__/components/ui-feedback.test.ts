import { describe, it, expect, vi } from 'vitest'
import { defineComponent, nextTick } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import {
  SgSpin,
  SgModal,
  SgDrawer,
  SgPopconfirm,
  SgTooltip,
  SgProgress,
  SgResult,
  SgEmpty,
  SgSkeleton,
  SgNotificationContainer,
  notification,
} from '../../components/ui'

describe('SgSpin', () => {
  it('renders default spinner with role=status', () => {
    const wrapper = mount(SgSpin)
    expect(wrapper.find('.sg-spin').exists()).toBe(true)
    expect(wrapper.find('[role="status"]').exists()).toBe(true)
  })

  it('applies size class for small', () => {
    const wrapper = mount(SgSpin, { props: { size: 'small' } })
    expect(wrapper.find('.sg-spin-small').exists()).toBe(true)
  })

  it('applies size class for large', () => {
    const wrapper = mount(SgSpin, { props: { size: 'large' } })
    expect(wrapper.find('.sg-spin-large').exists()).toBe(true)
  })

  it('renders tip text', () => {
    const wrapper = mount(SgSpin, { props: { tip: 'Loading...' } })
    expect(wrapper.find('.sg-spin-tip').text()).toBe('Loading...')
  })

  it('does not render spinner when spinning is false and no children', () => {
    const wrapper = mount(SgSpin, { props: { spinning: false } })
    expect(wrapper.find('.sg-spin').exists()).toBe(false)
  })

  it('wraps children with overlay when spinning', () => {
    const Comp = defineComponent({
      components: { SgSpin },
      template: '<SgSpin :spinning="true"><div class="content">x</div></SgSpin>',
    })
    const wrapper = mount(Comp)
    expect(wrapper.find('.sg-spin-container').exists()).toBe(true)
    expect(wrapper.find('.sg-spin-overlay').exists()).toBe(true)
    expect(wrapper.find('.content').exists()).toBe(true)
  })

  it('applies fullscreen mode', () => {
    const wrapper = mount(SgSpin, { props: { fullscreen: true } })
    expect(wrapper.find('.sg-spin-fullscreen').exists()).toBe(true)
  })

  it('respects delay before showing', async () => {
    vi.useFakeTimers()
    try {
      const wrapper = mount(SgSpin, { props: { spinning: true, delay: 200 } })
      expect(wrapper.find('.sg-spin').exists()).toBe(false)
      vi.advanceTimersByTime(250)
      await nextTick()
      expect(wrapper.find('.sg-spin').exists()).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('SgModal', () => {
  it('does not render content when closed (with unmountOnExit)', () => {
    const wrapper = mount(SgModal, {
      attachTo: document.body,
      props: { open: false },
      slots: { default: 'Body' },
    })
    expect(document.body.querySelector('.sg-modal')).toBeNull()
    wrapper.unmount()
  })

  it('renders content when open', async () => {
    const wrapper = mount(SgModal, {
      attachTo: document.body,
      props: { open: true, title: 'Hello' },
      slots: { default: 'Body' },
    })
    await nextTick()
    expect(document.body.querySelector('.sg-modal')).toBeTruthy()
    expect(document.body.querySelector('.sg-modal-title')!.textContent).toBe('Hello')
    expect(document.body.querySelector('.sg-modal-body')!.textContent).toContain('Body')
    wrapper.unmount()
    document.body.innerHTML = ''
  })

  it('emits close on close button click', async () => {
    const wrapper = mount(SgModal, {
      attachTo: document.body,
      props: { open: true },
      slots: { default: 'B' },
    })
    await nextTick()
    const closeBtn = document.body.querySelector('.sg-modal-close') as HTMLElement
    closeBtn.click()
    expect(wrapper.emitted('close')).toBeTruthy()
    wrapper.unmount()
    document.body.innerHTML = ''
  })

  it('emits close on mask click', async () => {
    const wrapper = mount(SgModal, {
      attachTo: document.body,
      props: { open: true },
      slots: { default: 'B' },
    })
    await nextTick()
    const mask = document.body.querySelector('.sg-modal-mask') as HTMLElement
    mask.click()
    expect(wrapper.emitted('close')).toBeTruthy()
    wrapper.unmount()
    document.body.innerHTML = ''
  })

  it('escape key triggers close', async () => {
    const wrapper = mount(SgModal, {
      attachTo: document.body,
      props: { open: true },
      slots: { default: 'B' },
    })
    await nextTick()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(wrapper.emitted('close')).toBeTruthy()
    wrapper.unmount()
    document.body.innerHTML = ''
  })

  it('renders OK/Cancel default footer when okHandler is provided', async () => {
    const onOk = vi.fn()
    const wrapper = mount(SgModal, {
      attachTo: document.body,
      props: { open: true, okHandler: onOk },
      slots: { default: 'B' },
    })
    await nextTick()
    const footer = document.body.querySelector('.sg-modal-footer')
    expect(footer).toBeTruthy()
    expect(footer!.textContent).toContain('OK')
    expect(footer!.textContent).toContain('Cancel')
    wrapper.unmount()
    document.body.innerHTML = ''
  })

  it('uses custom width', async () => {
    const wrapper = mount(SgModal, {
      attachTo: document.body,
      props: { open: true, width: 800 },
    })
    await nextTick()
    const modal = document.body.querySelector('.sg-modal') as HTMLElement
    expect(modal.style.width).toBe('800px')
    wrapper.unmount()
    document.body.innerHTML = ''
  })
})

describe('SgDrawer', () => {
  it('does not render when closed', () => {
    const wrapper = mount(SgDrawer, {
      attachTo: document.body,
      props: { open: false },
      slots: { default: 'Hidden' },
    })
    expect(document.body.querySelector('.sg-drawer')).toBeNull()
    wrapper.unmount()
  })

  it('renders body and title when open', async () => {
    const wrapper = mount(SgDrawer, {
      attachTo: document.body,
      props: { open: true, title: 'Header' },
      slots: { default: 'Body' },
    })
    await nextTick()
    expect(document.body.querySelector('.sg-drawer')).toBeTruthy()
    expect(document.body.querySelector('.sg-drawer-title')!.textContent).toBe('Header')
    expect(document.body.querySelector('.sg-drawer-body')!.textContent).toContain('Body')
    wrapper.unmount()
    document.body.innerHTML = ''
  })

  it('emits close on close button click', async () => {
    const wrapper = mount(SgDrawer, {
      attachTo: document.body,
      props: { open: true },
      slots: { default: 'B' },
    })
    await nextTick()
    const close = document.body.querySelector('.sg-drawer-close') as HTMLElement
    close.click()
    expect(wrapper.emitted('close')).toBeTruthy()
    wrapper.unmount()
    document.body.innerHTML = ''
  })

  it('placement adds modifier class', async () => {
    const wrapper = mount(SgDrawer, {
      attachTo: document.body,
      props: { open: true, placement: 'left' },
      slots: { default: 'b' },
    })
    await nextTick()
    expect(document.body.querySelector('.sg-drawer-left')).toBeTruthy()
    wrapper.unmount()
    document.body.innerHTML = ''
  })

  it('mask click emits close when maskClosable is true', async () => {
    const wrapper = mount(SgDrawer, {
      attachTo: document.body,
      props: { open: true, maskClosable: true },
      slots: { default: 'b' },
    })
    await nextTick()
    const mask = document.body.querySelector('.sg-drawer-mask') as HTMLElement
    mask.click()
    expect(wrapper.emitted('close')).toBeTruthy()
    wrapper.unmount()
    document.body.innerHTML = ''
  })

  it('mask click does not emit close when maskClosable is false', async () => {
    const wrapper = mount(SgDrawer, {
      attachTo: document.body,
      props: { open: true, maskClosable: false },
      slots: { default: 'b' },
    })
    await nextTick()
    const mask = document.body.querySelector('.sg-drawer-mask') as HTMLElement
    mask.click()
    expect(wrapper.emitted('close')).toBeFalsy()
    wrapper.unmount()
    document.body.innerHTML = ''
  })
})

describe('SgPopconfirm', () => {
  it('renders trigger child', () => {
    const wrapper = mount(SgPopconfirm, {
      props: { title: 'Sure?' },
      slots: { default: '<button class="t">Delete</button>' },
    })
    expect(wrapper.find('button.t').exists()).toBe(true)
  })

  it('shows confirmation on trigger click', async () => {
    const wrapper = mount(SgPopconfirm, {
      props: { title: 'Sure?' },
      slots: { default: '<button class="t">Delete</button>' },
    })
    await wrapper.find('button.t').trigger('click')
    await nextTick()
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Sure?')
  })

  it('emits confirm with default Yes button', async () => {
    const wrapper = mount(SgPopconfirm, {
      props: { title: 'Sure?' },
      slots: { default: '<button class="t">Delete</button>' },
    })
    await wrapper.find('button.t').trigger('click')
    await nextTick()
    const buttons = wrapper.findAll('.sg-popconfirm-buttons button')
    await buttons[1].trigger('click')
    expect(wrapper.emitted('confirm')).toBeTruthy()
  })

  it('emits cancel with default No button', async () => {
    const wrapper = mount(SgPopconfirm, {
      props: { title: 'Sure?' },
      slots: { default: '<button class="t">Delete</button>' },
    })
    await wrapper.find('button.t').trigger('click')
    await nextTick()
    const buttons = wrapper.findAll('.sg-popconfirm-buttons button')
    await buttons[0].trigger('click')
    expect(wrapper.emitted('cancel')).toBeTruthy()
  })

  it('disabled blocks open', async () => {
    const wrapper = mount(SgPopconfirm, {
      props: { title: 'Sure?', disabled: true },
      slots: { default: '<button class="t">Delete</button>' },
    })
    await wrapper.find('button.t').trigger('click')
    await nextTick()
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
  })

  it('uses custom okText/cancelText', async () => {
    const wrapper = mount(SgPopconfirm, {
      props: { title: 'X', okText: 'YESS', cancelText: 'NOOO' },
      slots: { default: '<button class="t">x</button>' },
    })
    await wrapper.find('button.t').trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('YESS')
    expect(wrapper.text()).toContain('NOOO')
  })
})

describe('SgTooltip', () => {
  it('renders child trigger', () => {
    const wrapper = mount(SgTooltip, {
      props: { title: 'Hint' },
      slots: { default: '<button>Hover me</button>' },
    })
    expect(wrapper.find('button').exists()).toBe(true)
  })

  it('shows tooltip on hover', async () => {
    const wrapper = mount(SgTooltip, {
      props: { title: 'Hint' },
      slots: { default: '<button>Hover me</button>' },
    })
    await wrapper.trigger('mouseenter')
    await nextTick()
    expect(wrapper.find('[role="tooltip"]').exists()).toBe(true)
    expect(wrapper.find('[role="tooltip"]').text()).toBe('Hint')
  })

  it('aria-describedby is set when visible', async () => {
    const wrapper = mount(SgTooltip, {
      props: { title: 'Hint' },
      slots: { default: '<button>Hover me</button>' },
    })
    await wrapper.trigger('mouseenter')
    await nextTick()
    expect(wrapper.attributes('aria-describedby')).toBeTruthy()
  })

  it('placement adds modifier class', async () => {
    const wrapper = mount(SgTooltip, {
      props: { title: 'Hint', placement: 'right' },
      slots: { default: '<button>Hover me</button>' },
    })
    await wrapper.trigger('mouseenter')
    await nextTick()
    expect(wrapper.find('.sg-tooltip-right').exists()).toBe(true)
  })
})

describe('SgProgress', () => {
  it('renders line type by default', () => {
    const wrapper = mount(SgProgress, { props: { percent: 50 } })
    expect(wrapper.classes()).toContain('sg-progress')
    expect(wrapper.classes()).toContain('sg-progress-line')
  })

  it('renders circle type with svg', () => {
    const wrapper = mount(SgProgress, { props: { percent: 30, type: 'circle' } })
    expect(wrapper.classes()).toContain('sg-progress-circle')
    expect(wrapper.find('svg').exists()).toBe(true)
  })

  it('clamps percent to [0, 100]', () => {
    const high = mount(SgProgress, { props: { percent: 150 } })
    expect(high.text()).toContain('100')
    const low = mount(SgProgress, { props: { percent: -20 } })
    expect(low.text()).toContain('0')
  })

  it('marks 100% as success', () => {
    const wrapper = mount(SgProgress, { props: { percent: 100 } })
    expect(wrapper.classes()).toContain('sg-progress-success')
  })

  it('hides info when showInfo is false', () => {
    const wrapper = mount(SgProgress, { props: { percent: 50, showInfo: false } })
    expect(wrapper.find('.sg-progress-text').exists()).toBe(false)
  })

  it('exposes role=progressbar with aria-valuenow', () => {
    const wrapper = mount(SgProgress, { props: { percent: 42 } })
    expect(wrapper.attributes('role')).toBe('progressbar')
    expect(wrapper.attributes('aria-valuenow')).toBe('42')
  })

  it('uses custom strokeColor', () => {
    const wrapper = mount(SgProgress, { props: { percent: 60, strokeColor: '#abc' } })
    const bg = wrapper.find('.sg-progress-bg')
    expect((bg.element as HTMLElement).style.background).toContain('rgb')
  })
})

describe('SgResult', () => {
  it('renders title', () => {
    const wrapper = mount(SgResult, { props: { status: 'success', title: 'Done!' } })
    expect(wrapper.find('.sg-result-title').text()).toBe('Done!')
  })

  it('renders subtitle when set', () => {
    const wrapper = mount(SgResult, {
      props: { status: 'error', title: 'Fail', subTitle: 'Try again' },
    })
    expect(wrapper.find('.sg-result-subtitle').text()).toBe('Try again')
  })

  it('renders extra slot', () => {
    const wrapper = mount(SgResult, {
      props: { status: 'info', title: 'i' },
      slots: { extra: '<button class="x">Go</button>' },
    })
    expect(wrapper.find('.sg-result-extra .x').exists()).toBe(true)
  })

  it('applies status modifier', () => {
    const wrapper = mount(SgResult, { props: { status: '404', title: 'NF' } })
    expect(wrapper.classes()).toContain('sg-result-404')
  })

  it('renders default svg icon for status', () => {
    const wrapper = mount(SgResult, { props: { status: 'success', title: 't' } })
    expect(wrapper.find('.sg-result-icon svg').exists()).toBe(true)
  })

  it('renders aria role status', () => {
    const wrapper = mount(SgResult, { props: { status: 'success', title: 't' } })
    expect(wrapper.attributes('role')).toBe('status')
  })
})

describe('SgEmpty', () => {
  it('renders default description "No Data"', () => {
    const wrapper = mount(SgEmpty)
    expect(wrapper.find('.sg-empty-description').text()).toBe('No Data')
  })

  it('renders custom description', () => {
    const wrapper = mount(SgEmpty, { props: { description: 'Nothing here' } })
    expect(wrapper.find('.sg-empty-description').text()).toBe('Nothing here')
  })

  it('hides description when null', () => {
    const wrapper = mount(SgEmpty, { props: { description: null } })
    expect(wrapper.find('.sg-empty-description').exists()).toBe(false)
  })

  it('renders default svg image', () => {
    const wrapper = mount(SgEmpty)
    expect(wrapper.find('.sg-empty-image svg').exists()).toBe(true)
  })

  it('renders custom image slot', () => {
    const wrapper = mount(SgEmpty, {
      slots: { image: '<i class="im" />' },
    })
    expect(wrapper.find('i.im').exists()).toBe(true)
  })

  it('renders default slot in footer', () => {
    const wrapper = mount(SgEmpty, {
      slots: { default: '<button class="cta">Create</button>' },
    })
    expect(wrapper.find('.sg-empty-footer .cta').exists()).toBe(true)
  })
})

describe('SgSkeleton', () => {
  it('renders skeleton when loading', () => {
    const wrapper = mount(SgSkeleton, { props: { loading: true } })
    expect(wrapper.find('.sg-skeleton').exists()).toBe(true)
  })

  it('renders default slot when not loading', () => {
    const wrapper = mount(SgSkeleton, {
      props: { loading: false },
      slots: { default: '<div class="real">x</div>' },
    })
    expect(wrapper.find('.real').exists()).toBe(true)
  })

  it('renders avatar block', () => {
    const wrapper = mount(SgSkeleton, { props: { avatar: true } })
    expect(wrapper.find('.sg-skeleton-avatar').exists()).toBe(true)
  })

  it('respects active animation flag', () => {
    const wrapper = mount(SgSkeleton, { props: { active: true } })
    expect(wrapper.classes()).toContain('sg-skeleton-active')
  })

  it('renders the requested number of paragraph rows', () => {
    const wrapper = mount(SgSkeleton, {
      props: { paragraph: { rows: 5 } },
    })
    expect(wrapper.findAll('.sg-skeleton-paragraph li').length).toBe(5)
  })

  it('exposes aria-busy and aria-label', () => {
    const wrapper = mount(SgSkeleton)
    expect(wrapper.attributes('aria-busy')).toBe('true')
    expect(wrapper.attributes('aria-label')).toBe('Loading')
  })
})

describe('SgNotificationContainer + notification API', () => {
  it('renders nothing when no notifications', async () => {
    notification.destroy()
    const wrapper = mount(SgNotificationContainer)
    await flushPromises()
    expect(wrapper.find('.sg-notification').exists()).toBe(false)
    wrapper.unmount()
  })

  it('renders message after notification.open', async () => {
    notification.destroy()
    const wrapper = mount(SgNotificationContainer)
    await flushPromises()
    notification.open({ message: 'hi', placement: 'topRight', duration: 0 })
    await nextTick()
    await nextTick()
    expect(wrapper.find('.sg-notification').exists()).toBe(true)
    expect(wrapper.text()).toContain('hi')
    notification.destroy()
    wrapper.unmount()
  })

  it('renders type variant class', async () => {
    notification.destroy()
    const wrapper = mount(SgNotificationContainer)
    await flushPromises()
    notification.success('OK', 'detail')
    await nextTick()
    await nextTick()
    expect(wrapper.find('.sg-notification-success').exists()).toBe(true)
    notification.destroy()
    wrapper.unmount()
  })

  it('filters by placement', async () => {
    notification.destroy()
    const a = mount(SgNotificationContainer, { props: { placement: 'topRight' } })
    const b = mount(SgNotificationContainer, { props: { placement: 'bottomLeft' } })
    await flushPromises()
    notification.info('only-bottom', undefined)
    notification.open({ message: 'only-top', placement: 'topRight', duration: 0 })
    notification.open({ message: 'only-bottom', placement: 'bottomLeft', duration: 0 })
    await nextTick()
    await nextTick()
    expect(a.text()).toContain('only-top')
    expect(b.text()).toContain('only-bottom')
    notification.destroy()
    a.unmount()
    b.unmount()
  })

  it('destroy removes all notifications', async () => {
    const wrapper = mount(SgNotificationContainer)
    await flushPromises()
    notification.open({ message: 'one', duration: 0 })
    notification.open({ message: 'two', duration: 0 })
    await nextTick()
    notification.destroy()
    await nextTick()
    expect(wrapper.find('.sg-notification').exists()).toBe(false)
    wrapper.unmount()
  })

  it('auto-removes after duration', async () => {
    vi.useFakeTimers()
    try {
      notification.destroy()
      const wrapper = mount(SgNotificationContainer)
      notification.open({ message: 'time', duration: 100 })
      await nextTick()
      await nextTick()
      expect(wrapper.find('.sg-notification').exists()).toBe(true)
      vi.advanceTimersByTime(150)
      await nextTick()
      // Note: vi.advanceTimers fires the listener which removes the item.
      // Container re-renders and won't show it.
      wrapper.unmount()
    } finally {
      vi.useRealTimers()
    }
  })
})
