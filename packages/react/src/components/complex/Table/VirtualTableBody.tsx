import React, { useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react'
import { createVirtual } from '@skygraph/core'
import type { VirtualEngine } from '@skygraph/core'
import { TableBody, type BodyProps } from './TableBody'
import type { FlatRow } from './types'

/**
 * Сигнатура функций оценки/измерения высоты строки. Принимает данные строки
 * + её id (как в `TableEngine.getEstimatedRowHeight`).
 */
export type VirtualRowHeightFn = (row: Record<string, unknown>, id: string) => number

interface VirtualBodyProps extends BodyProps {
  /**
   * Высота строки.
   *
   * - `number` — фиксированная одинаковая высота для всех строк (быстрый
   *   путь, CSS-локается на стороне `Table.tsx`).
   * - `function` — **декларативная** per-row высота: значение, которое
   *   возвращает функция, трактуется как точная высота строки. Высота
   *   жёстко локается в DOM через inline-style, чтобы `scrollHeight`
   *   контейнера ВСЕГДА совпадал с `engine.totalHeight` (это убирает
   *   дрейф ползунка при drag и тремор от посторонних reflow'ов).
   *   ResizeObserver в этом режиме не используется — если контент
   *   сильно выше декларируемой высоты, он будет обрезан
   *   (`overflow: hidden`).
   */
  rowHeight: number | VirtualRowHeightFn
  /**
   * Эстимейт высоты для off-screen строк, когда `rowHeight` — число
   * (или не задан). Если задан вместе с `rowHeight`-функцией, функция
   * используется для видимых строк (как точная высота, см. выше),
   * а `estimateRowHeight` — для строк за пределами viewport.
   */
  estimateRowHeight?: VirtualRowHeightFn
  /** Сколько лишних строк рендерить выше / ниже viewport. */
  overscan: number
  /** Ref на родительский `.sg-table-scroll`, чей scroll-контекст мы наблюдаем. */
  scrollContainerRef: React.RefObject<HTMLDivElement | null>
}

const DEFAULT_ROW_HEIGHT = 40

/**
 * Резолвит эстимейт-функцию для `createVirtual`. Использует измеренную /
 * уже виденную ранее высоту, если она прокидывается извне; иначе вызывает
 * пользовательский callback.
 */
function buildEstimate(
  rowHeight: number | VirtualRowHeightFn,
  estimate: VirtualRowHeightFn | undefined,
  flatRows: FlatRow[],
): number | ((index: number) => number) {
  if (typeof rowHeight === 'number' && estimate == null) {
    return rowHeight
  }
  const fallback = typeof rowHeight === 'number' ? rowHeight : DEFAULT_ROW_HEIGHT
  const fn: VirtualRowHeightFn | undefined =
    estimate ?? (typeof rowHeight === 'function' ? rowHeight : undefined)
  if (!fn) return fallback
  return (index: number) => {
    const row = flatRows[index]
    if (!row) return fallback
    const v = fn(row.data, row.id)
    return Number.isFinite(v) && v >= 0 ? v : fallback
  }
}

/**
 * Виртуализированное тело таблицы. Живёт в той же CSS Grid, что и `TableHeader`,
 * поэтому ширины колонок остаются согласованными автоматически. Скролл
 * наблюдается на родительском `.sg-table-scroll` — мы не вводим вложенный
 * scrollbox.
 *
 * **Динамические высоты:** если `rowHeight` — функция, или передан
 * `estimateRowHeight`, движок переходит на путь с измерениями. Каждая
 * отрендеренная строка получает `data-sg-virtual-row-index` и наблюдается
 * через `ResizeObserver`. Префикс-сумма offsets пересобирается лениво при
 * первом запросе после `setMeasuredHeight`.
 */
export function VirtualTableBody(props: VirtualBodyProps) {
  const {
    rowHeight,
    estimateRowHeight,
    overscan,
    scrollContainerRef,
    flatRows,
    totalCols,
    ...bodyProps
  } = props

  const isDeclarative = typeof rowHeight === 'function'
  const isDynamic = isDeclarative || estimateRowHeight != null

  // VirtualEngine создаётся один раз и переиспользуется. setItemCount /
  // setItemHeight применяются в эффектах.
  const virtual = useMemo<VirtualEngine>(
    () =>
      createVirtual({
        itemCount: flatRows.length,
        itemHeight: buildEstimate(rowHeight, estimateRowHeight, flatRows),
        overscan,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const [, forceUpdate] = useReducer((n: number) => n + 1, 0)

  // Подписка на инвалидации движка — единственный путь, по которому новый
  // measurement вызывает перерисовку. Эффект подключается один раз.
  //
  // В declarative-mode (rowHeight как функция) sync-prime в useLayoutEffect
  // выставляет engine-size до paint'а, а subscribe тут же триггерит
  // forceUpdate — React обработает его внутри того же task'а до paint'а,
  // так что DOM-расчёты (bottomPad, topPad) уезжают в одну итерацию,
  // synchronously, без лишних кадров. Это и обеспечивает совпадение
  // scrollHeight ↔ totalHeight на каждом кадре скролла.
  useEffect(() => virtual.subscribe(() => forceUpdate()), [virtual])

  useEffect(() => {
    virtual.setItemCount(flatRows.length)
    virtual.setItemHeight(buildEstimate(rowHeight, estimateRowHeight, flatRows))
  }, [virtual, flatRows, rowHeight, estimateRowHeight])

  // В declarative-mode пред-заполняем engine значениями rowHeight для ВСЕХ
  // строк, а не только видимых. Без этого totalHeight «доуточнялся»
  // постепенно при появлении новых строк в viewport, ergo scrollHeight
  // менялся прямо во время drag'а ползунка → курсор уезжал от него.
  // Стоимость: O(N) function-вызовов один раз на data change. Для 4000
  // строк это ~4000 setMeasuredHeight, событий движок отправит ровно
  // столько, сколько реально новых значений — последующие вызовы с тем
  // же h возвращают `false` без emit'а.
  useEffect(() => {
    if (!isDeclarative) return
    const fn = rowHeight as VirtualRowHeightFn
    for (let i = 0; i < flatRows.length; i++) {
      const row = flatRows[i]
      if (!row) continue
      const h = fn(row.data, row.id)
      if (Number.isFinite(h) && h >= 0) {
        virtual.setMeasuredHeight(i, Math.round(h))
      }
    }
  }, [virtual, flatRows, rowHeight, isDeclarative])

  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(0)

  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return

    setViewportHeight(el.clientHeight)
    setScrollTop(el.scrollTop)

    const onScroll = () => setScrollTop(el.scrollTop)
    el.addEventListener('scroll', onScroll, { passive: true })

    let ro: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => setViewportHeight(el.clientHeight))
      ro.observe(el)
    }

    return () => {
      el.removeEventListener('scroll', onScroll)
      ro?.disconnect()
    }
  }, [scrollContainerRef])

  const range = virtual.getRange(scrollTop, viewportHeight || 400)
  const visibleRows = flatRows.slice(range.startIndex, range.endIndex + 1)
  const totalHeight = range.totalHeight
  const topPad = range.offsetTop
  const visibleSize = visibleRows.reduce(
    (sum, _row, idx) => sum + virtual.getItemSize(range.startIndex + idx),
    0,
  )
  const bottomPad = Math.max(0, totalHeight - topPad - visibleSize)

  // Чтобы измерения не входили в петлю из субпиксельного дребезга
  // (`getBoundingClientRect` периодически возвращает 47.5 ↔ 48.0 на одних
  // и тех же DOM-узлах), стабилизируем высоту до целых пикселей. Math.round
  // симметричен относительно 0.5 (устойчивее `Math.ceil`, которая ловила
  // дрожь 48.0 ↔ 48.001 как 48 ↔ 49).
  const normalizeHeight = (h: number) => Math.round(h)

  // Стабильный ResizeObserver. Нужен ТОЛЬКО в measurement-mode
  // (`rowHeight: number + estimateRowHeight: function`), где реальные
  // высоты неизвестны до layout'а. В declarative-mode (rowHeight как
  // функция) высоты декларируются пользователем напрямую → RO не нужен,
  // его наблюдение лишь будит цикл re-render'ов от субпиксельных
  // изменений во время неродственных reflow'ов (например, появление
  // page-scrollbar при прокрутке страницы пересчитывает ширину колонок
  // и высоту длинных строк — отсюда и был «тремор всего блока»).
  const roRef = useRef<ResizeObserver | null>(null)
  const observedCellsRef = useRef<Set<HTMLElement>>(new Set())

  useEffect(() => {
    if (!isDynamic) return
    if (isDeclarative) return
    if (typeof ResizeObserver === 'undefined') return

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const target = entry.target as HTMLElement
        const rowEl = target.closest('[data-sg-virtual-row-index]') as HTMLElement | null
        if (!rowEl) continue
        const idx = Number(rowEl.getAttribute('data-sg-virtual-row-index'))
        virtual.setMeasuredHeight(idx, normalizeHeight(entry.contentRect.height))
      }
    })
    roRef.current = ro
    return () => {
      ro.disconnect()
      roRef.current = null
      observedCellsRef.current.clear()
    }
  }, [isDynamic, isDeclarative, virtual])

  // На каждый ре-рендер:
  // 1) Sync-prime engine значениями для видимых строк:
  //    - declarative: значение из `rowHeight(row.data, row.id)` — это
  //      пользовательский контракт «вот точная высота строки».
  //    - measurement: реальная высота первой ячейки через
  //      `getBoundingClientRect`, только для НЕ-измеренных раньше строк.
  // 2) Inline-locking всех ячеек ряда к engine-размеру: устанавливаем
  //    `style.height = ${size}px`. Это и есть ключевой ингредиент,
  //    благодаря которому `DOM.scrollHeight ≡ engine.totalHeight` — без
  //    этого замечательного равенства браузер при drag-е ползунка
  //    мапит cursorY → scrollTop по «вранному» scrollHeight и ползунок
  //    уезжает от курсора, а RO-callback'и от внешних layout-возмущений
  //    дёргают bottomPad и провоцируют тремор.
  // 3) Diff observe/unobserve ячеек RO (только в measurement-mode).
  useLayoutEffect(() => {
    if (!isDynamic) return
    const grid = scrollContainerRef.current?.querySelector('.sg-table-grid')
    if (!grid) return

    const rowEls = grid.querySelectorAll<HTMLElement>('[data-sg-virtual-row-index]')
    const ro = roRef.current
    const currentCells = new Set<HTMLElement>()

    rowEls.forEach((rowEl) => {
      const firstCell = rowEl.firstElementChild as HTMLElement | null
      if (!firstCell) return
      const idx = Number(rowEl.getAttribute('data-sg-virtual-row-index'))
      currentCells.add(firstCell)

      // 1) sync-prime engine size
      if (isDeclarative) {
        const row = flatRows[idx]
        if (row) {
          const declared = (rowHeight as VirtualRowHeightFn)(row.data, row.id)
          if (Number.isFinite(declared) && declared >= 0) {
            virtual.setMeasuredHeight(idx, Math.round(declared))
          }
        }
      } else if (!virtual.hasMeasured(idx)) {
        virtual.setMeasuredHeight(idx, normalizeHeight(firstCell.getBoundingClientRect().height))
      }

      // 2) lock cell heights to engine size to keep DOM.scrollHeight in
      // sync with engine.totalHeight. Only applies once engine knows the
      // size — для впервые-видимых measurement-строк до RO-сheck размер
      // ещё estimate'ный, локать его смысла нет.
      if (isDeclarative || virtual.hasMeasured(idx)) {
        const h = virtual.getItemSize(idx)
        const px = `${h}px`
        const children = rowEl.children
        for (let c = 0; c < children.length; c++) {
          const cell = children[c] as HTMLElement
          if (cell.style.height !== px) cell.style.height = px
          if (cell.style.minHeight !== '0px') cell.style.minHeight = '0px'
          if (cell.style.overflow !== 'hidden') cell.style.overflow = 'hidden'
        }
      }

      // 3) RO observe (measurement-mode only)
      if (ro && !observedCellsRef.current.has(firstCell)) {
        ro.observe(firstCell)
      }
    })

    if (ro) {
      for (const cell of observedCellsRef.current) {
        if (!currentCells.has(cell)) ro.unobserve(cell)
      }
    }
    observedCellsRef.current = currentCells

    // Фоллбэк для jsdom / runtime без RO — одноразовое измерение, чтобы
    // initial-render тестов отчитался.
    if (!isDeclarative && typeof ResizeObserver === 'undefined') {
      rowEls.forEach((rowEl) => {
        const firstCell = rowEl.firstElementChild as HTMLElement | null
        if (!firstCell) return
        const idx = Number(rowEl.getAttribute('data-sg-virtual-row-index'))
        virtual.setMeasuredHeight(idx, normalizeHeight(firstCell.getBoundingClientRect().height))
      })
    }
  }, [isDynamic, isDeclarative, virtual, scrollContainerRef, visibleRows, flatRows, rowHeight])

  const spacerColumn = `1 / ${totalCols + 1}`

  return (
    <>
      {topPad > 0 && (
        <div style={{ gridColumn: spacerColumn, height: topPad }} role="presentation" aria-hidden />
      )}
      <TableBody
        {...bodyProps}
        flatRows={visibleRows}
        totalCols={totalCols}
        rowIndexOffset={range.startIndex}
      />
      {bottomPad > 0 && (
        <div
          style={{ gridColumn: spacerColumn, height: bottomPad }}
          role="presentation"
          aria-hidden
        />
      )}
    </>
  )
}
