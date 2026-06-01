import { describe, it, expect, vi } from 'vitest'
import { buildPageRule, buildPrintHtml, printElement } from '../../utils/print'

describe('buildPageRule', () => {
  it('returns sane defaults', () => {
    expect(buildPageRule()).toBe('@page { size: A4 portrait; margin: 1cm; }')
  })

  it('honours orientation override', () => {
    expect(buildPageRule({ orientation: 'landscape' })).toContain('landscape')
  })

  it('honours pageSize override', () => {
    expect(buildPageRule({ pageSize: 'Letter' })).toContain('Letter')
  })

  it('honours custom margins', () => {
    expect(buildPageRule({ margins: '2cm' })).toContain('margin: 2cm')
  })
})

describe('buildPrintHtml', () => {
  it('embeds the fragment HTML', () => {
    const html = buildPrintHtml('<p>hello</p>', {}, null)
    expect(html).toContain('<p>hello</p>')
  })

  it('escapes title characters', () => {
    const html = buildPrintHtml('<p>x</p>', { fileName: '<bad>' }, null)
    expect(html).toContain('&lt;bad&gt;')
    expect(html).not.toContain('<title><bad>')
  })

  it('applies scale wrapper when scale != 1', () => {
    const html = buildPrintHtml('<p>x</p>', { scale: 0.5 }, null)
    expect(html).toContain('transform: scale(0.5)')
  })

  it('omits scale wrapper when scale === 1', () => {
    const html = buildPrintHtml('<p>x</p>', { scale: 1 }, null)
    expect(html).not.toContain('transform: scale')
  })

  it('inlines custom styles', () => {
    const html = buildPrintHtml('<p>x</p>', { customStyles: '.x { color: red; }' }, null)
    expect(html).toContain('.x { color: red; }')
  })

  it('mirrors document.querySelectorAll <style> tags', () => {
    const fakeDoc = {
      querySelectorAll: () => [
        { outerHTML: '<style>.a { color: blue; }</style>' },
        { outerHTML: '<link rel="stylesheet" href="x.css" />' },
      ],
    } as unknown as Document
    const html = buildPrintHtml('<p>x</p>', {}, fakeDoc)
    expect(html).toContain('.a { color: blue; }')
    expect(html).toContain('href="x.css"')
  })
})

describe('printElement', () => {
  it('returns null for null node', () => {
    expect(printElement(null)).toBeNull()
  })

  it('returns null when window.open is blocked', () => {
    const stub = vi.spyOn(window, 'open').mockReturnValue(null)
    const div = document.createElement('div')
    div.innerHTML = '<p>hi</p>'
    expect(printElement(div)).toBeNull()
    stub.mockRestore()
  })

  it('writes HTML to popup and skips print when skipPrint is set', () => {
    const writeMock = vi.fn()
    const closeMock = vi.fn()
    const focusMock = vi.fn()
    const fakeDoc = {
      open: vi.fn(),
      close: closeMock,
      write: writeMock,
      readyState: 'complete' as DocumentReadyState,
    }
    const fakePopup = {
      document: fakeDoc,
      focus: focusMock,
      print: vi.fn(),
      close: vi.fn(),
      addEventListener: vi.fn(),
    } as unknown as Window
    const stub = vi.spyOn(window, 'open').mockReturnValue(fakePopup)
    const div = document.createElement('div')
    div.innerHTML = '<p>hi</p>'
    const result = printElement(div, { skipPrint: true })
    expect(result).toBe(fakePopup)
    expect(writeMock).toHaveBeenCalledTimes(1)
    expect(focusMock).toHaveBeenCalledTimes(1)
    stub.mockRestore()
  })
})
