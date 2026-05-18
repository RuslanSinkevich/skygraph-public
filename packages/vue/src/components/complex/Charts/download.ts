/**
 * SVG-chart export utilities — Vue port of React's `chartExport.ts`.
 *
 * 1:1 with `packages/react/src/components/complex/Charts/chartExport.ts`.
 * Pure DOM, no React, no Vue — works in any browser-like environment that
 * provides `XMLSerializer`, `URL.createObjectURL`, `Image`, and `<canvas>`.
 *
 * Same exports, same names, same shapes — see CHARTER §9 (API parity).
 */

const SVG_NS = 'http://www.w3.org/2000/svg'
const XLINK_NS = 'http://www.w3.org/1999/xlink'

/** Output PNG size in CSS pixels. */
export interface PngSize {
  /** Width in CSS pixels. */
  width: number
  /** Height in CSS pixels. */
  height: number
}

/** Options accepted by `downloadSvgAsPng`. */
export interface DownloadPngOptions {
  /** File name (with or without `.png` suffix). @default 'chart.png' */
  fileName?: string
  /**
   * Pixel-density multiplier. Defaults to `window.devicePixelRatio` (or `2`
   * when there is no `window`). The file gets `width × scale` pixels but
   * still displays at `width` CSS pixels.
   */
  scale?: number
  /** Background fill. Default is `transparent`. */
  background?: string
}

/**
 * Serialise an `<svg>` element to a string with inline `width` / `height`
 * and explicit XML namespaces. The original element is **not** mutated —
 * we work off a deep clone.
 */
export function serializeSvg(svg: SVGSVGElement, size?: PngSize): string {
  const clone = svg.cloneNode(true) as SVGSVGElement
  if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', SVG_NS)
  if (!clone.getAttribute('xmlns:xlink')) clone.setAttribute('xmlns:xlink', XLINK_NS)
  if (size) {
    clone.setAttribute('width', String(size.width))
    clone.setAttribute('height', String(size.height))
  }
  return new XMLSerializer().serializeToString(clone)
}

/** Trigger a download of `blob` as `fileName` via a hidden `<a>` element. */
export function triggerDownload(blob: Blob, fileName: string): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  // Some browsers require the anchor to be in the DOM before `click()`.
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Defer revoke so in-flight requests can still resolve the URL.
  setTimeout(() => {
    try {
      URL.revokeObjectURL(url)
    } catch {
      // ignore
    }
  }, 100)
}

function ensureExt(name: string, ext: string): string {
  return name.endsWith(`.${ext}`) ? name : `${name}.${ext}`
}

/** Measure an SVG: real DOM size → viewBox → fallback (`600 × 400`). */
export function measureSvg(svg: SVGSVGElement): PngSize {
  const r = svg.getBoundingClientRect?.()
  let width = r && r.width > 0 ? r.width : 0
  let height = r && r.height > 0 ? r.height : 0
  if (width <= 0 || height <= 0) {
    const vb = svg.viewBox?.baseVal
    if (vb && vb.width > 0 && vb.height > 0) {
      width = vb.width
      height = vb.height
    } else {
      const attr = svg.getAttribute('viewBox')
      if (attr) {
        const parts = attr.trim().split(/\s+/)
        const w = Number.parseFloat(parts[2] ?? '')
        const h = Number.parseFloat(parts[3] ?? '')
        if (Number.isFinite(w) && w > 0) width = w
        if (Number.isFinite(h) && h > 0) height = h
      }
    }
  }
  if (!(width > 0)) width = 600
  if (!(height > 0)) height = 400
  return { width: Math.round(width), height: Math.round(height) }
}

/**
 * Download the current SVG chart as a `.svg` file with explicit
 * `width` / `height` attributes so it opens cleanly in any viewer.
 */
export function downloadSvg(svg: SVGSVGElement, fileName = 'chart.svg'): void {
  const size = measureSvg(svg)
  const xml = serializeSvg(svg, size)
  const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' })
  triggerDownload(blob, ensureExt(fileName, 'svg'))
}

/**
 * Convert an SVG chart to PNG via a browser `<canvas>` and download it.
 *
 * Strategy:
 *   1. Serialise SVG → object-URL.
 *   2. Decode through an `Image` (the browser rasterises the SVG).
 *   3. Draw onto a `<canvas>` with devicePixelRatio scale.
 *   4. `canvas.toBlob('image/png')` → trigger download.
 */
export function downloadSvgAsPng(
  svg: SVGSVGElement,
  fileNameOrOpts: string | DownloadPngOptions = 'chart.png',
): Promise<void> {
  const opts: DownloadPngOptions =
    typeof fileNameOrOpts === 'string' ? { fileName: fileNameOrOpts } : fileNameOrOpts
  const fileName = ensureExt(opts.fileName ?? 'chart.png', 'png')
  const size = measureSvg(svg)
  const scale = opts.scale ?? (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 2)
  const xml = serializeSvg(svg, size)
  const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  return new Promise<void>((resolve, reject) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(size.width * scale))
        canvas.height = Math.max(1, Math.round(size.height * scale))
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          URL.revokeObjectURL(url)
          reject(new Error('Canvas 2D context unavailable'))
          return
        }
        ctx.scale(scale, scale)
        if (opts.background) {
          ctx.fillStyle = opts.background
          ctx.fillRect(0, 0, size.width, size.height)
        }
        ctx.drawImage(img, 0, 0, size.width, size.height)
        URL.revokeObjectURL(url)
        canvas.toBlob((pngBlob) => {
          if (!pngBlob) {
            reject(new Error('canvas.toBlob produced null'))
            return
          }
          triggerDownload(pngBlob, fileName)
          resolve()
        }, 'image/png')
      } catch (err) {
        URL.revokeObjectURL(url)
        reject(err instanceof Error ? err : new Error(String(err)))
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('SVG image decoding failed'))
    }
    img.src = url
  })
}
