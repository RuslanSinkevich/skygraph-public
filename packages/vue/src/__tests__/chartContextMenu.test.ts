import { describe, it, expect, vi } from 'vitest'
import {
  makeChartContextMenuHandler,
  makeSeriesContextMenuHandler,
} from '../components/complex/Charts/contextMenu'

describe('chart context-menu factory (parity with React)', () => {
  describe('makeSeriesContextMenuHandler', () => {
    it('returns undefined when no handler is supplied', () => {
      expect(
        makeSeriesContextMenuHandler(undefined, {
          seriesId: 'a',
          seriesIndex: 0,
        }),
      ).toBeUndefined()
    })

    it('calls preventDefault, stopPropagation and forwards the payload', () => {
      const spy = vi.fn()
      const handler = makeSeriesContextMenuHandler(spy, {
        seriesId: 'orders',
        seriesIndex: 2,
        valueIndex: 5,
        value: 42,
      })!
      const event = new MouseEvent('contextmenu')
      const prevent = vi.spyOn(event, 'preventDefault')
      const stop = vi.spyOn(event, 'stopPropagation')
      handler(event)
      expect(prevent).toHaveBeenCalled()
      expect(stop).toHaveBeenCalled()
      expect(spy).toHaveBeenCalledWith(event, {
        seriesId: 'orders',
        seriesIndex: 2,
        valueIndex: 5,
        value: 42,
      })
    })
  })

  describe('makeChartContextMenuHandler', () => {
    it('returns undefined when no handler is supplied', () => {
      expect(makeChartContextMenuHandler(undefined)).toBeUndefined()
    })

    it('translates the click into SVG user-space using the viewBox', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement
      svg.setAttribute('viewBox', '0 0 600 400')
      // Mock getBoundingClientRect — jsdom returns a zero rect by default.
      vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        right: 300,
        bottom: 200,
        width: 300,
        height: 200,
        toJSON: () => ({}),
      } as DOMRect)
      // jsdom doesn't implement `SVGSVGElement.viewBox.baseVal` reliably —
      // stub it explicitly so the parity branch is exercised.
      Object.defineProperty(svg, 'viewBox', {
        configurable: true,
        get: () => ({ baseVal: { x: 0, y: 0, width: 600, height: 400 } }),
      })

      const spy = vi.fn()
      const handler = makeChartContextMenuHandler(spy)!
      const event = new MouseEvent('contextmenu', { clientX: 150, clientY: 100 })
      Object.defineProperty(event, 'currentTarget', { value: svg })
      const prevent = vi.spyOn(event, 'preventDefault')
      handler(event)
      expect(prevent).toHaveBeenCalled()
      expect(spy).toHaveBeenCalledTimes(1)
      const payload = spy.mock.calls[0][1]
      expect(payload.x).toBe(150)
      expect(payload.y).toBe(100)
      // 150 / 300 * 600 = 300 ; 100 / 200 * 400 = 200
      expect(payload.plotX).toBe(300)
      expect(payload.plotY).toBe(200)
    })

    it('falls back to CSS pixels when no viewBox is set (parity branch)', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement
      vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        right: 200,
        bottom: 100,
        width: 200,
        height: 100,
        toJSON: () => ({}),
      } as DOMRect)
      Object.defineProperty(svg, 'viewBox', {
        configurable: true,
        get: () => ({ baseVal: { x: 0, y: 0, width: 0, height: 0 } }),
      })

      const spy = vi.fn()
      const handler = makeChartContextMenuHandler(spy)!
      const event = new MouseEvent('contextmenu', { clientX: 40, clientY: 30 })
      Object.defineProperty(event, 'currentTarget', { value: svg })
      handler(event)
      const payload = spy.mock.calls[0][1]
      expect(payload.plotX).toBe(40)
      expect(payload.plotY).toBe(30)
    })
  })
})
