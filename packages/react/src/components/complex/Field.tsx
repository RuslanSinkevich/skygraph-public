import React, { useEffect, useId, useRef } from 'react'
import { useFormContext } from './FormContext'
import { useField } from '../../hooks/useField'
import { Input } from '../ui/Input'
import { Textarea } from '../ui/Textarea'
import { Tooltip } from '../ui/Tooltip'
import { Spin } from '../ui/Spin'
import { useConfig } from '../ConfigProvider'
import type { UseFieldReturn } from '../../hooks/useField'
import type { Rule } from '@skygraph/core'
import type { BaseComponentProps } from '../../types'

/** Props for a single named field with validation, layout, and optional custom control. */
export interface FieldProps extends BaseComponentProps {
  /** Registered path in the form store. */
  name: string
  /** Visible label text; layout comes from {@link FormContext}. */
  label?: string
  /** When `true`, prepends a required rule in addition to `rules`. */
  required?: boolean
  /** Validation rules for this field.
   * @default []
   */
  rules?: Rule[]
  /** Rules that produce warnings without failing validation. */
  warningRules?: Rule[]
  /** Re-validates this field when any listed field changes. */
  dependencies?: string[]
  /** When `true`, the field renders nothing (values can remain registered). */
  hidden?: boolean
  /** Disables the control; falls back to form context `disabled`. */
  disabled?: boolean
  /** Placeholder for the built-in `Input` / `Textarea`. */
  placeholder?: string
  /** Built-in control type when `children` is not provided.
   * @default 'text'
   */
  type?: 'text' | 'email' | 'password' | 'number' | 'textarea'
  /** Helper text shown below the control when there are no errors/warnings. */
  help?: React.ReactNode
  /** Supplementary content below the control area. */
  extra?: React.ReactNode
  /** Tooltip title wrapping the label text. */
  tooltip?: string
  /** Custom control, render prop, or omit for default input/textarea. */
  children?: React.ReactNode | ((field: UseFieldReturn) => React.ReactNode)
  // New props
  /** Renders only the control (validation wiring) without layout chrome. */
  noStyle?: boolean
  /** Maps raw change values before committing to the store. */
  normalize?: (value: unknown, prevValue: unknown) => unknown
  /** Custom extractor for control events (reserved for controlled wrappers). */
  getValueFromEvent?: (...args: unknown[]) => unknown
  /** Prop name on the child that holds the value (for custom controls). */
  valuePropName?: string
  /** Stops after the first failing rule when validating. */
  validateFirst?: boolean
  /** Manual validation status badge; overrides engine-derived status when set. */
  validateStatus?: 'success' | 'warning' | 'error' | 'validating'
  /** Shows feedback icons when the field has been touched. */
  hasFeedback?: boolean
  /** Keeps value on unregister; overrides form-level `preserve` when set. */
  preserve?: boolean
  /** Overrides form `labelCol` for this field in horizontal layout. */
  labelCol?: {
    /** Column span (out of 24). */
    span?: number
    /** Column offset (out of 24). */
    offset?: number
  }
  /** Overrides form `wrapperCol` for this field in horizontal layout. */
  wrapperCol?: {
    /** Column span (out of 24). */
    span?: number
    /** Column offset (out of 24). */
    offset?: number
  }
  /** Template variables merged into validation messages for this field. */
  messageVariables?: Record<string, string>
}

function FeedbackIcon({
  status,
  icons,
}: {
  status: 'success' | 'warning' | 'error' | 'validating' | undefined
  icons?: {
    success?: React.ReactNode
    warning?: React.ReactNode
    error?: React.ReactNode
    validating?: React.ReactNode
  }
}) {
  if (!status) return null

  const defaults: Record<string, React.ReactNode> = {
    validating: <Spin size="small" />,
    error: <span className="sg-field-feedback-icon sg-field-feedback-error">✕</span>,
    warning: <span className="sg-field-feedback-icon sg-field-feedback-warning">!</span>,
    success: <span className="sg-field-feedback-icon sg-field-feedback-success">✓</span>,
  }

  return <span className="sg-field-feedback">{icons?.[status] ?? defaults[status]}</span>
}

/**
 * Registers `name` with the form engine, renders label/help/errors, and either
 * a built-in input or custom `children` / render-prop control.
 */
export function Field({
  name,
  label,
  required,
  rules = [],
  warningRules,
  dependencies,
  hidden,
  disabled: fieldDisabled,
  unstyled,
  placeholder,
  type = 'text',
  help,
  extra,
  tooltip,
  children,
  noStyle,
  normalize,
  getValueFromEvent: _getValueFromEvent,
  validateFirst,
  validateStatus: manualStatus,
  hasFeedback,
  preserve,
  labelCol: fieldLabelCol,
  wrapperCol: fieldWrapperCol,
  messageVariables: _messageVariables,
}: FieldProps) {
  const ctx = useFormContext()
  const { core, form } = ctx
  const disabled = fieldDisabled ?? ctx.disabled
  const formLocale = useConfig().locale?.form
  const requiredMarker = formLocale?.required ?? '*'
  const optionalMarker = formLocale?.optional ?? '(optional)'
  const autoId = useId()
  const fieldId = `sg-field-${autoId.replace(/:/g, '')}-${name.replace(/\./g, '-')}`
  const helpId = `${fieldId}-help`
  const field = useField(core, form, name)
  const prevValueRef = useRef<unknown>(field.value)

  useEffect(() => {
    const allRules: Rule[] = [...rules]
    if (required) {
      allRules.unshift({ required: true })
    }
    form.register(name, {
      rules: allRules,
      warningRules,
      dependencies,
      validateFirst,
      label,
      preserve: preserve ?? ctx.preserve,
    })
    return () => form.unregister(name)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, form, required])

  if (hidden) return null

  const wrappedOnChange = normalize
    ? (v: unknown) => {
        const normalized = normalize(v, prevValueRef.current)
        prevValueRef.current = normalized
        field.onChange(normalized)
      }
    : field.onChange

  const effectiveStatus = manualStatus ?? field.status
  const hasErrors = field.errors.length > 0
  const hasWarnings = field.warnings.length > 0

  // Layout
  const layout = ctx.layout ?? 'vertical'
  const lCol = fieldLabelCol ?? ctx.labelCol
  const wCol = fieldWrapperCol ?? ctx.wrapperCol
  const labelAlign = ctx.labelAlign ?? 'right'

  const labelNode = label ? (
    <label
      htmlFor={fieldId}
      className="sg-field-label"
      style={
        layout === 'horizontal' && lCol?.offset
          ? { marginLeft: `${(lCol.offset / 24) * 100}%` }
          : undefined
      }
    >
      {tooltip ? (
        <Tooltip title={tooltip}>
          <span>{label}</span>
        </Tooltip>
      ) : (
        label
      )}
      {(required || ctx.requiredMark === true) && (
        <span className="sg-field-required">{requiredMarker}</span>
      )}
      {ctx.requiredMark === 'optional' && !required && (
        <span className="sg-field-optional">{optionalMarker}</span>
      )}
      {ctx.colon && ':'}
    </label>
  ) : null

  const errorNodes = hasErrors ? (
    <div id={helpId} className="sg-field-error" role="alert">
      {field.errors.map((e, i) => (
        <div key={i}>{e}</div>
      ))}
    </div>
  ) : null

  const warningNodes =
    hasWarnings && !hasErrors ? (
      <div id={helpId} className="sg-field-warning">
        {field.warnings.map((w, i) => (
          <div key={i}>{w}</div>
        ))}
      </div>
    ) : null

  const helpNode =
    errorNodes ??
    warningNodes ??
    (help ? (
      <div id={helpId} className="sg-field-help">
        {help}
      </div>
    ) : null)
  const describedBy = helpNode ? helpId : undefined

  const extraNode = extra ? <div className="sg-field-extra">{extra}</div> : null

  const feedbackIcon =
    hasFeedback && field.touched ? (
      <FeedbackIcon status={effectiveStatus} icons={ctx.feedbackIcons} />
    ) : null

  // Render children
  const renderControl = () => {
    if (typeof children === 'function') {
      return (
        <>
          {children({ ...field, onChange: wrappedOnChange })}
          {feedbackIcon}
        </>
      )
    }

    if (children) {
      return (
        <>
          {children}
          {feedbackIcon}
        </>
      )
    }

    const inputElement =
      type === 'textarea' ? (
        <Textarea
          id={fieldId}
          value={(field.value as string) ?? ''}
          onChange={(v) => wrappedOnChange(v)}
          onBlur={field.onBlur}
          disabled={disabled}
          placeholder={placeholder}
          unstyled={unstyled}
          aria-invalid={hasErrors || undefined}
          aria-required={required || undefined}
          aria-describedby={describedBy}
        />
      ) : (
        <Input
          id={fieldId}
          type={type}
          value={(field.value as string) ?? ''}
          onChange={(v) => wrappedOnChange(type === 'number' ? Number(v) : v)}
          onBlur={field.onBlur}
          disabled={disabled}
          placeholder={placeholder}
          unstyled={unstyled}
          aria-invalid={hasErrors || undefined}
          aria-required={required || undefined}
          aria-describedby={describedBy}
        />
      )

    return (
      <>
        {inputElement}
        {feedbackIcon}
      </>
    )
  }

  // noStyle — just validation, no wrapper
  if (noStyle) {
    return <>{renderControl()}</>
  }

  // unstyled — minimal structure
  if (unstyled) {
    return (
      <>
        {labelNode}
        {renderControl()}
        {helpNode}
        {extraNode}
      </>
    )
  }

  // Horizontal layout with grid
  if (layout === 'horizontal' && lCol) {
    const labelSpan = lCol.span ?? 6
    const wrapperSpan = wCol?.span ?? 24 - labelSpan
    const labelPct = `${(labelSpan / 24) * 100}%`
    const wrapperPct = `${(wrapperSpan / 24) * 100}%`

    return (
      <div
        className={[
          'sg-field',
          'sg-field-horizontal',
          hasErrors ? 'sg-field-has-error' : '',
          hasWarnings && !hasErrors ? 'sg-field-has-warning' : '',
          effectiveStatus ? `sg-field-status-${effectiveStatus}` : '',
        ]
          .filter(Boolean)
          .join(' ')}
        data-field-name={name}
      >
        <div
          className="sg-field-label-wrap"
          style={{
            width: labelPct,
            textAlign: labelAlign,
          }}
        >
          {labelNode}
        </div>
        <div className="sg-field-control-wrap" style={{ width: wrapperPct }}>
          <div className="sg-field-control">{renderControl()}</div>
          {helpNode}
          {extraNode}
        </div>
      </div>
    )
  }

  // Default vertical / inline layout
  const fieldClasses = [
    'sg-field',
    hasErrors ? 'sg-field-has-error' : '',
    hasWarnings && !hasErrors ? 'sg-field-has-warning' : '',
    effectiveStatus ? `sg-field-status-${effectiveStatus}` : '',
  ]

  return (
    <div className={fieldClasses.filter(Boolean).join(' ')} data-field-name={name}>
      {labelNode}
      <div className="sg-field-control">{renderControl()}</div>
      {helpNode}
      {extraNode}
    </div>
  )
}
