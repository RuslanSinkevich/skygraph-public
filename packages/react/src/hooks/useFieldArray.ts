import { useState, useCallback, useMemo, useRef } from 'react'
import type { FormEngine } from '@skygraph/core'

export interface UseFieldArrayReturn {
  fields: { key: string; index: number }[]
  append: (defaultValue?: unknown) => void
  remove: (index: number) => void
  move: (from: number, to: number) => void
  replace: (values: unknown[]) => void
}

export function useFieldArray(form: FormEngine, name: string): UseFieldArrayReturn {
  const counterRef = useRef(0)
  const genKey = useCallback(() => `fa_${name}_${++counterRef.current}`, [name])

  const [keys, setKeys] = useState<string[]>(() => {
    const list = form.getListValue(name)
    return list.map(() => genKey())
  })

  const fields = useMemo(
    () => keys.map((key, index) => ({ key, index })),
    [keys],
  )

  const append = useCallback(
    (defaultValue?: unknown) => {
      form.listAdd(name, defaultValue)
      setKeys((prev) => [...prev, genKey()])
    },
    [form, name, genKey],
  )

  const remove = useCallback(
    (index: number) => {
      form.listRemove(name, index)
      setKeys((prev) => prev.filter((_, i) => i !== index))
    },
    [form, name],
  )

  const move = useCallback(
    (from: number, to: number) => {
      form.listMove(name, from, to)
      setKeys((prev) => {
        const next = [...prev]
        const [item] = next.splice(from, 1)
        next.splice(to, 0, item)
        return next
      })
    },
    [form, name],
  )

  const replace = useCallback(
    (values: unknown[]) => {
      const currentLen = form.getListValue(name).length
      for (let i = currentLen - 1; i >= 0; i--) {
        form.listRemove(name, i)
      }
      const newKeys: string[] = []
      for (const v of values) {
        form.listAdd(name, v)
        newKeys.push(genKey())
      }
      setKeys(newKeys)
    },
    [form, name, genKey],
  )

  return useMemo(
    () => ({ fields, append, remove, move, replace }),
    [fields, append, remove, move, replace],
  )
}
