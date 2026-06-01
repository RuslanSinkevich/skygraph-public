import { describe, it, expect } from 'vitest'
import { defineComponent, ref, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { SgConfigProvider, SgTransition } from '../../components/ui'
import { useConfig, useConfigWithDefaults } from '../../components/ui'

describe('SgConfigProvider + useConfig', () => {
  it('useConfig returns empty config when no provider', () => {
    let out: ReturnType<typeof useConfig> | undefined
    const Comp = defineComponent({
      setup() {
        out = useConfig()
        return () => h('div')
      },
    })
    mount(Comp)
    expect(out!.value).toEqual({})
  })

  it('exposes size from provider', () => {
    let cfg: ReturnType<typeof useConfig> | undefined
    const Child = defineComponent({
      setup() {
        cfg = useConfig()
        return () => h('div', cfg!.value.size ?? '')
      },
    })
    const wrapper = mount(SgConfigProvider, {
      props: { size: 'large' },
      slots: { default: () => h(Child) },
    })
    expect(wrapper.text()).toBe('large')
    expect(cfg!.value.size).toBe('large')
  })

  it('exposes disabled from provider', () => {
    let cfg: ReturnType<typeof useConfig> | undefined
    const Child = defineComponent({
      setup() {
        cfg = useConfig()
        return () => h('div', String(cfg!.value.disabled ?? false))
      },
    })
    const wrapper = mount(SgConfigProvider, {
      props: { disabled: true },
      slots: { default: () => h(Child) },
    })
    expect(wrapper.text()).toBe('true')
  })

  it('merges parent and child providers', () => {
    let inner: ReturnType<typeof useConfig> | undefined
    const Inner = defineComponent({
      setup() {
        inner = useConfig()
        return () => h('div')
      },
    })
    mount(
      defineComponent({
        components: { SgConfigProvider, Inner },
        template: `
          <SgConfigProvider :size="'small'" :disabled="true">
            <SgConfigProvider :size="'large'">
              <Inner />
            </SgConfigProvider>
          </SgConfigProvider>
        `,
      }),
    )
    expect(inner!.value.size).toBe('large')
    expect(inner!.value.disabled).toBe(true)
  })

  it('shallow-merges locale across providers', () => {
    let inner: ReturnType<typeof useConfig> | undefined
    const Inner = defineComponent({
      setup() {
        inner = useConfig()
        return () => h('div')
      },
    })
    mount(
      defineComponent({
        components: { SgConfigProvider, Inner },
        setup() {
          const outerLocale = { modal: { okText: 'Yes' } }
          const innerLocale = { popconfirm: { okText: 'Sure' } }
          return { outerLocale, innerLocale }
        },
        template: `
          <SgConfigProvider :locale="outerLocale">
            <SgConfigProvider :locale="innerLocale">
              <Inner />
            </SgConfigProvider>
          </SgConfigProvider>
        `,
      }),
    )
    expect(inner!.value.locale?.modal?.okText).toBe('Yes')
    expect(inner!.value.locale?.popconfirm?.okText).toBe('Sure')
  })

  it('useConfigWithDefaults resolves size from props first', () => {
    let resolved: ReturnType<typeof useConfigWithDefaults> | undefined
    const Inner = defineComponent({
      props: { size: { type: String, default: 'small' } },
      setup(p) {
        resolved = useConfigWithDefaults({ size: p.size as any })
        return () => h('div')
      },
    })
    mount(
      defineComponent({
        components: { SgConfigProvider, Inner },
        template: `
          <SgConfigProvider :size="'large'">
            <Inner />
          </SgConfigProvider>
        `,
      }),
    )
    expect(resolved!.resolvedSize.value).toBe('small')
  })

  it('useConfigWithDefaults falls back to provider size', () => {
    let resolved: ReturnType<typeof useConfigWithDefaults> | undefined
    const Inner = defineComponent({
      setup() {
        resolved = useConfigWithDefaults({ size: undefined })
        return () => h('div')
      },
    })
    mount(
      defineComponent({
        components: { SgConfigProvider, Inner },
        template: `
          <SgConfigProvider :size="'large'">
            <Inner />
          </SgConfigProvider>
        `,
      }),
    )
    expect(resolved!.resolvedSize.value).toBe('large')
  })

  it('useConfigWithDefaults resolvedDisabled fallback chain', () => {
    let resolved: ReturnType<typeof useConfigWithDefaults> | undefined
    const Inner = defineComponent({
      setup() {
        resolved = useConfigWithDefaults({ disabled: undefined }, { disabled: true })
        return () => h('div')
      },
    })
    mount(Inner)
    expect(resolved!.resolvedDisabled.value).toBe(true)
  })

  it('reactive size updates propagate through provider', async () => {
    let cfg: ReturnType<typeof useConfig> | undefined
    const Inner = defineComponent({
      setup() {
        cfg = useConfig()
        return () => h('div', cfg!.value.size ?? '')
      },
    })
    const size = ref<'small' | 'middle' | 'large'>('small')
    const Root = defineComponent({
      components: { SgConfigProvider, Inner },
      setup() {
        return { size }
      },
      template: `
        <SgConfigProvider :size="size">
          <Inner />
        </SgConfigProvider>
      `,
    })
    const wrapper = mount(Root)
    expect(wrapper.text()).toBe('small')
    size.value = 'large'
    await nextTick()
    expect(wrapper.text()).toBe('large')
  })
})

describe('SgTransition', () => {
  it('renders the child when visible', () => {
    const wrapper = mount(SgTransition, {
      props: { visible: true, name: 'sg-fade' },
      slots: { default: () => h('div', { class: 'me' }, 'hi') },
    })
    expect(wrapper.find('.me').exists()).toBe(true)
  })

  it('does not render the child when hidden with unmountOnExit', () => {
    const wrapper = mount(SgTransition, {
      props: { visible: false, name: 'sg-fade', unmountOnExit: true },
      slots: { default: () => h('div', { class: 'me' }, 'hi') },
    })
    expect(wrapper.find('.me').exists()).toBe(false)
  })

  it('renders the child when hidden but unmountOnExit is false', () => {
    const wrapper = mount(SgTransition, {
      props: { visible: false, name: 'sg-fade', unmountOnExit: false },
      slots: { default: () => h('div', { class: 'me' }, 'hi') },
    })
    expect(wrapper.find('.me').exists()).toBe(true)
  })

  it('merges transition class into the cloned child', async () => {
    const visible = ref(false)
    const Comp = defineComponent({
      components: { SgTransition },
      setup() {
        return { visible }
      },
      template: `
        <SgTransition :visible="visible" name="sg-fade" :unmount-on-exit="false">
          <div class="me">hi</div>
        </SgTransition>
      `,
    })
    const wrapper = mount(Comp)
    visible.value = true
    await nextTick()
    expect(wrapper.find('.me').classes().some((c) => c.startsWith('sg-fade-enter'))).toBe(true)
  })
})
