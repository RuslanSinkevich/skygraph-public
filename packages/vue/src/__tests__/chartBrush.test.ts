import { describe, it, expect } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { mount } from '@vue/test-utils'
import SgChartBrush from '../components/complex/Charts/ChartBrush.vue'
import { resolveBrushConfig } from '../components/complex/Charts/ChartBrush.vue'

function mountInSvg(props: Record<string, unknown>, on?: Record<string, unknown>) {
  const Host = defineComponent({
    setup() {
      return () =>
        h(
          'svg',
          { width: 600, height: 200, viewBox: '0 0 600 200' },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          [h(SgChartBrush as any, { ...props, ...(on ?? {}) })],
        )
    },
  })
  return mount(Host)
}

describe('SgChartBrush', () => {
  it('renders the overlay rect inside an sg-chart-brush group', () => {
    const wrapper = mountInSvg({
      plotX: 30,
      plotY: 10,
      plotW: 540,
      plotH: 160,
      categoryCount: 12,
      range: null,
    })
    expect(wrapper.find('g.sg-chart-brush').exists()).toBe(true)
    const overlay = wrapper.find('rect.sg-chart-brush-overlay')
    expect(overlay.exists()).toBe(true)
    expect(overlay.attributes('data-sg-chart-brush-overlay')).toBeDefined()
  })

  it('renders the selection rect when a controlled range is provided', () => {
    const wrapper = mountInSvg({
      plotX: 0,
      plotY: 0,
      plotW: 600,
      plotH: 200,
      categoryCount: 7,
      range: { from: 1, to: 4 },
    })
    expect(wrapper.find('rect.sg-chart-brush-selection').exists()).toBe(true)
  })

  it('emits update:range and change with null on dblclick', async () => {
    const wrapper = mountInSvg({
      plotX: 0,
      plotY: 0,
      plotW: 600,
      plotH: 200,
      categoryCount: 5,
      range: { from: 1, to: 3 },
    })
    const overlay = wrapper.find('rect.sg-chart-brush-overlay')
    await overlay.trigger('dblclick')
    const child = wrapper.findComponent(SgChartBrush)
    expect(child.emitted('update:range')).toBeTruthy()
    expect(child.emitted('update:range')![0][0]).toBeNull()
    expect(child.emitted('change')).toBeTruthy()
    expect(child.emitted('change')![0][0]).toBeNull()
  })

  it('exposes resolveBrushConfig with React-parity behaviour', () => {
    expect(resolveBrushConfig(false)).toBeNull()
    expect(resolveBrushConfig(undefined)).toBeNull()
    expect(resolveBrushConfig(true)).toEqual({})
    expect(resolveBrushConfig({ disabled: true })).toEqual({ disabled: true })
  })

  it('supports v-model:range integration', async () => {
    const Host = defineComponent({
      setup() {
        const range = ref<{ from: number; to: number } | null>({ from: 0, to: 1 })
        return () =>
          h('svg', { viewBox: '0 0 600 200' }, [
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            h(SgChartBrush as any, {
              plotX: 0,
              plotY: 0,
              plotW: 600,
              plotH: 200,
              categoryCount: 4,
              range: range.value,
              'onUpdate:range': (next: typeof range.value) => {
                range.value = next
              },
            }),
          ])
      },
    })
    const wrapper = mount(Host)
    const overlay = wrapper.find('rect.sg-chart-brush-overlay')
    await overlay.trigger('dblclick')
    // Selection cleared by reset.
    expect(wrapper.find('rect.sg-chart-brush-selection').exists()).toBe(false)
  })
})
