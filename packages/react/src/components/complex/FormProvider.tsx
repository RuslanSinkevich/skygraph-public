import React, { createContext, useCallback, useContext, useMemo, useRef } from 'react'
import type { FormEngine } from '@skygraph/core'

interface FormProviderContextValue {
  registerForm: (name: string, form: FormEngine) => void
  unregisterForm: (name: string) => void
  onFormFinish?: (
    name: string,
    info: { values: Record<string, unknown>; forms: Record<string, FormEngine> },
  ) => void
  onFormChange?: (
    name: string,
    info: { changedFields: string[]; forms: Record<string, FormEngine> },
  ) => void
}

const FormProviderContext = createContext<FormProviderContextValue | null>(null)

/** Props for a registry of named forms and their lifecycle callbacks. */
export interface FormProviderProps {
  /** Called after a registered form finishes submit successfully. */
  onFormFinish?: (
    name: string,
    info: { values: Record<string, unknown>; forms: Record<string, FormEngine> },
  ) => void
  /** Called when values change in a registered form. */
  onFormChange?: (
    name: string,
    info: { changedFields: string[]; forms: Record<string, FormEngine> },
  ) => void
  /** Tree of forms and other UI that may register with this provider. */
  children: React.ReactNode
}

/**
 * Provides a context so named {@link Form} instances can register and report
 * `onFormFinish` / `onFormChange` to a single parent.
 */
export function FormProvider({ onFormFinish, onFormChange, children }: FormProviderProps) {
  const formsRef = useRef<Record<string, FormEngine>>({})

  const registerForm = useCallback((name: string, form: FormEngine) => {
    formsRef.current[name] = form
  }, [])

  const unregisterForm = useCallback((name: string) => {
    delete formsRef.current[name]
  }, [])

  const value = useMemo<FormProviderContextValue>(
    () => ({
      registerForm,
      unregisterForm,
      onFormFinish,
      onFormChange,
    }),
    [registerForm, unregisterForm, onFormFinish, onFormChange],
  )

  return (
    <FormProviderContext.Provider value={value}>{children}</FormProviderContext.Provider>
  )
}

/**
 * Returns the optional multi-form provider context, or `null` if there is no {@link FormProvider}.
 */
export function useFormProvider() {
  return useContext(FormProviderContext)
}

/**
 * Registers/unregisters a {@link FormEngine} under `name` with the parent {@link FormProvider} on mount/unmount.
 */
export function useFormProviderRegister(name: string | undefined, form: FormEngine) {
  const provider = useContext(FormProviderContext)

  React.useEffect(() => {
    if (!provider || !name) return
    provider.registerForm(name, form)
    return () => provider.unregisterForm(name)
  }, [provider, name, form])

  return provider
}
