import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { createRef, useEffect, useRef } from 'react'
import fs from 'node:fs'
import path from 'node:path'

import {
  printElement,
  buildPrintHtml,
  buildPageRule,
  Table,
  Diagram,
  LineChart,
  BarChart,
  AreaChart,
  PieChart,
  useGraph,
} from '../index'
import type {
  TableRef,
  TableColumn,
  DiagramRef,
  ChartRef,
} from '../index'

/**
 * Стаб для `window.open` — возвращает headless-документ с тем же набором
 * методов, что использует `printElement` (`document.open/write/close`,
 * `print`, `close`, `focus`, `addEventListener`).
 */
function stubOpen() {
  const calls = {
    open: 0,
    write: 0,
    close: 0,
    print: 0,
    focus: 0,
  }
  let writtenHtml = ''
  const popup: Partial<Window> & { __calls?: typeof calls; __html?: () => string } = {
    document: {
      open: () => {
        calls.open++
      },
      write: (s: string) => {
        calls.write++
        writtenHtml += s
      },
      close: () => {
        calls.close++
      },
      readyState: 'complete',
    } as unknown as Document,
    focus: () => {
      calls.focus++
    },
    print: () => {
      calls.print++
    },
    close: () => {
      // popup.close — стаб
    },
    addEventListener: () => {
      // load — игнорируем; setTimeout(trigger, 300) сработает
    },
  }
  popup.__calls = calls
  popup.__html = () => writtenHtml
  return popup as Window & { __calls: typeof calls; __html: () => string }
}

describe('buildPageRule', () => {
  it('uses A4 portrait + 1cm margins by default', () => {
    expect(buildPageRule()).toBe('@page { size: A4 portrait; margin: 1cm; }')
  })

  it('respects orientation / pageSize / margins overrides', () => {
    const css = buildPageRule({
      orientation: 'landscape',
      pageSize: 'Letter',
      margins: '10mm 20mm',
    })
    expect(css).toBe('@page { size: Letter landscape; margin: 10mm 20mm; }')
  })
})

describe('buildPrintHtml', () => {
  it('embeds the fragment, page rule and title', () => {
    const html = buildPrintHtml('<div data-fragment>hello</div>', {
      fileName: 'my-report',
      orientation: 'landscape',
    })
    expect(html).toContain('<title>my-report</title>')
    expect(html).toContain('@page { size: A4 landscape; margin: 1cm; }')
    expect(html).toContain('data-fragment')
    expect(html).toContain('class="sg-print-root"')
  })

  it('escapes HTML-special characters in fileName', () => {
    const html = buildPrintHtml('<x/>', { fileName: '<script>x</script>' })
    expect(html).toContain('<title>&lt;script&gt;x&lt;/script&gt;</title>')
    expect(html).not.toContain('<title><script>')
  })

  it('applies transform: scale(...) when scale != 1', () => {
    const html = buildPrintHtml('<x/>', { scale: 0.75 })
    expect(html).toMatch(/transform: scale\(0\.75\)/)
  })

  it('appends customStyles after the base reset', () => {
    const html = buildPrintHtml('<x/>', { customStyles: '.user-rule { color: red; }' })
    expect(html).toContain('.user-rule { color: red; }')
  })
})

describe('printElement', () => {
  let originalOpen: typeof window.open

  beforeEach(() => {
    originalOpen = window.open
  })

  afterEach(() => {
    window.open = originalOpen
  })

  it('returns null when node is null', () => {
    const fn = vi.fn().mockReturnValue(stubOpen())
    window.open = fn as unknown as typeof window.open
    expect(printElement(null)).toBeNull()
    expect(fn).not.toHaveBeenCalled()
  })

  it('opens popup, writes HTML and triggers print', () => {
    const popup = stubOpen()
    window.open = vi.fn().mockReturnValue(popup) as unknown as typeof window.open

    const node = document.createElement('div')
    node.className = 'sg-target'
    node.innerHTML = '<span>hi</span>'
    document.body.appendChild(node)

    printElement(node, { fileName: 'unit', skipPrint: true })

    expect(popup.__calls.write).toBe(1)
    expect(popup.__calls.close).toBe(1)
    expect(popup.__html()).toContain('sg-target')
    // skipPrint=true — print() не должен вызваться синхронно
    expect(popup.__calls.print).toBe(0)
  })

  it('returns null if popup is blocked', () => {
    window.open = vi.fn().mockReturnValue(null) as unknown as typeof window.open
    const node = document.createElement('div')
    expect(printElement(node)).toBeNull()
  })
})

describe('@media print snapshot — print.css', () => {
  const cssPath = path.resolve(__dirname, '../../../styles/print.css')
  const css = fs.readFileSync(cssPath, 'utf8')

  it('hides .sg-no-print elements', () => {
    expect(css).toMatch(/\.sg-no-print\s*{[^}]*display:\s*none/)
  })

  it('forces page-break for [data-sg-page-break]', () => {
    expect(css).toMatch(/\[data-sg-page-break\][^{]*{[^}]*page-break-after:\s*always/)
  })

  it('expands scroll containers (table / diagram / chart wrapper)', () => {
    expect(css).toMatch(/\.sg-table-scroll[\s\S]*overflow:\s*visible/)
    expect(css).toMatch(/\.sg-diagram[\s\S]*overflow:\s*visible/)
  })

  it('disables transform on .sg-diagram-canvas', () => {
    expect(css).toMatch(/\.sg-diagram-canvas[^{]*{[^}]*transform:\s*none/)
  })

  it('hides chart crosshair / brush overlay during print', () => {
    expect(css).toMatch(/\.sg-chart-crosshair[\s\S]*display:\s*none/)
  })
})

describe('Component ref.print() integration', () => {
  let originalOpen: typeof window.open
  let popup: ReturnType<typeof stubOpen>

  beforeEach(() => {
    originalOpen = window.open
    popup = stubOpen()
    window.open = vi.fn().mockReturnValue(popup) as unknown as typeof window.open
  })

  afterEach(() => {
    window.open = originalOpen
  })

  it('Table forwardRef exposes print()', () => {
    const ref = createRef<TableRef>()
    const cols: TableColumn[] = [{ key: 'a', title: 'A' }]
    render(
      <Table
        ref={ref}
        columns={cols}
        data={[{ id: 'r1', data: { a: 'x' } }]}
        showPagination={false}
      />,
    )
    expect(ref.current).not.toBeNull()
    expect(typeof ref.current!.print).toBe('function')
    ref.current!.print({ skipPrint: true, fileName: 'tbl' })
    expect(popup.__calls.write).toBe(1)
    expect(popup.__html()).toContain('<title>tbl</title>')
  })

  it('Diagram forwardRef exposes print() and uses prop fileName by default', () => {
    function Harness() {
      const { graph, state } = useGraph()
      const ref = useRef<DiagramRef>(null)
      useEffect(() => {
        graph.addNode({
          id: 'A',
          transform: { x: 0, y: 0 },
          outline: { kind: 'rect', w: 50, h: 30 },
        })
      }, [graph])
      useEffect(() => {
        ref.current?.print({ skipPrint: true })
      })
      return (
        <Diagram
          ref={ref}
          graph={graph}
          state={state}
          width={200}
          height={120}
          printable={{ fileName: 'workflow' }}
        />
      )
    }
    render(<Harness />)
    expect(popup.__calls.write).toBeGreaterThanOrEqual(1)
    expect(popup.__html()).toContain('<title>workflow</title>')
  })

  it('LineChart / BarChart / AreaChart / PieChart all expose ChartRef.print()', () => {
    const lineRef = createRef<ChartRef>()
    const barRef = createRef<ChartRef>()
    const areaRef = createRef<ChartRef>()
    const pieRef = createRef<ChartRef>()

    render(
      <div>
        <LineChart
          ref={lineRef}
          categories={['a', 'b']}
          series={[{ id: 's', label: 'S', values: [1, 2] }]}
        />
        <BarChart
          ref={barRef}
          categories={['a', 'b']}
          series={[{ id: 's', label: 'S', values: [1, 2] }]}
        />
        <AreaChart
          ref={areaRef}
          categories={['a', 'b']}
          series={[{ id: 's', label: 'S', values: [1, 2] }]}
        />
        <PieChart
          ref={pieRef}
          data={[{ id: 'a', label: 'A', value: 1 }]}
        />
      </div>,
    )

    expect(typeof lineRef.current?.print).toBe('function')
    expect(typeof barRef.current?.print).toBe('function')
    expect(typeof areaRef.current?.print).toBe('function')
    expect(typeof pieRef.current?.print).toBe('function')

    lineRef.current!.print({ skipPrint: true, fileName: 'L' })
    barRef.current!.print({ skipPrint: true, fileName: 'B' })
    areaRef.current!.print({ skipPrint: true, fileName: 'A' })
    pieRef.current!.print({ skipPrint: true, fileName: 'P' })

    // Каждый ref-вызов открывает popup → как минимум 4 раза.
    expect(popup.__calls.write).toBeGreaterThanOrEqual(4)
  })
})
