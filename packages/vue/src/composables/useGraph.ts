import { ref, onScopeDispose, type Ref } from 'vue'
import { createCore, createGraph } from '@skygraph/core'
import type { Core, GraphEngine, GraphEngineOptions, GraphState } from '@skygraph/core'

export interface UseGraphOptions extends GraphEngineOptions {
  /** Bring your own Core instance (for cross-engine coordination). */
  core?: Core
}

export interface UseGraphReturn {
  /** Underlying engine — call mutating methods on this. */
  graph: GraphEngine
  /** Reactive snapshot of nodes / edges / edgesByNode. */
  state: Ref<GraphState>
  /** The Core instance backing the engine (own or borrowed). */
  core: Core
}

/**
 * Vue 3 composable parallel to React's `useGraph`.
 *
 * Subscribes to graph commits via `graph.subscribe(cb)` and refreshes the
 * snapshot ref on every commit.
 */
export function useGraph(options: UseGraphOptions = {}): UseGraphReturn {
  const { core: externalCore, ...graphOptions } = options
  const core = externalCore ?? createCore()
  const graph = createGraph(core, graphOptions)

  const state = ref(graph.getState()) as Ref<GraphState>

  const unsubscribe = graph.subscribe(() => {
    state.value = graph.getState()
  })

  onScopeDispose(() => {
    unsubscribe()
  })

  return { graph, state, core }
}
