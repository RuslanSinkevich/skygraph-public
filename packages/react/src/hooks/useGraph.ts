import { useMemo, useRef, useSyncExternalStore } from 'react'
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
  state: GraphState
  /** The Core instance backing the engine (own or borrowed). */
  core: Core
}

/**
 * Reactive bridge between `createGraph` (from `@skygraph/core`) and React.
 *
 * The hook creates (or reuses) a Core + Graph pair, subscribes to the
 * `$graph.snapshot.*` namespace, and re-renders the consumer on every commit.
 *
 * The graph object reference is stable across renders. Mutations go through
 * `graph.addNode(...)`, `graph.moveNode(...)`, etc.
 */
export function useGraph(options: UseGraphOptions = {}): UseGraphReturn {
  const { core: externalCore, ...graphOptions } = options

  const { graph, core } = useMemo(() => {
    const c = externalCore ?? createCore()
    const g = createGraph(c, graphOptions)
    return { graph: g, core: c }
    // graphOptions contains a name only; ignoring its identity is the
    // correct behaviour — re-creating the engine on each render would lose
    // user-mutated state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalCore])

  // Cache the snapshot reference so `useSyncExternalStore` can compare by
  // identity. We rebuild it ONLY when the engine commits (subscribe callback
  // fires) — not on every render. This is what `useSyncExternalStore`
  // requires: getSnapshot must be referentially stable between commits.
  const snapshotRef = useRef<GraphState | null>(null)
  if (snapshotRef.current === null) {
    snapshotRef.current = graph.getState()
  }

  const state = useSyncExternalStore(
    (cb) =>
      graph.subscribe(() => {
        snapshotRef.current = graph.getState()
        cb()
      }),
    () => snapshotRef.current!,
    () => snapshotRef.current!,
  )

  return { graph, state, core }
}
