import { describe, it, expect } from 'vitest'
import { defineComponent, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import SgTree from '../../components/complex/Tree/Tree.vue'

const sampleData = [
  {
    key: 'a',
    title: 'Alpha',
    children: [
      { key: 'a-1', title: 'Alpha 1' },
      { key: 'a-2', title: 'Alpha 2' },
    ],
  },
  {
    key: 'b',
    title: 'Beta',
    children: [{ key: 'b-1', title: 'Beta 1' }],
  },
]

describe('SgTree', () => {
  it('renders top-level nodes by default (collapsed)', () => {
    const Wrapper = defineComponent({
      components: { SgTree },
      template: `<SgTree :tree-data="data" />`,
      data() {
        return { data: sampleData }
      },
    })
    const wrapper = mount(Wrapper)
    expect(wrapper.findAll('.sg-tree-node').length).toBe(2)
    expect(wrapper.text()).toContain('Alpha')
    expect(wrapper.text()).toContain('Beta')
  })

  it('expands when defaultExpandAll is true', () => {
    const Wrapper = defineComponent({
      components: { SgTree },
      template: `<SgTree :tree-data="data" default-expand-all />`,
      data() {
        return { data: sampleData }
      },
    })
    const wrapper = mount(Wrapper)
    expect(wrapper.findAll('.sg-tree-node').length).toBe(5)
  })

  it('clicking switcher toggles expand and emits expand event', async () => {
    let lastEvent: unknown[] = []
    const Wrapper = defineComponent({
      components: { SgTree },
      methods: {
        onExpand(...args: unknown[]) {
          lastEvent = args
        },
      },
      template: `<SgTree :tree-data="data" @expand="onExpand" />`,
      data() {
        return { data: sampleData }
      },
    })
    const wrapper = mount(Wrapper)
    const sw = wrapper
      .findAll('.sg-tree-switcher')
      .filter((n) => !n.classes('sg-tree-switcher-noop'))[0]
    await sw.trigger('click')
    expect(wrapper.findAll('.sg-tree-node').length).toBe(4)
    expect(Array.isArray(lastEvent[0])).toBe(true)
  })

  it('checkable mode shows checkboxes and emits check event', async () => {
    const Wrapper = defineComponent({
      components: { SgTree },
      data() {
        return { data: sampleData, lastChecked: [] as unknown[] }
      },
      methods: {
        onCheck(keys: unknown[]) {
          this.lastChecked = keys
        },
      },
      template: `<SgTree :tree-data="data" checkable default-expand-all @check="onCheck" />`,
    })
    const wrapper = mount(Wrapper)
    const checkboxes = wrapper.findAll('.sg-tree-checkbox')
    expect(checkboxes.length).toBeGreaterThan(0)
    // The visible checkbox is the SgCheckbox component (label + box); the
    // native <input> lives inside it. Trigger change on the input.
    await checkboxes[0].find('input[type="checkbox"]').trigger('change')
    expect((wrapper.vm as unknown as { lastChecked: string[] }).lastChecked.length).toBeGreaterThan(
      0,
    )
  })

  it('selectable click selects a node', async () => {
    const Wrapper = defineComponent({
      components: { SgTree },
      data() {
        return { data: sampleData, lastSelected: [] as unknown[] }
      },
      methods: {
        onSelect(keys: unknown[]) {
          this.lastSelected = keys
        },
      },
      template: `<SgTree :tree-data="data" default-expand-all @select="onSelect" />`,
    })
    const wrapper = mount(Wrapper)
    const titles = wrapper.findAll('.sg-tree-title')
    await titles[0].trigger('click')
    expect((wrapper.vm as unknown as { lastSelected: string[] }).lastSelected[0]).toBe('a')
  })

  it('search filters visible nodes', async () => {
    const Wrapper = defineComponent({
      components: { SgTree },
      data() {
        return { data: sampleData }
      },
      template: `<SgTree :tree-data="data" show-search default-expand-all />`,
    })
    const wrapper = mount(Wrapper)
    const initial = wrapper.findAll('.sg-tree-node').length
    expect(initial).toBe(5)
    const input = wrapper.find('.sg-tree-search-input')
    await input.setValue('Beta')
    await nextTick()
    // Filter should narrow visible nodes
    const after = wrapper.findAll('.sg-tree-node').length
    expect(after).toBeLessThan(initial)
  })

  it('shows empty state when treeData is empty', () => {
    const Wrapper = defineComponent({
      components: { SgTree },
      template: `<SgTree :tree-data="[]" :locale="{ emptyText: 'Empty here' }" />`,
    })
    const wrapper = mount(Wrapper)
    expect(wrapper.text()).toContain('Empty here')
  })

  it('keyboard navigation moves focus on ArrowDown', async () => {
    const Wrapper = defineComponent({
      components: { SgTree },
      template: `<SgTree :tree-data="data" default-expand-all />`,
      data() {
        return { data: sampleData }
      },
    })
    const wrapper = mount(Wrapper, { attachTo: document.body })
    const root = wrapper.find('[role="tree"]:not(.sg-tree)')
    await root.trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    expect(wrapper.find('.sg-tree-node-focused').exists()).toBe(true)
    wrapper.unmount()
  })

  // Regression: the drop position used to be derived downstream from the
  // re-emitted event's `currentTarget`, which is fragile — every drop reported
  // `0` (inside). It is now computed against the row element, so the cursor's
  // vertical position within the row maps to before (-1) / inside (0) / after (1).
  function mockRowRect(el: HTMLElement, top: number, height: number) {
    el.getBoundingClientRect = () =>
      ({
        top,
        bottom: top + height,
        height,
        left: 0,
        right: 0,
        width: 0,
        x: 0,
        y: top,
        toJSON() {},
      }) as DOMRect
  }

  it.each([
    { clientY: 2, expected: -1, label: 'top quarter → before' },
    { clientY: 20, expected: 0, label: 'middle → inside' },
    { clientY: 38, expected: 1, label: 'bottom quarter → after' },
  ])('reports drop position ($label)', async ({ clientY, expected }) => {
    let dropInfo: { dropPosition?: number } | null = null
    const Wrapper = defineComponent({
      components: { SgTree },
      template: `<SgTree :tree-data="data" draggable default-expand-all @drop="onDrop" />`,
      data() {
        return { data: sampleData }
      },
      methods: {
        onDrop(info: { dropPosition?: number }) {
          dropInfo = info
        },
      },
    })
    const wrapper = mount(Wrapper, { attachTo: document.body })
    const rows = wrapper.findAll('.sg-tree-node')
    // Order: a, a-1, a-2, b, b-1 — drag 'a-1' onto 'b' (different subtree).
    const dragRow = rows[1]
    const dropRow = rows[3]
    mockRowRect(dropRow.element as HTMLElement, 0, 40)

    await dragRow.trigger('dragstart')
    await dropRow.trigger('dragover', { clientY })
    await dropRow.trigger('drop', { clientY })

    expect(dropInfo).toBeTruthy()
    expect(dropInfo!.dropPosition).toBe(expected)
    wrapper.unmount()
  })
})
