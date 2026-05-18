import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import type { Core } from '@skygraph/core'
import { createHistory } from '@skygraph/core'
import type { HistoryPlugin, HistoryOptions } from '@skygraph/core'

export interface UseHistoryReturn {
  history: HistoryPlugin
  canUndo: boolean
  canRedo: boolean
  cursor: number
  entries: HistoryPlugin['entries']
  undo: () => void
  redo: () => void
  jumpTo: (index: number) => void
  clear: () => void
}

export function useHistory(core: Core, options?: HistoryOptions): UseHistoryReturn {
  const [, forceUpdate] = useState(0)
  const historyRef = useRef<HistoryPlugin | null>(null)
  const optionsRef = useRef(options)

  if (!historyRef.current) {
    historyRef.current = createHistory(core, optionsRef.current)
  }

  const tick = useCallback(() => forceUpdate((n) => n + 1), [])

  const undo = useCallback(() => {
    historyRef.current!.undo()
    tick()
  }, [tick])

  const redo = useCallback(() => {
    historyRef.current!.redo()
    tick()
  }, [tick])

  const jumpTo = useCallback(
    (index: number) => {
      historyRef.current!.jumpTo(index)
      tick()
    },
    [tick],
  )

  const clear = useCallback(() => {
    historyRef.current!.clear()
    tick()
  }, [tick])

  useEffect(() => {
    return () => {
      historyRef.current?.destroy()
    }
  }, [])

  const h = historyRef.current

  return useMemo(
    () => ({
      history: h,
      canUndo: h.canUndo,
      canRedo: h.canRedo,
      cursor: h.cursor,
      entries: h.entries,
      undo,
      redo,
      jumpTo,
      clear,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [h, h.cursor, h.entries.length, undo, redo, jumpTo, clear],
  )
}
