import type { PrintOptions } from './types'

/**
 * Build the `@page` CSS rule for the print popup.
 * Vanilla TS port from `@skygraph/react/utils/print/printElement`.
 */
export function buildPageRule(opts: PrintOptions = {}): string {
  const orientation = opts.orientation ?? 'portrait'
  const pageSize = opts.pageSize ?? 'A4'
  const margins = opts.margins ?? '1cm'
  return `@page { size: ${pageSize} ${orientation}; margin: ${margins}; }`
}

/**
 * Compose the popup HTML document. Identical to the React utility so behaviour
 * stays interchangeable across frameworks.
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
 * Open a popup window, inject SkyGraph styles + the node's `outerHTML`, and
 * trigger `window.print()`. Returns the popup window or `null` if blocked.
 */
export function printElement(node: Element | null, opts: PrintOptions = {}): Window | null {
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

  const trigger = () => {
    try {
      popup.print()
    } catch {
      // Print might be blocked; popup stays open for the user.
    }
    if (!opts.keepOpen) {
      try {
        popup.close()
      } catch {
        // Already closed.
      }
    }
  }

  if (popup.document.readyState === 'complete') {
    setTimeout(trigger, 0)
  } else {
    popup.addEventListener('load', () => setTimeout(trigger, 0), { once: true })
    setTimeout(trigger, 300)
  }

  return popup
}
