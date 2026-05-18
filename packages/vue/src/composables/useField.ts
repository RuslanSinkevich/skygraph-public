import { ref, computed, onScopeDispose, type Ref, type ComputedRef } from 'vue'
import type { Core, FieldMeta, FormEngine } from '@skygraph/core'

// `FieldStatus` is not part of `@skygraph/core` public root export (it lives
// only in `./form` subpath); duplicate the literal union here to avoid forcing
// every consumer to import a subpath.
export type FieldStatus = 'success' | 'warning' | 'error' | 'validating' | undefined

export interface UseFieldReturn {
  /** Reactive current field value. */
  value: Ref<unknown>
  /** Reactive list of error messages. */
  errors: Ref<string[]>
  /** Reactive list of warning messages. */
  warnings: Ref<string[]>
  /** First error message or `null`. */
  error: ComputedRef<string | null>
  /** Whether the field has been blurred at least once. */
  touched: Ref<boolean>
  /** Whether the field value differs from its initial value. */
  dirty: Ref<boolean>
  /** Whether async validation is currently running. */
  validating: Ref<boolean>
  /** Derived status badge: `success` / `warning` / `error` / `validating` / `undefined`. */
  status: ComputedRef<FieldStatus>
  /** Mutation helper: write a new value. */
  onChange: (value: unknown) => void
  /** Mutation helper: notify the engine that the field lost focus. */
  onBlur: () => void
  /** Snapshot of the underlying meta record (errors/warnings/touched/...). */
  meta: Ref<FieldMeta>
}

/**
 * Vue 3 composable parallel to React's `useField`.
 *
 * Subscribes to the field's value path and meta paths under
 * `$meta.<name>.*`, exposing each as a Vue ref. Returns mutation helpers
 * (`onChange`, `onBlur`) that route through the FormEngine.
 */
export function useField(core: Core, form: FormEngine, name: string): UseFieldReturn {
  const value = ref<unknown>(form.getValue(name))
  const meta = ref<FieldMeta>({ ...form.getFieldState(name) }) as Ref<FieldMeta>
  const errors = ref<string[]>([...meta.value.errors])
  const warnings = ref<string[]>([...meta.value.warnings])
  const touched = ref<boolean>(meta.value.touched)
  const dirty = ref<boolean>(meta.value.dirty)
  const validating = ref<boolean>(meta.value.validating)

  const refreshMeta = () => {
    const m = form.getFieldState(name)
    meta.value = { ...m }
    errors.value = [...m.errors]
    warnings.value = [...m.warnings]
    touched.value = m.touched
    dirty.value = m.dirty
    validating.value = m.validating
  }

  const unsubs: Array<() => void> = []

  unsubs.push(
    core.subscribe(name, (v) => {
      value.value = v
    }),
  )
  for (const key of ['errors', 'warnings', 'touched', 'dirty', 'validating'] as const) {
    unsubs.push(
      core.subscribe(`$meta.${name}.${key}`, () => {
        refreshMeta()
      }),
    )
  }

  onScopeDispose(() => {
    for (const u of unsubs) u()
  })

  const onChange = (v: unknown) => {
    form.setValue(name, v)
  }
  const onBlur = () => {
    form.onFieldBlur(name)
  }

  return {
    value,
    errors,
    warnings,
    error: computed(() => errors.value[0] ?? null),
    touched,
    dirty,
    validating,
    status: computed<FieldStatus>(() => {
      if (validating.value) return 'validating'
      if (errors.value.length > 0) return 'error'
      if (warnings.value.length > 0) return 'warning'
      return undefined
    }),
    onChange,
    onBlur,
    meta,
  }
}
