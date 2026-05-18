import { ref, computed, onScopeDispose, type Ref, type ComputedRef } from 'vue'
import { createCore, createForm } from '@skygraph/core'
import type {
  Core,
  FormEngine,
  FormOptions,
  FormState,
  ValidationResult,
} from '@skygraph/core'

export interface UseFormOptions extends FormOptions {
  onSubmit?: (values: Record<string, unknown>) => void | Promise<void>
  onSubmitInvalid?: (errors: Record<string, string[]>) => void
}

export interface UseFormReturn {
  /** Underlying Core instance backing the form. */
  core: Core
  /** Engine instance — call `register`, `setValue`, etc. directly when needed. */
  form: FormEngine
  /** Reactive snapshot of `getFieldsValue()`. Updates on every form write. */
  values: Ref<Record<string, unknown>>
  /** Reactive snapshot of full form state (`isDirty` / `isValid` / `isSubmitting` / `isValidating`). */
  formState: Ref<FormState>
  /** Convenience computed: whether the form is currently submitting. */
  isSubmitting: ComputedRef<boolean>
  /** Convenience computed: whether the form is currently validating. */
  isValidating: ComputedRef<boolean>
  /** Convenience computed: whether the form has any dirty fields. */
  isDirty: ComputedRef<boolean>
  /** Convenience computed: whether the form has no validation errors. */
  isValid: ComputedRef<boolean>
  submit: () => Promise<void>
  reset: (values?: Record<string, unknown>) => void
  setFieldValue: (name: string, value: unknown) => void
  setFieldsValue: (values: Record<string, unknown>) => void
  getFieldValue: (name: string) => unknown
  getFieldsValue: () => Record<string, unknown>
  validateFields: (name?: string) => Promise<ValidationResult>
}

/**
 * Vue 3 composable parallel to React's `useForm`.
 *
 * Creates a Core + FormEngine pair, exposes reactive `values` / `formState`
 * refs that update on every relevant write, and forwards the engine's
 * mutation API as plain methods.
 *
 * Re-renders are wired through a Core middleware that schedules a single
 * microtask per write batch to refresh both reactive refs.
 */
export function useForm(options?: UseFormOptions): UseFormReturn {
  const core = createCore()
  const form = createForm(core, options)

  // `getFieldsValue()` only returns *registered* fields. To make `values`
  // useful even before any `<SgField>` mounts (and in unit tests that talk
  // directly to the engine), we union the engine's known fields with the
  // initial `defaultValues` keys.
  const knownKeys = new Set<string>(Object.keys(options?.defaultValues ?? {}))
  const collectValues = (): Record<string, unknown> => {
    const result: Record<string, unknown> = { ...form.getFieldsValue() }
    for (const key of knownKeys) {
      if (!(key in result)) {
        const v = core.get(key)
        if (v !== undefined) result[key] = v
      }
    }
    return result
  }

  const values = ref<Record<string, unknown>>(collectValues()) as Ref<Record<string, unknown>>
  const formState = ref<FormState>({ ...form.getFormState() }) as Ref<FormState>

  let scheduled = false
  const refreshNow = () => {
    values.value = collectValues()
    formState.value = { ...form.getFormState() }
  }
  const scheduleRefresh = () => {
    if (scheduled) return
    scheduled = true
    queueMicrotask(() => {
      scheduled = false
      refreshNow()
    })
  }

  const removeMiddleware = core.use((event, next) => {
    next(event)
    // Track every top-level write as a possibly-known key.
    if (event.path && !event.path.startsWith('$')) {
      knownKeys.add(event.path)
    }
    scheduleRefresh()
  })

  onScopeDispose(() => {
    removeMiddleware()
  })

  const submit = async () => {
    // `isSubmitting` lives in FormEngine closure (not in Core store),
    // so middleware can't surface the flip. Optimistically reflect it.
    formState.value = { ...formState.value, isSubmitting: true }
    try {
      await form.submit(async () => {
        // Pass all known values — including unregistered defaultValues —
        // to the user-supplied submit handler. This matches what
        // `useForm.values` exposes reactively.
        await options?.onSubmit?.(collectValues())
      })
    } finally {
      refreshNow()
    }

    if (!form.getFormState().isValid && options?.onSubmitInvalid) {
      const result = await form.validate()
      options.onSubmitInvalid(result.errors)
    }
  }

  const reset = (vals?: Record<string, unknown>) => {
    // FormEngine.reset only restores *registered* fields. To make `useForm`
    // useful even before any field component mounts, we additionally
    // restore values for every known key (defaultValues + previously seen
    // top-level writes).
    form.reset(vals)
    if (vals) {
      for (const [k, v] of Object.entries(vals)) {
        knownKeys.add(k)
        core.set(k, v)
      }
    } else if (options?.defaultValues) {
      for (const [k, v] of Object.entries(options.defaultValues)) {
        core.set(k, v)
      }
    }
    refreshNow()
  }

  const setFieldValue = (name: string, value: unknown) => {
    form.setValue(name, value)
  }

  const setFieldsValue = (vals: Record<string, unknown>) => {
    form.setFieldsValue(vals)
  }

  const getFieldValue = (name: string) => form.getValue(name)
  const getFieldsValue = () => collectValues()
  const validateFields = (name?: string) => form.validate(name)

  return {
    core,
    form,
    values,
    formState,
    isSubmitting: computed(() => formState.value.isSubmitting),
    isValidating: computed(() => formState.value.isValidating),
    isDirty: computed(() => formState.value.isDirty),
    isValid: computed(() => formState.value.isValid),
    submit,
    reset,
    setFieldValue,
    setFieldsValue,
    getFieldValue,
    getFieldsValue,
    validateFields,
  }
}
