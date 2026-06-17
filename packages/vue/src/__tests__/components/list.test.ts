import { describe, it, expect } from 'vitest'
import { defineComponent, ref } from 'vue'
import type { Component } from 'vue'
import { mount } from '@vue/test-utils'
import SgListImport from '../../components/complex/List/List.vue'

// `<script setup generic>` widens the Vue SFC type in ways `vue-tsc` 2.x
// rejects when you place the component into another `defineComponent(
// { components })`. We coerce to the framework-level `Component` type so
// the test scaffolding stays simple.
const SgList = SgListImport as unknown as Component

describe('SgList', () => {
  it('renders items from dataSource via default slot', async () => {
    const Wrapper = defineComponent({
      components: { SgList },
      setup() {
        return { items: ['a', 'b', 'c'] }
      },
      template: `
        <SgList :dataSource="items">
          <template #default="{ item }"><span class="row">{{ item }}</span></template>
        </SgList>
      `,
    })
    const wrapper = mount(Wrapper)
    expect(wrapper.findAll('.row').length).toBe(3)
    expect(wrapper.text()).toContain('abc')
  })

  it('shows empty placeholder when dataSource is empty', () => {
    const Wrapper = defineComponent({
      components: { SgList },
      template: `
        <SgList :dataSource="[]" :locale="{ emptyText: 'Nothing here' }">
          <template #default="{ item }"><span>{{ item }}</span></template>
        </SgList>
      `,
    })
    const wrapper = mount(Wrapper)
    expect(wrapper.text()).toContain('Nothing here')
  })

  it('paginates with `pagination.pageSize` and emits page change', async () => {
    const items = Array.from({ length: 25 }, (_, i) => `item-${i}`)
    const onChangeSeen = ref<{ page: number; pageSize: number } | null>(null)
    const Wrapper = defineComponent({
      components: { SgList },
      setup() {
        return { items, onChangeSeen }
      },
      template: `
        <SgList
          :dataSource="items"
          :pagination="{ pageSize: 10 }"
          @page-change="(page, pageSize) => { onChangeSeen = { page, pageSize } }"
        >
          <template #default="{ item }"><span class="row">{{ item }}</span></template>
        </SgList>
      `,
    })
    const wrapper = mount(Wrapper)
    expect(wrapper.findAll('.row').length).toBe(10)

    const next = wrapper.find('.sg-pagination-next')
    await next.trigger('click')
    expect(wrapper.findAll('.row').length).toBe(10)
    expect(onChangeSeen.value?.page).toBe(2)
  })

  it('supports selectable rows', async () => {
    const Wrapper = defineComponent({
      components: { SgList },
      data() {
        return {
          items: ['a', 'b', 'c'],
          changes: [] as Array<{ keys: number[]; items: string[] }>,
        }
      },
      template: `
        <SgList
          :dataSource="items"
          selectable
          @selection-change="(keys, rows) => changes.push({ keys, items: rows })"
        >
          <template #default="{ item }"><span class="row">{{ item }}</span></template>
        </SgList>
      `,
    })
    const wrapper = mount(Wrapper)
    const rows = wrapper.findAll('.sg-list-item-selectable')
    expect(rows.length).toBe(3)
    await rows[0].trigger('click')
    expect((wrapper.vm as unknown as { changes: { keys: number[] }[] }).changes.length).toBe(1)
    expect((wrapper.vm as unknown as { changes: { keys: number[] }[] }).changes[0].keys).toEqual([
      0,
    ])
  })

  it('header / footer slots render', () => {
    const Wrapper = defineComponent({
      components: { SgList },
      template: `
        <SgList :dataSource="['x']">
          <template #default="{ item }">{{ item }}</template>
          <template #header><div class="hdr">Top</div></template>
          <template #footer><div class="ftr">Bottom</div></template>
        </SgList>
      `,
    })
    const wrapper = mount(Wrapper)
    expect(wrapper.find('.hdr').exists()).toBe(true)
    expect(wrapper.find('.ftr').exists()).toBe(true)
  })

  it('grid layout sets grid CSS variable', () => {
    const Wrapper = defineComponent({
      components: { SgList },
      template: `
        <SgList :dataSource="[1, 2, 3]" :grid="{ column: 3 }">
          <template #default="{ item }"><span>{{ item }}</span></template>
        </SgList>
      `,
    })
    const wrapper = mount(Wrapper)
    expect(wrapper.find('.sg-list-grid').exists()).toBe(true)
  })
})
