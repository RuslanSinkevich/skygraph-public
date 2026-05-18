/**
 * Экспорт SVG-чарта в файл (SVG / PNG) — без runtime-зависимостей.
 *
 * Используем штатный `XMLSerializer` + `URL.createObjectURL` + `Image` +
 * `<canvas>.toBlob`; выгрузка через невидимый `<a download>`. Никакого
 * `dom-to-image` / `html2canvas` / `canvg` — браузер сам всё умеет.
 */

const SVG_NS = 'http://www.w3.org/2000/svg'
const XLINK_NS = 'http://www.w3.org/1999/xlink'

/** Размер выгружаемого PNG в CSS-пикселях. */
export interface PngSize {
  /** Ширина PNG в CSS-пикселях. */
  width: number
  /** Высота PNG в CSS-пикселях. */
  height: number
}

/** Параметры PNG-экспорта. */
export interface DownloadPngOptions {
  /** Имя файла без расширения / с `.png`. По умолчанию `chart.png`. */
  fileName?: string
  /**
   * Множитель плотности пикселей. По умолчанию `window.devicePixelRatio`
   * (или `2` если `window` нет). Файл получает `width × scale` пикселей,
   * но визуально — нормальные `width` CSS-пикселей.
   */
  scale?: number
  /** Цвет фона. По умолчанию `transparent` — экспорт с прозрачным фоном. */
  background?: string
}

/**
 * Сериализует `<svg>` в строку с inline `width` / `height` и явными
 * пространствами имён. Принимает оригинальный элемент — не модифицирует
 * его (работаем с глубокой копией).
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

/** Триггерит загрузку blob-а под именем `fileName` через невидимый `<a>`. */
export function triggerDownload(blob: Blob, fileName: string): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  // На некоторых браузерах нужно вставить в DOM перед click().
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Освобождаем object-URL после короткой задержки — браузер ещё может
  // тянуть данные на момент клика.
  setTimeout(() => {
    try {
      URL.revokeObjectURL(url)
    } catch {
      // ignore
    }
  }, 100)
}

/** Гарантирует расширение в имени файла. */
function ensureExt(name: string, ext: string): string {
  return name.endsWith(`.${ext}`) ? name : `${name}.${ext}`
}

/** Измеряет рабочий размер SVG: real DOM size → viewBox → fallback. */
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
 * Скачивает текущий SVG-чарт как `.svg`-файл с явными `width` / `height`,
 * чтобы файл нормально открывался в любом просмотрщике.
 */
export function downloadSvg(svg: SVGSVGElement, fileName = 'chart.svg'): void {
  const size = measureSvg(svg)
  const xml = serializeSvg(svg, size)
  const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' })
  triggerDownload(blob, ensureExt(fileName, 'svg'))
}

/**
 * Конвертирует SVG-чарт в PNG через штатный browser-canvas и скачивает
 * результат. Возвращает `Promise<void>`, который резолвится после клика
 * `<a download>` или реджектится при сбое декодирования SVG.
 *
 * Стратегия:
 *   1. Сериализуем SVG → object-URL.
 *   2. Грузим в `Image` (браузер сам декодирует SVG как растр).
 *   3. Рисуем на `<canvas>` с devicePixelRatio-масштабом → `.toBlob('image/png')`.
 *   4. Триггерим скачивание через `<a download>`.
 *
 * Альтернатива — `OffscreenCanvas`. Не используем: поддержка хуже, в
 * Safari < 17 нет, для маленьких чартов выигрыша нет. См. отчёт раунда.
 */
export function downloadSvgAsPng(
  svg: SVGSVGElement,
  fileNameOrOpts: string | DownloadPngOptions = 'chart.png',
): Promise<void> {
  const opts: DownloadPngOptions =
    typeof fileNameOrOpts === 'string' ? { fileName: fileNameOrOpts } : fileNameOrOpts
  const fileName = ensureExt(opts.fileName ?? 'chart.png', 'png')
  const size = measureSvg(svg)
  const scale =
    opts.scale ?? (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 2)
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
