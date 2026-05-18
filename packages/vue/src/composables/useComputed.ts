import type { Ref } from 'vue'
import type { Core } from '@skygraph/core'
import { useWatch } from './useWatch'

/**
 * Reactive slice of a {@link Core} path — mirrors React's `useComputed`.
 *
 * Behavior matches {@link useWatch}; the name exists for cross-framework parity.
 */
export function useComputed<T = unknown>(core: Core, path: string): Ref<T> {
  return useWatch<T>(core, path)
}
