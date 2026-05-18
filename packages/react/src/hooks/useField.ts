import { useEffect, useState, useCallback, useRef } from 'react'
import type { Core, FormEngine, FieldMeta } from '@skygraph/core'

export interface UseFieldReturn {
  value: unknown
  errors: string[]
  warnings: string[]
  error: string | null
  touched: boolean
  dirty: boolean
  validating: boolean
  status: 'success' | 'warning' | 'error' | 'validating' | undefined
  onChange: (value: unknown) => void
  onBlur: () => void
}

export function useField(
  core: Core,
  form: FormEngine,
  name: string,
): UseFieldReturn {
  const [value, setValue] = useState(() => form.getValue(name))
  const [meta, setMeta] = useState<FieldMeta>(() => form.getFieldState(name))
  const nameRef = useRef(name)
  nameRef.current = name

  useEffect(() => {
    const unsubs: (() => void)[] = []

    unsubs.push(
      core.subscribe(name, (v) => {
        setValue(v)
      }),
    )

    unsubs.push(
      core.subscribe(`$meta.${name}.errors`, () => {
        setMeta(form.getFieldState(nameRef.current))
      }),
    )
    unsubs.push(
      core.subscribe(`$meta.${name}.warnings`, () => {
        setMeta(form.getFieldState(nameRef.current))
      }),
    )
    unsubs.push(
      core.subscribe(`$meta.${name}.touched`, () => {
        setMeta(form.getFieldState(nameRef.current))
      }),
    )
    unsubs.push(
      core.subscribe(`$meta.${name}.dirty`, () => {
        setMeta(form.getFieldState(nameRef.current))
      }),
    )
    unsubs.push(
      core.subscribe(`$meta.${name}.validating`, () => {
        setMeta(form.getFieldState(nameRef.current))
      }),
    )

    return () => {
      for (const u of unsubs) u()
    }
  }, [core, form, name])

  const onChange = useCallback(
    (v: unknown) => {
      form.setValue(nameRef.current, v)
    },
    [form],
  )

  const onBlur = useCallback(() => {
    form.onFieldBlur(nameRef.current)
  }, [form])

  return {
    value,
    errors: meta.errors,
    warnings: meta.warnings,
    error: meta.error,
    touched: meta.touched,
    dirty: meta.dirty,
    validating: meta.validating,
    status: meta.status,
    onChange,
    onBlur,
  }
}
