import { ref, onScopeDispose, type Ref } from 'vue'
import type { Core } from '@skygraph/core'

/**
 * Vue 3 composable parallel to React's `useWatch`.
 *
 * Returns a reactive ref tracking the value of `name` in the given Core
 * instance. Updates whenever someone writes to that path.
 */
export function useWatch<T = unknown>(core: Core, name: string): Ref<T> {
  const value = ref<T>(core.get(name) as T) as Ref<T>

  const unsub = core.subscribe(name, (v) => {
    value.value = v as T
  })

  onScopeDispose(() => {
    unsub()
  })

  return value
}
