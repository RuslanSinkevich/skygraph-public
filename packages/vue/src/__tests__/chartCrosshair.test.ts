import { describe, it, expect } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import SgChartCrosshair from '../components/complex/Charts/ChartCrosshair.vue'
import type { ChartCrosshairPoint } from '../components/complex/Charts/ChartCrosshair.vue'

const POINTS: ChartCrosshairPoint[] = [
  { label: 'A', value: 12, color: '#1677ff', y: 60 },
  { label: 'B', value: 7, color: '#52c41a', y: 90 },
]

/**
 * The crosshair renders into an SVG context — wrap it in a host <svg> so
 * the children mount under a valid SVG namespace.
 */
function mountInSvg(props: Record<string, unknown>) {
  const Host = defineComponent({
    setup() {
      return () =>
        h(
          'svg',
          { width: 300, height: 200, viewBox: '0 0 300 200' },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          [h(SgChartCrosshair as any, props)],
        )
    },
  })
  return mount(Host)
}

describe('SgChartCrosshair', () => {
  it('renders sg-chart-crosshair root group with line + dots + tooltip', () => {
    const wrapper = mountInSvg({
      x: 100,
      plotX: 20,
      plotY: 20,
      plotH: 140,
      plotW: 260,
      category: 'May',
      points: POINTS,
    })
    const root = wrapper.find('g.sg-chart-crosshair')
    expect(root.exists()).toBe(true)
    expect(root.attributes('data-sg-chart-crosshair')).toBeDefined()

    expect(wrapper.find('line.sg-chart-crosshair-line').exists()).toBe(true)
    expect(wrapper.findAll('circle.sg-chart-crosshair-dot').length).toBe(2)
    expect(wrapper.find('g.sg-chart-crosshair-tooltip').exists()).toBe(true)
  })

  it('honours a custom valueFormatter', () => {
    const wrapper = mountInSvg({
      x: 50,
      plotX: 0,
      plotY: 0,
      plotH: 100,
      plotW: 200,
      category: 'Jan',
      points: [{ label: 'A', value: 0.5, color: '#000', y: 50 }],
      valueFormatter: (v: number) => `${(v * 100).toFixed(0)}%`,
    })
    expect(wrapper.text()).toContain('50%')
  })

  it('drops sg-* classes when unstyled is true', () => {
    const wrapper = mountInSvg({
      x: 0,
      plotX: 0,
      plotY: 0,
      plotH: 100,
      plotW: 100,
      category: 'X',
      points: [],
      unstyled: true,
    })
    expect(wrapper.find('g.sg-chart-crosshair').exists()).toBe(false)
    // The data-* anchor stays so consumers can still target it for styles.
    expect(wrapper.find('[data-sg-chart-crosshair]').exists()).toBe(true)
  })
})
