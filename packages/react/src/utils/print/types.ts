/**
 * Параметры печати для {@link printElement} и `ref.print()` методов
 * компонентов (Table / Diagram / Charts).
 *
 * Дизайн осознанно skinny: всё, что выходит за пределы CSS `@page` и не
 * требует runtime-зависимости, — отдано пользователю через `customStyles`.
 */
export interface PrintOptions {
  /**
   * Заголовок popup-окна, используется браузером как `document.title`
   * (а в "Save as PDF" — как имя файла по умолчанию).
   */
  fileName?: string
  /** Ориентация страницы. @default 'portrait' */
  orientation?: 'portrait' | 'landscape'
  /**
   * CSS-значение для `@page { size }`. Стандартные ключевые слова
   * (`'A4'`, `'Letter'`, `'A3'`, `'Legal'`) или custom-строка
   * (`'210mm 297mm'`).
   * @default 'A4'
   */
  pageSize?: 'A4' | 'A3' | 'A5' | 'Letter' | 'Legal' | string
  /**
   * Множитель `transform: scale(...)` на корневом контейнере popup-страницы.
   * Полезно когда исходный фрагмент шире страницы.
   * @default 1
   */
  scale?: number
  /**
   * Поля страницы (`@page { margin }`). Строка как есть подставляется в
   * CSS, поэтому "1cm", "10mm 20mm" и т.п. — все валидны.
   * @default '1cm'
   */
  margins?: string
  /**
   * Дополнительный CSS, инжектируемый поверх стилей SkyGraph. Применяется
   * последним, поэтому селекторы из этой строки имеют максимальный приоритет
   * при равной специфичности.
   */
  customStyles?: string
  /**
   * Не вызывать `window.print()` автоматически — popup откроется и останется
   * под управлением вызывающего кода (для тестов / кастомных сценариев).
   * @default false
   */
  skipPrint?: boolean
  /**
   * Не закрывать popup после печати. По умолчанию popup закрывается через
   * `window.close()` сразу после возврата из `print()`.
   * @default false
   */
  keepOpen?: boolean
}

/**
 * Возможные значения prop `printable` на компонентах с поддержкой
 * `ref.print()` (`Table`, `Diagram`, `LineChart`, `BarChart`, `AreaChart`,
 * `PieChart`).
 *
 * - `false` / `undefined` — печать отключена (toolbar-кнопок не появляется,
 *   `ref.print()` всё равно работает на компонентах с ref).
 * - `true` — печать включена с дефолтами.
 * - `{ fileName?: '...' }` — печать включена, имя popup-окна переопределено.
 */
export type PrintableProp = boolean | { fileName?: string }
