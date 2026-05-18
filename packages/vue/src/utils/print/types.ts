/**
 * Print options for `printElement` and `ref.print()` methods on components
 * that expose imperative print (Table / Diagram / Charts).
 *
 * Identical contract to the React package — the Vue `printElement` is
 * deliberately a 1:1 vanilla DOM port.
 */
export interface PrintOptions {
  fileName?: string
  orientation?: 'portrait' | 'landscape'
  pageSize?: 'A4' | 'A3' | 'A5' | 'Letter' | 'Legal' | string
  scale?: number
  margins?: string
  customStyles?: string
  /** Skip the auto-call to `window.print()` (useful in tests). */
  skipPrint?: boolean
  /** Keep the popup open after printing. */
  keepOpen?: boolean
}

export type PrintableProp = boolean | { fileName?: string }
