import React, { useRef } from 'react'
import { FormContext } from './FormContext'
import { useForm } from '../../hooks/useForm'
import { useConfig } from '../ConfigProvider'
import { useFormProviderRegister } from './FormProvider'
import type { UseFormOptions, UseFormReturn } from '../../hooks/useForm'
import type { ValidationMode } from '@skygraph/core'

/** Props for the root form wrapper; merges {@link UseFormOptions} with layout and UI settings. */
export interface FormProps extends UseFormOptions {
  /** Controlled form instance from {@link useForm}; when omitted, an internal instance is created. */
  form?: UseFormReturn
  /** `name` attribute on the native `<form>` element. */
  name?: string
  /** Arrangement of labels and controls.
   * @default 'vertical'
   */
  layout?: 'horizontal' | 'vertical' | 'inline'
  /** Field/control size for context consumers. */
  size?: 'small' | 'middle' | 'large'
  /** Disables fields that read this value from form context. */
  disabled?: boolean
  /** When `true`, appends a colon after labels that support it. */
  colon?: boolean
  /** How required fields are marked in labels (`*` vs “optional”). */
  requiredMark?: boolean | 'optional'
  /** Label column grid settings (24-column) for horizontal layout. */
  labelCol?: {
    /** Column span (out of 24). */
    span?: number
    /** Column offset (out of 24). */
    offset?: number
  }
  /** Control column grid settings (24-column) for horizontal layout. */
  wrapperCol?: {
    /** Column span (out of 24). */
    span?: number
    /** Column offset (out of 24). */
    offset?: number
  }
  /** Text alignment for the label column. */
  labelAlign?: 'left' | 'right'
  /** Additional class names on the `<form>`. */
  className?: string
  /** Inline styles on the `<form>`. */
  style?: React.CSSProperties
  /** Form body content. */
  children: React.ReactNode
  /** After submit, scroll the first invalid field into view (`true` uses smooth centering). */
  scrollToFirstError?: boolean | ScrollIntoViewOptions
  /** Keeps unmounted field values in the form store. */
  preserve?: boolean
  /** Events that trigger validation (passed through to form options). */
  validateTrigger?: ValidationMode | ValidationMode[]
  /** Custom icons shown for field feedback states. */
  feedbackIcons?: {
    /** Icon for successful validation. */
    success?: React.ReactNode
    /** Icon for warning validation. */
    warning?: React.ReactNode
    /** Icon for error validation. */
    error?: React.ReactNode
    /** Icon while async validation is running. */
    validating?: React.ReactNode
  }
  /**
   * Called with the form values when the form passes validation and submits.
   * Alias for `onSubmit`. Both fire; if both are provided, `onSubmit` runs first.
   */
  onFinish?: (values: Record<string, unknown>) => void | Promise<void>
  /**
   * Initial field values. Alias for `defaultValues` (the underlying Form
   * engine option). When both are provided, `defaultValues` wins.
   */
  initialValues?: Record<string, unknown>
}

/**
 * Renders a `<form>` and provides {@link FormContext} for fields and lists.
 * Submits via the engine’s `submit` and optionally scrolls to the first error.
 */
export function Form({
  form: externalForm,
  name: formName,
  layout = 'vertical',
  size: sizeProp,
  disabled: disabledProp,
  colon,
  requiredMark,
  labelCol,
  wrapperCol,
  labelAlign,
  className,
  style,
  children,
  scrollToFirstError,
  preserve,
  feedbackIcons,
  onFinish,
  initialValues,
  ...formOptions
}: FormProps) {
  const config = useConfig()
  const size = sizeProp ?? config.size ?? 'middle'
  const disabled = disabledProp ?? config.disabled

  // `initialValues` is an antd-style alias for the engine's `defaultValues`.
  const mergedFormOptions = {
    ...formOptions,
    defaultValues: formOptions.defaultValues ?? initialValues,
    onSubmit: async (values: Record<string, unknown>) => {
      await formOptions.onSubmit?.(values)
      await onFinish?.(values)
    },
  }

  const internalForm = useForm(externalForm ? undefined : mergedFormOptions)
  const { core, form, submit } = externalForm ?? internalForm
  const formRef = useRef<HTMLFormElement>(null)

  useFormProviderRegister(formName, form)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    await submit()

    if (scrollToFirstError) {
      const result = await form.validate()
      if (!result.valid) {
        const firstErrorField = Object.keys(result.errors)[0]
        if (firstErrorField && formRef.current) {
          const el =
            formRef.current.querySelector(`[data-field-name="${firstErrorField}"]`) ??
            formRef.current.querySelector(`[name="${firstErrorField}"]`)
          if (el) {
            const scrollOpts =
              typeof scrollToFirstError === 'object' ? scrollToFirstError : { behavior: 'smooth' as const, block: 'center' as const }
            el.scrollIntoView(scrollOpts)
          }
        }
      }
    }
  }

  const classes = ['sg-form', `sg-form-${layout}`, `sg-form-${size}`]
  if (disabled) classes.push('sg-form-disabled')
  if (className) classes.push(className)

  return (
    <FormContext.Provider
      value={{
        core,
        form,
        layout,
        size,
        disabled,
        colon,
        requiredMark,
        labelCol,
        wrapperCol,
        labelAlign,
        preserve,
        feedbackIcons,
      }}
    >
      <form
        ref={formRef}
        name={formName}
        className={classes.join(' ')}
        style={style}
        onSubmit={handleSubmit}
        noValidate
      >
        {children}
      </form>
    </FormContext.Provider>
  )
}
