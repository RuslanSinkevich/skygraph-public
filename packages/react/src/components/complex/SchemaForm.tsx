import React from 'react'
import { Form } from './Form'
import { Field } from './Field'
import { AutoField } from './AutoField/AutoField'
import { useForm } from '../../hooks/useForm'
import { useConfig } from '../ConfigProvider'
import {
  jsonSchemaToFields,
  jsonSchemaToRules,
  jsonSchemaToDefaults,
} from '../../adapters/jsonSchemaAdapter'
import { zodToJsonSchema } from '../../adapters/zodAdapter'
import type { JSONSchema } from '../../adapters/jsonSchemaAdapter'
import type { UseFormReturn } from '../../hooks/useForm'
import type { BaseComponentProps, SizableProps } from '../../types'

/** Builds a {@link Form} from JSON Schema or Zod (converted to JSON Schema) with {@link Field} + {@link AutoField} rows. */
export interface SchemaFormProps extends BaseComponentProps, SizableProps {
  /** JSON Schema object or a Zod schema (`_def` present) to derive fields and rules. */
  schema: JSONSchema | { _def?: unknown }
  /** Called with all values on successful submit. */
  onSubmit?: (values: Record<string, unknown>) => void | Promise<void>
  /** Passed through to the inner {@link Form}. */
  layout?: 'horizontal' | 'vertical' | 'inline'
  /** Disables generated controls and the inner {@link Form}. */
  disabled?: boolean
  /** External form instance; otherwise an internal `useForm` is created with schema defaults. */
  form?: UseFormReturn
  /** Passed through to the inner {@link Form}. */
  labelCol?: {
    /** Column span (out of 24). */
    span?: number
    /** Column offset (out of 24). */
    offset?: number
  }
  /** Passed through to the inner {@link Form}. */
  wrapperCol?: {
    /** Column span (out of 24). */
    span?: number
    /** Column offset (out of 24). */
    offset?: number
  }
  className?: string
  style?: React.CSSProperties
  /** Label for the default submit button when `children` is omitted.
   * @default 'Submit'
   */
  submitText?: string
  /** Replaces the default submit button; omit to use a primary `<button type="submit">`. */
  children?: React.ReactNode
}

function isZodSchema(schema: unknown): boolean {
  return typeof schema === 'object' && schema !== null && '_def' in schema
}

/**
 * Generates fields from `schema`, wires validation, and wraps them in {@link Form}.
 * Supports Zod input by converting it to JSON Schema first.
 */
export function SchemaForm({
  schema: rawSchema,
  onSubmit,
  layout,
  size,
  disabled,
  form: externalForm,
  labelCol,
  wrapperCol,
  className,
  style,
  submitText: submitTextProp,
  children,
}: SchemaFormProps) {
  const config = useConfig()
  const submitText = submitTextProp ?? config.locale?.form?.submitText ?? 'Submit'
  const jsonSchema: JSONSchema = isZodSchema(rawSchema)
    ? zodToJsonSchema(rawSchema as Parameters<typeof zodToJsonSchema>[0])
    : (rawSchema as JSONSchema)

  const fields = jsonSchemaToFields(jsonSchema)
  const rulesMap = jsonSchemaToRules(jsonSchema)
  const defaults = jsonSchemaToDefaults(jsonSchema)

  const internalForm = useForm({
    defaultValues: defaults,
    onSubmit: onSubmit as (values: Record<string, unknown>) => Promise<void>,
  })

  const formInstance = externalForm ?? internalForm

  return (
    <Form
      form={formInstance}
      layout={layout}
      size={size}
      disabled={disabled}
      labelCol={labelCol}
      wrapperCol={wrapperCol}
      className={className}
      style={style}
    >
      {fields.map((fieldConfig) => (
        <Field
          key={fieldConfig.name}
          name={fieldConfig.name}
          label={typeof fieldConfig.label === 'string' ? fieldConfig.label : undefined}
          rules={rulesMap[fieldConfig.name]}
        >
          {(field) => (
            <AutoField
              name={fieldConfig.name}
              type={fieldConfig.type}
              options={fieldConfig.options}
              placeholder={fieldConfig.placeholder}
              min={fieldConfig.min}
              max={fieldConfig.max}
              disabled={disabled ?? field.validating}
            />
          )}
        </Field>
      ))}
      {children ?? (
        <button type="submit" className="sg-button sg-button-primary">
          {submitText}
        </button>
      )}
    </Form>
  )
}
