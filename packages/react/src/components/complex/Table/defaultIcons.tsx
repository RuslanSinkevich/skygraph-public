import type React from 'react'

/**
 * Дефолтные иконки заголовка таблицы. Хранятся как React-ноды, чтобы их
 * можно было передавать через `TableLocale` (типизировано как
 * `React.ReactNode`). Все иконки используют `currentColor`, поэтому цвет
 * задаётся CSS-классом контейнера (`.sg-table-filter-trigger`,
 * `.sg-table-filter-active`).
 */

/** Воронка фильтра. */
export const FilterIcon: React.ReactElement = (
  <svg
    width="12"
    height="12"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinejoin="round"
    strokeLinecap="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M2 3h12l-5 6.5V14l-2 1V9.5L2 3z" />
  </svg>
)

/** Лупа поиска. */
export const SearchIcon: React.ReactElement = (
  <svg
    width="12"
    height="12"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    aria-hidden="true"
    focusable="false"
  >
    <circle cx="7" cy="7" r="4.5" />
    <path d="M10.5 10.5L14 14" />
  </svg>
)
