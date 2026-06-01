import { describe, it, expect, beforeAll } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import SgLineChart from '../../components/complex/Charts/LineChart.vue'
import SgBarChart from '../../components/complex/Charts/BarChart.vue'
import SgAreaChart from '../../components/complex/Charts/AreaChart.vue'
import SgPieChart from '../../components/complex/Charts/PieChart.vue'
import SgChartLegend from '../../components/complex/Charts/ChartLegend.vue'
import { chartBounds, colorForSeries, normalizePadding, resolveChartAnimation } from '../../components/complex/Charts'

beforeAll(() => {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    class FakeResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    ;(globalThis as unknown as { ResizeObserver: typeof FakeResizeObserver }).ResizeObserver =
      FakeResizeObserver
  }
})

const baseSeries = [
  { id: 's1', label: 'A', values: [1, 3, 2, 5] },
  { id: 's2', label: 'B', values: [4, 2, 6, 1] },
]
const baseCategories = ['Jan', 'Feb', 'Mar', 'Apr']

describe('Chart helpers', () => {
  it('chartBounds computes min/max ignoring nulls', () => {
    const b = chartBounds([
      [1, null, 5],
      [3, 2, null],
    ])
    expect(b.min).toBe(1)
    expect(b.max).toBe(5)
  })

  it('chartBounds returns sane fallback for all-null data', () => {
    const b = chartBounds([[null, null]])
    expect(b.min).toBe(0)
    expect(b.max).toBe(1)
  })

  it('colorForSeries respects explicit color', () => {
    expect(colorForSeries({ id: 's', label: 'l', values: [], color: '#abcdef' }, 0)).toBe('#abcdef')
  })

  it('colorForSeries falls back to palette by index', () => {
    const c = colorForSeries({ id: 's', label: 'l', values: [] }, 0)
    expect(typeof c).toBe('string')
    expect(c.length).toBeGreaterThan(0)
  })

  it('normalizePadding turns number into [t,r,b,l] tuple', () => {
    expect(normalizePadding(8)).toEqual([8, 8, 8, 8])
  })

  it('normalizePadding accepts tuple unchanged', () => {
    expect(normalizePadding([1, 2, 3, 4])).toEqual([1, 2, 3, 4])
  })

  it('resolveChartAnimation defaults to enabled', () => {
    expect(resolveChartAnimation(undefined).enabled).toBe(true)
    expect(resolveChartAnimation(true).enabled).toBe(true)
    expect(resolveChartAnimation(false).enabled).toBe(false)
  })

  it('resolveChartAnimation honours explicit duration', () => {
    expect(resolveChartAnimation({ duration: 1234 }).duration).toBe(1234)
  })
})

describe('SgChartLegend', () => {
  it('renders one item per series', () => {
    const w = mount(SgChartLegend, { props: { series: baseSeries } })
    expect(w.findAll('.sg-chart-legend-item')).toHaveLength(2)
  })

  it('marks each item with data-series-id', () => {
    const w = mount(SgChartLegend, { props: { series: baseSeries } })
    const items = w.findAll('.sg-chart-legend-item')
    expect(items[0].attributes('data-series-id')).toBe('s1')
    expect(items[1].attributes('data-series-id')).toBe('s2')
  })

  it('drops default class when unstyled', () => {
    const w = mount(SgChartLegend, { props: { series: baseSeries, unstyled: true } })
    expect(w.find('.sg-chart-legend').exists()).toBe(false)
  })
})

describe('SgLineChart', () => {
  it('renders one path per series segment', async () => {
    const w = mount(SgLineChart, {
      props: { categories: baseCategories, series: baseSeries },
      attachTo: document.body,
    })
    await nextTick()
    const paths = w.findAll('.sg-chart-line-paths path')
    expect(paths.length).toBeGreaterThanOrEqual(2)
    w.unmount()
  })

  it('renders markers when markers prop is true', async () => {
    const w = mount(SgLineChart, {
      props: { categories: baseCategories, series: baseSeries, markers: true },
      attachTo: document.body,
    })
    await nextTick()
    const markers = w.findAll('.sg-chart-line-markers circle')
    expect(markers.length).toBe(8)
    w.unmount()
  })

  it('skips markers when markers=false', async () => {
    const w = mount(SgLineChart, {
      props: { categories: baseCategories, series: baseSeries, markers: false },
      attachTo: document.body,
    })
    await nextTick()
    expect(w.find('.sg-chart-line-markers').exists()).toBe(false)
    w.unmount()
  })

  it('renders legend when enabled', async () => {
    const w = mount(SgLineChart, {
      props: { categories: baseCategories, series: baseSeries, legend: true },
      attachTo: document.body,
    })
    await nextTick()
    expect(w.findAll('.sg-chart-legend-item')).toHaveLength(2)
    w.unmount()
  })

  it('exposes print and exportSvg methods', async () => {
    const w = mount(SgLineChart, {
      props: { categories: baseCategories, series: baseSeries },
      attachTo: document.body,
    })
    await nextTick()
    const cmp = w.vm as unknown as { print: () => void; exportSvg: () => string | null }
    expect(typeof cmp.print).toBe('function')
    expect(typeof cmp.exportSvg).toBe('function')
    expect(typeof cmp.exportSvg()).toBe('string')
    w.unmount()
  })

  it('handles null gaps in series data', async () => {
    const w = mount(SgLineChart, {
      props: {
        categories: baseCategories,
        series: [{ id: 's', label: 's', values: [1, null, 3, null] }],
      },
      attachTo: document.body,
    })
    await nextTick()
    const paths = w.findAll('.sg-chart-line-paths path')
    expect(paths.length).toBe(2)
    w.unmount()
  })
})

describe('SgBarChart', () => {
  it('renders bars (default grouped)', async () => {
    const w = mount(SgBarChart, {
      props: { categories: baseCategories, series: baseSeries },
      attachTo: document.body,
    })
    await nextTick()
    const bars = w.findAll('.sg-chart-bars rect')
    expect(bars.length).toBe(8)
    w.unmount()
  })

  it('renders bars in stacked mode', async () => {
    const w = mount(SgBarChart, {
      props: { categories: baseCategories, series: baseSeries, stacked: true },
      attachTo: document.body,
    })
    await nextTick()
    const bars = w.findAll('.sg-chart-bars rect')
    expect(bars.length).toBe(8)
    w.unmount()
  })

  it('skips null values', async () => {
    const w = mount(SgBarChart, {
      props: {
        categories: baseCategories,
        series: [{ id: 's', label: 's', values: [1, null, 3, null] }],
      },
      attachTo: document.body,
    })
    await nextTick()
    const bars = w.findAll('.sg-chart-bars rect')
    expect(bars.length).toBe(2)
    w.unmount()
  })
})

describe('SgAreaChart', () => {
  it('renders one filled path and one stroke path per series', async () => {
    const w = mount(SgAreaChart, {
      props: { categories: baseCategories, series: baseSeries },
      attachTo: document.body,
    })
    await nextTick()
    const paths = w.findAll('.sg-chart-area-paths path')
    expect(paths.length).toBe(4)
    w.unmount()
  })

  it('respects fillOpacity prop', async () => {
    const w = mount(SgAreaChart, {
      props: { categories: baseCategories, series: baseSeries, fillOpacity: 0.5 },
      attachTo: document.body,
    })
    await nextTick()
    const filled = w.find('.sg-chart-area-paths path')
    expect(filled.attributes('fill-opacity')).toBe('0.5')
    w.unmount()
  })
})

describe('SgPieChart', () => {
  it('renders one slice per series', async () => {
    const w = mount(SgPieChart, {
      props: {
        categories: ['x'],
        series: [
          { id: 'a', label: 'A', values: [10] },
          { id: 'b', label: 'B', values: [20] },
          { id: 'c', label: 'C', values: [30] },
        ],
      },
      attachTo: document.body,
    })
    await nextTick()
    const slices = w.findAll('.sg-chart-pie-slices path')
    expect(slices.length).toBe(3)
    w.unmount()
  })

  it('renders nothing when total is zero', async () => {
    const w = mount(SgPieChart, {
      props: {
        categories: ['x'],
        series: [{ id: 'a', label: 'A', values: [0] }],
      },
      attachTo: document.body,
    })
    await nextTick()
    const slices = w.findAll('.sg-chart-pie-slices path')
    expect(slices.length).toBe(0)
    w.unmount()
  })

  it('renders donut slices when innerRadius > 0', async () => {
    const w = mount(SgPieChart, {
      props: {
        categories: ['x'],
        series: [
          { id: 'a', label: 'A', values: [50] },
          { id: 'b', label: 'B', values: [50] },
        ],
        innerRadius: 0.5,
      },
      attachTo: document.body,
    })
    await nextTick()
    const slices = w.findAll('.sg-chart-pie-slices path')
    expect(slices.length).toBe(2)
    w.unmount()
  })
})
