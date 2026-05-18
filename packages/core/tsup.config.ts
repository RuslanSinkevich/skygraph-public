import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    // Public surface — barrel for everything.
    index: 'src/index.ts',
    // Per-engine subpaths so consumers can pull only what they need
    // and tree-shake the rest. Each engine's `index.ts` is a stable
    // re-export of its public types + `createX` factory.
    form: 'src/engines/form/index.ts',
    table: 'src/engines/table/index.ts',
    tree: 'src/engines/tree/index.ts',
    virtual: 'src/engines/virtual/index.ts',
    graph: 'src/engines/graph/index.ts',
    calendar: 'src/engines/calendar/index.ts',
    // Runtime adapter surface for `@skygraph/react` only — not for app code.
    'runtime-internal': 'src/runtime-internal.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
})
