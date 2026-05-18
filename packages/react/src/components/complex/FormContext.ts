import { createContext, useContext } from 'react'
import type React from 'react'
import type { Core, FormEngine } from '@skygraph/core'

/** Values exposed by {@link FormContext} to descendant fields and hooks. */
export interface FormContextValue {
  /** Shared Skygraph core instance for the form tree. */
  core: Core
  /** Form engine coordinating values, validation, and submit. */
  form: FormEngine
  /** Active form layout from the nearest {@link Form}. */
  layout?: 'horizontal' | 'vertical' | 'inline'
  /** Active control size from the nearest {@link Form}. */
  size?: 'small' | 'middle' | 'large'
  /** Whether the form tree is disabled. */
  disabled?: boolean
  /** Whether labels show a trailing colon. */
  colon?: boolean
  /** Required/optional marking mode for labels. */
  requiredMark?: boolean | 'optional'
  /** Default label column grid for horizontal layout. */
  labelCol?: {
    /** Column span (out of 24). */
    span?: number
    /** Column offset (out of 24). */
    offset?: number
  }
  /** Default control column grid for horizontal layout. */
  wrapperCol?: {
    /** Column span (out of 24). */
    span?: number
    /** Column offset (out of 24). */
    offset?: number
  }
  /** Default label text alignment. */
  labelAlign?: 'left' | 'right'
  /** Whether unmounted field values are preserved. */
  preserve?: boolean
  /** Icons used for field feedback states. */
  feedbackIcons?: {
    /** Success-state icon. */
    success?: React.ReactNode
    /** Warning-state icon. */
    warning?: React.ReactNode
    /** Error-state icon. */
    error?: React.ReactNode
    /** Validating-state icon. */
    validating?: React.ReactNode
  }
}

export const FormContext = createContext<FormContextValue | null>(null)

/**
 * Returns the current `FormContextValue` from the nearest {@link Form}.
 * @throws If used outside `<Form>`.
 */
export function useFormContext(): FormContextValue {
  const ctx = useContext(FormContext)
  if (!ctx) {
    throw new Error('SkyGraph: useFormContext must be used inside <Form>')
  }
  return ctx
}
