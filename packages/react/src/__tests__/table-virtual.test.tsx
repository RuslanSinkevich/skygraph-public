import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
// @ts-expect-error React is needed for JSX
import React from 'react'

import { Table } from '../components/complex/Table'
import { createVirtual, createMeasureCache } from '@skygraph/core'

/**
 * Тесты virtualization-режима таблицы с динамической высотой строк.
 *
 * Покрытие:
 *   • core: VirtualEngine + MeasureCache reuse в React-адаптере;
 *   • UI: рендер видимого диапазона, attr `data-sg-virtual-row-index`,
 *     spacer-блоки, поведение при отсутствии `ResizeObserver` (jsdom).
 */

const cols = [
  { key: 'name', title: 'Name' },
  { key: 'desc', title: 'Description' },
]

function generateRows(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `r${i}`,
    data: { name: `Row ${i}`, desc: i % 5 === 0 ? 'tall row '.repeat(20) : 'short' },
  }))
}

describe('Table virtual — fixed height (regression)', () => {
  it('renders only the visible window when virtual={true}', () => {
    // 1000 rows × 40px виртуально, видимое окно ~400px → < 100 строк в DOM.
    const data = generateRows(1000)
    const { container } = render(
      <Table
        columns={cols}
        data={data}
        showPagination={false}
        virtual
        scroll={{ y: 400 }}
      />,
    )
    const visibleRows = container.querySelectorAll('[data-sg-virtual-row-index]')
    expect(visibleRows.length).toBeLessThan(100)
    expect(visibleRows.length).toBeGreaterThan(0)
  })

  it('attaches data-sg-virtual-row-index starting from 0 at the top', () => {
    const data = generateRows(20)
    const { container } = render(
      <Table
        columns={cols}
        data={data}
        showPagination={false}
        virtual={{ rowHeight: 40 }}
      />,
    )
    const firstRow = container.querySelector(
      '[data-sg-virtual-row-index]',
    ) as HTMLElement | null
    expect(firstRow).not.toBeNull()
    expect(firstRow!.getAttribute('data-sg-virtual-row-index')).toBe('0')
  })

  it('passes through to TableBody (no virtualization) when virtual is omitted', () => {
    const data = generateRows(5)
    const { container } = render(
      <Table columns={cols} data={data} showPagination={false} />,
    )
    // Без virtual оффсета нет — атрибут не выставляется.
    const indexed = container.querySelectorAll('[data-sg-virtual-row-index]')
    expect(indexed.length).toBe(0)
  })
})

describe('Table virtual — dynamic height', () => {
  // Эмулируем разные высоты: каждая 5-я строка — 100px, остальные — 30px.
  // Без полноценного layout в jsdom мы патчим getBoundingClientRect на нужных
  // элементах, чтобы проверить, что движок принимает эти измерения.

  beforeEach(() => {
    // Мок-полифилл ResizeObserver: один observe → одиночный callback с
    // contentRect. Это даёт нам предсказуемые размеры в тестах.
    class MockResizeObserver {
      callback: ResizeObserverCallback
      targets: Element[] = []
      constructor(cb: ResizeObserverCallback) {
        this.callback = cb
      }
      observe(el: Element) {
        this.targets.push(el)
        // Сразу же эмитим entry — как если бы layout произошёл.
        const entry: ResizeObserverEntry = {
          target: el,
          contentRect: el.getBoundingClientRect() as DOMRectReadOnly,
          borderBoxSize: [],
          contentBoxSize: [],
          devicePixelContentBoxSize: [],
        }
        this.callback([entry], this as unknown as ResizeObserver)
      }
      unobserve() {}
      disconnect() {}
    }
    ;(globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
      MockResizeObserver as unknown as typeof ResizeObserver
  })

  afterEach(() => {
    delete (globalThis as unknown as { ResizeObserver?: typeof ResizeObserver })
      .ResizeObserver
  })

  it('accepts rowHeight as a function (estimate per row)', () => {
    const data = generateRows(50)
    const heightFn = vi.fn(
      (row: Record<string, unknown>) => (row.desc as string).length > 50 ? 100 : 30,
    )
    const { container } = render(
      <Table
        columns={cols}
        data={data}
        showPagination={false}
        virtual={{ rowHeight: heightFn, height: 400 }}
      />,
    )
    expect(heightFn).toHaveBeenCalled()
    const visibleRows = container.querySelectorAll('[data-sg-virtual-row-index]')
    expect(visibleRows.length).toBeGreaterThan(0)
  })

  it('accepts estimateRowHeight separately from rowHeight', () => {
    const data = generateRows(30)
    const estimate = vi.fn(() => 50)
    render(
      <Table
        columns={cols}
        data={data}
        showPagination={false}
        virtual={{ rowHeight: 40, estimateRowHeight: estimate, height: 300 }}
      />,
    )
    expect(estimate).toHaveBeenCalled()
  })

  it('survives empty data without throwing', () => {
    expect(() =>
      render(
        <Table
          columns={cols}
          data={[]}
          showPagination={false}
          virtual={{ rowHeight: (_r) => 40 }}
        />,
      ),
    ).not.toThrow()
  })
})

describe('VirtualEngine — измерение через MeasureCache', () => {
  it('создаёт engine со стартовым эстимейтом и переходит на измерения', () => {
    const v = createVirtual({ itemCount: 5, itemHeight: 30 })
    expect(v.totalHeight).toBe(150)
    v.setMeasuredHeight(0, 100)
    v.setMeasuredHeight(1, 80)
    expect(v.totalHeight).toBe(100 + 80 + 30 + 30 + 30)
  })

  it('subscribe → callback после измерения', () => {
    const v = createVirtual({ itemCount: 4, itemHeight: 30 })
    const listener = vi.fn()
    v.subscribe(listener)
    v.setMeasuredHeight(0, 50)
    expect(listener).toHaveBeenCalledWith('measure')
  })

  it('createMeasureCache самостоятельно: записать → прочитать высоту', () => {
    const cache = createMeasureCache({ itemCount: 3, estimate: 25 })
    expect(cache.getItemSize(0)).toBe(25)
    cache.setMeasuredHeight(1, 80)
    expect(cache.getItemSize(1)).toBe(80)
    expect(cache.getTotalHeight()).toBe(25 + 80 + 25)
  })

  it('VirtualTableBody принимает scrollContainer без ResizeObserver', () => {
    // Нет полифилла → scrollRef listener должен молча работать.
    const data = generateRows(20)
    expect(() =>
      render(
        <Table
          columns={cols}
          data={data}
          showPagination={false}
          virtual={{ rowHeight: (_r) => 40, height: 300 }}
        />,
      ),
    ).not.toThrow()
  })
})
