import { h, type FunctionalComponent } from 'vue'

/**
 * SVG-иконки заголовка таблицы — портированы из React
 * (`packages/react/src/components/complex/Table/defaultIcons.tsx`), чтобы
 * Vue и React рисовали одинаковые значки фильтра/поиска. Цвет берётся из
 * `currentColor`, поэтому задаётся CSS-классом контейнера
 * (`.sg-table-filter-trigger`, `.sg-table-filter-active`).
 */

/** Воронка фильтра. */
export const FilterIcon: FunctionalComponent = () =>
  h(
    'svg',
    {
      width: '12',
      height: '12',
      viewBox: '0 0 16 16',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '1.5',
      'stroke-linejoin': 'round',
      'stroke-linecap': 'round',
      'aria-hidden': 'true',
      focusable: 'false',
    },
    [h('path', { d: 'M2 3h12l-5 6.5V14l-2 1V9.5L2 3z' })],
  )

/** Лупа поиска. */
export const SearchIcon: FunctionalComponent = () =>
  h(
    'svg',
    {
      width: '12',
      height: '12',
      viewBox: '0 0 16 16',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '1.5',
      'stroke-linecap': 'round',
      'aria-hidden': 'true',
      focusable: 'false',
    },
    [h('circle', { cx: '7', cy: '7', r: '4.5' }), h('path', { d: 'M10.5 10.5L14 14' })],
  )
