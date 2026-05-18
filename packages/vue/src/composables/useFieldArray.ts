import { ref, computed, type ComputedRef } from 'vue'
import type { FormEngine } from '@skygraph/core'

export interface UseFieldArrayReturn {
  /** Reactive list of `{ key, index }` pairs — stable React-like keys for v-for. */
  fields: ComputedRef<{ key: string; index: number }[]>
  /** Append a new item at the end of the list. */
  append: (defaultValue?: unknown) => void
  /** Remove the item at `index`. */
  remove: (index: number) => void
  /** Move the item at `from` to position `to`. */
  move: (from: number, to: number) => void
  /** Replace the entire list with `values`. */
  replace: (values: unknown[]) => void
}

/**
 * Vue 3 composable parallel to React's `useFieldArray`.
 *
 * Tracks stable per-row keys for an array field at `name` and exposes
 * mutation helpers that go through the FormEngine list operations.
 */
export function useFieldArray(form: FormEngine, name: string): UseFieldArrayReturn {
  let counter = 0
  const genKey = () => `fa_${name}_${++counter}`

  const initial = form.getListValue(name)
  const keys = ref<string[]>(initial.map(() => genKey()))

  const fields = computed(() =>
    keys.value.map((key, index) => ({ key, index })),
  )

  const append = (defaultValue?: unknown) => {
    form.listAdd(name, defaultValue)
    keys.value = [...keys.value, genKey()]
  }

  const remove = (index: number) => {
    form.listRemove(name, index)
    keys.value = keys.value.filter((_, i) => i !== index)
  }

  const move = (from: number, to: number) => {
    form.listMove(name, from, to)
    const next = [...keys.value]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    keys.value = next
  }

  const replace = (values: unknown[]) => {
    const currentLen = form.getListValue(name).length
    for (let i = currentLen - 1; i >= 0; i--) {
      form.listRemove(name, i)
    }
    const newKeys: string[] = []
    for (const v of values) {
      form.listAdd(name, v)
      newKeys.push(genKey())
    }
    keys.value = newKeys
  }

  return { fields, append, remove, move, replace }
}
