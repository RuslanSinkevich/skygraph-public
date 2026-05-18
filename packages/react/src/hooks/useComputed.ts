import { useEffect, useState } from 'react'
import type { Core } from '@skygraph/core'

export function useComputed(core: Core, path: string): unknown {
  const [value, setValue] = useState(() => core.get(path))

  useEffect(() => {
    return core.subscribe(path, (v) => {
      setValue(v)
    })
  }, [core, path])

  return value
}
