import { describe, it, expect } from 'vitest'
import { defineComponent, h, ref, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { useTable } from '../../composables/useTable'

function harness<T>(setup: () => T) {
  let api!: T
  const Comp = defineComponent({
    setup() {
      api = setup()
      return () => h('div')
    },
  })
  const wrapper = mount(Comp)
  return { wrapper, get: () => api }
}

describe('useTable', () => {
  it('seeds rows from `data`', () => {
    const { get } = harness(() =>
      useTable({
        data: [
          { id: '1', data: { name: 'a' } },
          { id: '2', data: { name: 'b' } },
        ],
      }),
    )
    expect(get().visibleRows.value.length).toBe(2)
  })

  it('refreshes visibleRows after setSort', () => {
    const { get } = harness(() =>
      useTable({
        data: [
          { id: '1', data: { v: 2 } },
          { id: '2', data: { v: 1 } },
        ],
      }),
    )
    get().setSort('v', 'asc')
    expect(get().visibleRows.value[0].id).toBe('2')
  })

  it('addFilter narrows visibleRows', () => {
    const { get } = harness(() =>
      useTable({
        data: [
          { id: '1', data: { v: 1 } },
          { id: '2', data: { v: 2 } },
        ],
      }),
    )
    get().addFilter({ column: 'v', value: 2, operator: 'eq' })
    expect(get().visibleRows.value.length).toBe(1)
    expect(get().visibleRows.value[0].id).toBe('2')
  })

  it('clearFilters restores all rows', () => {
    const { get } = harness(() =>
      useTable({
        data: [
          { id: '1', data: { v: 1 } },
          { id: '2', data: { v: 2 } },
        ],
      }),
    )
    get().addFilter({ column: 'v', value: 1, operator: 'eq' })
    expect(get().visibleRows.value.length).toBe(1)
    get().clearFilters()
    expect(get().visibleRows.value.length).toBe(2)
  })

  it('reacts to swap of `data` ref', async () => {
    const data = ref([{ id: '1', data: { v: 1 } }])
    const { get } = harness(() => useTable({ data }))
    expect(get().visibleRows.value.length).toBe(1)
    data.value = [
      { id: '2', data: { v: 1 } },
      { id: '3', data: { v: 1 } },
    ]
    await nextTick()
    expect(get().visibleRows.value.length).toBe(2)
  })
})
