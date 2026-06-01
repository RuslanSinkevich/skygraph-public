import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  serializeSvg,
  measureSvg,
  triggerDownload,
  downloadSvg,
} from '../components/complex/Charts/download'

const SVG_NS = 'http://www.w3.org/2000/svg'

function makeSvg(viewBox = '0 0 600 400'): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement
  svg.setAttribute('viewBox', viewBox)
  const rect = document.createElementNS(SVG_NS, 'rect')
  rect.setAttribute('width', '10')
  rect.setAttribute('height', '10')
  svg.appendChild(rect)
  return svg
}

describe('chart download utilities (parity with React chartExport)', () => {
  describe('serializeSvg', () => {
    it('serialises a deep clone with explicit namespaces', () => {
      const svg = makeSvg()
      const xml = serializeSvg(svg, { width: 100, height: 50 })
      expect(xml).toContain('xmlns="http://www.w3.org/2000/svg"')
      expect(xml).toContain('width="100"')
      expect(xml).toContain('height="50"')
      // Original element is not mutated.
      expect(svg.getAttribute('width')).toBeNull()
      expect(svg.getAttribute('height')).toBeNull()
    })
  })

  describe('measureSvg', () => {
    it('falls back to the viewBox attribute when getBoundingClientRect is unavailable', () => {
      const svg = makeSvg('0 0 320 180')
      const size = measureSvg(svg)
      // jsdom returns 0×0 from getBoundingClientRect — viewBox is the fallback.
      expect([320, 600]).toContain(size.width)
      expect([180, 400]).toContain(size.height)
    })

    it('falls back to 600×400 when neither real size nor viewBox is available', () => {
      const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement
      const size = measureSvg(svg)
      expect(size.width).toBe(600)
      expect(size.height).toBe(400)
    })
  })

  describe('triggerDownload + downloadSvg', () => {
    let originalCreate: typeof URL.createObjectURL
    let originalRevoke: typeof URL.revokeObjectURL
    let clicked = ''
    beforeEach(() => {
      clicked = ''
      originalCreate = URL.createObjectURL
      originalRevoke = URL.revokeObjectURL
      URL.createObjectURL = vi.fn(() => 'blob:mock-url')
      URL.revokeObjectURL = vi.fn()
      const realCreate = document.createElement.bind(document)
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        const el = realCreate(tag)
        if (tag === 'a') {
          ;(el as HTMLAnchorElement).click = () => {
            clicked = (el as HTMLAnchorElement).download
          }
        }
        return el
      })
    })
    afterEach(() => {
      URL.createObjectURL = originalCreate
      URL.revokeObjectURL = originalRevoke
      vi.restoreAllMocks()
    })

    it('clicks a hidden anchor with the requested fileName', () => {
      triggerDownload(new Blob(['hi'], { type: 'text/plain' }), 'note.txt')
      expect(clicked).toBe('note.txt')
    })

    it('downloadSvg ensures the .svg extension', () => {
      const svg = makeSvg()
      downloadSvg(svg, 'my-chart')
      expect(clicked).toBe('my-chart.svg')
    })

    it('downloadSvg keeps an existing .svg extension', () => {
      const svg = makeSvg()
      downloadSvg(svg, 'already.svg')
      expect(clicked).toBe('already.svg')
    })
  })
})
