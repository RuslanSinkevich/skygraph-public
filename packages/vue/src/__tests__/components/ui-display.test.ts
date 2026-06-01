import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import {
  SgBadge,
  SgTag,
  SgAvatar,
  SgCarousel,
  SgTimeline,
  SgDescriptions,
  SgCollapse,
} from '../../components/ui'

describe('SgBadge', () => {
  it('renders count', () => {
    const wrapper = mount(SgBadge, { props: { count: 5 } })
    expect(wrapper.find('.sg-badge-count').text()).toBe('5')
  })

  it('hides count when zero by default', () => {
    const wrapper = mount(SgBadge, { props: { count: 0 } })
    expect(wrapper.find('.sg-badge-count').exists()).toBe(false)
  })

  it('shows zero with showZero', () => {
    const wrapper = mount(SgBadge, { props: { count: 0, showZero: true } })
    expect(wrapper.find('.sg-badge-count').text()).toBe('0')
  })

  it('caps overflow', () => {
    const wrapper = mount(SgBadge, { props: { count: 1000, overflowCount: 99 } })
    expect(wrapper.find('.sg-badge-count').text()).toBe('99+')
  })

  it('renders dot', () => {
    const wrapper = mount(SgBadge, { props: { dot: true } })
    expect(wrapper.find('.sg-badge-dot').exists()).toBe(true)
  })

  it('renders status with text', () => {
    const wrapper = mount(SgBadge, { props: { status: 'success', text: 'Live' } })
    expect(wrapper.classes()).toContain('sg-badge-status')
    expect(wrapper.find('.sg-badge-status-success').exists()).toBe(true)
    expect(wrapper.find('.sg-badge-status-text').text()).toBe('Live')
  })

  it('uses custom color', () => {
    const wrapper = mount(SgBadge, { props: { count: 3, color: '#abc' } })
    const el = wrapper.find('.sg-badge-count')
    const style = (el.element as HTMLElement).style
    expect(style.background).toContain('rgb')
  })

  it('wraps children', () => {
    const wrapper = mount(SgBadge, {
      props: { count: 1 },
      slots: { default: '<i class="ico" />' },
    })
    expect(wrapper.find('i.ico').exists()).toBe(true)
  })
})

describe('SgTag', () => {
  it('renders text content', () => {
    const wrapper = mount(SgTag, { slots: { default: 'Hello' } })
    expect(wrapper.text()).toBe('Hello')
  })

  it('applies preset color class', () => {
    const wrapper = mount(SgTag, {
      props: { color: 'success' },
      slots: { default: 'OK' },
    })
    expect(wrapper.classes()).toContain('sg-tag-success')
  })

  it('applies custom color via inline style', () => {
    const wrapper = mount(SgTag, {
      props: { color: '#ff0000' },
      slots: { default: 'X' },
    })
    expect((wrapper.element as HTMLElement).style.background).toBeTruthy()
  })

  it('renders close button when closable', () => {
    const wrapper = mount(SgTag, {
      props: { closable: true },
      slots: { default: 'X' },
    })
    expect(wrapper.find('.sg-tag-close').exists()).toBe(true)
  })

  it('emits close on close click', async () => {
    const wrapper = mount(SgTag, {
      props: { closable: true },
      slots: { default: 'X' },
    })
    await wrapper.find('.sg-tag-close').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('borderless modifier', () => {
    const wrapper = mount(SgTag, {
      props: { bordered: false },
      slots: { default: 'X' },
    })
    expect(wrapper.classes()).toContain('sg-tag-borderless')
  })
})

describe('SgAvatar', () => {
  it('renders with text', () => {
    const wrapper = mount(SgAvatar, { slots: { default: 'AB' } })
    expect(wrapper.text()).toBe('AB')
  })

  it('renders image with src and alt', () => {
    const wrapper = mount(SgAvatar, {
      props: { src: 'https://example.com/x.png', alt: 'Me' },
    })
    const img = wrapper.find('img')
    expect(img.attributes('src')).toBe('https://example.com/x.png')
    expect(img.attributes('alt')).toBe('Me')
  })

  it('renders icon slot', () => {
    const wrapper = mount(SgAvatar, {
      slots: { icon: '<i class="ico" />' },
    })
    expect(wrapper.find('.sg-avatar-icon i.ico').exists()).toBe(true)
  })

  it('applies shape modifier', () => {
    const wrapper = mount(SgAvatar, { props: { shape: 'square' } })
    expect(wrapper.classes()).toContain('sg-avatar-square')
  })

  it('applies size token modifier', () => {
    const wrapper = mount(SgAvatar, { props: { size: 'large' } })
    expect(wrapper.classes()).toContain('sg-avatar-large')
  })

  it('applies custom px size via style', () => {
    const wrapper = mount(SgAvatar, { props: { size: 60 } })
    const el = wrapper.element as HTMLElement
    expect(el.style.width).toBe('60px')
    expect(el.style.height).toBe('60px')
  })

  it('exposes role=img and aria-label', () => {
    const wrapper = mount(SgAvatar, {
      props: { ariaLabel: 'User' },
      slots: { default: 'U' },
    })
    expect(wrapper.attributes('role')).toBe('img')
    expect(wrapper.attributes('aria-label')).toBe('User')
  })
})

describe('SgCarousel', () => {
  function makeWrapper(extra: Record<string, any> = {}) {
    return mount(SgCarousel, {
      props: extra,
      slots: {
        default: '<div class="s1">A</div><div class="s2">B</div><div class="s3">C</div>',
      },
    })
  }

  it('renders all slides', () => {
    const wrapper = makeWrapper()
    expect(wrapper.find('.s1').exists()).toBe(true)
    expect(wrapper.find('.s2').exists()).toBe(true)
    expect(wrapper.find('.s3').exists()).toBe(true)
  })

  it('renders dot navigation by default', () => {
    const wrapper = makeWrapper()
    expect(wrapper.findAll('.sg-carousel-dot').length).toBe(3)
  })

  it('marks first slide active', () => {
    const wrapper = makeWrapper()
    const slides = wrapper.findAll('.sg-carousel-slide')
    expect(slides[0].classes()).toContain('sg-carousel-slide-active')
  })

  it('clicking a dot changes active slide', async () => {
    const wrapper = makeWrapper()
    const dots = wrapper.findAll('.sg-carousel-dot')
    await dots[1].trigger('click')
    const slides = wrapper.findAll('.sg-carousel-slide')
    expect(slides[1].classes()).toContain('sg-carousel-slide-active')
  })

  it('hides dots when dots=false', () => {
    const wrapper = makeWrapper({ dots: false })
    expect(wrapper.find('.sg-carousel-dots').exists()).toBe(false)
  })

  it('vertical mode for left/right dotPosition', () => {
    const wrapper = makeWrapper({ dotPosition: 'right' })
    expect(wrapper.classes()).toContain('sg-carousel-vertical')
  })
})

describe('SgTimeline', () => {
  const items = [{ content: 'Created' }, { content: 'Reviewed' }, { content: 'Done' }]

  it('renders all items', () => {
    const wrapper = mount(SgTimeline, { props: { items } })
    expect(wrapper.text()).toContain('Created')
    expect(wrapper.text()).toContain('Reviewed')
    expect(wrapper.text()).toContain('Done')
  })

  it('applies mode modifier class', () => {
    const wrapper = mount(SgTimeline, { props: { items, mode: 'right' } })
    expect(wrapper.classes()).toContain('sg-timeline-right')
  })

  it('alternates side in alternate mode', () => {
    const wrapper = mount(SgTimeline, { props: { items, mode: 'alternate' } })
    const lis = wrapper.findAll('.sg-timeline-item')
    expect(lis[0].classes()).toContain('sg-timeline-item-left')
    expect(lis[1].classes()).toContain('sg-timeline-item-right')
  })

  it('renders pending item', () => {
    const wrapper = mount(SgTimeline, {
      props: { items, pending: 'Loading...' },
    })
    expect(wrapper.text()).toContain('Loading...')
    expect(wrapper.find('.sg-timeline-item-pending').exists()).toBe(true)
  })

  it('renders custom dot text', () => {
    const wrapper = mount(SgTimeline, {
      props: { items: [{ content: 'X', dot: '★' }] },
    })
    expect(wrapper.find('.sg-timeline-item-head-custom').text()).toBe('★')
  })

  it('reverse swaps order', () => {
    const wrapper = mount(SgTimeline, { props: { items, reverse: true } })
    const lis = wrapper.findAll('.sg-timeline-item-content')
    expect(lis[0].text()).toBe('Done')
    expect(lis[2].text()).toBe('Created')
  })

  it('applies item color via style', () => {
    const wrapper = mount(SgTimeline, {
      props: { items: [{ content: 'X', color: '#ff0000' }] },
    })
    const head = wrapper.find('.sg-timeline-item-head')
    const style = (head.element as HTMLElement).style
    expect(style.borderColor).toBeTruthy()
  })
})

describe('SgDescriptions', () => {
  const items = [
    { label: 'Name', value: 'Alice' },
    { label: 'Age', value: '30' },
    { label: 'City', value: 'NY' },
  ]

  it('renders labels and values', () => {
    const wrapper = mount(SgDescriptions, { props: { items } })
    expect(wrapper.text()).toContain('Name')
    expect(wrapper.text()).toContain('Alice')
    expect(wrapper.text()).toContain('Age')
    expect(wrapper.text()).toContain('30')
  })

  it('renders title', () => {
    const wrapper = mount(SgDescriptions, { props: { items, title: 'User Info' } })
    expect(wrapper.find('.sg-descriptions-title').text()).toBe('User Info')
  })

  it('appends colon by default', () => {
    const wrapper = mount(SgDescriptions, { props: { items } })
    expect(wrapper.find('.sg-descriptions-colon').exists()).toBe(true)
  })

  it('hides colon when colon=false', () => {
    const wrapper = mount(SgDescriptions, { props: { items, colon: false } })
    expect(wrapper.find('.sg-descriptions-colon').exists()).toBe(false)
  })

  it('bordered modifier', () => {
    const wrapper = mount(SgDescriptions, { props: { items, bordered: true } })
    expect(wrapper.classes()).toContain('sg-descriptions-bordered')
  })

  it('respects column count', () => {
    const wrapper = mount(SgDescriptions, { props: { items, column: 1 } })
    const rows = wrapper.findAll('tr')
    expect(rows.length).toBe(3)
  })

  it('layout vertical splits label/content into separate rows', () => {
    const wrapper = mount(SgDescriptions, { props: { items, layout: 'vertical' } })
    expect(wrapper.findAll('tr').length).toBeGreaterThanOrEqual(2)
  })
})

describe('SgCollapse', () => {
  const items = [
    { key: '1', label: 'Panel 1', content: 'Content 1' },
    { key: '2', label: 'Panel 2', content: 'Content 2' },
  ]

  it('renders panel labels', () => {
    const wrapper = mount(SgCollapse, { props: { items } })
    expect(wrapper.text()).toContain('Panel 1')
    expect(wrapper.text()).toContain('Panel 2')
  })

  it('starts collapsed', () => {
    const wrapper = mount(SgCollapse, { props: { items } })
    // Content is always mounted to allow CSS max-height animation; visibility
    // is driven by the `sg-collapse-panel-active` class on the panel and
    // the `--sg-collapse-content-max-height` custom property on the body.
    const panels = wrapper.findAll('.sg-collapse-panel')
    for (const panel of panels) {
      expect(panel.classes()).not.toContain('sg-collapse-panel-active')
    }
  })

  it('expands panel on click', async () => {
    const wrapper = mount(SgCollapse, { props: { items } })
    const headers = wrapper.findAll('.sg-collapse-header')
    await headers[0].trigger('click')
    expect(wrapper.text()).toContain('Content 1')
  })

  it('emits change with active keys', async () => {
    const wrapper = mount(SgCollapse, { props: { items } })
    const headers = wrapper.findAll('.sg-collapse-header')
    await headers[0].trigger('click')
    expect(wrapper.emitted('change')).toBeTruthy()
    expect(wrapper.emitted('change')![0]).toEqual([['1']])
  })

  it('accordion mode keeps only one panel open', async () => {
    const wrapper = mount(SgCollapse, { props: { items, accordion: true } })
    const headers = wrapper.findAll('.sg-collapse-header')
    await headers[0].trigger('click')
    await headers[1].trigger('click')
    const last = wrapper.emitted('change')!.at(-1)![0] as string[]
    expect(last).toEqual(['2'])
  })

  it('defaultActiveKey opens panel', () => {
    const wrapper = mount(SgCollapse, {
      props: { items, defaultActiveKey: '1' },
    })
    expect(wrapper.text()).toContain('Content 1')
  })

  it('disabled panel does not toggle', async () => {
    const items2 = [{ key: 'x', label: 'X', content: 'Y', disabled: true }]
    const wrapper = mount(SgCollapse, { props: { items: items2 } })
    await wrapper.find('.sg-collapse-header').trigger('click')
    expect(wrapper.emitted('change')).toBeFalsy()
  })

  it('renders extra content', () => {
    const items2 = [{ key: 'x', label: 'X', content: 'Y', extra: 'Z' }]
    const wrapper = mount(SgCollapse, { props: { items: items2 } })
    expect(wrapper.find('.sg-collapse-extra').text()).toBe('Z')
  })

  it('toggle via Enter key', async () => {
    const wrapper = mount(SgCollapse, { props: { items } })
    const header = wrapper.find('.sg-collapse-header')
    await header.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('change')).toBeTruthy()
  })
})
