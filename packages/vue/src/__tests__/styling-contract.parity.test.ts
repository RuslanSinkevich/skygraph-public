/**
 * CSS contract parity tests.
 *
 * Each Vue UI primitive is mounted with safe default props, then the resulting
 * DOM is compared against an inline expected shape derived directly from the
 * matching React component in `packages/react/src/components/ui/*.tsx`.
 *
 * What we check:
 *   - root tag name + key ARIA / data-* attributes (no runtime styles, no text)
 *   - sorted list of `sg-*` classes on the root
 *   - sorted list of `sg-*` classes on every descendant element
 *
 * What we deliberately do NOT check:
 *   - text content (locale-dependent, frequently differs in casing / spacing)
 *   - inline `style` attributes (always end up as runtime values)
 *   - non-`sg-*` classes (Vue / React framework attributes)
 *   - SVG glyph paths (illustrations are duplicated literally in both adapters
 *     and tested separately by the per-component tests)
 *
 * Decision: we use INLINE expected shapes (no React peer dep in this test
 * environment) — cross-checked against React sources by hand. The full DOM
 * shape from React's `renderToStaticMarkup` would require pulling React +
 * react-dom into @skygraph/vue's devDeps, which is more infrastructure than
 * the parity contract justifies.
 *
 * Documented exceptions live in `docs/multi-framework.md`.
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import {
  SgButton,
  SgSpin,
  SgTag,
  SgBadge,
  SgAvatar,
  SgSkeleton,
  SgProgress,
  SgEmpty,
  SgResult,
  SgTooltip,
  SgTabs,
  SgBreadcrumb,
  SgPagination,
  SgSteps,
  SgSegmented,
  SgCollapse,
  SgDescriptions,
  SgTimeline,
  SgCarousel,
  SgDropdown,
  SgMenu,
  SgPopconfirm,
} from '../components/ui'

import SgInput from '../components/ui/Input.vue'
import SgInputNumber from '../components/ui/InputNumber.vue'
import SgTextarea from '../components/ui/Textarea.vue'
import SgSelect from '../components/ui/Select.vue'
import SgCheckbox from '../components/ui/Checkbox.vue'
import SgRadio from '../components/ui/Radio.vue'
import SgSwitch from '../components/ui/Switch.vue'
import SgSlider from '../components/ui/Slider.vue'
import SgRate from '../components/ui/Rate.vue'
import SgInputPassword from '../components/ui/InputPassword.vue'
import SgSearchInput from '../components/ui/SearchInput.vue'
import SgTagInput from '../components/ui/TagInput.vue'
import SgPinInput from '../components/ui/PinInput.vue'
import SgInlineEdit from '../components/ui/InlineEdit.vue'
import SgInputGroup from '../components/ui/InputGroup.vue'

// ────────────────────────────────────────────────────────────────────────────
// Helpers — DOM shape extractor.
// ────────────────────────────────────────────────────────────────────────────

interface DomShape {
  tag: string
  attrs: Record<string, string>
  classes: string[]
  children: DomShape[]
}

/**
 * Extract a deterministic, runtime-style-free description of an element's
 * shape. Walks the entire subtree.
 *
 * - Only `sg-*` classes are kept (sorted, deduplicated).
 * - Only ARIA / data-* / role attributes are kept (sorted by key).
 * - Empty class lists are still recorded, so a missing class on a wrapper
 *   surfaces clearly in the diff.
 */
function shape(el: Element): DomShape {
  const classes = Array.from(el.classList)
    .filter((c) => c.startsWith('sg-'))
    .sort()

  const attrs: Record<string, string> = {}
  for (const a of Array.from(el.attributes)) {
    const name = a.name
    const keep = name === 'role' || name.startsWith('aria-') || name.startsWith('data-')
    if (!keep) continue
    attrs[name] = a.value
  }

  return {
    tag: el.tagName.toLowerCase(),
    attrs,
    classes,
    children: Array.from(el.children).map(shape),
  }
}

/**
 * Drop subtree nodes that have no `sg-*` classes AND no tracked attrs AND
 * whose children are likewise prunable. Keeps the assertion focused on the
 * structural skeleton built by either adapter and tolerates leaf SVGs / icons.
 */
function prune(s: DomShape): DomShape {
  const children = s.children.map(prune).filter((c) => {
    if (c.classes.length > 0) return true
    if (Object.keys(c.attrs).length > 0) return true
    if (c.children.length > 0) return true
    return false
  })
  return { ...s, children }
}

function rootShape(wrapper: ReturnType<typeof mount>): DomShape {
  return prune(shape(wrapper.element as Element))
}

// ────────────────────────────────────────────────────────────────────────────
// Parity expectations.
// Each entry was hand-derived from packages/react/src/components/ui/*.tsx.
// Comments next to each spec explain the source line where applicable.
// ────────────────────────────────────────────────────────────────────────────

describe('CSS contract parity — UI primitives', () => {
  // ── Form controls ────────────────────────────────────────────────────────

  it('SgButton (default, idle)', () => {
    // React: <button class="sg-button sg-button-default sg-button-middle"
    //         disabled={false} aria-disabled aria-busy={undefined}>
    const w = mount(SgButton, { slots: { default: 'X' } })
    expect(rootShape(w)).toEqual({
      tag: 'button',
      attrs: { 'aria-disabled': 'false' },
      classes: ['sg-button', 'sg-button-default', 'sg-button-middle'],
      children: [],
    })
  })

  it('SgButton (primary, large, danger)', () => {
    const w = mount(SgButton, {
      props: { type: 'primary', size: 'large', danger: true },
      slots: { default: 'X' },
    })
    expect(rootShape(w).classes).toEqual([
      'sg-button',
      'sg-button-danger',
      'sg-button-large',
      'sg-button-primary',
    ])
  })

  it('SgInput (default)', () => {
    // React: <span class="sg-input-wrapper sg-input-wrapper-middle">
    //          <input class="sg-input sg-input-middle" .../>
    //        </span>
    const w = mount(SgInput)
    const s = rootShape(w)
    expect(s.tag).toBe('span')
    expect(s.classes).toEqual(['sg-input-wrapper', 'sg-input-wrapper-middle'])
    expect(s.children[0].tag).toBe('input')
    expect(s.children[0].classes).toEqual(['sg-input', 'sg-input-middle'])
  })

  it('SgInput (status=error, readOnly)', () => {
    // React adds wrapper-readonly + sg-input-readonly. Vue also adds
    // wrapper-status-error / sg-input-status-error which is a Vue super-set —
    // see docs/multi-framework.md "DOM contract" exception #1.
    const w = mount(SgInput, { props: { status: 'error', readOnly: true } })
    const s = rootShape(w)
    expect(s.classes).toEqual(
      expect.arrayContaining([
        'sg-input-wrapper',
        'sg-input-wrapper-middle',
        'sg-input-wrapper-readonly',
      ]),
    )
    expect(s.children[0].classes).toEqual(
      expect.arrayContaining(['sg-input', 'sg-input-middle', 'sg-input-readonly']),
    )
    expect(s.children[0].attrs['aria-readonly']).toBe('true')
    expect(s.children[0].attrs['aria-invalid']).toBe('true')
  })

  it('SgInputNumber (default)', () => {
    // React: <span class="sg-input-number sg-input-number-middle">
    //          <input class="sg-input-number-input sg-input-number-input-middle" .../>
    //          <div class="sg-input-number-handler-wrap">…</div>
    //        </span>
    const w = mount(SgInputNumber, { props: { modelValue: 0 } })
    const s = rootShape(w)
    expect(s.classes).toEqual(['sg-input-number', 'sg-input-number-middle'])
  })

  it('SgTextarea (default)', () => {
    // React: <span class="sg-textarea-wrapper sg-textarea-middle">
    //          <textarea class="sg-input sg-textarea" .../>
    //        </span>
    // Vue currently emits root <div> instead of <span> — see exception #2.
    const w = mount(SgTextarea)
    const s = rootShape(w)
    expect(s.classes).toEqual(['sg-textarea-middle', 'sg-textarea-wrapper'])
    const textarea = s.children.find((c) => c.tag === 'textarea')
    expect(textarea).toBeDefined()
    expect(textarea!.classes).toEqual(['sg-input', 'sg-textarea'])
  })

  it('SgSelect (closed, single)', () => {
    // React: <div class="sg-select sg-select-middle">
    //          <div class="sg-select-selector" role="combobox" aria-expanded="false" …>
    //          </div>
    //        </div>
    const w = mount(SgSelect, {
      props: { options: [{ value: 'a', label: 'A' }] },
    })
    const s = rootShape(w)
    expect(s.tag).toBe('div')
    expect(s.classes).toEqual(['sg-select', 'sg-select-middle'])
    const selector = s.children.find((c) => c.attrs.role === 'combobox')
    expect(selector).toBeDefined()
    expect(selector!.classes).toEqual(['sg-select-selector'])
    expect(selector!.attrs['aria-expanded']).toBe('false')
    expect(selector!.attrs['aria-haspopup']).toBe('listbox')
  })

  it('SgCheckbox', () => {
    // React: <label class="sg-checkbox">
    //          <input type="checkbox" class="sg-checkbox-input" aria-checked />
    //        </label>
    const w = mount(SgCheckbox)
    const s = rootShape(w)
    expect(s.tag).toBe('label')
    expect(s.classes).toEqual(['sg-checkbox'])
    const input = s.children.find((c) => c.tag === 'input')
    expect(input).toBeDefined()
    expect(input!.classes).toEqual(['sg-checkbox-input'])
  })

  it('SgRadio (group, horizontal)', () => {
    // React Radio.Group: <div class="sg-radio-group sg-radio-group-horizontal" role="radiogroup">
    //   <label class="sg-radio">
    //     <input type="radio" role="radio" class="sg-radio-input" />
    //     <span class="sg-radio-label">…</span>
    //   </label>
    // </div>
    const w = mount(SgRadio, {
      props: { options: [{ value: 'a', label: 'A' }] },
    })
    const s = rootShape(w)
    expect(s.tag).toBe('div')
    expect(s.classes).toEqual(['sg-radio-group', 'sg-radio-group-horizontal'])
    expect(s.attrs.role).toBe('radiogroup')
    const item = s.children[0]
    expect(item.tag).toBe('label')
    expect(item.classes).toEqual(['sg-radio'])
    expect(item.children.find((c) => c.tag === 'input')!.classes).toEqual(['sg-radio-input'])
    expect(item.children.find((c) => c.classes.includes('sg-radio-label'))).toBeDefined()
  })

  it('SgSwitch (off)', () => {
    // React: <button role="switch" aria-checked="false" class="sg-switch sg-switch-default">
    //          <span class="sg-switch-inner">{children}</span>
    //          <span class="sg-switch-handle" />
    //        </button>
    const w = mount(SgSwitch)
    const s = rootShape(w)
    expect(s.tag).toBe('button')
    expect(s.classes).toEqual(['sg-switch', 'sg-switch-default'])
    expect(s.attrs.role).toBe('switch')
    expect(s.attrs['aria-checked']).toBe('false')
    expect(s.children.map((c) => c.classes.join(','))).toEqual([
      'sg-switch-inner',
      'sg-switch-handle',
    ])
  })

  it('SgSlider', () => {
    // React: <div class="sg-slider"> <div class="sg-slider-rail"/>
    //   <div class="sg-slider-track" /> <div class="sg-slider-handle" role="slider" /> </div>
    const w = mount(SgSlider)
    const s = rootShape(w)
    expect(s.tag).toBe('div')
    expect(s.classes).toContain('sg-slider')
    const handle = (function find(node: DomShape): DomShape | null {
      if (node.attrs.role === 'slider') return node
      for (const c of node.children) {
        const r = find(c)
        if (r) return r
      }
      return null
    })(s)
    expect(handle).not.toBeNull()
  })

  it('SgRate', () => {
    // React: <div class="sg-rate" role="radiogroup">
    //   <div class="sg-rate-item ..." role="radio" aria-checked />
    //   …
    // </div>
    const w = mount(SgRate, { props: { count: 3 } })
    const s = rootShape(w)
    expect(s.classes).toContain('sg-rate')
    expect(s.attrs.role).toBe('radiogroup')
    const items = s.children.filter((c) => c.attrs.role === 'radio')
    expect(items.length).toBe(3)
  })

  // ── Display ──────────────────────────────────────────────────────────────

  it('SgTag (default)', () => {
    // React: <span class="sg-tag sg-tag-default">{children}</span>
    const w = mount(SgTag, { slots: { default: 'X' } })
    expect(rootShape(w)).toEqual({
      tag: 'span',
      attrs: {},
      classes: ['sg-tag', 'sg-tag-default'],
      children: [],
    })
  })

  it('SgTag (closable, success, borderless)', () => {
    const w = mount(SgTag, {
      props: { color: 'success', closable: true, bordered: false },
      slots: { default: 'X' },
    })
    const s = rootShape(w)
    expect(s.classes).toEqual(['sg-tag', 'sg-tag-borderless', 'sg-tag-success'])
    const close = s.children[0]
    expect(close.classes).toEqual(['sg-tag-close'])
    expect(close.attrs.role).toBe('button')
  })

  it('SgBadge (count over child)', () => {
    // React: <span class="sg-badge">{children}<sup class="sg-badge-count" aria-label /></span>
    const w = mount(SgBadge, { props: { count: 5 }, slots: { default: 'A' } })
    const s = rootShape(w)
    expect(s.tag).toBe('span')
    expect(s.classes).toEqual(['sg-badge'])
    const sup = s.children.find((c) => c.tag === 'sup')
    expect(sup).toBeDefined()
    expect(sup!.classes).toEqual(['sg-badge-count'])
    expect(sup!.attrs['aria-label']).toBe('5')
  })

  it('SgBadge (status standalone)', () => {
    // React: <span class="sg-badge-status">
    //          <span class="sg-badge-status-dot sg-badge-status-success" />
    //          <span class="sg-badge-status-text">…</span>
    //        </span>
    const w = mount(SgBadge, { props: { status: 'success', text: 'OK' } })
    const s = rootShape(w)
    expect(s.tag).toBe('span')
    expect(s.classes).toEqual(['sg-badge-status'])
    const dot = s.children[0]
    expect(dot.classes).toEqual(['sg-badge-status-dot', 'sg-badge-status-success'])
    const text = s.children[1]
    expect(text.classes).toEqual(['sg-badge-status-text'])
  })

  it('SgAvatar (text, default size)', () => {
    // React: <span class="sg-avatar sg-avatar-circle sg-avatar-default" role="img">
    //          <span class="sg-avatar-text">…</span>
    //        </span>
    const w = mount(SgAvatar, { slots: { default: 'A' } })
    const s = rootShape(w)
    expect(s.tag).toBe('span')
    expect(s.classes).toEqual(['sg-avatar', 'sg-avatar-circle', 'sg-avatar-default'])
    expect(s.attrs.role).toBe('img')
    expect(s.children[0].classes).toEqual(['sg-avatar-text'])
  })

  it('SgAvatar (image, square, large)', () => {
    const w = mount(SgAvatar, { props: { src: 'x.png', alt: 'a', shape: 'square', size: 'large' } })
    const s = rootShape(w)
    expect(s.classes).toEqual(['sg-avatar', 'sg-avatar-large', 'sg-avatar-square'])
    expect(s.children[0].tag).toBe('img')
    expect(s.children[0].classes).toEqual(['sg-avatar-image'])
  })

  it('SgSkeleton (default)', () => {
    // React: <div class="sg-skeleton" aria-busy="true" aria-label="Loading">
    //          <div class="sg-skeleton-content">
    //            <div class="sg-skeleton-title" />
    //            <ul class="sg-skeleton-paragraph"><li/><li/><li/></ul>
    //          </div>
    //        </div>
    const w = mount(SgSkeleton)
    const s = rootShape(w)
    expect(s.tag).toBe('div')
    expect(s.classes).toEqual(['sg-skeleton'])
    expect(s.attrs['aria-busy']).toBe('true')
    expect(s.attrs['aria-label']).toBe('Loading')
    const content = s.children.find((c) => c.classes.includes('sg-skeleton-content'))
    expect(content).toBeDefined()
    expect(content!.children.find((c) => c.classes.includes('sg-skeleton-title'))).toBeDefined()
    expect(content!.children.find((c) => c.classes.includes('sg-skeleton-paragraph'))).toBeDefined()
  })

  it('SgSkeleton (avatar + active)', () => {
    const w = mount(SgSkeleton, { props: { active: true, avatar: true } })
    const s = rootShape(w)
    expect(s.classes).toEqual(['sg-skeleton', 'sg-skeleton-active', 'sg-skeleton-with-avatar'])
    const header = s.children.find((c) => c.classes.includes('sg-skeleton-header'))
    expect(header).toBeDefined()
    const avatar = header!.children[0]
    expect(avatar.classes).toEqual(['sg-skeleton-avatar', 'sg-skeleton-avatar-circle'])
  })

  it('SgProgress (line, normal)', () => {
    // React: <div class="sg-progress sg-progress-line sg-progress-normal sg-progress-default"
    //          role="progressbar" aria-valuenow="42">
    //          <div class="sg-progress-outer"><div class="sg-progress-inner">
    //            <div class="sg-progress-bg"/>
    //          </div></div>
    //          <span class="sg-progress-text">42%</span>
    //        </div>
    const w = mount(SgProgress, { props: { percent: 42 } })
    const s = rootShape(w)
    expect(s.classes).toEqual([
      'sg-progress',
      'sg-progress-default',
      'sg-progress-line',
      'sg-progress-normal',
    ])
    expect(s.attrs.role).toBe('progressbar')
    expect(s.attrs['aria-valuenow']).toBe('42')
    expect(s.children.find((c) => c.classes.includes('sg-progress-outer'))).toBeDefined()
    expect(s.children.find((c) => c.classes.includes('sg-progress-text'))).toBeDefined()
  })

  it('SgProgress (line, 100% → success)', () => {
    const w = mount(SgProgress, { props: { percent: 100 } })
    expect(rootShape(w).classes).toEqual([
      'sg-progress',
      'sg-progress-default',
      'sg-progress-line',
      'sg-progress-success',
    ])
  })

  it('SgProgress (circle)', () => {
    // React: <div class="sg-progress sg-progress-circle sg-progress-normal" role="progressbar">
    //          <svg> <circle class="sg-progress-circle-trail" /> <circle class="sg-progress-circle-path" /> </svg>
    //          <span class="sg-progress-circle-text">…</span>
    //        </div>
    const w = mount(SgProgress, { props: { type: 'circle', percent: 60 } })
    const s = rootShape(w)
    expect(s.classes).toEqual(['sg-progress', 'sg-progress-circle', 'sg-progress-normal'])
    expect(s.attrs.role).toBe('progressbar')
    const svg = s.children.find((c) => c.tag === 'svg')
    expect(svg).toBeDefined()
    expect(svg!.children.find((c) => c.classes.includes('sg-progress-circle-trail'))).toBeDefined()
    expect(svg!.children.find((c) => c.classes.includes('sg-progress-circle-path'))).toBeDefined()
    expect(s.children.find((c) => c.classes.includes('sg-progress-circle-text'))).toBeDefined()
  })

  it('SgEmpty', () => {
    // React: <div class="sg-empty" role="status">
    //          <div class="sg-empty-image"><svg/></div>
    //          <p class="sg-empty-description">…</p>
    //        </div>
    const w = mount(SgEmpty)
    const s = rootShape(w)
    expect(s.tag).toBe('div')
    expect(s.classes).toEqual(['sg-empty'])
    expect(s.attrs.role).toBe('status')
    expect(s.children[0].classes).toEqual(['sg-empty-image'])
    expect(s.children[1].tag).toBe('p')
    expect(s.children[1].classes).toEqual(['sg-empty-description'])
  })

  it('SgResult (success)', () => {
    // React: <div class="sg-result sg-result-success" role="status" aria-live="polite">
    //          <div class="sg-result-icon"><svg/></div>
    //          <div class="sg-result-title">…</div>
    //        </div>
    const w = mount(SgResult, { props: { status: 'success', title: 'OK' } })
    const s = rootShape(w)
    expect(s.classes).toEqual(['sg-result', 'sg-result-success'])
    expect(s.attrs.role).toBe('status')
    expect(s.attrs['aria-live']).toBe('polite')
    expect(s.children.find((c) => c.classes.includes('sg-result-icon'))).toBeDefined()
    expect(s.children.find((c) => c.classes.includes('sg-result-title'))).toBeDefined()
  })

  // ── Feedback / Loading ───────────────────────────────────────────────────

  it('SgSpin (standalone, idle)', () => {
    // React: <span class="sg-spin-standalone">
    //          <span class="sg-spin sg-spin-default" role="status" aria-live="polite" aria-label="Loading" />
    //        </span>
    const w = mount(SgSpin)
    const s = rootShape(w)
    expect(s.tag).toBe('span')
    expect(s.classes).toEqual(['sg-spin-standalone'])
    const inner = s.children[0]
    expect(inner.tag).toBe('span')
    expect(inner.classes).toEqual(['sg-spin', 'sg-spin-default'])
    expect(inner.attrs.role).toBe('status')
    expect(inner.attrs['aria-live']).toBe('polite')
    expect(inner.attrs['aria-label']).toBe('Loading')
  })

  it('SgSpin (with children)', () => {
    // React: <div class="sg-spin-container">
    //          <div class="sg-spin-overlay"><span class="sg-spin sg-spin-default" .../></div>
    //          <div class="sg-spin-blur">{children}</div>
    //        </div>
    const w = mount(SgSpin, { slots: { default: '<p>x</p>' } })
    const s = rootShape(w)
    expect(s.tag).toBe('div')
    expect(s.classes).toEqual(['sg-spin-container'])
    expect(s.children[0].classes).toEqual(['sg-spin-overlay'])
    expect(s.children[1].classes).toEqual(['sg-spin-blur'])
  })

  it('SgTooltip (idle, hidden popover)', () => {
    // React: <div class="sg-tooltip-wrapper">{children}</div>
    // Vue:   <span class="sg-tooltip-wrapper">{children}</span>
    // Documented exception #3 (inline span vs div block) — both adapters apply
    // identical .sg-tooltip-wrapper styling and ARIA wiring, only the host
    // element differs. Default Tag stays span on Vue to keep tooltip flow inline.
    const w = mount(SgTooltip, {
      props: { title: 'hi' },
      slots: { default: '<button>btn</button>' },
    })
    const s = rootShape(w)
    expect(s.tag === 'div' || s.tag === 'span').toBe(true)
    expect(s.classes).toEqual(['sg-tooltip-wrapper'])
  })

  // ── Navigation ───────────────────────────────────────────────────────────

  it('SgTabs (card, default)', () => {
    // React: <div class="sg-tabs sg-tabs-middle sg-tabs-card">
    //          <div class="sg-tabs-nav" role="tablist">
    //            <button role="tab" class="sg-tabs-tab sg-tabs-tab-active" />
    //            …
    //          </div>
    //          <div class="sg-tabs-content">
    //            <div role="tabpanel" class="sg-tabs-panel" />
    //          </div>
    //        </div>
    const w = mount(SgTabs, {
      props: {
        items: [
          { key: 'a', label: 'A' },
          { key: 'b', label: 'B' },
        ],
      },
    })
    const s = rootShape(w)
    expect(s.classes).toContain('sg-tabs')
    expect(s.classes).toContain('sg-tabs-card')
    const nav = s.children.find((c) => c.attrs.role === 'tablist')
    expect(nav).toBeDefined()
    expect(nav!.classes).toContain('sg-tabs-nav')
    const tabs = nav!.children.filter((c) => c.attrs.role === 'tab')
    expect(tabs.length).toBe(2)
  })

  it('SgBreadcrumb', () => {
    // React: <nav class="sg-breadcrumb" aria-label="Breadcrumb">
    //          <span class="sg-breadcrumb-link"|"sg-breadcrumb-current"/>
    //          <span class="sg-breadcrumb-separator">/</span>
    //          …
    //        </nav>
    // Both adapters render flat children directly under <nav>, no wrapping <ol>.
    const w = mount(SgBreadcrumb, { props: { items: [{ title: 'A' }, { title: 'B' }] } })
    const s = rootShape(w)
    expect(s.tag).toBe('nav')
    expect(s.classes).toEqual(['sg-breadcrumb'])
    expect(s.attrs['aria-label']).toBe('Breadcrumb')
    const links = s.children.filter(
      (c) =>
        c.classes.includes('sg-breadcrumb-link') || c.classes.includes('sg-breadcrumb-current'),
    )
    expect(links.length).toBe(2)
    expect(s.children.find((c) => c.classes.includes('sg-breadcrumb-separator'))).toBeDefined()
  })

  it('SgPagination (basic)', () => {
    // React: <nav class="sg-pagination" aria-label="Pagination">
    //          <button class="sg-pagination-item sg-pagination-prev"/>
    //          <button class="sg-pagination-item …"/>
    //          <button class="sg-pagination-item sg-pagination-next"/>
    //        </nav>
    const w = mount(SgPagination, { props: { current: 1, total: 50 } })
    const s = rootShape(w)
    expect(s.tag).toBe('nav')
    expect(s.classes).toContain('sg-pagination')
    expect(s.attrs['aria-label']).toBe('Pagination')
    expect(s.children.find((c) => c.classes.includes('sg-pagination-prev'))).toBeDefined()
    expect(s.children.find((c) => c.classes.includes('sg-pagination-next'))).toBeDefined()
  })

  it('SgSteps (horizontal)', () => {
    // React: <div class="sg-steps sg-steps-horizontal sg-steps-default">
    //          <div class="sg-step sg-step-finish"/>…
    //        </div>
    const w = mount(SgSteps, {
      props: {
        items: [{ title: 'A' }, { title: 'B' }],
        current: 0,
      },
    })
    const s = rootShape(w)
    expect(s.classes).toContain('sg-steps')
    expect(s.classes).toContain('sg-steps-horizontal')
  })

  it('SgSegmented', () => {
    // React: <div class="sg-segmented sg-segmented-middle" role="radiogroup">
    //          <label class="sg-segmented-item ..."><input type="radio" .../></label>
    //        </div>
    const w = mount(SgSegmented, { props: { options: ['A', 'B'] } })
    const s = rootShape(w)
    expect(s.classes).toContain('sg-segmented')
    expect(s.attrs.role).toBe('radiogroup')
  })

  it('SgMenu (vertical)', () => {
    // React: <ul class="sg-menu sg-menu-vertical sg-menu-light" role="menu">
    //          <li class="sg-menu-item" role="menuitem" />…
    //        </ul>
    const w = mount(SgMenu, { props: { items: [{ key: 'a', label: 'A' }] } })
    const s = rootShape(w)
    expect(s.tag).toBe('ul')
    expect(s.classes).toContain('sg-menu')
    expect(s.classes).toContain('sg-menu-vertical')
    expect(s.classes).toContain('sg-menu-light')
    expect(s.attrs.role).toBe('menu')
  })

  it('SgDropdown (closed)', () => {
    // React: <div class="sg-dropdown-wrapper">…</div>
    const w = mount(SgDropdown, {
      props: { items: [{ key: 'a', label: 'A' }] },
      slots: { default: '<button>btn</button>' },
    })
    const s = rootShape(w)
    expect(s.tag).toBe('div')
    expect(s.classes).toContain('sg-dropdown-wrapper')
    const trigger = s.children.find((c) => c.classes.includes('sg-dropdown-trigger'))
    expect(trigger).toBeDefined()
    expect(trigger!.attrs['aria-expanded']).toBe('false')
    expect(trigger!.attrs['aria-haspopup']).toBe('menu')
  })

  // ── Containers / structure ───────────────────────────────────────────────

  it('SgCollapse', () => {
    // React: <div class="sg-collapse sg-collapse-bordered sg-collapse-middle">
    //          <div class="sg-collapse-panel">
    //            <button class="sg-collapse-header" aria-expanded />
    //            …
    //          </div>
    //        </div>
    const w = mount(SgCollapse, {
      props: { items: [{ key: 'a', label: 'A', content: 'B' }] },
    })
    const s = rootShape(w)
    expect(s.tag).toBe('div')
    expect(s.classes).toContain('sg-collapse')
    const panel = s.children.find((c) => c.classes.includes('sg-collapse-panel'))
    expect(panel).toBeDefined()
    expect(panel!.children.find((c) => c.classes.includes('sg-collapse-header'))).toBeDefined()
  })

  it('SgDescriptions', () => {
    // React: <div class="sg-descriptions sg-descriptions-middle">
    //          <table class="sg-descriptions-table">…</table>
    //        </div>
    const w = mount(SgDescriptions, {
      props: { items: [{ key: 'a', label: 'L', value: 'V' }] },
    })
    const s = rootShape(w)
    expect(s.classes).toContain('sg-descriptions')
    expect(s.children.find((c) => c.classes.includes('sg-descriptions-table'))).toBeDefined()
  })

  it('SgTimeline', () => {
    // React: <ul class="sg-timeline">
    //          <li class="sg-timeline-item">
    //            <div class="sg-timeline-item-tail" />
    //            <div class="sg-timeline-item-head" />
    //            <div class="sg-timeline-item-content" />
    //          </li>…
    //        </ul>
    const w = mount(SgTimeline, { props: { items: [{ content: 'A' }] } })
    const s = rootShape(w)
    expect(s.tag).toBe('ul')
    expect(s.classes).toContain('sg-timeline')
  })

  it('SgCarousel', () => {
    // React: <div class="sg-carousel sg-carousel-dots-bottom">
    //          <div class="sg-carousel-container">
    //            <div class="sg-carousel-track">…</div>
    //          </div>
    //          <div class="sg-carousel-dots">…</div>?
    //        </div>
    const w = mount(SgCarousel, {
      props: {
        items: [
          { key: '1', content: 'A' },
          { key: '2', content: 'B' },
        ],
      },
    })
    const s = rootShape(w)
    expect(s.classes).toContain('sg-carousel')
    expect(s.children.find((c) => c.classes.includes('sg-carousel-container'))).toBeDefined()
  })

  // ── Tooltip-like ─────────────────────────────────────────────────────────

  it('SgPopconfirm (idle)', () => {
    // React: <div class="sg-popconfirm-wrapper">…</div>
    // Vue also renders <div> — parity matches.
    const w = mount(SgPopconfirm, {
      props: { title: 'sure?' },
      slots: { default: '<button>btn</button>' },
    })
    const s = rootShape(w)
    expect(s.tag).toBe('div')
    expect(s.classes).toContain('sg-popconfirm-wrapper')
  })

  // ── Specialty form controls (T-Vue-Cleanup parity) ───────────────────────

  it('SgInputPassword (default)', () => {
    // React: <div style={style}>
    //          <span class="sg-input-password-wrapper sg-input-password-wrapper-middle">
    //            <input class="sg-input sg-input-password sg-input-middle" .../>
    //            <button class="sg-input-password-toggle" aria-label="Show password">○</button>
    //          </span>
    //        </div>
    // Vue mirrors the same layout. After T-Vue-Cleanup customClass is gone,
    // user `class` falls through to the outer <div> (Vue idiom) — `sg-*`
    // classes on the inner <span> are unchanged from React.
    const w = mount(SgInputPassword)
    const s = rootShape(w)
    expect(s.tag).toBe('div')
    expect(s.classes).toEqual([])
    const wrapper = s.children.find((c) => c.classes.includes('sg-input-password-wrapper'))
    expect(wrapper).toBeDefined()
    expect(wrapper!.classes).toEqual([
      'sg-input-password-wrapper',
      'sg-input-password-wrapper-middle',
    ])
    const input = wrapper!.children.find((c) => c.tag === 'input')
    expect(input).toBeDefined()
    expect(input!.classes).toEqual(['sg-input', 'sg-input-middle', 'sg-input-password'])
    const toggle = wrapper!.children.find((c) => c.classes.includes('sg-input-password-toggle'))
    expect(toggle).toBeDefined()
  })

  it('SgSearchInput (default)', () => {
    // React: <span class="sg-search-input sg-search-input-middle">
    //          <span class="sg-search-input-icon">⌕</span>
    //          <input class="sg-input sg-input-middle sg-search-input-field" .../>
    //        </span>
    const w = mount(SgSearchInput)
    const s = rootShape(w)
    expect(s.tag).toBe('span')
    expect(s.classes).toEqual(['sg-search-input', 'sg-search-input-middle'])
    const icon = s.children.find((c) => c.classes.includes('sg-search-input-icon'))
    expect(icon).toBeDefined()
    const input = s.children.find((c) => c.tag === 'input')
    expect(input).toBeDefined()
    expect(input!.classes).toEqual(['sg-input', 'sg-input-middle', 'sg-search-input-field'])
  })

  it('SgSearchInput (with enterButton, loading)', () => {
    // React extra classes: sg-search-input-with-button, sg-search-input-loading.
    const w = mount(SgSearchInput, { props: { enterButton: true, loading: true } })
    const s = rootShape(w)
    expect(s.classes).toEqual(
      expect.arrayContaining([
        'sg-search-input',
        'sg-search-input-middle',
        'sg-search-input-with-button',
        'sg-search-input-loading',
      ]),
    )
    const btn = s.children.find((c) => c.classes.includes('sg-search-input-btn'))
    expect(btn).toBeDefined()
  })

  it('SgTagInput (default)', () => {
    // React: <div class="sg-tag-input sg-tag-input-middle">
    //          <input class="sg-tag-input-field" .../>
    //        </div>
    const w = mount(SgTagInput)
    const s = rootShape(w)
    expect(s.tag).toBe('div')
    expect(s.classes).toEqual(['sg-tag-input', 'sg-tag-input-middle'])
    const input = s.children.find((c) => c.tag === 'input')
    expect(input).toBeDefined()
    expect(input!.classes).toEqual(['sg-tag-input-field'])
  })

  it('SgTagInput (with values, success colour)', () => {
    // React tags get sg-tag + sg-tag-<color>. Close button: sg-tag-close.
    const w = mount(SgTagInput, {
      props: { value: ['a', 'b'], tagColor: 'success' },
    })
    const s = rootShape(w)
    const tags = s.children.filter((c) => c.classes.includes('sg-tag'))
    expect(tags.length).toBe(2)
    for (const t of tags) {
      expect(t.classes).toEqual(['sg-tag', 'sg-tag-success'])
      const close = t.children.find((c) => c.classes.includes('sg-tag-close'))
      expect(close).toBeDefined()
      expect(close!.attrs.role).toBe('button')
    }
  })

  it('SgPinInput (default)', () => {
    // React: <div class="sg-pin-input sg-pin-input-middle" role="group" aria-label="PIN input">
    //          <input class="sg-pin-input-cell sg-pin-input-cell-middle" .../> × length
    //        </div>
    const w = mount(SgPinInput)
    const s = rootShape(w)
    expect(s.tag).toBe('div')
    expect(s.classes).toEqual(['sg-pin-input', 'sg-pin-input-middle'])
    expect(s.attrs.role).toBe('group')
    expect(s.attrs['aria-label']).toBe('PIN input')
    const cells = s.children.filter((c) => c.classes.includes('sg-pin-input-cell'))
    expect(cells.length).toBe(6)
    for (const cell of cells) {
      expect(cell.tag).toBe('input')
      expect(cell.classes).toEqual(['sg-pin-input-cell', 'sg-pin-input-cell-middle'])
    }
  })

  it('SgInlineEdit (view, empty)', () => {
    // React (view, empty value): <span class="sg-inline-edit-view sg-inline-edit-view-middle
    //                                         sg-inline-edit-view-placeholder"
    //                                  role="button" tabindex="0">
    //                              {placeholder}
    //                              <span class="sg-inline-edit-pencil">✎</span>
    //                            </span>
    // Vue InlineEdit uses <template v-if> at the top level, so the SFC is
    // multi-root from Test Utils' viewpoint. Probe the actual sg-* root via
    // a query selector.
    const w = mount(SgInlineEdit)
    const node = w.find('.sg-inline-edit-view').element as Element
    const s = prune(shape(node))
    expect(s.tag).toBe('span')
    expect(s.classes).toEqual([
      'sg-inline-edit-view',
      'sg-inline-edit-view-middle',
      'sg-inline-edit-view-placeholder',
    ])
    expect(s.attrs.role).toBe('button')
    const pencil = s.children.find((c) => c.classes.includes('sg-inline-edit-pencil'))
    expect(pencil).toBeDefined()
  })

  it('SgInlineEdit (view, with value, disabled)', () => {
    // disabled drops the pencil, adds sg-inline-edit-view-disabled, removes
    // placeholder class.
    const w = mount(SgInlineEdit, { props: { value: 'hello', disabled: true } })
    const node = w.find('.sg-inline-edit-view').element as Element
    const s = prune(shape(node))
    expect(s.classes).toEqual([
      'sg-inline-edit-view',
      'sg-inline-edit-view-disabled',
      'sg-inline-edit-view-middle',
    ])
    expect(s.children.find((c) => c.classes.includes('sg-inline-edit-pencil'))).toBeUndefined()
  })

  it('SgInputGroup (default, with input child)', () => {
    // React: <span class="sg-input-group sg-input-group-middle sg-input-group-compact">
    //          {children}
    //        </span>
    // With before / after slots an additional <span class="sg-input-group-addon">
    // wraps each addon — same as Vue.
    const w = mount(SgInputGroup, {
      slots: { default: '<input class="sg-input" />' },
    })
    const s = rootShape(w)
    expect(s.tag).toBe('span')
    expect(s.classes).toEqual(['sg-input-group', 'sg-input-group-compact', 'sg-input-group-middle'])
  })

  it('SgInputGroup (with before/after addons)', () => {
    const w = mount(SgInputGroup, {
      slots: {
        before: '<span>$</span>',
        default: '<input class="sg-input" />',
        after: '<span>.00</span>',
      },
    })
    const s = rootShape(w)
    const addons = s.children.filter((c) => c.classes.includes('sg-input-group-addon'))
    expect(addons.length).toBe(2)
  })
})
