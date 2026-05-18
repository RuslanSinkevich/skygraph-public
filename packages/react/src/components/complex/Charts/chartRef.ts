import { useCallback, useImperativeHandle, useMemo, useRef, type ForwardedRef } from 'react'
import { printElement } from '../../../utils/print'
import type { PrintOptions, PrintableProp } from '../../../utils/print'

/** Imperative API общая для LineChart / BarChart / AreaChart / PieChart. */
export interface ChartRef {
  /**
   * Открыть popup и вызвать window.print() для DOM-области графика.
   * `customStyles` / `pageSize` / `orientation` мерджатся с тем, что задано
   * в prop `printable`.
   */
  print: (opts?: PrintOptions) => void
}

/**
 * Хук, инкапсулирующий ref на корень SVG/wrapper и `useImperativeHandle`,
 * чтобы все Chart*-компоненты экспонировали одинаковый ref.print().
 */
export function useChartPrint<T extends Element>(
  forwardedRef: ForwardedRef<ChartRef>,
  printable: PrintableProp | undefined,
): { rootRef: React.RefObject<T | null> } {
  const rootRef = useRef<T | null>(null)

  const printOptionsFromProp = useMemo<PrintOptions>(() => {
    if (typeof printable === 'object' && printable !== null) {
      return { fileName: printable.fileName }
    }
    return {}
  }, [printable])

  const doPrint = useCallback(
    (opts?: PrintOptions) => {
      printElement(rootRef.current, { ...printOptionsFromProp, ...(opts ?? {}) })
    },
    [printOptionsFromProp],
  )

  useImperativeHandle(forwardedRef, () => ({ print: doPrint }), [doPrint])

  return { rootRef }
}
