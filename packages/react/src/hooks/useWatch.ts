import { useEffect, useState } from 'react'
import type { Core } from '@skygraph/core'

export function useWatch(core: Core, name: string): unknown {
  const [value, setValue] = useState(() => core.get(name))

  useEffect(() => {
    setValue(core.get(name))
    return core.subscribe(name, (v) => {
      setValue(v)
    })
  }, [core, name])

  return value
}
