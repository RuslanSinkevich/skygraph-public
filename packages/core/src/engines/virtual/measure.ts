/**
 * Кэш измерений высоты для VirtualEngine с динамической высотой строк.
 *
 * Хранит реальные измеренные высоты `Map<index, number>` поверх эстимейта.
 * Префикс-сумма (offsets) пересобирается лениво при первом запросе после
 * любой инвалидации (resize / measure / reset). Подписки нужны React-адаптеру,
 * чтобы перерисоваться, когда измерение строки изменилось.
 */

export type MeasureCacheEvent = 'measure' | 'reset' | 'resize'
export type MeasureCacheListener = (event: MeasureCacheEvent) => void

export interface MeasureCacheOptions {
  itemCount: number
  estimate: number | ((index: number) => number)
}

export interface MeasureCache {
  readonly itemCount: number
  /** Сколько строк уже было измерено. */
  readonly measuredCount: number

  setItemCount(count: number): void
  setEstimate(estimate: number | ((index: number) => number)): void

  /** Записать измеренную высоту. Возвращает `true`, если значение изменилось. */
  setMeasuredHeight(index: number, height: number): boolean
  /** Сбросить измерение для одной строки. */
  clearMeasured(index: number): boolean
  /** Сбросить все измерения. */
  reset(): void

  hasMeasured(index: number): boolean
  getMeasuredHeight(index: number): number | undefined

  /** Эстимейт высоты — без учёта измерений. */
  getEstimatedSize(index: number): number
  /** Эффективная высота строки (измерение или эстимейт). */
  getItemSize(index: number): number

  getItemOffset(index: number): number
  getItemAtOffset(offset: number): number
  getTotalHeight(): number

  subscribe(listener: MeasureCacheListener): () => void
}

export function createMeasureCache(options: MeasureCacheOptions): MeasureCache {
  let itemCount = options.itemCount
  let estimate = options.estimate
  const measured = new Map<number, number>()
  let offsets: number[] | null = null
  let cachedTotal = 0
  const listeners = new Set<MeasureCacheListener>()

  const getEstimate = (index: number): number =>
    typeof estimate === 'number' ? estimate : estimate(index)

  const getItemSize = (index: number): number => {
    const m = measured.get(index)
    return m !== undefined ? m : getEstimate(index)
  }

  const rebuildOffsets = () => {
    if (offsets && offsets.length === itemCount) return
    const arr = new Array<number>(itemCount)
    let acc = 0
    for (let i = 0; i < itemCount; i++) {
      arr[i] = acc
      acc += getItemSize(i)
    }
    offsets = arr
    cachedTotal = acc
  }

  const getTotalHeight = (): number => {
    rebuildOffsets()
    return cachedTotal
  }

  const getItemOffset = (index: number): number => {
    if (index <= 0) return 0
    if (index >= itemCount) return getTotalHeight()
    rebuildOffsets()
    return offsets![index]!
  }

  const getItemAtOffset = (offset: number): number => {
    if (itemCount === 0) return 0
    rebuildOffsets()
    let lo = 0
    let hi = itemCount - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >>> 1
      if (offsets![mid]! <= offset) lo = mid
      else hi = mid - 1
    }
    return lo
  }

  const invalidate = (event: MeasureCacheEvent) => {
    offsets = null
    for (const l of listeners) l(event)
  }

  return {
    get itemCount() {
      return itemCount
    },
    get measuredCount() {
      return measured.size
    },

    setItemCount(count: number) {
      if (count === itemCount) return
      if (count < itemCount && measured.size > 0) {
        for (const k of [...measured.keys()]) {
          if (k >= count) measured.delete(k)
        }
      }
      itemCount = count
      invalidate('resize')
    },

    setEstimate(e: number | ((index: number) => number)) {
      estimate = e
      invalidate('reset')
    },

    setMeasuredHeight(index: number, height: number): boolean {
      if (index < 0 || index >= itemCount) return false
      if (!Number.isFinite(height) || height < 0) return false
      const prev = measured.get(index)
      if (prev === height) return false
      measured.set(index, height)
      invalidate('measure')
      return true
    },

    clearMeasured(index: number): boolean {
      const had = measured.delete(index)
      if (had) invalidate('measure')
      return had
    },

    reset() {
      if (measured.size === 0) return
      measured.clear()
      invalidate('reset')
    },

    hasMeasured(index: number) {
      return measured.has(index)
    },
    getMeasuredHeight(index: number) {
      return measured.get(index)
    },

    getEstimatedSize: getEstimate,
    getItemSize,
    getItemOffset,
    getItemAtOffset,
    getTotalHeight,

    subscribe(listener: MeasureCacheListener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
