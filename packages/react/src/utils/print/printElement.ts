import type { PrintOptions } from './types'

/**
 * Вычисляет CSS `@page` блок для popup-страницы по `PrintOptions`. Вынесено
 * в отдельную функцию ради тестируемости (snapshot-тест без `window.open`).
 */
export function buildPageRule(opts: PrintOptions = {}): string {
  const orientation = opts.orientation ?? 'portrait'
  const pageSize = opts.pageSize ?? 'A4'
  const margins = opts.margins ?? '1cm'
  return `@page { size: ${pageSize} ${orientation}; margin: ${margins}; }`
}

/**
 * Собирает HTML-документ popup-страницы. Используется `printElement` и
 * напрямую тестами — поэтому никаких `window.*` побочных эффектов.
 *
 * Стратегия:
 *  1. Клонируем `<style>` и `<link rel="stylesheet">` из текущего
 *     документа, чтобы popup увидел SkyGraph-стили (включая `print.css`).
 *  2. Дописываем нашу `@page`-секцию + `body` reset.
 *  3. Опциональный `transform: scale(...)` на обёртке.
 *  4. Подставляем `outerHTML` исходного `node`.
 *  5. Триггерим `print()` после `load`-события, чтобы шрифты и стили
 *     успели приехать в popup.
 */
export function buildPrintHtml(
  fragment: string,
  opts: PrintOptions = {},
  documentRef: Document | null = typeof document !== 'undefined' ? document : null,
): string {
  const styles =
    documentRef === null
      ? ''
      : Array.from(documentRef.querySelectorAll('style, link[rel="stylesheet"]'))
          .map((el) => el.outerHTML)
          .join('\n')

  const pageRule = buildPageRule(opts)
  const scale = opts.scale && opts.scale !== 1 ? opts.scale : null
  const title = escapeHtml(opts.fileName ?? 'SkyGraph print')
  const customStyles = opts.customStyles ?? ''

  const wrapperOpen = scale
    ? `<div class="sg-print-root" style="transform: scale(${scale}); transform-origin: 0 0;">`
    : `<div class="sg-print-root">`

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${title}</title>
${styles}
<style>
  ${pageRule}
  html, body { margin: 0; padding: 0; background: #fff; }
  body { padding: 0; }
  .sg-print-root { width: 100%; }
  ${customStyles}
</style>
</head>
<body>
${wrapperOpen}
${fragment}
</div>
</body>
</html>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Открывает popup-окно, инжектирует SkyGraph-стили + `outerHTML` `node`-а,
 * и вызывает `window.print()`. Возвращает popup-окно или `null`, если
 * браузер заблокировал открытие нового окна.
 *
 * Пример:
 * ```ts
 * const ref = useRef<HTMLDivElement>(null)
 * <button onClick={() => printElement(ref.current, { fileName: 'report.pdf' })}>
 *   Print
 * </button>
 * ```
 *
 * Никаких runtime-зависимостей: всё на штатном `window.open` + CSS
 * `@media print`. PDF получается через системный диалог печати → "Save as PDF".
 */
export function printElement(
  node: Element | null,
  opts: PrintOptions = {},
): Window | null {
  if (!node) return null
  if (typeof window === 'undefined') return null

  const popup = window.open('', '_blank')
  if (!popup) return null

  const html = buildPrintHtml(node.outerHTML, opts)
  popup.document.open()
  popup.document.write(html)
  popup.document.close()
  popup.focus()

  if (opts.skipPrint) return popup

  // Дать браузеру время подгрузить linked-stylesheet'ы. `setTimeout(0)`
  // достаточно для inline `<style>` блоков; для `<link>` лучше ждать `load`.
  const trigger = () => {
    try {
      popup.print()
    } catch {
      // Печать может быть заблокирована; popup всё равно остаётся открытым,
      // пользователь может вызвать "печать" из меню браузера вручную.
    }
    if (!opts.keepOpen) {
      try {
        popup.close()
      } catch {
        // Closed by user already / blocked — игнорируем.
      }
    }
  }

  // `load` срабатывает после линковки стилей. Если popup уже `complete`,
  // запускаем сразу. Минимальный fallback на `setTimeout` — на случай
  // окружений (jsdom), где `load` не диспатчится.
  if (popup.document.readyState === 'complete') {
    setTimeout(trigger, 0)
  } else {
    popup.addEventListener('load', () => setTimeout(trigger, 0), { once: true })
    setTimeout(trigger, 300)
  }

  return popup
}
