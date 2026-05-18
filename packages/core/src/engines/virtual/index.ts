import { createMeasureCache, type MeasureCache } from './measure'

export type {
  MeasureCache,
  MeasureCacheEvent,
  MeasureCacheListener,
  MeasureCacheOptions,
} from './measure'
export { createMeasureCache } from './measure'

export interface VirtualRange {
  startIndex: number
  endIndex: number
  offsetTop: number
  totalHeight: number
  visibleItems: VirtualItem[]
}

export interface VirtualItem {
  index: number
  offsetTop: number
  height: number
}

/** Событие инвалидации, эмитимое VirtualEngine подписчикам. */
export type VirtualEngineEvent = 'measure' | 'reset' | 'resize'
export type VirtualEngineListener = (event: VirtualEngineEvent) => void

export interface VirtualEngineOptions {
  itemCount: number
  itemHeight: number | ((index: number) => number)
  overscan?: number
}

export interface VirtualEngine {
  readonly itemCount: number
  readonly totalHeight: number
  /** Сколько строк прошли через `setMeasuredHeight`. */
  readonly measuredCount: number

  setItemCount(count: number): void
  setItemHeight(height: number | ((index: number) => number)): void

  /**
   * Записать реально измеренную (через ResizeObserver) высоту строки.
   * Возвращает `true`, если значение изменилось — полезно для контроля
   * количества `setState` в адаптере.
   */
  setMeasuredHeight(index: number, height: number): boolean
  /** Сбросить измерение для одной строки (высота вернётся к эстимейту). */
  clearMeasuredHeight(index: number): boolean
  /** Сбросить все измерения (например, при resize контейнера / смене темы). */
  resetMeasurements(): void
  /** Был ли индекс уже измерён. */
  hasMeasured(index: number): boolean
  /** Эстимейт высоты строки без учёта измерений. */
  getEstimatedSize(index: number): number
  /** Эффективная высота строки — измерение, если есть, иначе эстимейт. */
  getItemSize(index: number): number

  getRange(scrollTop: number, viewportHeight: number): VirtualRange
  getItemOffset(index: number): number
  getItemAtOffset(offset: number): number
  scrollToIndex(
    index: number,
    viewportHeight: number,
    align?: 'start' | 'center' | 'end',
  ): number

  /**
   * Подписаться на инвалидации (resize / measure / reset). Вызывается
   * только после реального изменения — повторные `setMeasuredHeight`
   * с тем же значением событие не эмитят.
   */
  subscribe(listener: VirtualEngineListener): () => void
}

export function createVirtual(options: VirtualEngineOptions): VirtualEngine {
  let itemCount = options.itemCount
  let itemHeight = options.itemHeight
  const overscan = options.overscan ?? 5

  // Кэш создаётся лениво — для чисто фиксированной высоты без измерений
  // нам он не нужен, и мы сохраняем O(1) арифметику для миллионов строк.
  let cache: MeasureCache | null = null
  const listeners = new Set<VirtualEngineListener>()

  const ensureCache = (): MeasureCache => {
    if (cache) return cache
    cache = createMeasureCache({ itemCount, estimate: itemHeight })
    cache.subscribe((event) => {
      for (const l of listeners) l(event)
    })
    return cache
  }

  const isFastPath = (): boolean =>
    typeof itemHeight === 'number' && (cache === null || cache.measuredCount === 0)

  const getEstimate = (index: number): number =>
    typeof itemHeight === 'number' ? itemHeight : itemHeight(index)

  const getItemSize = (index: number): number => {
    if (cache) return cache.getItemSize(index)
    return getEstimate(index)
  }

  const getTotalHeight = (): number => {
    if (isFastPath()) return itemCount * (itemHeight as number)
    return ensureCache().getTotalHeight()
  }

  const getItemOffset = (index: number): number => {
    if (index <= 0) return 0
    if (index >= itemCount) return getTotalHeight()
    if (isFastPath()) return index * (itemHeight as number)
    return ensureCache().getItemOffset(index)
  }

  const getItemAtOffset = (offset: number): number => {
    if (itemCount === 0) return 0
    if (isFastPath()) {
      const h = itemHeight as number
      return Math.min(Math.floor(offset / h), itemCount - 1)
    }
    return ensureCache().getItemAtOffset(offset)
  }

  const getRange = (scrollTop: number, viewportHeight: number): VirtualRange => {
    if (itemCount === 0) {
      return { startIndex: 0, endIndex: 0, offsetTop: 0, totalHeight: 0, visibleItems: [] }
    }

    const total = getTotalHeight()
    const rawStart = getItemAtOffset(scrollTop)
    const startIndex = Math.max(0, rawStart - overscan)

    let endIndex = rawStart
    let accHeight = getItemOffset(rawStart) + getItemSize(rawStart)
    const bottomEdge = scrollTop + viewportHeight

    while (endIndex < itemCount - 1 && accHeight < bottomEdge) {
      endIndex++
      accHeight += getItemSize(endIndex)
    }
    endIndex = Math.min(itemCount - 1, endIndex + overscan)

    const visibleItems: VirtualItem[] = []
    for (let i = startIndex; i <= endIndex; i++) {
      visibleItems.push({
        index: i,
        offsetTop: getItemOffset(i),
        height: getItemSize(i),
      })
    }

    return {
      startIndex,
      endIndex,
      offsetTop: getItemOffset(startIndex),
      totalHeight: total,
      visibleItems,
    }
  }

  const scrollToIndex = (
    index: number,
    viewportHeight: number,
    align: 'start' | 'center' | 'end' = 'start',
  ): number => {
    const clamped = Math.max(0, Math.min(index, itemCount - 1))
    const offset = getItemOffset(clamped)
    const h = getItemSize(clamped)

    switch (align) {
      case 'center':
        return Math.max(0, offset - viewportHeight / 2 + h / 2)
      case 'end':
        return Math.max(0, offset - viewportHeight + h)
      default:
        return offset
    }
  }

  const emit = (event: VirtualEngineEvent) => {
    for (const l of listeners) l(event)
  }

  return {
    get itemCount() {
      return itemCount
    },
    get totalHeight() {
      return getTotalHeight()
    },
    get measuredCount() {
      return cache?.measuredCount ?? 0
    },

    setItemCount(count: number) {
      if (count === itemCount) return
      itemCount = count
      if (cache) {
        cache.setItemCount(count)
      } else {
        emit('resize')
      }
    },

    setItemHeight(height: number | ((index: number) => number)) {
      itemHeight = height
      if (cache) {
        cache.setEstimate(height)
      } else {
        emit('reset')
      }
    },

    setMeasuredHeight(index: number, height: number) {
      return ensureCache().setMeasuredHeight(index, height)
    },

    clearMeasuredHeight(index: number) {
      if (!cache) return false
      return cache.clearMeasured(index)
    },

    resetMeasurements() {
      if (cache) cache.reset()
    },

    hasMeasured(index: number) {
      return cache ? cache.hasMeasured(index) : false
    },

    getEstimatedSize: getEstimate,
    getItemSize,

    getRange,
    getItemOffset,
    getItemAtOffset,
    scrollToIndex,

    subscribe(listener: VirtualEngineListener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
