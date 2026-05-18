import type { Core } from './types'

/**
 * Utility types for path-based type inference.
 * These provide compile-time type safety over the untyped Core runtime.
 */

type Primitive = string | number | boolean | null | undefined

/**
 * Extracts dot-notation paths from a nested object type (max 3 levels deep).
 * Example: Path<{user: {name: string}}> = "user" | "user.name"
 */
export type Path<T> = T extends Primitive
  ? never
  : {
      [K in keyof T & string]: T[K] extends Primitive
        ? K
        : T[K] extends Record<string, unknown>
          ?
              | K
              | `${K}.${keyof T[K] & string}`
              | {
                  [L in keyof T[K] & string]: T[K][L] extends Record<
                    string,
                    unknown
                  >
                    ? `${K}.${L}.${keyof T[K][L] & string}`
                    : never
                }[keyof T[K] & string]
          : K
    }[keyof T & string]

/**
 * Resolves the value type at a given dot-notation path (max 3 levels).
 */
export type PathValue<T, P extends string> = P extends keyof T
  ? T[P]
  : P extends `${infer K}.${infer Rest}`
    ? K extends keyof T
      ? Rest extends keyof T[K]
        ? T[K][Rest]
        : Rest extends `${infer L}.${infer M}`
          ? L extends keyof T[K]
            ? M extends keyof T[K][L]
              ? T[K][L][M]
              : unknown
            : unknown
          : unknown
      : unknown
    : unknown

/**
 * Type-safe wrapper over Core.
 * Compile-time only — runtime behavior is identical to Core.
 */
export interface TypedCore<T> {
  get<K extends Path<T>>(path: K): PathValue<T, K>
  set<K extends Path<T>>(path: K, value: PathValue<T, K>): void
  subscribe<K extends Path<T>>(
    path: K,
    cb: (value: PathValue<T, K>) => void
  ): () => void
  batch(fn: () => void): void
  transaction(fn: () => void): void
  computed<K extends Path<T>>(
    target: K,
    deps: Path<T>[],
    fn: (...values: unknown[]) => PathValue<T, K>
  ): void
  /** Access the untyped core underneath */
  raw: Core
}

/**
 * Creates a type-safe wrapper around an existing Core instance.
 * No runtime overhead — just type narrowing.
 */
export function createTypedCore<T>(core: Core): TypedCore<T> {
  return {
    get: core.get.bind(core) as TypedCore<T>['get'],
    set: core.set.bind(core) as TypedCore<T>['set'],
    subscribe: core.subscribe.bind(core) as TypedCore<T>['subscribe'],
    batch: core.batch.bind(core),
    transaction: core.transaction.bind(core),
    computed: core.computed.bind(core) as TypedCore<T>['computed'],
    raw: core,
  }
}
