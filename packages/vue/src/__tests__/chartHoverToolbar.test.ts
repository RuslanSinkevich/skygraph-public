import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import SgChartHoverToolbar from '../components/complex/Charts/ChartHoverToolbar.vue'
import {
  defaultChartActions,
  resolveChartActions,
  type ChartAction,
} from '../components/complex/Charts/chartActions'

function makeAction(id: string, label = id, hidden = false): ChartAction {
  return {
    id,
    label,
    icon: h('svg', { width: 16, height: 16 }),
    onClick: () => {},
    hidden,
  }
}

describe('SgChartHoverToolbar', () => {
  it('renders the wrapper toolbar with sg-chart-toolbar class and a button per action', () => {
    const actions = [makeAction('print'), makeAction('export', 'Export')]
    const wrapper = mount(SgChartHoverToolbar, {
      props: {
        visible: true,
        actions,
        getSvg: () => null,
      },
    })
    const toolbar = wrapper.find('div.sg-chart-toolbar')
    expect(toolbar.exists()).toBe(true)
    expect(toolbar.attributes('role')).toBe('toolbar')
    expect(toolbar.attributes('aria-label')).toBe('Chart actions')
    expect(toolbar.attributes('data-sg-toolbar')).toBe('visible')

    const buttons = wrapper.findAll('button.sg-chart-toolbar-button')
    expect(buttons.length).toBe(2)
    expect(buttons[0].attributes('data-sg-action')).toBe('print')
    expect(buttons[1].attributes('aria-label')).toBe('Export')
  })

  it('omits hidden actions and reflects visibility through data-sg-toolbar', () => {
    const actions = [makeAction('a'), makeAction('b', 'B', true)]
    const wrapper = mount(SgChartHoverToolbar, {
      props: { visible: false, actions, getSvg: () => null },
    })
    expect(wrapper.findAll('button').length).toBe(1)
    expect(wrapper.attributes('data-sg-toolbar')).toBe('hidden')
    expect(wrapper.attributes('aria-hidden')).toBe('true')
  })

  it('does not render anything when every action is hidden', () => {
    const actions = [makeAction('only', 'only', true)]
    const wrapper = mount(SgChartHoverToolbar, {
      props: { visible: true, actions, getSvg: () => null },
    })
    expect(wrapper.find('div.sg-chart-toolbar').exists()).toBe(false)
  })

  it('passes the SVG + fileName to onClick via the getSvg callback', async () => {
    let captured: { svg: SVGSVGElement | null; fileName?: string } | null = null
    const fakeSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement
    const actions: ChartAction[] = [
      {
        id: 'snap',
        label: 'Snap',
        icon: h('svg'),
        onClick: (ctx) => {
          captured = { svg: ctx.svg, fileName: ctx.fileName }
        },
      },
    ]
    const wrapper = mount(SgChartHoverToolbar, {
      props: {
        visible: true,
        actions,
        fileName: 'demo',
        getSvg: () => fakeSvg,
      },
    })
    await wrapper.find('button').trigger('click')
    expect(captured).not.toBeNull()
    expect(captured!.svg).toBe(fakeSvg)
    expect(captured!.fileName).toBe('demo')
  })
})

describe('chartActions helpers', () => {
  it('defaultChartActions returns the React-parity set of ids', () => {
    const list = defaultChartActions({})
    expect(list.map((a) => a.id)).toEqual(['print', 'downloadSvg', 'downloadPng'])
  })

  it('defaultChartActions adds resetBrush when brushReset is provided', () => {
    const list = defaultChartActions({ brushReset: () => {} })
    expect(list.map((a) => a.id)).toContain('resetBrush')
  })

  it('resolveChartActions handles boolean / array / undefined like React', () => {
    expect(resolveChartActions(undefined, {})).toBeNull()
    expect(resolveChartActions(false, {})).toBeNull()
    const dflt = resolveChartActions(true, {})
    expect(Array.isArray(dflt)).toBe(true)
    const custom = [makeAction('x')]
    expect(resolveChartActions(custom, {})).toBe(custom)
  })
})
