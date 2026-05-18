import { describe, it, expect, vi } from 'vitest'
import { createVirtual, createMeasureCache } from '../engines/virtual/index'

describe('VirtualEngine', () => {
  describe('fixed height', () => {
    it('calculates total height', () => {
      const v = createVirtual({ itemCount: 100, itemHeight: 40 })
      expect(v.totalHeight).toBe(4000)
    })

    it('returns correct range for top of list', () => {
      const v = createVirtual({ itemCount: 1000, itemHeight: 40, overscan: 3 })
      const range = v.getRange(0, 400)

      expect(range.startIndex).toBe(0)
      expect(range.endIndex).toBe(12)
      expect(range.totalHeight).toBe(40000)
      expect(range.visibleItems.length).toBe(13)
    })

    it('returns correct range for middle of list', () => {
      const v = createVirtual({ itemCount: 1000, itemHeight: 40, overscan: 2 })
      const range = v.getRange(2000, 400)

      expect(range.startIndex).toBe(48)
      expect(range.endIndex).toBe(61)
    })

    it('returns correct range for bottom of list', () => {
      const v = createVirtual({ itemCount: 100, itemHeight: 40, overscan: 2 })
      const range = v.getRange(3600, 400)

      expect(range.endIndex).toBe(99)
    })

    it('handles empty list', () => {
      const v = createVirtual({ itemCount: 0, itemHeight: 40 })
      const range = v.getRange(0, 400)

      expect(range.startIndex).toBe(0)
      expect(range.endIndex).toBe(0)
      expect(range.visibleItems).toHaveLength(0)
      expect(range.totalHeight).toBe(0)
    })

    it('getItemOffset returns correct offset', () => {
      const v = createVirtual({ itemCount: 100, itemHeight: 50 })
      expect(v.getItemOffset(0)).toBe(0)
      expect(v.getItemOffset(10)).toBe(500)
    })

    it('getItemAtOffset finds correct index', () => {
      const v = createVirtual({ itemCount: 100, itemHeight: 50 })
      expect(v.getItemAtOffset(0)).toBe(0)
      expect(v.getItemAtOffset(250)).toBe(5)
      expect(v.getItemAtOffset(275)).toBe(5)
    })
  })

  describe('variable height', () => {
    const heights = [20, 40, 60, 30, 50, 25, 35, 45, 55, 65]

    it('calculates total height', () => {
      const v = createVirtual({
        itemCount: heights.length,
        itemHeight: (i) => heights[i],
      })
      expect(v.totalHeight).toBe(425)
    })

    it('returns correct item offsets', () => {
      const v = createVirtual({
        itemCount: heights.length,
        itemHeight: (i) => heights[i],
      })
      expect(v.getItemOffset(0)).toBe(0)
      expect(v.getItemOffset(1)).toBe(20)
      expect(v.getItemOffset(2)).toBe(60)
      expect(v.getItemOffset(3)).toBe(120)
    })

    it('getItemAtOffset with variable heights', () => {
      const v = createVirtual({
        itemCount: heights.length,
        itemHeight: (i) => heights[i],
      })
      expect(v.getItemAtOffset(0)).toBe(0)
      expect(v.getItemAtOffset(20)).toBe(1)
      expect(v.getItemAtOffset(59)).toBe(1)
      expect(v.getItemAtOffset(60)).toBe(2)
    })

    it('range with variable heights', () => {
      const v = createVirtual({
        itemCount: heights.length,
        itemHeight: (i) => heights[i],
        overscan: 1,
      })
      const range = v.getRange(60, 100)

      expect(range.startIndex).toBe(1)
      expect(range.visibleItems[0].index).toBeLessThanOrEqual(2)
    })
  })

  describe('scrollToIndex', () => {
    it('scrolls to start', () => {
      const v = createVirtual({ itemCount: 100, itemHeight: 40 })
      expect(v.scrollToIndex(25, 400, 'start')).toBe(1000)
    })

    it('scrolls to center', () => {
      const v = createVirtual({ itemCount: 100, itemHeight: 40 })
      const st = v.scrollToIndex(25, 400, 'center')
      expect(st).toBe(1000 - 200 + 20)
    })

    it('scrolls to end', () => {
      const v = createVirtual({ itemCount: 100, itemHeight: 40 })
      const st = v.scrollToIndex(25, 400, 'end')
      expect(st).toBe(1000 - 400 + 40)
    })

    it('clamps to 0 for small index', () => {
      const v = createVirtual({ itemCount: 100, itemHeight: 40 })
      expect(v.scrollToIndex(0, 400, 'end')).toBe(0)
    })
  })

  describe('dynamic updates', () => {
    it('setItemCount updates total', () => {
      const v = createVirtual({ itemCount: 50, itemHeight: 40 })
      expect(v.totalHeight).toBe(2000)

      v.setItemCount(100)
      expect(v.totalHeight).toBe(4000)
      expect(v.itemCount).toBe(100)
    })

    it('setItemHeight updates calculations', () => {
      const v = createVirtual({ itemCount: 10, itemHeight: 40 })
      expect(v.totalHeight).toBe(400)

      v.setItemHeight(60)
      expect(v.totalHeight).toBe(600)
    })
  })

  describe('performance', () => {
    it('handles 1M items with fixed height', () => {
      const v = createVirtual({ itemCount: 1_000_000, itemHeight: 30 })

      const start = performance.now()
      const range = v.getRange(15_000_000, 600)
      const elapsed = performance.now() - start

      expect(elapsed).toBeLessThan(5)
      expect(range.visibleItems.length).toBeGreaterThan(0)
      expect(range.totalHeight).toBe(30_000_000)
    })
  })

  describe('dynamic measured heights', () => {
    it('setMeasuredHeight overrides estimate for the row', () => {
      const v = createVirtual({ itemCount: 5, itemHeight: 40 })
      expect(v.getItemSize(2)).toBe(40)

      v.setMeasuredHeight(2, 100)
      expect(v.getItemSize(2)).toBe(100)
      expect(v.measuredCount).toBe(1)
      expect(v.hasMeasured(2)).toBe(true)
      expect(v.hasMeasured(0)).toBe(false)
    })

    it('totalHeight reflects measured rows over the estimate', () => {
      const v = createVirtual({ itemCount: 4, itemHeight: 30 })
      expect(v.totalHeight).toBe(120)

      v.setMeasuredHeight(0, 60)
      v.setMeasuredHeight(1, 50)
      // 60 + 50 + 30 + 30 = 170
      expect(v.totalHeight).toBe(170)
    })

    it('getItemOffset uses measured heights as a prefix sum', () => {
      const v = createVirtual({ itemCount: 4, itemHeight: 30 })
      v.setMeasuredHeight(0, 60)
      v.setMeasuredHeight(1, 20)

      expect(v.getItemOffset(0)).toBe(0)
      expect(v.getItemOffset(1)).toBe(60)
      expect(v.getItemOffset(2)).toBe(80)
      expect(v.getItemOffset(3)).toBe(110)
    })

    it('getRange honours measured heights when picking visible items', () => {
      const v = createVirtual({ itemCount: 10, itemHeight: 40, overscan: 0 })
      v.setMeasuredHeight(0, 200) // big first row pushes everything down

      const range = v.getRange(0, 240)
      expect(range.startIndex).toBe(0)
      // 0..1 (row 1 estimate is 40) — both fit in 240px viewport.
      expect(range.endIndex).toBe(1)
      expect(range.visibleItems[0]!.height).toBe(200)
    })

    it('clearMeasuredHeight reverts to the estimate', () => {
      const v = createVirtual({ itemCount: 3, itemHeight: 25 })
      v.setMeasuredHeight(1, 80)
      expect(v.getItemSize(1)).toBe(80)
      v.clearMeasuredHeight(1)
      expect(v.getItemSize(1)).toBe(25)
      expect(v.hasMeasured(1)).toBe(false)
    })

    it('resetMeasurements drops every measured row', () => {
      const v = createVirtual({ itemCount: 5, itemHeight: 40 })
      v.setMeasuredHeight(0, 100)
      v.setMeasuredHeight(2, 200)
      expect(v.measuredCount).toBe(2)

      v.resetMeasurements()
      expect(v.measuredCount).toBe(0)
      expect(v.totalHeight).toBe(200)
    })

    it('subscribe fires on measure / resize / reset events only', () => {
      const v = createVirtual({ itemCount: 4, itemHeight: 30 })
      const events: string[] = []
      const unsub = v.subscribe((e) => events.push(e))

      v.setMeasuredHeight(0, 50)
      v.setMeasuredHeight(0, 50) // same value — no event
      v.setItemCount(5)
      v.setItemHeight(35)
      v.resetMeasurements()
      unsub()
      v.setMeasuredHeight(1, 90) // ignored after unsubscribe

      expect(events).toEqual(['measure', 'resize', 'reset', 'reset'])
    })

    it('returns false from setMeasuredHeight on no-op writes', () => {
      const v = createVirtual({ itemCount: 3, itemHeight: 30 })
      expect(v.setMeasuredHeight(0, 50)).toBe(true)
      expect(v.setMeasuredHeight(0, 50)).toBe(false)
      expect(v.setMeasuredHeight(0, NaN)).toBe(false)
      expect(v.setMeasuredHeight(99, 50)).toBe(false) // out of range
    })

    it('getEstimatedSize keeps the original size after a measurement', () => {
      const v = createVirtual({
        itemCount: 4,
        itemHeight: (i) => 20 + i * 10,
      })
      v.setMeasuredHeight(2, 999)
      expect(v.getItemSize(2)).toBe(999)
      expect(v.getEstimatedSize(2)).toBe(40)
    })

    it('setItemCount drops measurements that no longer exist', () => {
      const v = createVirtual({ itemCount: 5, itemHeight: 30 })
      v.setMeasuredHeight(3, 100)
      v.setMeasuredHeight(4, 200)
      v.setItemCount(3)
      expect(v.measuredCount).toBe(0)
      expect(v.totalHeight).toBe(90)
    })
  })

  describe('createMeasureCache', () => {
    it('emits no event on equal-value writes', () => {
      const cache = createMeasureCache({ itemCount: 3, estimate: 30 })
      const listener = vi.fn()
      cache.subscribe(listener)

      cache.setMeasuredHeight(0, 50)
      cache.setMeasuredHeight(0, 50)
      expect(listener).toHaveBeenCalledTimes(1)
      expect(listener).toHaveBeenCalledWith('measure')
    })
  })
})
