import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, fireEvent, render } from '@testing-library/react'
import {
  AreaChart,
  BarChart,
  LineChart,
  PieChart,
  DEFAULT_PALETTE,
  DEFAULT_CHART_ANIMATION_MS,
  colorForSeries,
  resolveChartAnimation,
  serializeSvg,
  measureSvg,
} from '../index'
import type { ChartSeries, ChartAction } from '../index'

describe('LineChart', () => {
  it('renders one polyline per series (as multiple <line> segments)', () => {
    const { container } = render(
      <LineChart
        categories={['a', 'b', 'c']}
        series={[
          { id: 's1', label: 'A', values: [1, 2, 3] },
          { id: 's2', label: 'B', values: [3, 2, 1] },
        ]}
      />,
    )
    const lines = container.querySelectorAll('line')
    // 2 series × 2 segments each = 4 lines.
    expect(lines.length).toBe(4)
  })

  it('skips segments where values are null', () => {
    const { container } = render(
      <LineChart
        categories={['a', 'b', 'c', 'd']}
        series={[{ id: 's', label: 'S', values: [1, null, 2, 3] }]}
      />,
    )
    const lines = container.querySelectorAll('line')
    // Gaps split the polyline. 1 → null breaks; 2 → 3 is a single segment.
    expect(lines.length).toBe(1)
  })

  it('renders markers at each non-null point', () => {
    const { container } = render(
      <LineChart
        categories={['a', 'b', 'c']}
        series={[{ id: 's', label: 'S', values: [1, 2, 3] }]}
        markers
      />,
    )
    const circles = container.querySelectorAll('circle')
    expect(circles.length).toBe(3)
  })

  it('hides markers when markers=false', () => {
    const { container } = render(
      <LineChart
        categories={['a', 'b']}
        series={[{ id: 's', label: 'S', values: [1, 2] }]}
        markers={false}
      />,
    )
    expect(container.querySelectorAll('circle').length).toBe(0)
  })

  it('uses sg-chart class by default and drops it on unstyled', () => {
    const { container, rerender } = render(
      <LineChart
        categories={['a']}
        series={[{ id: 's', label: 'S', values: [1] }]}
      />,
    )
    expect(container.querySelector('.sg-chart')).not.toBeNull()
    rerender(
      <LineChart
        categories={['a']}
        series={[{ id: 's', label: 'S', values: [1] }]}
        unstyled
      />,
    )
    expect(container.querySelector('.sg-chart')).toBeNull()
  })

  it('survives empty categories without throwing', () => {
    expect(() =>
      render(<LineChart categories={[]} series={[]} />),
    ).not.toThrow()
  })
})

describe('BarChart', () => {
  it('renders one rect per (series, category) cell', () => {
    const { container } = render(
      <BarChart
        categories={['Q1', 'Q2', 'Q3']}
        series={[
          { id: 'rev', label: 'Revenue', values: [10, 20, 30] },
          { id: 'cost', label: 'Cost', values: [5, 10, 15] },
        ]}
      />,
    )
    // 2 series × 3 categories = 6 rects (plus 1 baseline line).
    const rects = container.querySelectorAll('rect')
    expect(rects.length).toBe(6)
  })

  it('skips bars where the value is null', () => {
    const { container } = render(
      <BarChart
        categories={['a', 'b', 'c']}
        series={[{ id: 's', label: 'S', values: [10, null, 20] }]}
      />,
    )
    expect(container.querySelectorAll('rect').length).toBe(2)
  })

  it('renders the zero baseline line', () => {
    const { container } = render(
      <BarChart
        categories={['a']}
        series={[{ id: 's', label: 'S', values: [10] }]}
      />,
    )
    const baseline = container.querySelector('line')
    expect(baseline).not.toBeNull()
  })

  it('handles negative values (rests on zero baseline)', () => {
    const { container } = render(
      <BarChart
        categories={['a', 'b']}
        series={[{ id: 's', label: 'S', values: [-5, 10] }]}
      />,
    )
    expect(container.querySelectorAll('rect').length).toBe(2)
  })
})

describe('AreaChart', () => {
  it('renders an area path + a top line per series', () => {
    const { container } = render(
      <AreaChart
        categories={['a', 'b', 'c']}
        series={[
          { id: 's1', label: 'A', values: [1, 2, 3] },
          { id: 's2', label: 'B', values: [3, 2, 1] },
        ]}
      />,
    )
    // 2 paths per series (area fill + top stroke) → 4 paths total.
    expect(container.querySelectorAll('path').length).toBe(4)
  })

  it('stacked mode produces cumulative areas', () => {
    const { container } = render(
      <AreaChart
        categories={['a', 'b']}
        series={[
          { id: 's1', label: 'A', values: [1, 2] },
          { id: 's2', label: 'B', values: [1, 1] },
        ]}
        stacked
      />,
    )
    // Same path count (2 series × 2 paths) — stacking is reflected in y-coords.
    expect(container.querySelectorAll('path').length).toBe(4)
  })

  it('handles empty series gracefully', () => {
    expect(() =>
      render(<AreaChart categories={['a']} series={[]} />),
    ).not.toThrow()
  })
})

describe('PieChart', () => {
  it('renders one path per non-zero slice', () => {
    const { container } = render(
      <PieChart
        data={[
          { id: 'a', label: 'A', value: 30 },
          { id: 'b', label: 'B', value: 50 },
          { id: 'c', label: 'C', value: 20 },
        ]}
      />,
    )
    expect(container.querySelectorAll('path').length).toBe(3)
  })

  it('skips zero-value slices', () => {
    const { container } = render(
      <PieChart
        data={[
          { id: 'a', label: 'A', value: 100 },
          { id: 'b', label: 'B', value: 0 },
        ]}
      />,
    )
    expect(container.querySelectorAll('path').length).toBe(1)
  })

  it('clamps negative values to 0', () => {
    const { container } = render(
      <PieChart
        data={[
          { id: 'a', label: 'A', value: 50 },
          { id: 'b', label: 'B', value: -10 },
          { id: 'c', label: 'C', value: 50 },
        ]}
      />,
    )
    expect(container.querySelectorAll('path').length).toBe(2)
  })

  it('renders an empty SVG when total is zero', () => {
    const { container } = render(
      <PieChart
        data={[
          { id: 'a', label: 'A', value: 0 },
          { id: 'b', label: 'B', value: 0 },
        ]}
      />,
    )
    expect(container.querySelectorAll('path').length).toBe(0)
  })

  it('donut mode (innerRadius > 0) builds the path with two arcs', () => {
    const { container } = render(
      <PieChart
        innerRadius={30}
        outerRadius={60}
        data={[
          { id: 'a', label: 'A', value: 50 },
          { id: 'b', label: 'B', value: 50 },
        ]}
      />,
    )
    const paths = container.querySelectorAll('path')
    expect(paths.length).toBe(2)
    // Donut path uses two `A ... A ...` arcs.
    expect(paths[0]!.getAttribute('d')).toMatch(/A .* A /)
  })

  it('uses explicit slice color over palette', () => {
    const { container } = render(
      <PieChart
        data={[{ id: 'x', label: 'X', value: 100, color: '#ff0000' }]}
      />,
    )
    expect(container.querySelector('path')!.getAttribute('fill')).toBe('#ff0000')
  })
})

describe('Chart tooltips (native title)', () => {
  it('LineChart marker has a <title> with series label, category, value', () => {
    const { container } = render(
      <LineChart
        categories={['Mon']}
        series={[{ id: 's', label: 'Visits', values: [42] }]}
      />,
    )
    const title = container.querySelector('circle title')
    expect(title?.textContent).toBe('Visits · Mon: 42')
  })

  it('BarChart bar has a <title> tooltip', () => {
    const { container } = render(
      <BarChart
        categories={['Q1']}
        series={[{ id: 'r', label: 'Revenue', values: [100] }]}
      />,
    )
    const title = container.querySelector('rect title')
    expect(title?.textContent).toBe('Revenue · Q1: 100')
  })

  it('PieChart slice <title> includes label and value', () => {
    const { container } = render(
      <PieChart data={[{ id: 'a', label: 'Alpha', value: 25 }]} />,
    )
    const title = container.querySelector('path title')
    expect(title?.textContent).toBe('Alpha: 25')
  })
})

describe('Chart legend', () => {
  it('LineChart renders no legend by default', () => {
    const { container } = render(
      <LineChart
        categories={['a']}
        series={[{ id: 's', label: 'S', values: [1] }]}
      />,
    )
    expect(container.querySelector('.sg-chart-legend')).toBeNull()
  })

  it('LineChart renders a legend when legend=true', () => {
    const { container, getByText } = render(
      <LineChart
        categories={['a']}
        series={[
          { id: 's1', label: 'Visits', values: [1] },
          { id: 's2', label: 'Orders', values: [2] },
        ]}
        legend
      />,
    )
    expect(container.querySelector('.sg-chart-legend')).not.toBeNull()
    expect(getByText('Visits')).toBeDefined()
    expect(getByText('Orders')).toBeDefined()
  })

  it('BarChart legend renders one item per series', () => {
    const { container } = render(
      <BarChart
        categories={['a', 'b']}
        series={[
          { id: 's1', label: 'A', values: [1, 2] },
          { id: 's2', label: 'B', values: [3, 4] },
          { id: 's3', label: 'C', values: [5, 6] },
        ]}
        legend
      />,
    )
    const items = container.querySelectorAll('.sg-chart-legend-item')
    expect(items.length).toBe(3)
  })

  it('AreaChart legend uses series colors as swatches', () => {
    const { container } = render(
      <AreaChart
        categories={['a']}
        series={[
          { id: 's1', label: 'A', values: [10], color: '#abcdef' },
        ]}
        legend
      />,
    )
    const swatch = container.querySelector('.sg-chart-legend-swatch') as HTMLElement
    expect(swatch).not.toBeNull()
    expect(swatch.style.background).toContain('rgb')
  })
})

describe('Chart axes', () => {
  it('renders no axes by default (v0 backward-compat)', () => {
    const { container } = render(
      <LineChart
        categories={['a', 'b', 'c']}
        series={[{ id: 's', label: 'S', values: [1, 2, 3] }]}
      />,
    )
    expect(container.querySelector('.sg-chart-axis')).toBeNull()
    expect(container.querySelector('[data-sg-chart-axes]')).toBeNull()
    expect(container.querySelector('[data-sg-axis="x"]')).toBeNull()
    expect(container.querySelector('[data-sg-axis="y"]')).toBeNull()
  })

  it('LineChart renders the y-axis when yAxis prop is provided', () => {
    const { container } = render(
      <LineChart
        categories={['a', 'b']}
        series={[{ id: 's', label: 'S', values: [10, 20] }]}
        yAxis={{ tickCount: 3 }}
      />,
    )
    expect(container.querySelector('[data-sg-axis="y"]')).not.toBeNull()
    const tickLabels = container.querySelectorAll('[data-sg-axis-tick-label="y"]')
    expect(tickLabels.length).toBe(3)
  })

  it('renders horizontal gridlines when yAxis.gridLines = true', () => {
    const { container } = render(
      <LineChart
        categories={['a', 'b']}
        series={[{ id: 's', label: 'S', values: [10, 20] }]}
        yAxis={{ tickCount: 4, gridLines: true }}
      />,
    )
    const grid = container.querySelectorAll('[data-sg-axis-grid]')
    expect(grid.length).toBe(4)
  })

  it('omits gridlines when yAxis.gridLines is falsy (default)', () => {
    const { container } = render(
      <LineChart
        categories={['a', 'b']}
        series={[{ id: 's', label: 'S', values: [10, 20] }]}
        yAxis={{ tickCount: 5 }}
      />,
    )
    expect(container.querySelectorAll('[data-sg-axis-grid]').length).toBe(0)
  })

  it('y-axis tickFormatter transforms tick labels', () => {
    const { container } = render(
      <BarChart
        categories={['a']}
        series={[{ id: 's', label: 'S', values: [100] }]}
        yAxis={{ tickCount: 3, tickFormatter: (v) => `$${v.toFixed(0)}` }}
      />,
    )
    const labels = Array.from(
      container.querySelectorAll('[data-sg-axis-tick-label="y"]'),
    ).map((n) => n.textContent)
    expect(labels.every((l) => l!.startsWith('$'))).toBe(true)
    // Three ticks across [0, 100] → expect $0 / $50 / $100 in some DOM order.
    expect(new Set(labels)).toEqual(new Set(['$0', '$50', '$100']))
  })

  it('x-axis tickFormatter transforms category labels', () => {
    const { container } = render(
      <LineChart
        categories={['2025-01', '2025-02', '2025-03']}
        series={[{ id: 's', label: 'S', values: [1, 2, 3] }]}
        xAxis={{ tickFormatter: (c) => String(c).slice(5) }}
      />,
    )
    const labels = Array.from(
      container.querySelectorAll('[data-sg-axis-tick-label="x"]'),
    ).map((n) => n.textContent)
    expect(labels).toEqual(['01', '02', '03'])
  })

  it('renders axis labels when provided', () => {
    const { container } = render(
      <AreaChart
        categories={['a', 'b']}
        series={[{ id: 's', label: 'S', values: [1, 2] }]}
        xAxis={{ label: 'Time' }}
        yAxis={{ label: 'Sales' }}
      />,
    )
    const xLabel = container.querySelector('[data-sg-axis-label="x"]')
    const yLabel = container.querySelector('[data-sg-axis-label="y"]')
    expect(xLabel?.textContent).toBe('Time')
    expect(yLabel?.textContent).toBe('Sales')
  })

  it('x-axis tickCount picks evenly-spaced categories including endpoints', () => {
    const { container } = render(
      <LineChart
        categories={['a', 'b', 'c', 'd', 'e', 'f', 'g']}
        series={[{ id: 's', label: 'S', values: [1, 2, 3, 4, 5, 6, 7] }]}
        xAxis={{ tickCount: 3 }}
      />,
    )
    const labels = Array.from(
      container.querySelectorAll('[data-sg-axis-tick-label="x"]'),
    ).map((n) => n.textContent)
    expect(labels[0]).toBe('a')
    expect(labels[labels.length - 1]).toBe('g')
    expect(labels.length).toBeLessThanOrEqual(3)
  })

  it('BarChart x-ticks align with the centre of each bar group', () => {
    const { container } = render(
      <BarChart
        categories={['Q1', 'Q2']}
        series={[{ id: 's', label: 'S', values: [10, 20] }]}
        xAxis={{}}
        padding={0}
        height={100}
      />,
    )
    const ticks = Array.from(container.querySelectorAll('[data-sg-axis-tick="x"]'))
    expect(ticks.length).toBe(2)
    // viewBox is 600×100 with zero padding → groupWidth = 300, centres at 150 and 450.
    expect(Number(ticks[0]!.getAttribute('x1'))).toBeCloseTo(150, 0)
    expect(Number(ticks[1]!.getAttribute('x1'))).toBeCloseTo(450, 0)
  })

  it('drops axis classes when chart is unstyled', () => {
    const { container } = render(
      <LineChart
        categories={['a']}
        series={[{ id: 's', label: 'S', values: [1] }]}
        yAxis={{ tickCount: 3, gridLines: true }}
        unstyled
      />,
    )
    expect(container.querySelector('.sg-chart-axis')).toBeNull()
    expect(container.querySelector('.sg-chart-axis-grid')).toBeNull()
    // The structural data hooks are still in place.
    expect(container.querySelector('[data-sg-axis="y"]')).not.toBeNull()
  })
})

describe('Chart animations', () => {
  it('resolveChartAnimation: undefined → enabled with default duration', () => {
    expect(resolveChartAnimation(undefined)).toEqual({
      enabled: true,
      duration: DEFAULT_CHART_ANIMATION_MS,
    })
  })

  it('resolveChartAnimation: false → disabled', () => {
    expect(resolveChartAnimation(false)).toEqual({ enabled: false, duration: 0 })
  })

  it('resolveChartAnimation: { duration } → custom duration', () => {
    expect(resolveChartAnimation({ duration: 1234 })).toEqual({
      enabled: true,
      duration: 1234,
    })
  })

  it('LineChart applies sg-chart-line-segment-animate class by default', () => {
    const { container } = render(
      <LineChart
        categories={['a', 'b', 'c']}
        series={[{ id: 's', label: 'S', values: [1, 2, 3] }]}
      />,
    )
    const segs = container.querySelectorAll('.sg-chart-line-segment-animate')
    // 1 series × 2 segments → 2 animated segments.
    expect(segs.length).toBe(2)
    // stroke-dasharray and offset are inlined per segment so the CSS keyframe
    // can animate `stroke-dashoffset` to 0.
    const first = segs[0] as SVGLineElement
    expect(first.style.strokeDasharray).toBeTruthy()
    expect(first.style.strokeDashoffset).toBe(first.style.strokeDasharray)
  })

  it('LineChart drops animation classes when animate=false', () => {
    const { container } = render(
      <LineChart
        categories={['a', 'b']}
        series={[{ id: 's', label: 'S', values: [1, 2] }]}
        animate={false}
      />,
    )
    expect(container.querySelectorAll('.sg-chart-line-segment-animate').length).toBe(0)
    expect(container.querySelector('.sg-chart-line-animate')).toBeNull()
  })

  it('LineChart honours animate.duration on segment animationDuration style', () => {
    const { container } = render(
      <LineChart
        categories={['a', 'b']}
        series={[{ id: 's', label: 'S', values: [1, 2] }]}
        animate={{ duration: 800 }}
      />,
    )
    const seg = container.querySelector('.sg-chart-line-segment-animate') as SVGLineElement
    expect(seg).not.toBeNull()
    // 1 segment → animationDuration === 800ms / 1 segment.
    expect(seg.style.animationDuration).toBe('800ms')
  })

  it('BarChart applies sg-chart-bar-animate class on every <rect>', () => {
    const { container } = render(
      <BarChart
        categories={['a', 'b', 'c']}
        series={[{ id: 's', label: 'S', values: [10, 20, 30] }]}
      />,
    )
    const animated = container.querySelectorAll('.sg-chart-bar-animate')
    expect(animated.length).toBe(3)
    // transformOrigin is inlined so the keyframe `scaleY(0) → scaleY(1)`
    // pivots from the zero baseline.
    const first = animated[0] as SVGRectElement
    expect(first.style.transformOrigin).toBeTruthy()
  })

  it('AreaChart applies sg-chart-area-animate per series group', () => {
    const { container } = render(
      <AreaChart
        categories={['a', 'b', 'c']}
        series={[
          { id: 's1', label: 'A', values: [1, 2, 3] },
          { id: 's2', label: 'B', values: [3, 2, 1] },
        ]}
      />,
    )
    expect(container.querySelectorAll('.sg-chart-area-animate').length).toBe(2)
  })

  it('PieChart applies sg-chart-pie-animate on each slice', () => {
    const { container } = render(
      <PieChart
        data={[
          { id: 'a', label: 'A', value: 30 },
          { id: 'b', label: 'B', value: 70 },
        ]}
      />,
    )
    expect(container.querySelectorAll('.sg-chart-pie-animate').length).toBe(2)
  })

  it('All charts drop animation classes under unstyled', () => {
    const { container } = render(
      <div>
        <LineChart
          categories={['a', 'b']}
          series={[{ id: 's', label: 'S', values: [1, 2] }]}
          unstyled
        />
        <BarChart
          categories={['a']}
          series={[{ id: 's', label: 'S', values: [10] }]}
          unstyled
        />
        <AreaChart
          categories={['a', 'b']}
          series={[{ id: 's', label: 'S', values: [1, 2] }]}
          unstyled
        />
        <PieChart data={[{ id: 'a', label: 'A', value: 1 }]} unstyled />
      </div>,
    )
    expect(container.querySelector('.sg-chart-line-segment-animate')).toBeNull()
    expect(container.querySelector('.sg-chart-bar-animate')).toBeNull()
    expect(container.querySelector('.sg-chart-area-animate')).toBeNull()
    expect(container.querySelector('.sg-chart-pie-animate')).toBeNull()
  })
})

describe('LineChart crosshair', () => {
  // Helper to mock getBoundingClientRect on a JSX <svg> in jsdom (which
  // returns zeroed rects by default — that disables our hit-test logic).
  function patchSvgRect(svg: SVGSVGElement, width = 600, height = 200) {
    Object.defineProperty(svg, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, right: width, bottom: height, width, height, x: 0, y: 0, toJSON: () => '' }),
      configurable: true,
    })
  }

  it('does not render crosshair overlay by default', () => {
    const { container } = render(
      <LineChart
        categories={['a', 'b', 'c']}
        series={[{ id: 's', label: 'S', values: [1, 2, 3] }]}
      />,
    )
    expect(container.querySelector('[data-sg-chart-crosshair]')).toBeNull()
  })

  it('renders the vertical guide on mouseMove when crosshair=true', () => {
    const { container } = render(
      <LineChart
        categories={['Mon', 'Tue', 'Wed']}
        series={[{ id: 's', label: 'Visits', values: [10, 20, 30] }]}
        crosshair
      />,
    )
    const svg = container.querySelector('svg')!
    patchSvgRect(svg as SVGSVGElement)
    // Move near the middle column → ChartCrosshair should mount.
    fireEvent.mouseMove(svg, { clientX: 300, clientY: 100 })
    expect(container.querySelector('[data-sg-chart-crosshair]')).not.toBeNull()
    expect(container.querySelector('[data-sg-chart-crosshair-line]')).not.toBeNull()
  })

  it('removes the crosshair on mouseLeave', () => {
    const { container } = render(
      <LineChart
        categories={['a', 'b', 'c']}
        series={[{ id: 's', label: 'S', values: [1, 2, 3] }]}
        crosshair
      />,
    )
    const svg = container.querySelector('svg')!
    patchSvgRect(svg as SVGSVGElement)
    fireEvent.mouseMove(svg, { clientX: 300, clientY: 100 })
    expect(container.querySelector('[data-sg-chart-crosshair]')).not.toBeNull()
    fireEvent.mouseLeave(svg)
    expect(container.querySelector('[data-sg-chart-crosshair]')).toBeNull()
  })

  it('crosshair tooltip lists one row per non-null series at the hovered category', () => {
    const { container } = render(
      <LineChart
        categories={['a', 'b']}
        series={[
          { id: 's1', label: 'Alpha', values: [10, 20] },
          { id: 's2', label: 'Beta', values: [5, null] },
          { id: 's3', label: 'Gamma', values: [1, 2] },
        ]}
        crosshair
      />,
    )
    const svg = container.querySelector('svg')!
    patchSvgRect(svg as SVGSVGElement)
    // Click on the second category (right edge of the plot).
    fireEvent.mouseMove(svg, { clientX: 600, clientY: 100 })
    const dots = container.querySelectorAll('[data-sg-chart-crosshair-dot]')
    // Beta has null at idx 1 → only Alpha + Gamma render dots.
    expect(dots.length).toBe(2)
  })

  it('crosshair valueFormatter is forwarded to the tooltip values', () => {
    const fmt = (n: number) => `$${n.toFixed(2)}`
    const { container } = render(
      <LineChart
        categories={['a', 'b']}
        series={[{ id: 's', label: 'Sales', values: [10, 20] }]}
        crosshair={{ valueFormatter: fmt }}
      />,
    )
    const svg = container.querySelector('svg')!
    patchSvgRect(svg as SVGSVGElement)
    fireEvent.mouseMove(svg, { clientX: 0, clientY: 100 })
    const value = container.querySelector('.sg-chart-crosshair-tooltip-value')
    expect(value?.textContent).toBe('$10.00')
  })

  it('mouse outside the plot range does not render crosshair', () => {
    const { container } = render(
      <LineChart
        categories={['a', 'b', 'c']}
        series={[{ id: 's', label: 'S', values: [1, 2, 3] }]}
        crosshair
      />,
    )
    const svg = container.querySelector('svg')!
    patchSvgRect(svg as SVGSVGElement)
    // Way past the right edge.
    fireEvent.mouseMove(svg, { clientX: 10000, clientY: 100 })
    expect(container.querySelector('[data-sg-chart-crosshair]')).toBeNull()
  })
})

describe('Chart brushing', () => {
  // Helper повторяет patchSvgRect из crosshair-блока, но возвращает SVG.
  function patchSvgRect(svg: SVGSVGElement, width = 600, height = 200) {
    Object.defineProperty(svg, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, right: width, bottom: height, width, height, x: 0, y: 0, toJSON: () => '' }),
      configurable: true,
    })
  }

  it('does not render brush overlay when brush is omitted', () => {
    const { container } = render(
      <LineChart
        categories={['a', 'b', 'c']}
        series={[{ id: 's', label: 'S', values: [1, 2, 3] }]}
      />,
    )
    expect(container.querySelector('[data-sg-chart-brush]')).toBeNull()
  })

  it('renders the brush overlay rect when brush=true', () => {
    const { container } = render(
      <LineChart
        categories={['a', 'b', 'c']}
        series={[{ id: 's', label: 'S', values: [1, 2, 3] }]}
        brush
      />,
    )
    expect(container.querySelector('[data-sg-chart-brush-overlay]')).not.toBeNull()
    // Selection rect появляется только после drag — пока его нет.
    expect(container.querySelector('[data-sg-chart-brush-selection]')).toBeNull()
  })

  it('drag → release fires onRangeChange with category indices (uncontrolled)', () => {
    const onRangeChange = vi.fn()
    const { container } = render(
      <LineChart
        categories={['a', 'b', 'c', 'd', 'e']}
        series={[{ id: 's', label: 'S', values: [1, 2, 3, 4, 5] }]}
        brush={{ onRangeChange }}
      />,
    )
    const svg = container.querySelector('svg')! as SVGSVGElement
    patchSvgRect(svg)

    const overlay = container.querySelector(
      '[data-sg-chart-brush-overlay]',
    ) as SVGRectElement
    // Все pointer-события на overlay — благодаря setPointerCapture даже
    // глобальный move/up видим внутри overlay.
    fireEvent.pointerDown(overlay, { clientX: 50, clientY: 100, pointerId: 1 })
    fireEvent.pointerMove(overlay, { clientX: 400, clientY: 100, pointerId: 1 })
    fireEvent.pointerUp(overlay, { clientX: 400, clientY: 100, pointerId: 1 })

    expect(onRangeChange).toHaveBeenCalledTimes(1)
    const arg = onRangeChange.mock.calls[0]![0]
    expect(arg).not.toBeNull()
    expect(arg.from).toBeLessThanOrEqual(arg.to)
    expect(arg.from).toBeGreaterThanOrEqual(0)
    expect(arg.to).toBeLessThan(5)
  })

  it('selection rect persists in uncontrolled mode after release', () => {
    const { container } = render(
      <BarChart
        categories={['Q1', 'Q2', 'Q3', 'Q4']}
        series={[{ id: 's', label: 'S', values: [10, 20, 30, 40] }]}
        brush
      />,
    )
    const svg = container.querySelector('svg')! as SVGSVGElement
    patchSvgRect(svg)

    const overlay = container.querySelector('[data-sg-chart-brush-overlay]') as SVGRectElement
    fireEvent.pointerDown(overlay, { clientX: 100, clientY: 100, pointerId: 1 })
    fireEvent.pointerMove(overlay, { clientX: 400, clientY: 100, pointerId: 1 })
    fireEvent.pointerUp(overlay, { clientX: 400, clientY: 100, pointerId: 1 })

    // После release (внутреннее uncontrolled state применилось) selection-rect
    // отрисован с непустой шириной.
    const sel = container.querySelector('[data-sg-chart-brush-selection]')
    expect(sel).not.toBeNull()
  })

  it('controlled range prop drives the visible selection rect', () => {
    const { container, rerender } = render(
      <AreaChart
        categories={['a', 'b', 'c', 'd']}
        series={[{ id: 's', label: 'S', values: [1, 2, 3, 4] }]}
        brush={{ range: null, onRangeChange: () => {} }}
      />,
    )
    expect(container.querySelector('[data-sg-chart-brush-selection]')).toBeNull()

    rerender(
      <AreaChart
        categories={['a', 'b', 'c', 'd']}
        series={[{ id: 's', label: 'S', values: [1, 2, 3, 4] }]}
        brush={{ range: { from: 1, to: 2 }, onRangeChange: () => {} }}
      />,
    )
    expect(container.querySelector('[data-sg-chart-brush-selection]')).not.toBeNull()
  })

  it('double-click on the overlay calls onRangeChange(null) (reset)', () => {
    const onRangeChange = vi.fn()
    const { container } = render(
      <LineChart
        categories={['a', 'b', 'c']}
        series={[{ id: 's', label: 'S', values: [1, 2, 3] }]}
        brush={{ defaultRange: { from: 0, to: 2 }, onRangeChange }}
      />,
    )
    const svg = container.querySelector('svg')! as SVGSVGElement
    patchSvgRect(svg)

    const overlay = container.querySelector(
      '[data-sg-chart-brush-overlay]',
    ) as SVGRectElement
    fireEvent.doubleClick(overlay)
    expect(onRangeChange).toHaveBeenCalledWith(null)
  })

  it('disabled brush keeps the selection visible but ignores pointerdown', () => {
    const onRangeChange = vi.fn()
    const { container } = render(
      <LineChart
        categories={['a', 'b', 'c']}
        series={[{ id: 's', label: 'S', values: [1, 2, 3] }]}
        brush={{ range: { from: 0, to: 1 }, onRangeChange, disabled: true }}
      />,
    )
    const svg = container.querySelector('svg')! as SVGSVGElement
    patchSvgRect(svg)

    expect(container.querySelector('[data-sg-chart-brush-selection]')).not.toBeNull()

    const overlay = container.querySelector(
      '[data-sg-chart-brush-overlay]',
    ) as SVGRectElement
    fireEvent.pointerDown(overlay, { clientX: 100, clientY: 100, pointerId: 1 })
    fireEvent.pointerUp(overlay, { clientX: 200, clientY: 100, pointerId: 1 })

    // disabled: pointerdown игнорируется → onRangeChange не вызван.
    expect(onRangeChange).not.toHaveBeenCalled()
  })

  it('BarChart and AreaChart also support brush', () => {
    const { container: barC } = render(
      <BarChart
        categories={['a', 'b']}
        series={[{ id: 's', label: 'S', values: [10, 20] }]}
        brush
      />,
    )
    const { container: areaC } = render(
      <AreaChart
        categories={['a', 'b']}
        series={[{ id: 's', label: 'S', values: [10, 20] }]}
        brush
      />,
    )
    expect(barC.querySelector('[data-sg-chart-brush-overlay]')).not.toBeNull()
    expect(areaC.querySelector('[data-sg-chart-brush-overlay]')).not.toBeNull()
  })
})

// ─── ResizeObserver mock (jsdom не имплементит RO) ─────────────────────
//
// Создаём минимальный мок, который умеет триггерить callback на disconnect/
// connect и вручную через `triggerResize(...)`. Активный observer хранится
// глобально, чтобы тест мог симулировать resize без доступа к instance.
type RoEntry = { contentRect: { width: number; height: number } }
type RoCb = (entries: RoEntry[]) => void
const __ros: { cb: RoCb; targets: Element[] }[] = []
class MockResizeObserver {
  cb: RoCb
  targets: Element[] = []
  constructor(cb: RoCb) {
    this.cb = cb
    __ros.push(this)
  }
  observe(t: Element) {
    this.targets.push(t)
  }
  disconnect() {
    this.targets = []
    const i = __ros.indexOf(this)
    if (i >= 0) __ros.splice(i, 1)
  }
  unobserve(t: Element) {
    this.targets = this.targets.filter((x) => x !== t)
  }
}
function triggerAllResize(width: number, height: number) {
  for (const ro of __ros) {
    act(() => {
      ro.cb(ro.targets.map(() => ({ contentRect: { width, height } })))
    })
  }
}

describe('useChartSize / responsive viewBox', () => {
  let originalRO: typeof globalThis.ResizeObserver | undefined
  beforeEach(() => {
    originalRO = globalThis.ResizeObserver
    __ros.length = 0
    ;(globalThis as unknown as { ResizeObserver: typeof MockResizeObserver }).ResizeObserver =
      MockResizeObserver
  })
  afterEach(() => {
    if (originalRO) globalThis.ResizeObserver = originalRO
    else delete (globalThis as { ResizeObserver?: unknown }).ResizeObserver
    __ros.length = 0
  })

  it('LineChart viewBox falls back to 600 × height before any RO event', () => {
    const { container } = render(
      <LineChart
        categories={['a', 'b']}
        series={[{ id: 's', label: 'S', values: [1, 2] }]}
        height={150}
      />,
    )
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('viewBox')).toBe('0 0 600 150')
  })

  it('LineChart viewBox updates after ResizeObserver triggers a new size', () => {
    const { container } = render(
      <LineChart
        categories={['a', 'b']}
        series={[{ id: 's', label: 'S', values: [1, 2] }]}
        height={200}
      />,
    )
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('viewBox')).toBe('0 0 600 200')
    triggerAllResize(800, 250)
    expect(svg.getAttribute('viewBox')).toBe('0 0 800 250')
  })

  it('LineChart removes preserveAspectRatio (responsive without stretch)', () => {
    const { container } = render(
      <LineChart
        categories={['a', 'b']}
        series={[{ id: 's', label: 'S', values: [1, 2] }]}
      />,
    )
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('preserveAspectRatio')).toBeNull()
  })

  it('LineChart segments use vector-effect="non-scaling-stroke"', () => {
    const { container } = render(
      <LineChart
        categories={['a', 'b']}
        series={[{ id: 's', label: 'S', values: [1, 2] }]}
      />,
    )
    const seg = container.querySelector('line')!
    expect(seg.getAttribute('vector-effect')).toBe('non-scaling-stroke')
  })

  it('LineChart marker cx is recomputed when container width changes', () => {
    const { container } = render(
      <LineChart
        categories={['a', 'b', 'c']}
        series={[{ id: 's', label: 'S', values: [1, 2, 3] }]}
        padding={0}
      />,
    )
    const firstCx0 = Number(container.querySelectorAll('circle')[0]!.getAttribute('cx'))
    const lastCx0 = Number(container.querySelectorAll('circle')[2]!.getAttribute('cx'))
    expect(firstCx0).toBe(0)
    expect(lastCx0).toBe(600)
    triggerAllResize(800, 200)
    const lastCx1 = Number(container.querySelectorAll('circle')[2]!.getAttribute('cx'))
    expect(lastCx1).toBe(800)
  })

  it('BarChart and AreaChart also re-measure via ResizeObserver', () => {
    const { container: barC } = render(
      <BarChart
        categories={['a']}
        series={[{ id: 's', label: 'S', values: [10] }]}
      />,
    )
    const { container: areaC } = render(
      <AreaChart
        categories={['a', 'b']}
        series={[{ id: 's', label: 'S', values: [1, 2] }]}
      />,
    )
    triggerAllResize(900, 300)
    expect(barC.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 900 300')
    expect(areaC.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 900 300')
  })

  it('PieChart cx/cy follows measured size on resize', () => {
    const { container } = render(
      <PieChart
        data={[
          { id: 'a', label: 'A', value: 50 },
          { id: 'b', label: 'B', value: 50 },
        ]}
        outerRadius={50}
      />,
    )
    expect(container.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 200 200')
    triggerAllResize(400, 400)
    expect(container.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 400 400')
  })
})

describe('Chart hover toolbar', () => {
  let originalRO: typeof globalThis.ResizeObserver | undefined
  beforeEach(() => {
    originalRO = globalThis.ResizeObserver
    ;(globalThis as unknown as { ResizeObserver: typeof MockResizeObserver }).ResizeObserver =
      MockResizeObserver
  })
  afterEach(() => {
    if (originalRO) globalThis.ResizeObserver = originalRO
    else delete (globalThis as { ResizeObserver?: unknown }).ResizeObserver
    __ros.length = 0
  })

  it('actions=undefined → toolbar is not rendered, no wrapper added', () => {
    const { container } = render(
      <LineChart
        categories={['a']}
        series={[{ id: 's', label: 'S', values: [1] }]}
      />,
    )
    expect(container.querySelector('[data-sg-chart-toolbar]')).toBeNull()
    expect(container.querySelector('.sg-chart-wrapper')).toBeNull()
    // SVG is the root.
    expect(container.firstChild?.nodeName.toLowerCase()).toBe('svg')
  })

  it('actions=true wraps SVG into .sg-chart-wrapper and renders 3 default buttons', () => {
    const { container } = render(
      <LineChart
        categories={['a']}
        series={[{ id: 's', label: 'S', values: [1] }]}
        actions
      />,
    )
    expect(container.querySelector('.sg-chart-wrapper')).not.toBeNull()
    const toolbar = container.querySelector('[data-sg-chart-toolbar]')
    expect(toolbar).not.toBeNull()
    expect(toolbar!.querySelectorAll('button').length).toBe(3)
    // Default actions: print, downloadSvg, downloadPng.
    expect(container.querySelector('[data-sg-action="print"]')).not.toBeNull()
    expect(container.querySelector('[data-sg-action="downloadSvg"]')).not.toBeNull()
    expect(container.querySelector('[data-sg-action="downloadPng"]')).not.toBeNull()
  })

  it('toolbar starts hidden and flips to visible on wrapper mouseenter', () => {
    const { container } = render(
      <LineChart
        categories={['a']}
        series={[{ id: 's', label: 'S', values: [1] }]}
        actions
      />,
    )
    const toolbar = container.querySelector('[data-sg-chart-toolbar]')!
    expect(toolbar.getAttribute('data-sg-toolbar')).toBe('hidden')
    const wrapper = container.querySelector('.sg-chart-wrapper')!
    fireEvent.mouseEnter(wrapper)
    expect(toolbar.getAttribute('data-sg-toolbar')).toBe('visible')
    fireEvent.mouseLeave(wrapper)
    expect(toolbar.getAttribute('data-sg-toolbar')).toBe('hidden')
  })

  it('default print action calls window.open', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    const { container } = render(
      <LineChart
        categories={['a']}
        series={[{ id: 's', label: 'S', values: [1] }]}
        actions
      />,
    )
    const printBtn = container.querySelector('[data-sg-action="print"]') as HTMLButtonElement
    fireEvent.click(printBtn)
    expect(openSpy).toHaveBeenCalled()
    openSpy.mockRestore()
  })

  it('default downloadSvg triggers an <a download> click with .svg extension', () => {
    const clicks: HTMLAnchorElement[] = []
    const realCreate = document.createElement.bind(document)
    const createSpy = vi
      .spyOn(document, 'createElement')
      .mockImplementation((tag: string) => {
        const el = realCreate(tag)
        if (tag === 'a') {
          ;(el as HTMLAnchorElement).click = () => clicks.push(el as HTMLAnchorElement)
        }
        return el
      })
    // jsdom does not implement createObjectURL — patch the URL object
    // directly (spyOn fails on a missing method).
    const urlObj = URL as unknown as {
      createObjectURL?: (b: Blob) => string
      revokeObjectURL?: (u: string) => void
    }
    const prevCreate = urlObj.createObjectURL
    const prevRevoke = urlObj.revokeObjectURL
    urlObj.createObjectURL = () => 'blob://test'
    urlObj.revokeObjectURL = () => {}

    const { container } = render(
      <BarChart
        categories={['a']}
        series={[{ id: 's', label: 'S', values: [1] }]}
        actions
        fileName="my-bar"
      />,
    )
    const svgBtn = container.querySelector('[data-sg-action="downloadSvg"]') as HTMLButtonElement
    fireEvent.click(svgBtn)

    expect(clicks.length).toBe(1)
    expect(clicks[0]!.download).toBe('my-bar.svg')

    createSpy.mockRestore()
    urlObj.createObjectURL = prevCreate
    urlObj.revokeObjectURL = prevRevoke
  })

  it('actions=true with brush=true adds the resetBrush button', () => {
    const { container } = render(
      <LineChart
        categories={['a', 'b', 'c']}
        series={[{ id: 's', label: 'S', values: [1, 2, 3] }]}
        actions
        brush
      />,
    )
    expect(container.querySelector('[data-sg-action="resetBrush"]')).not.toBeNull()
  })

  it('resetBrush button calls onRangeChange(null)', () => {
    const onRangeChange = vi.fn()
    const { container } = render(
      <LineChart
        categories={['a', 'b', 'c']}
        series={[{ id: 's', label: 'S', values: [1, 2, 3] }]}
        actions
        brush={{ defaultRange: { from: 0, to: 2 }, onRangeChange }}
      />,
    )
    const btn = container.querySelector('[data-sg-action="resetBrush"]') as HTMLButtonElement
    fireEvent.click(btn)
    expect(onRangeChange).toHaveBeenCalledWith(null)
  })

  it('custom actions array renders only provided buttons', () => {
    const onClick = vi.fn()
    const custom: ChartAction[] = [
      { id: 'foo', label: 'Foo', icon: <span>F</span>, onClick },
      { id: 'bar', label: 'Bar', icon: <span>B</span>, onClick, hidden: true },
    ]
    const { container } = render(
      <AreaChart
        categories={['a']}
        series={[{ id: 's', label: 'S', values: [1] }]}
        actions={custom}
      />,
    )
    expect(container.querySelector('[data-sg-action="foo"]')).not.toBeNull()
    // hidden:true → not rendered.
    expect(container.querySelector('[data-sg-action="bar"]')).toBeNull()
  })

  it('custom action onClick receives ChartActionContext with svg', () => {
    let captured: { svg?: SVGSVGElement; fileName?: string } = {}
    const action: ChartAction = {
      id: 'capture',
      label: 'Capture',
      icon: <span>C</span>,
      onClick: (ctx) => {
        captured = { svg: ctx.svg, fileName: ctx.fileName }
      },
    }
    const { container } = render(
      <PieChart
        data={[{ id: 'a', label: 'A', value: 50 }]}
        actions={[action]}
        fileName="pie"
      />,
    )
    const btn = container.querySelector('[data-sg-action="capture"]') as HTMLButtonElement
    fireEvent.click(btn)
    expect(captured.svg?.tagName.toLowerCase()).toBe('svg')
    expect(captured.fileName).toBe('pie')
  })

  it('toolbar wrapper has pointer-events: none on wrapper, auto on buttons (CSS class)', () => {
    const { container } = render(
      <BarChart
        categories={['a']}
        series={[{ id: 's', label: 'S', values: [1] }]}
        actions
      />,
    )
    const toolbar = container.querySelector('.sg-chart-toolbar')
    const button = container.querySelector('.sg-chart-toolbar-button')
    expect(toolbar).not.toBeNull()
    expect(button).not.toBeNull()
  })
})

describe('Chart context menu', () => {
  let originalRO: typeof globalThis.ResizeObserver | undefined
  beforeEach(() => {
    originalRO = globalThis.ResizeObserver
    ;(globalThis as unknown as { ResizeObserver: typeof MockResizeObserver }).ResizeObserver =
      MockResizeObserver
  })
  afterEach(() => {
    if (originalRO) globalThis.ResizeObserver = originalRO
    else delete (globalThis as { ResizeObserver?: unknown }).ResizeObserver
    __ros.length = 0
  })

  it('without handlers: SVG has no onContextMenu (default browser menu allowed)', () => {
    const { container } = render(
      <LineChart
        categories={['a', 'b']}
        series={[{ id: 's', label: 'S', values: [1, 2] }]}
      />,
    )
    const svg = container.querySelector('svg')!
    // contextmenu prevented? — no handler, so React does not attach anything;
    // dispatch a contextmenu event and verify defaultPrevented stays false.
    const ev = new Event('contextmenu', { bubbles: true, cancelable: true })
    svg.dispatchEvent(ev)
    expect(ev.defaultPrevented).toBe(false)
  })

  it('LineChart: right-click on a marker fires onSeriesContextMenu with payload', () => {
    const onSeriesContextMenu = vi.fn()
    const { container } = render(
      <LineChart
        categories={['Mon', 'Tue', 'Wed']}
        series={[{ id: 'visits', label: 'Visits', values: [10, 20, 30] }]}
        onSeriesContextMenu={onSeriesContextMenu}
      />,
    )
    const marker = container.querySelectorAll('circle')[1]!
    fireEvent.contextMenu(marker)
    expect(onSeriesContextMenu).toHaveBeenCalledTimes(1)
    const payload = onSeriesContextMenu.mock.calls[0]![1]
    expect(payload.seriesId).toBe('visits')
    expect(payload.seriesIndex).toBe(0)
    expect(payload.valueIndex).toBe(1)
    expect(payload.value).toBe(20)
  })

  it('LineChart: right-click on a segment fires onSeriesContextMenu', () => {
    const onSeriesContextMenu = vi.fn()
    const { container } = render(
      <LineChart
        categories={['a', 'b', 'c']}
        series={[{ id: 's', label: 'S', values: [1, 2, 3] }]}
        markers={false}
        onSeriesContextMenu={onSeriesContextMenu}
      />,
    )
    const seg = container.querySelector('line')!
    fireEvent.contextMenu(seg)
    expect(onSeriesContextMenu).toHaveBeenCalled()
  })

  it('BarChart: right-click on a bar fires onSeriesContextMenu with category index', () => {
    const onSeriesContextMenu = vi.fn()
    const { container } = render(
      <BarChart
        categories={['Q1', 'Q2']}
        series={[{ id: 'rev', label: 'Revenue', values: [100, 200] }]}
        onSeriesContextMenu={onSeriesContextMenu}
      />,
    )
    const bar = container.querySelectorAll('rect')[1]!
    fireEvent.contextMenu(bar)
    const payload = onSeriesContextMenu.mock.calls[0]![1]
    expect(payload.seriesId).toBe('rev')
    expect(payload.seriesIndex).toBe(0)
    expect(payload.valueIndex).toBe(1)
    expect(payload.value).toBe(200)
  })

  it('PieChart: right-click on a slice fires onSeriesContextMenu', () => {
    const onSeriesContextMenu = vi.fn()
    const { container } = render(
      <PieChart
        data={[
          { id: 'a', label: 'A', value: 30 },
          { id: 'b', label: 'B', value: 70 },
        ]}
        onSeriesContextMenu={onSeriesContextMenu}
      />,
    )
    const slice = container.querySelectorAll('path')[1]!
    fireEvent.contextMenu(slice)
    const payload = onSeriesContextMenu.mock.calls[0]![1]
    expect(payload.seriesId).toBe('b')
    expect(payload.value).toBe(70)
  })

  it('AreaChart: right-click on area path fires onSeriesContextMenu', () => {
    const onSeriesContextMenu = vi.fn()
    const { container } = render(
      <AreaChart
        categories={['a', 'b']}
        series={[{ id: 's', label: 'S', values: [1, 2] }]}
        onSeriesContextMenu={onSeriesContextMenu}
      />,
    )
    const path = container.querySelector('path')!
    fireEvent.contextMenu(path)
    expect(onSeriesContextMenu).toHaveBeenCalled()
  })

  it('onChartContextMenu fires when right-clicking on the SVG plot', () => {
    const onChartContextMenu = vi.fn()
    const { container } = render(
      <LineChart
        categories={['a', 'b']}
        series={[{ id: 's', label: 'S', values: [1, 2] }]}
        onChartContextMenu={onChartContextMenu}
      />,
    )
    const svg = container.querySelector('svg')! as SVGSVGElement
    Object.defineProperty(svg, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, right: 600, bottom: 200, width: 600, height: 200, x: 0, y: 0, toJSON: () => '' }),
      configurable: true,
    })
    fireEvent.contextMenu(svg, { clientX: 150, clientY: 75 })
    expect(onChartContextMenu).toHaveBeenCalledTimes(1)
    const payload = onChartContextMenu.mock.calls[0]![1]
    expect(payload.x).toBe(150)
    expect(payload.y).toBe(75)
  })

  it('series context menu stops propagation: onChartContextMenu is NOT called', () => {
    const onChartContextMenu = vi.fn()
    const onSeriesContextMenu = vi.fn()
    const { container } = render(
      <LineChart
        categories={['a', 'b']}
        series={[{ id: 's', label: 'S', values: [1, 2] }]}
        onChartContextMenu={onChartContextMenu}
        onSeriesContextMenu={onSeriesContextMenu}
      />,
    )
    const marker = container.querySelector('circle')!
    fireEvent.contextMenu(marker)
    expect(onSeriesContextMenu).toHaveBeenCalled()
    expect(onChartContextMenu).not.toHaveBeenCalled()
  })

  it('series context menu calls preventDefault on the event', () => {
    const onSeriesContextMenu = vi.fn()
    const { container } = render(
      <LineChart
        categories={['a', 'b']}
        series={[{ id: 's', label: 'S', values: [1, 2] }]}
        onSeriesContextMenu={onSeriesContextMenu}
      />,
    )
    const marker = container.querySelector('circle')!
    const fired = fireEvent.contextMenu(marker)
    expect(fired).toBe(false)
  })
})

describe('Chart export utilities', () => {
  it('serializeSvg adds xmlns + width/height attributes', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    const xml = serializeSvg(svg, { width: 320, height: 200 })
    expect(xml).toContain('xmlns="http://www.w3.org/2000/svg"')
    expect(xml).toContain('width="320"')
    expect(xml).toContain('height="200"')
  })

  it('measureSvg falls back to viewBox attribute when getBoundingClientRect is empty', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement
    svg.setAttribute('viewBox', '0 0 480 360')
    Object.defineProperty(svg, 'getBoundingClientRect', {
      value: () => ({ width: 0, height: 0, left: 0, top: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON: () => '' }),
      configurable: true,
    })
    const size = measureSvg(svg)
    expect(size.width).toBe(480)
    expect(size.height).toBe(360)
  })
})

describe('colorForSeries / palette', () => {
  it('uses the explicit color when provided on the series', () => {
    const s: ChartSeries = { id: 'x', label: 'X', values: [1], color: '#ff0000' }
    expect(colorForSeries(s, 0)).toBe('#ff0000')
  })

  it('falls back to the default palette by index', () => {
    const s: ChartSeries = { id: 'x', label: 'X', values: [1] }
    expect(colorForSeries(s, 0)).toBe(DEFAULT_PALETTE[0])
    expect(colorForSeries(s, 3)).toBe(DEFAULT_PALETTE[3])
  })

  it('wraps around the palette for high indices', () => {
    const s: ChartSeries = { id: 'x', label: 'X', values: [1] }
    expect(colorForSeries(s, DEFAULT_PALETTE.length)).toBe(DEFAULT_PALETTE[0])
  })
})
