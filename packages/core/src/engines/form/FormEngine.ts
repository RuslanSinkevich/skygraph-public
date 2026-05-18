import type { Core } from '../../types'
import type {
  FieldMeta,
  FieldOptions,
  FieldStatus,
  FormEngine,
  FormOptions,
  FormState,
  GetFieldValue,
  Rule,
  RuleFn,
  RuleObject,
  ValidationResult,
} from './types'

import { FORM_META_PREFIX as META_PREFIX } from '../namespaces'

function metaPath(name: string, field: string): string {
  return `${META_PREFIX}${name}.${field}`
}

function interpolateMessage(template: string, vars: Record<string, unknown>): string {
  return template.replace(/\$\{(\w+)\}/g, (_, key) => {
    return vars[key] != null ? String(vars[key]) : ''
  })
}

function compileRule(rule: Rule, templates?: Record<string, string>, fieldLabel?: string): RuleFn {
  if (typeof rule === 'function') return rule

  const obj = rule as RuleObject
  const vars: Record<string, unknown> = { label: fieldLabel ?? 'Field' }

  return (value: unknown, getFieldValue: GetFieldValue): string | null | Promise<string | null> => {
    if (obj.required) {
      if (value === undefined || value === null || value === '') {
        const tpl = templates?.required ?? obj.message
        return tpl ? interpolateMessage(tpl, vars) : (obj.message ?? 'This field is required')
      }
    }

    if (value === undefined || value === null || value === '') return null

    if (obj.type) {
      switch (obj.type) {
        case 'string':
          if (typeof value !== 'string') return obj.message ?? 'Must be a string'
          break
        case 'number':
          if (typeof value !== 'number' || isNaN(value)) return obj.message ?? 'Must be a number'
          break
        case 'email':
          if (typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
            return obj.message ?? 'Invalid email'
          break
        case 'url':
          try {
            new URL(value as string)
          } catch {
            return obj.message ?? 'Invalid URL'
          }
          break
        case 'boolean':
          if (typeof value !== 'boolean') return obj.message ?? 'Must be a boolean'
          break
      }
    }

    if (obj.min !== undefined) {
      vars.min = obj.min
      if (typeof value === 'string' && value.length < obj.min) {
        const tpl = templates?.min ?? obj.message
        return tpl ? interpolateMessage(tpl, vars) : (obj.message ?? `Minimum ${obj.min} characters`)
      }
      if (typeof value === 'number' && value < obj.min)
        return obj.message ?? `Minimum value is ${obj.min}`
    }

    if (obj.max !== undefined) {
      vars.max = obj.max
      if (typeof value === 'string' && value.length > obj.max) {
        const tpl = templates?.max ?? obj.message
        return tpl ? interpolateMessage(tpl, vars) : (obj.message ?? `Maximum ${obj.max} characters`)
      }
      if (typeof value === 'number' && value > obj.max)
        return obj.message ?? `Maximum value is ${obj.max}`
    }

    if (obj.pattern) {
      if (typeof value === 'string' && !obj.pattern.test(value))
        return obj.message ?? 'Invalid format'
    }

    if (obj.validator) {
      return obj.validator(value, getFieldValue)
    }

    return null
  }
}

function computeStatus(meta: { errors: string[]; warnings: string[]; validating: boolean }): FieldStatus {
  if (meta.validating) return 'validating'
  if (meta.errors.length > 0) return 'error'
  if (meta.warnings.length > 0) return 'warning'
  return undefined
}

interface CompiledRule {
  original: Rule
  fn: RuleFn
}

interface FieldRecord {
  rules: CompiledRule[]
  warningRules: CompiledRule[]
  options: FieldOptions
  abortController: AbortController | null
}

export function createForm(core: Core, options?: FormOptions): FormEngine {
  const fields = new Map<string, FieldRecord>()
  const depMap = new Map<string, string[]>()
  const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>()
  const preservedValues = new Map<string, unknown>()
  let isSubmitting = false

  if (options?.defaultValues) {
    for (const [key, value] of Object.entries(options.defaultValues)) {
      core.set(key, value)
    }
  }

  function setMeta(name: string, meta: Partial<Record<string, unknown>>): void {
    for (const [key, value] of Object.entries(meta)) {
      core.set(metaPath(name, key), value)
    }
  }

  function getMeta(name: string): FieldMeta {
    const errors = (core.get(metaPath(name, 'errors')) as string[]) ?? []
    const warnings = (core.get(metaPath(name, 'warnings')) as string[]) ?? []
    const validating = (core.get(metaPath(name, 'validating')) as boolean) ?? false
    const touched = (core.get(metaPath(name, 'touched')) as boolean) ?? false
    const dirty = (core.get(metaPath(name, 'dirty')) as boolean) ?? false

    return {
      touched,
      dirty,
      errors,
      warnings,
      validating,
      status: computeStatus({ errors, warnings, validating }),
      error: errors[0] ?? null,
    }
  }

  function initMeta(name: string): void {
    setMeta(name, {
      touched: false,
      dirty: false,
      errors: [],
      warnings: [],
      validating: false,
    })
  }

  const getFieldValue: GetFieldValue = (fieldName: string) => core.get(fieldName)

  function fireValuesChange(changedName: string): void {
    if (!options?.onValuesChange) return
    const changed: Record<string, unknown> = { [changedName]: core.get(changedName) }
    const all: Record<string, unknown> = {}
    for (const n of fields.keys()) all[n] = core.get(n)
    options.onValuesChange(changed, all)
  }

  function fireFieldsChange(changedName: string): void {
    if (!options?.onFieldsChange) return
    const meta = getMeta(changedName)
    options.onFieldsChange([{
      name: changedName,
      value: core.get(changedName),
      errors: meta.errors,
    }])
  }

  async function runValidation(name: string): Promise<string[]> {
    const record = fields.get(name)
    if (!record) return []

    const value = core.get(name)
    const validateFirst = record.options.validateFirst ?? options?.validateFirst ?? false

    record.abortController?.abort()
    const controller = new AbortController()
    record.abortController = controller

    const errors: string[] = []

    for (const rule of record.rules) {
      if (controller.signal.aborted) return []

      const result = rule.fn(value, getFieldValue)

      if (result instanceof Promise) {
        setMeta(name, { validating: true })
        try {
          const asyncResult = await result
          if (controller.signal.aborted) return []
          if (asyncResult) {
            errors.push(asyncResult)
            if (validateFirst) break
          }
        } catch {
          if (controller.signal.aborted) return []
          errors.push('Validation failed')
          if (validateFirst) break
        }
      } else if (result) {
        errors.push(result)
        if (validateFirst) break
      }
    }

    const warnings: string[] = []
    for (const rule of record.warningRules) {
      if (controller.signal.aborted) return []
      const result = rule.fn(value, getFieldValue)
      if (result instanceof Promise) {
        try {
          const asyncResult = await result
          if (controller.signal.aborted) return []
          if (asyncResult) warnings.push(asyncResult)
        } catch {
          // skip
        }
      } else if (result) {
        warnings.push(result)
      }
    }

    if (!controller.signal.aborted) {
      setMeta(name, { errors, warnings, validating: false })
      fireFieldsChange(name)
    }

    return errors
  }

  async function validateDependents(name: string): Promise<void> {
    for (const [target, deps] of depMap) {
      if (deps.includes(name)) {
        await runValidation(target)
      }
    }
  }

  const form: FormEngine = {
    register(name: string, fieldOptions?: FieldOptions): void {
      const opts = fieldOptions ?? {}
      const templates = options?.validateMessages
      const label = opts.label

      fields.set(name, {
        rules: opts.rules
          ? opts.rules.map((r) => ({ original: r, fn: compileRule(r, templates, label) }))
          : [],
        warningRules: opts.warningRules
          ? opts.warningRules.map((r) => ({ original: r, fn: compileRule(r, templates, label) }))
          : [],
        options: opts,
        abortController: null,
      })

      if (preservedValues.has(name)) {
        core.set(name, preservedValues.get(name))
        preservedValues.delete(name)
      } else if (opts.defaultValue !== undefined && core.get(name) === undefined) {
        core.set(name, opts.defaultValue)
      }

      if (opts.dependencies) {
        depMap.set(name, [...opts.dependencies])
      }

      core.batch(() => {
        initMeta(name)
      })
    },

    unregister(name: string): void {
      const record = fields.get(name)
      if (!record) return
      record.abortController?.abort()

      const timer = debounceTimers.get(name)
      if (timer) {
        clearTimeout(timer)
        debounceTimers.delete(name)
      }

      if (record.options.preserve) {
        preservedValues.set(name, core.get(name))
      }

      fields.delete(name)
      depMap.delete(name)
    },

    setValue(name: string, value: unknown): void {
      core.transaction(() => {
        core.set(name, value)
        setMeta(name, { dirty: true, touched: true })
      })

      fireValuesChange(name)

      const mode = fields.get(name)?.options.validateOn ?? options?.validateOn ?? 'change'
      if (mode === 'change') {
        const debounceMs = options?.asyncDebounceMs
        if (debounceMs && debounceMs > 0) {
          const existing = debounceTimers.get(name)
          if (existing) clearTimeout(existing)
          debounceTimers.set(
            name,
            setTimeout(() => {
              debounceTimers.delete(name)
              runValidation(name).then(() => validateDependents(name))
            }, debounceMs),
          )
        } else {
          runValidation(name).then(() => validateDependents(name))
        }
      }
    },

    getValue(name: string): unknown {
      return core.get(name)
    },

    onFieldBlur(name: string): void {
      setMeta(name, { touched: true })
      const mode = fields.get(name)?.options.validateOn ?? options?.validateOn ?? 'change'
      if (mode === 'blur') {
        runValidation(name).then(() => validateDependents(name))
      }
    },

    setFieldsValue(values: Record<string, unknown>): void {
      core.batch(() => {
        for (const [name, value] of Object.entries(values)) {
          core.set(name, value)
          if (fields.has(name)) {
            setMeta(name, { dirty: true, touched: true })
          }
        }
      })

      for (const name of Object.keys(values)) {
        fireValuesChange(name)
      }
    },

    getFieldsValue(): Record<string, unknown> {
      const values: Record<string, unknown> = {}
      for (const name of fields.keys()) {
        values[name] = core.get(name)
      }
      return values
    },

    getFieldState(name: string): FieldMeta {
      return getMeta(name)
    },

    getFormState(): FormState {
      let isDirty = false
      let isValid = true
      let isValidating = false

      for (const name of fields.keys()) {
        const meta = getMeta(name)
        if (meta.dirty) isDirty = true
        if (meta.errors.length > 0) isValid = false
        if (meta.validating) isValidating = true
      }

      return { isDirty, isValid, isSubmitting, isValidating }
    },

    addRule(name: string, rule: Rule): void {
      const record = fields.get(name)
      if (!record) return
      record.rules.push({
        original: rule,
        fn: compileRule(rule, options?.validateMessages, record.options.label),
      })
    },

    removeRule(name: string, rule: Rule): void {
      const record = fields.get(name)
      if (!record) return
      const idx = record.rules.findIndex((r) => r.original === rule)
      if (idx !== -1) record.rules.splice(idx, 1)
    },

    depends(target: string, deps: string[]): void {
      depMap.set(target, [...deps])
    },

    async validate(name?: string): Promise<ValidationResult> {
      const errors: Record<string, string[]> = {}
      const warnings: Record<string, string[]> = {}

      if (name) {
        const errs = await runValidation(name)
        if (errs.length > 0) errors[name] = errs
        const meta = getMeta(name)
        if (meta.warnings.length > 0) warnings[name] = meta.warnings
      } else {
        const promises: Promise<void>[] = []
        for (const fieldName of fields.keys()) {
          promises.push(
            runValidation(fieldName).then((errs) => {
              if (errs.length > 0) errors[fieldName] = errs
              const meta = getMeta(fieldName)
              if (meta.warnings.length > 0) warnings[fieldName] = meta.warnings
            }),
          )
        }
        await Promise.all(promises)
      }

      return { valid: Object.keys(errors).length === 0, errors, warnings }
    },

    async submit(handler: (values: Record<string, unknown>) => Promise<void>): Promise<void> {
      isSubmitting = true

      core.batch(() => {
        for (const name of fields.keys()) {
          setMeta(name, { touched: true })
        }
      })

      const result = await form.validate()

      if (!result.valid) {
        isSubmitting = false
        return
      }

      const values: Record<string, unknown> = {}
      for (const name of fields.keys()) {
        values[name] = core.get(name)
      }

      try {
        await handler(values)
      } finally {
        isSubmitting = false
      }
    },

    reset(values?: Record<string, unknown>): void {
      core.batch(() => {
        for (const [name, record] of fields) {
          record.abortController?.abort()
          record.abortController = null

          const resetValue =
            values?.[name] ??
            options?.defaultValues?.[name] ??
            record.options.defaultValue ??
            undefined
          core.set(name, resetValue)
          initMeta(name)
        }
      })
      preservedValues.clear()
    },

    getFieldNames(): string[] {
      return [...fields.keys()]
    },

    // Manual error/warning control
    setFieldError(name: string, errs: string | string[]): void {
      const arr = typeof errs === 'string' ? [errs] : errs
      setMeta(name, { errors: arr })
      fireFieldsChange(name)
    },

    setFieldWarning(name: string, warns: string | string[]): void {
      const arr = typeof warns === 'string' ? [warns] : warns
      setMeta(name, { warnings: arr })
    },

    clearFieldErrors(name: string): void {
      setMeta(name, { errors: [], warnings: [] })
      fireFieldsChange(name)
    },

    getFieldErrors(name: string): string[] {
      return getMeta(name).errors
    },

    getFieldWarnings(name: string): string[] {
      return getMeta(name).warnings
    },

    isFieldTouched(name: string): boolean {
      return getMeta(name).touched
    },

    isFieldValidating(name: string): boolean {
      return getMeta(name).validating
    },

    // List operations
    getListValue(name: string): unknown[] {
      const val = core.get(name)
      return Array.isArray(val) ? val : []
    },

    listAdd(name: string, defaultValue?: unknown, insertIndex?: number): void {
      const current = form.getListValue(name)
      if (insertIndex !== undefined && insertIndex >= 0 && insertIndex <= current.length) {
        const next = [...current]
        next.splice(insertIndex, 0, defaultValue ?? null)
        core.set(name, next)
      } else {
        core.set(name, [...current, defaultValue ?? null])
      }
    },

    listRemove(name: string, index: number | number[]): void {
      const current = form.getListValue(name)
      if (Array.isArray(index)) {
        const indices = new Set(index)
        core.set(name, current.filter((_, i) => !indices.has(i)))
      } else {
        core.set(name, current.filter((_, i) => i !== index))
      }
    },

    listMove(name: string, from: number, to: number): void {
      const current = [...form.getListValue(name)]
      if (from < 0 || from >= current.length || to < 0 || to >= current.length) return
      const [item] = current.splice(from, 1)
      current.splice(to, 0, item)
      core.set(name, current)
    },

    listReplace(name: string, values: unknown[]): void {
      core.set(name, [...values])
    },
  }

  return form
}
