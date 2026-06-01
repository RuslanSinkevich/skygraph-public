import { describe, it, expect } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import {
  SgConfigProvider,
  SgButton,
  SgSpin,
  SgProgress,
  SgEmpty,
  SgSkeleton,
  SgTabs,
  SgMenu,
  SgBreadcrumb,
  SgPagination,
  SgSteps,
  SgSegmented,
  SgBadge,
  SgTag,
  SgAvatar,
  SgTimeline,
  SgDescriptions,
  SgCollapse,
  SgResult,
} from '../../components/ui'

describe('SgConfigProvider (extended)', () => {
  it('inherits size through three nested providers', () => {
    const Comp = defineComponent({
      components: { SgConfigProvider, SgButton },
      template: `
        <SgConfigProvider size="large">
          <SgConfigProvider>
            <SgConfigProvider>
              <SgButton>btn</SgButton>
            </SgConfigProvider>
          </SgConfigProvider>
        </SgConfigProvider>
      `,
    })
    const wrapper = mount(Comp)
    expect(wrapper.find('button').classes()).toContain('sg-button-large')
  })

  it('child provider locale overrides parent locale field', () => {
    const Comp = defineComponent({
      components: { SgConfigProvider },
      template: `
        <SgConfigProvider :locale="{ Modal: { okText: 'parentOk' } }">
          <SgConfigProvider :locale="{ Modal: { okText: 'childOk' } }">
            <span class="ok">x</span>
          </SgConfigProvider>
        </SgConfigProvider>
      `,
    })
    const wrapper = mount(Comp)
    expect(wrapper.find('.ok').exists()).toBe(true)
  })

  it('renders children directly without wrapper element', () => {
    const Comp = defineComponent({
      components: { SgConfigProvider },
      template: `<SgConfigProvider><div class="payload">hi</div></SgConfigProvider>`,
    })
    const wrapper = mount(Comp)
    expect(wrapper.find('.payload').exists()).toBe(true)
  })
})

describe('SgButton (extended)', () => {
  it('renders block variant with full-width class', () => {
    const wrapper = mount(SgButton, { props: { block: true }, slots: { default: 'go' } })
    expect(wrapper.find('button').classes()).toContain('sg-button-block')
  })

  it('combines danger + primary type into one button', () => {
    const wrapper = mount(SgButton, {
      props: { type: 'primary', danger: true },
      slots: { default: 'rm' },
    })
    const btn = wrapper.find('button')
    expect(btn.classes()).toContain('sg-button-primary')
    expect(btn.classes()).toContain('sg-button-danger')
  })

  it('honours htmlType=submit', () => {
    const wrapper = mount(SgButton, {
      props: { htmlType: 'submit' },
      slots: { default: 'send' },
    })
    expect(wrapper.attributes('type')).toBe('submit')
  })

  it('renders aria-busy when loading', () => {
    const wrapper = mount(SgButton, { props: { loading: true }, slots: { default: 'wait' } })
    expect(wrapper.attributes('aria-busy')).toBe('true')
  })
})

describe('SgSpin (extended)', () => {
  it('renders fullscreen variant with overlay', () => {
    const wrapper = mount(SgSpin, { props: { fullscreen: true } })
    expect(wrapper.find('.sg-spin-fullscreen').exists()).toBe(true)
  })

  it('exposes role=status for accessibility', () => {
    const wrapper = mount(SgSpin)
    expect(wrapper.find('[role="status"]').exists()).toBe(true)
  })
})

describe('SgProgress (extended)', () => {
  it('clamps percent above 100 to 100', () => {
    const wrapper = mount(SgProgress, { props: { percent: 150 } })
    const bar = wrapper.find('.sg-progress-bg')
    expect(bar.attributes('style')).toContain('width: 100%')
  })

  it('clamps negative percent to 0', () => {
    const wrapper = mount(SgProgress, { props: { percent: -10 } })
    const bar = wrapper.find('.sg-progress-bg')
    expect(bar.attributes('style')).toContain('width: 0%')
  })

  it('exposes aria-valuenow on progress bar', () => {
    const wrapper = mount(SgProgress, { props: { percent: 42 } })
    expect(wrapper.find('[role="progressbar"]').attributes('aria-valuenow')).toBe('42')
  })
})

describe('SgEmpty (extended)', () => {
  it('renders custom description text', () => {
    const wrapper = mount(SgEmpty, { props: { description: 'Nothing here' } })
    expect(wrapper.text()).toContain('Nothing here')
  })

  it('hides description when description is null', () => {
    const wrapper = mount(SgEmpty, { props: { description: null } })
    expect(wrapper.find('.sg-empty-description').exists()).toBe(false)
  })

  it('renders custom image slot', () => {
    const wrapper = mount(SgEmpty, {
      slots: { image: '<div class="custom-img">img</div>' },
    })
    expect(wrapper.find('.custom-img').exists()).toBe(true)
  })
})

describe('SgSkeleton (extended)', () => {
  it('renders avatar circle when avatar=true', () => {
    const wrapper = mount(SgSkeleton, { props: { avatar: true } })
    expect(wrapper.find('.sg-skeleton-avatar').exists()).toBe(true)
  })

  it('renders multiple paragraph rows', () => {
    const wrapper = mount(SgSkeleton, { props: { paragraph: { rows: 4 } } })
    expect(wrapper.findAll('.sg-skeleton-paragraph li').length).toBe(4)
  })

  it('hides skeleton when loading=false', () => {
    const Comp = defineComponent({
      components: { SgSkeleton },
      template: '<SgSkeleton :loading="false"><span class="content">ok</span></SgSkeleton>',
    })
    const wrapper = mount(Comp)
    expect(wrapper.find('.sg-skeleton').exists()).toBe(false)
    expect(wrapper.find('.content').exists()).toBe(true)
  })
})

describe('SgTabs (extended)', () => {
  it('switches active tab on click', async () => {
    const items = [
      { key: 'a', label: 'A' },
      { key: 'b', label: 'B' },
    ]
    const wrapper = mount(SgTabs, { props: { items } })
    const tabs = wrapper.findAll('[role="tab"]')
    await tabs[1].trigger('click')
    expect(tabs[1].attributes('aria-selected')).toBe('true')
  })

  it('respects defaultActiveKey when uncontrolled', () => {
    const items = [
      { key: 'a', label: 'A' },
      { key: 'b', label: 'B' },
    ]
    const wrapper = mount(SgTabs, { props: { items, defaultActiveKey: 'b' } })
    const tabs = wrapper.findAll('[role="tab"]')
    expect(tabs[1].attributes('aria-selected')).toBe('true')
  })

  it('skips disabled tab on click', async () => {
    const items = [
      { key: 'a', label: 'A' },
      { key: 'b', label: 'B', disabled: true },
    ]
    const wrapper = mount(SgTabs, { props: { items } })
    const tabs = wrapper.findAll('[role="tab"]')
    await tabs[1].trigger('click')
    expect(tabs[0].attributes('aria-selected')).toBe('true')
  })
})

describe('SgMenu (extended)', () => {
  it('renders horizontal class for horizontal mode', () => {
    const items = [{ key: 'a', label: 'A' }]
    const wrapper = mount(SgMenu, { props: { items, mode: 'horizontal' } })
    expect(wrapper.find('.sg-menu-horizontal').exists()).toBe(true)
  })

  it('renders inline class for inline mode', () => {
    const items = [{ key: 'a', label: 'A' }]
    const wrapper = mount(SgMenu, { props: { items, mode: 'inline' } })
    expect(wrapper.find('.sg-menu-inline').exists()).toBe(true)
  })
})

describe('SgBreadcrumb (extended)', () => {
  it('renders custom separator', () => {
    const items = [{ title: 'Home' }, { title: 'Page' }]
    const wrapper = mount(SgBreadcrumb, { props: { items, separator: '>' } })
    expect(wrapper.text()).toContain('>')
  })

  it('marks last segment with sg-breadcrumb-current class', () => {
    const items = [{ title: 'Home' }, { title: 'Page' }]
    const wrapper = mount(SgBreadcrumb, { props: { items } })
    expect(wrapper.find('.sg-breadcrumb-current').exists()).toBe(true)
  })
})

describe('SgPagination (extended)', () => {
  it('renders simple variant with current/total format', () => {
    const wrapper = mount(SgPagination, {
      props: { current: 2, total: 50, simple: true },
    })
    expect(wrapper.find('.sg-pagination-simple').exists()).toBe(true)
    expect(wrapper.find('.sg-pagination-simple-pager').text()).toBe('2 / 5')
  })

  it('renders size changer when showSizeChanger=true', () => {
    const wrapper = mount(SgPagination, {
      props: { current: 1, total: 100, showSizeChanger: true },
    })
    expect(wrapper.find('select.sg-pagination-size-changer').exists()).toBe(true)
  })

  it('renders quick jumper when showQuickJumper=true', () => {
    const wrapper = mount(SgPagination, {
      props: { current: 1, total: 100, showQuickJumper: true },
    })
    expect(wrapper.find('input.sg-pagination-jumper-input').exists()).toBe(true)
  })
})

describe('SgSteps (extended)', () => {
  it('marks step before current as finished', () => {
    const items = [{ title: 'A' }, { title: 'B' }, { title: 'C' }]
    const wrapper = mount(SgSteps, { props: { items, current: 1 } })
    const steps = wrapper.findAll('.sg-steps-item')
    expect(steps[0].classes()).toContain('sg-steps-item-finish')
    expect(steps[1].classes()).toContain('sg-steps-item-process')
    expect(steps[2].classes()).toContain('sg-steps-item-wait')
  })

  it('renders vertical class when direction=vertical', () => {
    const items = [{ title: 'A' }]
    const wrapper = mount(SgSteps, { props: { items, current: 0, direction: 'vertical' } })
    expect(wrapper.find('.sg-steps-vertical').exists()).toBe(true)
  })
})

describe('SgSegmented (extended)', () => {
  it('renders block variant', () => {
    const wrapper = mount(SgSegmented, {
      props: { options: ['a', 'b'], block: true },
    })
    expect(wrapper.find('.sg-segmented-block').exists()).toBe(true)
  })

  it('marks individual disabled option', () => {
    const options = [
      { label: 'A', value: 'a' },
      { label: 'B', value: 'b', disabled: true },
    ]
    const wrapper = mount(SgSegmented, { props: { options } })
    const items = wrapper.findAll('.sg-segmented-item')
    expect(items[1].classes()).toContain('sg-segmented-item-disabled')
  })
})

describe('SgBadge (extended)', () => {
  it('renders dot variant when dot=true', () => {
    const wrapper = mount(SgBadge, { props: { dot: true } })
    expect(wrapper.find('.sg-badge-dot').exists()).toBe(true)
  })

  it('shows overflow count with plus suffix', () => {
    const wrapper = mount(SgBadge, { props: { count: 150, overflowCount: 99 } })
    expect(wrapper.text()).toContain('99+')
  })

  it('renders status variant with text label', () => {
    const wrapper = mount(SgBadge, { props: { status: 'success', text: 'Online' } })
    expect(wrapper.text()).toContain('Online')
    expect(wrapper.find('.sg-badge-status-success').exists()).toBe(true)
  })
})

describe('SgTag (extended)', () => {
  it('emits close event when close button clicked', async () => {
    const wrapper = mount(SgTag, {
      props: { closable: true },
      slots: { default: 'tag' },
    })
    await wrapper.find('.sg-tag-close').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('applies preset color class for success', () => {
    const wrapper = mount(SgTag, {
      props: { color: 'success' },
      slots: { default: 'tag' },
    })
    expect(wrapper.find('.sg-tag-success').exists()).toBe(true)
  })

  it('applies inline style for custom color (non-preset)', () => {
    const wrapper = mount(SgTag, {
      props: { color: '#ff0000' },
      slots: { default: 'tag' },
    })
    const style = wrapper.attributes('style') ?? ''
    expect(style.length).toBeGreaterThan(0)
    expect(wrapper.classes()).not.toContain('sg-tag-success')
  })
})

describe('SgAvatar (extended)', () => {
  it('renders text content when no src/icon', () => {
    const wrapper = mount(SgAvatar, { slots: { default: 'JD' } })
    expect(wrapper.text()).toContain('JD')
  })

  it('renders image when src provided', () => {
    const wrapper = mount(SgAvatar, { props: { src: 'https://example.com/a.png' } })
    expect(wrapper.find('img').exists()).toBe(true)
  })

  it('applies square shape class', () => {
    const wrapper = mount(SgAvatar, {
      props: { shape: 'square' },
      slots: { default: 'A' },
    })
    expect(wrapper.classes()).toContain('sg-avatar-square')
  })
})

describe('SgTimeline (extended)', () => {
  it('renders pending item when pending=true', () => {
    const items = [{ content: 'a' }]
    const wrapper = mount(SgTimeline, { props: { items, pending: 'loading...' } })
    expect(wrapper.find('.sg-timeline-item-pending').exists()).toBe(true)
  })

  it('renders reverse order when reverse=true', () => {
    const items = [{ content: 'first' }, { content: 'second' }]
    const wrapper = mount(SgTimeline, { props: { items, reverse: true } })
    const labels = wrapper.findAll('.sg-timeline-item-content')
    expect(labels[0].text()).toContain('second')
  })
})

describe('SgDescriptions (extended)', () => {
  it('renders title text', () => {
    const items = [{ key: '1', label: 'name', value: 'John' }]
    const wrapper = mount(SgDescriptions, {
      props: { items, title: 'User Profile' },
    })
    expect(wrapper.find('.sg-descriptions-title').text()).toBe('User Profile')
  })

  it('renders bordered class when bordered=true', () => {
    const items = [{ key: '1', label: 'name', value: 'John' }]
    const wrapper = mount(SgDescriptions, { props: { items, bordered: true } })
    expect(wrapper.find('.sg-descriptions-bordered').exists()).toBe(true)
  })

  it('renders all rows in vertical layout', () => {
    const items = [
      { key: '1', label: 'name', value: 'John' },
      { key: '2', label: 'age', value: '30' },
    ]
    const wrapper = mount(SgDescriptions, { props: { items, layout: 'vertical' } })
    expect(wrapper.findAll('.sg-descriptions-item-label').length).toBeGreaterThan(0)
    expect(wrapper.findAll('.sg-descriptions-item-content').length).toBeGreaterThan(0)
  })
})

describe('SgCollapse (extended)', () => {
  it('expands a panel on header click', async () => {
    const items = [{ key: '1', label: 'P1', content: 'content1' }]
    const wrapper = mount(SgCollapse, { props: { items } })
    const header = wrapper.find('.sg-collapse-header')
    await header.trigger('click')
    expect(wrapper.find('.sg-collapse-content').exists()).toBe(true)
  })

  it('respects accordion mode (only one open)', async () => {
    const items = [
      { key: '1', label: 'P1', content: 'c1' },
      { key: '2', label: 'P2', content: 'c2' },
    ]
    const wrapper = mount(SgCollapse, {
      props: { items, accordion: true, defaultActiveKey: ['1'] },
    })
    const headers = wrapper.findAll('.sg-collapse-header')
    await headers[1].trigger('click')
    expect(headers[0].attributes('aria-expanded')).toBe('false')
    expect(headers[1].attributes('aria-expanded')).toBe('true')
  })

  it('disables collapsing for disabled panel', async () => {
    const items = [{ key: '1', label: 'P1', content: 'c1', disabled: true }]
    const wrapper = mount(SgCollapse, { props: { items } })
    const header = wrapper.find('.sg-collapse-header')
    await header.trigger('click')
    expect(header.attributes('aria-expanded')).toBe('false')
  })
})

describe('SgResult (extended)', () => {
  it('renders success status class', () => {
    const wrapper = mount(SgResult, { props: { status: 'success', title: 'Done' } })
    expect(wrapper.find('.sg-result-success').exists()).toBe(true)
  })

  it('renders 404 numeric status class', () => {
    const wrapper = mount(SgResult, { props: { status: '404', title: 'Not found' } })
    expect(wrapper.find('.sg-result-404').exists()).toBe(true)
  })

  it('renders extra slot below content', () => {
    const wrapper = mount(SgResult, {
      props: { status: 'info', title: 'hi' },
      slots: { extra: '<button class="extra-btn">go</button>' },
    })
    expect(wrapper.find('.extra-btn').exists()).toBe(true)
  })
})
