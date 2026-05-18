/**
 * @internal — runtime primitives for engine authors
 *
 * This entry point exposes low-level runtime building blocks (Store,
 * SubscriptionEngine, Batch, Transaction, ComputedEngine, Scheduler). It is
 * intended for authors of custom engines who need primitives beyond what the
 * public `Core` interface provides.
 *
 * STABILITY: these exports are NOT part of the semver-stable public API.
 * Signatures may change between minor versions. Production code should prefer
 * the main `@skygraph/core` entry point and the `Core` interface.
 *
 * The runtime MUST NOT import from `engines/*`. If a future change requires
 * runtime to know about engine categories, that is an architecture violation
 * — push the feature into middleware or a dedicated extension surface.
 */
export {
  Store,
  createNode,
  SubscriptionEngine,
  Batch,
  Transaction,
  ComputedEngine,
  CycleDetector,
  Scheduler,
} from './runtime/index'

export type {
  Node,
  Listener,
  Unsubscribe,
  StagedWrite,
  ComputeFn,
  Task,
} from './runtime/index'
