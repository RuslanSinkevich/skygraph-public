/**
 * Engine path namespace registry
 *
 * Every engine that stores state in the Core store under a `$`-prefixed
 * namespace MUST register its prefix here. This prevents two engines from
 * silently colliding on the same root path (e.g. two engines both writing
 * under `$meta.`).
 *
 * Rules:
 *   1. Prefixes MUST start with `$` and end with `.`.
 *   2. Prefixes MUST be unique across all engines.
 *   3. An engine MUST use `reservedPrefix(name)` at module load so
 *      collisions surface at import time during dev/test.
 *   4. User data MUST NOT live under `$` prefixes — reserve them for engines.
 */

const reserved = new Map<string, string>()

/**
 * Reserve (or look up) a prefix for an engine. Throws synchronously if the
 * same prefix is already owned by a different engine.
 */
export function reservePrefix(engine: string, prefix: string): string {
  if (!prefix.startsWith('$') || !prefix.endsWith('.')) {
    throw new Error(
      `[skygraph] engine "${engine}" tried to reserve invalid prefix "${prefix}". ` +
        `Engine prefixes must start with "$" and end with ".".`,
    )
  }

  const existing = reserved.get(prefix)
  if (existing !== undefined && existing !== engine) {
    throw new Error(
      `[skygraph] prefix "${prefix}" is already owned by engine "${existing}", ` +
        `cannot reserve it for "${engine}". ` +
        `Pick a different prefix or update the registry.`,
    )
  }

  reserved.set(prefix, engine)
  return prefix
}

/** Snapshot of registered engine prefixes (debug / introspection). */
export function listReservedPrefixes(): ReadonlyMap<string, string> {
  return new Map(reserved)
}

/** Test-only helper. DO NOT call from engine code. */
export function __resetPrefixes(): void {
  reserved.clear()
}

// ── Canonical in-tree reservations ─────────────────────────────────────────
//
// Listed here so they are reserved even if the engine module is not loaded.
// New engines must add their entry here and reference it from their
// implementation via `reservePrefix(...)`.

export const FORM_META_PREFIX = reservePrefix('form', '$meta.')
export const TABLE_PREFIX = reservePrefix('table', '$table.')
export const TREE_PREFIX = reservePrefix('tree', '$tree.')
export const GRAPH_PREFIX = reservePrefix('graph', '$graph.')
export const CALENDAR_PREFIX = reservePrefix('calendar', '$calendar.')
