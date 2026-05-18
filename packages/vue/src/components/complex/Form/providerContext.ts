import type { InjectionKey } from 'vue'
import type { FormEngine } from '@skygraph/core'

export interface FormProviderContextValue {
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
  forms: Record<string, FormEngine>
}

export const formProviderContextKey = Symbol(
  'sg-form-provider-context',
) as InjectionKey<FormProviderContextValue>
