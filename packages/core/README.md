# @skygraph/core

Pure-TypeScript runtime for [SkyGraph](https://skygraph.ruslansinkevich.ru/) — the engine that drives forms, tables, trees, virtual lists, graphs and calendars in the React and Vue adapters. Zero runtime dependencies.

> **Most users don't install this package directly.** Use one of the meta-packages:
>
> ```bash
> npm install skygraph-react   # React + core + styles in one
> npm install skygraph-vue     # Vue 3 + core + styles in one
> ```
>
> Install `@skygraph/core` directly only when you want to drive the engine without an adapter (custom renderer, headless integration, server-side validation).

## Install

```bash
npm install @skygraph/core
```

## What's inside

- **Runtime:** reactive `Store`, `Batch`, `Transaction`, `Computed`, `Scheduler`, `Middleware`.
- **Engines:** `FormEngine`, `TableEngine`, `TreeEngine`, `VirtualScroll`, `GraphEngine`, `CalendarEngine`.
- **Subpath exports:** `@skygraph/core/{form,table,tree,virtual,graph,calendar}` for cherry-picking.

## Architecture

```
@skygraph/core (pure TS, 0 deps)
  ├── runtime/    — Store, Batch, Transaction, Computed, Scheduler, Middleware
  └── engines/
        ├── FormEngine     — validation, deps, lists
        ├── TableEngine    — sort, filter, group, virtual
        ├── TreeEngine     — check, expand, drag
        ├── VirtualScroll  — windowed rendering
        ├── GraphEngine    — nodes, edges, routing
        └── CalendarEngine — assignments, conflicts
```

See [`ARCHITECTURE.md`](https://github.com/RuslanSinkevich/skygraph-public/blob/master/ARCHITECTURE.md) in the repo for the full breakdown.

## Repository

[github.com/RuslanSinkevich/skygraph-public](https://github.com/RuslanSinkevich/skygraph-public)

## License

MIT
