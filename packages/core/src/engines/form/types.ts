export type FieldStatus = 'success' | 'warning' | 'error' | 'validating' | undefined

/**
 * Extension slot for FieldMeta.
 *
 * Third-party plugins that need to attach typed metadata to fields MUST do so
 * via TypeScript declaration merging against this interface. Do NOT edit the
 * built-in fields of `FieldMeta` — that is a breaking change.
 *
 * Example (in a plugin's `.d.ts` or module file):
 *
 * ```ts
 * declare module '@skygraph/core' {
 *   interface FieldMetaExtensions {
 *     submittedAt?: number
 *     serverValidationId?: string
 *   }
 * }
 * ```
 *
 * Values are stored in the `extra` bag at runtime and surface as strongly
 * typed fields on `FieldMeta` through this interface.
 */
export interface FieldMetaExtensions {}

export interface FieldMeta extends FieldMetaExtensions {
  touched: boolean
  dirty: boolean
  errors: string[]
  warnings: string[]
  validating: boolean
  status: FieldStatus
  /** @deprecated Use errors[0] ?? null */
  error: string | null
  /**
   * Untyped metadata bag for runtime-level extension. Prefer declaration
   * merging on `FieldMetaExtensions` for typed access.
   */
  extra?: Record<string, unknown>
}

export interface FormState {
  isDirty: boolean
  isValid: boolean
  isSubmitting: boolean
  isValidating: boolean
}

export type GetFieldValue = (name: string) => unknown

export type RuleFn = (value: unknown, getFieldValue: GetFieldValue) => string | null | Promise<string | null>

export interface RuleObject {
  required?: boolean
  type?: 'string' | 'number' | 'email' | 'url' | 'boolean'
  min?: number
  max?: number
  pattern?: RegExp
  validator?: (value: unknown, getFieldValue: GetFieldValue) => string | null | Promise<string | null>
  message?: string
  /** If true, this is a warning rule (non-blocking) */
  warningOnly?: boolean
}

export type Rule = RuleFn | RuleObject

export interface ValidationResult {
  valid: boolean
  errors: Record<string, string[]>
  warnings: Record<string, string[]>
}

export interface FieldOptions {
  defaultValue?: unknown
  rules?: Rule[]
  warningRules?: Rule[]
  validateOn?: ValidationMode
  validateFirst?: boolean
  dependencies?: string[]
  label?: string
  preserve?: boolean
}

export type ValidationMode = 'change' | 'blur' | 'submit'

export interface FormOptions {
  defaultValues?: Record<string, unknown>
  validateOn?: ValidationMode
  asyncDebounceMs?: number
  validateFirst?: boolean
  validateMessages?: Record<string, string>
  onValuesChange?: (changedValues: Record<string, unknown>, allValues: Record<string, unknown>) => void
  onFieldsChange?: (changedFields: Array<{ name: string; value: unknown; errors: string[] }>) => void
}

export interface FormListOperation {
  add(defaultValue?: unknown, insertIndex?: number): void
  remove(index: number | number[]): void
  move(from: number, to: number): void
  replace(values: unknown[]): void
}

export interface FormEngine {
  register(name: string, options?: FieldOptions): void
  unregister(name: string): void

  setValue(name: string, value: unknown): void
  getValue(name: string): unknown
  setFieldsValue(values: Record<string, unknown>): void
  getFieldsValue(): Record<string, unknown>

  getFieldState(name: string): FieldMeta
  getFormState(): FormState

  onFieldBlur(name: string): void

  addRule(name: string, rule: Rule): void
  removeRule(name: string, rule: Rule): void
  depends(target: string, deps: string[]): void

  validate(name?: string): Promise<ValidationResult>
  submit(handler: (values: Record<string, unknown>) => Promise<void>): Promise<void>
  reset(values?: Record<string, unknown>): void

  getFieldNames(): string[]

  // Manual error/warning control
  setFieldError(name: string, errors: string | string[]): void
  setFieldWarning(name: string, warnings: string | string[]): void
  clearFieldErrors(name: string): void
  getFieldErrors(name: string): string[]
  getFieldWarnings(name: string): string[]
  isFieldTouched(name: string): boolean
  isFieldValidating(name: string): boolean

  // List operations
  getListValue(name: string): unknown[]
  listAdd(name: string, defaultValue?: unknown, insertIndex?: number): void
  listRemove(name: string, index: number | number[]): void
  listMove(name: string, from: number, to: number): void
  listReplace(name: string, values: unknown[]): void
}
